import { useMemo, useState } from 'react';
import { isApiAvailable } from '../content/contentStore';
import { PeoplePanel } from '../editor/PeoplePanel';
import { IssueWizard } from '../editor/IssueWizard';
import { magazineConfig } from '../config/magazine.config';
import { ThemeStyle } from '../components/magazine/Theme';
import { Page } from '../components/magazine/Page';
import { Spread } from '../components/magazine/Spread';
import { MarkSheet } from '../components/magazine/MarkSheet';
import { pageIndexMap } from '../content/resolve';
import { templateMeta } from '../schema/templates';
import { useMagazineState } from './useMagazineState';
import { Stage } from './Stage';
import { Sidebar } from './Sidebar';

type Mode = 'preview' | 'people' | 'new-issue';

export default function App() {
  const s = useMagazineState();
  const [tab, setTab] = useState<'spine' | 'check'>('spine');
  const [mode, setMode] = useState<Mode>('preview');
  const [wizardPerson, setWizardPerson] = useState<string | undefined>(undefined);
  const canEdit = isApiAvailable();
  // フックは早期returnより前に呼ぶ必要があるので、データ未読込でも安全に評価できる形にする
  const byPage = useMemo(() => pageIndexMap(s.resolved?.pages ?? []), [s.resolved]);

  const modeNav = (
    <div className="segmented segmented--mode">
      {([
        ['preview', '誌面プレビュー'],
        ['people', '人物データ'],
        ['new-issue', '号をつくる'],
      ] as const).map(([m, label]) => (
        <button key={m} data-active={mode === m} onClick={() => setMode(m)} disabled={!canEdit && m !== 'preview'}>
          {label}
        </button>
      ))}
    </div>
  );

  const brand = (
    <div className="topbar__brand">
      <b>{magazineConfig.magazine.titleEn}</b>
      <span>誌面制作システム</span>
    </div>
  );

  if (mode !== 'preview') {
    return (
      <div className="app">
        <ThemeStyle config={magazineConfig} />
        <header className="topbar">
          {brand}
          {modeNav}
          {!canEdit && <span className="topbar__note">保存APIに接続できません（npm run preview で起動してください）</span>}
        </header>
        <div className="app__body app__body--editor">
          {mode === 'people' && (
            <PeoplePanel
              onGenerate={(personId) => {
                setWizardPerson(personId);
                setMode('new-issue');
              }}
            />
          )}
          {mode === 'new-issue' && (
            <IssueWizard
              initialPersonId={wizardPerson}
              onCreated={(issueId) => {
                s.setIssueId(issueId);
                s.go(1);
                setMode('preview');
              }}
            />
          )}
        </div>
      </div>
    );
  }

  if (!s.resolved) {
    return (
      <div className="app">
        <ThemeStyle config={magazineConfig} />
        <header className="topbar">
          {brand}
          {modeNav}
        </header>
        <div className="app--empty">
          <p>まだ号がありません。「号をつくる」から作成してください。</p>
        </div>
      </div>
    );
  }

  const resolved = s.resolved;
  const issue = resolved.issue;
  const current = byPage.get(s.pageNumber) ?? resolved.pages[0];
  const spreadIndex = s.pageNumber === 1 ? 0 : Math.floor(s.pageNumber / 2);
  const spread = resolved.spreads[Math.min(spreadIndex, resolved.spreads.length - 1)];

  return (
    <div className="app">
      <ThemeStyle config={magazineConfig} overrides={issue.themeOverrides} />

      <header className="topbar">
        {brand}
        {modeNav}

        <select className="select" value={s.issueId} onChange={(e) => s.setIssueId(e.target.value)}>
          {s.issueIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        <div className="segmented">
          {([
            ['cover', '表紙'],
            ['page', '1ページ'],
            ['spread', '見開き'],
            ['thumbs', '一覧'],
            ['print', '印刷プレビュー'],
          ] as const).map(([v, label]) => (
            <button key={v} data-active={s.view === v} onClick={() => s.setView(v)}>
              {label}
            </button>
          ))}
        </div>

        <div className="pager">
          <button onClick={() => s.step(-1)} aria-label="前へ">←</button>
          <input
            type="number"
            min={1}
            max={s.total}
            value={s.pageNumber}
            onChange={(e) => s.go(Number(e.target.value))}
          />
          <span className="pager__total">/ {s.total}</span>
          <button onClick={() => s.step(1)} aria-label="次へ">→</button>
        </div>

        <div className="segmented segmented--sm">
          <button data-active={s.zoom === 'fit'} onClick={() => s.setZoom('fit')}>画面に合わせる</button>
          <button data-active={s.zoom === 'actual'} onClick={() => s.setZoom('actual')}>100%</button>
        </div>

        <div className="toggles">
          {([
            ['bleed', '塗り足し'],
            ['safety', 'セーフティ'],
            ['grid', 'グリッド'],
            ['gutter', 'ノド逃げ'],
          ] as const).map(([k, label]) => (
            <button key={k} data-active={s.guides[k]} onClick={() => s.toggleGuide(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="app__body">
        <Sidebar
          resolved={resolved}
          pageNumber={s.pageNumber}
          onSelect={s.go}
          diagnostics={s.diagnostics}
          tab={tab}
          onTab={setTab}
        />

        <main className="viewer mg-root">
          {s.view === 'thumbs' ? (
            <div className="thumbs">
              {resolved.spreads.map((sp) => (
                <button
                  className="thumbs__item"
                  key={sp.index}
                  data-active={sp.index === spreadIndex}
                  onClick={() => {
                    s.go(sp.spread?.pageNumber ?? sp.left?.pageNumber ?? sp.right?.pageNumber ?? 1);
                    s.setView('spread');
                  }}
                >
                  <div className="thumbs__frame">
                    <div className="thumbs__scale">
                      <Spread spread={sp} issue={issue} />
                    </div>
                  </div>
                  <span className="thumbs__label">{sp.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <Stage zoom={s.zoom} contentKey={`${s.view}-${s.pageNumber}-${s.issueId}`}>
              {s.view === 'spread' && <Spread spread={spread} issue={issue} guides={s.guides} />}
              {s.view === 'page' && (
                <Page
                  page={current}
                  issue={issue}
                  guides={s.guides}
                  half={current.endPageNumber > current.pageNumber ? (s.pageNumber === current.pageNumber ? 'left' : 'right') : undefined}
                />
              )}
              {s.view === 'cover' && <Page page={resolved.pages[0]} issue={issue} guides={s.guides} />}
              {s.view === 'print' && (
                <MarkSheet>
                  <Spread spread={spread} issue={issue} />
                </MarkSheet>
              )}
            </Stage>
          )}
        </main>

        <aside className="inspector">
          <h2>P{current.pageNumber}{current.endPageNumber !== current.pageNumber && `–${current.endPageNumber}`}</h2>
          <dl>
            <div><dt>テンプレート</dt><dd>{templateMeta[current.spec.template].label}</dd></div>
            <div><dt>ID</dt><dd><code>{current.spec.template}</code></dd></div>
            <div><dt>セクション</dt><dd>{issue.sections.find((x) => x.id === current.spec.section)?.title}</dd></div>
            <div><dt>面付け</dt><dd>{current.side === 'spread' ? '見開き' : current.side === 'left' ? '左（偶数）' : '右（奇数）'}</dd></div>
            <div><dt>台割index</dt><dd>{current.index}</dd></div>
          </dl>
          {current.spec.note && <p className="inspector__note">{current.spec.note}</p>}
          <div className="inspector__flags">
            {current.spec.flags?.ad && <span className="flag flag--ad">広告</span>}
            {current.spec.flags?.ai && <span className="flag flag--ai">AI生成</span>}
            {current.spec.flags?.draft && <span className="flag flag--draft">未入稿</span>}
          </div>
          <p className="inspector__help">
            ← → : ページ送り / 1・2・3 : 表示切替 / 0 : 100%⇔全体 / b・s・g・n : ガイド
          </p>
        </aside>
      </div>
    </div>
  );
}
