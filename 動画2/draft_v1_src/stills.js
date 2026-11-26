const { chromium } = require('playwright');
(async () => {
  const [,, url, outdir, ...ts] = process.argv;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto(url); await p.waitForFunction('window.ready === true', null, { timeout: 60000 });
  for (const t of ts) { await p.evaluate(t => window.renderAt(+t), t); await p.screenshot({ path: `${outdir}/s_${t}.jpg`, type: 'jpeg', quality: 80 }); }
  await b.close();
})();
