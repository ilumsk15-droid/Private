import { useRef, useState, type ReactNode } from 'react';
import type { ImageRef } from '../schema/common';
import { api, readAsDataUrl } from '../api/client';

/**
 * 入力欄の部品。
 * 編集者がコードを読まずに誌面を作れることが目的なので、
 * ラベルは誌面上の呼び名（ノンブル・ノド・柱ではなく「ページ番号」など）に寄せ、
 * 何に使われる値なのかを hint に書けるようにしている。
 */

export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className="fld" data-wide={wide ? 'true' : undefined}>
      <span className="fld__label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      className="inp"
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className="inp inp--area"
      rows={rows}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="tgl">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/**
 * 繰り返し項目。年表・名言・事業など、誌面の「行数」がそのまま入る箱。
 * 並べ替えができることが大事で、順番が誌面の掲載順になる。
 */
export function RepeatList<T>({
  items,
  onChange,
  create,
  title,
  hint,
  render,
  summary,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  create: () => T;
  title: string;
  hint?: string;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  summary?: (item: T, index: number) => string;
}) {
  const [open, setOpen] = useState<number | null>(items.length ? 0 : null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
    setOpen(to);
  };
  return (
    <section className="rep">
      <header className="rep__head">
        <h3>
          {title} <span className="rep__count">{items.length}</span>
        </h3>
        {hint && <p className="rep__hint">{hint}</p>}
        <button className="btn btn--sm" onClick={() => { onChange([...items, create()]); setOpen(items.length); }}>
          ＋ 追加
        </button>
      </header>
      <ol className="rep__list">
        {items.map((item, i) => (
          <li key={i} className="rep__item" data-open={open === i ? 'true' : undefined}>
            <div className="rep__bar">
              <button className="rep__toggle" onClick={() => setOpen(open === i ? null : i)}>
                <span className="rep__no">{i + 1}</span>
                <span className="rep__summary">{summary?.(item, i) || '（未入力）'}</span>
              </button>
              <div className="rep__tools">
                <button title="上へ" onClick={() => move(i, i - 1)}>↑</button>
                <button title="下へ" onClick={() => move(i, i + 1)}>↓</button>
                <button
                  title="削除"
                  className="rep__del"
                  onClick={() => { onChange(items.filter((_, n) => n !== i)); setOpen(null); }}
                >
                  ×
                </button>
              </div>
            </div>
            {open === i && (
              <div className="rep__body">
                {render(item, (patch) => onChange(items.map((it, n) => (n === i ? { ...it, ...patch } : it))), i)}
              </div>
            )}
          </li>
        ))}
      </ol>
      {items.length === 0 && <p className="rep__empty">まだ項目がありません。「＋ 追加」から入れてください。</p>}
    </section>
  );
}

export function emptyImage(alt = ''): ImageRef {
  return { src: null, alt, fit: 'cover', spread: false, gutterShift: 0 };
}

/**
 * 写真1枚ぶんの入力。
 * ファイルを選ぶとサーバ側の public/images/people/<人物ID>/ に保存され、
 * 誌面データにはそのパスが入る。誌面と画像がリポジトリ内で完結する。
 */
export function ImageField({
  image,
  onChange,
  personId,
  label,
  hint,
}: {
  image: ImageRef | undefined;
  onChange: (next: ImageRef | undefined) => void;
  personId: string;
  label: string;
  hint?: string;
}) {
  const img = image ?? emptyImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const dataUrl = await readAsDataUrl(file);
      const { src } = await api.uploadImage(personId, file.name, dataUrl);
      onChange({ ...img, src, alt: img.alt || file.name.replace(/\.[a-z0-9]+$/i, '') });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="imgf">
      <div className="imgf__head">
        <span className="fld__label">
          {label}
          {hint && <em>{hint}</em>}
        </span>
        <div className="imgf__actions">
          <button className="btn btn--sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? '保存中…' : '画像を選ぶ'}
          </button>
          {img.src && (
            <button className="btn btn--sm btn--ghost" onClick={() => onChange({ ...img, src: null })}>
              外す
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }}
      />
      <div className="imgf__body">
        <div className="imgf__preview">
          {img.src ? <img src={img.src} alt="" /> : <span>未登録</span>}
        </div>
        <div className="imgf__fields">
          <Field label="パス" hint="public/ からの絶対パス">
            <TextInput value={img.src ?? ''} onChange={(v) => onChange({ ...img, src: v || null })} placeholder="/images/people/xxx/photo.jpg" />
          </Field>
          <Field label="代替テキスト" hint="どんな写真か">
            <TextInput value={img.alt} onChange={(v) => onChange({ ...img, alt: v })} />
          </Field>
          <Field label="クレジット" hint="誌面に出る撮影者表記">
            <TextInput value={img.credit ?? ''} onChange={(v) => onChange({ ...img, credit: v })} placeholder="PHOTO: 撮影者名" />
          </Field>
          <div className="imgf__focus">
            <Field label="トリミング 横%" hint="0=左端">
              <TextInput type="number" value={img.focus?.x ?? 50} onChange={(v) => onChange({ ...img, focus: { x: Number(v), y: img.focus?.y ?? 50 } })} />
            </Field>
            <Field label="トリミング 縦%" hint="0=上端">
              <TextInput type="number" value={img.focus?.y ?? 50} onChange={(v) => onChange({ ...img, focus: { x: img.focus?.x ?? 50, y: Number(v) } })} />
            </Field>
          </div>
        </div>
      </div>
      {error && <p className="imgf__error">{error}</p>}
    </div>
  );
}

/** 写真の並び（ギャラリー・取材カットなど） */
export function ImageList({
  images,
  onChange,
  personId,
  title,
  hint,
}: {
  images: ImageRef[];
  onChange: (next: ImageRef[]) => void;
  personId: string;
  title: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files: FileList) => {
    setBusy(true);
    const added: ImageRef[] = [];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await readAsDataUrl(file);
        const { src } = await api.uploadImage(personId, file.name, dataUrl);
        added.push({ ...emptyImage(file.name.replace(/\.[a-z0-9]+$/i, '')), src });
      } catch {
        /* 1枚失敗しても残りは続ける */
      }
    }
    onChange([...images, ...added]);
    setBusy(false);
  };

  return (
    <section className="rep">
      <header className="rep__head">
        <h3>
          {title} <span className="rep__count">{images.length}</span>
        </h3>
        {hint && <p className="rep__hint">{hint}</p>}
        <button className="btn btn--sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? '保存中…' : '＋ 画像を追加'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ''; }}
        />
      </header>
      <ul className="imglist">
        {images.map((img, i) => (
          <li key={i}>
            <div className="imglist__thumb">{img.src ? <img src={img.src} alt="" /> : <span>未登録</span>}</div>
            <input
              className="inp inp--sm"
              value={img.alt}
              placeholder="説明"
              onChange={(e) => onChange(images.map((x, n) => (n === i ? { ...x, alt: e.target.value } : x)))}
            />
            <div className="imglist__tools">
              <button onClick={() => { const next = [...images]; const [x] = next.splice(i, 1); next.splice(Math.max(0, i - 1), 0, x); onChange(next); }}>↑</button>
              <button onClick={() => { const next = [...images]; const [x] = next.splice(i, 1); next.splice(Math.min(images.length - 1, i + 1), 0, x); onChange(next); }}>↓</button>
              <button className="rep__del" onClick={() => onChange(images.filter((_, n) => n !== i))}>×</button>
            </div>
          </li>
        ))}
      </ul>
      {images.length === 0 && <p className="rep__empty">まだ画像がありません。</p>}
    </section>
  );
}
