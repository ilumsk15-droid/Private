import {
  issueSchema,
  type Issue,
  type ResolvedPage,
  type Spread,
} from '../schema/issue';
import { templateSchemas, templateMeta } from '../schema/templates';
import type { MagazineConfig } from '../config/magazine.config';

/** $ref を解決するためのファイル読み取り。browser/node の両方から注入する */
export type FileReader = (relativePath: string) => string | undefined;

export interface ResolveIssue {
  issue: Issue;
  pages: ResolvedPage[];
  spreads: Spread[];
  /** 総ページ数（台割から算出） */
  totalPages: number;
  /** ロード時に落ちた問題（スキーマ違反など） */
  problems: { page?: number; index: number; message: string }[];
}

const isRef = (v: unknown): v is { $ref: string } =>
  typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).$ref === 'string';

/**
 * {"$ref": "feature/interview.json"} を再帰的に展開する。
 * ".md" は文字列としてそのまま返す（本文は Markdown ファイルで管理したいため）。
 * "#" 以降はドット区切りのキーパスとして扱う: "ranking/ranking.json#top10"
 */
export function resolveRefs(value: unknown, read: FileReader, seen: string[] = []): unknown {
  if (isRef(value)) {
    const [path, pointer] = value.$ref.split('#');
    if (seen.includes(path)) throw new Error(`$ref が循環しています: ${path}`);
    const raw = read(path);
    if (raw === undefined) throw new Error(`$ref の参照先が見つかりません: ${path}`);
    let parsed: unknown = path.endsWith('.md') ? raw : JSON.parse(raw);
    if (pointer) {
      for (const key of pointer.split('.').filter(Boolean)) {
        parsed = (parsed as Record<string, unknown>)?.[key];
        if (parsed === undefined) throw new Error(`$ref のキーが見つかりません: ${value.$ref}`);
      }
    }
    return resolveRefs(parsed, read, [...seen, path]);
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, read, seen));
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveRefs(v, read, seen);
    return out;
  }
  return value;
}

/** QRのURLを計測URLへ一括変換する。データ側は素のURLのまま保てる */
export function rewriteQrUrls(value: unknown, base: string | null, params: Record<string, string>): unknown {
  if (!base && Object.keys(params).length === 0) return value;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(obj)) out[k] = walk(val);
      // qr らしきオブジェクト（url を持つ）だけ書き換える
      if (typeof obj.url === 'string' && ('label' in obj || 'note' in obj || 'size' in obj)) {
        out.url = buildTrackingUrl(obj.url, base, params);
      }
      return out;
    }
    return v;
  };
  return walk(value);
}

export function buildTrackingUrl(url: string, base: string | null, params: Record<string, string>): string {
  let next = url;
  if (base) {
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    next = `${b}?to=${encodeURIComponent(url)}`;
  }
  const entries = Object.entries(params);
  if (entries.length) {
    const sep = next.includes('?') ? '&' : '?';
    next += sep + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  }
  return next;
}

/**
 * 台割を読み、ページ番号を自動採番して描画用の配列に変換する。
 * 左開き想定：p1 は単独（右側）、以降 [偶数=左, 奇数=右] で組む。
 */
export function buildIssue(rawIssue: unknown, read: FileReader, cfg: MagazineConfig): ResolveIssue {
  const issue = issueSchema.parse(rawIssue);
  const problems: ResolveIssue['problems'] = [];

  const trackingBase = issue.qr?.trackingBase !== undefined ? issue.qr.trackingBase : cfg.qr.trackingBase;
  const trackingParams = { ...cfg.qr.trackingParams, ...(issue.qr?.trackingParams ?? {}) };

  const pages: ResolvedPage[] = [];
  let cursor = 1;

  issue.pages.forEach((spec, index) => {
    const span = spec.span ?? 1;
    const pageNumber = cursor;
    const endPageNumber = cursor + span - 1;
    cursor += span;

    let data: unknown = spec.data;
    try {
      data = resolveRefs(spec.data, read);
      data = rewriteQrUrls(data, trackingBase ?? null, trackingParams);
      const schema = templateSchemas[spec.template];
      const parsed = schema.safeParse(data);
      if (parsed.success) {
        data = parsed.data;
      } else {
        problems.push({
          page: pageNumber,
          index,
          message: parsed.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join(' / '),
        });
      }
    } catch (e) {
      problems.push({ page: pageNumber, index, message: (e as Error).message });
    }

    pages.push({
      pageNumber,
      endPageNumber,
      spec,
      data,
      index,
      side: span === 2 ? 'spread' : pageNumber % 2 === 0 ? 'left' : 'right',
    });
  });

  const totalPages = cursor - 1;
  return { issue, pages, spreads: buildSpreads(pages, totalPages, issue), totalPages, problems };
}

/** ページ番号から、それを含むエントリを引く */
export function pageIndexMap(pages: ResolvedPage[]): Map<number, ResolvedPage> {
  const map = new Map<number, ResolvedPage>();
  for (const p of pages) {
    for (let n = p.pageNumber; n <= p.endPageNumber; n++) map.set(n, p);
  }
  return map;
}

function buildSpreads(pages: ResolvedPage[], totalPages: number, issue: Issue): Spread[] {
  const byPage = pageIndexMap(pages);
  const spreads: Spread[] = [];
  const sectionTitle = (p: ResolvedPage | null) =>
    p ? (issue.sections.find((s) => s.id === p.spec.section)?.title ?? p.spec.section) : '';

  // 表紙は単独で1見開き分（左は存在しない）
  const first = byPage.get(1) ?? null;
  spreads.push({ left: null, right: first, spread: null, index: 0, label: `P1 ${sectionTitle(first)}` });

  for (let n = 2; n <= totalPages; n += 2) {
    const leftEntry = byPage.get(n) ?? null;
    const rightEntry = byPage.get(n + 1) ?? null;
    const isSpanning = leftEntry !== null && leftEntry.endPageNumber > leftEntry.pageNumber && leftEntry.pageNumber === n;
    const label = `P${n}${n + 1 <= totalPages ? `–${n + 1}` : ''} ${sectionTitle(leftEntry ?? rightEntry)}`;
    if (isSpanning) {
      spreads.push({ left: null, right: null, spread: leftEntry, index: spreads.length, label });
    } else {
      spreads.push({
        left: leftEntry,
        right: n + 1 <= totalPages ? rightEntry : null,
        spread: null,
        index: spreads.length,
        label,
      });
    }
  }
  return spreads;
}

/** そのページに柱・ノンブルを出すか */
export function showsChrome(page: ResolvedPage, cfg: MagazineConfig): boolean {
  if (page.spec.folio !== undefined) return page.spec.folio;
  if (templateMeta[page.spec.template].chromeless) return false;
  if (cfg.folio.hiddenOn.includes(page.pageNumber)) return false;
  return true;
}
