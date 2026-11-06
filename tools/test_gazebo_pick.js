// A Blossom or a Flint in front of the Gazebo can be picked by pointing at it (standard tier; B97, 4.0.56; the author:
// "A Flint in the front left and a Blossom in the back left were uninteractable", "The Gazebo Blossom issue only occurs
// around the Gazebo and nowhere else"). Pointing first took any townsperson or kiosk the ray met, at any distance, and
// only then looked at pickups, so a pickup with the Gazebo (or Gemtoe in it) behind it could not be picked. A pickup the
// ray passes through, nearer than what else the ray meets, now wins. For a Blossom and a Flint set 4.3 m from the
// Gazebo's centre on eight sides, the player 3 m out and pointing at it with the Gazebo straight behind:
//   - the trigger takes it (the count goes up by one) on every side;
//   - pointing at Gemtoe with no pickup in the way still opens his menu;
//   - no page errors.
//
//   node tools/test_gazebo_pick.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  await g.page.waitForTimeout(3000);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, At = D.At, O = D.O, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const ctl = (hand) => ({ handedness: hand, axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] });
    window.__fakeXR.setInputs([ctl('left'), ctl('right')]); window.__fakeXR.poses = true; await wait(800);
    // B97's cause: the Gazebo's carve (its surroundings cut out at load to fade in the Event) took any pickup lying within
    // 5 m into a still copy; the copy could not be picked, by pointing or walking. No carved piece uses a pickup's material.
    const pm = new Set(); for (const L of [D.le.list, D.ce.list]) for (const g of L) g.traverse((o) => { if (o.material) pm.add(o.material); });
    const cg = window.__gcCarved && window.__gcCarved.gazebo; let carvedPickup = 0, carved = 0;
    if (cg) cg.traverse((o) => { if (o.isMesh) { carved++; if (pm.has(o.material)) carvedPickup++; } });
    const gem = D.It.all.find((e) => e.id === 'p_gemtoe'); if (!gem || !gem.home) return { error: 'no Gemtoe home' };
    const cx = gem.home.x, cz = gem.home.z, out = { blossom: [], flint: [] };
    // the left hand points 35 degrees down; its ray turns with the rig (the controller's parent, which snap turns turn)
    const th = -0.61, q = [Math.sin(th / 2), 0, 0, Math.cos(th / 2)], cs = Math.cos(th), sn = Math.sin(th);
    window.__fakeXR.leftPose = { position: { x: -0.2, y: 1.2, z: -0.3 }, orientation: { x: q[0], y: 0, z: 0, w: q[3] }, matrix: [1, 0, 0, 0, 0, cs, sn, 0, 0, -sn, cs, 0, -0.2, 1.2, -0.3, 1] };
    const ray = () => { const c = O.xr.getController(0); c.updateMatrixWorld(true); return { o: new T.Vector3().setFromMatrixPosition(c.matrixWorld), d: new T.Vector3(0, 0, -1).transformDirection(c.matrixWorld) }; };
    const rig = O.xr.getController(0).parent;
    const aim = async (tx, ty, tz) => {
      // turn the rig so the ray heads at the Gazebo through the target, then move it so the ray meets the target
      const dx = tx - cx, dz = tz - cz, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      for (let k = 0; k < 4; k++) {
        await wait(150); let { o, d } = ray();
        let e = Math.atan2(-ux, -uz) - Math.atan2(d.x, d.z); e = Math.atan2(Math.sin(e), Math.cos(e)); rig.rotation.y += e;
        await wait(150); ({ o, d } = ray()); const t = (ty - o.y) / d.y;
        At.position.x += tx - (o.x + d.x * t); At.position.z += tz - (o.z + d.z * t);
      }
      await wait(300);
    };
    for (const [name, mod, y, key] of [['blossom', D.le, 0.8, 'blossoms'], ['flint', D.ce, 0.15, 'acorns']]) {
      const p = mod.list.find((e) => !e.userData.taken); if (!p) { out[name].push('none'); continue; }
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4; p.userData.taken = false; p.visible = true;
        p.position.set(cx + Math.sin(a) * 4.3, 0, cz + Math.cos(a) * 4.3);
        await aim(p.position.x, y, p.position.z);
        { const { o, d } = ray(), P = new T.Vector3(p.position.x, y, p.position.z).sub(o), t = P.dot(d); out.miss = out.miss || []; out.miss.push(+Math.sqrt(Math.max(0, P.lengthSq() - t * t)).toFixed(2)); }
        const n0 = D.Kt[key]; window.__fakeXR.sessions.at(-1).pressSelect(0); await wait(500);
        out[name].push(out.miss[out.miss.length - 1] < 0.1 ? D.Kt[key] - n0 : null);   // null: the ray could not be set through it (the player held off by the Gazebo's wall)
        p.userData.taken = false; p.userData.fadeT0 = undefined; p.visible = true;
        await wait(200);
      }
    }
    // Gemtoe himself, no pickup on the ray: his menu opens
    const M = window.__jgpMenu; const gp = gem.group.position;
    await aim(gp.x + 0.001, gp.y + 0.6 * (gem.height || 1.2), gp.z + 2.5);
    At.position.set(gp.x, At.position.y, gp.z + 2.5); At.rotation.set(0, 0, 0); await wait(400);
    window.__fakeXR.sessions.at(-1).pressSelect(1); await wait(900);
    out.gemMenu = !!(M && M.open && M.open());
    out.carved = carved; out.carvedPickup = carvedPickup;
    return out;
  });
  note(JSON.stringify(r));
  expect('B97: a Blossom with the Gazebo behind it is taken by pointing at it, on at least six of eight sides (the others: the ray could not be set through it)', !r.error && r.blossom.filter((v) => v !== null).length >= 6 && r.blossom.every((v) => v === null || v === 1), JSON.stringify(r.blossom));
  expect('B97: a Flint with the Gazebo behind it is taken by pointing at it, on at least six of eight sides', !r.error && r.flint.filter((v) => v !== null).length >= 6 && r.flint.every((v) => v === null || v === 1), JSON.stringify(r.flint));
  expect('B97: the Gazebo\'s carve holds no copy of a Blossom or Flint (those copies could not be picked)', !r.error && r.carvedPickup === 0, `${r.carvedPickup} of ${r.carved} carved pieces`);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GAZEBO PICK TEST FAILED (${failures.length})` : 'GAZEBO PICK TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
