import { z } from 'zod';
import { TEMPLATE_IDS, type TemplateId } from './templates';

/**
 * 台割（daiwari）＝ 号の設計図。
 * ページ番号は「配列の順序」から自動採番される。だからページの挿入・削除・
 * 並べ替えは配列を動かすだけでよく、全ページの番号を手で振り直す必要がない。
 */

export const pageSpecSchema = z.object({
  /** テンプレートID（src/schema/templates.ts のキー） */
  template: z.enum(TEMPLATE_IDS as [TemplateId, ...TemplateId[]]),
  /** セクションID（issue.sections のいずれか） */
  section: z.string(),
  /** 1 = 単ページ / 2 = 見開き1枚として扱う（偶数ページ始まり必須） */
  span: z.union([z.literal(1), z.literal(2)]).default(1),
  /** 柱（ランニングヘッド）。省略時はセクション名 */
  runningHead: z.string().optional(),
  /** ノンブル表示の上書き */
  folio: z.boolean().optional(),
  /** 面のトーン。テンプレート側の theme と別に、ページ地色を切り替える */
  surface: z.enum(['light', 'alt', 'dark']).optional(),
  /** 編集用メモ。誌面には出力されない */
  note: z.string().optional(),
  flags: z
    .object({
      /** AI生成コンテンツを含む */
      ai: z.boolean().default(false),
      /** 広告面（純広告・タイアップ・有料枠） */
      ad: z.boolean().default(false),
      /** 台割上は確定だが原稿が未入稿 */
      draft: z.boolean().default(false),
    })
    .default({ ai: false, ad: false, draft: false }),
  /** テンプレート固有データ。{"$ref": "feature/interview.json"} で外部ファイル参照可 */
  data: z.unknown(),
});
export type PageSpec = z.infer<typeof pageSpecSchema>;

export const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleEn: z.string().optional(),
  /** 台割UIでの識別色。誌面デザインには使わない */
  color: z.string().optional(),
});

export const issueSchema = z.object({
  id: z.string(),
  /** 号数表記（表紙・奥付で使う） */
  issueLine: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  releaseDate: z.string(),
  /** この号の想定総ページ数。台割と一致しないとバリデーションが警告する */
  pageCount: z.number().int().positive(),
  /** 号単位でのテーマ上書き（色・書体などを部分的に差し替え） */
  themeOverrides: z.record(z.string(), z.string()).optional(),
  /** QRの計測URL一括差し替え設定（設定ファイル側の既定を上書き） */
  qr: z
    .object({
      trackingBase: z.string().nullable().optional(),
      trackingParams: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  sections: z.array(sectionSchema).min(1),
  pages: z.array(pageSpecSchema).min(1),
});
export type Issue = z.infer<typeof issueSchema>;

/** ページ番号が確定した、描画用のページ */
export interface ResolvedPage {
  /** 1始まりのノンブル。span:2 の場合は左ページ番号 */
  pageNumber: number;
  /** span:2 のとき、右ページ番号 */
  endPageNumber: number;
  spec: PageSpec;
  /** バリデーション済みのテンプレートデータ */
  data: unknown;
  /** 台割配列上のindex */
  index: number;
  side: 'left' | 'right' | 'spread';
}

/** 見開き単位のまとまり。左開きなので [1] / [2,3] / [4,5] … と組む */
export interface Spread {
  /** この見開きの左ページ番号（表紙のみ null） */
  left: ResolvedPage | null;
  right: ResolvedPage | null;
  /** 見開きをまたぐ1エントリの場合は spread に入り、left/right は null */
  spread: ResolvedPage | null;
  index: number;
  label: string;
}
