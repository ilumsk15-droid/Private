import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.MAGAZINE_PREVIEW_PORT ?? 4173);

export interface PreviewServer {
  origin: string;
  close: () => void;
}

async function isUp(origin: string) {
  try {
    const res = await fetch(`${origin}/`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * dist をローカルサーバで配信する。file:// だとフォントとモジュール読み込みが落ちる。
 * すでに `npm run serve` が動いていればそれを再利用する（CI や、プロセスの
 * 起動が制限された環境でも動くように）。
 */
export async function startPreviewServer(): Promise<PreviewServer> {
  const existing = `http://localhost:${PORT}`;
  if (await isUp(existing)) {
    return { origin: existing, close: () => {} };
  }
  if (!existsSync(resolve(process.cwd(), 'dist/index.html'))) {
    throw new Error('dist/ がありません。先に `npm run build` を実行してください。');
  }
  const child: ChildProcess = spawn(
    process.execPath,
    [resolve(process.cwd(), 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const origin = `http://localhost:${PORT}`;
  await new Promise<void>((res, rej) => {
    const timer = setTimeout(() => rej(new Error('プレビューサーバの起動がタイムアウトしました')), 30_000);
    const onData = (d: Buffer) => {
      if (d.toString().includes(String(PORT))) {
        clearTimeout(timer);
        res();
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', (code) => rej(new Error(`プレビューサーバが終了しました (code ${code})`)));
  });

  return { origin, close: () => child.kill() };
}
