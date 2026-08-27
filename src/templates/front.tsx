import { ImageFrame } from '../components/magazine/ImageFrame';
import { ArticleBody, Heading } from '../components/magazine/Text';
import type { TemplateProps } from './types';

/** 特集扉。写真＋大見出しだけで「ここから始まる」と分からせる面 */
export function FeatureDoor({ data }: TemplateProps<'feature-door'>) {
  return (
    <div className="tpl-door" data-theme={data.theme}>
      {data.image && <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />}
      {data.image && <div className="mg-scrim" />}
      <div className="mg-layer mg-typearea tpl-door__inner">
        <div className="mg-grow" />
        {data.eyebrow && <span className="mg-eyebrow tpl-door__eyebrow">{data.eyebrow}</span>}
        <h2 className="tpl-door__title">{data.title}</h2>
        {data.titleEn && <span className="tpl-door__title-en">{data.titleEn}</span>}
        {data.lead && <p className="tpl-door__lead">{data.lead}</p>}
      </div>
      {data.image?.credit && <span className="mg-credit mg-credit--overlay">{data.image.credit}</span>}
    </div>
  );
}

/** 目次。ページ番号は台割の実データから流し込む前提 */
export function Contents({ data, issue }: TemplateProps<'contents'>) {
  const bySection = new Map<string, typeof data.entries>();
  for (const e of data.entries) {
    const key = e.section ?? '';
    bySection.set(key, [...(bySection.get(key) ?? []), e]);
  }
  return (
    <div className="tpl-contents mg-typearea">
      <div className="tpl-contents__head">
        <Heading eyebrow={data.titleEn ?? 'CONTENTS'} title={data.title} size="l" />
        <div className="tpl-contents__issue">
          <span>{issue.issueLine}</span>
          <span>{issue.releaseDate}</span>
        </div>
      </div>
      <div className="mg-rule mg-rule--thick" />
      <div className="tpl-contents__body mg-fit">
        <div className="tpl-contents__list">
          {[...bySection.entries()].map(([section, entries]) => (
            <section key={section} className="tpl-contents__group">
              {section && <h3 className="mg-sectionmark">{section}</h3>}
              <ul>
                {entries.map((e) => (
                  <li key={`${e.page}-${e.title}`}>
                    <span className="tpl-contents__page mg-num">{String(e.page).padStart(3, '0')}</span>
                    <span className="tpl-contents__text">
                      {e.kicker && <em>{e.kicker}</em>}
                      <b>{e.title}</b>
                      {e.subtitle && <small>{e.subtitle}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {data.image && (
          <aside className="tpl-contents__aside">
            <ImageFrame image={data.image} />
          </aside>
        )}
      </div>
      {data.note && <p className="tpl-contents__note mg-muted">{data.note}</p>}
    </div>
  );
}

/** 編集長メッセージ。「AIが編集長」の説明もこのテンプレートで書ける */
export function EditorsLetter({ data }: TemplateProps<'editors-letter'>) {
  return (
    <div className="tpl-letter mg-typearea">
      <Heading eyebrow={data.titleEn ?? "EDITOR'S LETTER"} title={data.title} size="l" serif />
      <div className="mg-rule" />
      <div className="tpl-letter__body mg-fit">
        <ArticleBody body={data.body} columns={2} dropcap />
        {data.image && (
          <aside className="tpl-letter__aside">
            <ImageFrame image={data.image} />
          </aside>
        )}
      </div>
      <footer className="tpl-letter__sign">
        {data.portrait && <ImageFrame image={data.portrait} className="tpl-letter__portrait" creditPlacement="none" />}
        <div>
          <p className="tpl-letter__name">{data.signature.name}</p>
          {data.signature.role && <p className="mg-muted">{data.signature.role}</p>}
        </div>
      </footer>
    </div>
  );
}

/** セクション区切り。後半企画の切り替えに使う */
export function SectionDivider({ data }: TemplateProps<'section-divider'>) {
  return (
    <div className="tpl-divider" data-theme={data.theme}>
      {data.image && <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />}
      {data.image && <div className="mg-scrim mg-scrim--full" />}
      <div className="mg-layer mg-typearea tpl-divider__inner">
        {data.number && <span className="tpl-divider__number mg-num">{data.number}</span>}
        <h2 className="tpl-divider__title">{data.title}</h2>
        {data.titleEn && <span className="tpl-divider__title-en">{data.titleEn}</span>}
        {data.lead && <p className="tpl-divider__lead">{data.lead}</p>}
      </div>
    </div>
  );
}
