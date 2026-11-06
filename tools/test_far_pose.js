// Far characters posed every other frame (P45, 4.0.53) never draw a broken pose (standard tier; B114, 4.0.54: the
// author: "From a distance: Fortizmo's arms now glitch out as she plays the horn during the Event"). Fortizmo's horn
// pose resets her arms, forces a matrix update of her body and then aims the arms with their rotations; on a skipped
// frame her arms were drawn at rest while her body held the horn (up to 1.9 m off, every other frame). She is now posed
// every frame while her horn is up. In an Event, with her horn up, the player 40 m from her and facing her:
//   - P45 is on and she is far: never skipped while her horn is up;
//   - every one of her meshes is drawn where a full update of her puts it (to 1 mm);
//   - the other far characters are skipped on alternate frames (P45 still works);
//   - no page errors.
//
//   node tools/test_far_pose.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  await g.page.waitForTimeout(3000);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, X = window.__fakeXR, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true;
    D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    const f = D.It.all.find((e) => e.hornK !== undefined);
    if (!f) return { error: 'no horn player' };
    t0 = performance.now(); while (!(f.hornK > 0.9 && f.hornPlaying) && performance.now() - t0 < 120000) await wait(200);
    if (!(f.hornK > 0.9)) return { error: 'the horn never came up' };
    const p = f.group.position, dx = p.x > 0 ? -1 : 1;
    D.At.position.x = p.x + dx * 40; D.At.position.z = p.z; X.pose.yaw = Math.atan2(D.At.position.x - p.x, D.At.position.z - p.z);
    await wait(1500);
    const meshes = []; f.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const V = new THREE.Vector3, W = new THREE.Vector3;
    let skipped = 0, worst = 0, othersSkipped = 0, frames = 0;
    for (let k = 0; k < 80; k++) {
      const f0 = X.frames; while (X.frames < f0 + 1) await wait(2); frames++;
      if (f.group.gcHalf) skipped++;
      for (const e of D.It.all) if (e !== f && e.group && e.group.gcHalf) { othersSkipped++; break; }
      const before = meshes.map((m) => m.matrixWorld.clone());
      f.group.updateMatrixWorld(true);
      meshes.forEach((m, i) => { V.setFromMatrixPosition(before[i]); W.setFromMatrixPosition(m.matrixWorld); worst = Math.max(worst, V.distanceTo(W)); });
    }
    return { dist: +Math.hypot(p.x - D.At.position.x, p.z - D.At.position.z).toFixed(1), hornK: +f.hornK.toFixed(2), frames, skipped, worst: +worst.toFixed(4), othersSkipped, half: window.__gcHalf !== false };
  });
  note(JSON.stringify(r));
  expect('the horn came up and the player stood 40 m from her', !r.error && r.hornK > 0.9 && r.dist > 30, r.error || JSON.stringify(r));
  expect('B114: Fortizmo is never skipped while her horn is up (posed every frame)', !r.error && r.skipped === 0, `${r.skipped} of ${r.frames} frames skipped`);
  expect('B114: every one of her meshes is drawn where a full update puts it (to 1 mm)', !r.error && r.worst < 0.001, `${r.worst} m`);
  expect('P45 still skips the other far characters on alternate frames', !r.error && r.half && r.othersSkipped > 10, `${r.othersSkipped} frames with another character skipped`);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `FAR POSE TEST FAILED (${failures.length})` : 'FAR POSE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
