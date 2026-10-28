// The Event's first start (standard tier, pass/fail): what the game does to the GPU in the frames around the moment the
// planting Event is started for the first time in a session (the author: "when the Event is activated for the first
// time, it's possible that some quick flash happens at that moment"). The known flash causes are work that makes the
// headset's GPU save and reload a half-drawn multiview frame (texture uploads and copies, framebuffer switches, pixel
// reads; NOTES 67, 80) and a projection-layer swap (NOTES 81). Every WebGL call of those kinds, plus vertex-buffer
// uploads, buffer and texture creation and shader compiles, is recorded with the frame it falls in and whether a frame
// was drawing at the time; foveation changes and layer swaps are recorded too, from 3 s before the start to 8 s after.
// Fails on any texture, framebuffer or pixel operation or shader compile inside a frame, and on a layer swap; vertex
// uploads inside a frame are listed (the buffers a new mesh needs; not a known flash cause, reported for the record).
//
//   node tools/event_start_check.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const HAZARD = ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'texStorage2D', 'texStorage3D', 'compressedTexImage2D', 'copyTexImage2D', 'copyTexSubImage2D', 'generateMipmap', 'readPixels', 'blitFramebuffer', 'framebufferTexture2D', 'framebufferTextureLayer', 'renderbufferStorage', 'renderbufferStorageMultisample', 'compileShader', 'linkProgram'];
const INFO = ['bufferData', 'bufferSubData', 'createBuffer', 'createTexture', 'bindFramebuffer'];

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async ([HAZARD, INFO]) => {
    const D = window.__dbg, X = window.__gtXR, gl = D.O.getContext(), wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const log = []; let rec = false, frame = 0, t0 = 0;
    // frames: the game's render call, once per XR frame (multiview) or per eye (classic)
    const R = D.O.render; let lastEnd = 0;
    D.O.render = function () { const s = performance.now(); try { return R.apply(this, arguments); } finally { const e = performance.now(); if (rec) log.push({ k: 'frame', f: frame, t: s - t0, ms: e - s, gap: lastEnd ? s - lastEnd : 0 }); lastEnd = e; frame++; } };
    for (const k of HAZARD.concat(INFO)) {
      const fn = gl[k]; if (typeof fn !== 'function') continue;
      gl[k] = function () {
        if (rec && !(k === 'bindFramebuffer' && !X.mvInFrame)) log.push({ k, f: frame, t: performance.now() - t0, inFrame: !!X.mvInFrame, hazard: HAZARD.includes(k), arg: k.startsWith('tex') || k === 'bufferData' ? (arguments[2] && arguments[2].byteLength) || (arguments[6] && (arguments[6].width + 'x' + arguments[6].height)) || '' : '', stack: X.mvInFrame && HAZARD.includes(k) ? (new Error()).stack.split('\n').slice(2, 5).map((l) => l.trim()).join(' < ') : '' });
        return fn.apply(this, arguments);
      };
    }
    // foveation and layer swaps, read every 20 ms
    const sh = () => X.shim || {}; let fov = sh().fixedFoveation, scale = sh().scale, lay = sh().layer;
    const poll = setInterval(() => { const s = sh(); if (!rec) return; if (s.fixedFoveation !== fov) { log.push({ k: 'foveation', f: frame, t: performance.now() - t0, from: fov, to: s.fixedFoveation }); fov = s.fixedFoveation; } if (s.layer !== lay) { log.push({ k: 'layer swap', f: frame, t: performance.now() - t0 }); lay = s.layer; } }, 20);
    // the first start of the Event, as the player does it (the campfire panel, Yes)
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true;
    t0 = performance.now() + 3000; rec = true; await wait(3000);
    D.oe.open(); await wait(300);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); const tYes = performance.now() - t0; if (yes) yes.onClick();
    const ts = performance.now(); while (!D.me.active && performance.now() - ts < 15000) await wait(20);
    const tActive = performance.now() - t0, started = !!D.me.active;
    await wait(8000); rec = false; clearInterval(poll); clearInterval(adv);
    return { log, started, tYes, tActive, level: D.Ge && D.Ge.level, foveationNow: sh().fixedFoveation };
  }, [HAZARD, INFO]);
  await g.close();
  const L = r.log, frames = L.filter((e) => e.k === 'frame');
  note(`the Event ${r.started ? 'started' : 'did NOT start'}: Yes at ${(r.tYes / 1000).toFixed(2)} s, active at ${(r.tActive / 1000).toFixed(2)} s; ${frames.length} frames recorded (software GL: frame times are not the headset's)`);
  const inside = L.filter((e) => e.inFrame && e.hazard), compiles = L.filter((e) => e.k === 'compileShader' || e.k === 'linkProgram');
  const byKind = (list) => { const m = {}; for (const e of list) m[e.k] = (m[e.k] || 0) + 1; return JSON.stringify(m); };
  note(`all recorded calls: ${byKind(L.filter((e) => e.k !== 'frame'))}`);
  const vb = L.filter((e) => e.inFrame && (e.k === 'bufferData' || e.k === 'bufferSubData'));
  note(`vertex/index uploads inside a frame: ${vb.length}${vb.length ? ' (' + (vb.reduce((a, e) => a + (+e.arg || 0), 0) / 1024).toFixed(0) + ' KB, frames ' + [...new Set(vb.map((e) => e.f))].slice(0, 12).join(',') + ')' : ''}`);
  const fov = L.filter((e) => e.k === 'foveation'); note(`foveation changes: ${fov.map((e) => `${e.from}->${e.to} at ${(e.t / 1000).toFixed(2)} s`).join(', ') || 'none'} (level now ${r.level}, foveation ${r.foveationNow})`);
  const longest = frames.slice().sort((a, b) => b.gap - a.gap).slice(0, 3);
  note(`longest gaps between frames: ${longest.map((e) => `${e.gap.toFixed(0)} ms before frame at ${(e.t / 1000).toFixed(2)} s`).join(', ')}`);
  expect('the Event starts', r.started);
  expect('no texture, framebuffer or pixel operation inside a frame around the Event start (the flash causes)', inside.filter((e) => e.k !== 'compileShader' && e.k !== 'linkProgram').length === 0, inside.slice(0, 4).map((e) => `${e.k} ${e.arg} at ${(e.t / 1000).toFixed(2)} s: ${e.stack}`).join(' | '));
  expect('no shader compiled around the Event start', compiles.length === 0, compiles.slice(0, 3).map((e) => `${e.k} at ${(e.t / 1000).toFixed(2)} s${e.inFrame ? ' (in a frame)' : ''}`).join(' | '));
  expect('no projection-layer swap', !L.some((e) => e.k === 'layer swap'));
  console.log(failures.length ? `EVENT START CHECK FAILED (${failures.length})` : 'EVENT START CHECK PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
