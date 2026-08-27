import { ImageFrame } from './ImageFrame';
import type { ImageRef } from '../../schema/common';

/** 年表。縦の軸に沿って年・見出し・本文を並べる */
export function Timeline({
  items,
  columns = 1,
}: {
  items: { year: string; month?: string; title: string; body?: string; highlight?: boolean }[];
  columns?: number;
}) {
  return (
    <ol className="mg-timeline" data-columns={columns > 1 ? columns : undefined}>
      {items.map((it, i) => (
        <li className="mg-timeline__item" key={`${it.year}-${i}`} data-highlight={it.highlight ? 'true' : undefined}>
          <div className="mg-timeline__year mg-num">
            {it.year}
            {it.month && <span className="mg-timeline__month">{it.month}</span>}
          </div>
          <div className="mg-timeline__body">
            <h4 className="mg-timeline__title">{it.title}</h4>
            {it.body && <p className="mg-timeline__text">{it.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** ランキング。順位の見せ方を1か所に集約して、TOP10/30/詳細で表情を揃える */
export function RankingList({
  items,
  variant = 'detailed',
  columns = 1,
}: {
  items: {
    rank: number;
    name: string;
    category?: string;
    score?: string;
    body?: string;
    portrait?: ImageRef;
  }[];
  variant?: 'detailed' | 'compact';
  columns?: number;
}) {
  return (
    <ol className={`mg-ranking mg-ranking--${variant}`} data-columns={columns > 1 ? columns : undefined}>
      {items.map((it) => (
        <li className="mg-ranking__item" key={it.rank}>
          <span className="mg-ranking__rank mg-num">{String(it.rank).padStart(2, '0')}</span>
          {variant === 'detailed' && it.portrait && (
            <ImageFrame image={it.portrait} className="mg-ranking__portrait" creditPlacement="none" />
          )}
          <div className="mg-ranking__body">
            <h4 className="mg-ranking__name">{it.name}</h4>
            {it.category && <span className="mg-ranking__category mg-muted">{it.category}</span>}
            {variant === 'detailed' && it.body && <p className="mg-ranking__text">{it.body}</p>}
          </div>
          {it.score && <span className="mg-ranking__score mg-num">{it.score}</span>}
        </li>
      ))}
    </ol>
  );
}

/** 比較表 */
export function ComparisonTable({
  head,
  rows,
}: {
  head: string[];
  rows: { label: string; cells: string[] }[];
}) {
  return (
    <table className="mg-table">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            {r.cells.map((c, i) => (
              <td key={i}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** ポジショニングマップ（勢力図） */
export function PositioningMap({
  axes,
  points,
}: {
  axes: { x: { label: string; low: string; high: string }; y: { label: string; low: string; high: string } };
  points: { name: string; x: number; y: number; group?: string }[];
}) {
  return (
    <div className="mg-map">
      <span className="mg-map__axis mg-map__axis--y-high">{axes.y.high}</span>
      <span className="mg-map__axis mg-map__axis--y-low">{axes.y.low}</span>
      <span className="mg-map__axis mg-map__axis--x-low">{axes.x.low}</span>
      <span className="mg-map__axis mg-map__axis--x-high">{axes.x.high}</span>
      <div className="mg-map__field">
        <span className="mg-map__line mg-map__line--v" />
        <span className="mg-map__line mg-map__line--h" />
        {points.map((p) => (
          <span
            className="mg-map__point"
            key={p.name}
            data-group={p.group}
            style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
          >
            <b />
            <em>{p.name}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 人物相関図。中心人物から放射状に関係者を配置する */
export function RelationshipMap({
  center,
  nodes,
}: {
  center: { name: string; role?: string };
  nodes: { name: string; role?: string; relation?: string; group?: string; angle: number; distance: number }[];
}) {
  return (
    <div className="mg-relmap">
      <div className="mg-relmap__field">
        <svg className="mg-relmap__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {nodes.map((n) => {
            const rad = (n.angle * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * n.distance * 44;
            const y = 50 + Math.sin(rad) * n.distance * 44;
            return (
              <line
                key={n.name}
                x1="50"
                y1="50"
                x2={x.toFixed(2)}
                y2={y.toFixed(2)}
                stroke="var(--c-rule)"
                strokeWidth="0.25"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div className="mg-relmap__center">
          <b>{center.name}</b>
          {center.role && <span>{center.role}</span>}
        </div>
        {nodes.map((n) => {
          const rad = (n.angle * Math.PI) / 180;
          const x = 50 + Math.cos(rad) * n.distance * 44;
          const y = 50 + Math.sin(rad) * n.distance * 44;
          return (
            <div
              className="mg-relmap__node"
              key={n.name}
              data-group={n.group}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {n.relation && <span className="mg-relmap__relation">{n.relation}</span>}
              <b>{n.name}</b>
              {n.role && <span className="mg-relmap__role">{n.role}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
