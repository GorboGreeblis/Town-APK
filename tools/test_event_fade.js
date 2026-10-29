// The Event's start and end never pop anything (standard tier; the author: "everything hidden must fade out at the
// start of the Event and then fade in at the end of the Event. Nothing should ever appear to pop out or pop in";
// FIXES A4-A8). Two Events are played back to back (fast simulation), every animation frame sampled:
//   - the mist bank beyond the fence (A4) rolls in to full within 7 s of the start and back out to nothing after the
//     end;
//   - the clouds and every Blossom and Flint (A5) fade out at the start and in at the end: an object is hidden only
//     once its opacity is down to 0, and comes back at 0;
//   - a UFO already flying when the Event starts (A6) leaves by its normal exit path: it is hidden only far out
//     (over 150 m), and no new one starts during the Event;
//   - Backpacka (A7) is switched off only inside the mist: at least 10 m beyond the fence, with the mist at full;
//   - in the second Event the garden's flowers (A8) shrink away within 1.5 s of the start, then grow back to full
//     before it ends;
//   - no page errors.
//
//   node tools/test_event_fade.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, C = D.C, J = D.JGP, BP = window.__gtBP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1000);
    const clouds = []; C.traverse((o) => { const u = o.userData; if (o.isGroup && u && u.r !== undefined && u.h !== undefined && u.w !== undefined && u.a !== undefined) clouds.push(o); });
    const cm = clouds[0].children[0].material;
    let ufo = null; C.traverse((o) => { if (!ufo && o.isGroup && o.userData.keepInFinale && o.userData.jgpKeep && o.children.length === 1 && o.children[0].children.length > 30) ufo = o; });
    const pk = []; C.traverse((o) => { if (o.userData && o.userData.taken === false && 'regrowAt' in o.userData) pk.push(o); });
    const fence = (x, z) => Math.max(-37.6 - x, x - 37.6, -37.6 - z, z - 49.6);   // how far beyond the fence (m)
    const pops = [], ev = [];
    let frames = 0, prevCv = clouds[0].visible, prevCo = cm.opacity, prevUv = ufo && ufo.visible, prevUd = 0, prevBp = false, ufoDuring = 0;
    const pv = new Map(pk.map((p) => [p, [p.visible, 1]]));
    const tick = () => {
      frames++;
      const cv = clouds[0].visible, co = cm.opacity;
      if (prevCv && !cv && prevCo > 0.02) pops.push('cloud hidden at opacity ' + prevCo.toFixed(2));
      if (!prevCv && cv && co > 0.1) pops.push('cloud shown at opacity ' + co.toFixed(2));
      prevCv = cv; prevCo = co;
      for (const p of pk) { const f = p.userData.gcF === undefined ? 1 : p.userData.gcF, [v0, f0] = pv.get(p); if (!p.userData.taken) { if (v0 && !p.visible && f0 > 0.02 && D.me.active) pops.push('pickup hidden at ' + f0.toFixed(2)); if (!v0 && p.visible && f > 0.1) pops.push('pickup shown at ' + f.toFixed(2)); } pv.set(p, [p.visible, f]); }
      if (ufo) { const d = Math.hypot(ufo.position.x, ufo.position.z); if (prevUv && !ufo.visible && prevUd < 150) pops.push('UFO hidden ' + prevUd.toFixed(0) + ' m out'); if (!prevUv && ufo.visible && D.me.active) ufoDuring++; prevUv = ufo.visible; prevUd = d; }
      const root = BP.root && BP.root(); if (root) { if (prevBp && !root.visible && D.me.active) { const p = root.position; ev.push({ bpOff: +fence(p.x, p.z).toFixed(1), mist: +J.mist.p().toFixed(2) }); } prevBp = root.visible; }
      if (window.__evRun) requestAnimationFrame(tick);
    };
    window.__evRun = true; requestAnimationFrame(tick);
    const start = async () => { const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400); const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(30); return D.me.active; };
    const out = [];
    J.ufoNow(); await wait(5000);                          // a UFO in flight when the first Event starts
    for (let n = 1; n <= 2; n++) {
      const e = { n, started: await start(), mist7: 0, shrunk: null, grownBack: false, endMist: null };
      const t0 = performance.now();
      while (D.me.active && performance.now() - t0 < 400000) {
        await wait(100); const t = (performance.now() - t0) / 1000;
        if (t < 7.2) e.mist7 = J.mist.p();
        if (n === 2 && e.shrunk === null && t > 1.5) e.shrunk = Math.max(...J.garden.plants.map((p) => p.g.scale.x));
        if (n === 2 && J.garden.plants.length && J.garden.plants.every((p) => p.grow >= 1 && !p.gcSh) && t > 3) e.grownBack = true;
      }
      const t1 = performance.now(); while (performance.now() - t1 < 9000) await wait(100);
      e.endMist = J.mist.p(); e.endClouds = cm.opacity; e.endPickups = pk.filter((p) => !p.userData.taken && p.visible && (p.userData.gcF === undefined || p.userData.gcF >= 1)).length;
      out.push(e);
    }
    window.__evRun = false;
    return { out, pops: pops.slice(0, 10), nPops: pops.length, frames, ufoDuring, bp: ev, nPickups: pk.length, clouds: clouds.length };
  });
  await g.close();
  note(`${r.frames} frames sampled; ${r.clouds} clouds, ${r.nPickups} pickups; ` + JSON.stringify(r.out) + '; Backpacka switched off: ' + JSON.stringify(r.bp));
  const [a, b] = r.out;
  expect('both Events started', a.started && b.started);
  expect('the mist is at full within 7 s of the start', a.mist7 >= 0.99 && b.mist7 >= 0.99, `${a.mist7}, ${b.mist7}`);
  expect('nothing pops: clouds, Blossoms, Flint and the UFO are hidden only once faded out and shown at 0', r.nPops === 0, r.pops.join(' | '));
  expect('no UFO appears during the Event', r.ufoDuring === 0, String(r.ufoDuring));
  expect('after each Event the mist is gone and the clouds and pickups are back in full', [a, b].every((e) => e.endMist === 0 && e.endClouds >= 0.999 && e.endPickups === r.nPickups), JSON.stringify(r.out));
  expect('Backpacka is switched off only inside the mist (10 m or more beyond the fence, mist at full)', r.bp.length >= 1 && r.bp.every((x) => x.bpOff >= 10 && x.mist >= 0.99), JSON.stringify(r.bp));
  expect('in the second Event the flowers shrink away at the start', b.shrunk !== null && b.shrunk <= 0.02, String(b.shrunk));
  expect('and grow back to full during it', b.grownBack === true);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `EVENT FADE TEST FAILED (${failures.length})` : 'EVENT FADE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
