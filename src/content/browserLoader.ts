import { magazineConfig } from '../config/magazine.config';
import { buildIssue, type FileReader, type ResolveIssue } from './resolve';

/**
 * content/ 以下をビルド時に丸ごと読み込む。
 * 号やページを増やしてもコードを触る必要がなく、ファイルを置けば増える。
 */
const rawFiles = import.meta.glob('/content/**/*.{json,md}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawImages = import.meta.glob('/public/images/**/*.{svg,png,jpg,jpeg,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function listIssueIds(): string[] {
  return Object.keys(rawFiles)
    .map((p) => /^\/content\/([^/]+)\/issue\.json$/.exec(p)?.[1])
    .filter((v): v is string => Boolean(v))
    .sort();
}

function readerFor(issueId: string): FileReader {
  return (relative) => rawFiles[`/content/${issueId}/${relative.replace(/^\.?\//, '')}`];
}

export function loadIssue(issueId: string): ResolveIssue {
  const read = readerFor(issueId);
  const raw = read('issue.json');
  if (!raw) throw new Error(`issue.json が見つかりません: content/${issueId}/issue.json`);
  return buildIssue(JSON.parse(raw), read, magazineConfig);
}

/** 画像の存在確認（ブラウザ側のバリデーション用。解像度は npm run validate 側で見る） */
export function assetExists(src: string): boolean {
  const key = `/public${src.startsWith('/') ? src : `/${src}`}`;
  return key in rawImages;
}
