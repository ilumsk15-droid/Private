import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { listIssueIds, listPersonIds, loadPerson, refreshContent } from '../content/contentStore';
import { expandRecipe, recipes, findRecipe } from '../issue/recipe';
import { templateMeta } from '../schema/templates';
import { Field, TextInput } from './fields';

/**
 * 号をつくる画面。
 * 人物マスタと台割レシピを選ぶと、生成前に「どのページに何が入るか」が全部見える。
 * 作ってから驚かないよう、生成ボタンを押す前に台割を確認できることを重視している。
 */
export function IssueWizard({
  initialPersonId,
  onCreated,
}: {
  initialPersonId?: string;
  onCreated: (issueId: string) => void;
}) {
  const people = useMemo(() => listPersonIds(), []);
  const existing = useMemo(() => listIssueIds(), []);
  const [personId, setPersonId] = useState(initialPersonId ?? people[0] ?? '');
  const [recipeId, setRecipeId] = useState(recipes[0].id);
  const nextNumber = String(existing.length + 1).padStart(3, '0');

  const person = useMemo(() => {
    try { return personId ? loadPerson(personId) : null; } catch { return null; }
  }, [personId]);

  const [meta, setMeta] = useState({
    id: `issue-${nextNumber}`,
    issueLine: `ISSUE ${nextNumber}`,
    title: '',
    subtitle: '',
    releaseDate: '',
    priceLine: '¥1,800 (税込)',
    editorInChief: '',
    publisher: 'THE INFLUENCER 編集部',
  });
  const set = (patch: Partial<typeof meta>) => setMeta((m) => ({ ...m, ...patch }));

  const recipe = findRecipe(recipeId)!;
  const plan = useMemo(() => {
    const slots = expandRecipe(recipe);
    let n = 1;
    return slots.map((s) => {
      const from = n;
      n += s.span ?? 1;
      return { from, to: n - 1, slot: s };
    });
  }, [recipe]);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; message: string; draftPages?: number[] } | null>(null);

  const willOverwrite = existing.includes(meta.id);

  const generate = async () => {
    if (!person) return;
    if (willOverwrite && !confirm(`${meta.id} はすでにあります。上書きすると、その号への手直しは失われます。続けますか？`)) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.generateIssue({
        personId: person.id,
        recipeId: recipe.id,
        overwrite: willOverwrite,
        meta: {
          ...meta,
          title: meta.title || (person.coverHeadline ?? person.name),
          subtitle: meta.subtitle || `巻頭大特集：${person.name}`,
          releaseDate: meta.releaseDate || new Date().toLocaleDateString('ja-JP'),
        },
      });
      await refreshContent();
      setResult({
        kind: 'ok',
        message: `${res.id} を作りました（${recipe.pageCount}ページ）。雛形のままのページが ${res.draftPages.length} ページあります。`,
        draftPages: res.draftPages,
      });
      onCreated(res.id);
    } catch (e) {
      setResult({ kind: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wizard">
      <div className="wizard__form">
        <h2>号をつくる</h2>
        <p className="wizard__lead">
          人物マスタの内容が巻頭特集に流し込まれます。ランキングや広告など人物に依らないページは、
          あとから編集できる雛形として入ります。
        </p>

        <Field label="特集する人物">
          <select className="inp" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((id) => (
              <option key={id} value={id}>{safeName(id)}（{id}）</option>
            ))}
          </select>
        </Field>

        {person && (
          <ul className="wizard__stock">
            <li data-ok={person.interviews.length > 0}>インタビュー {person.interviews.length}本</li>
            <li data-ok={person.quotes.length > 0}>名言 {person.quotes.length}</li>
            <li data-ok={person.timeline.length > 0}>年表 {person.timeline.length}項目</li>
            <li data-ok={person.stats.length > 0}>数字 {person.stats.length}</li>
            <li data-ok={person.videos.length > 0}>動画 {person.videos.length}本</li>
            <li data-ok={Boolean(person.photos.cover?.src)}>表紙写真 {person.photos.cover?.src ? 'あり' : 'なし'}</li>
            <li data-ok={person.photos.scenes.length > 0}>取材カット {person.photos.scenes.length}枚</li>
          </ul>
        )}

        <Field label="台割レシピ" hint="ページ数と構成の型紙">
          <select className="inp" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>{r.label}（{r.pageCount}P）</option>
            ))}
          </select>
        </Field>
        <p className="wizard__desc">{recipe.description}</p>

        <div className="grid2">
          <Field label="号ID" hint="フォルダ名になる">
            <TextInput value={meta.id} onChange={(v) => set({ id: v })} />
          </Field>
          <Field label="号数表記" hint="表紙と奥付に出る">
            <TextInput value={meta.issueLine} onChange={(v) => set({ issueLine: v })} />
          </Field>
          <Field label="特集タイトル" hint="空なら人物の表紙見出しを使う" wide>
            <TextInput value={meta.title} onChange={(v) => set({ title: v })} placeholder={person?.coverHeadline?.replace(/\n/g, ' ') ?? ''} />
          </Field>
          <Field label="サブタイトル">
            <TextInput value={meta.subtitle} onChange={(v) => set({ subtitle: v })} placeholder={person ? `巻頭大特集：${person.name}` : ''} />
          </Field>
          <Field label="発売日">
            <TextInput value={meta.releaseDate} onChange={(v) => set({ releaseDate: v })} placeholder="2026年5月28日" />
          </Field>
          <Field label="価格表記">
            <TextInput value={meta.priceLine} onChange={(v) => set({ priceLine: v })} />
          </Field>
          <Field label="編集長">
            <TextInput value={meta.editorInChief} onChange={(v) => set({ editorInChief: v })} />
          </Field>
          <Field label="発行元">
            <TextInput value={meta.publisher} onChange={(v) => set({ publisher: v })} />
          </Field>
        </div>

        {willOverwrite && <p className="wizard__warn">{meta.id} はすでに存在します。生成すると上書きされます。</p>}

        <button className="btn btn--primary" disabled={!person || busy} onClick={() => void generate()}>
          {busy ? '生成中…' : `${recipe.pageCount}ページの号を生成する`}
        </button>

        {result && (
          <div className="wizard__result" data-kind={result.kind}>
            <p>{result.message}</p>
            {result.draftPages?.length ? (
              <p className="muted">要入稿：P{result.draftPages.join(', P')}</p>
            ) : null}
          </div>
        )}
      </div>

      <aside className="wizard__plan">
        <h3>できあがる台割<span>{recipe.pageCount}ページ / {plan.length}エントリ</span></h3>
        <ol>
          {plan.map(({ from, to, slot }, i) => (
            <li key={i} data-span={slot.span === 2 ? 'spread' : undefined}>
              <span className="wizard__page">{from}{to !== from && `–${to}`}</span>
              <span className="wizard__tpl">{templateMeta[slot.template].label}</span>
              <span className="wizard__src">{sourceLabel(slot.fill)}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function safeName(id: string) {
  try { return loadPerson(id).name || id; } catch { return id; }
}

/** 各ページの中身がどこから来るのかを一言で示す */
function sourceLabel(fill: string): string {
  if (fill.endsWith('Skeleton')) return '雛形';
  const map: Record<string, string> = {
    cover: '人物', featureDoor: '人物', prologue: '人物', heroSpread: '人物', profile: '人物',
    interview: '人物', timeline: '人物', numbers: '人物', works: '人物', relations: '人物',
    article: '人物', schedule: '人物', gear: '人物', quotes: '人物', quoteHero: '人物',
    quoteAnnotated: '人物＋雛形', voices: '人物', videos: '人物', videoThumbs: '人物',
    qa: '人物', gallery: '人物', videoRanking: '人物',
    contents: '自動', colophon: '号の設定', nextIssue: '雛形',
    adSingle: '雛形', adSpread: '雛形', backCover: '雛形', tieUp: '雛形', paidProfile: '雛形',
    editorsLetter: '雛形', dividerHalf: '雛形',
    rankingTop10: '雛形', rankingTop30: '雛形', rankingDetail: '雛形',
  };
  return map[fill] ?? '雛形';
}
