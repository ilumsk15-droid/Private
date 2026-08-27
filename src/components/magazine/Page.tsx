import type { ReactNode } from 'react';
import { magazineConfig, type MagazineConfig } from '../../config/magazine.config';
import type { Issue, ResolvedPage } from '../../schema/issue';
import { showsChrome } from '../../content/resolve';
import { Guides, defaultGuides, type GuideState } from './Guides';
import { Folio } from './Folio';
import { renderTemplate } from '../../templates/registry';

export interface PageProps {
  page: ResolvedPage;
  issue: Issue;
  guides?: GuideState;
  config?: MagazineConfig;
  /** span=2 のページを単ページ表示するときの表示半分 */
  half?: 'left' | 'right';
  children?: ReactNode;
}

/**
 * 1エントリ＝1ページ（または見開き1枚）の枠。
 * 「どのテンプレートで描くか」以外の共通要素（地色・柱・ノンブル・ガイド）を
 * すべてここに集約しているので、テンプレート側は中身に集中できる。
 */
export function Page({ page, issue, guides = defaultGuides, config = magazineConfig, half }: PageProps) {
  const isSpread = page.endPageNumber > page.pageNumber;
  const side = isSpread ? 'spread' : page.side;
  const section = issue.sections.find((s) => s.id === page.spec.section);
  const runningHead = page.spec.runningHead ?? section?.title;
  const chrome = showsChrome(page, config);

  const surface = page.spec.surface ?? 'light';

  const inner = (
    <article
      className="mg-page"
      data-side={side}
      data-surface={surface}
      data-template={page.spec.template}
      data-page={page.pageNumber}
      data-span={isSpread ? 2 : 1}
      id={`page-${page.pageNumber}`}
    >
      <div className="mg-trim">
        {renderTemplate(page, issue)}
        {chrome && !isSpread && (
          <Folio pageNumber={page.pageNumber} runningHead={runningHead} side={page.side === 'left' ? 'left' : 'right'} />
        )}
        {chrome && isSpread && (
          <>
            <Folio pageNumber={page.pageNumber} runningHead={runningHead} side="left" />
            <Folio pageNumber={page.endPageNumber} runningHead={runningHead} side="right" />
          </>
        )}
      </div>
      <Guides guides={guides} spread={isSpread} />
    </article>
  );

  if (isSpread && half) {
    return (
      <div className="mg-page-clip" data-half={half}>
        {inner}
      </div>
    );
  }
  return inner;
}
