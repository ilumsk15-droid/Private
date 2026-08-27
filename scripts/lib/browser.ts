import { existsSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';

/**
 * 環境に置かれた Chromium を優先して使う。
 * Playwright が同梱ブラウザを再取得しにいくと、オフライン環境で失敗するため。
 */
export async function launchBrowser(): Promise<Browser> {
  const candidates = [process.env.MAGAZINE_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean) as string[];
  const executablePath = candidates.find((p) => existsSync(p));
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** 誌面が完全に描き終わるまで待つ。ここを省くと文字化けや空白のPDFが出る */
export async function waitForPageReady(page: Page, timeout = 120_000) {
  await page.waitForSelector('#print-ready', { state: 'attached', timeout });
  await page.evaluate(async () => {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    const images = Array.from(document.images);
    await Promise.all(
      images.map((img) =>
        img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }),
      ),
    );
  });
  // レイアウト確定後の最終フレームを待つ
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
}
