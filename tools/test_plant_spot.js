// Event flowers are planted only at the planter's own spot (standard tier; B123, 4.0.61; the author: "Somehow an
// Event Flower grew in front of Mushroom's ramp"). A dancer plants 0.9 m in front of where it stands still while the
// planting is live; nothing checked it stood at its spot in the ring, so one stopped on its way (Mushroom at the foot
// of his ramp) planted there. In an Event with the planting live:
//   - Mushroom standing still at the foot of his ramp (far from his spot) plants nothing;
//   - at his own spot he plants (the planting itself still works);
//   - the other planters' flowers are all at the Garden's ring (within 14 m of the town's centre);
//   - no page errors.
//
//   node tools/test_plant_spot.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  await g.page.waitForTimeout(2000);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const planted = []; const P0 = J.plantTick;
    J.plantTick = function (w) { const r0 = w.plantRound; const res = P0.apply(this, arguments); if (w.plantRound !== r0) { const p = w.group.position; planted.push([w.id, +Math.hypot(p.x, p.z).toFixed(1)]); } return res; };
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    const m = D.It.all.find((e) => e.id === 'drifter'); if (!m) return { error: 'no Mushroom' };
    t0 = performance.now(); while (!planted.length && performance.now() - t0 < 240000) await wait(250);
    if (!planted.length) return { error: 'the planting never started' };
    const round = D.It.all.map((e) => e.plantRound).find((v) => typeof v === 'number' && v >= 0);
    if (!m.finaleSlot) return { error: 'Mushroom has no Event spot', busy: m.busy };
    const foot = m.def.via[m.def.via.length - 2], p = m.group.position, slot = m.finaleSlot;
    const tryAt = (x, z) => { p.set(x, 0, z); m.moving = false; m.plantRound = -1; m.plantWait = [round, 0]; const r0 = m.plantRound; P0.call(J, m, D.Re.t + 5); return m.plantRound !== r0; };
    const atFoot = tryAt(foot[0], foot[1]);
    const atSlot = tryAt(slot.x, slot.z);
    const others = planted.filter(([id]) => id !== 'drifter');
    return { atFoot, atSlot, others: others.length, far: others.filter(([, d]) => d > 14) };
  });
  note(JSON.stringify(r));
  expect('B123: Mushroom standing still at the foot of his ramp (far from his spot) plants nothing', !r.error && r.atFoot === false, r.error || String(r.atFoot));
  expect('B123: at his own spot he plants', !r.error && r.atSlot === true, String(r.atSlot));
  expect('the other planters\' flowers are all at the Garden\'s ring (within 14 m of the centre)', !r.error && r.others > 0 && r.far.length === 0, JSON.stringify(r.far || r));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `PLANT SPOT TEST FAILED (${failures.length})` : 'PLANT SPOT TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
