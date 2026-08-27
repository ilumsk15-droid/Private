import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { listIssueIds, loadIssue, assetExists, subscribe, contentVersion } from '../content/contentStore';
import { magazineConfig } from '../config/magazine.config';
import { validateIssue, summarize } from '../validation/validate';
import { defaultGuides, type GuideState } from '../components/magazine/Guides';

export type ViewMode = 'cover' | 'page' | 'spread' | 'thumbs' | 'print';
export type ZoomMode = 'fit' | 'actual';

export function useMagazineState() {
  // content/ が書き換わったら（アプリからの保存・号の生成）作り直す
  const version = useSyncExternalStore(subscribe, contentVersion, contentVersion);
  const issueIds = useMemo(() => listIssueIds(), [version]);
  const [issueId, setIssueId] = useState(issueIds[0] ?? '');
  const [view, setView] = useState<ViewMode>('spread');
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState<ZoomMode>('fit');
  const [guides, setGuides] = useState<GuideState>(defaultGuides);

  useEffect(() => {
    // 号が消えた／増えたときに選択を合わせる
    if (issueIds.length && !issueIds.includes(issueId)) setIssueId(issueIds[0]);
  }, [issueIds, issueId]);

  const resolved = useMemo(() => {
    if (!issueId || !issueIds.includes(issueId)) return null;
    try {
      return loadIssue(issueId);
    } catch {
      return null;
    }
  }, [issueId, issueIds, version]);
  const diagnostics = useMemo(
    () => (resolved ? validateIssue(resolved, magazineConfig, (src) => ({ exists: assetExists(src), vector: src.endsWith('.svg') })) : []),
    [resolved],
  );
  const summary = useMemo(() => summarize(diagnostics), [diagnostics]);

  const total = resolved?.totalPages ?? 0;

  const go = useCallback(
    (n: number) => setPageNumber(Math.min(Math.max(1, n), Math.max(total, 1))),
    [total],
  );

  /** 見開き表示では2ページ単位で送る。左＝偶数を必ず保つ */
  const step = useCallback(
    (delta: number) => {
      setPageNumber((prev) => {
        if (view !== 'spread') return Math.min(Math.max(1, prev + delta), total);
        if (prev === 1 && delta > 0) return 2;
        const base = prev % 2 === 0 ? prev : prev - 1;
        const next = base + delta * 2;
        if (next < 2) return 1;
        return Math.min(next, total % 2 === 0 ? total : total - 1);
      });
    },
    [view, total],
  );

  const toggleGuide = useCallback(
    (key: keyof GuideState) => setGuides((g) => ({ ...g, [key]: !g[key] })),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      switch (e.key) {
        case 'ArrowRight': step(1); break;
        case 'ArrowLeft': step(-1); break;
        case 'Home': go(1); break;
        case 'End': go(total); break;
        case '1': setView('page'); break;
        case '2': setView('spread'); break;
        case '3': setView('thumbs'); break;
        case '0': setZoom((z) => (z === 'fit' ? 'actual' : 'fit')); break;
        case 'b': toggleGuide('bleed'); break;
        case 's': toggleGuide('safety'); break;
        case 'g': toggleGuide('grid'); break;
        case 'n': toggleGuide('gutter'); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, go, total, toggleGuide]);

  return {
    issueIds, issueId, setIssueId,
    view, setView,
    pageNumber, go, step,
    zoom, setZoom,
    guides, setGuides, toggleGuide,
    resolved, diagnostics, summary, total, version,
  };
}
