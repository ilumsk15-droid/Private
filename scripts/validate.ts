/**
 * 入稿前チェック（データ・構造）。
 *   npm run validate                 … content/ の全号
 *   npm run validate -- issue-001    … 号を指定
 *   npm run validate -- --json       … 機械可読出力（CIで使う）
 *
 * 文字の溢れやセーフティ超過など「組んでみないと分からない」ものは
 * ブラウザが要るので validate:layout 側で見る。
 */
import { magazineConfig } from '../src/config/magazine.config';
import { summarize, validateIssue, type Diagnostic } from '../src/validation/validate';
import { listIssues, loadIssueFromDisk } from './lib/loadIssue';
import { inspectAsset } from './lib/assets';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const targets = args.filter((a) => !a.startsWith('--'));

const C = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const issues = targets.length ? targets : listIssues();
if (!issues.length) {
  console.error('content/ に号が見つかりません。');
  process.exit(1);
}

let totalErrors = 0;
const report: Record<string, Diagnostic[]> = {};

for (const id of issues) {
  const resolved = loadIssueFromDisk(id);
  const diags = validateIssue(resolved, magazineConfig, inspectAsset);
  report[id] = diags;
  const { errors, warnings, infos } = summarize(diags);
  totalErrors += errors.length;

  if (asJson) continue;

  console.log('');
  console.log(C.bold(`■ ${id}  ${resolved.issue.title}  (${resolved.totalPages}P / ${resolved.pages.length}エントリ)`));
  console.log(
    `  ${errors.length ? C.red(`エラー ${errors.length}`) : C.green('エラー 0')}` +
      `  ${warnings.length ? C.yellow(`警告 ${warnings.length}`) : C.gray('警告 0')}` +
      `  ${C.gray(`情報 ${infos.length}`)}`,
  );

  const print = (label: string, list: Diagnostic[], color: (s: string) => string) => {
    if (!list.length) return;
    console.log('');
    console.log(color(`  ── ${label} ──`));
    for (const d of list) {
      const where = d.page ? `P${String(d.page).padStart(3, ' ')}` : '  — ';
      console.log(`  ${color(where)} ${d.message}  ${C.gray(`[${d.code}]`)}`);
      if (d.hint) console.log(`        ${C.gray(`→ ${d.hint}`)}`);
    }
  };
  print('エラー（入稿不可）', errors, C.red);
  print('警告（要確認）', warnings, C.yellow);
  print('情報', infos, C.gray);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('');
  console.log(totalErrors ? C.red(`✖ エラー ${totalErrors} 件。修正してから入稿してください。`) : C.green('✔ エラーはありません。'));
}
process.exit(totalErrors ? 1 : 0);
