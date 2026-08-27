import { ImageFrame } from '../components/magazine/ImageFrame';
import { QRBlock } from '../components/magazine/QRBlock';
import { ArticleBody, Heading } from '../components/magazine/Text';
import { magazineConfig } from '../config/magazine.config';
import type { TemplateProps } from './types';

/**
 * 広告面。「広告」「PR」表記は必ず誌面に出す（バリデーションでも必須にしている）。
 * 記事と紛れないよう、表記は常に版面の上端・同じ書式で出す。
 */
function AdLabel({ label }: { label: string }) {
  return <span className="tpl-ad__label">{label}</span>;
}

export function AdSingle({ data }: TemplateProps<'ad-single'>) {
  return (
    <div className="tpl-ad" data-theme={data.theme}>
      {data.image && <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />}
      <div className="mg-layer mg-typearea tpl-ad__inner">
        <AdLabel label={data.label} />
        <div className="mg-grow" />
        {data.copy && <p className="tpl-ad__copy">{data.copy}</p>}
        <div className="tpl-ad__foot">
          <div>
            <p className="tpl-ad__brand">{data.brand}</p>
            {data.body && <p className="tpl-ad__body">{data.body}</p>}
            {data.url && <p className="tpl-ad__url">{data.url}</p>}
          </div>
          {data.qr && <QRBlock qr={data.qr} />}
        </div>
      </div>
    </div>
  );
}

export function AdSpread({ data }: TemplateProps<'ad-spread'>) {
  return (
    <div className="tpl-ad tpl-ad--spread" data-theme={data.theme}>
      {data.image && <ImageFrame image={data.image} fill creditPlacement="none" className="mg-bleed-layer" />}
      <div className="mg-layer mg-typearea tpl-ad__inner">
        <AdLabel label={data.label} />
        <div className="mg-grow" />
        {data.copy && <p className="tpl-ad__copy tpl-ad__copy--spread">{data.copy}</p>}
        <div className="tpl-ad__foot">
          <div>
            <p className="tpl-ad__brand">{data.brand}</p>
            {data.body && <p className="tpl-ad__body">{data.body}</p>}
          </div>
          {data.qr && <QRBlock qr={data.qr} />}
        </div>
      </div>
      <div className="mg-gutter-guard" />
    </div>
  );
}

export function TieUp({ data }: TemplateProps<'tie-up'>) {
  return (
    <div className="tpl-tieup mg-typearea">
      <AdLabel label={data.label} />
      <Heading eyebrow={data.titleEn ?? data.brand} title={data.title} lead={data.lead} size="l" />
      <div className="mg-rule mg-rule--thick" />
      <div className="tpl-tieup__main">
        {data.images.length > 0 && (
          <div className="tpl-tieup__figures" data-count={data.images.length}>
            {data.images.map((img, i) => (
              <ImageFrame key={i} image={img} />
            ))}
          </div>
        )}
        <div className="tpl-tieup__text mg-fit">
          <ArticleBody body={data.body} columns={2} />
        </div>
      </div>
      <footer className="tpl-tieup__foot">
        <p className="tpl-tieup__brand">{data.brand}</p>
        {data.qr && <QRBlock qr={data.qr} />}
      </footer>
    </div>
  );
}

export function PaidProfile({ data }: TemplateProps<'paid-profile'>) {
  return (
    <div className="tpl-paid mg-typearea">
      <AdLabel label={data.label} />
      <Heading eyebrow={data.titleEn ?? 'SPONSORED PROFILE'} title={data.title} />
      <div className="mg-rule" />
      <ul className="tpl-paid__list mg-fit" data-columns={data.people.length > 2 ? 2 : 1}>
        {data.people.map((p) => (
          <li key={p.name}>
            {p.portrait && <ImageFrame image={p.portrait} className="tpl-paid__portrait" creditPlacement="none" />}
            <div className="tpl-paid__body">
              <h3>{p.name}</h3>
              <span className="mg-muted">{[p.title, p.org].filter(Boolean).join('　/　')}</span>
              <p>{p.body}</p>
              {p.qr && <QRBlock qr={p.qr} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NextIssue({ data }: TemplateProps<'next-issue'>) {
  return (
    <div className="tpl-next mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'NEXT ISSUE'} title={data.title} size="l" />
      <div className="tpl-next__meta">
        <span>{data.issueLine}</span>
        <span>{data.onSaleLine}</span>
      </div>
      {data.image && <ImageFrame image={data.image} className="tpl-next__figure" />}
      <ul className="tpl-next__list mg-fit">
        {data.highlights.map((h) => (
          <li key={h.title}>
            <h3>{h.title}</h3>
            {h.body && <p>{h.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Colophon({ data, issue }: TemplateProps<'colophon'>) {
  const cfg = magazineConfig;
  return (
    <div className="tpl-colophon mg-typearea">
      <Heading eyebrow={data.titleEn ?? 'COLOPHON'} title={data.title} />
      <div className="mg-rule mg-rule--thick" />
      <div className="tpl-colophon__grid mg-fit">
        <dl className="tpl-colophon__staff">
          {data.staff.map((s) => (
            <div key={s.role}>
              <dt>{s.role}</dt>
              <dd>{s.names.join('　')}</dd>
            </div>
          ))}
        </dl>
        <dl className="tpl-colophon__imprint">
          <div>
            <dt>誌名</dt>
            <dd>{cfg.magazine.title}</dd>
          </div>
          <div>
            <dt>号</dt>
            <dd>{data.issueLine}</dd>
          </div>
          <div>
            <dt>発行日</dt>
            <dd>{issue.releaseDate}</dd>
          </div>
          {data.imprint.map((i) => (
            <div key={i.label}>
              <dt>{i.label}</dt>
              <dd>{i.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {data.notices.length > 0 && (
        <ul className="tpl-colophon__notices">
          {data.notices.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
