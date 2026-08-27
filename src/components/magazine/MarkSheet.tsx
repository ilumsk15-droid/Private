import type { ReactNode } from 'react';

/**
 * トンボ付き台紙。仕上がり枠の外側にコーナートンボとセンタートンボを引く。
 * PDF出力で --marks を付けたときと、印刷プレビューで使う。
 * 台紙のサイズが PDF のページサイズになる（仕上がり＋塗り足し＋トンボ余白）。
 */
export function MarkSheet({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  if (!enabled) return <>{children}</>;
  return (
    <div className="mg-marksheet">
      <div className="mg-marksheet__inner">{children}</div>
      <div className="mg-marks" aria-hidden>
        <span className="mg-mark mg-mark--tl" />
        <span className="mg-mark mg-mark--tr" />
        <span className="mg-mark mg-mark--bl" />
        <span className="mg-mark mg-mark--br" />
        <span className="mg-mark mg-mark--ct" />
        <span className="mg-mark mg-mark--cb" />
        <span className="mg-mark mg-mark--cl" />
        <span className="mg-mark mg-mark--cr" />
      </div>
    </div>
  );
}
