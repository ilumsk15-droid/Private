import { useMemo } from 'react';
import { magazineConfig, mediaSize, spreadMediaSize } from '../config/magazine.config';
import { ThemeStyle } from '../components/magazine/Theme';
import { Page } from '../components/magazine/Page';
import { Spread } from '../components/magazine/Spread';
import { MarkSheet } from '../components/magazine/MarkSheet';
import { loadIssue } from '../content/browserLoader';

export interface PrintOptions {
  issueId: string;
  mode: 'book' | 'spreads';
  marks: boolean;
  /** 出力するページ範囲（1始まり・両端含む） */
  from?: number;
  to?: number;
}

export function parsePrintOptions(search: string): PrintOptions | null {
  const q = new URLSearchParams(search);
  if (!q.has('print')) return null;
  return {
    issueId: q.get('issue') ?? '',
    mode: (q.get('mode') as PrintOptions['mode']) ?? 'book',
    marks: q.get('marks') === '1',
    from: q.get('from') ? Number(q.get('from')) : undefined,
    to: q.get('to') ? Number(q.get('to')) : undefined,
  };
}

const MARK_SPACE = 8; // mm。MarkSheet の --mark-space と一致させる

/**
 * PDF 出力専用の描画。
 * 全ページを1つのドキュメントに縦に並べ、@page でページサイズを指定して
 * ブラウザの改ページに任せる。こうするとページ順が構造的に保証され、
 * 1ページずつ出力して結合する方式で起きがちな順序事故が起きない。
 */
export function PrintDocument({ options }: { options: PrintOptions }) {
  const resolved = useMemo(() => loadIssue(options.issueId), [options.issueId]);
  const cfg = magazineConfig;
  const single = mediaSize(cfg);
  const spreadSize = spreadMediaSize(cfg);
  const pad = options.marks ? MARK_SPACE * 2 : 0;

  const sheet = options.mode === 'spreads'
    ? { w: spreadSize.width + pad, h: spreadSize.height + pad }
    : { w: single.width + pad, h: single.height + pad };

  const from = options.from ?? 1;
  const to = options.to ?? resolved.totalPages;

  const pageCss = `@page { size: ${sheet.w}mm ${sheet.h}mm; margin: 0; }`;

  return (
    <>
      <ThemeStyle config={cfg} overrides={resolved.issue.themeOverrides} />
      <style>{pageCss}</style>
      <div className="print-doc mg-root" data-mode={options.mode} data-marks={options.marks ? '1' : '0'}>
        {options.mode === 'spreads'
          ? resolved.spreads
              .filter((sp) => {
                const n = sp.spread?.pageNumber ?? sp.left?.pageNumber ?? sp.right?.pageNumber ?? 0;
                return n >= from && n <= to;
              })
              .map((sp) => (
                <div className="print-sheet" key={`s-${sp.index}`} style={{ width: `${sheet.w}mm`, height: `${sheet.h}mm` }}>
                  <MarkSheet enabled={options.marks}>
                    <Spread spread={sp} issue={resolved.issue} />
                  </MarkSheet>
                </div>
              ))
          : Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => {
              const entry = resolved.pages.find((p) => n >= p.pageNumber && n <= p.endPageNumber);
              if (!entry) return null;
              const isSpread = entry.endPageNumber > entry.pageNumber;
              return (
                <div className="print-sheet" key={`p-${n}`} style={{ width: `${sheet.w}mm`, height: `${sheet.h}mm` }}>
                  <MarkSheet enabled={options.marks}>
                    <Page
                      page={entry}
                      issue={resolved.issue}
                      half={isSpread ? (n === entry.pageNumber ? 'left' : 'right') : undefined}
                    />
                  </MarkSheet>
                </div>
              );
            })}
      </div>
      <div id="print-ready" data-pages={to - from + 1} />
    </>
  );
}
