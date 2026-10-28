/**
 * Shared harness for headless game tests.
 *
 *   const { boot } = require('./lib/harness');
 *   const g = await boot({ file, vr: false });   // g.page, g.browser, g.close()
 *
 * Serves a TEMPORARY copy of the game with a debug hook appended right after
 * the world is built (`gcEB.ready=!0;`). The hook exposes closure-scoped game
 * objects on window.__dbg: It (entities), JGP, F (buildings), E (zones),
 * lo (patterns), Be/De (navigation + stuck handling), t (tuning), At (player),
 * B (camera), Re (clock), uo (bodies), C (scene), Kt (progress), le/ce
 * (blossoms/acorns), we (XR input state), G (audio), Ut (speech bubbles).
 * The shipped game is never modified.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
// [name in window.__dbg, the declaration as the game writes it, the variable (when the name differs: the UI object is
// another `F` than the world's collision registry)]
const TAGGED = [['Ge', 'const Ge={'], ['VIGS', 'const VIGS={}'], ['UI', 'const F={};function W(', 'F']];
const HOOK_NAMES = ['It', 'JGP', 'F', 'E', 'lo', 'Be', 'De', 't', 'At', 'B', 'Re', 'uo', 'C', 'Kt', 'le', 'ce', 'we', 'Mo', 'G', 'Ut', 'O', 'me', 'bt', 'ue', 'Dbt', '_t', 'qt', 'jt',
  'ne', 'oe', 'st', 'fe', 'xe', 'yo', 'Nt', 'ke', 'Ge', 'Ho', 'LIB', 'ARTS', 'VIGS', 'BP', 'JAZZ', 'gemTrade', 'shopText', 'battleText', 'Bulb', 'Eo', 'ot', 'E', 'gcEB', 'z', 'te', 'ee'];
const UA = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36';

function hooked(file) {
  let html = fs.readFileSync(file, 'utf8');
  const anchor = 'gcEB.ready=!0;';
  if (!html.includes(anchor)) throw new Error('anchor not found in ' + file + ' (not the game file, or the anchor was renamed: see RESERVED in tools/minify_game.js)');
  // `t` (the tuning object) is shadowed inside the boot function, so capture it
  // at top level where gcEB is declared, before the world is built.
  const anchor2 = 'const gcEB={list:[]';
  if (!html.includes(anchor2)) throw new Error('anchor2 not found in ' + file);
  html = html.replace(anchor2, 'window.__dbgT=t;' + anchor2);
  // Objects declared in another scope than the hook point are tagged where they are declared (test copies only):
  // the quality governor and the vignettes. `window.__dbg.<name>` reads them through a getter.
  for (const [n, decl, v = n] of TAGGED) if (html.includes(decl)) html = html.replace(decl, decl.replace(`const ${v}=`, `const ${v}=window.__dbg_${n}=`));
  // A name declared after the hook point (still in its temporal dead zone there) is reached through a getter instead.
  const hook = 'window.__dbg={};' + HOOK_NAMES.map((n) => `try{window.__dbg.${n}=${n}}catch(e){try{Object.defineProperty(window.__dbg,"${n}",{get:function(){try{return ${n}}catch(_){}},configurable:true,enumerable:true})}catch(_){}}`).join('') + TAGGED.map(([n]) => `Object.defineProperty(window.__dbg,"${n}",{get:function(){return window.__dbg_${n}},configurable:true,enumerable:true});`).join('') + 'window.__dbg.t=window.__dbgT;window.__dbgReady=true;';
  return Buffer.from(html.replace(anchor, anchor + hook));
}

function serve(body, standalone) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      // standalone: the game file and nothing else, as on any plain web server (no /tex/, no /log)
      if (standalone && req.url.split('?')[0] !== '/') { res.writeHead(404); return res.end(); }
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length });
      res.end(body);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

/**
 * boot({ file, vr, timeoutMs })
 *   vr: true (default) installs tools/fakexr.js, fires `sessiongranted` once the
 *   world is built and waits until the game renders XR frames. NPC behaviour,
 *   pickups and input only run while the game is presenting, so almost every
 *   behaviour test needs this. vr: false leaves the game on its 2D gate.
 *   fastSim: true (default) replaces the renderer's draw call with a no-op once
 *   presenting. Software GL manages ~3 fps and the game clamps its time step
 *   at 0.1 s, so with drawing the simulation runs at about a quarter of real
 *   time; without it the loop runs at full rate and timings are realistic.
 *   Screenshots are blank in this mode; use fastSim: false for visual checks.
 *   onBeforeGrant(page, ctx): awaited right before the simulated grant (probes).
 *   noVisits: true (default) parks the random visit scheduler; test_visits forces
 *   its own pairs through JGP.visitAt, which still works.
 */
async function boot({ file = path.join(root, 'tools/android/app/src/main/assets/index.html'), vr = true, fastSim = true, noVisits = true, timeoutMs = 300000, onBeforeGrant = null, initScripts = [], standalone = false } = {}) {
  const srv = await serve(hooked(path.resolve(file)), standalone);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'] });
  // GT_DEVICE=quest2|quest3s|quest3: that headset's user agent and GPU limits (tools/fakexr.js S.DEVICES).
  const device = process.env.GT_DEVICE || '';
  const ua = device ? UA.replace('Quest 3', { quest2: 'Quest 2', quest3s: 'Quest 3S', quest3: 'Quest 3' }[device] || 'Quest 3') : UA;
  const ctx = await browser.newContext({ userAgent: ua, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }));
  page.on('requestfinished', async (r) => { try { const q = requests.find((x) => x.url === r.url() && x.status === undefined); const rs = await r.response(); if (q) q.status = rs ? rs.status() : null; } catch (e) {} });
  page.on('requestfailed', (r) => { const q = requests.find((x) => x.url === r.url() && x.status === undefined); if (q) q.status = 'failed'; });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0] + (e && e.stack ? ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' | ').trim() : '')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  if (vr) await page.addInitScript(fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8'));
  // GT_MULTIVIEW=1: the multiview experiment runs headless without MSAA (SwiftShader has OVR_multiview2 but
  // not the multisampled OCULUS_multiview the headset uses).
  if (vr && process.env.GT_MULTIVIEW) await page.addInitScript(() => { window.__fakeXR.multiview = true; });
  if (vr && device) await page.addInitScript((d) => { window.__fakeXR.applyDevice(d); }, device);
  // GT_HEADSET_FOV=1: the fake eyes take a Quest 3-like field of view (draw counts and culling as on the headset).
  if (vr && process.env.GT_HEADSET_FOV) await page.addInitScript(() => { window.__fakeXR.headsetFov = true; });
  // GT_LAYER_DEPTH=0: the layer brings no depth texture, so multiview renders into the game's own depth buffer as on
  // the headset and its end-of-frame depth discard (P14) runs.
  if (vr && process.env.GT_LAYER_DEPTH === '0') await page.addInitScript(() => { window.__fakeXR.layerDepth = false; });
  for (const sc of initScripts) await page.addInitScript(sc);   // a test's own probes, before the game's first line
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
  await page.waitForFunction(() => window.__dbgReady === true, null, { timeout: timeoutMs });
  // The boot is sliced (3.15.7+): the world-ready flag comes before the shader
  // slices, warm-up and the game loop start. Wait for the loop (Re.t advances).
  await page.waitForFunction(() => window.__gtXR && window.__gtXR.booted === true, null, { timeout: 180000 }).catch(() => {});
  let presentS = null;
  if (vr) {
    if (onBeforeGrant) await onBeforeGrant(page, ctx);   // e.g. start a profiler just before the handover
    await page.evaluate(() => window.__fakeXR.fire());
    await page.waitForFunction(() => window.__fakeXR.frames > 5, null, { timeout: 60000 });
    presentS = (Date.now() - t0) / 1000;
    if (fastSim) await page.evaluate(() => { const O = window.__dbg.O; O.__realRender = O.render; O.render = () => {}; });
    // Hold the random visit scheduler so NPCs under test are not whisked away
    // to visit someone (tests that need visits force a pair with JGP.visitAt).
    if (noVisits) await page.evaluate(() => { const D = window.__dbg; D.JGP.visitAt(D.Re.t + 1e6); });
  }
  const bootS = (Date.now() - t0) / 1000;
  return {
    presentS,
    page, browser, errors, bootS, url, requests,
    hooks: await page.evaluate(() => Object.keys(window.__dbg)),
    close: async () => { await browser.close(); srv.close(); },
  };
}

function reporter() {
  const failures = [];
  const expect = (what, ok, extra) => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${extra ? '  [' + extra + ']' : ''}`);
    if (!ok) failures.push(what);
  };
  const note = (what) => console.log(`  NOTE  ${what}`);
  return { failures, expect, note };
}

module.exports = { boot, reporter, root, HOOK_NAMES, hooked };
