import type { TemplateId } from '../schema/templates';

/**
 * 台割レシピ＝「どの企画を、どの順で、何ページ使って並べるか」の型紙。
 *
 * 人物マスタが「誰の話か」を持ち、レシピが「どう構成するか」を持つ。
 * この2つを掛け合わせて号を生成するので、
 *   - 同じ人物で構成違いの号を作る
 *   - 同じ構成で人物だけ差し替える
 * のどちらも、片方を書き直さずにできる。
 */

/** ページ1枠ぶんの指定 */
export interface Slot {
  template: TemplateId;
  section: string;
  span?: 1 | 2;
  surface?: 'light' | 'alt' | 'dark';
  /** 人物マスタのどこを流し込むか（generate.ts の fillers のキー） */
  fill: string;
  /** 同じ fill を複数ページで使うときの取り出し位置（インタビュー1本目/2本目など） */
  index?: number;
  flags?: { ai?: boolean; ad?: boolean; draft?: boolean };
  runningHead?: string;
  note?: string;
}

export interface Block {
  id: string;
  label: string;
  /** このブロックが始まるページの偶奇。見開きの整合を崩さないための宣言 */
  startsOn: 'any' | 'even' | 'odd';
  slots: Slot[];
}

export interface Recipe {
  id: string;
  label: string;
  description: string;
  pageCount: number;
  blockIds: string[];
}

const S = (
  template: TemplateId,
  section: string,
  fill: string,
  extra: Partial<Slot> = {},
): Slot => ({ template, section, fill, span: 1, ...extra });

/* ============================ ブロック定義 ============================ */

/** 表紙〜巻頭プロローグ（9P） */
const frontMatter: Block = {
  id: 'front-matter',
  label: '表紙・導入',
  startsOn: 'any',
  slots: [
    S('cover-portrait', 'cover', 'cover', { note: 'P1 表紙' }),
    S('ad-single', 'ad', 'adSingle', { flags: { ad: true }, note: 'P2 表2広告' }),
    S('feature-door', 'feature', 'featureDoor', { surface: 'dark', note: 'P3 特集扉' }),
    S('contents', 'front', 'contents', { span: 2, note: 'P4-5 目次（生成時に自動作成）' }),
    S('editors-letter', 'front', 'editorsLetter', { span: 2, note: 'P6-7 編集長メッセージ' }),
    S('photo-spread-full', 'feature', 'prologue', { span: 2, note: 'P8-9 巻頭プロローグ' }),
  ],
};

/** 巻頭大型特集の本体（23P・偶数ページ始まり） */
const featureCore: Block = {
  id: 'feature-core',
  label: '巻頭大型特集',
  startsOn: 'even',
  slots: [
    S('photo-spread-full', 'feature', 'heroSpread', { span: 2 }),
    S('profile', 'feature', 'profile', { span: 2 }),
    S('interview-long', 'feature', 'interview', { span: 2, index: 0 }),
    S('interview-long', 'feature', 'interview', { span: 2, index: 1 }),
    S('timeline', 'feature', 'timeline', { span: 2 }),
    S('numbers', 'feature', 'numbers', { span: 2, surface: 'alt' }),
    S('works', 'feature', 'works'),
    S('relationship-map', 'feature', 'relations'),
    S('feature-article', 'feature', 'article', { span: 2, index: 0 }),
    S('daily-schedule', 'feature', 'schedule'),
    S('gear', 'feature', 'gear'),
    S('quote-collection', 'feature', 'quotes', { span: 2, surface: 'alt' }),
    S('voices', 'feature', 'voices'),
    S('video-qr', 'feature', 'videos'),
    S('interview-qa', 'feature', 'qa'),
  ],
};

/** 特集の増ページ分（16P・奇数ページ始まり） */
const featureExtra: Block = {
  id: 'feature-extra',
  label: '特集の増ページ',
  startsOn: 'odd',
  slots: [
    S('photo-gallery', 'feature', 'gallery'),
    S('interview-long', 'feature', 'interview', { span: 2, index: 2 }),
    S('feature-article', 'feature', 'article', { span: 2, index: 1 }),
    S('photo-spread-full', 'feature', 'heroSpread', { span: 2, index: 1 }),
    S('editors-review', 'feature', 'reviewSkeleton', { span: 2 }),
    S('comparison-table', 'feature', 'comparisonSkeleton', { span: 2 }),
    S('quote-solo', 'feature', 'quoteHero', { surface: 'dark' }),
    S('column', 'feature', 'columnSkeleton'),
    S('quote-annotated', 'feature', 'quoteAnnotated'),
    S('ad-single', 'ad', 'adSingle', { flags: { ad: true }, index: 1 }),
    S('video-thumbnails', 'feature', 'videoThumbs'),
  ],
};

/** 後半企画の本体（28P・奇数ページ始まり） */
const halfCore: Block = {
  id: 'half-core',
  label: '後半企画',
  startsOn: 'odd',
  slots: [
    S('photo-gallery', 'feature', 'gallery', { index: 1 }),
    S('section-divider', 'half', 'dividerHalf', { surface: 'dark' }),
    S('quote-solo', 'half', 'quoteHero', { surface: 'dark' }),
    S('dialogue-two', 'half', 'dialogueSkeleton', { span: 2 }),
    S('roundtable', 'half', 'roundtableSkeleton', { span: 2 }),
    S('ai-dialogue', 'half', 'aiDialogueSkeleton', { span: 2, flags: { ai: true } }),
    S('ad-spread', 'ad', 'adSpread', { span: 2, flags: { ad: true } }),
    S('ranking-top10', 'ranking', 'rankingTop10', { span: 2 }),
    S('ranking-top30', 'ranking', 'rankingTop30', { span: 2 }),
    S('ranking-detail', 'ranking', 'rankingDetail'),
    S('positioning-map', 'ranking', 'positioningSkeleton'),
    S('data-chart', 'ranking', 'dataSkeleton', { span: 2, surface: 'alt' }),
    S('comparison-table', 'ranking', 'comparisonSkeleton', { index: 1 }),
    S('video-ranking', 'half', 'videoRanking'),
    S('video-thumbnails', 'half', 'videoThumbs', { index: 1 }),
    S('editors-review', 'half', 'reviewSkeleton', { index: 1 }),
    S('survey-results', 'half', 'surveySkeleton', { span: 2 }),
    S('pros-cons', 'half', 'prosConsSkeleton'),
    S('column', 'half', 'columnSkeleton', { index: 1 }),
    S('tie-up', 'ad', 'tieUp', { flags: { ad: true } }),
  ],
};

/** 後半の増ページ分（16P・奇数ページ始まり） */
const halfExtra: Block = {
  id: 'half-extra',
  label: '後半の増ページ',
  startsOn: 'odd',
  slots: [
    S('section-divider', 'half', 'dividerHalf', { surface: 'dark', index: 1 }),
    S('feature-article', 'half', 'article', { span: 2, index: 2 }),
    S('roundtable', 'half', 'roundtableSkeleton', { span: 2, index: 1 }),
    S('data-chart', 'ranking', 'dataSkeleton', { span: 2, index: 1, surface: 'alt' }),
    S('quote-collection', 'half', 'quotes', { span: 2, index: 1 }),
    S('survey-results', 'half', 'surveySkeleton', { span: 2, index: 1 }),
    S('editors-review', 'half', 'reviewSkeleton', { index: 2 }),
    S('ad-single', 'ad', 'adSingle', { flags: { ad: true }, index: 2 }),
    S('column', 'half', 'columnSkeleton', { index: 2 }),
    S('video-thumbnails', 'half', 'videoThumbs', { index: 2 }),
    S('quote-solo', 'half', 'quoteHero', { surface: 'dark', index: 2 }),
  ],
};

/** 巻末（4P・奇数ページ始まり）。増ページしても必ず最後に来る */
const backMatter: Block = {
  id: 'back-matter',
  label: '巻末',
  startsOn: 'odd',
  slots: [
    S('paid-profile', 'ad', 'paidProfile', { flags: { ad: true } }),
    S('next-issue', 'back', 'nextIssue'),
    S('colophon', 'back', 'colophon'),
    S('cover-back-ad', 'ad', 'backCover', { flags: { ad: true } }),
  ],
};

export const blocks: Record<string, Block> = {
  'front-matter': frontMatter,
  'feature-core': featureCore,
  'feature-extra': featureExtra,
  'half-core': halfCore,
  'half-extra': halfExtra,
  'back-matter': backMatter,
};

export const recipes: Recipe[] = [
  {
    id: 'standard-64',
    label: '標準 64ページ',
    description: '表紙〜導入9P／巻頭大型特集23P／後半企画32P。創刊号と同じ構成。',
    pageCount: 64,
    blockIds: ['front-matter', 'feature-core', 'half-core', 'back-matter'],
  },
  {
    id: 'extended-96',
    label: '拡大 96ページ',
    description: '特集を16P、後半を16P増やした構成。人物の情報量が多いときに。',
    pageCount: 96,
    blockIds: ['front-matter', 'feature-core', 'feature-extra', 'half-core', 'half-extra', 'back-matter'],
  },
  {
    id: 'maximum-128',
    label: '最大 128ページ',
    description: '特集32P増・後半32P増。特集号・保存版向け。',
    pageCount: 128,
    blockIds: [
      'front-matter',
      'feature-core',
      'feature-extra',
      'feature-extra',
      'half-core',
      'half-extra',
      'half-extra',
      'back-matter',
    ],
  },
];

export const findRecipe = (id: string) => recipes.find((r) => r.id === id);

/** レシピを平らなスロット列に展開する。同じブロックを2回使う場合は index をずらす */
export function expandRecipe(recipe: Recipe): Slot[] {
  const seen = new Map<string, number>();
  const out: Slot[] = [];
  for (const blockId of recipe.blockIds) {
    const block = blocks[blockId];
    if (!block) throw new Error(`未定義のブロック: ${blockId}`);
    const round = seen.get(blockId) ?? 0;
    seen.set(blockId, round + 1);
    for (const slot of block.slots) {
      out.push(round === 0 ? { ...slot } : { ...slot, index: (slot.index ?? 0) + round * 4 });
    }
  }
  return out;
}

/** 展開したスロット列の総ページ数 */
export const slotPageCount = (slots: Slot[]) => slots.reduce((n, s) => n + (s.span ?? 1), 0);
