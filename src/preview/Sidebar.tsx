import { templateMeta } from '../schema/templates';
import type { Diagnostic } from '../validation/validate';
import type { ResolveIssue } from '../content/resolve';

export function Sidebar({
  resolved,
  pageNumber,
  onSelect,
  diagnostics,
  tab,
  onTab,
}: {
  resolved: ResolveIssue;
  pageNumber: number;
  onSelect: (n: number) => void;
  diagnostics: Diagnostic[];
  tab: 'spine' | 'check';
  onTab: (t: 'spine' | 'check') => void;
}) {
  const errors = diagnostics.filter((d) => d.level === 'error');
  const warnings = diagnostics.filter((d) => d.level === 'warning');
  const infos = diagnostics.filter((d) => d.level === 'info');

  return (
    <aside className="sidebar">
      <div className="sidebar__tabs">
        <button data-active={tab === 'spine'} onClick={() => onTab('spine')}>
          台割 <span>{resolved.totalPages}P</span>
        </button>
        <button data-active={tab === 'check'} onClick={() => onTab('check')}>
          入稿チェック
          {errors.length > 0 && <span className="badge badge--error">{errors.length}</span>}
          {errors.length === 0 && warnings.length > 0 && <span className="badge badge--warn">{warnings.length}</span>}
          {errors.length === 0 && warnings.length === 0 && <span className="badge badge--ok">OK</span>}
        </button>
      </div>

      {tab === 'spine' && (
        <ol className="spine">
          {resolved.pages.map((p) => {
            const section = resolved.issue.sections.find((s) => s.id === p.spec.section);
            const active = pageNumber >= p.pageNumber && pageNumber <= p.endPageNumber;
            return (
              <li key={p.index}>
                <button data-active={active} onClick={() => onSelect(p.pageNumber)}>
                  <span className="spine__no">
                    {p.pageNumber}
                    {p.endPageNumber !== p.pageNumber && `–${p.endPageNumber}`}
                  </span>
                  <span className="spine__body">
                    <b>{templateMeta[p.spec.template].label}</b>
                    <em style={{ color: section?.color }}>{section?.title ?? p.spec.section}</em>
                  </span>
                  <span className="spine__side" data-side={p.side}>
                    {p.side === 'spread' ? '見開' : p.side === 'left' ? '左' : '右'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {tab === 'check' && (
        <div className="checks">
          <DiagGroup title="エラー" level="error" items={errors} onSelect={onSelect} />
          <DiagGroup title="警告" level="warning" items={warnings} onSelect={onSelect} />
          <DiagGroup title="情報" level="info" items={infos} onSelect={onSelect} />
          {diagnostics.length === 0 && <p className="checks__empty">指摘はありません。</p>}
        </div>
      )}
    </aside>
  );
}

function DiagGroup({
  title,
  level,
  items,
  onSelect,
}: {
  title: string;
  level: string;
  items: Diagnostic[];
  onSelect: (n: number) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="checks__group" data-level={level}>
      <h3>
        {title} <span>{items.length}</span>
      </h3>
      <ul>
        {items.map((d, i) => (
          <li key={i}>
            <button onClick={() => d.page && onSelect(d.page)}>
              {d.page && <span className="checks__page">P{d.page}</span>}
              <span className="checks__msg">{d.message}</span>
              {d.hint && <span className="checks__hint">{d.hint}</span>}
              <span className="checks__code">{d.code}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
