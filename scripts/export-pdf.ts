/**
 * PDF 出力。
 *
 *   npm run export:pdf                       … 全ページを1つのPDFに
 *   npm run export:pdf -- --marks            … トンボ付き
 *   npm run export:pdf -- --range=1-16       … ページ範囲を指定
 *   npm run export:pages                     … 1ページ＝1PDF
 *   npm run export:spreads                   … 見開き単位
 *   npm run export:pdf -- --skip-validate    … 出力前チェックを飛ばす
 *
 * 全ページを1つのHTMLに並べ @page で改ページさせているので、ページ順は
 * 構造的に保証される。塗り足しは常に含まれる（媒体ボックス＝仕上がり＋3mm）。
 * ブラウザ出力のため色はRGB。CMYK変換とPDF/X化は印刷会社側の工程になる。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { magazineConfig, mediaSize, spreadMediaSize } from '../src/config/magazine.config';
import { summarize, validateIssue } from '../src/validation/validate';
import { listIssues, loadIssueFromDisk } from './lib/loadIssue';
import { inspectAsset } from './lib/assets';
import { launchBrowser, waitForPageReady } from './lib/browser';
import { startPreviewServer } from './lib/server';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const mode = (value('mode') ?? 'book') as 'book' | 'pages' | 'spreads';
const marks = flag('marks');
const issueId = value('issue') ?? listIssues()[0];
const outDir = resolve(process.cwd(), value('out') ?? 'out');
const MARK_SPACE = 8;

if (!issueId) {
  console.error('content/ に号が見つかりません。');
  process.exit(1);
}

const resolved = loadIssueFromDisk(issueId);
const [rangeFrom, rangeTo] = (value('range') ?? `1-${resolved.totalPages}`).split('-').map(Number);

if (!flag('skip-validate')) {
  const { errors, warnings } = summarize(validateIssue(resolved, magazineConfig, inspectAsset));
  console.log(`出力前チェック: エラー ${errors.length} / 警告 ${warnings.length}`);
  if (errors.length) {
    for (const e of errors) console.error(`  ✖ ${e.page ? `P${e.page} ` : ''}${e.message}`);
    console.error('エラーがあるため出力を中止しました。--skip-validate で強制実行できます。');
    process.exit(1);
  }
}

const cfg = magazineConfig;
const single = mediaSize(cfg);
const spread = spreadMediaSize(cfg);
const pad = marks ? MARK_SPACE * 2 : 0;
const sheet = mode === 'spreads'
  ? { w: spread.width + pad, h: spread.height + pad }
  : { w: single.width + pad, h: single.height + pad };

const server = await startPreviewServer();
const browser = await launchBrowser();
const ctx = await browser.newContext();
const page = await ctx.newPage();
mkdirSync(outDir, { recursive: true });

const url = (from: number, to: number) =>
  `${server.origin}/?print=1&issue=${issueId}&mode=${mode === 'spreads' ? 'spreads' : 'book'}` +
  `&marks=${marks ? 1 : 0}&from=${from}&to=${to}`;

const pdfOptions = {
  width: `${sheet.w}mm`,
  height: `${sheet.h}mm`,
  printBackground: true,
  margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  preferCSSPageSize: true,
};

const suffix = `${marks ? '-marks' : ''}`;
try {
  if (mode === 'pages') {
    const dir = resolve(outDir, `${issueId}-pages${suffix}`);
    mkdirSync(dir, { recursive: true });
    for (let n = rangeFrom; n <= rangeTo; n++) {
      await page.goto(url(n, n), { waitUntil: 'load' });
      await waitForPageReady(page);
      const buf = await page.pdf(pdfOptions);
      writeFileSync(resolve(dir, `p${String(n).padStart(3, '0')}.pdf`), buf);
      process.stdout.write(`\r  P${n} / ${rangeTo} 出力中…`);
    }
    console.log(`\n✔ ${dir}`);
  } else {
    await page.goto(url(rangeFrom, rangeTo), { waitUntil: 'load' });
    await waitForPageReady(page);
    const buf = await page.pdf(pdfOptions);
    const name = `${issueId}-${mode}${suffix}.pdf`;
    writeFileSync(resolve(outDir, name), buf);
    console.log(`✔ ${resolve(outDir, name)}  (${sheet.w}×${sheet.h}mm / ${rangeFrom}–${rangeTo}P)`);
  }
} finally {
  await browser.close();
  server.close();
}
