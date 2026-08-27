import { magazineConfig } from '../../config/magazine.config';
import { mmToPx } from '../../config/magazine.config';
import type { ImageRef } from '../../schema/common';

/**
 * 写真の唯一の入口。
 * - 未登録（src: null）はダミー写真を出さず、明確なプレースホルダーを出す
 * - focus で object-position 相当のトリミング位置を指定
 * - gutterShift で綴じ側に寄った顔を外へ逃がす
 * - クレジット／キャプションの書式は設定ファイル準拠で統一
 */
export function ImageFrame({
  image,
  fill = false,
  className = '',
  creditPlacement = 'below',
  style,
}: {
  image?: ImageRef | null;
  fill?: boolean;
  className?: string;
  /** クレジットの置き場所。写真の上に重ねる場合は overlay */
  creditPlacement?: 'below' | 'overlay' | 'none';
  style?: React.CSSProperties;
}) {
  const cfg = magazineConfig;
  const cls = `mg-figure ${fill ? 'mg-figure--fill' : ''} ${className}`.trim();

  if (!image || !image.src) {
    const required = image?.placedWidthMm
      ? `${mmToPx(image.placedWidthMm)}px 以上 / ${cfg.image.minDpi}dpi`
      : `${cfg.image.minDpi}dpi 相当`;
    return (
      <figure className={cls} style={style}>
        <div className="mg-placeholder">
          <span className="mg-placeholder__label">Image not set</span>
          {image?.alt && <span className="mg-placeholder__meta">{image.alt}</span>}
          {cfg.image.placeholder.showRequiredPx && <span className="mg-placeholder__meta">{required}</span>}
        </div>
      </figure>
    );
  }

  const focus = image.focus ?? { x: 50, y: 50 };
  const shift = image.gutterShift ?? 0;

  return (
    <figure className={cls} style={style}>
      <img
        className="mg-figure__img"
        src={image.src}
        alt={image.alt}
        data-fit={image.fit ?? 'cover'}
        data-spread={image.spread ? 'true' : 'false'}
        style={{
          objectPosition: `${focus.x}% ${focus.y}%`,
          ...(shift ? { transform: `translateX(${shift}mm)` } : null),
        }}
      />
      {creditPlacement === 'overlay' && image.credit && (
        <figcaption className="mg-credit mg-credit--overlay">{image.credit}</figcaption>
      )}
      {creditPlacement === 'below' && (image.caption || image.credit) && (
        <figcaption className="mg-caption">
          {image.caption && (
            <>
              <span className="mg-caption__marker">{cfg.caption.marker}</span>
              {image.caption}
            </>
          )}
          {image.credit && <span className="mg-credit"> {image.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/** 写真クレジット単体（見開き写真など、図と離れた位置に置きたいとき） */
export function PhotoCredit({ credit, className = '' }: { credit?: string; className?: string }) {
  if (!credit) return null;
  return <span className={`mg-credit ${className}`.trim()}>{credit}</span>;
}
