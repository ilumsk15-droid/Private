import { useEffect, useMemo, useState } from 'react';
import { emptyPerson, personSchema, type Person } from '../schema/person';
import { api } from '../api/client';
import { listPersonIds, loadPerson, refreshContent } from '../content/contentStore';
import { PersonForm } from './PersonForm';

/**
 * 人物マスタの管理画面。
 * 保存すると content/people/<id>.json が書き換わり、
 * その人物から生成する号すべての元データになる。
 */
export function PeoplePanel({ onGenerate }: { onGenerate: (personId: string) => void }) {
  const ids = useMemo(() => listPersonIds(), []);
  const [selected, setSelected] = useState<string | null>(ids[0] ?? null);
  const [draft, setDraft] = useState<Person | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'error'; message?: string }>({ kind: 'idle' });

  useEffect(() => {
    if (!selected) return setDraft(null);
    try {
      setDraft(loadPerson(selected));
      setDirty(false);
      setStatus({ kind: 'idle' });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    }
  }, [selected]);

  const update = (patch: Partial<Person>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
    setStatus({ kind: 'idle' });
  };

  const save = async () => {
    if (!draft) return;
    const parsed = personSchema.safeParse(draft);
    if (!parsed.success) {
      setStatus({
        kind: 'error',
        message: parsed.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`).join(' / '),
      });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      await api.savePerson(parsed.data);
      await refreshContent();
      setDirty(false);
      setSelected(parsed.data.id);
      setStatus({ kind: 'ok', message: `content/people/${parsed.data.id}.json を保存しました` });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    }
  };

  const createNew = () => {
    const base = emptyPerson('new-person');
    setSelected(null);
    setDraft(base);
    setDirty(true);
    setStatus({ kind: 'idle', message: '人物IDと氏名を入れて保存してください' });
  };

  const remove = async (id: string) => {
    if (!confirm(`${id} を削除します。生成済みの号はそのまま残ります。よろしいですか？`)) return;
    await api.deletePerson(id);
    await refreshContent();
    setSelected(null);
    setDraft(null);
  };

  return (
    <div className="people">
      <aside className="people__list">
        <div className="people__listhead">
          <h2>人物マスタ</h2>
          <button className="btn btn--sm" onClick={createNew}>＋ 新規</button>
        </div>
        <ul>
          {ids.map((id) => {
            let name = id;
            try { name = loadPerson(id).name || id; } catch { /* 壊れたデータでも一覧は出す */ }
            return (
              <li key={id}>
                <button data-active={selected === id} onClick={() => setSelected(id)}>
                  <b>{name}</b>
                  <em>{id}</em>
                </button>
              </li>
            );
          })}
        </ul>
        {ids.length === 0 && <p className="people__empty">まだ人物が登録されていません。</p>}
        {draft && selected && (
          <div className="people__foot">
            <button className="btn btn--ghost btn--sm" onClick={() => void remove(selected)}>この人物を削除</button>
            <button className="btn btn--sm" onClick={() => onGenerate(selected)}>この人物で号をつくる →</button>
          </div>
        )}
      </aside>

      <div className="people__editor">
        {draft ? (
          <>
            <header className="savebar">
              <div className="savebar__title">
                <b>{draft.name || '（氏名未入力）'}</b>
                <code>content/people/{draft.id}.json</code>
              </div>
              <div className="savebar__status" data-kind={status.kind}>
                {status.kind === 'saving' && '保存中…'}
                {status.kind === 'ok' && `✔ ${status.message}`}
                {status.kind === 'error' && `✖ ${status.message}`}
                {status.kind === 'idle' && (dirty ? '未保存の変更があります' : status.message ?? '')}
              </div>
              <button className="btn" disabled={!dirty || status.kind === 'saving'} onClick={() => void save()}>
                保存
              </button>
            </header>
            <PersonForm person={draft} onChange={update} />
          </>
        ) : (
          <div className="people__placeholder">
            <p>左の一覧から人物を選ぶか、「＋ 新規」で追加してください。</p>
            <p className="muted">ここに入れた情報が、そのまま巻頭特集の各ページになります。</p>
          </div>
        )}
      </div>
    </div>
  );
}
