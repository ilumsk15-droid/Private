import { ImageFrame } from '../components/magazine/ImageFrame';
import { ArticleBody, Heading, PullQuote } from '../components/magazine/Text';
import { RelationshipMap, Timeline as TimelineList } from '../components/magazine/Lists';
import { StatGrid } from '../components/magazine/DataViz';
import { evenColumns, type TemplateProps } from './types';

const isSpread = (p: { pageNumber: number; endPageNumber: number }) => p.endPageNumber > p.pageNumber;

/** 写真だけで見せる見開き。文字はノド逃げの外に置く */
export function PhotoSpreadFull({ data, page }: TemplateProps<'photo-spread-full'>) {
  return (
    <div className="tpl-photospread" data-align={data.align}>
      <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />
      {(data.overlayTitle || data.overlayQuote) && <div className="mg-scrim" />}
      {(data.overlayTitle || data.overlayQuote) && (
        <div className="mg-layer mg-typearea tpl-photospread__inner">
          <div className="mg-grow" />
          {data.overlayTitle && <h2 className="tpl-photospread__title">{data.overlayTitle}</h2>}
          {data.overlayQuote && <p className="tpl-photospread__quote">{data.overlayQuote}</p>}
        </div>
      )}
      {isSpread(page) && <div className="mg-gutter-guard" />}
      {data.image.credit && <span className="mg-credit mg-credit--overlay">{data.image.credit}</span>}
    </div>
  );
}

/** 写真＋プロフィール。人物特集の「顔」になる面 */
export function Profile({ data, page }: TemplateProps<'profile'>) {
  return (
    <div className="tpl-profile" data-spread={isSpread(page) ? 'true' : 'false'}>
      <div className="tpl-profile__photo">
        <ImageFrame image={data.image} fill creditPlacement="overlay" />
      </div>
      <div className="tpl-profile__text">
        <header className="tpl-profile__name">
          {data.nameEn && <span className="mg-title-en">{data.nameEn}</span>}
          <h2>{data.name}</h2>
          {data.reading && <span className="tpl-profile__reading mg-muted">{data.reading}</span>}
        </header>
        {data.tags.length > 0 && (
          <ul className="tpl-profile__tags">
            {data.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <div className="mg-rule" />
        <ArticleBody body={data.body} className="tpl-profile__body" />
        {data.facts.length > 0 && (
          <dl className="tpl-profile__facts">
            {data.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {data.sns.length > 0 && (
          <ul className="tpl-profile__sns">
            {data.sns.map((s) => (
              <li key={s.platform}>
                <b>{s.platform}</b>
                {s.handle && <span>{s.handle}</span>}
                {s.followers && <em className="mg-num">{s.followers}</em>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** ロングインタビュー。段数はデータ側で切り替えられる */
export function InterviewLong({ data, page }: TemplateProps<'interview-long'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-interview mg-typearea" data-spread={spread ? 'true' : 'false'}>
      <Heading eyebrow={data.titleEn ?? 'INTERVIEW'} title={data.title} lead={data.lead} size="l" />
      <div className="mg-rule mg-rule--thick" />
      <div className="tpl-interview__main">
        {data.image && (
          <figure className="tpl-interview__figure">
            <ImageFrame image={data.image} />
          </figure>
        )}
        <div className="tpl-interview__text mg-fit">
          {data.pullQuote && <PullQuote text={data.pullQuote} />}
          <ArticleBody body={data.body} columns={spread ? evenColumns(data.columns + 1) : data.columns} />
        </div>
      </div>
    </div>
  );
}

/** Q&A形式。質問が拾い読みできることを優先した組み */
export function InterviewQA({ data, page }: TemplateProps<'interview-qa'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-qa mg-typearea" data-spread={spread ? 'true' : 'false'}>
      <Heading eyebrow={data.titleEn ?? 'Q & A'} title={data.title} lead={data.lead} />
      <div className="mg-rule" />
      <div className="tpl-qa__main">
        {data.image && <ImageFrame image={data.image} className="tpl-qa__figure" />}
        <ol className="tpl-qa__list mg-fit" data-columns={spread ? 2 : 1}>
          {data.qa.map((item, i) => (
            <li key={i}>
              <p className="tpl-qa__q">
                <span className="tpl-qa__marker">Q</span>
                {item.q}
              </p>
              <p className="tpl-qa__a">
                <span className="tpl-qa__marker tpl-qa__marker--a">A</span>
                {item.a}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** 経歴・年表 */
export function TimelineTemplate({ data, page }: TemplateProps<'timeline'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-timeline mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'CHRONICLE'} title={data.title} lead={data.lead} />
      <div className="tpl-timeline__main">
        {data.image && <ImageFrame image={data.image} className="tpl-timeline__figure" />}
        <div className="mg-grow mg-fit">
          <TimelineList items={data.items} columns={spread ? 2 : 1} />
        </div>
      </div>
    </div>
  );
}

/** 数字で見る人物 */
export function Numbers({ data, page }: TemplateProps<'numbers'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-numbers mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'BY THE NUMBERS'} title={data.title} lead={data.lead} size="l" />
      <div className="mg-grow mg-fit tpl-numbers__grid">
        <StatGrid stats={data.stats} columns={spread ? 4 : 2} />
      </div>
      {data.source && <p className="tpl-numbers__source mg-muted">{data.source}</p>}
    </div>
  );
}

/** 事業・活動実績 */
export function Works({ data, page }: TemplateProps<'works'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-works mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'BUSINESS'} title={data.title} lead={data.lead} />
      <div className="mg-rule mg-rule--thick" />
      <ul className="tpl-works__list mg-fit" data-columns={spread ? 2 : 1}>
        {data.items.map((it) => (
          <li key={it.name}>
            <div className="tpl-works__head">
              <h3>{it.name}</h3>
              {it.category && <span className="tpl-works__cat">{it.category}</span>}
              {it.since && <span className="tpl-works__since mg-num">{it.since}</span>}
            </div>
            <p className="tpl-works__body">{it.body}</p>
            {it.metric && <p className="tpl-works__metric mg-num">{it.metric}</p>}
          </li>
        ))}
      </ul>
      {data.image && <ImageFrame image={data.image} className="tpl-works__figure" />}
    </div>
  );
}

/** 人物相関図 */
export function RelationshipMapTemplate({ data }: TemplateProps<'relationship-map'>) {
  return (
    <div className="tpl-relmap mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'NETWORK'} title={data.title} lead={data.lead} />
      <div className="mg-grow tpl-relmap__field">
        <RelationshipMap center={data.center} nodes={data.nodes} />
      </div>
      {data.note && <p className="mg-caption">{data.note}</p>}
    </div>
  );
}

/** 1日のスケジュール */
export function DailySchedule({ data, page }: TemplateProps<'daily-schedule'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-schedule mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'A DAY IN THE LIFE'} title={data.title} lead={data.lead} />
      <div className="tpl-schedule__main">
        <ol className="tpl-schedule__list mg-fit" data-columns={spread ? 2 : 1}>
          {data.items.map((it, i) => (
            <li key={i}>
              <span className="tpl-schedule__time mg-num">{it.time}</span>
              <div>
                <h4>{it.title}</h4>
                {it.body && <p>{it.body}</p>}
              </div>
            </li>
          ))}
        </ol>
        {data.image && <ImageFrame image={data.image} className="tpl-schedule__figure" />}
      </div>
      {data.note && <p className="mg-caption">{data.note}</p>}
    </div>
  );
}

/** 愛用品・仕事道具 */
export function Gear({ data, page }: TemplateProps<'gear'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-gear mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'TOOLS'} title={data.title} lead={data.lead} />
      <ul className="tpl-gear__list mg-fit" data-columns={spread ? 4 : 2}>
        {data.items.map((it) => (
          <li key={it.name}>
            <ImageFrame image={it.image} className="tpl-gear__figure" creditPlacement="none" />
            <h4>{it.name}</h4>
            {it.brand && <span className="mg-muted">{it.brand}</span>}
            <p>{it.body}</p>
          </li>
        ))}
      </ul>
      {data.note && <p className="mg-caption">{data.note}</p>}
    </div>
  );
}

/** 関係者コメント */
export function Voices({ data, page }: TemplateProps<'voices'>) {
  const spread = isSpread(page);
  return (
    <div className="tpl-voices mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'VOICES'} title={data.title} lead={data.lead} />
      <div className="mg-rule" />
      <ul className="tpl-voices__list mg-fit" data-columns={spread ? 4 : 2}>
        {data.comments.map((c) => (
          <li key={c.name}>
            {c.portrait && <ImageFrame image={c.portrait} className="tpl-voices__portrait" creditPlacement="none" />}
            <p className="tpl-voices__body">{c.body}</p>
            <p className="tpl-voices__name">
              <b>{c.name}</b>
              {c.role && <span className="mg-muted">{c.role}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 写真ギャラリー */
export function PhotoGallery({ data }: TemplateProps<'photo-gallery'>) {
  return (
    <div className="tpl-gallery">
      <div className="tpl-gallery__grid" data-layout={data.layout} data-count={data.images.length}>
        {data.images.map((img, i) => (
          <ImageFrame key={i} image={img} className="tpl-gallery__item" creditPlacement="overlay" />
        ))}
      </div>
      {(data.title || data.titleEn) && (
        <div className="tpl-gallery__caption">
          {data.titleEn && <span className="mg-title-en">{data.titleEn}</span>}
          {data.title && <h2 className="mg-subhead">{data.title}</h2>}
        </div>
      )}
    </div>
  );
}

