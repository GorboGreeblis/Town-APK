#!/usr/bin/env node
/**
 * Input and locomotion inside a fake VR session (tools/fakexr.js controllers):
 *   - left stick forward moves the player at about t.player.speed
 *   - dead-zone: a tiny deflection does not move
 *   - right stick sideways snap-turns the view by t.xr.snapAngle once per
 *     deflection (no repeat while held), and again after re-centering
 *   - trigger (select) and grip (squeeze) events do not throw
 *   - the player cannot walk through a building hull
 *
 * Usage: node tools/test_input.js [file.html]
 */
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2];

(async () => {
  const g = await boot({ file, vr: true });
  const { page } = g;
  const { failures, expect } = reporter();
  const mark = (label) => { const n = g.errors.length; if (n) console.log(`  errors so far (${n}) before '${label}': ${g.errors.slice(-2).join(' | ')}`); };
  console.log(`booted in ${g.bootS.toFixed(1)}s, presenting after ${g.presentS.toFixed(1)}s`);

  const yawOf = () => page.evaluate(() => window.__dbg.we.headYaw);   // world yaw of the head (rig + head)
  const posOf = () => page.evaluate(() => { const p = window.__dbg.At.position; return [p.x, p.z]; });
  const inputs = (list) => page.evaluate((l) => window.__fakeXR.setInputs(l), list);
  const ctl = (hand, axes, buttons) => ({ handedness: hand, axes, buttons: buttons || [{}, {}, {}, {}, {}, {}, {}] });

  // Controllers appear (the game binds them on inputsourceschange / per frame).
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(1500);
  const bound = await page.evaluate(() => { const s = window.__fakeXR.sessions.at(-1); return s.inputSources.length; });
  expect('two fake controllers visible to the session', bound === 2, `${bound}`);
  // Focus-aware (VRC.Quest.Input.4, B24): while the session is "visible-blurred" (system UI up) the game hides
  // the controller rays and hand meshes and ignores input; on return they are visible again.
  const blur = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O; const X = window.__gtXR; const sess = X && X.session; const real = sess && (sess.__real || sess);
    const vis = () => [0, 1].map((i) => O.xr.getController(i).visible || O.xr.getControllerGrip(i).visible);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__fakeXR.poses = true;   // give the fake controllers poses so three.js shows them
    await wait(400); const before = vis();
    real.setVisibility('visible-blurred'); await wait(400); const during = vis(), blurred = D.we.blurred;
    real.setVisibility('visible'); await wait(600); const after = vis();
    window.__fakeXR.poses = false;
    return { before, during, after, blurred };
  });
  expect('focus-aware: controllers shown, hidden while the session is blurred, shown again after', blur.before.every(Boolean) && blur.during.every((v) => !v) && blur.blurred === true && blur.after.every(Boolean), JSON.stringify(blur));

  mark('dead-zone');
  // Dead-zone.
  let p0 = await posOf();
  await inputs([ctl('left', [0, 0, 0.05, -0.05]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(2000);
  let p1 = await posOf();
  expect('tiny stick deflection inside the dead-zone does not move the player', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05, `${Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(3)} m`);

  mark('walk');
  // Walk forward 3 s.
  const speed = await page.evaluate(() => window.__dbg.t.player.speed);
  p0 = await posOf();
  await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(3000);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  p1 = await posOf();
  const walked = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  expect(`left stick forward walks the player (expected about ${(speed * 3).toFixed(1)} m in 3 s, software GL may undershoot)`, walked > speed * 3 * 0.3 && walked < speed * 3 * 1.5, `${walked.toFixed(2)} m`);

  mark('snap');
  // Snap turn: one step per deflection.
  const snap = await page.evaluate(() => window.__dbg.t.xr.snapAngle);
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const y0 = await yawOf();
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 1, 0])]);
  await page.waitForTimeout(2500);
  const y1 = await yawOf();
  expect('right stick held sideways snap-turns exactly one step', Math.abs(Math.abs(norm(y1 - y0)) - snap) < 0.05, `${(norm(y1 - y0) * 180 / Math.PI).toFixed(1)} deg vs ${(snap * 180 / Math.PI).toFixed(0)}`);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(800);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 1, 0])]);
  await page.waitForTimeout(1500);
  const y2 = await yawOf();
  expect('re-centre then deflect again turns a second step', Math.abs(Math.abs(norm(y2 - y0)) - 2 * snap) < 0.08, `${(norm(y2 - y0) * 180 / Math.PI).toFixed(1)} deg`);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);

  mark('select');
  // Select / squeeze events.
  const evOk = await page.evaluate(() => { try { const s = window.__fakeXR.sessions.at(-1); s.pressSelect(1); for (const t of ['squeezestart', 'squeezeend']) { const e = new Event(t); e.inputSource = s.inputSources[1]; s.dispatchEvent(e); } return true; } catch (e) { return String(e); } });
  expect('trigger and grip events are handled without throwing', evOk === true, String(evOk));

  mark('hull');
  // Walk into a building: place the player 3 m in front of a hull, walk 6 s, must remain outside.
  const hull = await page.evaluate(() => {
    const D = window.__dbg, F = D.F, B = F.buildings[0];
    const [wx, wz] = F.world(B, 0, B.hull[3] + 3);      // 3 m outside the "front" edge
    D.At.position.set(wx, D.At.position.y, wz);
    return { name: B.name, wx, wz };
  });
  // Face the building: snap until the camera looks toward it (coarse: just push forward and also backward).
  await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(4000);
  await inputs([ctl('left', [0, 0, 0, 1]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(4000);
  await inputs([]);
  const inside = await page.evaluate(() => { const D = window.__dbg, p = D.At.position; return D.F.buildings.filter((B) => D.F.inHull(B, p.x, p.z, -0.05)).map((B) => B.name); });
  expect('player never ends up inside a building hull', inside.length === 0, JSON.stringify(inside));

  mark('end');
  mark('collision');
  // Body collision: stand 1.2 m from a standing townsperson and push into them for 2 s.
  const col = await page.evaluate(async () => {
    const D = window.__dbg, At = D.At;
    const npc = D.It.all.find((h) => h.def && h.def.at && h.home && !h.busy && !h.visiting && Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z) < 1) || D.It.all.find((h) => h.def && h.def.at);
    if (!npc) return { error: 'no standing npc' };
    const n = npc.group.position; const yaw = D.we.headYaw;
    // place the player 1.2 m "behind" the walking direction so that walking forward runs into the npc
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    At.position.set(n.x - fx * 1.2, At.position.y, n.z - fz * 1.2);
    const d0 = Math.hypot(At.position.x - n.x, At.position.z - n.z);
    return { name: npc.def.name, d0: +d0.toFixed(2), fx: +fx.toFixed(2), fz: +fz.toFixed(2) };
  });
  let minD = 9;
  if (!col.error) {
    await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
    const t0 = Date.now();
    while (Date.now() - t0 < 2000) { const d = await page.evaluate((name) => { const D = window.__dbg, h = D.It.all.find((x) => x.def && x.def.name === name); return h ? Math.hypot(D.At.position.x - h.group.position.x, D.At.position.z - h.group.position.z) : 9; }, col.name); minD = Math.min(minD, d); await new Promise((r) => setTimeout(r, 100)); }
    await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  }
  expect(`body collision: walking into ${col.name || '?'} never overlaps (min distance ${minD.toFixed(2)} m)`, !col.error && minD > 0.7, JSON.stringify(col));

  mark('bounds');
  // Park bounds: start 3 m inside the clearing edge, walk outward for 3 s, must stay inside.
  const bnd = await page.evaluate(() => {
    const D = window.__dbg, At = D.At, R = D.t.clearingR, yaw = D.we.headYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);        // walking direction (stick forward)
    At.position.set(fx * (R - 3), At.position.y, fz * (R - 3));   // start on the side the stick walks toward
    return { R, r0: +Math.hypot(At.position.x, At.position.z).toFixed(1) };
  });
  await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
  await new Promise((r) => setTimeout(r, 3000));
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  const pb = await page.evaluate(() => { const D = window.__dbg, t = D.t; return { x: +D.At.position.x.toFixed(1), z: +D.At.position.z.toFixed(1), half: t.parkHalf, south: t.parkSouth }; });
  const insidePark = Math.abs(pb.x) <= pb.half + 0.3 && pb.z >= -pb.half - 0.3 && pb.z <= pb.south + 0.3;
  expect(`park bounds: walking outward for 3 s stays inside the park rectangle (ended at ${pb.x},${pb.z}; |x|<=${pb.half}, ${-pb.half}<=z<=${pb.south})`, insidePark && Math.hypot(pb.x, pb.z) >= bnd.r0 - 0.5, JSON.stringify(pb));

  mark('menu');
  // Controller pick + menu: put a townsperson on the right controller's ray 2.5 m ahead, press select, choose "Talk".
  const menu = await page.evaluate(async () => {
    const D = window.__dbg, At = D.At, O = D.O; const out = {};
    const c = O.xr.getController(1); c.updateMatrixWorld(true);
    const dir = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld); dir.y = 0; dir.normalize();
    const npc = D.It.all.find((h) => h.def && h.def.at && h.home && !h.busy && !h.visiting && Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z) < 1) || D.It.all.find((h) => h.def && h.def.at);
    if (!npc) return { error: 'no standing npc' };
    const n = npc.group.position; At.position.set(n.x - dir.x * 2.5, At.position.y, n.z - dir.z * 2.5);
    await new Promise((r) => setTimeout(r, 600));                 // let the rig follow the player
    const s = window.__fakeXR.sessions.at(-1); s.pressSelect(1);
    await new Promise((r) => setTimeout(r, 400));
    out.name = npc.def.name; out.open = !!(window.__jgpMenu && window.__jgpMenu.open()); out.labels = window.__jgpMenu ? window.__jgpMenu.labels() : [];
    const k = out.labels.findIndex((l) => /^Talk to /.test(l));
    if (out.open && k >= 0) { window.__jgpMenu.choose(k); await new Promise((r) => setTimeout(r, 300)); out.dialogue = !!D.qt.isOpen; }
    return out;
  });
  expect(`controller select opens the interaction menu on ${menu.name || '?'}`, !menu.error && menu.open === true && menu.labels.some((l) => /^Talk to /.test(l)), JSON.stringify(menu));
  expect('choosing "Talk to" from the menu opens the dialogue', menu.dialogue === true, JSON.stringify(menu));

  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `INPUT TEST FAILED (${failures.length})` : 'INPUT TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('INPUT TEST ERROR', e); process.exit(1); });
