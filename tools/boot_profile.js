#!/usr/bin/env node
// Boot profile (analysis only): samples the CPU while the bundled game boots in
// headless Chromium and reports where the time goes (self time by function),
// plus the time to "world ready" and to the first XR frame.
//
//   node tools/boot_profile.js [file] [vr=1]
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const file = path.resolve(process.argv[2] || path.join(root, 'tools/android/app/src/main/assets/index.html'));
const fakexr = fs.readFileSync(path.join(__dirname, 'fakexr.js'), 'utf8');
(async () => {
  let html = fs.readFileSync(file, 'utf8');
  const anchor = 'gcEB.ready=!0;';
  if (!html.includes(anchor)) throw new Error('anchor not found (use the patched asset)');
  html = html.replace(anchor, anchor + 'window.__readyAt=performance.now();');
  const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.addInitScript(fakexr);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => window.__readyAt, null, { timeout: 300000 });
  const nav = await page.evaluate(() => ({ readyAt: window.__readyAt, dcl: performance.getEntriesByType('navigation')[0] && performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, gate: document.getElementById('gateText') && document.getElementById('gateText').textContent }));
  await page.evaluate(() => window.__fakeXR.fire());
  await page.waitForFunction(() => window.__fakeXR.frames > 3, null, { timeout: 120000 }).catch(() => {});
  const firstFrameAt = await page.evaluate(() => performance.now());
  const { profile } = await cdp.send('Profiler.stop');
  // Aggregate self time per function (sampled). Also attribute by "phase" buckets.
  const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; let total = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const n = byId.get(profile.samples[i]); const d = dt[i] || 0; total += d;
    const cf = n.callFrame; const key = (cf.functionName || '(anonymous)') + ' @' + (cf.lineNumber + 1) + ':' + cf.columnNumber;
    self.set(key, (self.get(key) || 0) + d);
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
  // Inclusive time for a few named phases by walking parents.
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = (pred) => { let s = 0; for (let i = 0; i < profile.samples.length; i++) { let id = profile.samples[i]; while (id) { const n = byId.get(id); if (pred(n.callFrame)) { s += dt[i] || 0; break; } id = parent.get(id); } } return s / 1000; };
  const phases = {
    'canvas painting b() (CanvasTexture painters)': incl((cf) => cf.functionName === 'b'),
    'batching _e() (gcEB merge into draw batches)': incl((cf) => cf.functionName === '_e'),
    'geometry merge v()': incl((cf) => cf.functionName === 'v'),
    'renderer compile/render (shader compile, first draw)': incl((cf) => /^(compile|render)$/.test(cf.functionName)),
    'garbage collector': incl((cf) => cf.functionName === '(garbage collector)'),
    'script parse/compile (program)': incl((cf) => cf.functionName === '(program)'),
  };
  console.log(JSON.stringify({ file: path.relative(root, file), sampledMs: Math.round(total / 1000), domContentLoadedMs: Math.round(nav.dcl), worldReadyMs: Math.round(nav.readyAt), firstXRFrameMs: Math.round(firstFrameAt), gate: nav.gate, phasesInclusiveMs: Object.fromEntries(Object.entries(phases).map(([k, v]) => [k, Math.round(v)])) }, null, 1));
  console.log('top self time:'); console.log(top.join('\n'));
  await browser.close().catch(() => {}); server.close(); process.exit(0);
})();
