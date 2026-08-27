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
  const read = (rel: string) => {
    const file = resolve(dir, rel.replace(/^\.?\//, ''));
    return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  };
  const raw = read('issue.json');
  if (!raw) throw new Error(`issue.json が見つかりません: content/${issueId}/issue.json`);
  return buildIssue(JSON.parse(raw), read, magazineConfig);
}
