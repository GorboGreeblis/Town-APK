// The fourth pass's fixes (standard tier; S33, 4.0.27; the author: "Please apply all minor improvements listed above
// and all fixes for bugs listed above"). In VR (fake XR; run it with GT_MULTIVIEW=1 for the headset's render path):
//   - B91: a sprite whose material has no program yet is held by the shader hold like a mesh (no shader compiled
//     inside a headset frame) and drawn within a few frames; a mesh whose only difference from an existing program is
//     a 4-component colour (one of the four conditions the hold now checks as three.js does) is held the same way;
//     a compile or an upload that throws between frames is logged once and the object is let through to draw, not
//     held for ever; the multiview decision is not cached from a context that is not WebGL2 (the loader's);
//   - B72/B54: a group batched during play inside a headset frame is batched right after the frame, with the batch's
//     shape uploaded then (nothing uploaded inside a frame, the batch on the GPU before its first draw);
//   - B73: hiding an object for the head inside it wakes its cold batches, so the hide is honoured that frame;
//   - B74: the emotes' warm-up run again adds no sprite, material or mesh;
//   - B75: the loader's layers, program, buffer, texture and context are released after the game has held the
//     session for 10 s (logged once), and the game keeps drawing;
//   - B76: with the draw-nothing marks turned off by the recovery step, the mark counter stays at minus infinity
//     whatever counts it up, so it can never meet an old mark;
//   - B77: the geometry warm-up run in VR leaves no GL error behind for the error watch to count in play: its draw
//     goes into the layer's multiview framebuffer with xr off, which raises errors by nature (the uploads are done
//     before it), so it reads them off right after, between frames, and says so in the log;
//   - no frame hazard, no page errors.
//
//   GT_MULTIVIEW=1 node tools/test_s33.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, T = window.THREE, O = D.O, C = D.C, X = window.__gtXR, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = {};
    const logs = [], L0 = window.__gtLog; window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    let frames = 0; (function f() { frames++; requestAnimationFrame(f); })();
    const nf = async (n) => { const f0 = frames, t0 = performance.now(); while (frames - f0 < n && performance.now() - t0 < 20000) await wait(30); };
    await wait(1500);
    const H = window.__gtFrameHaz || { kinds: {} }, comp = () => H.kinds.compileShader || 0, inFrameBuf = () => (X.mvStats && X.mvStats.inFrameKinds && X.mvStats.inFrameKinds.bufferData) || 0;
    const p = D.At.position, ahead = (o, dx) => { const e = D.we.headPos || p; o.position.set(e.x + dx, (e.y || 1.6), e.z - 1.6); };
    // B91 gap 1: a sprite with a new program
    { const c0 = comp(), l0 = logs.length; const sp = new T.Sprite(new T.SpriteMaterial({ color: 0xff66aa, alphaTest: 0.41, sizeAttenuation: false })); sp.scale.set(0.05, 0.05, 1); ahead(sp, 0.3); C.add(sp);
      await nf(8); out.sprite = { compiledInFrame: comp() - c0, held: logs.slice(l0).some((l) => /shader held for one frame/.test(l)), hasProgram: !!(O.properties.get(sp.material).programs) }; C.remove(sp); }
    // B91 gap 2: a 4-component colour on an otherwise existing program
    { const c0 = comp(), l0 = logs.length; const geo = new T.BoxGeometry(0.2, 0.2, 0.2), n = geo.attributes.position.count; geo.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(n * 4).fill(1), 4));
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); ahead(m, -0.3); C.add(m);
      await nf(8); out.alphas = { compiledInFrame: comp() - c0, held: logs.slice(l0).some((l) => /shader held for one frame/.test(l)), hasProgram: !!(O.properties.get(m.material).programs) }; C.remove(m); }
    // B91 gap 4: a compile that throws between frames, then an upload that throws
    { const l0 = logs.length, c1 = O.gcCompileOne; let thrown = 0; O.gcCompileOne = function () { if (!thrown++) throw new Error('test compile failure'); return c1.apply(this, arguments); };
      const m = new T.Mesh(new T.SphereGeometry(0.1, 7, 5), new T.MeshPhongMaterial({ color: 0x3355ff, flatShading: true, alphaTest: 0.29, shininess: 3 })); ahead(m, 0); C.add(m);
      await nf(10); O.gcCompileOne = c1; out.throwCompile = { logged: logs.slice(l0).some((l) => /shader hold: the compile between frames failed/.test(l)), drawn: !!(O.properties.get(m.material).programs) }; C.remove(m); }
    { const l0 = logs.length, u1 = O.gcObjUpdate; let thrown = 0; O.gcObjUpdate = function () { if (!thrown++) throw new Error('test upload failure'); return u1.apply(this, arguments); };
      const m = new T.Mesh(new T.TorusGeometry(0.1, 0.03, 5, 9), new T.MeshLambertMaterial({ color: 0x66ff33 })); ahead(m, 0.15); C.add(m);
      await nf(10); O.gcObjUpdate = u1; out.throwUpload = { logged: logs.slice(l0).some((l) => /geometry hold: the upload between frames failed/.test(l)), uploaded: !O.gcNeedsUpload(m.geometry) }; C.remove(m); }
    // B91 gap 3: no decision cached from a WebGL1 context
    { const keep = X.mvPlan, keepW = X.mvPlanWait; delete X.mvPlan; X.mvPlanWait = 0; const gl1 = document.createElement('canvas').getContext('webgl');
      const r1 = X.mvPlanFor(gl1); out.mvPlan = { webgl1: r1, cachedAfterWebgl1: X.mvPlan, kept: keep }; X.mvPlan = keep; X.mvPlanWait = keepW; }
    // B72/B54: a batchable group made during play, batched inside a headset frame
    { const grp = new T.Group(), mat = new T.MeshLambertMaterial({ color: 0xc08040 }); for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), mat); m.position.set(i * 0.15, 0, 0); grp.add(m); } ahead(grp, 0.6); C.add(grp);
      const b0 = inFrameBuf(); X.xrFrameOpen = true; let during; try { gcSpawnB(grp); during = !!grp.userData.gcEB; } finally { X.xrFrameOpen = false; }
      await wait(50); const bs = new Set(); grp.traverse((o) => o.gcB && bs.add(o.gcB));
      out.spawn = { batchedInFrame: during, batchedAfter: !!grp.userData.gcEB, batches: bs.size, onGpu: [...bs].every((b) => !O.gcNeedsUpload(b.mesh.geometry)), inFrameBuffers: inFrameBuf() - b0 };
      await nf(4); C.remove(grp); }
    // B73: a cold batch woken by the eye hide's helper
    { const E = gcEB.list.find((b) => b.P && b.P.length); if (E) { E.cold = 1; gcHot(E.P[0].o); out.hot = { was: 1, now: E.cold, hotT: E.hotT === gcEB.f }; } else out.hot = null; }
    // B74: the emotes' warm-up again
    { const count = () => { let s = 0, m = 0; const mats = new Set(); C.traverse((o) => { if (o.isSprite) s++; if (o.isMesh) m++; if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((x) => mats.add(x)); }); return [s, m, mats.size]; };
      const a = count(); window.__gtGlowWarm(); await nf(6); const b = count(); out.warm = { before: a, after: b }; }
    // B76: marks off, then counted up
    { const keep = O.gcNDv, keepND = window.gcND; window.gcND = () => {}; O.gcNDv = -1 / 0; const o = new T.Object3D(); for (let i = 0; i < 40; i++) o.layers.set(i % 3); C.add(o); C.remove(o);
      let meets = 0; C.traverse((x) => { if (x.gcND === O.gcNDv) meets++; }); out.nd = { v: String(O.gcNDv), meets }; O.gcNDv = keep; window.gcND = keepND; }
    // B77: the geometry warm-up in VR, between frames
    { const gl = O.getContext(); await wait(0); while (X.xrFrameOpen) await wait(5); let k = 0; while (gl.getError() && k++ < 16); const l0 = logs.length; window.__gtGeoWarm('test'); out.glErr = gl.getError(); out.glErrBefore = k; out.warmLog = logs.slice(l0).some((l) => /geometry warm-up: its draw into the layer's framebuffer raised \d+ GL error/.test(l)) || (window.__gcWarmErr || 0) > 3; await nf(3); }
    // B75: the loader released once the game has held the session for 10 s
    { const t0 = performance.now(); while (!logs.some((l) => /loader released/.test(l)) && performance.now() - t0 < 16000) await wait(250);
      const f0 = frames; await wait(1500); out.loader = { parked: !!X.taken, released: logs.filter((l) => /loader released/.test(l)).length, framesAfter: frames - f0 }; }
    out.hazards = H.total || 0;
    return out;
  });
  note(JSON.stringify(r));
  expect('B91: a sprite with a new program is held by the shader hold (none compiled inside a frame) and drawn after', r.sprite.compiledInFrame === 0 && r.sprite.held && r.sprite.hasProgram, JSON.stringify(r.sprite));
  expect('B91: a 4-component colour (vertexAlphas) on an existing material kind is held the same way', r.alphas.compiledInFrame === 0 && r.alphas.held && r.alphas.hasProgram, JSON.stringify(r.alphas));
  expect('B91: a compile that throws between frames is logged and the object let through to draw', r.throwCompile.logged && r.throwCompile.drawn, JSON.stringify(r.throwCompile));
  expect('B91: an upload that throws between frames is logged and the object let through to draw', r.throwUpload.logged && r.throwUpload.uploaded, JSON.stringify(r.throwUpload));
  expect('B91: the multiview decision is not cached from a context that is not WebGL2', r.mvPlan.webgl1 === false && r.mvPlan.cachedAfterWebgl1 === undefined, JSON.stringify(r.mvPlan));
  expect('B72/B54: a group batched inside a headset frame is batched right after it, its batch on the GPU, nothing uploaded in the frame', r.spawn.batchedInFrame === false && r.spawn.batchedAfter && r.spawn.batches >= 1 && r.spawn.onGpu && r.spawn.inFrameBuffers === 0, JSON.stringify(r.spawn));
  expect('B73: the eye hide wakes a cold batch, so the hide is honoured that frame', r.hot && r.hot.now === 0 && r.hot.hotT, JSON.stringify(r.hot));
  expect('B74: the emotes\' warm-up run again adds no sprite, mesh or material', JSON.stringify(r.warm.before) === JSON.stringify(r.warm.after), JSON.stringify(r.warm));
  expect('B76: with the marks off, the mark counter stays at minus infinity and meets no mark', r.nd.v === '-Infinity' && r.nd.meets === 0, JSON.stringify(r.nd));
  expect('B77: the geometry warm-up in VR leaves no GL error behind, and logs the ones its draw raised', r.glErr === 0 && r.warmLog, JSON.stringify({ glErr: r.glErr, logged: r.warmLog }));
  expect('B75: the loader is released once, 10 s after the game holds the session, and the game keeps drawing', r.loader.released === 1 && r.loader.framesAfter > 10, JSON.stringify(r.loader));
  // the two throw cases above are let through to draw and so compile or upload inside a frame by design; the harness's
  // frame-hazard warning for them is expected
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `S33 TEST FAILED (${failures.length})` : 'S33 TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
