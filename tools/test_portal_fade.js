// The Portal's swirl fades with the Portal in an Event, and the Portal waits for Nextessa (standard tier; 4.0.38; the
// author: "Please make sure that the Portal animation fades out with the Portal, if Nextessa hasn't passed through it
// (spawned in the Park) already. If Nextessa has passed through the Portal, do not fade it early, until she has passed
// back out of the Portal"). The swirl (its two planes, the rings and the light) is kept out of the Portal's fade group
// and drew at full strength while the frame round it faded. Two runs, each an Event with the Stone and the Seeds:
//   1. the Portal open and no one through it: as the Portal fades, the swirl's opacity follows the fade (never above
//      its open strength times the fade) and the swirl is hidden once the Portal is out;
//   2. the Portal open with Nextessa through it (her trip under way): the Portal does not fade, its swirl stays at
//      full strength, for 20 s of the Event's fades; once her trip is over (she is back out) the Portal fades out;
//   - no page errors.
//
//   node tools/test_portal_fade.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

const run = async (through) => {
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async (through) => {
    const D = window.__dbg, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const S = window.__gcSt, ot = D.ot; if (!S || !ot) return { error: 'no fader or portal' };
    const P = S.list.find((s) => s.name === 'portal'); if (!P) return { error: 'no portal group' };
    // the swirl: the Portal's textured see-through planes (not in the fade group)
    const fx = []; ot.g.traverse((o) => { if (o.isMesh && o.material && o.material.transparent && o.material.map && !P.mats.some(([m]) => m === o.material)) fx.push(o); });
    if (!fx.length) return { error: 'no swirl found' };
    ot.activate(); await wait(1500);
    if (through) ot.trip = { phase: 'met' };   // Nextessa through the Portal, in the Park
    const Kt = D.Kt; Kt.rewards.stone = true; Kt.rewards.seeds = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    t0 = performance.now(); while (D.me.active && J.mist.p() < 0.2 && performance.now() - t0 < 240000) await wait(200);
    const out = { started: D.me.active, trail: [], over: 0 };
    const sample = () => { const op = fx[0].material.opacity, vis = fx.every((o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }); out.trail.push([+P.f.toFixed(2), +op.toFixed(2), vis]); if (op > 0.93 * P.f + 0.02) out.over++; };
    t0 = performance.now(); while (D.me.active && performance.now() - t0 < 20000) { await wait(200); sample(); }
    if (through) {
      out.heldMin = Math.min(...out.trail.map((x) => x[0])); out.heldOp = Math.min(...out.trail.map((x) => x[1]));
      ot.trip = null; ot.close(); out.trail = []; out.over = 0;   // she is back out: the Portal closes and may now fade
      t0 = performance.now(); while (D.me.active && P.f > 0 && performance.now() - t0 < 30000) { await wait(200); sample(); }
    }
    out.endF = +P.f.toFixed(2); out.endVis = out.trail.length ? out.trail[out.trail.length - 1][2] : null;
    return out;
  }, through);
  await g.close(); return { r, errors };
};

(async () => {
  const { expect, note, failures } = reporter();
  const a = await run(false);
  note(JSON.stringify(a.r).slice(0, 600));
  expect('1: the Event started with the Portal open and no one through it', !a.r.error && a.r.started, String(a.r.error || ''));
  expect('1: the Portal fades out and its swirl fades with it (never brighter than the fade allows), then is hidden', !a.r.error && a.r.over === 0 && a.r.endF === 0 && a.r.endVis === false && a.r.trail.some(([f, op]) => f > 0.1 && f < 0.9 && op > 0.02 && op < 0.9), JSON.stringify((a.r.trail || []).filter((_, i) => i % 5 === 0)));
  const b = await run(true);
  note(JSON.stringify(b.r).slice(0, 600));
  expect('2: with Nextessa through the Portal, it does not fade and its swirl stays at full strength', !b.r.error && b.r.heldMin === 1 && b.r.heldOp > 0.85, JSON.stringify({ heldMin: b.r.heldMin, heldOp: b.r.heldOp }));
  expect('2: once she is back out, the Portal fades out', !b.r.error && b.r.endF === 0 && b.r.over === 0, JSON.stringify({ endF: b.r.endF, over: b.r.over }));
  expect('no page errors', a.errors.length === 0 && b.errors.length === 0, a.errors.concat(b.errors).slice(0, 3).join(' | '));
  console.log(failures.length ? `PORTAL FADE TEST FAILED (${failures.length})` : 'PORTAL FADE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
