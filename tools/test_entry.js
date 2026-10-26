#!/usr/bin/env node
/**
 * Headless-Chromium test of the VR-entry fix.
 *
 * Serves a game HTML file from a loopback HTTP server (same origin shape as the
 * APK), loads it with a Meta Quest user agent and a fake `navigator.xr`, then
 * checks when the game asks for an immersive session:
 *
 *   early  - the browser grants the session before the game scripts run
 *            (what Meta's immersive app mode does). Expect exactly one
 *            requestSession, made inside the grant handler, and the gate text
 *            "Entering VR..." once the world has built.
 *   late   - the grant arrives after the world is ready. Expect one request.
 *   none   - no grant. Expect "Press A to Continue." and no request until a
 *            click, then exactly one request (the original behaviour).
 *
 * Usage: node tools/test_entry.js [file.html] [scenario|all]
 *   default file: tools/android/app/src/main/assets/index.html
 * Exit code 1 if any expectation fails. Run against tools/uncompressed.html to
 * see the original drop the early grant.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.resolve(process.argv[2] || path.join(root, 'tools/android/app/src/main/assets/index.html'));
const which = process.argv[3] || 'all';
const html = fs.readFileSync(file);
const BOOT_TIMEOUT_MS = 240000;

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.url.split('?')[0] === '/' || req.url.startsWith('/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length });
        res.end(html);
      } else { res.writeHead(404); res.end(); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Installed before any page script. `scenario` decides when the fake grant fires.
const fakeXR = (scenario) => {
  const calls = [];
  const listeners = {};
  let firedEarly = false;
  const xr = {
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
      if (type === 'sessiongranted' && scenario === 'early' && !firedEarly) {
        firedEarly = true;              // grant arrives as soon as anyone listens
        fn(new Event('sessiongranted'));
      }
    },
    removeEventListener() {},
    isSessionSupported: async () => true,
    requestSession(mode, opts) {
      const gate = document.getElementById('gateText');
      calls.push({ mode, opts, t: Math.round(performance.now()), gate: gate ? gate.textContent : null,
                   readyFlag: !!(window.__gtXR && window.__gtXR.enter) });
      return new Promise(() => {});   // never resolves: we only test the wiring
    },
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach((fn) => fn(ev)); return true; },
  };
  Object.defineProperty(navigator, 'xr', { value: xr, configurable: true });
  window.__xrTest = { calls, listeners, fire: () => xr.dispatchEvent(new Event('sessiongranted')) };
};

async function run(scenario, srvUrl, browser) {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(fakeXR, scenario);
  const t0 = Date.now();
  await page.goto(srvUrl, { waitUntil: 'load', timeout: BOOT_TIMEOUT_MS });
  // Wait for the world to finish building: the gate leaves "Loading...".
  await page.waitForFunction(() => {
    const g = document.getElementById('gateText');
    return g && g.textContent && g.textContent !== 'Loading...';
  }, null, { timeout: BOOT_TIMEOUT_MS }).catch(() => {});
  const bootMs = Date.now() - t0;
  const state = async () => page.evaluate(() => ({
    gate: (document.getElementById('gateText') || {}).textContent,
    gateOn: (document.getElementById('gate') || { className: '' }).className.includes('on'),
    calls: window.__xrTest.calls,
    gtXR: window.__gtXR ? { granted: window.__gtXR.granted, pending: !!window.__gtXR.pending, enter: !!window.__gtXR.enter, taken: !!window.__gtXR.taken, ready: !!window.__gtXR.ready } : null,
  }));

  const failures = [];
  const expect = (what, ok) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures.push(what); };
  let s = await state();
  console.log(`[${scenario}] world built in ${(bootMs / 1000).toFixed(1)}s; gate="${s.gate}" calls=${s.calls.length}` +
              (s.gtXR ? ` __gtXR=${JSON.stringify(s.gtXR)}` : ' (no __gtXR: original file)'));
  // New design (3.15.7): on a Quest UA the head script requests the session at
  // page start, parks it, draws the loading screen into it, and the game takes
  // it over at the end of the (now sliced) boot. A grant never adds a request.
  // The sliced boot tail (shader slices, warm-up, game loop) runs after the gate
  // leaves "Loading..."; wait for the game to take the parked session.
  await page.waitForFunction(() => window.__gtXR && window.__gtXR.taken, null, { timeout: 120000 }).catch(() => {});
  s = await state();
  const fatal = errors.filter((e) => !/GPU|WebGL|GL_|SwiftShader|gpu/i.test(e));
  const first = s.calls[0];
  expect('requestSession called exactly once, at page start (before the world was ready)', s.calls.length === 1 && !first.readyFlag);
  expect('immersive-vr with local-floor/bounded-floor', !!first && first.mode === 'immersive-vr' &&
         JSON.stringify(first.opts.optionalFeatures) === JSON.stringify(['local-floor', 'bounded-floor']));
  expect('world ready flag set for the head script', s.gtXR && s.gtXR.ready);
  expect('game took the parked session over at the end of the boot', s.gtXR && s.gtXR.taken);
  expect('gate left "Loading..." (the rAF loop rewrites the gate text each frame while the fake session never resolves)', s.gate !== 'Loading...');
  if (scenario === 'early') {
    await new Promise((r) => setTimeout(r, 1500)); s = await state();
    expect('still exactly one request 1.5s after boot (early grant did not add one)', s.calls.length === 1);
  } else if (scenario === 'late') {
    await page.evaluate(() => window.__xrTest.fire());
    await new Promise((r) => setTimeout(r, 500)); s = await state();
    expect('grant after boot adds no request (session already taken)', s.calls.length === 1 && s.gtXR.granted);
  } else if (scenario === 'none') {
    await page.mouse.click(10, 10);
    await new Promise((r) => setTimeout(r, 500)); s = await state();
    expect('click after automatic entry adds no request', s.calls.length === 1);
  }
  expect(`no uncaught page errors (${errors.length} console errors, ${fatal.length} non-GPU)`, fatal.length === 0);
  if (fatal.length) console.log('    ' + fatal.slice(0, 5).join('\n    '));
  await ctx.close();
  return failures;
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  console.log(`file: ${file}\nserving at ${url}`);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const scenarios = which === 'all' ? ['early', 'late', 'none'] : [which];
  let failed = 0;
  for (const sc of scenarios) {
    try { failed += (await run(sc, url, browser)).length; }
    catch (e) { console.log(`  FAIL  [${sc}] ${e.message}`); failed++; }
  }
  await browser.close();
  srv.close();
  console.log(failed ? `ENTRY TEST FAILED (${failed})` : 'ENTRY TEST PASSED');
  process.exit(failed ? 1 : 0);
})();
