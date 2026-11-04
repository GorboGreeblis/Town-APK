// Leaving VR and coming back in (standard tier; T29, the third audit: a session started after an exit used to be a
// plain session without the layers feature, so it ran three.js's default path with no projection layer, no multiview
// and none of the in-frame holds). In VR (fake headset), the first session is ended and the game's own entry is
// pressed again; checked:
//   - the game leaves VR cleanly (not presenting, the end logged) and enters again through the entry script's own
//     request (logged "session requested again (re-entry)"), with the layers feature;
//   - the second session runs on the projection layer through the frame wrapper: the layer goes live again, frames are
//     drawn inside the wrapper's open frame, and multiview is active when the first session had it;
//   - the holds work in it: a new shape first drawn there is held for one frame and uploaded between frames;
//   - the old session's projection shim frees its framebuffers and depth buffers at its end (B96, R2);
//   - frames keep coming; no page errors.
//
//   node tools/test_reentry.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  global.__pageLog = [];
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(2000);
  const log = () => (global.__pageLog || []).slice();
  const first = await page.evaluate(() => { const X = window.__gtXR || {}; return { presenting: !!window.__dbg.O.xr.isPresenting, mv: !!X.mvActive, layer: !!(X.shim && X.shim.layer) }; });
  const n0 = log().length;
  const r = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, X = window.__gtXR, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = {};
    const s1 = O.xr.getSession(); out.s1 = !!s1; const nat = () => (X.nat ? Object.assign({}, X.nat.gl) : null); out.nat0 = nat();
    await s1.end(); let t0 = performance.now(); while (O.xr.isPresenting && performance.now() - t0 < 10000) await wait(100);
    out.leftVR = !O.xr.isPresenting; await wait(1000);
    X.enter && X.enter(); t0 = performance.now(); while (!O.xr.isPresenting && performance.now() - t0 < 15000) await wait(100);
    out.backInVR = !!O.xr.isPresenting; await wait(1500);
    const s2 = O.xr.getSession(); out.newSession = !!s2 && s2 !== s1;
    try { out.features = Array.prototype.slice.call((s2.__real || s2).enabledFeatures || []); } catch (e) { out.features = null; }
    out.layer = !!(X.shim && X.shim.layer); out.mv = !!X.mvActive; out.nat1 = nat();
    // draws inside the wrapper's open frame
    let draws = 0, open = 0; const r0 = O.render; O.render = function () { draws++; if (X.xrFrameOpen) open++; return r0.apply(this, arguments); };
    t0 = performance.now(); while (draws < 20 && performance.now() - t0 < 10000) await wait(50); O.render = r0; out.draws = draws; out.open = open;
    // a new shape first drawn in this session: held for a frame and uploaded between frames
    const T = window.THREE, m = new T.Mesh(new T.SphereGeometry(0.3, 13, 9), new T.MeshBasicMaterial({ color: 0x33aa66 }));
    const cam = D.B; cam.updateMatrixWorld(true); const p = new T.Vector3(0, 0, -1.5).applyMatrix4(cam.matrixWorld); m.position.copy(p); D.C.add(m);
    t0 = performance.now(); while (O.gcNeedsUpload(m.geometry) && performance.now() - t0 < 5000) await wait(50); out.uploaded = !O.gcNeedsUpload(m.geometry); D.C.remove(m);
    return out;
  });
  const after = log().slice(n0);
  note(JSON.stringify(first) + ' | ' + JSON.stringify(r) + ' | ' + after.filter((l) => /session|projection layer|multiview live|geometry held/.test(l)).slice(0, 8).join(' | '));
  expect('the first session ran on the projection layer', first.presenting && first.layer, JSON.stringify(first));
  expect('B96 (R2): the old session\'s shim freed its framebuffers and depth buffers at its end (live counts not higher after re-entry)', r.nat0 && r.nat1 && (r.nat1.Framebuffer || 0) <= (r.nat0.Framebuffer || 0) && (r.nat1.Renderbuffer || 0) <= (r.nat0.Renderbuffer || 0) && (r.nat1.Texture || 0) <= (r.nat0.Texture || 0) + 2, JSON.stringify({ before: r.nat0, after: r.nat1 }));
  expect('the game leaves VR cleanly and enters again', r.leftVR && r.backInVR && r.newSession && after.some((l) => /session ended/.test(l)), JSON.stringify(r));
  expect('the second session is requested through the entry script, with the layers feature', after.some((l) => /session requested again \(re-entry\)/.test(l)) && Array.isArray(r.features) && r.features.includes('layers'), JSON.stringify(r.features));
  expect('the second session runs on the projection layer through the frame wrapper (the layer live again, every draw inside the open frame)', r.layer && after.some((l) => /projection layer live/.test(l)) && r.draws >= 20 && r.open === r.draws, JSON.stringify({ layer: r.layer, draws: r.draws, open: r.open }));
  expect('multiview is active again when the first session had it', r.mv === first.mv, JSON.stringify({ first: first.mv, second: r.mv }));
  expect('the holds work in the second session: a new shape is held for a frame and uploaded between frames', r.uploaded && after.some((l) => /geometry held for one frame/.test(l)), JSON.stringify({ uploaded: r.uploaded }));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `REENTRY TEST FAILED (${failures.length})` : 'REENTRY TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
