// The watch and the HUD (standard tier; A35; the author: "Hide the HUD. Add a watch to the Left hand model. On the
// watch face, write 'press Y to open'. Have the HUD only appear when the user presses Y while looking at the watch. And
// then have it close when the user looks away from the watch or presses Y again"). In VR (fake XR, controller poses on):
//   - the left hand wears a watch (its face textured, "PRESS Y TO OPEN"); the right hand none;
//   - the HUD is hidden by default, and stays hidden when Y is pressed while not looking at the watch;
//   - with the watch held before the eyes (0.32 m, its face toward them), Y opens the HUD; Y again closes it;
//   - opened, then the hand lowered (not looking at the watch), the HUD closes within 0.6 s;
//   - opened, the HUD lies on the watch face (A41; the author: "Move the HUD to be placed on top of the watch face when
//     opened. Ensure that the HUD has a solid background to be fully readable"): in the face's plane just above it, near
//     its centre, about 8 cm wide, its background fully opaque;
//   - flash prevention (the author: the flashes came "around the time that I picked up pickups"): pickups while the HUD
//     is closed redraw nothing (no texture upload while walking about); opening it redraws it once, and it is never shown
//     with an old picture (hidden until the new one is in place);
//   - no GPU work inside a headset frame (the frame-hazard watch); no page errors or logged errors.
//
//   node tools/test_watch.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, X = window.__fakeXR, T = window.THREE, UI = D.UI, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    if (!UI || !X) return { noUI: true };
    const H = window.__gtFrameHaz;
    const idle = [{ handedness: 'left', buttons: [] }, { handedness: 'right', buttons: [] }];
    X.poses = true; X.setInputs(idle); await wait(1500);
    const left = UI.ctrls.find((c) => c.hand === 'left'), right = UI.ctrls.find((c) => c.hand === 'right');
    const watch = left && left.handMesh && left.handMesh.userData.gcWatch;
    const out = { watch: !!watch, watchMap: !!(watch && watch.material.map && watch.material.map.image), rightWatch: !!(right && right.handMesh && right.handMesh.userData.gcWatch) };
    if (!watch) return out;
    const h0 = H ? H.n : 0;
    // HUD shown on any frame in a window
    const shownDuring = async (ms) => { let n = 0, f = 0, stale = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { await wait(16); f++; if (UI.hud.mesh.visible) { n++; if (UI.hud.mesh.material.map !== UI.hud.tex) stale++; } } return { n, f, stale }; };
    const pressY = async () => { X.setInputs([{ handedness: 'left', buttons: [0, 0, 0, 0, 0, { pressed: true, value: 1 }].map((b) => b || { pressed: false }) }, idle[1]]); await wait(120); X.setInputs(idle); await wait(120); };
    out.byDefault = await shownDuring(1000);
    await pressY(); out.yNotLooking = await shownDuring(800);
    // the left hand held so the watch face is 0.32 m before the eyes, a little below, facing them
    const lookPose = () => {
      const cam = D.B, E = new T.Vector3(), Q = new T.Quaternion(), S3 = new T.Vector3(); cam.updateMatrixWorld(true); cam.matrixWorld.decompose(E, Q, S3);
      const fwd = new T.Vector3(0, 0, -1).applyQuaternion(Q), up = new T.Vector3(0, 1, 0).applyQuaternion(Q);
      const target = E.clone().addScaledVector(fwd, 0.32).addScaledVector(up, -0.05);
      const toEye = E.clone().sub(target).normalize(), qF = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), toEye);
      const Fw = new T.Matrix4().compose(target, qF, new T.Vector3(1, 1, 1));
      left.grip.updateMatrixWorld(true); watch.updateMatrixWorld(true);
      const L = new T.Matrix4().copy(left.grip.matrixWorld).invert().multiply(watch.matrixWorld);   // watch in the grip's frame
      const Gw = Fw.clone().multiply(L.clone().invert()), P = new T.Matrix4().copy(left.grip.parent.matrixWorld).invert().multiply(Gw);
      const p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(); P.decompose(p, q, sc);
      return { position: { x: p.x, y: p.y, z: p.z }, orientation: { x: q.x, y: q.y, z: q.z, w: q.w }, matrix: Array.from(P.elements) };
    };
    X.leftPose = lookPose(); await wait(300); X.leftPose = lookPose(); await wait(300);
    out.lookingBeforeY = await shownDuring(500);
    // pickups while closed: nothing redrawn
    const r0 = UI.hud.redraws; D.Kt.blossoms += 2; D.Kt.acorns += 1; await wait(1500); out.closedRedraws = UI.hud.redraws - r0;
    await pressY(); out.opened = await shownDuring(1000); out.openRedraws = UI.hud.redraws - r0;
    // where it shows (A41): on the watch face, in the face's plane, centred over it, about 8 cm wide, an opaque panel
    { const T = window.THREE, m = UI.hud.mesh, wf = left && left.handMesh.userData.gcWatch; m.updateMatrixWorld(true);
      const c = new T.Vector3().setFromMatrixPosition(wf.matrixWorld), n = new T.Vector3(0, 0, 1).transformDirection(wf.matrixWorld), hn = new T.Vector3(0, 0, 1).transformDirection(m.matrixWorld), hp = new T.Vector3().setFromMatrixPosition(m.matrixWorld), ws = m.getWorldScale(new T.Vector3());
      const cv = UI.hud.c, g = cv.getContext('2d'), px = g.getImageData(cv.width / 2, 40, 1, 1).data, corner = g.getImageData(20, 120, 1, 1).data;
      out.place = { parent: m.parent === wf, facing: +n.dot(hn).toFixed(3), above: +hp.clone().sub(c).dot(n).toFixed(4), off: +hp.clone().sub(c).projectOnPlane(n).length().toFixed(3), width: +ws.x.toFixed(3), alpha: [px[3], corner[3]], opacity: m.material.opacity }; }
    await pressY(); out.closedByY = await shownDuring(800);
    await pressY(); const reopened = await shownDuring(400);
    X.leftPose = null; await wait(600); out.reopened = reopened; out.afterLookAway = await shownDuring(800);
    out.haz = H ? H.n - h0 : null;
    return out;
  });
  if (r.noUI) { expect('the game exposes its UI to tests', false); process.exit(1); }
  note(JSON.stringify(r));
  expect('the left hand wears a watch with its face painted; the right hand none', r.watch && r.watchMap && !r.rightWatch, JSON.stringify({ watch: r.watch, map: r.watchMap, right: r.rightWatch }));
  expect('the HUD is hidden by default', r.byDefault && r.byDefault.n === 0, JSON.stringify(r.byDefault));
  expect('Y while not looking at the watch leaves the HUD hidden', r.yNotLooking && r.yNotLooking.n === 0, JSON.stringify(r.yNotLooking));
  expect('looking at the watch alone does not open the HUD', r.lookingBeforeY && r.lookingBeforeY.n === 0, JSON.stringify(r.lookingBeforeY));
  expect('Y while looking at the watch opens the HUD (shown while looking)', r.opened && r.opened.n >= r.opened.f - 3, JSON.stringify(r.opened));
  expect('pickups while the HUD is closed redraw nothing (no upload while walking about)', r.closedRedraws === 0, String(r.closedRedraws));
  expect('opened, the HUD lies on the watch face: in its plane, a few millimetres above it, near its centre, about 8 cm wide (A41)', r.place && r.place.parent && r.place.facing > 0.999 && r.place.above > 0 && r.place.above < 0.01 && r.place.off < 0.02 && Math.abs(r.place.width - 0.08) < 0.005, JSON.stringify(r.place));
  expect('its background is solid (fully opaque), so it reads over anything behind it (A41)', r.place && r.place.alpha[0] === 255 && r.place.alpha[1] === 255 && r.place.opacity === 1, JSON.stringify(r.place && { alpha: r.place.alpha, opacity: r.place.opacity }));
  expect('opening redraws it once, and it is never shown with an old picture', r.openRedraws === 1 && r.opened && r.opened.stale === 0, JSON.stringify({ redraws: r.openRedraws, stale: r.opened && r.opened.stale }));
  expect('Y again closes it', r.closedByY && r.closedByY.n === 0, JSON.stringify(r.closedByY));
  expect('looking away closes it (within 0.6 s)', r.reopened && r.reopened.n > 0 && r.afterLookAway && r.afterLookAway.n === 0, JSON.stringify({ reopened: r.reopened, after: r.afterLookAway }));
  expect('no GPU work inside a headset frame (frame-hazard watch)', r.haz === 0 || r.haz === null, String(r.haz));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `WATCH TEST FAILED (${failures.length})` : 'WATCH TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
