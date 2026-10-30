// The Event's stands fade (standard tier; P33; the author: "What if we temporally hide kiosks during the Event? ...
// have them fade out and fade in", "never hide Somlet, The Church / Cave, and the Ancient as a rule. The Pond and
// Garden must always be unhidden as well", "Trees and the bird can also be hidden", "we can hide things as long as we
// give them time to fade out and then give them time to fade in", "We don't want to do it too quickly"). The park's
// stands (every building but the church) and the robin fade out during the Event and back after it, to save their draws
// while the Event plays. One Event, the player standing at the Garden's edge, sampled every 100 ms:
//   - the faded set is the six stands, Gemtoe's gazebo (a kiosk in all regards, the author) and every tree (the park's three
//     big ones, the robin's among them, and the town's trees outside the fence; one unit), never the church;
//   - no stand starts fading while its owner (a townsperson whose home is inside it) is within 6 m of home;
//   - a fade out takes at least 9 s (not quickly); every stand whose owner left is hidden while the Event dances;
//   - after the Event every stand is back in full, and none is still faded when its owner is back home;
//   - the church and Cave, the Ancient, the pond, Somlet and anything in the Garden are never in a faded group or share a
//     faded material, and the church, the Ancient, the pond and Somlet are never hidden during the run (the author: they
//     "can never fade out");
//   - the robin is in the same item as her tree (the author: "The Robin should always fade out and in with her tree");
//   - walking up to a hidden stand (10 m) brings it back within 3 s;
//   - no shader compiled inside a headset frame (the frame-hazard watch) and no page errors.
//
//   node tools/test_stands.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, C = D.C, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const S = window.__gcSt; if (!S) return { none: true };
    const top = (o) => { while (o.parent && o.parent !== C) o = o.parent; return o; };
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    // what must never hide: the church's groups, the Ancient, the pond's and the Garden's objects, Somlet
    const church = D.F.buildings.find((B) => B.name === 'church'), T = window.THREE, bx = new T.Box3(), v = new T.Vector3();
    const guard = [];
    // garden: everything in the Garden itself (the Event shows and hides its own objects there, so it is checked by
    // what the fader may touch, not by visibility); live: the church and Cave, the pond, the Ancient and Somlet
    const garden = [];
    // a faded group spread round the Garden (all the trees: its centre falls in the middle) counts as the Garden's only
    // if one of its vertices is in it
    const inGarden = (g0) => { let hit = false; g0.traverse((m) => { if (hit || !m.isMesh) return; m.updateMatrixWorld(true); const p = m.geometry.attributes.position; for (let i = 0; i < p.count && !hit; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); if (Math.hypot(v.x, v.z) < 15.7) hit = true; } }); return hit; };
    for (const o of C.children) { if (o === D.gcEB.root || o.userData.xrUI) continue; bx.setFromObject(o); if (bx.isEmpty()) continue; bx.getCenter(v); if (D.F.inHull(church, v.x, v.z) || (J.pondAt && Math.hypot(v.x - J.pondAt[0], v.z - J.pondAt[1]) < 4)) guard.push(o); else if (Math.hypot(v.x, v.z) < 15.7 && !(S.list.some((s) => s.gs.includes(o)) && !inGarden(o))) garden.push(o); }
    if (J.slug && J.slug.body) guard.push(J.slug.body);
    const som = D.It.byId.m_somlet; if (som) guard.push(som.group);
    // the robin fades with her tree (the author: "The Robin should always fade out and in with her tree"): one item
    // holds her and every tree the builder placed (window.__gcTreeAt), each with its carved triangles
    const tr = S.list.find((s) => s.name === 'trees and the robin'), K = window.__gcCarved || {};
    const robinWithTree = !!(tr && J.robin && tr.gs.includes(J.robin.group) && K.trees && tr.gs.includes(K.trees));
    const treeN = (window.__gcTreeAt || []).length;
    const out = { robinWithTree, treeN, names: S.list.map((s) => s.name), owners: Object.fromEntries(S.list.map((s) => [s.name, s.own.map((h) => h.id)])), guardN: guard.length, guardHidden: [], fadedGuard: [], early: [], fadeOut: {}, hiddenWhileDancing: [], lateReturn: [], endF: {}, near: null };
    const mats = new Set(); for (const s of S.list) for (const [m] of s.mats) mats.add(m);
    const faded = new Set(); for (const s of S.list) for (const g0 of s.gs) g0.traverse((x) => faded.add(x));
    out.inFaded = []; [...guard, ...garden].forEach((o) => { let hit = false; o.traverse((x) => { if (faded.has(x)) hit = true; }); for (let p = o; p; p = p.parent) if (faded.has(p)) hit = true; if (hit) out.inFaded.push(`#${C.children.indexOf(top(o))}`); });
    [...guard, ...garden].forEach((o) => o.traverse((x) => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) if (mats.has(m)) out.fadedGuard.push(`#${C.children.indexOf(top(x))} ${x.type} ${m.type}`); }));
    const H = window.__gtFrameHaz, c0 = H ? H.kinds.compileShader || 0 : 0;
    D.At.position.set(0, D.At.position.y, -17);   // the Garden's south edge: every stand over 14 m away
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50);
    const st = new Map(S.list.map((s) => [s, { start: null, zero: null }]));
    const home = (h) => Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z);
    let sawDance = false, nearDone = false;
    const tick = () => {
      const t = performance.now() / 1000;
      for (const s of S.list) {
        const k = st.get(s);
        if (s.f < 1 && k.start === null) { k.start = t; if (s.own.some((h) => home(h) < 6)) out.early.push(s.name); }
        if (s.f === 0 && k.zero === null && k.start !== null) { k.zero = t; out.fadeOut[s.name] = +(t - k.start).toFixed(1); }
        if (!D.me.active && s.f < 1 && s.own.some((h) => home(h) < 0.5)) out.lateReturn.push(s.name);
      }
      for (const o of guard) if (!shown(o)) out.guardHidden.push(`#${C.children.indexOf(top(o))} ${o.type}`);
    };
    while (D.me.active && performance.now() - t0 < 400000) {
      await wait(100); tick();
      const el = (performance.now() - t0) / 1000;
      if (!sawDance && el > 60 && S.list.filter((s) => s.own.every((h) => home(h) > 6)).every((s) => s.f === 0)) sawDance = true;
      // once the stands are hidden, walk up to one (the gallery, or the first hidden) and time its return
      if (sawDance && !nearDone) {
        const s = S.list.find((x) => x.name === 'gallery' && x.f === 0) || S.list.find((x) => x.f === 0);
        if (s) { const a = performance.now(); const p0 = D.At.position.clone(); D.At.position.set(s.x + (s.x > 0 ? -10 : 10), D.At.position.y, s.z); while (s.f < 1 && performance.now() - a < 8000) await wait(50); out.near = { name: s.name, s: +((performance.now() - a) / 1000).toFixed(1), f: s.f }; D.At.position.copy(p0); }
        nearDone = true;
      }
    }
    out.hiddenWhileDancing = sawDance;
    const t1 = performance.now(); while (performance.now() - t1 < 60000) { await wait(100); tick(); if (S.list.every((s) => s.f === 1)) break; }
    out.endF = Object.fromEntries(S.list.map((s) => [s.name, s.f]));
    out.compiles = H ? (H.kinds.compileShader || 0) - c0 : null;
    out.guardHidden = [...new Set(out.guardHidden)]; out.early = [...new Set(out.early)]; out.lateReturn = [...new Set(out.lateReturn)];
    return out;
  });
  await g.close();
  if (r.none) { expect('the stand fader exists (P33)', false); process.exit(1); }
  note(JSON.stringify({ names: r.names, owners: r.owners, fadeOut: r.fadeOut, near: r.near, endF: r.endF, guard: r.guardN }));
  expect('the faded set is the six stands, the gazebo, and all the trees with the robin; never the church', ['post', 'sheriff', 'garden', 'gallery', 'shop', 'juice', 'gazebo', 'trees and the robin'].every((n) => r.names.includes(n)) && !r.names.includes('church'), r.names.join(', '));
  expect('the robin and every tree (the park\'s and the town\'s) are one fade item', r.robinWithTree && r.treeN >= 60, `robin with tree ${r.robinWithTree}, ${r.treeN} trees`);
  expect('nothing that must stay (the church and Cave, the Ancient, the pond, Somlet, the Garden) is in or holds a faded group', r.inFaded.length === 0, r.inFaded.slice(0, 6).join(', '));
  expect('nothing that must stay shares a faded material', r.fadedGuard.length === 0, r.fadedGuard.slice(0, 6).join(', '));
  expect('no stand starts fading while its owner is within 6 m of home', r.early.length === 0, r.early.join(', '));
  expect('a fade out takes at least 9 s', Object.keys(r.fadeOut).length >= 3 && Object.values(r.fadeOut).every((s) => s >= 9), JSON.stringify(r.fadeOut));
  expect('every stand whose owner left is hidden while the Event dances', r.hiddenWhileDancing === true);
  expect('the church and Cave, the Ancient, the pond and Somlet are never hidden during the run', r.guardHidden.length === 0, r.guardHidden.slice(0, 6).join(', '));
  expect('walking up to a hidden stand brings it back within 3 s', r.near && r.near.f === 1 && r.near.s <= 3, JSON.stringify(r.near));
  expect('after the Event every stand is back in full', Object.values(r.endF).every((f) => f === 1), JSON.stringify(r.endF));
  expect('no stand is still faded when its owner is back home', r.lateReturn.length === 0, r.lateReturn.join(', '));
  expect('no shader compiled inside a headset frame', r.compiles === 0 || r.compiles === null, String(r.compiles));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `STANDS TEST FAILED (${failures.length})` : 'STANDS TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
