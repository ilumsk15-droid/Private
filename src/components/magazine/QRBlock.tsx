import { useMemo } from 'react';
import QRCode from 'qrcode';
import { magazineConfig } from '../../config/magazine.config';
import type { QRRef } from '../../schema/common';

/**
 * QRは同期的にモジュール行列から SVG を組み立てる。
 * 非同期APIを使うと PDF 出力時に「まだ描けていない」状態でページを
 * 掴んでしまう事故が起きるため。
 * URL 未設定なら何も描かない（＝空の白枠が誌面に残らない）。
 */
export function QRBlock({ qr, className = '' }: { qr?: QRRef | null; className?: string }) {
  const cfg = magazineConfig;
  const path = useMemo(() => (qr?.url ? buildPath(qr.url, cfg.qr.errorCorrection) : null), [qr?.url, cfg.qr.errorCorrection]);
  if (!qr?.url || !path) return null;

  const size = qr.size ?? cfg.qr.size;
  return (
    <div className={`mg-qr ${className}`.trim()} style={{ ['--qr-size' as string]: `${size}mm` }}>
      <a className="mg-qr__code" href={qr.url} target="_blank" rel="noreferrer">
        <svg viewBox={`0 0 ${path.count} ${path.count}`} shapeRendering="crispEdges" role="img" aria-label={qr.label ?? 'QR コード'}>
          <rect width={path.count} height={path.count} fill="#fff" />
          <path d={path.d} fill="#000" />
        </svg>
      </a>
      {qr.label && <span className="mg-qr__label">{qr.label}</span>}
      {qr.note && <span className="mg-qr__note">{qr.note}</span>}
    </div>
  );
}

function buildPath(text: string, ec: 'L' | 'M' | 'Q' | 'H') {
  const qr = QRCode.create(text, { errorCorrectionLevel: ec });
  const count = qr.modules.size;
  const data = qr.modules.data;
  let d = '';
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (data[y * count + x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { d, count };
}
