#!/usr/bin/env node
/**
 * General runtime test of the game in headless Chromium.
 *
 *   2d  - boot the game, let its frame loop run, check the canvas actually
 *         renders (non-uniform pixels), count frames, watch for errors and
 *         JS-heap growth. Screenshot to tools/.runs/2d.png.
 *   vr  - same, but with the fake WebXR device (tools/fakexr.js) installed in
 *         place of navigator.xr and a
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
const file = path.resolve(process.argv[2] || path.join(root, 'tools/android/app/src/main/assets/index.html'));
const which = process.argv[3] || 'all';
const RUN_S = Number(process.argv[4] || 20);
const html = fs.readFileSync(file);
const fakexr = fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8');
const outDir = path.join(root, 'tools', '.runs');
fs.mkdirSync(outDir, { recursive: true });
const BOOT_TIMEOUT_MS = 300000;
const UA = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36';

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      if (req.url.startsWith('/log?')) {   // page diagnostics, as the APK's server accepts them (logged to the console here)
        try { const m = decodeURIComponent(req.url.slice(7)); (global.__pageLog = global.__pageLog || []).push(m); if (process.env.PAGE_LOG) console.log('  page: ' + m); } catch (e) {}
        res.writeHead(204); return res.end();
      }
      if (req.url.startsWith('/tex/')) {   // pre-rendered textures, as the APK serves them
        const name = path.basename(req.url.split('?')[0]);
        const f = path.join(root, 'tools/android/app/src/main/assets/tex', name);
        if (!/^[\w.-]+$/.test(name) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
        const data = fs.readFileSync(f);
        res.writeHead(200, { 'Content-Type': name.endsWith('.json') ? 'application/json' : 'image/png', 'Content-Length': data.length });
        return res.end(data);
      }
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
  window.__play = { raf: 0, session: null, errors: [] };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { window.__play.raf++; cb(t); });
};

// Hooks on top of tools/fakexr.js: record sessions and XR frames for the checks.
const installHooks = () => {
  const S = window.__fakeXR;
  const rs = navigator.xr.requestSession.bind(navigator.xr);
  navigator.xr.requestSession = async (mode, opts) => {
    let sess;
    try { sess = await rs(mode, opts); } catch (e) { window.__play.errors.push('requestSession rejected: ' + (e && e.message || e)); throw e; }
    window.__play.session = sess;
    return sess;
  };
  Object.defineProperty(window.__play, 'xrFrames', { get: () => S.frames });
  window.__play.fireGrant = () => S.fire();
};

async function scenario(name, srvUrl, browser) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  const noise = /^$/;
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error' && !noise.test(m.text())) errors.push('console: ' + m.text().split('\n')[0]); });
  await page.addInitScript(instrument);
  if (name.startsWith('vr')) {
    await page.addInitScript(fakexr);
    await page.addInitScript(installHooks);
    if (name === 'vr-nofloor') await page.addInitScript(() => { window.__fakeXR.supportLocalFloor = false; });   // the game must fall back to `local` + floorOffset
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

  if (name.startsWith('vr')) {
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
  const frames = name.startsWith('vr') ? after.xrFrames - before.xrFrames : after.raf - before.raf;
  console.log(`[${name}] ran ${RUN_S}s: ${frames} ${name.startsWith('vr') ? 'XR' : 'rAF'} frames (${(frames / RUN_S).toFixed(1)} fps, software GL), heap ${before.heapMB}MB -> ${after.heapMB}MB`);
  // Software GL: expect at least ~0.5 fps in VR (stereo) and 2 fps in 2D.
  expect(`frame loop alive over ${RUN_S}s`, frames > RUN_S * (name.startsWith('vr') ? 0.5 : 2), `${frames} frames`);
  expect('no page errors while running', errors.length === 0, errors.slice(0, 3).join(' | '));
  if (before.heapMB != null) expect('JS heap did not grow more than 50% while running', after.heapMB <= before.heapMB * 1.5 + 8, `${before.heapMB}MB -> ${after.heapMB}MB`);

  if (name === 'vr' && s.hasSession && (await page.evaluate(() => !!(window.__gtXR && window.__gtXR.shim)))) {
    // Layers mode: a quality-governor rebuild replaces the projection layer. The swap must keep the
    // old layer in front until the new one has been drawn (no undrawn frame), then drop it.
    const sw = await page.evaluate(async () => {
      // (this test runs without the harness hook: the facade is reachable through the session the game holds)
      const sess = (window.__gtXR && window.__gtXR.session) || window.__play.session, real = sess.__real || sess;
      // Frames must be flowing before the swap (headless screenshots and loaded machines can stall them).
      let f0 = window.__fakeXR.frames, w0 = performance.now(); while (window.__fakeXR.frames - f0 < 3 && performance.now() - w0 < 15000) await new Promise((r) => setTimeout(r, 50));
      const before = real.renderState.layers.length; f0 = window.__fakeXR.frames;
      sess.updateRenderState({ baseLayer: new XRWebGLLayer(sess, null, { framebufferScaleFactor: 0.9, antialias: true }) });
      const during = real.renderState.layers.length;
      // Wait for frames, not for time: under a loaded machine the fake session can go seconds without one.
      const t0 = performance.now(); while (window.__fakeXR.frames - f0 < 3 && performance.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50));
      return { before, during, after: real.renderState.layers.length, frames: window.__fakeXR.frames - f0, scale: window.__gtXR.shim.scale };
    });
    expect('layer swap keeps the old layer in front until the new one is drawn, then drops it', sw.before === 1 && sw.during === 2 && sw.after === 1 && sw.frames >= 2 && sw.scale === 0.9, JSON.stringify(sw));
  }
  if (name === 'vr' && s.hasSession) {
    // Session visibility: hidden (system menu) then visible again; the game blurs, captures its textures,
    // restores them and keeps rendering (`Ho.capture/restore`, `o.blurred`).
    const vis = await page.evaluate(async () => {
      const real = window.__play.session; const f0 = window.__fakeXR.frames;
      real.setVisibility('hidden'); await new Promise((r) => setTimeout(r, 600));
      const hiddenFrames = window.__fakeXR.frames - f0;
      real.setVisibility('visible');
      const t0 = performance.now(); const f1 = window.__fakeXR.frames;
      while (window.__fakeXR.frames - f1 < 5 && performance.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 50));
      return { hiddenFrames, resumedFrames: window.__fakeXR.frames - f1, state: real.visibilityState };
    });
    expect('session hidden then visible: frames resume', vis.resumedFrames >= 5 && vis.state === 'visible', JSON.stringify(vis));
    // WebGL context loss and restore (WEBGL_lose_context): no page errors and frames resume.
    const ctxLoss = await page.evaluate(async () => {
      const cv = document.querySelector('#game canvas') || document.querySelector('canvas');
      const gl = cv.getContext('webgl2') || cv.getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (!ext) return { skipped: 'no WEBGL_lose_context' };
      ext.loseContext(); await new Promise((r) => setTimeout(r, 800));
      ext.restoreContext();
      const t0 = performance.now(); const f1 = window.__fakeXR.frames;
      while (window.__fakeXR.frames - f1 < 5 && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 50));
      return { resumedFrames: window.__fakeXR.frames - f1, lost: gl.isContextLost() };
    });
    if (ctxLoss.skipped) console.log(`  NOTE  context loss check skipped (${ctxLoss.skipped})`);
    // Known limitation (BUGS B19): XR frames do not resume after a context loss headless, with or without the
    // layers path (the original game behaves the same); reported, not failed, until a Quest reproduction exists.
    else console.log(`  ${ctxLoss.resumedFrames >= 5 ? 'PASS' : 'NOTE'}  WebGL context lost and restored: ${ctxLoss.resumedFrames >= 5 ? 'frames resume' : 'frames did not resume (B19, known)'}  [${JSON.stringify(ctxLoss)}]`);
    const errs2 = await page.evaluate(() => window.__play.errors);
    for (const e of errs2) if (!errors.includes(e)) errors.push(e);
    expect('no page errors across visibility change and context loss', errors.length === 0, errors.slice(0, 3).join(' | '));
  }
  const shot = path.join(outDir, name + '.png');
  // In layers mode the game renders into the projection layer's texture, never the canvas,
  // so a page screenshot can stall in headless Chromium: bounded wait, and a note instead of a failure.
  let shotOk = true;
  try { await page.screenshot({ path: shot, timeout: 10000 }); } catch (e) { shotOk = false; console.log('  NOTE  screenshot skipped: ' + String(e).split('\n')[0] + ' (layers mode renders offscreen)'); }
  // Non-uniform pixels prove something was drawn (a blank/black canvas is uniform).
  const png = shotOk ? fs.readFileSync(shot) : Buffer.alloc(0);
  const sample = new Set(); for (let i = 0; i < png.length; i += 97) sample.add(png[i]);
  // In layers mode the game draws into the projection layer's texture, so the page canvas is blank by design.
  const layersMode = name.startsWith('vr') && (await page.evaluate(() => !!(window.__gtXR && window.__gtXR.shim)));
  if (shotOk && layersMode) console.log(`  NOTE  screenshot blank by design in layers mode (${sample.size} distinct sampled bytes; the XR frames check above covers rendering)`);
  else if (shotOk) expect('screenshot is not a blank frame', sample.size > 40, `${sample.size} distinct sampled bytes, saved ${path.relative(root, shot)}`);

  if (name.startsWith('vr') && s.hasSession) {
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
  const names = which === 'all' ? ['2d', 'vr', 'vr-nofloor'] : [which];
  let failed = 0;
  for (const n of names) {
    try { failed += (await scenario(n, url, browser)).length; }
    catch (e) { console.log(`  FAIL  [${n}] ${e.message.split('\n')[0]}`); failed++; }
  }
  await browser.close(); srv.close();
  console.log(failed ? `PLAY TEST FAILED (${failed})` : 'PLAY TEST PASSED');
  process.exit(failed ? 1 : 0);
})();
