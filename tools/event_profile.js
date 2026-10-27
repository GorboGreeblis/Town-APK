// Garden Event CPU profile (report, T12): samples the main thread while the Event runs and lists the
// functions by self time, the way slice_profile.js does for the boot. JS time here is roughly a third of
// the Quest's; a frame budget of 13.9 ms at 72 Hz means about 4 ms of JS per frame headless.
//
//   node tools/event_profile.js [file] [--seconds 20] [--top 25]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
const seconds = +(process.argv.find((a, i) => process.argv[i - 1] === '--seconds') || 20);
const top = +(process.argv.find((a, i) => process.argv[i - 1] === '--top') || 25);
const { hooked } = require('./lib/harness');
const UA = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36';
(async () => {
  const http = require('http'); const body = hooked(file);
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/log?')) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/tex/')) { const name = path.basename(req.url.split('?')[0]); const f = path.join(root, 'tools/android/app/src/main/assets/tex', name); if (!/^[\w.-]+$/.test(name) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': name.endsWith('.json') ? 'application/json' : 'image/png' }); return res.end(fs.readFileSync(f)); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(body);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.addInitScript(fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8'));
  await page.addInitScript(() => { window.__fakeXR.grantAt = 'late'; });
  await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dbgReady === true, null, { timeout: 300000 });
  // enter VR like the harness does
  await page.evaluate(() => { try { window.__fakeXR.sessions[0] || window.__fakeXR.fire && window.__fakeXR.fire(); } catch (e) {} });
  await page.waitForFunction(() => window.__dbg && window.__dbg.we && window.__dbg.we.presenting, null, { timeout: 120000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  const cdp = await ctx.newCDPSession(page);
  const profileFor = async (label, ms) => {
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
    const f0 = await page.evaluate(() => window.__fakeXR.frames);
    await new Promise((r) => setTimeout(r, ms));
    const f1 = await page.evaluate(() => window.__fakeXR.frames);
    const { profile } = await cdp.send('Profiler.stop'); await cdp.send('Profiler.disable');
    const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map(); let total = 0;
    for (let i = 0; i < profile.samples.length; i++) { const d = (profile.timeDeltas[i] || 0) / 1000; const f = byId.get(profile.samples[i]).callFrame; const k = (f.functionName || '(anonymous)') + ' @' + f.lineNumber + ':' + f.columnNumber; self.set(k, (self.get(k) || 0) + d); total += d; }
    const frames = f1 - f0;
    console.log(`\n[${label}] ${ms} ms wall, ${Math.round(total)} ms sampled, ${frames} XR frames (${(total / Math.max(1, frames)).toFixed(1)} ms JS per frame)`);
    [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([k, v]) => console.log(`   ${String(Math.round(v)).padStart(6)} ms  ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`));
  };
  await profileFor('before the Event', 8000);
  const started = await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); return D.me.active;
  });
  if (!started) { console.log('event did not start'); await browser.close(); srv.close(); process.exit(1); }
  await profileFor('Event, first ' + seconds + ' s', seconds * 1000);
  await profileFor('Event, next ' + seconds + ' s', seconds * 1000);
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
