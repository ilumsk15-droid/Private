import { parseRichText, splitEmphasis } from '../../lib/richtext';

/** 見出しブロック。全テンプレートで同じ順序・同じ書式に揃えるためのもの */
export function Heading({
  eyebrow,
  title,
  titleEn,
  subtitle,
  lead,
  size = 'm',
  serif = false,
  className = '',
}: {
  eyebrow?: string;
  title?: string;
  titleEn?: string;
  subtitle?: string;
  lead?: string;
  size?: 'm' | 'l';
  serif?: boolean;
  className?: string;
}) {
  return (
    <header className={`mg-headblock ${className}`.trim()}>
      {eyebrow && <span className="mg-eyebrow">{eyebrow}</span>}
      {title && (
        <h2 className={`mg-title ${size === 'l' ? 'mg-title--l' : ''} ${serif ? 'mg-title--serif' : ''}`.trim()}>
          {title}
        </h2>
      )}
      {titleEn && <span className="mg-title-en">{titleEn}</span>}
      {subtitle && <p className="mg-subhead">{subtitle}</p>}
      {lead && <p className="mg-lead">{lead}</p>}
    </header>
  );
}

/** 本文。段組み数はデータ側から指定でき、テンプレートを増やさずに調整できる */
export function ArticleBody({
  body,
  columns = 1,
  dropcap = false,
  className = '',
}: {
  body: string | string[];
  columns?: number;
  dropcap?: boolean;
  className?: string;
}) {
  const blocks = parseRichText(body);
  return (
    <div
      className={`mg-body ${columns > 1 ? 'mg-columns' : ''} ${className}`.trim()}
      data-columns={columns > 1 ? columns : undefined}
    >
      {blocks.map((b, i) => {
        if (b.type === 'h') return <h3 key={i} className="mg-body__subhead">{b.text}</h3>;
        if (b.type === 'quote') return <p key={i} className="mg-body__inset">{b.text}</p>;
        if (b.type === 'list')
          return (
            <ul key={i} className="mg-body__list">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className={dropcap && i === 0 ? 'mg-dropcap' : undefined}>
            <Emphasis text={b.text} />
          </p>
        );
      })}
    </div>
  );
}

export function Emphasis({ text }: { text: string }) {
  return (
    <>
      {splitEmphasis(text).map((p, i) => (p.strong ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

/** 名言。誌面の中で最も大きく出る文字なので、サイズ段階を固定して統一する */
export function QuoteBlock({
  text,
  source,
  context,
  size = 'l',
  className = '',
}: {
  text: string;
  source?: string;
  context?: string;
  size?: 'xl' | 'l' | 'm' | 's';
  className?: string;
}) {
  return (
    <blockquote className={`mg-quote mg-quote--${size} ${className}`.trim()}>
      <p>{text}</p>
      {context && <p className="mg-quote__context mg-muted">{context}</p>}
      {source && <footer className="mg-quote__source">{source}</footer>}
    </blockquote>
  );
}

export function PullQuote({ text }: { text: string }) {
  return <p className="mg-pullquote">{text}</p>;
}
