import { magazineConfig } from '../../config/magazine.config';

export interface GuideState {
  bleed: boolean;
  safety: boolean;
  grid: boolean;
  gutter: boolean;
}

export const defaultGuides: GuideState = { bleed: false, safety: false, grid: false, gutter: false };

/**
 * 塗り足し／セーフティ／グリッド／ノド逃げのガイド。
 * 誌面そのものには干渉しない純粋なオーバーレイなので、PDF出力時は
 * 描画しないだけで誌面が一切変わらない。
 */
export function Guides({ guides, spread = false }: { guides: GuideState; spread?: boolean }) {
  const cols = magazineConfig.layout.grid.columns * (spread ? 2 : 1);
  return (
    <div className="mg-guides" aria-hidden>
      {guides.bleed && <div className="mg-guide mg-guide--trim" />}
      {guides.safety && <div className="mg-guide mg-guide--safety" />}
      {guides.gutter && spread && <div className="mg-guide mg-guide--gutter" />}
      {guides.grid && (
        <div className="mg-guide mg-guide--grid">
          {Array.from({ length: cols }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
