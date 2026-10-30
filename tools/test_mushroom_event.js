// Mushroom in the planting Event (standard tier; the author: "Mushroom was observed being stuck on his desk during the
// Event. He was jittering and above the ramp part of his desk"; FIXES F-B52). When the Event starts he leaves his desk
// by his ramp (desk top, landing, down its middle) and walks to his spot; when it ends he goes home by the ramp.
// One Event (fast simulation), every 100 ms:
//   - wherever he is over his kiosk, his height is the kiosk's surface there within 8 cm once settled (never left
//     standing in the air over the ramp, never dropped off its side);
//   - he is never still on the kiosk for 3 s or more while he still has somewhere to go;
//   - he gets within 2 m of his Event spot;
//   - 25 s after the Event he is home on top of his desk (within 0.8 m, height 1.5 m or more);
//   - no page errors.
//
//   node tools/test_mushroom_event.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1000);
    const m = D.It.byId.drifter, ry = m.def.rampY, [kx, kz, c, s] = ry.k, p = m.group.position;
    const onKiosk = () => { const dx = p.x - kx, dz = p.z - kz, j = dx * c - dz * s, k = dx * s + dz * c; return j > -3.2 && j < 3.2 && k > -2.7 && k < 3.2; };
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(30);
    const out = { started: D.me.active, off: [], still: 0, near: 99 };
    let lastMove = performance.now(), prev = [p.x, p.z, p.y], settle = 0;
    while (D.me.active && performance.now() - t0 < 400000) {
      await wait(100);
      const moved = Math.hypot(p.x - prev[0], p.z - prev[1]) > 0.01 || Math.abs(p.y - prev[2]) > 0.01; prev = [p.x, p.z, p.y];
      if (moved) lastMove = performance.now();
      if (onKiosk()) {
        const want = Math.max(0, ry(p.x, p.z, p.y)), d = Math.abs(p.y - want);
        settle = d > 0.08 ? settle + 1 : 0;   // the follower eases at 4 m/s: a step of a few cm settles in a frame or two
        if (settle >= 3 && out.off.length < 5) out.off.push([+p.x.toFixed(2), +p.z.toFixed(2), +p.y.toFixed(2), +want.toFixed(2)]);
        const slot = m.finaleSlot, far = slot && Math.hypot(p.x - slot.x, p.z - slot.z) > 1.5;
        if (far && performance.now() - lastMove > 3000) out.still++;
      }
      if (m.finaleSlot) out.near = Math.min(out.near, Math.hypot(p.x - m.finaleSlot.x, p.z - m.finaleSlot.z));
    }
    out.ended = !D.me.active;
    t0 = performance.now(); while (performance.now() - t0 < 25000) await wait(200);
    out.home = +Math.hypot(p.x - m.home.x, p.z - m.home.z).toFixed(2); out.y = +p.y.toFixed(2); out.near = +out.near.toFixed(2);
    clearInterval(adv);
    return out;
  });
  await g.close();
  note(JSON.stringify(r));
  expect('the Event started and ended', r.started && r.ended);
  expect('over his kiosk his height is always its surface (never in the air over the ramp, never off its side)', r.off.length === 0, JSON.stringify(r.off));
  expect('never stuck on the kiosk (still 3 s or more with somewhere to go)', r.still === 0, String(r.still));
  expect('he reaches his Event spot (within 2 m)', r.near < 2, String(r.near));
  expect('after the Event he is home on top of his desk', r.home < 0.8 && r.y >= 1.5, JSON.stringify({ home: r.home, y: r.y }));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `MUSHROOM EVENT TEST FAILED (${failures.length})` : 'MUSHROOM EVENT TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
