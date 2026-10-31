// The Event's pizza boxes fade out at its end (standard tier; A42; the author: "Please ensure that pizza boxes on the
// ground fade out at the end of the Event. Pizza boxes currently pop out instead"). An Event is started with Snacks
// (and the Stone and Seeds); once its boxes are out it is ended, and the boxes are watched every 100 ms:
//   - the boxes are out during the Event (the ring of stacks, and Anomalee's open box);
//   - at the end they fade: their opacity steps down over more than a second (no frame where they go from fully
//     shown to gone), then they are removed and their materials are back to opaque;
//   - nothing else fades with them (Nextessa's box keeps its own materials: the Event's boxes have their own copies);
//   - no shader program is compiled for the fade (its see-through form is compiled while loading);
//   - no page errors.
//
//   node tools/test_pizza_fade.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const Kt = D.Kt; Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true;
    D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    const PZ = window.__gtPZ; t0 = performance.now(); while (PZ.count() === 0 && performance.now() - t0 < 120000) await wait(200);
    const out = { started: D.me.active, boxes: PZ.count() };
    // the boxes' meshes and the materials they draw with (the hook: the Event's box groups and the fade)
    const E = window.__gtPZE, meshes = []; E.groups().forEach((gr) => gr.traverse((o) => { if (o.isMesh) meshes.push(o); }));
    const mats = new Set(); meshes.forEach((m) => [].concat(m.material).forEach((x) => mats.add(x)));
    const copies = new Set(E.copies().values()); out.ownCopies = mats.size > 0 && [...mats].every((m) => copies.has(m));
    const progs0 = D.O.info.programs.length;
    // end the Event (its wrap-up), then watch the boxes
    D.me.wrap(); t0 = performance.now(); while (D.me.active && performance.now() - t0 < 60000) await wait(20);
    const trail = []; t0 = performance.now();
    while (performance.now() - t0 < 4000) { await wait(100); const inScene = meshes.filter((m) => { for (let p = m; p; p = p.parent) if (p === D.C) return true; return false; }).length; const op = Math.min(...[...mats].map((m) => m.opacity)); trail.push([Math.round(performance.now() - t0), inScene, +op.toFixed(2)]); }
    out.ended = !D.me.active; out.trail = trail; out.restored = [...mats].every((m) => m.opacity === 1);
    out.progs = D.O.info.programs.length - progs0;
    return out;
  });
  note(JSON.stringify(r).slice(0, 1200));
  const fading = r.trail.filter(([, n, op]) => n > 0 && op > 0.02 && op < 0.98);
  const goneAt = (r.trail.find(([, n]) => n === 0) || [null])[0];
  expect('the Event\'s pizza boxes are out during the Event', r.started && r.boxes > 0, `${r.boxes} box groups`);
  expect('the Event\'s boxes draw with their own copies of the materials (nothing else fades with them)', r.ownCopies === true, String(r.ownCopies));
  expect('at the end they fade out (opacity stepping down over more than a second), then they are removed', r.ended && fading.length >= 8 && goneAt !== null && goneAt >= 1000, JSON.stringify(r.trail.slice(0, 24)));
  expect('their materials are opaque again afterwards', r.restored, '');
  expect('no shader program compiled for the fade', r.progs === 0, String(r.progs));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `PIZZA FADE TEST FAILED (${failures.length})` : 'PIZZA FADE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
