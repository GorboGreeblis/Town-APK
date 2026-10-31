// The Garden's flower colours (standard tier; A29; the author: "can we randomize the flower colors for every Event?
// Each plant should have its own randomized color for all flowers on that plant, this randomized color should change
// for every Event and every subsequent Event"). Two Events: after each, every plant's flower colour (its material's
// tint) is read. Each plant has its own material; the plants' colours differ from each other; every plant's colour
// after the second Event differs from its colour after the first; the colour is changed only while the plant is shrunk
// away (never while it shows); petal vertices are marked on every kind's geometry; no shader compiled inside a headset
// frame (the per-plant materials share the one program compiled while loading); no page errors.
//
//   node tools/test_flower_tint.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, Ce = J.garden, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const H = window.__gtFrameHaz, c0 = H ? H.kinds.compileShader || 0 : 0;
    const tint = (p) => { const m = p.g.userData.gcM; return m ? m.userData.gcT.value.getHexString() : null; };
    const shownChange = []; const last = new Map();
    const watch = setInterval(() => { for (const p of Ce.plants) { const t = tint(p), o = last.get(p); if (o && o !== t && p.g.scale.x > 0.02) shownChange.push(+p.g.scale.x.toFixed(2)); last.set(p, t); } }, 16);
    const event = async () => {
      const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
      const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
      let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
      const started = D.me.active; t0 = performance.now(); while (D.me.active && performance.now() - t0 < 600000) await wait(500);
      await wait(2000); return started && !D.me.active;
    };
    const e1 = await event(); const a = Ce.plants.map(tint);
    const e2 = await event(); const b = Ce.plants.map(tint);
    clearInterval(watch);
    const mats = new Set(Ce.plants.map((p) => p.g.userData.gcM)), geos = (Ce.geos || []).filter(Boolean);
    return { e1, e2, n: Ce.plants.length, a, b, ownMats: mats.size, shownChange: shownChange.slice(0, 5),
      marked: geos.every((x) => x.attributes.gcB && x.attributes.gcB.array.some((v) => v > 0)), geoN: geos.length,
      compiles: H ? (H.kinds.compileShader || 0) - c0 : null };
  });
  note(JSON.stringify({ n: r.n, first: r.a, second: r.b }));
  expect('two Events ran to their end', r.e1 && r.e2);
  expect('the Garden has plants, each with a material of its own', r.n >= 3 && r.ownMats === r.n, `${r.n} plants, ${r.ownMats} materials`);
  expect('the plants\' flower colours differ from each other', new Set(r.a).size >= Math.max(2, r.n - 1), r.a.join(' '));
  expect('every plant\'s flower colour changed for the second Event', r.a.every((t, i) => t && r.b[i] && t !== r.b[i]), r.b.join(' '));
  expect('a plant\'s colour changes only while it is shrunk away', r.shownChange.length === 0, r.shownChange.join(', '));
  expect('every kind\'s geometry has its petals marked', r.geoN >= 5 && r.marked, `${r.geoN} geometries`);
  expect('no shader compiled inside a headset frame', r.compiles === 0 || r.compiles === null, String(r.compiles));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `FLOWER TINT TEST FAILED (${failures.length})` : 'FLOWER TINT TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
