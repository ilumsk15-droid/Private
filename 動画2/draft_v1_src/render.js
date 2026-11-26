const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const [,, url, out, audio, fps = '30', from = '0', to = ''] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(url); await p.waitForFunction('window.ready === true', null, { timeout: 60000 });
  const total = to ? +to : await p.evaluate('window.TOTAL');
  const F = +fps, n0 = Math.round(+from * F), n1 = Math.floor(total * F);
  const args = ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-'];
  if (audio) args.push('-ss', String(+from), '-i', audio);
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', fps);
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = n0; i < n1; i++) {
    await p.evaluate(t => window.renderAt(t), i / F);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${n1} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await b.close(); console.log('done', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
