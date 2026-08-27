import { ImageFrame } from '../components/magazine/ImageFrame';
import { QRBlock } from '../components/magazine/QRBlock';
import { ArticleBody, Heading, QuoteBlock } from '../components/magazine/Text';
import type { TemplateProps } from './types';

const isSpread = (p: { pageNumber: number; endPageNumber: number }) => p.endPageNumber > p.pageNumber;

/** 名言を1つだけ、誌面いっぱいに見せる面。保存性のいちばんの武器 */
export function QuoteSolo({ data, page }: TemplateProps<'quote-solo'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-quote-solo" data-theme={data.theme}>
      {data.image && <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />}
      {data.image && <div className="mg-scrim mg-scrim--full" />}
      <div className="mg-layer mg-typearea tpl-quote-solo__inner">
        <div className="mg-grow" />
        <QuoteBlock
          text={data.quote.text}
          source={data.quote.source}
          context={data.quote.context}
          size={spread ? 'xl' : 'l'}
        />
        <div className="mg-grow" />
      </div>
      {spread && <div className="mg-gutter-guard" />}
    </div>
  );
}

/** 名言集。1ページに複数、級数の差でリズムを作る */
export function QuoteCollection({ data, page }: TemplateProps<'quote-collection'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-quotes mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'WORDS'} title={data.title} lead={data.lead} />
      <div className="mg-rule mg-rule--thick" />
      <ul className="tpl-quotes__list mg-fit" data-columns={spread ? 2 : 1}>
        {data.quotes.map((q, i) => (
          <li key={i}>
            <QuoteBlock text={q.text} source={q.source} context={q.context} size={i === 0 ? 'm' : 's'} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 名言＋解説。なぜその言葉が効くのかを編集部が書く面 */
export function QuoteAnnotated({ data }: TemplateProps<'quote-annotated'>) {
  return (
    <div className="tpl-quote-note mg-typearea">
      {data.title && <Heading eyebrow="QUOTE & NOTE" title={data.title} />}
      <div className="tpl-quote-note__quote">
        <QuoteBlock text={data.quote.text} source={data.quote.source} size="m" />
      </div>
      <div className="mg-rule" />
      <div className="tpl-quote-note__main">
        <ArticleBody body={data.annotation} columns={2} />
        {data.image && <ImageFrame image={data.image} className="tpl-quote-note__figure" />}
      </div>
    </div>
  );
}

/** 動画紹介＋QR。紙から動画へ渡す導線 */
export function VideoQR({ data, page }: TemplateProps<'video-qr'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-video mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'WATCH'} title={data.title} lead={data.lead} />
      <div className="mg-rule mg-rule--thick" />
      <ul className="tpl-video__list mg-fit" data-columns={spread ? 4 : 2}>
        {data.videos.map((v, i) => (
          <li key={i}>
            <ImageFrame image={v.thumbnail} className="tpl-video__thumb" creditPlacement="none" />
            <h3 className="tpl-video__title">{v.title}</h3>
            {v.meta && (
              <p className="tpl-video__meta mg-muted">
                {[v.meta.date, v.meta.length, v.meta.views].filter(Boolean).join('　/　')}
              </p>
            )}
            {v.body && <p className="tpl-video__body">{v.body}</p>}
            <QRBlock qr={v.qr} className="tpl-video__qr" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** おすすめ動画ランキング */
export function VideoRanking({ data, page }: TemplateProps<'video-ranking'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-videorank mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'MUST-WATCH'} title={data.title} lead={data.lead} />
      <ol className="tpl-videorank__list mg-fit" data-columns={spread ? 2 : 1}>
        {data.items.map((it) => (
          <li key={it.rank}>
            <span className="tpl-videorank__rank mg-num">{String(it.rank).padStart(2, '0')}</span>
            <ImageFrame image={it.thumbnail} className="tpl-videorank__thumb" creditPlacement="none" />
            <div className="tpl-videorank__body">
              <h3>{it.title}</h3>
              <p className="mg-muted">{[it.channel, it.views].filter(Boolean).join('　/　')}</p>
              {it.body && <p className="tpl-videorank__text">{it.body}</p>}
            </div>
            {it.qr && <QRBlock qr={it.qr} className="tpl-videorank__qr" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 動画サムネイル一覧。一覧性重視、QRは任意 */
export function VideoThumbnails({ data, page }: TemplateProps<'video-thumbnails'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-thumbs mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'ARCHIVE'} title={data.title} lead={data.lead} />
      <ul className="tpl-thumbs__grid mg-fit" data-columns={spread ? 6 : 3}>
        {data.items.map((it, i) => (
          <li key={i}>
            <ImageFrame image={it.thumbnail} className="tpl-thumbs__thumb" creditPlacement="none" />
            <h4>{it.title}</h4>
            {it.meta && <span className="mg-muted">{it.meta}</span>}
            {it.qr && <QRBlock qr={it.qr} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
