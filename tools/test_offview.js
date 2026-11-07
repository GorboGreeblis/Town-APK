// The townsfolk outside the view skip the matrix walk and culling, and nothing visible changes (standard tier; P34,
// 4.1.0; the author's battery run 14b455ce on 4.0.46: town median 65 fps, 16 of 117 readings under 60, CPU-bound).
// Each frame in VR, before the scene is drawn, every character's bounding sphere (from its whole body, 1.25 times plus
// 0.9 m, measured again every 600 frames) is tested against this frame's two eye views (three.js sets each eye's pose
// and projection from the headset before the game's frame runs, so walking, snap turns, head turns and a recentred
// view are all exact); a character wholly outside both is skipped for that frame: no matrix walk under its group, no
// culling, and its batched parts are not drawn (their slots cleared, so nothing is drawn from a stale matrix). Picking a skipped
// character the controller ray can reach first brings its matrices up to date. Checked here, over walking, snap turns
// and fast head turns at four spots:
//   - after every frame, no skipped character's exact box (its matrices brought up to date) meets that frame's real
//     view (the frustum three.js culls with: both eyes');
//   - characters are skipped at all (the saving is real);
//   - picking: a skipped character's matrices, brought up to date by the pick, equal a fresh walk;
//   - the planting Event (P35): a dancer out of view skips its ground fit and is fitted as it comes back into view,
//     before it is drawn (no dancer in view is left unfitted); a fit that lifts a dancer moves the matrices already
//     worked out instead of walking the whole body again, and they equal a fresh walk;
//   - P45 (4.0.53): a far dancer's frames skipped by design (posed every other frame, every third past 20 m: its fit
//     and matrices wait) are counted apart, not as unfitted (B136, closed: the check predated P45), and must all be
//     far from the player (the game skips only past 10 m);
//   - turned off (`__gcOff.st.on = false`), no character stays skipped;
//   - no page errors.
//
//   node tools/test_offview.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, O = D.O, X = window.__fakeXR, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 300);
    await wait(2500);
    if (!window.__gcOff) return { error: 'no __gcOff' };
    let cam = null; const G = O.xr.getCamera; O.xr.getCamera = function () { return (cam = G.apply(this, arguments)); };
    const Fr = new T.Frustum(), M = new T.Matrix4(), V = new T.Vector3(), Bx = new T.Box3();
    const out = { frames: 0, offFrames: 0, offTotal: 0, badBox: [], boxChecks: 0, dance: 0, unfit: [], danceExact: 0, danceDiff: 0, half: 0, halfNear: 1e9 };
    const R = O.render;
    O.render = function (q) {
      try { return R.apply(this, arguments); } finally {
        if (q === D.C && cam && O.xr.isPresenting) {
          out.frames++;
          Fr.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
          let n = 0;
          for (const t of D.It.all) {
            const g = t.group; if (!g || g.gcOff !== true) continue; n++;
            // the truth: its matrices brought up to date, its exact box against the frame's real view
            out.boxChecks++; g.updateMatrixWorld(true); Bx.setFromObject(g);
            if (!Bx.isEmpty() && Fr.intersectsBox(Bx)) { g.getWorldPosition(V); out.badBox.length < 8 && out.badBox.push([out.frames, t.id || t.kind, V.toArray().map((x) => +x.toFixed(1))]); }
          }
          if (n) { out.offFrames++; out.offTotal += n; }
          // in the Event: every dancer in view was fitted (no fit left waiting) and its matrices equal a fresh walk
          if (D.me.active) for (const t of D.It.all) {
            const g = t.group; if (!g || g.gcOff === true || !(t.concertDance || t.planting)) continue;
            // P45 (4.0.53, the author's approved option): a far character is posed every other frame (every third
            // past 20 m); on its skipped frames its fit and matrices wait by design (B136). Such a frame is counted
            // apart and must be far (the game skips only past 10 m from the eye, to the body's centre)
            if (g.gcHalf === true) { out.half++; g.getWorldPosition(V); const dd = V.distanceTo(new T.Vector3().setFromMatrixPosition(cam.matrixWorld)); out.halfNear = Math.min(out.halfNear, dd); continue; }
            out.dance++; if (g.userData.gcFit) out.unfit.length < 6 && out.unfit.push([out.frames, t.id || t.kind]);
            if (out.dance % 7) continue;
            const a = []; g.traverse((o) => a.push(o.matrixWorld.elements.slice())); g.updateMatrixWorld(true);
            let d = 0; let i = 0; g.traverse((o) => { const e = o.matrixWorld.elements, p = a[i++]; for (let j = 0; j < 16; j++) d = Math.max(d, Math.abs(e[j] - p[j])); });
            out.danceExact++; out.danceDiff = Math.max(out.danceDiff, d);
          }
        }
      }
    };
    const inputs = (l) => X.setInputs(l), ctl = (hand, axes) => ({ handedness: hand, axes, buttons: [{}, {}, {}, {}, {}, {}, {}] });
    inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]); await wait(500);
    for (const [x, z] of [[21, 25], [-22, -23], [-15, 23], [5, -12]]) {
      D.At.position.set(x, D.At.position.y, z); X.pose.yaw = 0; await wait(600);
      // walk forward while sweeping the head (about 150 degrees a second), then snap turns
      inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
      for (let k = 0; k < 20; k++) { X.pose.yaw += 0.13; await wait(50); }
      inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
      for (let k = 0; k < 4; k++) { inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 1, 0])]); await wait(200); inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]); await wait(500); }
      for (let k = 0; k < 20; k++) { X.pose.yaw -= 0.2; await wait(40); }
    }
    // picking: a skipped character's matrices, brought up to date by the pick, equal a fresh walk
    const off = D.It.all.find((t) => t.group && t.group.gcOff === true);
    if (off) {
      const g = off.group, head = new T.Vector3(); D.B.getWorldPosition(head); g.getWorldPosition(V);
      const ray = new T.Ray(head, V.clone().sub(head).normalize());
      __gcOff.prep(off, ray);
      const a = []; g.traverse((o) => a.push(o.matrixWorld.elements.slice()));
      g.updateMatrixWorld(true);
      const b = []; g.traverse((o) => b.push(o.matrixWorld.elements.slice()));
      out.pick = { who: off.id || off.kind, nodes: a.length, same: a.every((m, i) => m.every((v, j) => Math.abs(v - b[i][j]) < 1e-9)) };
    }
    // the planting Event (P35): the dancers out of view skip their ground fit and are fitted when they come back
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    while (D.JGP.mist.p() < 1 && performance.now() - t0 < 150000) await wait(250);
    await wait(4000);
    for (const [x, z] of [[-28.3, -28.3], [26, -23], [-9, 35]]) {
      D.At.position.set(x, D.At.position.y, z); X.pose.yaw = Math.atan2(x, z); await wait(800);
      for (let k = 0; k < 16; k++) { X.pose.yaw += 0.25; await wait(120); }
      for (let k = 0; k < 3; k++) { inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 1, 0])]); await wait(200); inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]); await wait(600); }
    }
    out.event = D.me.active;
    // turned off: nothing stays skipped
    __gcOff.st.on = false; await wait(300);
    out.afterOff = D.It.all.filter((t) => t.group && t.group.gcOff === true).length;
    __gcOff.st.on = true;
    O.render = R;
    return out;
  });
  note(JSON.stringify(r).slice(0, 700));
  expect('after every frame no skipped character\'s exact box (matrices brought up to date) meets the frame\'s real view', !r.error && r.frames > 300 && r.boxChecks > 300 && r.badBox.length === 0, JSON.stringify({ frames: r.frames, checks: r.boxChecks, bad: r.badBox, error: r.error }));
  expect('characters are skipped (the saving is real)', !r.error && r.offFrames > r.frames * 0.5, JSON.stringify({ offFrames: r.offFrames, frames: r.frames, perFrame: r.offFrames ? +(r.offTotal / r.offFrames).toFixed(1) : 0 }));
  expect('picking: a skipped character the ray reaches has its matrices brought up to date', !r.error && r.pick && r.pick.same, JSON.stringify(r.pick));
  expect('the Event: every dancer in view has been fitted to the ground (none left waiting) and its matrices equal a fresh walk', !r.error && r.event && r.dance > 200 && r.unfit.length === 0 && r.danceExact > 20 && r.danceDiff < 1e-4, JSON.stringify({ event: r.event, dance: r.dance, unfit: r.unfit, exact: r.danceExact, diff: r.danceDiff }));
  expect('the Event: P45\'s planned skips (a far dancer posed every other frame) are all far from the player (B136)', !r.error && (r.half === 0 || r.halfNear >= 8.5), JSON.stringify({ half: r.half, nearest: +(+r.halfNear).toFixed(1) }));
  expect('turned off, no character stays skipped', !r.error && r.afterOff === 0, String(r.afterOff));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `OFF-VIEW TEST FAILED (${failures.length})` : 'OFF-VIEW TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
