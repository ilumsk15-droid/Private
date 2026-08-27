import type { MagazineConfig } from '../config/magazine.config';
import { mmToPx } from '../config/magazine.config';
import { templateMeta } from '../schema/templates';
import type { ResolveIssue } from '../content/resolve';

export type Level = 'error' | 'warning' | 'info';

export interface Diagnostic {
  level: Level;
  code: string;
  message: string;
  page?: number;
  index?: number;
  hint?: string;
}

export interface AssetInfo {
  exists: boolean;
  /** ラスタ画像の実ピクセル。ベクタ(SVG)は null */
  width?: number;
  height?: number;
  vector?: boolean;
}
export type AssetLookup = (src: string) => AssetInfo;

interface ImageUse {
  src: string;
  page: number;
  hasCredit: boolean;
  placedWidthMm?: number;
  spread: boolean;
}

/** データ構造を歩いて画像/QR/テキストを集める（テンプレートごとの分岐を書かずに済む） */
function collect(data: unknown) {
  const images: { src: string | null; credit?: string; placedWidthMm?: number; spread?: boolean; alt?: string }[] = [];
  const qrs: { url: string | null; size?: number; label?: string }[] = [];
  const texts: string[] = [];

  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      if (v.trim()) texts.push(v);
      return;
    }
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'object' && v !== null) {
      const o = v as Record<string, unknown>;
      if ('src' in o && 'alt' in o) {
        images.push({
          src: (o.src as string | null) ?? null,
          credit: o.credit as string | undefined,
          placedWidthMm: o.placedWidthMm as number | undefined,
          spread: Boolean(o.spread),
          alt: o.alt as string | undefined,
        });
      }
      if ('url' in o && ('label' in o || 'note' in o || 'size' in o)) {
        qrs.push({ url: (o.url as string | null) ?? null, size: o.size as number | undefined, label: o.label as string | undefined });
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(data);
  return { images, qrs, texts };
}

/**
 * 入稿前チェック本体。fs に触れないので、Node のスクリプトからもブラウザの
 * バリデーションパネルからも同じロジックを使える。
 */
export function validateIssue(
  resolved: ResolveIssue,
  cfg: MagazineConfig,
  lookupAsset: AssetLookup = () => ({ exists: true }),
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const err = (code: string, message: string, page?: number, hint?: string) =>
    out.push({ level: 'error', code, message, page, hint });
  const warn = (code: string, message: string, page?: number, hint?: string) =>
    out.push({ level: 'warning', code, message, page, hint });
  const info = (code: string, message: string, page?: number) =>
    out.push({ level: 'info', code, message, page });

  const { issue, pages, totalPages } = resolved;

  // ---- ロード時のスキーマ違反 ----
  for (const p of resolved.problems) {
    err('data.schema', `データがテンプレートの仕様に合っていません: ${p.message}`, p.page,
      'content 側のキー名・型を確認してください（src/schema/templates.ts が仕様）');
  }

  // ---- ページ数 ----
  if (totalPages !== issue.pageCount && !cfg.pagination.allowPageCountMismatch) {
    err('page.count', `台割の総ページ数 ${totalPages}P が issue.json の pageCount ${issue.pageCount}P と一致しません`, undefined,
      'ページを増減したら pageCount も更新してください');
  }
  if (totalPages > cfg.pagination.maxPages) {
    err('page.max', `総ページ数 ${totalPages}P が上限 ${cfg.pagination.maxPages}P を超えています`);
  }
  if (totalPages % cfg.pagination.signature !== 0) {
    warn('page.signature', `総ページ数 ${totalPages}P が折丁 ${cfg.pagination.signature}P の倍数ではありません`, undefined,
      '印刷所によっては面付けできません');
  }

  // ---- ページ番号の連続性（防御的チェック：手で番号を書いた場合の検出） ----
  const seen = new Set<number>();
  for (const p of pages) {
    for (let n = p.pageNumber; n <= p.endPageNumber; n++) {
      if (seen.has(n)) err('page.duplicate', `ページ番号 ${n} が重複しています`, n);
      seen.add(n);
    }
  }
  for (let n = 1; n <= totalPages; n++) {
    if (!seen.has(n)) err('page.missing', `ページ番号 ${n} が欠番です`, n);
  }

  const sectionIds = new Set(issue.sections.map((s) => s.id));
  const usedSections = new Set<string>();
  const imageUses: ImageUse[] = [];

  for (const p of pages) {
    const m = templateMeta[p.spec.template];
    const span = p.endPageNumber - p.pageNumber + 1;

    // ---- 左右ページの整合 ----
    if (span === 2 && p.pageNumber % 2 !== 0) {
      err('spread.align', `見開きテンプレート「${m.label}」が奇数ページ P${p.pageNumber} から始まっています`, p.pageNumber,
        '見開きは左ページ（偶数）始まりである必要があります。前後に1ページ挿入して調整してください');
    }
    if (!m.spans.includes(span as 1 | 2)) {
      err('spread.span', `「${m.label}」は span=${m.spans.join('/')} のみ対応ですが span=${span} が指定されています`, p.pageNumber);
    }
    if (span === 1 && p.pageNumber !== 1 && p.side === 'left' && p.pageNumber % 2 !== 0) {
      err('page.side', `P${p.pageNumber} の左右判定が不正です`, p.pageNumber);
    }

    // ---- セクション ----
    if (!sectionIds.has(p.spec.section)) {
      err('section.unknown', `セクションID "${p.spec.section}" が issue.sections に定義されていません`, p.pageNumber);
    }
    usedSections.add(p.spec.section);

    const { images, qrs, texts } = collect(p.data);

    // ---- 空ページ ----
    const textVolume = texts.join('').replace(/\s/g, '').length;
    if (textVolume === 0 && images.filter((i) => i.src).length === 0) {
      err('page.empty', `P${p.pageNumber} に表示できる内容がありません（空ページ）`, p.pageNumber);
    } else if (textVolume < 12 && images.filter((i) => i.src).length === 0) {
      warn('page.thin', `P${p.pageNumber} の内容がごく僅かです（文字数 ${textVolume}）`, p.pageNumber);
    }

    // ---- 原稿未入稿 ----
    if (p.spec.flags?.draft) {
      info('page.draft', `P${p.pageNumber} は draft フラグが立っています（未入稿）`, p.pageNumber);
    }

    // ---- 画像 ----
    for (const img of images) {
      if (!img.src) {
        warn('image.missing', `P${p.pageNumber} に未登録の画像枠があります`, p.pageNumber,
          '誌面にはプレースホルダーが表示されます。入稿前に必ず差し替えてください');
        continue;
      }
      if (!img.alt || !img.alt.trim()) {
        warn('image.alt', `P${p.pageNumber} の画像 ${img.src} に alt がありません`, p.pageNumber);
      }
      const asset = lookupAsset(img.src);
      if (!asset.exists) {
        err('image.notfound', `P${p.pageNumber} の画像ファイルが存在しません: ${img.src}`, p.pageNumber,
          'public/ 以下のパスを確認してください');
      } else if (!asset.vector && asset.width && asset.height) {
        const placedMm = img.placedWidthMm ?? (img.spread ? cfg.format.trim.width * 2 : cfg.format.trim.width);
        const requiredPx = mmToPx(placedMm, cfg.image.minDpi);
        if (asset.width < requiredPx) {
          const effDpi = Math.round((asset.width / (placedMm / 25.4)));
          warn('image.lowres', `P${p.pageNumber} の画像 ${img.src} は解像度不足（実効 ${effDpi}dpi / 必要 ${cfg.image.minDpi}dpi・${requiredPx}px以上）`, p.pageNumber);
        }
      }
      if (!img.credit) {
        warn('image.credit', `P${p.pageNumber} の画像 ${img.src} にクレジットがありません`, p.pageNumber,
          `${cfg.caption.creditPrefix} の表記を credit に入れてください`);
      }
      imageUses.push({ src: img.src, page: p.pageNumber, hasCredit: Boolean(img.credit), placedWidthMm: img.placedWidthMm, spread: Boolean(img.spread) });
    }

    // ---- QR ----
    for (const q of qrs) {
      if (!q.url) {
        warn('qr.url', `P${p.pageNumber} に URL 未設定のQR枠があります（QRは描画されません）`, p.pageNumber);
        continue;
      }
      const size = q.size ?? cfg.qr.size;
      if (size < cfg.qr.minSize) {
        err('qr.size', `P${p.pageNumber} のQRサイズ ${size}mm が印刷での読み取り下限 ${cfg.qr.minSize}mm を下回っています`, p.pageNumber);
      }
      if (!q.label) {
        warn('qr.label', `P${p.pageNumber} のQRに説明文（label）がありません`, p.pageNumber);
      }
    }
    if (templateMeta[p.spec.template].id === 'video-qr' && qrs.every((q) => !q.url)) {
      err('qr.required', `P${p.pageNumber}（動画紹介）にQRのURLが1つも設定されていません`, p.pageNumber);
    }

    // ---- 表記義務 ----
    const flat = texts.join(' ');
    if ((m.requiresAdLabel || p.spec.flags?.ad) && !cfg.compliance.adLabels.some((l) => flat.includes(l))) {
      err('compliance.ad', `P${p.pageNumber}（広告面）に「${cfg.compliance.adLabels.slice(0, 2).join('」「')}」等の表記がありません`, p.pageNumber,
        'label フィールドに広告表記を入れてください');
    }
    if ((m.requiresAiDisclosure || p.spec.flags?.ai) && !/AI/i.test(flat)) {
      err('compliance.ai', `P${p.pageNumber}（AI生成コンテンツ）にAI生成である旨の注記がありません`, p.pageNumber,
        `例: 「${cfg.compliance.aiDisclosure}」`);
    }
  }

  // ---- 目次の整合 ----
  for (const p of pages) {
    if (p.spec.template !== 'contents') continue;
    const entries = (p.data as { entries?: { page: number; title: string }[] })?.entries ?? [];
    for (const e of entries) {
      if (e.page < 1 || e.page > totalPages) {
        err('contents.range', `目次の「${e.title}」が存在しないページ P${e.page} を指しています`, p.pageNumber);
      }
    }
  }

  // ---- 画像の重複利用 ----
  const bySrc = new Map<string, number[]>();
  for (const u of imageUses) bySrc.set(u.src, [...(bySrc.get(u.src) ?? []), u.page]);
  for (const [src, ps] of bySrc) {
    const unique = [...new Set(ps)];
    if (unique.length > 1) {
      warn('image.duplicate', `同じ画像が複数ページで使われています: ${src}（P${unique.join(', P')}）`, unique[0],
        '意図した再掲でなければ差し替えてください');
    }
  }

  // ---- 号の構成 ----
  const first = pages[0];
  if (first && templateMeta[first.spec.template].category !== 'cover') {
    warn('issue.cover', 'P1 が表紙テンプレートではありません');
  }
  if (!pages.some((p) => p.spec.template === 'colophon')) {
    warn('issue.colophon', '奥付（colophon）が台割にありません');
  }
  for (const s of issue.sections) {
    if (!usedSections.has(s.id)) info('section.unused', `セクション「${s.title}」を使うページがありません`);
  }

  return out;
}

export function summarize(diags: Diagnostic[]) {
  return {
    errors: diags.filter((d) => d.level === 'error'),
    warnings: diags.filter((d) => d.level === 'warning'),
    infos: diags.filter((d) => d.level === 'info'),
  };
}
