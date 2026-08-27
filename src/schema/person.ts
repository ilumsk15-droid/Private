import { z } from 'zod';
import { imageSchema, qrSchema, quoteSchema, statSchema } from './common';

/**
 * 人物マスタ。
 *
 * 「号」ではなく「人」に紐づく情報をここへ一度だけ書く。
 * 号は人物マスタ＋台割レシピから生成されるので、同じ人物で別の号を作るときも、
 * 特集の構成を変えるときも、人物データは書き直さなくてよい。
 *
 * 誌面テンプレートの都合（見出しの長さ、段数など）はここに持ち込まないこと。
 * それは台割レシピとテンプレートの仕事で、混ぜると人物データが使い回せなくなる。
 */

const t = z.string();
const opt = z.string().optional();

/** 人物に紐づく写真。役割ごとに分けておくと、生成時に自動で割り当てられる */
export const personPhotosSchema = z.object({
  /** 表紙用の縦位置ポートレート */
  cover: imageSchema.optional(),
  /** 巻頭の見開き大型写真 */
  heroSpread: imageSchema.optional(),
  /** プロフィールページの縦写真 */
  portrait: imageSchema.optional(),
  /** 記事中に散らす横位置カット */
  scenes: z.array(imageSchema).default([]),
  /** 写真ギャラリー用 */
  gallery: z.array(imageSchema).default([]),
  /** 動画サムネイル */
  thumbnails: z.array(imageSchema).default([]),
});

export const personSchema = z.object({
  /** ファイル名と一致させる識別子（英小文字とハイフン） */
  id: z.string().regex(/^[a-z0-9-]+$/, 'idは英小文字・数字・ハイフンのみ'),
  name: t,
  nameEn: opt,
  reading: opt,
  /** 肩書・ジャンル（表紙や柱に出る） */
  role: opt,
  /** 表紙の大見出し候補。空なら生成時に見出しを手で入れる */
  coverHeadline: opt,
  coverHeadlineEn: opt,
  /** 表紙のサブ見出し */
  coverSubhead: opt,
  tags: z.array(t).default([]),

  /** プロフィール本文（軽量マークダウン可） */
  bio: z.string().default(''),
  facts: z.array(z.object({ label: t, value: t })).default([]),
  sns: z.array(z.object({ platform: t, handle: opt, followers: opt })).default([]),

  /** 数字で見る人物 */
  stats: z.array(statSchema).default([]),
  statsSource: opt,

  /** 経歴・年表 */
  timeline: z
    .array(
      z.object({
        year: t,
        month: opt,
        title: t,
        body: opt,
        highlight: z.boolean().default(false),
      }),
    )
    .default([]),

  /** 事業・活動実績 */
  works: z
    .array(z.object({ name: t, category: opt, since: opt, body: t, metric: opt }))
    .default([]),

  /** 人物相関図 */
  relations: z
    .object({
      note: opt,
      nodes: z
        .array(
          z.object({
            name: t,
            role: opt,
            relation: opt,
            group: opt,
            angle: z.number(),
            distance: z.number().min(0.2).max(1).default(0.75),
          }),
        )
        .default([]),
    })
    .default({ nodes: [] }),

  /** 1日のスケジュール */
  schedule: z.array(z.object({ time: t, title: t, body: opt })).default([]),
  scheduleNote: opt,

  /** 愛用品・仕事道具 */
  gear: z
    .array(z.object({ name: t, brand: opt, body: t, image: imageSchema.optional() }))
    .default([]),

  /** 名言。先頭が「1点見せ」ページに使われる */
  quotes: z.array(quoteSchema).default([]),

  /** 関係者コメント */
  voices: z.array(z.object({ name: t, role: opt, body: t, portrait: imageSchema.optional() })).default([]),

  /** 推奨動画 */
  videos: z
    .array(
      z.object({
        title: t,
        body: opt,
        thumbnail: imageSchema.optional(),
        qr: qrSchema.optional(),
        meta: z.object({ views: opt, date: opt, length: opt }).optional(),
      }),
    )
    .default([]),

  /** ロングインタビュー。複数入れると前編・後編として配置される */
  interviews: z
    .array(
      z.object({
        title: t,
        titleEn: opt,
        lead: opt,
        pullQuote: opt,
        /** 軽量マークダウン。長い原稿は "@people/<id>/interview-1.md" のような外部参照でもよい */
        body: z.union([t, z.object({ $ref: t })]),
      }),
    )
    .default([]),

  /** Q&A（今後の展望など） */
  qa: z.array(z.object({ q: t, a: t })).default([]),

  /** 読み物記事（ターニングポイント等） */
  articles: z
    .array(
      z.object({
        title: t,
        titleEn: opt,
        lead: opt,
        pullQuote: opt,
        body: z.union([t, z.object({ $ref: t })]),
      }),
    )
    .default([]),

  photos: personPhotosSchema.default({ scenes: [], gallery: [], thumbnails: [] }),

  /** 編集メモ。誌面には出ない */
  note: opt,
});

export type Person = z.infer<typeof personSchema>;
export type PersonPhotos = z.infer<typeof personPhotosSchema>;

/** 新規作成時の下敷き。フォームの初期値にも使う */
export function emptyPerson(id = 'new-person'): Person {
  return personSchema.parse({ id, name: '', bio: '' });
}
