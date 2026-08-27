import type { Person } from '../schema/person';
import type { Issue, PageSpec } from '../schema/issue';
import type { ImageRef } from '../schema/common';
import { templateMeta } from '../schema/templates';
import { expandRecipe, slotPageCount, type Recipe, type Slot } from './recipe';

/**
 * 人物マスタ ＋ 台割レシピ → 号（issue.json）
 *
 * 生成結果は「その時点のスナップショット」として書き出す。人物マスタを直接
 * 参照し続ける作りにしないのは、校了した号があとから勝手に変わると事故になるため。
 * 人物を直したら、もう一度生成し直すか、号のデータを直接直す。
 */

export interface IssueMeta {
  id: string;
  issueLine: string;
  title: string;
  subtitle?: string;
  releaseDate: string;
  /** 表紙の価格表記など */
  priceLine?: string;
  dateLine?: string;
  editorInChief?: string;
  publisher?: string;
}

export interface FillResult {
  data: unknown;
  /** 目次に載せる情報。省略すると目次に出ない */
  toc?: { kicker?: string; title: string; subtitle?: string };
  /** 原稿がまだ無く、雛形だけ置いた状態か */
  draft?: boolean;
}

/** 写真を重複なく配る。足りなくなったら null（＝プレースホルダー）を返す */
class PhotoDispenser {
  private used = new Set<string>();
  constructor(private person: Person) {}

  private mark(img?: ImageRef | null): ImageRef | undefined {
    if (!img?.src) return img ?? undefined;
    this.used.add(img.src);
    return img;
  }

  /** 役割つきの1枚（表紙・見開き・プロフィール）。使い回しを許す */
  role(key: 'cover' | 'heroSpread' | 'portrait'): ImageRef | undefined {
    return this.mark(this.person.photos[key] ?? undefined);
  }

  /** プール（scenes / gallery / thumbnails）から未使用を1枚 */
  take(pool: 'scenes' | 'gallery' | 'thumbnails'): ImageRef | undefined {
    const list = this.person.photos[pool] ?? [];
    const fresh = list.find((i) => i.src && !this.used.has(i.src));
    return this.mark(fresh ?? undefined);
  }

  /** プールからn枚。足りない分は未登録枠（プレースホルダー）で埋める */
  takeMany(pool: 'scenes' | 'gallery' | 'thumbnails', n: number, alt: string): ImageRef[] {
    const out: ImageRef[] = [];
    for (let i = 0; i < n; i++) {
      const img = this.take(pool);
      out.push(img ?? placeholderImage(`${alt}${i + 1}`));
    }
    return out;
  }
}

export function placeholderImage(alt: string): ImageRef {
  return { src: null, alt, fit: 'cover', spread: false, gutterShift: 0 };
}

interface Ctx {
  person: Person;
  meta: IssueMeta;
  photos: PhotoDispenser;
  /** スロットの index（インタビュー2本目など） */
  i: number;
  slot: Slot;
}

const DRAFT = '（未入稿）';
const draftNote = (what: string) => `${DRAFT}ここに${what}が入ります。人物データまたはこの号のデータを編集して差し替えてください。`;

const bodyOf = (v: string | { $ref: string } | undefined, fallback: string) =>
  v === undefined ? fallback : (v as string | { $ref: string });

/* ============================ 人物データから作る面 ============================ */

const fillers: Record<string, (c: Ctx) => FillResult> = {
  cover: ({ person, meta, photos }) => ({
    data: {
      issueLine: meta.issueLine,
      dateLine: meta.dateLine ?? meta.releaseDate,
      priceLine: meta.priceLine ?? '',
      barcode: true,
      image: photos.role('cover') ?? placeholderImage(`${person.name}の表紙写真`),
      headline: person.coverHeadline || meta.title,
      headlineEn: person.coverHeadlineEn ?? '',
      subhead: person.coverSubhead ?? '',
      coverLines: [
        { text: `巻頭大特集｜${person.name}${person.role ? `　${person.role}` : ''}`, emphasis: 'l', accent: true },
        ...(person.interviews[0] ? [{ text: `ロングインタビュー　「${person.interviews[0].title.replace(/\n/g, '')}」`, emphasis: 'm', accent: false }] : []),
        ...(person.quotes[0] ? [{ text: `編集部が選ぶ名言${person.quotes.length}`, emphasis: 's', accent: false }] : []),
      ],
    },
  }),

  featureDoor: ({ person, meta, photos }) => ({
    data: {
      eyebrow: `${meta.issueLine} / COVER FEATURE`,
      title: person.coverHeadline || meta.title,
      titleEn: person.coverHeadlineEn ?? 'COVER FEATURE',
      lead: person.coverSubhead ?? draftNote('特集のリード文'),
      image: photos.role('heroSpread') ?? placeholderImage(`${person.name}の扉写真`),
      theme: 'dark',
    },
  }),

  prologue: ({ person, meta, photos }) => {
    const img = photos.take('scenes') ?? placeholderImage('プロローグの見開き写真');
    return {
      data: {
        image: { ...img, spread: true, placedWidthMm: 426 },
        overlayTitle: meta.subtitle || `${person.name}という現象`,
        overlayQuote: person.quotes[0]?.text ?? draftNote('プロローグの一文'),
        align: 'left',
      },
      toc: { kicker: 'PROLOGUE', title: meta.subtitle || `${person.name}という現象` },
    };
  },

  heroSpread: ({ person, photos, i }) => {
    const img = (i === 0 ? photos.role('heroSpread') : photos.take('scenes')) ?? placeholderImage('大型人物写真');
    return {
      data: {
        image: { ...img, spread: true, placedWidthMm: 426 },
        overlayTitle: i === 0 ? `${person.name}という現象` : '',
        overlayQuote: person.quotes[i]?.text ?? '',
        align: i === 0 ? 'right' : 'left',
      },
      toc: i === 0 ? { kicker: 'PORTRAIT', title: `${person.name}という現象` } : undefined,
    };
  },

  profile: ({ person, photos }) => ({
    data: {
      image: photos.role('portrait') ?? placeholderImage(`${person.name}のポートレート`),
      name: person.name,
      nameEn: person.nameEn ?? '',
      reading: person.reading ?? '',
      tags: person.tags,
      facts: person.facts,
      sns: person.sns,
      body: person.bio || draftNote('プロフィール本文'),
    },
    toc: { kicker: 'PROFILE', title: `${person.name}とは何者か` },
    draft: !person.bio,
  }),

  interview: ({ person, photos, i }) => {
    const iv = person.interviews[i];
    return {
      data: {
        title: iv?.title ?? `${DRAFT}インタビュー ${i + 1}`,
        titleEn: iv?.titleEn ?? `INTERVIEW 0${i + 1}`,
        lead: iv?.lead ?? draftNote('インタビューのリード文'),
        columns: 3,
        pullQuote: iv?.pullQuote ?? '',
        image: photos.take('scenes') ?? placeholderImage('インタビューカット'),
        body: bodyOf(iv?.body, draftNote('インタビュー本文')),
      },
      toc: { kicker: `INTERVIEW ${i + 1}`, title: iv?.title ?? `インタビュー ${i + 1}` },
      draft: !iv,
    };
  },

  timeline: ({ person, photos }) => ({
    data: {
      title: `${person.name}の歩み`,
      titleEn: 'CHRONICLE',
      lead: '転機がどこにあったのかを、年表で追う。',
      image: photos.take('scenes') ?? placeholderImage('年表ページのカット'),
      items: person.timeline.length
        ? person.timeline
        : [{ year: '----', title: `${DRAFT}年表の項目`, body: draftNote('出来事の説明'), highlight: false }],
    },
    toc: { kicker: 'CHRONICLE', title: `${person.name}の歩み` },
    draft: !person.timeline.length,
  }),

  numbers: ({ person }) => ({
    data: {
      title: `数字で見る${person.name}`,
      titleEn: 'BY THE NUMBERS',
      lead: '公開情報と取材をもとに編集部が集計した。',
      source: person.statsSource ?? draftNote('出典'),
      stats: person.stats.length ? person.stats : [{ value: '--', label: `${DRAFT}指標名` }],
    },
    toc: { kicker: 'NUMBERS', title: `数字で見る${person.name}` },
    draft: !person.stats.length,
  }),

  works: ({ person, photos }) => ({
    data: {
      title: '事業・活動実績',
      titleEn: 'BUSINESS',
      lead: '何を作り、何で稼いでいるのかを並べる。',
      image: photos.take('scenes'),
      items: person.works.length
        ? person.works
        : [{ name: `${DRAFT}事業名`, body: draftNote('事業の説明') }],
    },
    toc: { kicker: 'BUSINESS', title: '事業・活動実績' },
    draft: !person.works.length,
  }),

  relations: ({ person }) => ({
    data: {
      title: `${person.name}を取り巻く人々`,
      titleEn: 'NETWORK',
      lead: '一人で作っているように見えて、実際には複数の判断が入っている。',
      center: { name: person.name, role: person.role ?? '' },
      note: person.relations.note ?? '図は取材をもとに編集部が作成。',
      nodes: person.relations.nodes.length
        ? person.relations.nodes
        : [{ name: `${DRAFT}関係者`, relation: '関係', angle: 0, distance: 0.75 }],
    },
    toc: { kicker: 'NETWORK', title: '人物相関図' },
    draft: !person.relations.nodes.length,
  }),

  article: ({ person, photos, i }) => {
    const a = person.articles[i];
    return {
      data: {
        title: a?.title ?? `${DRAFT}特集記事 ${i + 1}`,
        titleEn: a?.titleEn ?? 'FEATURE',
        lead: a?.lead ?? draftNote('記事のリード文'),
        columns: 3,
        pullQuote: a?.pullQuote ?? '',
        images: photos.takeMany('scenes', 2, '記事カット'),
        body: bodyOf(a?.body, draftNote('記事本文')),
      },
      toc: { kicker: a?.titleEn ?? 'FEATURE', title: a?.title ?? `特集記事 ${i + 1}` },
      draft: !a,
    };
  },

  schedule: ({ person, photos }) => ({
    data: {
      title: 'ある一日',
      titleEn: 'A DAY IN THE LIFE',
      lead: '撮影のない平日を追った。',
      image: photos.take('scenes'),
      note: person.scheduleNote ?? '',
      items: person.schedule.length
        ? person.schedule
        : [{ time: '--:--', title: `${DRAFT}行動`, body: draftNote('その時間の説明') }],
    },
    toc: { kicker: 'A DAY', title: 'ある一日' },
    draft: !person.schedule.length,
  }),

  gear: ({ person }) => ({
    data: {
      title: '仕事道具',
      titleEn: 'TOOLS OF THE TRADE',
      lead: '毎日触るものだけを見せてもらった。',
      note: '',
      items: person.gear.length
        ? person.gear
        : [{ name: `${DRAFT}道具名`, body: draftNote('道具の説明') }],
    },
    toc: { kicker: 'TOOLS', title: '仕事道具' },
    draft: !person.gear.length,
  }),

  quotes: ({ person, i }) => {
    const chunk = person.quotes.slice(i * 8, i * 8 + 8);
    return {
      data: {
        title: '編集部が選ぶ名言',
        titleEn: 'WORDS THAT STAY',
        lead: '取材と過去の発言から編集部が選んだ。',
        quotes: chunk.length >= 2 ? chunk : [
          { text: `${DRAFT}名言をここに入れます。` },
          { text: `${DRAFT}2つ目の名言をここに入れます。` },
        ],
      },
      toc: i === 0 ? { kicker: 'WORDS', title: '編集部が選ぶ名言' } : undefined,
      draft: chunk.length < 2,
    };
  },

  quoteHero: ({ person, photos, i }) => {
    const q = person.quotes[i] ?? { text: draftNote('大きく見せる名言') };
    return {
      data: {
        quote: { text: q.text, source: q.source ?? person.nameEn ?? person.name },
        image: photos.take('scenes') ?? photos.role('portrait'),
        theme: 'dark',
      },
      draft: !person.quotes[i],
    };
  },

  quoteAnnotated: ({ person, photos }) => {
    const q = person.quotes[1] ?? person.quotes[0];
    return {
      data: {
        title: '言葉の裏側',
        quote: { text: q?.text ?? draftNote('取り上げる名言'), source: q?.source ?? person.name },
        image: photos.take('scenes'),
        annotation: draftNote('その言葉が出た文脈と、編集部の見立て'),
      },
      toc: { kicker: 'QUOTE & NOTE', title: '言葉の裏側' },
      draft: true,
    };
  },

  voices: ({ person }) => ({
    data: {
      title: `${person.name}を知る人たち`,
      titleEn: 'VOICES',
      lead: '近い距離にいる人たちの証言。',
      comments: person.voices.length
        ? person.voices
        : [{ name: `${DRAFT}氏名`, role: '肩書', body: draftNote('コメント') }],
    },
    toc: { kicker: 'VOICES', title: `${person.name}を知る人たち` },
    draft: !person.voices.length,
  }),

  videos: ({ person, photos }) => {
    const list = person.videos.slice(0, 3);
    return {
      data: {
        title: 'この動画から見る',
        titleEn: 'WATCH',
        lead: 'QRから直接視聴できる。',
        videos: list.length
          ? list.map((v) => ({
              title: v.title,
              body: v.body ?? '',
              meta: v.meta,
              thumbnail: v.thumbnail ?? photos.take('thumbnails') ?? placeholderImage('動画サムネイル'),
              qr: v.qr ?? { url: null, label: '動画を見る' },
            }))
          : [
              {
                title: `${DRAFT}動画タイトル`,
                body: draftNote('動画の紹介文'),
                thumbnail: placeholderImage('動画サムネイル'),
                qr: { url: null, label: '動画を見る' },
              },
            ],
      },
      toc: { kicker: 'WATCH', title: 'この動画から見る' },
      draft: !list.length,
    };
  },

  videoThumbs: ({ person, photos, i }) => {
    const list = person.videos.slice(3 + i * 12, 3 + i * 12 + 12);
    const items = list.length >= 2 ? list : [];
    return {
      data: {
        title: '動画アーカイブ',
        titleEn: 'ARCHIVE',
        lead: '代表作を一覧で。',
        items: items.length
          ? items.map((v) => ({
              title: v.title,
              meta: v.meta?.views ?? '',
              thumbnail: v.thumbnail ?? photos.take('thumbnails') ?? placeholderImage('動画サムネイル'),
              qr: v.qr,
            }))
          : Array.from({ length: 6 }, (_, n) => ({
              title: `${DRAFT}動画 ${n + 1}`,
              meta: '',
              thumbnail: placeholderImage(`動画サムネイル${n + 1}`),
            })),
      },
      draft: !items.length,
    };
  },

  qa: ({ person, photos }) => ({
    data: {
      title: 'これからの話',
      titleEn: 'WHAT’S NEXT',
      lead: '最後に聞いた。',
      image: photos.take('scenes'),
      qa: person.qa.length ? person.qa : [{ q: `${DRAFT}質問`, a: draftNote('回答') }],
    },
    toc: { kicker: 'Q & A', title: 'これからの話' },
    draft: !person.qa.length,
  }),

  gallery: ({ photos, i }) => ({
    data: {
      title: i === 0 ? '撮影の合間に' : 'もう一度、写真で',
      titleEn: i === 0 ? 'OFF THE RECORD' : 'IN PICTURES',
      layout: 'mosaic',
      images: photos.takeMany('gallery', 6, 'ギャラリー写真'),
    },
  }),
};

/* ======================= 人物に依存しない面（雛形） =======================
   ランキングや広告は号ごとに中身が変わるので、生成時点では「編集できる雛形」を
   置く。空ページにせず構造だけ先に用意しておくと、台割とページ数が確定した状態で
   原稿づくりに入れる。埋まっていない面は draft フラグが立ち、
   プレビューの台割と npm run validate の両方で一覧できる。
   ======================================================================= */

const skeletons: Record<string, (c: Ctx) => FillResult> = {
  editorsLetter: ({ meta, photos }) => ({
    data: {
      title: '編集長から',
      titleEn: "EDITOR'S LETTER",
      signature: { name: meta.editorInChief ?? `${DRAFT}編集長名`, role: '編集長 / EDITOR IN CHIEF' },
      image: photos.take('scenes'),
      body: `## この号について\n${draftNote('編集長メッセージ本文')}\n\n## AIが編集長という制作思想\n本誌は構成と初稿の生成をAIが担い、取材と最終判断を人間が行う体制で制作しています。この号でどこまでをAIが担ったのかを、ここに具体的に書いてください。`,
    },
    toc: { kicker: "EDITOR'S LETTER", title: '編集長から' },
    draft: true,
  }),

  dividerHalf: ({ i }) => ({
    data: {
      number: String(i + 2).padStart(2, '0'),
      title: i === 0 ? 'influencers now' : 'more stories',
      titleEn: i === 0 ? 'SECOND HALF' : 'EXTRA',
      lead: draftNote('この章で何を扱うのかの説明'),
      theme: 'accent',
    },
  }),

  dialogueSkeleton: () => ({
    data: {
      title: `${DRAFT}対談タイトル`,
      titleEn: 'DIALOGUE',
      lead: draftNote('対談のリード文'),
      speakers: [
        { name: `${DRAFT}話者A`, role: '肩書' },
        { name: `${DRAFT}話者B`, role: '肩書' },
      ],
      turns: [
        { speaker: 0, text: draftNote('話者Aの発言') },
        { speaker: 1, text: draftNote('話者Bの発言') },
      ],
    },
    toc: { kicker: 'DIALOGUE', title: '対談' },
    draft: true,
  }),

  roundtableSkeleton: () => ({
    data: {
      title: `${DRAFT}座談会タイトル`,
      titleEn: 'ROUNDTABLE',
      lead: draftNote('座談会のリード文'),
      speakers: [
        { name: `${DRAFT}話者A`, role: '肩書' },
        { name: `${DRAFT}話者B`, role: '肩書' },
        { name: `${DRAFT}話者C`, role: '肩書' },
      ],
      turns: [
        { speaker: 0, text: draftNote('発言') },
        { speaker: 1, text: draftNote('発言') },
        { speaker: 2, text: draftNote('発言') },
      ],
    },
    toc: { kicker: 'ROUNDTABLE', title: '座談会' },
    draft: true,
  }),

  aiDialogueSkeleton: () => ({
    data: {
      title: `${DRAFT}AIバーチャル対談`,
      titleEn: 'AI VIRTUAL DIALOGUE',
      lead: draftNote('この対談の狙い'),
      disclosure:
        '【AI生成コンテンツ】本ページはAIが公開情報をもとに生成した架空の対話です。実在の人物による発言ではありません。生成後に編集部が内容を確認しています。',
      speakers: [
        { name: `${DRAFT}話者A`, role: 'AI生成の話者' },
        { name: `${DRAFT}話者B`, role: 'AI生成の話者' },
      ],
      turns: [
        { speaker: 0, text: draftNote('AIが生成した発言') },
        { speaker: 1, text: draftNote('AIが生成した発言') },
      ],
    },
    toc: { kicker: 'AI DIALOGUE', title: 'AIバーチャル対談' },
    draft: true,
  }),

  surveySkeleton: () => ({
    data: {
      title: `${DRAFT}アンケート企画`,
      titleEn: 'READER SURVEY',
      lead: draftNote('調査の趣旨'),
      sampleNote: `${DRAFT}調査期間・有効回答数・調査方法を記載`,
      questions: [
        { q: `${DRAFT}設問1`, unit: '%', options: [{ label: '選択肢A', value: 50 }, { label: '選択肢B', value: 50 }] },
        { q: `${DRAFT}設問2`, unit: '%', options: [{ label: '選択肢A', value: 60 }, { label: '選択肢B', value: 40 }] },
      ],
    },
    toc: { kicker: 'SURVEY', title: '読者アンケート' },
    draft: true,
  }),

  prosConsSkeleton: () => ({
    data: {
      title: `${DRAFT}賛否のテーマ`,
      titleEn: 'PROS & CONS',
      topic: draftNote('論点の説明'),
      lead: '',
      pro: { label: '賛成', points: [{ title: `${DRAFT}論拠`, body: draftNote('説明') }] },
      con: { label: '反対', points: [{ title: `${DRAFT}論拠`, body: draftNote('説明') }] },
      conclusion: draftNote('編集部の見立て'),
    },
    toc: { kicker: 'PROS & CONS', title: '賛成・反対' },
    draft: true,
  }),

  reviewSkeleton: ({ photos }) => ({
    data: {
      title: '編集部レビュー',
      titleEn: "EDITORS' REVIEW",
      lead: draftNote('今月取り上げるもの'),
      items: Array.from({ length: 3 }, (_, n) => ({
        title: `${DRAFT}対象 ${n + 1}`,
        subtitle: 'カテゴリ / 価格',
        score: 3.5,
        verdict: draftNote('ひとことの評'),
        body: draftNote('レビュー本文'),
        image: photos.take('thumbnails') ?? placeholderImage(`レビュー写真${n + 1}`),
      })),
    },
    toc: { kicker: 'REVIEW', title: '編集部レビュー' },
    draft: true,
  }),

  columnSkeleton: ({ i }) => ({
    data: {
      title: `${DRAFT}コラムのタイトル ${i + 1}`,
      titleEn: 'COLUMN',
      author: { name: `${DRAFT}筆者名`, role: '肩書' },
      body: `${draftNote('コラム本文')}\n\n## 小見出し\n${draftNote('続きの段落')}`,
    },
    toc: { kicker: 'COLUMN', title: 'コラム' },
    draft: true,
  }),

  rankingTop10: () => ({
    data: {
      title: '影響力ランキング\nTOP10',
      titleEn: 'RANKING 1–10',
      lead: draftNote('ランキングの趣旨'),
      criteria: `${DRAFT}算出方法をここに明記してください。順位は編集部の見解であり、対象者の価値を保証するものではありません。`,
      items: Array.from({ length: 10 }, (_, n) => ({
        rank: n + 1,
        name: `${DRAFT}氏名 ${n + 1}`,
        category: 'カテゴリ',
        score: '--',
        body: draftNote('選出理由'),
        portrait: placeholderImage(`${n + 1}位のポートレート`),
      })),
    },
    toc: { kicker: 'TOP 10', title: '影響力ランキング TOP10' },
    draft: true,
  }),

  rankingTop30: () => ({
    data: {
      title: '影響力ランキング\n11位〜30位',
      titleEn: 'RANKING 11–30',
      lead: draftNote('この帯の傾向'),
      criteria: `${DRAFT}算出方法は前ページに準じます。`,
      columns: 2,
      items: Array.from({ length: 20 }, (_, n) => ({
        rank: n + 11,
        name: `${DRAFT}氏名 ${n + 11}`,
        category: 'カテゴリ',
        score: '--',
      })),
    },
    toc: { kicker: 'TOP 30', title: '影響力ランキング 11–30位' },
    draft: true,
  }),

  rankingDetail: ({ photos }) => ({
    data: {
      title: `${DRAFT}詳細で扱う人物`,
      titleEn: 'RANK DETAIL',
      rank: 2,
      name: `${DRAFT}氏名`,
      category: 'カテゴリ',
      image: photos.take('scenes') ?? placeholderImage('ランキング詳細の写真'),
      body: draftNote('その人物の解説'),
      stats: [{ value: '--', label: `${DRAFT}指標` }],
    },
    draft: true,
  }),

  positioningSkeleton: () => ({
    data: {
      title: '勢力図',
      titleEn: 'POSITIONING MAP',
      lead: draftNote('2軸の説明'),
      axes: {
        x: { label: `${DRAFT}横軸の意味`, low: '低い', high: '高い' },
        y: { label: `${DRAFT}縦軸の意味`, low: '低い', high: '高い' },
      },
      note: '編集部が公開情報をもとに相対的に配置したものです。',
      points: [
        { name: `${DRAFT}A`, x: 30, y: 70 },
        { name: `${DRAFT}B`, x: 70, y: 40, group: 'sub' },
      ],
    },
    toc: { kicker: 'POSITIONING', title: '勢力図' },
    draft: true,
  }),

  dataSkeleton: ({ i }) => ({
    data: {
      title: i === 0 ? 'データで見る市場' : 'データ補遺',
      titleEn: 'DATA',
      lead: draftNote('何を示すグラフか'),
      source: `${DRAFT}出典を明記してください。`,
      charts: [
        { type: 'column', title: `${DRAFT}推移`, unit: '', series: [{ label: '2023', value: 1 }, { label: '2024', value: 2 }, { label: '2025', value: 3 }] },
        { type: 'bar', title: `${DRAFT}比較`, unit: '', series: [{ label: '項目A', value: 3 }, { label: '項目B', value: 2 }] },
        { type: 'donut', title: `${DRAFT}構成比`, unit: '%', series: [{ label: '区分A', value: 60 }, { label: '区分B', value: 40 }] },
      ],
    },
    toc: i === 0 ? { kicker: 'DATA', title: 'データで見る市場' } : undefined,
    draft: true,
  }),

  comparisonSkeleton: () => ({
    data: {
      title: `${DRAFT}比較のテーマ`,
      titleEn: 'COMPARISON',
      lead: draftNote('何を比較するか'),
      head: ['', '観点A', '観点B', '観点C'],
      rows: Array.from({ length: 4 }, (_, n) => ({ label: `${DRAFT}対象${n + 1}`, cells: ['—', '—', '—'] })),
      note: '編集部調べ。',
    },
    draft: true,
  }),

  videoRanking: ({ person, photos }) => {
    const list = person.videos.slice(0, 8);
    return {
      data: {
        title: '編集部おすすめ動画',
        titleEn: 'MUST-WATCH',
        lead: list.length ? '編集部が選んだ本数。' : draftNote('選定の趣旨'),
        items: (list.length ? list : Array.from({ length: 5 }, () => null)).map((v, n) => ({
          rank: n + 1,
          title: v?.title ?? `${DRAFT}動画タイトル ${n + 1}`,
          channel: v ? (person.name ?? '') : 'チャンネル名',
          views: v?.meta?.views ?? '',
          body: v?.body ?? draftNote('推薦理由'),
          thumbnail: v?.thumbnail ?? photos.take('thumbnails') ?? placeholderImage(`動画サムネイル${n + 1}`),
          qr: v?.qr,
        })),
      },
      toc: { kicker: 'MUST-WATCH', title: '編集部おすすめ動画' },
      draft: !list.length,
    };
  },

  adSingle: ({ i }) => ({
    data: {
      label: '広告',
      brand: `${DRAFT}ブランド名 ${i + 1}`,
      copy: draftNote('広告コピー'),
      body: `${DRAFT}商品・サービスの説明`,
      url: '',
      image: placeholderImage('広告ビジュアル'),
      theme: 'light',
    },
    draft: true,
  }),

  adSpread: () => ({
    data: {
      label: '広告',
      brand: `${DRAFT}ブランド名`,
      copy: draftNote('見開き広告のコピー'),
      body: `${DRAFT}商品・サービスの説明`,
      image: { ...placeholderImage('見開き広告ビジュアル'), spread: true, placedWidthMm: 426 },
      theme: 'light',
    },
    draft: true,
  }),

  tieUp: ({ photos }) => ({
    data: {
      label: 'タイアップ広告',
      brand: `${DRAFT}ブランド名`,
      title: `${DRAFT}タイアップ記事のタイトル`,
      titleEn: 'SPONSORED',
      lead: draftNote('リード文'),
      images: photos.takeMany('scenes', 2, 'タイアップ写真'),
      body: `${draftNote('タイアップ記事本文')}\n\n## 小見出し\n${draftNote('続きの段落')}`,
    },
    toc: { kicker: 'SPONSORED', title: 'タイアップ記事' },
    draft: true,
  }),

  paidProfile: () => ({
    data: {
      label: 'PR',
      title: '注目の人物',
      titleEn: 'SPONSORED PROFILE',
      people: Array.from({ length: 3 }, (_, n) => ({
        name: `${DRAFT}氏名 ${n + 1}`,
        title: '肩書',
        org: '所属',
        body: draftNote('紹介文'),
        portrait: placeholderImage(`掲載者${n + 1}のポートレート`),
      })).concat([
        {
          name: '掲載枠 募集中',
          title: '有料掲載枠',
          org: '',
          body: 'この枠は有料掲載枠です。掲載をご希望の方は編集部までお問い合わせください。掲載内容は編集部の審査を経て決定します。',
          portrait: placeholderImage('掲載枠のプレースホルダー'),
        },
      ]),
    },
    draft: true,
  }),

  nextIssue: ({ photos }) => ({
    data: {
      title: '次号予告',
      titleEn: 'NEXT ISSUE',
      issueLine: `${DRAFT}次号の号数`,
      onSaleLine: `${DRAFT}発売日`,
      image: photos.take('gallery') ?? placeholderImage('次号のイメージ'),
      highlights: Array.from({ length: 3 }, (_, n) => ({
        title: `${DRAFT}見どころ ${n + 1}`,
        body: draftNote('内容の説明'),
      })),
    },
    toc: { kicker: 'NEXT', title: '次号予告' },
    draft: true,
  }),

  colophon: ({ meta }) => ({
    data: {
      title: '奥付',
      titleEn: 'COLOPHON',
      issueLine: meta.issueLine,
      staff: [
        { role: '編集長', names: [meta.editorInChief ?? `${DRAFT}編集長名`] },
        { role: '編集', names: [`${DRAFT}編集者名`] },
        { role: 'アートディレクション', names: [`${DRAFT}担当者名`] },
        { role: '撮影', names: [`${DRAFT}撮影者名`] },
        { role: 'AI編集支援', names: ['構成生成・初稿作成・図版データ整形'] },
      ],
      imprint: [
        { label: '発行', value: meta.publisher ?? `${DRAFT}発行元` },
        { label: '所在地', value: `${DRAFT}住所` },
        { label: '印刷', value: `${DRAFT}印刷会社名` },
      ],
      notices: [
        '本誌の記事の一部は、AIによる構成生成および初稿作成を経て、編集部が確認・編集したうえで掲載しています。',
        '本誌掲載のランキングは編集部独自の基準による見解であり、対象者の価値を保証するものではありません。',
        '本誌記事および写真の無断転載を禁じます。',
        '掲載内容は取材時点のものです。QRコードのリンク先は予告なく変更される場合があります。',
      ],
    },
    toc: { kicker: 'COLOPHON', title: '奥付' },
    draft: true,
  }),

  backCover: () => ({
    data: {
      label: '広告',
      brand: `${DRAFT}ブランド名`,
      copy: draftNote('裏表紙のコピー'),
      body: `${DRAFT}商品・サービスの説明`,
      image: placeholderImage('裏表紙の広告ビジュアル'),
      theme: 'light',
    },
    draft: true,
  }),

  /** 目次は他の全ページが決まってから作るので、ここでは器だけ返す */
  contents: () => ({ data: { title: '目次', titleEn: 'CONTENTS', entries: [] } }),
};

const allFillers = { ...fillers, ...skeletons };

/* ============================ 生成の本体 ============================ */

const SECTIONS = [
  { id: 'cover', title: 'COVER', titleEn: 'COVER', color: '#C8102E' },
  { id: 'front', title: 'OPENING', titleEn: 'OPENING', color: '#B99049' },
  { id: 'feature', title: '巻頭特集', titleEn: 'COVER FEATURE', color: '#C8102E' },
  { id: 'half', title: 'INFLUENCERS NOW', titleEn: 'SECOND HALF', color: '#4A6D9B' },
  { id: 'ranking', title: 'ランキング', titleEn: 'THE INFLUENCE', color: '#3F6B5A' },
  { id: 'ad', title: 'ADVERTISEMENT', titleEn: 'AD', color: '#8A5A78' },
  { id: 'back', title: 'BACK MATTER', titleEn: 'BACK', color: '#6C6F78' },
];

export interface GenerateInput {
  person: Person;
  recipe: Recipe;
  meta: IssueMeta;
}

export interface GenerateResult {
  issue: Issue;
  /** 生成時に気づいたこと（原稿不足など）。エラーではない */
  notes: string[];
  /** 雛形のまま置かれたページ番号 */
  draftPages: number[];
}

/**
 * 人物マスタとレシピから号を組み立てる。
 * ファイル入出力はしないので、CLI からもアプリの API からも同じ関数を使える。
 */
export function generateIssue({ person, recipe, meta }: GenerateInput): GenerateResult {
  const slots = expandRecipe(recipe);
  const total = slotPageCount(slots);
  if (total !== recipe.pageCount) {
    throw new Error(`レシピ「${recipe.label}」の合計が ${total}P で、宣言の ${recipe.pageCount}P と一致しません`);
  }

  const photos = new PhotoDispenser(person);
  const notes: string[] = [];
  const draftPages: number[] = [];
  const tocEntries: { page: number; section?: string; kicker?: string; title: string; subtitle?: string }[] = [];

  const pages: PageSpec[] = [];
  let cursor = 1;
  let contentsIndex = -1;

  for (const slot of slots) {
    const span = slot.span ?? 1;
    const pageNumber = cursor;

    if (span === 2 && pageNumber % 2 !== 0) {
      throw new Error(
        `見開き「${templateMeta[slot.template].label}」が奇数ページ P${pageNumber} から始まります。レシピのページ配分を見直してください。`,
      );
    }

    const fill = allFillers[slot.fill];
    if (!fill) throw new Error(`未定義の充填ロジック: ${slot.fill}`);

    const result = fill({ person, meta, photos, i: slot.index ?? 0, slot });

    if (slot.template === 'contents') contentsIndex = pages.length;
    if (result.draft) draftPages.push(pageNumber);
    if (result.toc) {
      tocEntries.push({
        page: pageNumber,
        section: SECTIONS.find((s) => s.id === slot.section)?.titleEn,
        ...result.toc,
      });
    }

    pages.push({
      template: slot.template,
      section: slot.section,
      span,
      ...(slot.surface ? { surface: slot.surface } : {}),
      ...(slot.runningHead ? { runningHead: slot.runningHead } : {}),
      flags: {
        ai: slot.flags?.ai ?? false,
        ad: slot.flags?.ad ?? false,
        draft: result.draft ?? slot.flags?.draft ?? false,
      },
      ...(slot.note ? { note: slot.note } : {}),
      data: result.data,
    });

    cursor += span;
  }

  // 目次は全ページが確定してから流し込む（ページ番号がここで初めて決まるため）
  if (contentsIndex >= 0) {
    pages[contentsIndex].data = {
      title: '目次',
      titleEn: 'CONTENTS',
      image: person.photos.gallery?.[0] ?? person.photos.portrait ?? placeholderImage('目次のイメージカット'),
      note: '掲載内容・ページは編集の都合により変更となる場合があります。本誌の一部はAIによる生成・編集を経て制作されています。',
      entries: tocEntries,
    };
  }

  if (!person.interviews.length) notes.push('インタビューが未登録のため、該当ページは雛形になっています。');
  if (!person.quotes.length) notes.push('名言が未登録のため、名言ページは雛形になっています。');
  if (!person.photos.cover?.src) notes.push('表紙写真が未登録です。プレースホルダーが表示されます。');

  const sections = SECTIONS.map((s) =>
    s.id === 'feature' ? { ...s, title: `巻頭特集 ${person.name}` } : s,
  );

  const issue: Issue = {
    id: meta.id,
    issueLine: meta.issueLine,
    title: meta.title,
    ...(meta.subtitle ? { subtitle: meta.subtitle } : {}),
    releaseDate: meta.releaseDate,
    pageCount: recipe.pageCount,
    qr: {
      trackingBase: null,
      trackingParams: { utm_source: 'magazine', utm_medium: 'print', utm_campaign: meta.id },
    },
    sections,
    pages,
  };

  return { issue, notes, draftPages };
}

/** 生成した号に添える来歴。再生成のときにどの人物・レシピから作ったか分かるようにする */
export interface IssueSource {
  personId: string;
  recipeId: string;
  generatedAt: string;
  generatorVersion: number;
}

export const GENERATOR_VERSION = 1;
