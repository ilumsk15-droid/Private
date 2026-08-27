import { z } from 'zod';
import { bodySchema, imageSchema, personSchema, qrSchema, quoteSchema, statSchema } from './common';

/**
 * テンプレートごとのデータ定義。
 * React に依存しない純 zod なので、Node 側のバリデータからも読み込める。
 * 新しいテンプレートを足すときは (1) ここにスキーマ (2) templateMeta に情報
 * (3) src/templates/registry.tsx に描画コンポーネント、の3点セット。
 */

const opt = z.string().optional();
const t = z.string();

/* ============================ 表紙系 ============================ */
const coverLine = z.object({
  text: t,
  emphasis: z.enum(['xl', 'l', 'm', 's']).default('m'),
  accent: z.boolean().default(false),
});
const coverCommon = {
  issueLine: opt,
  dateLine: opt,
  priceLine: opt,
  barcode: z.boolean().default(false),
  coverLines: z.array(coverLine).default([]),
};

export const templateSchemas = {
  'cover-portrait': z.object({
    ...coverCommon,
    image: imageSchema,
    headline: t,
    headlineEn: opt,
    subhead: opt,
  }),
  'cover-headline': z.object({
    ...coverCommon,
    image: imageSchema,
    headline: t,
    headlineEn: opt,
    subhead: opt,
    kicker: opt,
  }),
  'cover-multi': z.object({
    ...coverCommon,
    images: z.array(imageSchema).min(2),
    headline: t,
    headlineEn: opt,
    names: z.array(t).default([]),
  }),
  'cover-back-ad': z.object({
    label: t,
    brand: t,
    copy: opt,
    body: opt,
    image: imageSchema.optional(),
    url: opt,
    qr: qrSchema.optional(),
    /** 写真の明暗に合わせて文字色を切り替える */
    theme: z.enum(['light', 'dark']).default('dark'),
  }),

  /* ========================= 扉・目次系 ========================= */
  'feature-door': z.object({
    eyebrow: opt,
    title: t,
    titleEn: opt,
    lead: opt,
    image: imageSchema.optional(),
    theme: z.enum(['light', 'dark']).default('dark'),
  }),
  contents: z.object({
    title: t,
    titleEn: opt,
    note: opt,
    image: imageSchema.optional(),
    entries: z
      .array(
        z.object({
          page: z.number().int().positive(),
          section: opt,
          title: t,
          subtitle: opt,
          kicker: opt,
        }),
      )
      .min(1),
  }),
  'editors-letter': z.object({
    title: t,
    titleEn: opt,
    body: bodySchema,
    signature: z.object({ name: t, role: opt }),
    portrait: imageSchema.optional(),
    image: imageSchema.optional(),
  }),
  'section-divider': z.object({
    number: opt,
    title: t,
    titleEn: opt,
    lead: opt,
    image: imageSchema.optional(),
    theme: z.enum(['light', 'dark', 'accent']).default('accent'),
  }),

  /* ========================= 人物特集系 ========================= */
  'photo-spread-full': z.object({
    image: imageSchema,
    overlayTitle: opt,
    overlayQuote: opt,
    align: z.enum(['left', 'right', 'center']).default('left'),
  }),
  profile: z.object({
    image: imageSchema,
    name: t,
    nameEn: opt,
    reading: opt,
    tags: z.array(t).default([]),
    body: bodySchema,
    facts: z.array(z.object({ label: t, value: t })).default([]),
    sns: z
      .array(z.object({ platform: t, handle: opt, followers: opt }))
      .default([]),
  }),
  'interview-long': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    body: bodySchema,
    columns: z.number().int().min(1).max(3).default(2),
    image: imageSchema.optional(),
    pullQuote: opt,
  }),
  'interview-qa': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    image: imageSchema.optional(),
    qa: z.array(z.object({ q: t, a: t })).min(1),
  }),
  timeline: z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    image: imageSchema.optional(),
    items: z
      .array(
        z.object({
          year: t,
          month: opt,
          title: t,
          body: opt,
          highlight: z.boolean().default(false),
        }),
      )
      .min(1),
  }),
  numbers: z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    stats: z.array(statSchema).min(1),
    source: opt,
  }),
  works: z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    image: imageSchema.optional(),
    items: z
      .array(
        z.object({
          name: t,
          category: opt,
          since: opt,
          body: t,
          metric: opt,
        }),
      )
      .min(1),
  }),
  'relationship-map': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    center: z.object({ name: t, role: opt }),
    nodes: z
      .array(
        z.object({
          name: t,
          role: opt,
          relation: opt,
          group: opt,
          /** 中心からの角度（度・0=右, 時計回り）と距離（0–1） */
          angle: z.number(),
          distance: z.number().min(0.2).max(1).default(0.75),
        }),
      )
      .min(1),
    note: opt,
  }),
  'daily-schedule': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    image: imageSchema.optional(),
    items: z.array(z.object({ time: t, title: t, body: opt })).min(1),
    note: opt,
  }),
  gear: z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    items: z
      .array(z.object({ name: t, brand: opt, body: t, image: imageSchema.optional() }))
      .min(1),
    note: opt,
  }),
  voices: z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    comments: z
      .array(z.object({ name: t, role: opt, body: t, portrait: imageSchema.optional() }))
      .min(1),
  }),
  'photo-gallery': z.object({
    title: opt,
    titleEn: opt,
    images: z.array(imageSchema).min(2),
    layout: z.enum(['grid', 'mosaic', 'strip']).default('mosaic'),
  }),

  /* ========================= 名言・動画系 ========================= */
  'quote-solo': z.object({
    quote: quoteSchema,
    image: imageSchema.optional(),
    theme: z.enum(['light', 'dark', 'accent']).default('dark'),
  }),
  'quote-collection': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    quotes: z.array(quoteSchema).min(2),
  }),
  'quote-annotated': z.object({
    title: opt,
    quote: quoteSchema,
    annotation: bodySchema,
    image: imageSchema.optional(),
  }),
  'video-qr': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    videos: z
      .array(
        z.object({
          title: t,
          body: opt,
          thumbnail: imageSchema.optional(),
          qr: qrSchema,
          meta: z.object({ views: opt, date: opt, length: opt }).optional(),
        }),
      )
      .min(1),
  }),
  'video-ranking': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    items: z
      .array(
        z.object({
          rank: z.number().int().positive(),
          title: t,
          channel: opt,
          views: opt,
          body: opt,
          thumbnail: imageSchema.optional(),
          qr: qrSchema.optional(),
        }),
      )
      .min(1),
  }),
  'video-thumbnails': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    items: z
      .array(
        z.object({
          title: t,
          thumbnail: imageSchema,
          meta: opt,
          qr: qrSchema.optional(),
        }),
      )
      .min(2),
  }),

  /* ========================= 対談・企画系 ========================= */
  'dialogue-two': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    speakers: z.array(personSchema).length(2),
    turns: z.array(z.object({ speaker: z.number().int().min(0), text: t })).min(1),
    image: imageSchema.optional(),
  }),
  roundtable: z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    speakers: z.array(personSchema).min(3),
    turns: z.array(z.object({ speaker: z.number().int().min(0), text: t })).min(1),
    image: imageSchema.optional(),
  }),
  'ai-dialogue': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    speakers: z.array(personSchema).min(2),
    turns: z.array(z.object({ speaker: z.number().int().min(0), text: t })).min(1),
    /** AI生成であることの明示。空にするとバリデーションがエラーにする */
    disclosure: t,
  }),
  'survey-results': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    sampleNote: opt,
    questions: z
      .array(
        z.object({
          q: t,
          unit: z.string().default('%'),
          options: z.array(z.object({ label: t, value: z.number() })).min(2),
          note: opt,
        }),
      )
      .min(1),
  }),
  'pros-cons': z.object({
    title: t,
    titleEn: opt,
    topic: t,
    lead: opt,
    pro: z.object({
      label: z.string().default('賛成'),
      points: z.array(z.object({ title: t, body: t })).min(1),
    }),
    con: z.object({
      label: z.string().default('反対'),
      points: z.array(z.object({ title: t, body: t })).min(1),
    }),
    conclusion: opt,
  }),
  'editors-review': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    items: z
      .array(
        z.object({
          title: t,
          subtitle: opt,
          score: z.number().min(0).max(5).optional(),
          verdict: opt,
          body: t,
          image: imageSchema.optional(),
        }),
      )
      .min(1),
  }),
  'feature-article': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    body: bodySchema,
    columns: z.number().int().min(1).max(3).default(2),
    images: z.array(imageSchema).default([]),
    pullQuote: opt,
  }),
  column: z.object({
    title: t,
    titleEn: opt,
    body: bodySchema,
    author: z.object({ name: t, role: opt }).optional(),
    image: imageSchema.optional(),
  }),

  /* ======================= ランキング・データ系 ======================= */
  'ranking-top10': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    criteria: opt,
    items: z
      .array(
        z.object({
          rank: z.number().int().positive(),
          name: t,
          category: opt,
          score: opt,
          body: opt,
          portrait: imageSchema.optional(),
        }),
      )
      .min(1),
  }),
  'ranking-top30': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    criteria: opt,
    columns: z.number().int().min(1).max(3).default(2),
    items: z
      .array(
        z.object({
          rank: z.number().int().positive(),
          name: t,
          category: opt,
          score: opt,
        }),
      )
      .min(1),
  }),
  'ranking-detail': z.object({
    title: t,
    titleEn: opt,
    rank: z.number().int().positive(),
    name: t,
    category: opt,
    body: bodySchema,
    stats: z.array(statSchema).default([]),
    image: imageSchema.optional(),
    quote: quoteSchema.optional(),
  }),
  'data-chart': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    source: opt,
    charts: z
      .array(
        z.object({
          type: z.enum(['bar', 'column', 'line', 'donut']),
          title: t,
          unit: opt,
          note: opt,
          series: z.array(z.object({ label: t, value: z.number() })).min(2),
        }),
      )
      .min(1),
  }),
  'positioning-map': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    axes: z.object({
      x: z.object({ label: t, low: t, high: t }),
      y: z.object({ label: t, low: t, high: t }),
    }),
    points: z
      .array(
        z.object({
          name: t,
          /** 0–100 */
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          group: opt,
        }),
      )
      .min(2),
    note: opt,
  }),
  'comparison-table': z.object({
    title: t,
    titleEn: opt,
    lead: opt,
    head: z.array(t).min(2),
    rows: z.array(z.object({ label: t, cells: z.array(t).min(1) })).min(1),
    note: opt,
  }),

  /* ========================= 広告・終盤系 ========================= */
  'ad-single': z.object({
    label: t,
    brand: t,
    copy: opt,
    body: opt,
    image: imageSchema.optional(),
    url: opt,
    qr: qrSchema.optional(),
    theme: z.enum(['light', 'dark']).default('light'),
  }),
  'ad-spread': z.object({
    label: t,
    brand: t,
    copy: opt,
    body: opt,
    image: imageSchema.optional(),
    qr: qrSchema.optional(),
    theme: z.enum(['light', 'dark']).default('dark'),
  }),
  'tie-up': z.object({
    label: t,
    title: t,
    titleEn: opt,
    brand: t,
    lead: opt,
    body: bodySchema,
    images: z.array(imageSchema).default([]),
    qr: qrSchema.optional(),
  }),
  'paid-profile': z.object({
    label: t,
    title: t,
    titleEn: opt,
    people: z
      .array(
        z.object({
          name: t,
          title: opt,
          org: opt,
          body: t,
          portrait: imageSchema.optional(),
          qr: qrSchema.optional(),
        }),
      )
      .min(1),
  }),
  'next-issue': z.object({
    title: t,
    titleEn: opt,
    issueLine: t,
    onSaleLine: t,
    image: imageSchema.optional(),
    highlights: z.array(z.object({ title: t, body: opt })).min(1),
  }),
  colophon: z.object({
    title: t,
    titleEn: opt,
    issueLine: t,
    staff: z.array(z.object({ role: t, names: z.array(t).min(1) })).min(1),
    imprint: z.array(z.object({ label: t, value: t })).default([]),
    notices: z.array(t).default([]),
  }),
} as const;

export type TemplateId = keyof typeof templateSchemas;
export const TEMPLATE_IDS = Object.keys(templateSchemas) as TemplateId[];

export type TemplateCategory =
  | 'cover'
  | 'front'
  | 'feature'
  | 'quote'
  | 'talk'
  | 'data'
  | 'ad';

export interface TemplateMeta {
  id: TemplateId;
  /** 台割・プレビューUIでの表示名 */
  label: string;
  category: TemplateCategory;
  /** 許可されるページ幅。2 は見開き固定、[1,2] は両対応 */
  spans: (1 | 2)[];
  /** ノンブル・柱を出さない面か（表紙・広告など） */
  chromeless?: boolean;
  /** 広告表記が必須か */
  requiresAdLabel?: boolean;
  /** AI生成表記が必須か */
  requiresAiDisclosure?: boolean;
}

const meta = (
  id: TemplateId,
  label: string,
  category: TemplateCategory,
  spans: (1 | 2)[],
  extra: Partial<TemplateMeta> = {},
): TemplateMeta => ({ id, label, category, spans, ...extra });

export const templateMeta: Record<TemplateId, TemplateMeta> = {
  'cover-portrait': meta('cover-portrait', '表紙／人物1名', 'cover', [1], { chromeless: true }),
  'cover-headline': meta('cover-headline', '表紙／人物＋大見出し', 'cover', [1], { chromeless: true }),
  'cover-multi': meta('cover-multi', '表紙／複数人物', 'cover', [1], { chromeless: true }),
  'cover-back-ad': meta('cover-back-ad', '裏表紙広告', 'cover', [1], { chromeless: true, requiresAdLabel: true }),

  'feature-door': meta('feature-door', '特集扉', 'front', [1, 2]),
  contents: meta('contents', '目次', 'front', [1, 2]),
  'editors-letter': meta('editors-letter', '編集長メッセージ', 'front', [1, 2]),
  'section-divider': meta('section-divider', 'セクション区切り', 'front', [1, 2]),

  'photo-spread-full': meta('photo-spread-full', '全面写真見開き', 'feature', [1, 2], { chromeless: true }),
  profile: meta('profile', '写真＋プロフィール', 'feature', [1, 2]),
  'interview-long': meta('interview-long', 'ロングインタビュー', 'feature', [1, 2]),
  'interview-qa': meta('interview-qa', 'Q&Aインタビュー', 'feature', [1, 2]),
  timeline: meta('timeline', '経歴・年表', 'feature', [1, 2]),
  numbers: meta('numbers', '数字で見る人物', 'feature', [1, 2]),
  works: meta('works', '事業・活動実績', 'feature', [1, 2]),
  'relationship-map': meta('relationship-map', '人物相関図', 'feature', [1, 2]),
  'daily-schedule': meta('daily-schedule', '1日のスケジュール', 'feature', [1, 2]),
  gear: meta('gear', '愛用品・仕事道具', 'feature', [1, 2]),
  voices: meta('voices', '関係者コメント', 'feature', [1, 2]),
  'photo-gallery': meta('photo-gallery', '写真ギャラリー', 'feature', [1, 2]),

  'quote-solo': meta('quote-solo', '名言1点見せ', 'quote', [1, 2]),
  'quote-collection': meta('quote-collection', '名言集', 'quote', [1, 2]),
  'quote-annotated': meta('quote-annotated', '名言＋解説', 'quote', [1, 2]),
  'video-qr': meta('video-qr', '動画紹介＋QR', 'quote', [1, 2]),
  'video-ranking': meta('video-ranking', 'おすすめ動画ランキング', 'quote', [1, 2]),
  'video-thumbnails': meta('video-thumbnails', '動画サムネイル一覧', 'quote', [1, 2]),

  'dialogue-two': meta('dialogue-two', '2名対談', 'talk', [1, 2]),
  roundtable: meta('roundtable', '座談会', 'talk', [1, 2]),
  'ai-dialogue': meta('ai-dialogue', 'AIバーチャル対談', 'talk', [1, 2], { requiresAiDisclosure: true }),
  'survey-results': meta('survey-results', 'アンケート結果', 'talk', [1, 2]),
  'pros-cons': meta('pros-cons', '賛成・反対', 'talk', [1, 2]),
  'editors-review': meta('editors-review', '編集部レビュー', 'talk', [1, 2]),
  'feature-article': meta('feature-article', '特集記事', 'talk', [1, 2]),
  column: meta('column', 'コラム', 'talk', [1, 2]),

  'ranking-top10': meta('ranking-top10', 'TOP10ランキング', 'data', [1, 2]),
  'ranking-top30': meta('ranking-top30', 'TOP30ランキング', 'data', [1, 2]),
  'ranking-detail': meta('ranking-detail', 'ランキング詳細', 'data', [1, 2]),
  'data-chart': meta('data-chart', 'グラフ・データ分析', 'data', [1, 2]),
  'positioning-map': meta('positioning-map', '勢力図・ポジショニングマップ', 'data', [1, 2]),
  'comparison-table': meta('comparison-table', '比較表', 'data', [1, 2]),

  'ad-single': meta('ad-single', '1ページ広告', 'ad', [1], { chromeless: true, requiresAdLabel: true }),
  'ad-spread': meta('ad-spread', '見開き広告', 'ad', [2], { chromeless: true, requiresAdLabel: true }),
  'tie-up': meta('tie-up', 'タイアップ記事', 'ad', [1, 2], { requiresAdLabel: true }),
  'paid-profile': meta('paid-profile', '有料人物紹介枠', 'ad', [1, 2], { requiresAdLabel: true }),
  'next-issue': meta('next-issue', '次号予告', 'ad', [1, 2]),
  colophon: meta('colophon', '奥付', 'ad', [1]),
};

export type TemplateData<K extends TemplateId = TemplateId> = z.infer<(typeof templateSchemas)[K]>;
