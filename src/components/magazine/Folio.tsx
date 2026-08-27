import { magazineConfig } from '../../config/magazine.config';

/**
 * ノンブルと柱。位置・書式は設定ファイルの folio セクションが決めるので、
 * どのテンプレートでも見た目が揃う。
 */
export function Folio({
  pageNumber,
  runningHead,
  side,
}: {
  pageNumber: number;
  runningHead?: string;
  side: 'left' | 'right';
}) {
  return (
    <div className={`mg-folio mg-folio--${side}`}>
      <span className="mg-folio__number">{String(pageNumber).padStart(3, '0')}</span>
      {magazineConfig.folio.showRunningHead && runningHead && (
        <span className="mg-folio__head">{runningHead}</span>
      )}
    </div>
  );
}
