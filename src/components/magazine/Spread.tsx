import { magazineConfig, type MagazineConfig } from '../../config/magazine.config';
import type { Issue, Spread as SpreadModel } from '../../schema/issue';
import { defaultGuides, type GuideState } from './Guides';
import { Page } from './Page';

/**
 * 見開き。左開きなので「左＝偶数ページ／右＝奇数ページ」で必ず組む。
 * 表紙(P1)だけは左が存在しないため、左側は空き台紙になる。
 *
 * 各ページは塗り足し込みの媒体ボックスを持っているので、そのまま並べると
 * ノド側の塗り足し（3mm×2）が重複して見える。スロット側でノド側の塗り足しを
 * 隠し、仕上がり同士が接する正しい見え方にしている。
 */
export function Spread({
  spread,
  issue,
  guides = defaultGuides,
  config = magazineConfig,
}: {
  spread: SpreadModel;
  issue: Issue;
  guides?: GuideState;
  config?: MagazineConfig;
}) {
  if (spread.spread) {
    return (
      <div className="mg-spread" data-kind="single-entry">
        <Page page={spread.spread} issue={issue} guides={guides} config={config} />
      </div>
    );
  }
  return (
    <div className="mg-spread" data-kind="pair">
      <div className="mg-spread__slot" data-side="left">
        {spread.left ? (
          <Page page={spread.left} issue={issue} guides={guides} config={config} />
        ) : (
          <div className="mg-page mg-page--blank" data-side="left" aria-hidden />
        )}
      </div>
      <div className="mg-spread__slot" data-side="right">
        {spread.right ? (
          <Page page={spread.right} issue={issue} guides={guides} config={config} />
        ) : (
          <div className="mg-page mg-page--blank" data-side="right" aria-hidden />
        )}
      </div>
    </div>
  );
}
