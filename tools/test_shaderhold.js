// Shader hold (standard tier; the author: "Are there any kind of global safeties we can add to prevent screen flashes in
// general?"; FIXES S1). Every shader the game uses is compiled while loading (`warm_coverage.js`); as a safety for any one
// missed, an object whose first draw would compile a new shader program inside a headset frame is held back for that
// frame and its program compiled right after it (as new geometry is, F-B51). In VR (fake XR, rendering on), objects
// with materials no program exists for are added in front of the player:
//   - no shader is compiled inside a headset frame (the frame-hazard watch's compileShader count stays the same);
//   - each object was held and is drawn within a few frames (its material has a program);
//   - an object whose material shares an existing program is not held (only new programs are);
//   - no page errors.
//
//   node tools/test_shaderhold.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, T = window.THREE, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    await wait(1500);
    const H = window.__gtFrameHaz, c0 = H.kinds.compileShader || 0, logs = [], L0 = window.__gtLog;
    window.__gtLog = (s) => { logs.push(s); try { L0 && L0(s); } catch (e) {} };
    const p = D.At.position, mk = (mat, dx) => { const geo = new T.SphereGeometry(0.4, 12, 8); geo.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3)); const m = new T.Mesh(geo, mat); m.position.set(p.x + dx, 1.4, p.z - 3); D.C.add(m); return m; };
    // new programs: a flat-shaded vertex-coloured alpha-tested phong material and an alpha-tested back-sided basic one with
    // vertex colours (combinations the game never uses)
    const fresh = [mk(new T.MeshPhongMaterial({ color: 0xff8844, flatShading: true, vertexColors: true, alphaTest: 0.37, emissive: 0x110000 }), 1), mk(new T.MeshBasicMaterial({ color: 0x55aaff, vertexColors: true, alphaTest: 0.41, side: T.BackSide, fog: false }), -1)];
    // an existing program: a plain lambert material like the ground's
    const shared = mk(new T.MeshLambertMaterial({ color: 0x88cc66 }), 0);
    await wait(1500);
    const props = (m) => !!O.properties.get(m.material).programs;
    const out = { inFrame: (H.kinds.compileShader || 0) - c0, freshDrawn: fresh.map(props), sharedDrawn: props(shared), held: logs.filter((s) => /^shader held/.test(s)), first: H.first.filter((f) => f.k === 'compileShader').slice(0, 3) };
    [...fresh, shared].forEach((m) => D.C.remove(m));
    return out;
  });
  await g.close();
  note(JSON.stringify(r));
  expect('no shader compiled inside a headset frame', r.inFrame === 0, JSON.stringify(r.first));
  expect('each new-program object was held and is drawn after its frame', r.held.length >= 1 && r.freshDrawn.every(Boolean), JSON.stringify(r));
  expect('an object sharing an existing program is drawn without a hold', r.sharedDrawn === true);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `SHADER HOLD TEST FAILED (${failures.length})` : 'SHADER HOLD TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
