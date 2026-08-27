/**
 * 組版チェック（ブラウザが要るもの）。
 *   npm run validate:layout
 *   npm run validate:layout -- --issue=issue-001 --range=1-16
 *
 * データだけでは分からない「実際に組んでみたら溢れた／はみ出した」を見る。
 * 実寸で描画した誌面から座標を測るので、PDFに出るものと同じ判定になる。
 */
import { magazineConfig } from '../src/config/magazine.config';
import { listIssues, loadIssueFromDisk } from './lib/loadIssue';
import { launchBrowser, waitForPageReady } from './lib/browser';
import { startPreviewServer } from './lib/server';

const args = process.argv.slice(2);
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const issueId = value('issue') ?? listIssues()[0];
const resolved = loadIssueFromDisk(issueId);
const [from, to] = (value('range') ?? `1-${resolved.totalPages}`).split('-').map(Number);

const C = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

const server = await startPreviewServer();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

// tsx(esbuild) は名前付き関数に __name ヘルパーを差し込む。ブラウザ側にはそれが
// 存在しないため、無害な実装を先に注入しておく（文字列で渡してトランスパイルを回避）。
await page.addInitScript('window.__name = window.__name || function (f) { return f; };');

await page.goto(`${server.origin}/?print=1&issue=${issueId}&mode=book&marks=0&from=${from}&to=${to}`, { waitUntil: 'load' });
await waitForPageReady(page);

const findings = await page.evaluate(
  ({ bleedMm, safetyMm, gutterMm }) => {
    const MM = 96 / 25.4; // CSS px / mm
    // 段の境界がちょうどノド逃げの端に接する設計なので、
    // 丸め誤差で毎回警告が出ないよう 1mm の許容を持たせる
    const TOL = 1 * MM;
    const out: { page: number; level: 'error' | 'warning'; code: string; message: string }[] = [];

    document.querySelectorAll<HTMLElement>('.mg-page').forEach((el) => {
      const pageNo = Number(el.dataset.page ?? 0);
      const isSpread = el.dataset.span === '2';
      const box = el.getBoundingClientRect();

      // --- 本文のオーバーフロー ---
      el.querySelectorAll<HTMLElement>('.mg-fit').forEach((fit) => {
        const overflowY = fit.scrollHeight - fit.clientHeight;
        const overflowX = fit.scrollWidth - fit.clientWidth;
        if (overflowY > 2) {
          out.push({
            page: pageNo,
            level: 'error',
            code: 'layout.overflow',
            message: `本文が枠から ${(overflowY / MM).toFixed(1)}mm 溢れています（${fit.className.split(' ')[0]}）`,
          });
        } else if (overflowX > 2) {
          out.push({
            page: pageNo,
            level: 'warning',
            code: 'layout.overflow-x',
            message: `横方向に ${(overflowX / MM).toFixed(1)}mm 溢れています（${fit.className.split(' ')[0]}）`,
          });
        }
      });

      // --- セーフティマージンからのはみ出し（文字のみ） ---
      const safe = {
        left: box.left + (bleedMm + safetyMm) * MM,
        right: box.right - (bleedMm + safetyMm) * MM,
        top: box.top + (bleedMm + safetyMm) * MM,
        bottom: box.bottom - (bleedMm + safetyMm) * MM,
      };
      const texts = Array.from(el.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, li, dt, dd, span, b, em, td, th'))
        .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim().length > 0)
        .filter((n) => !n.closest('.mg-guides, .mg-marks, .tpl-cover__barcode'));

      // 要素の外形ではなく、実際に文字が描かれている矩形で測る。
      // ブロック要素の box は版面いっぱいに広がるため、box で測ると
      // 左寄せの見出しがノド逃げに入っていると誤判定してしまう。
      const inkRects = (n: HTMLElement): DOMRect[] => {
        const range = document.createRange();
        range.selectNodeContents(n);
        return Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
      };

      let worstOut = 0;
      let worstNode = '';
      for (const n of texts.flatMap((n) => inkRects(n).map((r) => ({ n, r })))
        .map(({ n, r }) => ({ node: n, rect: r }))) {
        const r = n.rect;
        if (r.width === 0 || r.height === 0) continue;
        const over = Math.max(safe.left - r.left, r.right - safe.right, safe.top - r.top, r.bottom - safe.bottom);
        if (over > worstOut) {
          worstOut = over;
          worstNode = (n.node.textContent ?? '').trim().slice(0, 18);
        }
      }
      if (worstOut > TOL) {
        out.push({
          page: pageNo,
          level: worstOut > 3 * MM ? 'error' : 'warning',
          code: 'layout.safety',
          message: `文字がセーフティマージンを ${(worstOut / MM).toFixed(1)}mm 超えています（「${worstNode}…」）`,
        });
      }

      // --- ノド逃げ（見開きの中央に文字が入っていないか）---
      if (isSpread) {
        const centerL = box.left + box.width / 2 - gutterMm * MM;
        const centerR = box.left + box.width / 2 + gutterMm * MM;
        const hit = texts.find((n) => inkRects(n).some((r) => r.right > centerL + TOL && r.left < centerR - TOL));
        if (hit) {
          out.push({
            page: pageNo,
            level: 'warning',
            code: 'layout.gutter',
            message: `見開き中央のノド逃げ内に文字があります（「${(hit.textContent ?? '').trim().slice(0, 18)}…」）`,
          });
        }
      }

      // --- 空ページ ---
      const ink = el.querySelector('.mg-typearea, .mg-bleed-layer, img');
      if (!ink) out.push({ page: pageNo, level: 'error', code: 'layout.empty', message: '描画内容が見つかりません' });
    });

    return out;
  },
  {
    bleedMm: magazineConfig.format.bleed,
    safetyMm: magazineConfig.format.safety,
    gutterMm: magazineConfig.format.gutterGuard,
  },
);

await browser.close();
server.close();

const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warning');

console.log('');
console.log(`■ 組版チェック  ${issueId}  P${from}–${to}`);
console.log(`  ${errors.length ? C.red(`エラー ${errors.length}`) : C.green('エラー 0')}  ${warnings.length ? C.yellow(`警告 ${warnings.length}`) : C.gray('警告 0')}`);
for (const f of findings) {
  const color = f.level === 'error' ? C.red : C.yellow;
  console.log(`  ${color(`P${String(f.page).padStart(3, ' ')}`)} ${f.message} ${C.gray(`[${f.code}]`)}`);
}
console.log('');
process.exit(errors.length ? 1 : 0);
