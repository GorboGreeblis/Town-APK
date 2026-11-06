// No townsperson stays stuck (standard tier; B117, 4.0.58; the author: "Mushroom got stuck in the corner where his
// ramp meets the front of his desk ... he was still stuck there during the Event"; "He is facing inward, where he is
// stuck"). A townsperson walking to its Event spot that has not moved half a metre for 8 s, or one walking its way home
// in the town that has not moved for 15 s (Mushroom: 4 s anywhere), is moved to where it was going (with a sparkle,
// and logged). Here Mushroom is held in place while he walks to his Event spot:
//   - within 3-8 s he is moved on, walks on, and the move is logged;
//   - the others are not moved by it (none is moved while walking freely);
//   - no page errors.
//
//   node tools/test_unstick.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  await g.page.waitForTimeout(3000);
  const logs = []; g.page.on('console', (m) => { const t = m.text(); if (/unstuck:/.test(t)) logs.push(t); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const lines = []; const L0 = window.__gtLog; window.__gtLog = function (s) { if (/unstuck:/.test(s)) lines.push(s); return L0 && L0.apply(this, arguments); };
    const m = D.It.all.find((e) => e.id === 'drifter');   // Mushroom if (!m) return { error: 'no Mushroom' };
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    t0 = performance.now(); while (!(m.busy === 'finale' && m.finaleSlot && m.moving) && performance.now() - t0 < 30000) await wait(100);
    if (!m.finaleSlot) return { error: 'no Event spot', busy: m.busy };
    const p = m.group.position, hold = { x: p.x, z: p.z }, s = m.finaleSlot;
    const far = Math.hypot(hold.x - s.x, hold.z - s.z);
    const h = setInterval(() => { if (!lines.length && Math.hypot(p.x - hold.x, p.z - hold.z) < 3) { p.x = hold.x; p.z = hold.z; } }, 5);   // held until the safety moves him
    const st = []; t0 = performance.now(); while (!lines.length && performance.now() - t0 < 20000) { await wait(1000); st.push([+p.x.toFixed(1), +p.z.toFixed(1), +s.x.toFixed(1), +s.z.toFixed(1), m.moving, m.busy, !!m.dest, m.gcNav ? m.gcNav.length : 0, m.goHome, m.finaleSlot ? 1 : 0, m.gcUs ? +(D.Re.t - m.gcUs.t).toFixed(1) : null]); }
    clearInterval(h);
    const after = +((performance.now() - t0) / 1000).toFixed(1); await wait(2000); const moved = +Math.hypot(p.x - hold.x, p.z - hold.z).toFixed(1);
    return { far: +far.toFixed(1), after, moved, dist: +Math.hypot(p.x - s.x, p.z - s.z).toFixed(2), lines, st, id: m.id };
  });
  note(JSON.stringify(r));
  expect('Mushroom was held at least 3 m from his Event spot', !r.error && r.far > 3, r.error || String(r.far));
  expect('B117: held still while walking to his Event spot, Mushroom is moved on within 3-8 s and walks on (more than 3 m from where he was held 2 s later)', !r.error && r.after > 3 && r.after < 8 && r.moved > 3, JSON.stringify({ after: r.after, moved: r.moved }));
  expect('B117: the move is logged, and only his', !r.error && r.lines.length >= 1 && r.lines.every((l) => /unstuck: /.test(l)) && r.lines.filter((l) => !/drifter/.test(l)).length === 0, JSON.stringify(r.lines));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `UNSTICK TEST FAILED (${failures.length})` : 'UNSTICK TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
