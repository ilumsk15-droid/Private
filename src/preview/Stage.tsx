import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 誌面は mm 実寸で組んであるので、画面表示では中身を触らずに拡大縮小だけする。
 * こうしておくと「画面で見たもの」と「PDFに出るもの」がずれない。
 */
export function Stage({
  children,
  zoom,
  contentKey,
}: {
  children: ReactNode;
  zoom: 'fit' | 'actual';
  contentKey: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBox({ w: rect.width / scale, h: rect.height / scale });
    // scale は依存に入れない：測り直しの無限ループを避けるため
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  useEffect(() => {
    const measure = () => {
      const o = outer.current;
      if (!o || !box.w || !box.h) return;
      if (zoom === 'actual') return setScale(1);
      const pad = 48;
      setScale(Math.min((o.clientWidth - pad) / box.w, (o.clientHeight - pad) / box.h, 1.6));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [zoom, box]);

  return (
    <div className="stage" ref={outer}>
      <div
        className="stage__scaler"
        style={{
          transform: `scale(${zoom === 'actual' ? 1 : scale})`,
          width: box.w || undefined,
          height: box.h || undefined,
        }}
      >
        <div ref={inner} className="stage__content">
          {children}
        </div>
      </div>
    </div>
  );
}
