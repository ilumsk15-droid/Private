import { magazineConfig } from '../config/magazine.config';
import { personSchema, type Person } from '../schema/person';
import { buildIssue, type FileReader, type ResolveIssue } from './resolve';

/**
 * content/ をアプリへ供給する唯一の窓口。
 *
 * 供給元は2つある。
 *  1) ビルド時に取り込んだファイル（import.meta.glob）— サーバが無くても動く
 *  2) 開発サーバ/プレビューサーバの /api/content — アプリから保存した内容が即反映される
 *
 * アプリで人物や号を編集して保存すると 2) が新しくなるので、保存後に refresh() を
 * 呼べば、リロードせずに誌面プレビューが更新される。
 */

const bundled = import.meta.glob('/content/**/*.{json,md}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** キーを content/ からの相対パスに正規化する（例: "issue-001/issue.json"） */
function normalize(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[k.replace(/^\/content\//, '')] = v;
  return out;
}

let files: Record<string, string> = normalize(bundled);
let version = 0;
let apiAvailable: boolean | null = null;

const listeners = new Set<() => void>();
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const contentVersion = () => version;

/** サーバ側の content/ を読み直す。編集を保存したあとに呼ぶ */
export async function refreshContent(): Promise<boolean> {
  try {
    const res = await fetch('/api/content', { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    files = (await res.json()) as Record<string, string>;
    apiAvailable = true;
  } catch {
    apiAvailable = false;
    return false;
  }
  version += 1;
  listeners.forEach((fn) => fn());
  return true;
}

/** 保存APIが使えるか（使えない場合、アプリは閲覧専用になる） */
export const isApiAvailable = () => apiAvailable === true;

/**
 * $ref の解決規則:
 *   "feature/interview.md"  → その号のフォルダ内
 *   "@people/xxx.md"        → content/ 直下（号をまたいで共有する原稿）
 */
function readerFor(issueId: string): FileReader {
  return (relative) => {
    const path = relative.startsWith('@')
      ? relative.slice(1)
      : `${issueId}/${relative.replace(/^\.?\//, '')}`;
    return files[path];
  };
}

export function listIssueIds(): string[] {
  return Object.keys(files)
    .map((p) => /^([^/]+)\/issue\.json$/.exec(p)?.[1])
    .filter((v): v is string => Boolean(v) && v !== 'people')
    .sort();
}

export function loadIssue(issueId: string): ResolveIssue {
  const read = readerFor(issueId);
  const raw = read('issue.json');
  if (!raw) throw new Error(`issue.json が見つかりません: content/${issueId}/issue.json`);
  return buildIssue(JSON.parse(raw), read, magazineConfig);
}

export function listPersonIds(): string[] {
  return Object.keys(files)
    .map((p) => /^people\/([^/]+)\.json$/.exec(p)?.[1])
    .filter((v): v is string => Boolean(v))
    .sort();
}

export function loadPerson(id: string): Person {
  const raw = files[`people/${id}.json`];
  if (!raw) throw new Error(`人物データが見つかりません: content/people/${id}.json`);
  return personSchema.parse(JSON.parse(raw));
}

/** 号の来歴（どの人物・レシピから生成したか） */
export function loadIssueSource(issueId: string): { personId: string; recipeId: string; generatedAt: string } | null {
  const raw = files[`${issueId}/source.json`];
  return raw ? JSON.parse(raw) : null;
}

/** 画像の存在確認（ブラウザ側の簡易チェック。解像度は npm run validate 側で見る） */
const bundledImages = import.meta.glob('/public/images/**/*.{svg,png,jpg,jpeg,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let uploadedImages = new Set<string>();
export function noteUploadedImage(src: string) {
  uploadedImages.add(src);
}
export function setKnownImages(list: string[]) {
  uploadedImages = new Set(list);
}
export function assetExists(src: string): boolean {
  const key = `/public${src.startsWith('/') ? src : `/${src}`}`;
  return key in bundledImages || uploadedImages.has(src);
}
