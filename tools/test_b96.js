#!/usr/bin/env node
// B96, memory after the headset sleeps (must fix; 4.0.34). The author's log b42c9cfb: after 35 s with the headset off
// the headset ran out of memory within seconds of the return and the game froze; at the session's end the browser held
// 315 compositor swapchains, re-made for the loader's destroyed layers (B75, 4.0.27, now reverted). Checked:
//   1. the loader is never released (no layer destroyed, no context lost) through three hides and returns;
//   2. the native census (the live GL object counts of every context and the XR layers made and destroyed) is logged
//      on each visibility change and 5 s after each return, and shows no growth across the three returns;
//   3. the log's black box: once the APK's log server has answered, lines whose sending fails are kept (the last 150)
//      and sent at the next boot marked "unsent from the last run", then cleared; with no server ever answering (the
//      standalone and ordinal copies) nothing is kept.
//   No page errors.
//
//   node tools/test_b96.js [file]
const path = require('path');
const fs = require('fs');
const http = require('http');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'android/app/src/main/assets/index.html');

(async () => {
  const { expect, failures } = reporter();
  // 1-2. three hides and returns in VR
  const g = await boot({ file, vr: true, fastSim: true });
  const r = await g.page.evaluate(async () => {
    const X = window.__gtXR, wait = (ms) => new Promise((res) => setTimeout(res, ms)), logs = [];
    const L0 = window.__gtLog; window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    const real = X.session.__real || X.session; await wait(1500);
    for (let k = 0; k < 3; k++) { real.setVisibility('visible-blurred'); real.setVisibility('hidden'); await wait(1500); real.setVisibility('visible-blurred'); real.setVisibility('visible'); await wait(6500); }
    const census = logs.filter((l) => /^native census/.test(l));
    return { census: census.length, after: census.filter((l) => /5 s after the return/.test(l)).length, growth: census.filter((l) => /GROWTH/.test(l)), released: logs.filter((l) => /loader released/.test(l)).length,
      destroyed: X.nat ? X.nat.xr.destroyed : null, last: census.slice(-1)[0] || null };
  });
  await g.close();
  expect('1. the loader is never released through three hides and returns (no layer destroyed)', r.released === 0 && r.destroyed === 0, JSON.stringify({ released: r.released, destroyed: r.destroyed }));
  expect('2. the native census is logged on each visibility change and 5 s after each return, with no growth', r.census >= 12 && r.after === 3 && r.growth.length === 0, JSON.stringify({ census: r.census, after: r.after, growth: r.growth.slice(0, 2), last: r.last }));
  // 3. the black box, on the entry script alone (served by a small server whose /log can be turned off)
  const html = fs.readFileSync(file, 'utf8'), s0 = (html.match(/<script[^>]*>([\s\S]*?)<\/script>/) || [])[1] || '';
  const { chromium } = require('playwright');
  let alive = true; const got = [];
  const srv = http.createServer((q, res) => { if (q.url.startsWith('/log?')) { if (!alive) { q.socket.destroy(); return; } got.push(decodeURIComponent(q.url.slice(7))); res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><script>' + s0 + '</script>'); });
  await new Promise((res) => srv.listen(0, res));
  const url = 'http://127.0.0.1:' + srv.address().port + '/', b = await chromium.launch(), p = await (await b.newContext()).newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(url); await p.evaluate(() => __gtLog('server answers')); await p.waitForTimeout(800);
  alive = false; await p.evaluate(() => { for (let i = 0; i < 160; i++) __gtLog('line ' + i); }); await p.waitForTimeout(2500);
  const stored = await p.evaluate(() => { try { const v = localStorage.getItem('gtBB'); return v ? JSON.parse(v).length : 0; } catch (e) { return -1; } });
  alive = true; await p.reload();
  const nFlushed = () => got.filter((m) => /unsent from the last run: \d+ms line /.test(m)).length;
  { const t0 = Date.now(); while (nFlushed() < 150 && Date.now() - t0 < 30000) await p.waitForTimeout(250); }   // counted, not timed
  const flushed = nFlushed(), cleared = await p.evaluate(() => localStorage.getItem('gtBB'));
  // no server ever answering: nothing kept
  const p2 = await (await b.newContext()).newPage(); alive = false; await p2.goto(url); await p2.evaluate(() => { for (let i = 0; i < 20; i++) __gtLog('standalone ' + i); }); await p2.waitForTimeout(2000);
  const stored2 = await p2.evaluate(() => localStorage.getItem('gtBB'));
  await b.close(); srv.close();
  expect('3. the black box keeps the last 150 unsent lines and sends them at the next boot, then clears them', stored === 150 && flushed === 150 && cleared === null, JSON.stringify({ stored, flushed, cleared }));
  expect('3. with no log server ever answering, nothing is kept', stored2 === null, String(stored2));
  const other = g.errors.concat(errs);
  expect('no page errors', other.length === 0, other.slice(0, 3).join(' | '));
  console.log(failures.length ? `B96 TEST FAILED (${failures.length})` : 'B96 TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('B96 TEST ERROR', e); process.exit(1); });
