// Backpacka (standard tier): while he is down at the pond in the planting Event (his show's 16-40 s), the player cannot walk
// into him (the author: "give Backpacka basic collision so that the user cannot move inside of her model"; "The lack of
// collision is only an issue while he is drinking from the pond"; "collision should not impact his drinking from the pond
// animations"). His module lists circles for the player only (`__gtBP.col()`): one round his feet, two along his body and one
// on each neck segment and his head, each counting once that part comes below head height and growing as it comes down.
//
// The Event is started, then his show is moved to 17 s (he is landing). Once he is down, his show is set to 26 s (drinking)
// before each walk and the player is walked into him with the left stick from four sides for 2.5 s each; checked every 50 ms: the player's body (0.6 m) never overlaps a circle
// by more than one frame's step, the walk was stopped (the player ends outside him), and he does not move (his place comes
// from his show alone). After he lifts off (show past 40 s) there are no circles. Also: no page errors.
//
//   node tools/test_backpacka.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  const inputs = (list) => page.evaluate((l) => window.__fakeXR.setInputs(l), list);
  const ctl = (hand, axes) => ({ handedness: hand, axes, buttons: [{}, {}, {}, {}, {}, {}, {}] });
  const started = await page.evaluate(async () => {
    const D = window.__dbg, BP = window.__gtBP, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true;
    D.oe.open(); await wait(400); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 15000) await wait(50);
    if (!D.me.active || !BP || !BP.col) return false;
    await wait(1500); BP.start(D.Re.t - 17);
    // down: the circle round his feet at its full size (it grows while he lands)
    const t1 = performance.now(); let last = 0;
    while (performance.now() - t1 < 30000) { const c = BP.col(); if (c.length > 3 && c[0].r > 0.5 && Math.abs(c[0].r - last) < 0.01) break; last = c.length ? c[0].r : 0; await wait(500); }
    return BP.col().length > 3;
  });
  expect('the Event starts and Backpacka lands at the pond (his circles appear)', started);
  const where = () => page.evaluate(() => {
    const D = window.__dbg, BP = window.__gtBP, p = D.At.position, R = BP.preview ? null : null;
    let over = 0; for (const c of BP.col()) over = Math.max(over, c.r + D.t.player.bodyR - Math.hypot(p.x - c.x, p.z - c.z));
    let root = null; D.C.traverse((o) => { if (!root && o.userData.jgpKeep && o.visible && o.children.length === 2) root = o; });
    return { over, n: BP.col().length, x: p.x, z: p.z, root: root ? [root.position.x, root.position.z] : null };
  });
  if (started) {
    const sides = [];
    for (const a of [0, 90, 180, 270]) {
      const setup = await page.evaluate(async (deg) => {
        const D = window.__dbg, BP = window.__gtBP, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        BP.start(D.Re.t - 26); window.__fakeXR.pose.yaw = deg * Math.PI / 180; await wait(1200);   // drinking, for every side
        const c = BP.col(); let cx = 0, cz = 0; for (const k of c) { cx += k.x / c.length; cz += k.z / c.length; }
        let R = 0; for (const k of c) R = Math.max(R, Math.hypot(k.x - cx, k.z - cz) + k.r);
        const yaw = D.we.headYaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);      // the stick's forward
        D.At.position.set(cx - fx * (R + 2.5), D.At.position.y, cz - fz * (R + 2.5));
        await wait(200);
        return { cx, cz, R };
      }, a);
      await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
      let worst = -9, root0 = null, rootMove = 0; const t0 = Date.now(); let w = null;
      while (Date.now() - t0 < 2500) { w = await where(); worst = Math.max(worst, w.over); if (w.root) { if (!root0) root0 = w.root; rootMove = Math.max(rootMove, Math.hypot(w.root[0] - root0[0], w.root[1] - root0[1])); } await new Promise((r) => setTimeout(r, 50)); }
      await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
      const endD = Math.hypot(w.x - setup.cx, w.z - setup.cz);
      sides.push({ a, worst: +worst.toFixed(3), endD: +endD.toFixed(2), R: +setup.R.toFixed(2), rootMove: +rootMove.toFixed(3), n: w.n });
    }
    note('walks into Backpacka (heading, deepest overlap with a circle in m, end distance from his middle, his extent, how far he moved): ' + sides.map((s) => `${s.a}: ${s.worst} / ${s.endD} of ${s.R} / ${s.rootMove}`).join(', '));
    expect('the player never walks into him: overlap with his circles at most one frame\'s step (0.07 m) from every side', sides.every((s) => s.worst <= 0.07), JSON.stringify(sides));
    expect('he was down at the pond for every walk (circles present)', sides.every((s) => s.n > 3), JSON.stringify(sides.map((s) => s.n)));
    expect('every walk was stopped at his edge (the player ends outside his extent)', sides.every((s) => s.endD >= s.R + 0.5), JSON.stringify(sides.map((s) => [s.endD, s.R])));
    expect('he is not moved by the player (his place comes from his show alone)', sides.every((s) => s.rootMove < 0.01), JSON.stringify(sides.map((s) => s.rootMove)));
    const after = await page.evaluate(async () => { const D = window.__dbg, BP = window.__gtBP; BP.start(D.Re.t - 44); await new Promise((r) => setTimeout(r, 1500)); return BP.col().length; });
    expect('no circles once he has lifted off (only the pond needs them)', after === 0, String(after));
  }
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `BACKPACKA TEST FAILED (${failures.length})` : 'BACKPACKA TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
