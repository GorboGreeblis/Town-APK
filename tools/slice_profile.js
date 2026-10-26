// Loading profile by slice (analysis only, T12): samples the CPU while the
// bundled game boots and attributes the samples to the boot slices (the
// `__gtY(label)` yields), so the hot functions of a given slice (say the five
// heavy townsfolk at ~0.5 s each on the headset) can be read off. JS CPU time
// headless is comparable in shape to the Quest's (the GPU-bound slices, first
// draw and the shader compile, are not).
//
//   node tools/slice_profile.js [file] [--top N] [--slice label]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
const top = +(process.argv.find((a, i) => process.argv[i - 1] === '--top') || 8);
const only = process.argv.find((a, i) => process.argv[i - 1] === '--slice') || null;
const UA = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36';

(async () => {
  const http = require('http');
  const body = fs.readFileSync(file);
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/log?')) { res.writeHead(204); return res.end(); }
    if (req.url.startsWith('/tex/')) {
      const name = path.basename(req.url.split('?')[0]); const f = path.join(root, 'tools/android/app/src/main/assets/tex', name);
      if (!/^[\w.-]+$/.test(name) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      const data = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': name.endsWith('.json') ? 'application/json' : 'image/png' }); return res.end(data);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(body);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.addInitScript(fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8'));
  // Record each slice boundary in page time (performance.now()).
  await page.addInitScript(() => {
    window.__sliceMarks = [];
    let lastLabel = 'start';
    const wrap = () => { const y = window.__gtY; if (!y || y.__wrapped) return; const w = function (l) { window.__sliceMarks.push([lastLabel, performance.now()]); lastLabel = l || lastLabel; return y.apply(this, arguments); }; w.__wrapped = true; window.__gtY = w; };
    const iv = setInterval(() => { wrap(); if (window.__gtY && window.__gtY.__wrapped) clearInterval(iv); }, 1);
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: 'load' });
  // Align the profiler clock with performance.now(): profile.startTime is in the same monotonic base (microseconds).
  await page.waitForFunction(() => window.__gtXR && window.__gtXR.booted === true, null, { timeout: 300000 });
  const marks = await page.evaluate(() => { window.__sliceMarks.push(['end', performance.now()]); return window.__sliceMarks; });
  const navStart = await page.evaluate(() => performance.timeOrigin);
  const { profile } = await cdp.send('Profiler.stop');
  await browser.close(); srv.close();
  // Profile sample times: startTime + cumulative deltas (microseconds, monotonic). performance.now() is ms since timeOrigin
  // (also monotonic). Both use the same TimeTicks base in Chromium, so sample time in page ms = (t - timeOrigin*1000) / 1000.
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const slices = []; for (let i = 0; i + 1 < marks.length; i++) slices.push({ label: marks[i + 1][0] === 'end' ? marks[i][0] : marks[i][0], from: marks[i][1], to: marks[i + 1][1], ms: marks[i + 1][1] - marks[i][1], self: new Map(), busy: 0 });
  // Slice labels: the mark records the label of the slice that just ended.
  for (let i = 0; i + 1 < marks.length; i++) slices[i].label = marks[i + 1][0] === 'end' ? marks[i][0] + ' (last)' : marks[i + 1][0] === marks[i][0] ? marks[i][0] : marks[i][0];
  let t = profile.startTime; const toPage = (us) => us / 1000 - navStart;
  let unaligned = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i] || 0; const pm = toPage(t); const d = (profile.timeDeltas[i] || 0) / 1000;
    const sl = slices.find((s) => pm >= s.from && pm < s.to); if (!sl) { unaligned += d; continue; }
    const f = byId.get(profile.samples[i]).callFrame; const k = (f.functionName || '(anonymous)') + ' @' + f.lineNumber + ':' + f.columnNumber;
    sl.self.set(k, (sl.self.get(k) || 0) + d); sl.busy += d;
  }
  console.log(`boot ${((Date.now() - t0) / 1000).toFixed(1)} s; ${slices.length} slices; ${Math.round(unaligned)} ms of samples outside the boot window`);
  for (const s of slices) {
    if (only && !s.label.startsWith(only)) continue;
    console.log(`\n[${s.label}] ${Math.round(s.ms)} ms (cpu ${Math.round(s.busy)} ms)`);
    [...s.self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([k, v]) => console.log(`   ${String(Math.round(v)).padStart(6)} ms  ${k}`));
  }
})().catch((e) => { console.error(e); process.exit(1); });
