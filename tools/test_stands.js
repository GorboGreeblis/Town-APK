// The Event's stands fade (standard tier; P33; the author: "What if we temporally hide kiosks during the Event? ...
// have them fade out and fade in", "never hide Somlet, The Church / Cave, and the Ancient as a rule. The Pond and
// Garden must always be unhidden as well", "Trees and the bird can also be hidden", "we can hide things as long as we
// give them time to fade out and then give them time to fade in", "We don't want to do it too quickly"). The park's
// stands (every building but the church) and the robin fade out during the Event and back after it, to save their draws
// while the Event plays. One Event, the player standing at the Garden's edge, sampled every 100 ms:
//   - the faded set is the six stands, Gemtoe's gazebo (a kiosk in all regards, the author), the phone booth and the portal (kiosks too, the author) and every tree (the park's three
//     big ones, the robin's among them, and the town's trees outside the fence; one unit), never the church;
//   - no stand starts fading while its owner (a townsperson whose home is inside it) is within 6 m of home; once out, it
//     stays out until the Event ends;
//   - a fade out takes at least 9 s (not quickly); every stand whose owner left is hidden while the Event dances;
//   - after the Event every stand is back in full, and none fades out again on its way back;
//   - no character is in a faded group (every townsperson, and Sparkakus, built inside his library: "the same as all
//     other NPCs"), and Sparkakus is shown while the Event dances;
//   - the church and Cave, the Ancient, the pond, Somlet and anything in the Garden are never in a faded group or share a
//     faded material, and the church, the Ancient, the pond and Somlet are never hidden during the run (the author: they
//     "can never fade out");
//   - the robin is in the same item as her tree (the author: "The Robin should always fade out and in with her tree");
//   - walking up to a hidden stand leaves it hidden (nothing comes back until the Event ends; the author, 2026-10-30),
//     and a townsperson put inside it is out of it once it is back after the Event (the fade-in safety);
//   - the portal's blue effect still shows when the portal opens (F-B71);
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
    // every character is like every other NPC (the author: "Sparkakus really should be the same as all other NPCs"):
    // no townsperson and no marked character (Sparkakus, built inside his library) is in a faded group
    const chars = []; C.traverse((x) => { if ((x.userData && x.userData.gcChar) || D.It.all.some((h) => h.group === x)) chars.push(x); });
    out.charsFaded = chars.filter((x) => { for (let p = x; p; p = p.parent) if (faded.has(p)) return true; return false; }).map((x) => (D.It.all.find((h) => h.group === x) || { id: 'Sparkakus' }).id);
    out.charN = chars.length; const spark = chars.find((x) => x.userData && x.userData.gcChar);
    out.inFaded = []; [...guard, ...garden].forEach((o) => { let hit = false; o.traverse((x) => { if (faded.has(x)) hit = true; }); for (let p = o; p; p = p.parent) if (faded.has(p)) hit = true; if (hit) out.inFaded.push(`#${C.children.indexOf(top(o))}`); });
    [...guard, ...garden].forEach((o) => o.traverse((x) => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) if (mats.has(m)) out.fadedGuard.push(`#${C.children.indexOf(top(x))} ${x.type} ${m.type}`); }));
    // the portal's blue effect still opens (the pizza order; F-B71: its materials had been copied by the group's set-up)
    { const ot = D.ot; ot.activate(); await wait(2000); const fx = []; ot.g.traverse((o) => { if (o.isMesh && o.material && o.material.transparent && o.material.map) fx.push(o.material.opacity); }); out.portalFx = fx.map((v) => +v.toFixed(2)); ot.close(); await wait(1000); }
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
        // after the Event every stand only comes back (never fades out again)
        if (!D.me.active && k.lastF !== undefined && s.f < k.lastF) out.lateReturn.push(s.name);
        k.lastF = D.me.active ? undefined : s.f;
      }
      for (const o of guard) if (!shown(o)) out.guardHidden.push(`#${C.children.indexOf(top(o))} ${o.type}`);
    };
    while (D.me.active && performance.now() - t0 < 600000) {
      await wait(100); tick();
      const el = (performance.now() - t0) / 1000;
      if (!sawDance && el > 60 && S.list.filter((s) => s.own.every((h) => home(h) > 6)).every((s) => s.f === 0)) { sawDance = true; out.sparkShown = spark ? shown(spark) : null; }
      // once the stands are hidden, walk up to one (the gallery, or the first hidden) and time its return
      if (sawDance && !nearDone) {
        const s = S.list.find((x) => x.name === 'gallery' && x.f === 0) || S.list.find((x) => x.f === 0);
        // the fade-in safety: a townsperson (not one who lives there) standing inside the hidden kiosk is out of it once
        // it is back (the author: "What happens if NPCs or the player are standing in the areas where kiosks ... fade back in?")
        const intr = s && s.B && D.It.all.find((h) => h.group && h.def && !s.own.includes(h) && !(h.home && D.F.inHull(s.B, h.home.x, h.home.z)) && h.id !== 'p_gemtoe');
        if (intr) { intr.group.position.set(s.x, 0, s.z); out.intruder = { id: intr.id, inAtStart: D.F.inHull(s.B, s.x, s.z), kiosk: s }; }
        // walking up to a hidden stand leaves it hidden (the author: "Just keep everything faded out until things fade
        // back in. I don't care if there is invisible collision")
        if (s) { const p0 = D.At.position.clone(); D.At.position.set(s.x + (s.x > 0 ? -6 : 6), D.At.position.y, s.z); await wait(5000); out.near = { name: s.name, f: s.f }; D.At.position.copy(p0); }
        nearDone = true;
      }
    }
    out.hiddenWhileDancing = sawDance; out.eventEnded = !D.me.active; out.eventS = Math.round((performance.now() - t0) / 1000);
    // up to 3 minutes: the fader caps each frame's step at 0.1 s, so on a loaded machine (a few frames a second) the
    // 10 s fade-in takes longer in wall time
    const t1 = performance.now(); while (performance.now() - t1 < 180000) { await wait(100); tick(); if (S.list.every((s) => s.f === 1)) break; }
    out.endF = Object.fromEntries(S.list.map((s) => [s.name, s.f]));
    if (out.intruder) { const k = out.intruder.kiosk, h = D.It.byId[out.intruder.id], q = h.group.position; out.intruder.inAfter = D.F.inHull(k.B, q.x, q.z, -0.05); out.intruder.at = [+q.x.toFixed(1), +q.z.toFixed(1)]; delete out.intruder.kiosk; }
    out.compiles = H ? (H.kinds.compileShader || 0) - c0 : null;
    out.guardHidden = [...new Set(out.guardHidden)]; out.early = [...new Set(out.early)]; out.lateReturn = [...new Set(out.lateReturn)];
    return out;
  });
  await g.close();
  if (r.none) { expect('the stand fader exists (P33)', false); process.exit(1); }
  note(JSON.stringify({ names: r.names, owners: r.owners, fadeOut: r.fadeOut, near: r.near, endF: r.endF, guard: r.guardN, eventEnded: r.eventEnded, eventS: r.eventS }));
  expect('the Event ended (within 10 minutes)', r.eventEnded === true, `${r.eventS} s`);
  expect('the faded set is the six stands, the gazebo, the phone booth, the portal, and all the trees with the robin; never the church', ['post', 'sheriff', 'garden', 'gallery', 'shop', 'juice', 'gazebo', 'phone booth', 'portal', 'trees and the robin'].every((n) => r.names.includes(n)) && !r.names.includes('church'), r.names.join(', '));
  expect('the robin and every tree (the park\'s and the town\'s) are one fade item', r.robinWithTree && r.treeN >= 60, `robin with tree ${r.robinWithTree}, ${r.treeN} trees`);
  expect('the portal\'s blue effect shows when it opens (F-B71)', r.portalFx && r.portalFx.length >= 2 && r.portalFx.every((v) => v > 0.2), JSON.stringify(r.portalFx));
  expect('no character (every townsperson, and Sparkakus in his library) is in a faded group', r.charN >= 12 && r.charsFaded.length === 0, r.charsFaded.join(', '));
  expect('Sparkakus is shown while the Event dances (his library hidden)', r.sparkShown === true, String(r.sparkShown));
  expect('nothing that must stay (the church and Cave, the Ancient, the pond, Somlet, the Garden) is in or holds a faded group', r.inFaded.length === 0, r.inFaded.slice(0, 6).join(', '));
  expect('nothing that must stay shares a faded material', r.fadedGuard.length === 0, r.fadedGuard.slice(0, 6).join(', '));
  expect('no stand starts fading while its owner is within 6 m of home', r.early.length === 0, r.early.join(', '));
  expect('a fade out takes at least 9 s', Object.keys(r.fadeOut).length >= 3 && Object.values(r.fadeOut).every((s) => s >= 9), JSON.stringify(r.fadeOut));
  expect('every stand whose owner left is hidden while the Event dances', r.hiddenWhileDancing === true);
  expect('the church and Cave, the Ancient, the pond and Somlet are never hidden during the run', r.guardHidden.length === 0, r.guardHidden.slice(0, 6).join(', '));
  expect('walking up to a hidden stand (6 m) leaves it hidden until the Event ends', r.near && r.near.f === 0, JSON.stringify(r.near));
  expect('a townsperson put in a hidden kiosk is outside it once the kiosk is back after the Event (the fade-in safety)', r.intruder && r.intruder.inAtStart && r.intruder.inAfter === false, JSON.stringify(r.intruder));
  expect('after the Event every stand is back in full', Object.values(r.endF).every((f) => f === 1), JSON.stringify(r.endF));
  expect('after the Event no stand fades out again (each only comes back)', r.lateReturn.length === 0, r.lateReturn.join(', '));
  expect('no shader compiled inside a headset frame', r.compiles === 0 || r.compiles === null, String(r.compiles));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `STANDS TEST FAILED (${failures.length})` : 'STANDS TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
