import { magazineConfig } from '../../config/magazine.config';

type Series = { label: string; value: number }[];

/**
 * 図版は外部チャートライブラリを使わず素の SVG で描く。
 * 印刷に出るものなので、線幅・色・数字書式を誌面のトークンに厳密に揃えたいのと、
 * ライブラリ既定の装飾（影・グラデ・角丸）が誌面の品位を落とすため。
 */
export function DataChart({
  type,
  title,
  series,
  unit,
  note,
}: {
  type: 'bar' | 'column' | 'line' | 'donut';
  title: string;
  series: Series;
  unit?: string;
  note?: string;
}) {
  return (
    <figure className="mg-chart">
      <figcaption className="mg-chart__title">
        {title}
        {unit && <span className="mg-chart__unit">（{unit}）</span>}
      </figcaption>
      {type === 'bar' && <BarChart series={series} unit={unit} />}
      {type === 'column' && <ColumnChart series={series} unit={unit} />}
      {type === 'line' && <LineChart series={series} unit={unit} />}
      {type === 'donut' && <DonutChart series={series} unit={unit} />}
      {note && <p className="mg-chart__note">{note}</p>}
    </figure>
  );
}

const fmt = (n: number) => n.toLocaleString('ja-JP');

export function BarChart({ series, unit }: { series: Series; unit?: string }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="mg-bars">
      {series.map((s) => (
        <div className="mg-bars__row" key={s.label}>
          <span className="mg-bars__label">{s.label}</span>
          <span className="mg-bars__track">
            <span className="mg-bars__fill" style={{ width: `${(s.value / max) * 100}%` }} />
          </span>
          <span className="mg-bars__value mg-num">
            {fmt(s.value)}
            {unit && <span className="mg-bars__unit">{unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ColumnChart({ series, unit }: { series: Series; unit?: string }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="mg-columns-chart">
      {series.map((s) => (
        <div className="mg-columns-chart__item" key={s.label}>
          <span className="mg-columns-chart__value mg-num">
            {fmt(s.value)}
            {unit && <small>{unit}</small>}
          </span>
          <span className="mg-columns-chart__bar" style={{ height: `${Math.max((s.value / max) * 100, 2)}%` }} />
          <span className="mg-columns-chart__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ series, unit }: { series: Series; unit?: string }) {
  const w = 100;
  const h = 44;
  const max = Math.max(...series.map((s) => s.value), 1);
  const min = Math.min(...series.map((s) => s.value), 0);
  const span = max - min || 1;
  const pts = series.map((s, i) => {
    const x = (i / Math.max(series.length - 1, 1)) * w;
    const y = h - ((s.value - min) / span) * h;
    return { x, y, ...s };
  });
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return (
    <div className="mg-line">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mg-line__svg">
        <path d={d} fill="none" stroke={magazineConfig.color.accent} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        {pts.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="0.9" fill={magazineConfig.color.base} />
        ))}
      </svg>
      <div className="mg-line__axis">
        {series.map((s) => (
          <span key={s.label}>
            <b className="mg-num">
              {fmt(s.value)}
              {unit}
            </b>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ series, unit }: { series: Series; unit?: string }) {
  const total = series.reduce((a, b) => a + b.value, 0) || 1;
  const r = 15.9155; // 円周 = 100 になる半径
  let offset = 25;
  const tones = ['var(--c-accent)', 'var(--c-base)', 'var(--c-accent-alt)', 'var(--c-text-muted)', 'var(--c-rule)'];
  return (
    <div className="mg-donut">
      <svg viewBox="0 0 42 42" className="mg-donut__svg">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--c-bg-alt)" strokeWidth="5" />
        {series.map((s, i) => {
          const pct = (s.value / total) * 100;
          const el = (
            <circle
              key={s.label}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={tones[i % tones.length]}
              strokeWidth="5"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
            />
          );
          offset -= pct;
          return el;
        })}
      </svg>
      <ul className="mg-donut__legend">
        {series.map((s, i) => (
          <li key={s.label}>
            <span className="mg-donut__swatch" style={{ background: tones[i % tones.length] }} />
            {s.label}
            <b className="mg-num">
              {Math.round((s.value / total) * 100)}
              {unit ?? '%'}
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 「数字で見る人物」用。大きな数字＋単位＋ラベル */
export function StatGrid({
  stats,
  columns = 3,
}: {
  stats: { value: string; unit?: string; label: string; note?: string }[];
  columns?: number;
}) {
  return (
    <div className="mg-stats" style={{ ['--stat-cols' as string]: String(columns) }}>
      {stats.map((s) => (
        <div className="mg-stats__item" key={s.label}>
          <div className="mg-stats__value mg-num">
            {s.value}
            {s.unit && <span className="mg-stats__unit">{s.unit}</span>}
          </div>
          <div className="mg-stats__label">{s.label}</div>
          {s.note && <div className="mg-stats__note mg-muted">{s.note}</div>}
        </div>
      ))}
    </div>
  );
}
