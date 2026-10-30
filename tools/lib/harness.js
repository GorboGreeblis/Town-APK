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
 *   fastSim: 'matrices' skips the draw but still updates the scene's world matrices each frame, as the draw
 *   would (positions as drawn, e.g. test_jitter.js), at nearly the speed of fastSim: true.
 *   renderEvery: N (with fastSim: false) draws one frame in N and skips the others' draw call: the game's own
 *   update still runs every frame, new textures, buffers and shaders still reach the GPU within N frames (so
 *   the frame-hazard watch and the censuses still see them), and the simulation runs several times faster.
 *   Not for checks of every drawn frame (pixels, frame times, the governor).
 *   onBeforeGrant(page, ctx): awaited right before the simulated grant (probes).
 *   noVisits: true (default) parks the random visit scheduler; test_visits forces
 *   its own pairs through JGP.visitAt, which still works.
 */
async function boot({ file = path.join(root, 'tools/android/app/src/main/assets/index.html'), vr = true, fastSim = true, noVisits = true, renderEvery = 1, timeoutMs = 300000, onBeforeGrant = null, initScripts = [], standalone = false } = {}) {
  const srv = await serve(hooked(path.resolve(file)), standalone);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'] });
  // GT_DEVICE=quest2|quest3s|quest3: that headset's user agent and GPU limits (tools/fakexr.js S.DEVICES).
  const device = process.env.GT_DEVICE || '';
  const ua = device ? UA.replace('Quest 3', { quest2: 'Quest 2', quest3s: 'Quest 3S', quest3: 'Quest 3' }[device] || 'Quest 3') : UA;
  const ctx = await browser.newContext({ userAgent: ua, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  // GT_COVERAGE=1: record which of the page's functions ran (V8 function coverage), written to tools/.runs/coverage/ on
  // close; tools/dead_code.js reads them all (the dead code census).
  let cov = null; const scripts = new Map();
  if (process.env.GT_COVERAGE) {
    cov = await ctx.newCDPSession(page);
    cov.on('Debugger.scriptParsed', (e) => { if (e.url && e.url.startsWith('http://127.0.0.1')) scripts.set(e.scriptId, { url: e.url, startLine: e.startLine, startColumn: e.startColumn, length: e.length, hash: e.hash }); });
    await cov.send('Debugger.enable'); await cov.send('Profiler.enable');
    await cov.send('Profiler.startPreciseCoverage', { callCount: false, detailed: false });
  }
  const errors = [], requests = [];
  page.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }));
  page.on('requestfinished', async (r) => { try { const q = requests.find((x) => x.url === r.url() && x.status === undefined); const rs = await r.response(); if (q) q.status = rs ? rs.status() : null; } catch (e) {} });
  page.on('requestfailed', (r) => { const q = requests.find((x) => x.url === r.url() && x.status === undefined); if (q) q.status = 'failed'; });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0] + (e && e.stack ? ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' | ').trim() : '')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  if (vr) await page.addInitScript(fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8'));
  // Frame-hazard watch (every test, both render paths): GPU work that must never happen while an XR frame draws (the
  // flash causes: texture uploads and copies, mipmap builds, pixel reads, blits, framebuffer attachments, renderbuffer
  // storage, geometry buffers made on first sight; NOTES 67, 80, 97) and shader compiles (hitches). Recorded with the frame and a short stack; close() reports.
  if (vr) await page.addInitScript(() => {
    const H = window.__gtFrameHaz = { n: 0, kinds: {}, first: [] };
    const K = ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'texStorage2D', 'texStorage3D', 'compressedTexImage2D', 'copyTexImage2D', 'copyTexSubImage2D', 'generateMipmap', 'readPixels', 'framebufferTexture2D', 'framebufferTextureLayer', 'renderbufferStorage', 'renderbufferStorageMultisample', 'compileShader', 'createBuffer'];   // createBuffer: a geometry drawn for the first time (3.15.57, F-B48)
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      if (!C) continue;
      for (const k of K) {
        const f = C.prototype[k]; if (typeof f !== 'function' || f.__gtHaz) continue;
        const w = function () {
          const X = window.__fakeXR;
          if (X && X.inFrame && !/^(framebufferTexture2D|framebufferTextureLayer|blitFramebuffer)$/.test(k)) {   // the layer's own per-frame attach and the classic path's end-of-frame resolve are normal
            const st = (new Error()).stack.split('\n').slice(2, 9).map((l) => l.trim()).join(' < ');
            // multiview (the headset's path): every texture operation inside the frame is a hazard (F-B31 defers them all to
            // after the frame); the classic path uploads changed textures at the frame's start, before drawing, so there
            // only work done while three.js draws counts (a texture uploaded on first sight, mid-frame on either path); an
            // explicit initTexture before the draw starts (the render wrapper's pre-upload, F-B36) is the frame's start
            const mv = !!(window.__gtXR && window.__gtXR.mvActive), drawing = /safeSetTexture2D|renderBufferDirect/.test(st) || (/\/:3:\d+/.test(st) && !/initTexture/.test(st));
            if (!/XRWebGLBindingFake|fakexr|Fake/.test(st) && (mv || drawing)) {
              H.n++; H.kinds[k] = (H.kinds[k] || 0) + 1;
              if (H.first.length < 8) { const a = arguments, src = a[a.length - 1]; H.first.push({ k, frame: X.frames, size: src && src.width ? src.width + 'x' + src.height : '', stack: st.slice(0, 240) }); }
            }
          }
          return f.apply(this, arguments);
        };
        w.__gtHaz = true; C.prototype[k] = w;
      }
    }
  });
  // GT_MULTIVIEW=1: the multiview experiment runs headless without MSAA (SwiftShader has OVR_multiview2 but
  // not the multisampled OCULUS_multiview the headset uses).
  if (vr && process.env.GT_MULTIVIEW) await page.addInitScript(() => { window.__fakeXR.multiview = true; });
  if (vr && device) await page.addInitScript((d) => { window.__fakeXR.applyDevice(d); }, device);
  // GT_HEADSET_FOV=1: the fake eyes take a Quest 3-like field of view (draw counts and culling as on the headset).
  if (vr && process.env.GT_HEADSET_FOV) await page.addInitScript(() => { window.__fakeXR.headsetFov = true; });
  // GT_LAYER_DEPTH=0: the layer brings no depth texture, so multiview renders into the game's own depth buffer as on
  // the headset and its end-of-frame depth discard (P14) runs.
  if (vr && process.env.GT_LAYER_DEPTH === '0') await page.addInitScript(() => { window.__fakeXR.layerDepth = false; });
  // GT_GLERR=1: every WebGL call is followed by a getError, and the first 12 calls that raise an error are kept with
  // their arguments and stack; close() prints them. getError itself still reports the error as before (the first one
  // since it was last read), so a test's own "no GL error" checks are unchanged. Slow: for finding a GL error only.
  if (process.env.GT_GLERR) await page.addInitScript(() => {
    const P = WebGL2RenderingContext.prototype, ge = P.getError; let pending = 0; window.__gtGlErrs = [];
    for (const k of Object.getOwnPropertyNames(P)) {
      const d = Object.getOwnPropertyDescriptor(P, k); if (!d || typeof d.value !== 'function' || k === 'getError') continue;
      const f = d.value;
      P[k] = function () {
        const r = f.apply(this, arguments), e = ge.call(this);
        if (e) {
          if (!pending) pending = e;
          if (window.__gtGlErrs.length < 12) window.__gtGlErrs.push({ call: k, error: e, xr: window.__gtXR ? { inFrame: !!window.__gtXR.xrFrameOpen, multiview: !!window.__gtXR.mvActive, frames: window.__fakeXR ? window.__fakeXR.frames : null } : null, at: +(performance.now() / 1000).toFixed(2), object: window.__gtGlCur || null, detail: window.__gtGlDetail ? window.__gtGlDetail() : null, args: Array.from(arguments).slice(0, 5).map((a) => (typeof a === 'number' ? a : a && a.constructor ? a.constructor.name : String(a))), stack: new Error().stack.split('\n').slice(2, 9).map((l) => l.trim().replace(/\(?https?:\/\/[^/]+\//, '(').slice(0, 120)).join(' < ') });
        }
        return r;
      };
    }
    P.getError = function () { const e = ge.call(this) || pending; pending = 0; return e; };
  });
  for (const sc of initScripts) await page.addInitScript(sc);   // a test's own probes, before the game's first line
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
  await page.waitForFunction(() => window.__dbgReady === true, null, { timeout: timeoutMs });
  // The boot is sliced (3.15.7+): the world-ready flag comes before the shader
  // slices, warm-up and the game loop start. Wait for the loop (Re.t advances).
  await page.waitForFunction(() => window.__gtXR && window.__gtXR.booted === true, null, { timeout: 180000 }).catch(() => {});
  // GT_GLERR: name the object three.js is drawing, so an error raised by a draw says which object (name, parents,
  // material, index count, place and the start of its program's key; the key starts with three.js's multiview flag)
  if (process.env.GT_GLERR) await page.evaluate(() => {
    const O = window.__dbg && window.__dbg.O; if (!O) return; const rb = O.renderBufferDirect;
    O.renderBufferDirect = function (cam, scene, geo, mat, obj) {
      let p = obj, n = []; while (p && n.length < 5) { n.push(p.name || p.type); p = p.parent; }
      const pr = O.properties.get(mat).currentProgram;
      window.__gtGlCur = `${n.join(' < ')} [${mat.type}${mat.name ? ' ' + mat.name : ''}, ${geo.index ? geo.index.count + ' indices' : (geo.attributes.position || {}).count + ' vertices'}, at ${obj.getWorldPosition(new window.THREE.Vector3()).toArray().map((v) => v.toFixed(1)).join(',')}, program ${pr ? `${pr.name || ''} key ${String(pr.cacheKey || '').slice(0, 40)}` : 'none'}]`;
      // on an error: the geometry's buffers against its indices (an index past a buffer's end is INVALID_OPERATION)
      window.__gtGlDetail = () => { let mx = -1; if (geo.index) for (const i of geo.index.array) mx = Math.max(mx, i); let q = obj, ch = []; while (q && ch.length < 6) { ch.push(q.type + (Object.keys(q.userData || {}).length ? JSON.stringify(Object.keys(q.userData).slice(0, 6)) : '')); q = q.parent; } return { maxIndex: mx, attrs: Object.entries(geo.attributes).map(([k, a]) => `${k} ${a.count}x${a.itemSize} v${a.version}`).join(', '), drawRange: [geo.drawRange.start, geo.drawRange.count], vertexColors: !!mat.vertexColors, chain: ch.join(' < '), id: obj.id, isMesh: !!obj.isMesh, renderOrder: obj.renderOrder, mat: { transparent: mat.transparent, depthTest: mat.depthTest, side: mat.side, opacity: mat.opacity, color: mat.color && mat.color.getHexString(), map: mat.map ? { image: mat.map.image ? `${mat.map.image.constructor.name} ${mat.map.image.width}x${mat.map.image.height}` : null, rt: !!mat.map.isRenderTargetTexture, version: mat.map.version, uuid: mat.map.uuid.slice(0, 8) } : null } }; };
      try { return rb.apply(this, arguments); } finally { window.__gtGlCur = null; window.__gtGlDetail = null; }
    };
  });
  let presentS = null;
  if (vr) {
    if (onBeforeGrant) await onBeforeGrant(page, ctx);   // e.g. start a profiler just before the handover
    await page.evaluate(() => window.__fakeXR.fire());
    await page.waitForFunction(() => window.__fakeXR.frames > 5, null, { timeout: 60000 });
    presentS = (Date.now() - t0) / 1000;
    if (fastSim === 'matrices') await page.evaluate(() => { const O = window.__dbg.O; O.__realRender = O.render; O.render = (sc) => { if (sc && sc.isScene && sc.autoUpdate !== false && sc.matrixWorldAutoUpdate !== false) sc.updateMatrixWorld(); }; });
    else if (fastSim) await page.evaluate(() => { const O = window.__dbg.O; O.__realRender = O.render; O.render = () => {}; });
    else if (renderEvery > 1) await page.evaluate((N) => { const O = window.__dbg.O, R = O.render; let k = 0; O.__realRender = R; O.render = function () { if (++k % N === 0) return R.apply(this, arguments); }; }, renderEvery);
    // Hold the random visit scheduler so NPCs under test are not whisked away
    // to visit someone (tests that need visits force a pair with JGP.visitAt).
    if (noVisits) await page.evaluate(() => { const D = window.__dbg; D.JGP.visitAt(D.Re.t + 1e6); });
  }
  const bootS = (Date.now() - t0) / 1000;
  return {
    presentS,
    page, browser, errors, bootS, url, requests,
    hooks: await page.evaluate(() => Object.keys(window.__dbg)),
    frameHazards: () => page.evaluate(() => window.__gtFrameHaz || null).catch(() => null),
    close: async () => {
      // report GPU work inside XR frames (flash causes) for every test that booted the game; collected by run_tests.sh
      try {
        const h = await page.evaluate(() => window.__gtFrameHaz || null);
        if (h && h.n) {
          const line = `${path.basename(process.argv[1] || '?')}: ${h.n} GPU operations inside XR frames ${JSON.stringify(h.kinds)}; first: ${h.first.map((x) => `${x.k} ${x.size} frame ${x.frame} @ ${x.stack}`).join(' | ')}`;
          console.log('  WARNING  frame hazard (flash cause): ' + line);
          fs.mkdirSync(path.join(root, 'tools/.runs'), { recursive: true }); fs.appendFileSync(path.join(root, 'tools/.runs/frame_hazards.log'), new Date().toISOString() + ' ' + line + '\n');
        }
      } catch (e) {}
      // any WebGL error raised since boot (the game never reads errors, so the first one is still pending here; a lost
      // context's own code aside); collected by run_tests.sh, which fails the pass on any. Rerun with GT_GLERR=1 to see
      // which call and object raised it (F-B61 was found this way).
      try {
        const e = await page.evaluate(() => { const O = window.__dbg && window.__dbg.O; const gl = O && O.getContext(); const e = gl && !gl.isContextLost() ? gl.getError() : 0; return e === 0x9242 ? 0 : e; });   // CONTEXT_LOST_WEBGL: a test that loses the context on purpose
        if (e) {
          const line = `${path.basename(process.argv[1] || '?')}: WebGL error ${e} (0x${e.toString(16)}) raised during the run (rerun with GT_GLERR=1 to name the call and object)`;
          console.log('  WARNING  GL error: ' + line);
          fs.mkdirSync(path.join(root, 'tools/.runs'), { recursive: true }); fs.appendFileSync(path.join(root, 'tools/.runs/gl_errors.log'), new Date().toISOString() + ' ' + line + '\n');
        }
      } catch (e) {}
      if (process.env.GT_GLERR) try {
        const errs = await page.evaluate(() => window.__gtGlErrs || []);
        console.log(`  NOTE  GT_GLERR: ${errs.length} WebGL call(s) raised an error` + errs.map((x) => `\n        ${x.call}(${x.args.join(', ')}) -> ${x.error} at ${x.at} s ${JSON.stringify(x.xr)}${x.object ? ' drawing ' + x.object : ''}${x.detail ? ' ' + JSON.stringify(x.detail) : ''} @ ${x.stack}`).join(''));
      } catch (e) {}
      if (cov) try {
        const { result } = await cov.send('Profiler.takePreciseCoverage');
        const out = result.filter((r) => scripts.has(r.scriptId)).map((r) => ({ ...scripts.get(r.scriptId), functions: r.functions.map((f) => [f.functionName, f.ranges[0].startOffset, f.ranges[0].endOffset, f.ranges[0].count]) }));
        const dir = path.join(root, 'tools/.runs/coverage'); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${path.basename(process.argv[1] || 'x', '.js')}-${Date.now()}.json`), JSON.stringify({ file: path.resolve(file), scripts: out }));
      } catch (e) { console.log('  NOTE  coverage not written: ' + e.message); }
      await browser.close(); srv.close();
    },
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
