#!/usr/bin/env node
/**
 * General runtime test of the game in headless Chromium.
 *
 *   2d  - boot the game, let its frame loop run, check the canvas actually
 *         renders (non-uniform pixels), count frames, watch for errors and
 *         JS-heap growth. Screenshot to tools/.runs/2d.png.
 *   vr  - same, but with the WebXR polyfill (tools/vendor/webxr-polyfill.js,
 *         Cardboard device) installed in place of navigator.xr and a
 *         `sessiongranted` event fired after load, exactly like Meta's
 *         immersive launch. Checks the game enters the session, hides the 2D
 *         gate, renders XR frames, survives a while, and comes back to the
 *         gate when the session ends. Screenshot to tools/.runs/vr.png.
 *
 * Usage: node tools/test_play.js [file.html] [2d|vr|all] [seconds]
 * Exit 1 on any failed expectation. Software rendering makes this slow
 * (a minute or two per scenario) and frame rates are not meaningful.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.resolve(process.argv[2] || path.join(root, 'android/app/src/main/assets/index.html'));
const which = process.argv[3] || 'all';
const RUN_S = Number(process.argv[4] || 20);
const html = fs.readFileSync(file);
const polyfill = fs.readFileSync(path.join(root, 'tools/vendor/webxr-polyfill.js'), 'utf8');
const outDir = path.join(root, 'tools', '.runs');
fs.mkdirSync(outDir, { recursive: true });
const BOOT_TIMEOUT_MS = 300000;
const UA = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36';

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

// Counters installed before any page script.
const instrument = () => {
  window.__play = { raf: 0, xrFrames: 0, session: null, errors: [] };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { window.__play.raf++; cb(t); });
};

// Replace Chromium's stub navigator.xr with the polyfill's Cardboard device and
// make it able to fire `sessiongranted`.
const installPolyfill = (src) => {
  delete Navigator.prototype.xr;
  Element.prototype.requestFullscreen = function () { return Promise.resolve(); };
  Element.prototype.requestPointerLock = function () {};
  (0, eval)(src);
  const P = window.WebXRPolyfill;
  new P({ webvr: false, cardboard: true, allowCardboardOnDesktop: true, global: window });
  const xr = navigator.xr;
  // The Cardboard device fetches a device database from the web; the test
  // server answers that URL (see page.route below) so no network is needed.
  if (!xr.addEventListener) {
    const l = {};
    xr.addEventListener = (t, f) => (l[t] = l[t] || []).push(f);
    xr.removeEventListener = () => {};
    xr.dispatchEvent = (e) => { (l[e.type] || []).forEach((f) => f(e)); return true; };
  }
  const rs = xr.requestSession.bind(xr);
  xr.requestSession = async (mode, opts) => {
    let s;
    try { s = await rs(mode, opts); }
    catch (e) { window.__play.errors.push('requestSession rejected: ' + (e && e.message || e)); throw e; }
    window.__play.session = s;
    const sraf = s.requestAnimationFrame.bind(s);
    s.requestAnimationFrame = (cb) => sraf((t, f) => { window.__play.xrFrames++; cb(t, f); });
    return s;
  };
  // The polyfill's EventTarget takes (type, event); the DOM one takes (event). Support both.
  window.__play.fireGrant = () => { const ev = new Event('sessiongranted'); try { xr.dispatchEvent('sessiongranted', ev); } catch (e) {} try { xr.dispatchEvent(ev); } catch (e) {} };
};

async function scenario(name, srvUrl, browser) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  const noise = /Failed to recalculate device parameters|Permission to access sensor|dpdb\.json|DPDB|DeviceOrientation|DeviceMotion/;
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error' && !noise.test(m.text())) errors.push('console: ' + m.text().split('\n')[0]); });
  await page.addInitScript(instrument);
  if (name === 'vr') {
    await page.addInitScript(installPolyfill, polyfill);
    // Offline stand-in for the polyfill's device-parameter database.
    await page.route('**/dpdb.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ format: 1, last_updated: '2020-01-01', devices: [{ type: 'android', rules: [{ ua: 'Nexus 5' }], dpi: 445, bw: 4, ac: 1000 }] }) }));
  }

  const failures = [];
  const expect = (what, ok, extra) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${extra ? '  [' + extra + ']' : ''}`); if (!ok) failures.push(what); };
  const state = () => page.evaluate(() => ({
    gate: (document.getElementById('gateText') || {}).textContent,
    gateOn: (document.getElementById('gate') || { className: '' }).className.includes('on'),
    raf: window.__play.raf, xrFrames: window.__play.xrFrames, hasSession: !!window.__play.session,
    sessionEnded: window.__play.session ? !!window.__play.session.ended : null,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    canvases: document.querySelectorAll('canvas').length,
  }));

  const t0 = Date.now();
  await page.goto(srvUrl, { waitUntil: 'load', timeout: BOOT_TIMEOUT_MS });
  await page.waitForFunction(() => { const g = document.getElementById('gateText'); return g && g.textContent && g.textContent !== 'Loading...'; }, null, { timeout: BOOT_TIMEOUT_MS }).catch(() => {});
  const bootS = ((Date.now() - t0) / 1000).toFixed(1);
  let s = await state();
  console.log(`[${name}] booted in ${bootS}s; gate="${s.gate}" canvases=${s.canvases} heap=${s.heapMB}MB`);
  expect('world built (gate left "Loading...")', s.gate !== 'Loading...' && s.gate !== '');
  expect('a WebGL canvas exists', s.canvases >= 1);
  expect('no page errors during boot', errors.length === 0, errors.slice(0, 3).join(' | '));

  if (name === 'vr') {
    await page.evaluate(() => window.__play.fireGrant());
    await page.waitForFunction(() => window.__play.xrFrames > 5 || window.__play.errors.length, null, { timeout: 60000 }).catch(() => {});
    const inPage = await page.evaluate(() => window.__play.errors);
    for (const e of inPage) errors.push(e);
    s = await state();
    expect('session granted -> game entered the XR session', s.hasSession);
    expect('2D gate hidden while presenting', !s.gateOn, `gate="${s.gate}"`);
    expect('XR frames are being rendered', s.xrFrames > 5, `${s.xrFrames} frames`);
  }

  const before = await state();
  await page.waitForTimeout(RUN_S * 1000);
  const after = await state();
  const frames = name === 'vr' ? after.xrFrames - before.xrFrames : after.raf - before.raf;
  console.log(`[${name}] ran ${RUN_S}s: ${frames} ${name === 'vr' ? 'XR' : 'rAF'} frames (${(frames / RUN_S).toFixed(1)} fps, software GL), heap ${before.heapMB}MB -> ${after.heapMB}MB`);
  expect(`frame loop alive over ${RUN_S}s`, frames > RUN_S * 2, `${frames} frames`);
  expect('no page errors while running', errors.length === 0, errors.slice(0, 3).join(' | '));
  if (before.heapMB != null) expect('JS heap did not grow more than 50% while running', after.heapMB <= before.heapMB * 1.5 + 8, `${before.heapMB}MB -> ${after.heapMB}MB`);

  const shot = path.join(outDir, name + '.png');
  await page.screenshot({ path: shot });
  // Non-uniform pixels prove something was drawn (a blank/black canvas is uniform).
  const png = fs.readFileSync(shot);
  const sample = new Set(); for (let i = 0; i < png.length; i += 97) sample.add(png[i]);
  expect('screenshot is not a blank frame', sample.size > 40, `${sample.size} distinct sampled bytes, saved ${path.relative(root, shot)}`);

  if (name === 'vr' && s.hasSession) {
    await page.evaluate(() => window.__play.session.end());
    await page.waitForTimeout(1500);
    s = await state();
    expect('session end -> session reports ended', s.sessionEnded === true);
    expect('session end -> 2D gate shown again', s.gateOn, `gate="${s.gate}"`);
    expect('no page errors on session end', errors.length === 0, errors.slice(0, 3).join(' | '));
  }
  await ctx.close();
  return failures;
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  console.log(`file: ${file}\nserving at ${url}`);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'] });
  const names = which === 'all' ? ['2d', 'vr'] : [which];
  let failed = 0;
  for (const n of names) {
    try { failed += (await scenario(n, url, browser)).length; }
    catch (e) { console.log(`  FAIL  [${n}] ${e.message.split('\n')[0]}`); failed++; }
  }
  await browser.close(); srv.close();
  console.log(failed ? `PLAY TEST FAILED (${failed})` : 'PLAY TEST PASSED');
  process.exit(failed ? 1 : 0);
})();
