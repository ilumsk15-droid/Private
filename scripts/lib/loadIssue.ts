import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { magazineConfig } from '../../src/config/magazine.config';
import { buildIssue, type ResolveIssue } from '../../src/content/resolve';

const CONTENT_DIR = resolve(process.cwd(), 'content');

export function listIssues(): string[] {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(CONTENT_DIR, d.name, 'issue.json')))
    .map((d) => d.name)
    .sort();
}

/** Node 側のロード。ブラウザ側と同じ resolve/validate を通すので結果が一致する */
export function loadIssueFromDisk(issueId: string): ResolveIssue {
  const dir = resolve(CONTENT_DIR, issueId);
  // "@..." は content/ 直下からの参照（号をまたいで共有する原稿）。
  // それ以外はその号のフォルダ内。ブラウザ側の contentStore と同じ規則。
  const read = (rel: string) => {
    const file = rel.startsWith('@')
      ? resolve(CONTENT_DIR, rel.slice(1))
      : resolve(dir, rel.replace(/^\.?\//, ''));
    return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  };
  const raw = read('issue.json');
  if (!raw) throw new Error(`issue.json が見つかりません: content/${issueId}/issue.json`);
  return buildIssue(JSON.parse(raw), read, magazineConfig);
}
