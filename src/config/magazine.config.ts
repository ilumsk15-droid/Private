/**
 * THE INFLUENCER — 誌面の物理仕様・デザイントークンの唯一の情報源。
 *
 * ここを書き換えると、プレビュー・印刷CSS・PDF出力・バリデーションの
 * すべてが同じ値を参照して追従する。個別のコンポーネントに数値を
 * 直接書かないこと（それをやると判型変更が破綻する）。
 */

export type Binding = 'left' | 'right';
export type FolioPosition = 'bottom-outer' | 'bottom-center' | 'bottom-inner' | 'top-outer';

export interface MagazineConfig {
  magazine: {
    /** 誌名（和文表記／英字ロゴ表記） */
    title: string;
    titleEn: string;
    tagline: string;
    publisher: string;
  };
  format: {
    /** 仕上がりサイズ（mm） */
    trim: { width: number; height: number };
    /** 塗り足し（mm・四辺共通） */
    bleed: number;
    /** セーフティマージン：仕上がり位置から内側（mm） */
    safety: number;
    /** ノド逃げ：見開き中央から左右に確保する退避幅（mm）。顔・文字をここに置かない */
    gutterGuard: number;
    /** 綴じ方向。'left' = 左開き・横書き（左ページが偶数、右ページが奇数） */
    binding: Binding;
    /** 入稿想定解像度 */
    exportDpi: number;
  };
  pagination: {
    /** 基本ページ数 */
    basePages: number;
    /** 拡張上限 */
    maxPages: number;
    /** 台割の総ページ数が basePages と違ってもエラーにしない（進行中の号向け） */
    allowPageCountMismatch: boolean;
    /** 面付けの都合上、総ページ数はこの倍数であること */
    signature: number;
  };
  color: {
    base: string;
    accent: string;
    accentAlt: string;
    text: string;
    textMuted: string;
    textOnDark: string;
    background: string;
    backgroundAlt: string;
    backgroundDark: string;
    rule: string;
    placeholder: string;
  };
  typography: {
    families: {
      /** 見出し（和文） */
      display: string;
      /** 本文（和文） */
      body: string;
      /** 明朝：名言・引用・格調が要る箇所 */
      serif: string;
      /** 英字：見出しのアクセント、ノンブル、キャプションのラベル */
      latin: string;
    };
    /** 誌面上の実寸（pt）。印刷物なので pt で持つ */
    size: {
      bodyS: number;
      body: number;
      bodyL: number;
      caption: number;
      credit: number;
      lead: number;
      subhead: number;
      head: number;
      headL: number;
      display: number;
      displayXL: number;
      folio: number;
    };
    leading: { tight: number; body: number; loose: number };
    tracking: { tight: string; normal: string; wide: string; latin: string };
    weight: { light: number; regular: number; medium: number; bold: number };
  };
  layout: {
    /** 版面マージン（mm・仕上がりからの距離） */
    margin: { top: number; outer: number; bottom: number; inner: number };
    /** 段間（mm） */
    columnGap: number;
    /** 既定の段数 */
    defaultColumns: number;
    /** レイアウトグリッド（ガイド表示と一部テンプレートが使用） */
    grid: { columns: number; rows: number };
  };
  folio: {
    position: FolioPosition;
    /** 仕上がり端からの距離（mm） */
    offset: number;
    /** ノンブルと併記する柱（企画名・誌名）を出すか */
    showRunningHead: boolean;
    /** ノンブルを表示しないページ番号（表紙・表2・表3・裏表紙など） */
    hiddenOn: number[];
  };
  image: {
    /** 写真の角丸（mm）。0 = 角丸なし＝既定 */
    cornerRadius: number;
    /** これ未満の実効解像度は警告 */
    minDpi: number;
    /** 未登録画像のプレースホルダー表示 */
    placeholder: { showPath: boolean; showRequiredPx: boolean };
  };
  rule: {
    /** 罫線の太さ（mm）。ヘアラインは 0.1mm 未満にしない（印刷で飛ぶ） */
    hairline: number;
    thick: number;
  };
  qr: {
    /** 誌面上のQRサイズ（mm）。印刷での読み取り下限は 15mm */
    size: number;
    minSize: number;
    errorCorrection: 'L' | 'M' | 'Q' | 'H';
    /** 全QRのURLをこの計測ドメイン経由に一括変換する。null で無効 */
    trackingBase: string | null;
    /** 計測URLに付与するクエリ */
    trackingParams: Record<string, string>;
  };
  caption: {
    /** キャプション本文の前に付く記号 */
    marker: string;
    /** クレジット表記のプレフィックス */
    creditPrefix: string;
  };
  /** 誌面上に必ず表記が要るもの（バリデーションが参照する） */
  compliance: {
    /** 広告面に必要な表記の候補 */
    adLabels: string[];
    /** AI生成コンテンツに必要な表記 */
    aiDisclosure: string;
  };
}

export const magazineConfig: MagazineConfig = {
  magazine: {
    title: 'THE INFLUENCER',
    titleEn: 'THE INFLUENCER',
    tagline: 'THE PEOPLE WHO MOVE THE FEED',
    publisher: 'THE INFLUENCER 編集部',
  },
  format: {
    trim: { width: 210, height: 280 },
    bleed: 3,
    safety: 10,
    gutterGuard: 12,
    binding: 'left',
    exportDpi: 300,
  },
  pagination: {
    basePages: 64,
    maxPages: 128,
    allowPageCountMismatch: false,
    signature: 8,
  },
  color: {
    base: '#101114',
    accent: '#C8102E',
    accentAlt: '#B99049',
    text: '#17181C',
    textMuted: '#6C6F78',
    textOnDark: '#F4F2EE',
    background: '#FFFFFF',
    backgroundAlt: '#F1EFEA',
    backgroundDark: '#101114',
    rule: '#C9C6BF',
    placeholder: '#D9D5CE',
  },
  typography: {
    families: {
      display: '"Zen Kaku Gothic New"',
      body: '"Noto Sans JP"',
      serif: '"Shippori Mincho"',
      latin: '"Inter"',
    },
    size: {
      bodyS: 8.5,
      body: 9.5,
      bodyL: 11,
      caption: 7.5,
      credit: 6.5,
      lead: 13,
      subhead: 16,
      head: 24,
      headL: 36,
      display: 54,
      displayXL: 88,
      folio: 8,
    },
    leading: { tight: 1.35, body: 1.85, loose: 2.1 },
    tracking: { tight: '-0.02em', normal: '0.02em', wide: '0.12em', latin: '0.08em' },
    weight: { light: 300, regular: 400, medium: 500, bold: 700 },
  },
  layout: {
    margin: { top: 18, outer: 16, bottom: 20, inner: 18 },
    columnGap: 6,
    defaultColumns: 2,
    grid: { columns: 12, rows: 16 },
  },
  folio: {
    position: 'bottom-outer',
    offset: 10,
    showRunningHead: true,
    hiddenOn: [1, 2, 3],
  },
  image: {
    cornerRadius: 0,
    minDpi: 300,
    placeholder: { showPath: true, showRequiredPx: true },
  },
  rule: { hairline: 0.2, thick: 1 },
  qr: {
    size: 22,
    minSize: 15,
    errorCorrection: 'M',
    trackingBase: null,
    trackingParams: {},
  },
  caption: { marker: '——', creditPrefix: 'PHOTO:' },
  compliance: {
    adLabels: ['広告', 'PR', 'ADVERTISEMENT', 'Sponsored', 'タイアップ広告'],
    aiDisclosure: 'この記事はAIが生成した内容を含みます',
  },
};

/** 派生値：媒体（塗り足し込み）サイズ */
export function mediaSize(cfg: MagazineConfig = magazineConfig) {
  return {
    width: cfg.format.trim.width + cfg.format.bleed * 2,
    height: cfg.format.trim.height + cfg.format.bleed * 2,
  };
}

/** 派生値：見開き（塗り足し込み）サイズ */
export function spreadMediaSize(cfg: MagazineConfig = magazineConfig) {
  const m = mediaSize(cfg);
  return { width: cfg.format.trim.width * 2 + cfg.format.bleed * 2, height: m.height };
}

/** mm → px（指定dpi）。画像の必要解像度算出に使う */
export function mmToPx(mm: number, dpi = magazineConfig.format.exportDpi) {
  return Math.ceil((mm / 25.4) * dpi);
}

export default magazineConfig;
