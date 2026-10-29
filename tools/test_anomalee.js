// Anomalee in the planting Event (standard tier; the author: "without the Pizza (snacks): Anomalee plants like all
// other NPCs, instead of doing an eating animation. With Pizza (snacks): Anomalee should be eating pizza instead of
// planting"). Two Events, one without Snacks and one with them (fast simulation); during each, every 200 ms:
//   - the plants that appear within 1.6 m of her (hers), and whether she has served herself a pizza box (the box the
//     Event's pizza adds beside her, `__gtPZ.where()` past the count before the Event);
//   - her planting motion (`plantMove`): "dig" (like the others) or "eat";
// expected: without Snacks she plants (at least one plant of hers), never serves a box, and digs; with Snacks she
// serves her box, plants nothing, and eats; no page errors.
//
//   node tools/test_anomalee.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1000);
    const an = D.It.byId.blinker;
    // her motion: "dig" moves her forward (rx and z), "eat" bobs her head over the box (rx, y and rz, no z)
    const kind = () => { const a = J.plantMove('blinker', 0.3); return 'z' in a ? 'dig' : ('rz' in a && 'y' in a ? 'eat' : 'other'); };
    const run = async (snacks) => {
      Kt.rewards.stone = Kt.rewards.seeds = true; Kt.rewards.snacks = snacks;
      const box0 = window.__gtPZ.where().length;
      D.oe.open(); await wait(400);
      const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
      let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(30);
      const out = { snacks, started: D.me.active, mine: 0, served: 0, motion: kind() };
      const seen = new Set(J.garden.plants.map((p) => p.g));
      t0 = performance.now();
      while (D.me.active && performance.now() - t0 < 400000) {
        await wait(200);
        const p = an.group.position;
        for (const pl of J.garden.plants) if (!seen.has(pl.g)) { seen.add(pl.g); if (Math.hypot(pl.g.position.x - p.x, pl.g.position.z - p.z) < 1.6) out.mine++; }
        out.served = Math.max(out.served, window.__gtPZ.where().length - box0);
      }
      t0 = performance.now(); while (performance.now() - t0 < 6000) await wait(100);
      return out;
    };
    const a = await run(false), b = await run(true);
    clearInterval(window.__adv);
    return { a, b };
  });
  await g.close();
  note(`without Snacks: ${JSON.stringify(r.a)}; with Snacks: ${JSON.stringify(r.b)}`);
  expect('both Events started', r.a.started && r.b.started);
  expect('without Snacks she plants like the others (a plant of hers, no pizza box served, digging)', r.a.mine >= 1 && r.a.served === 0 && r.a.motion === 'dig', JSON.stringify(r.a));
  expect('with Snacks she eats pizza instead (her box served, no plant of hers, eating)', r.b.served >= 1 && r.b.mine === 0 && r.b.motion === 'eat', JSON.stringify(r.b));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `ANOMALEE TEST FAILED (${failures.length})` : 'ANOMALEE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
