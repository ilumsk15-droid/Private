import { z } from 'zod';

/**
 * 全テンプレートが共有する最小単位。
 * ここに無い形のデータをテンプレート側で発明しないこと（差し替え互換が崩れる）。
 */

/** object-position 相当。写真のトリミング位置を誌面データ側から指定する */
export const focusSchema = z
  .object({
    /** 0–100（%）。左端=0 */
    x: z.number().min(0).max(100).default(50),
    /** 0–100（%）。上端=0 */
    y: z.number().min(0).max(100).default(50),
  })
  .default({ x: 50, y: 50 });

export const imageSchema = z.object({
  /** public/ からの絶対パス。未登録は空文字にせず null を入れる（プレースホルダー表示） */
  src: z.string().nullable(),
  alt: z.string().min(1, 'alt は必須（入稿チェックと可読性のため）'),
  credit: z.string().optional(),
  caption: z.string().optional(),
  focus: focusSchema.optional(),
  fit: z.enum(['cover', 'contain']).default('cover'),
  /** 見開きにまたがる写真か。true のとき綴じ位置の顔逃げ判定の対象になる */
  spread: z.boolean().default(false),
  /** 綴じ側へ寄りすぎた被写体を逃がす微調整（mm・正で外側へ） */
  gutterShift: z.number().default(0),
  /** 実寸配置サイズ（mm）。解像度チェックに使う。未指定ならページ幅で概算 */
  placedWidthMm: z.number().positive().optional(),
});
export type ImageRef = z.infer<typeof imageSchema>;

export const qrSchema = z.object({
  /** null / 未設定なら QR は描画しない */
  url: z.string().url().nullable(),
  label: z.string().optional(),
  note: z.string().optional(),
  /** mm。省略時は設定値 */
  size: z.number().positive().optional(),
});
export type QRRef = z.infer<typeof qrSchema>;

export const quoteSchema = z.object({
  text: z.string().min(1),
  source: z.string().optional(),
  context: z.string().optional(),
});
export type Quote = z.infer<typeof quoteSchema>;

/** 本文。文字列（軽量マークダウン）か、段落配列 */
export const bodySchema = z.union([z.string(), z.array(z.string())]);

export const statSchema = z.object({
  value: z.string(),
  unit: z.string().optional(),
  label: z.string(),
  note: z.string().optional(),
});

export const personSchema = z.object({
  name: z.string(),
  nameEn: z.string().optional(),
  role: z.string().optional(),
  portrait: imageSchema.optional(),
});

/** 見出し群：ほぼ全テンプレートが持つ */
export const headingSchema = {
  eyebrow: z.string().optional(),
  title: z.string(),
  titleEn: z.string().optional(),
  subtitle: z.string().optional(),
  lead: z.string().optional(),
};
