// Jitter, floating and sinking (standard tier; the author: "Mama Gorbo and Gooward jittered as they moved into position,
// in the Garden, to start planting. They should be slightly above the ground and never appear to jitter", "Etcher had
// minor jitter when moving over the rocks around the Garden", "Mushroom is floating high above his desk"; 3.15.60,
// FIXES F-B56, F-B57). Every character's drawn model (its world matrices as the draw computes them; the harness's matrices-only mode skips the raster),
// sampled every animation frame through the planting Event's gathering and planting and a minute after it:
//   - jitter: a character moving faster than 0.2 m/s whose drawn position reverses direction from one frame to the
//     next (consecutive steps pointing more than 120 degrees apart, both over 1 cm), more than 2% of its moving frames;
//   - bumps: its drawn height changing more than 4 cm in one frame while it walks;
//   - floating or sinking: the bottom of its drawn model more than 25 cm from where it was at the start, relative to its
//     own position (the model drawn away from the character: Mushroom's model 1.5 m above him on 3.15.60);
//   - no page errors.
//
//   node tools/test_jitter.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: 'matrices' });
  await g.page.waitForTimeout(1500);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const ents = D.It.all.filter((e) => e.group && e.def);
    // the model's bottom relative to the character's own position (world), from its meshes' world bounding boxes
    const bb = new T.Box3(), tmp = new T.Box3();
    const bottom = (e) => { bb.makeEmpty(); e.group.traverse((o) => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.union(tmp); } }); return bb.isEmpty() ? null : bb.min.y - e.group.matrixWorld.elements[13] - (e.gY || 0); };   // the ground follower's lift (a kiosk floor, the pond's edge) is not floating
    const st = new Map(ents.map((e) => [e, { name: e.def.name || e.id, b0: bottom(e), moving: 0, rev: 0, bumps: 0, worstBump: 0, worstFloat: 0, last: null, step: null }]));
    let frames = 0, run = true;
    let tPrev = D.Re.t;
    const tick = () => {
      if (!run) return; frames++;
      const dt = Math.max(1 / 90, D.Re.t - tPrev); tPrev = D.Re.t;   // game seconds since the last sample (several headset frames when headless runs slow)
      for (const [e, s] of st) {
        const m = e.group.matrixWorld.elements, p = [m[12], m[13], m[14]];
        if (s.last) {
          const d = [p[0] - s.last[0], p[1] - s.last[1], p[2] - s.last[2]], h = Math.hypot(d[0], d[2]);
          if (h > 0.2 / 72) {
            s.moving++;
            if (s.step && h > 0.01 && Math.hypot(s.step[0], s.step[2]) > 0.01 && (d[0] * s.step[0] + d[2] * s.step[2]) / (h * Math.hypot(s.step[0], s.step[2])) < -0.5) s.rev++;
            if (Math.abs(d[1]) > 0.04 * 72 * dt) { s.bumps++; s.worstBump = Math.max(s.worstBump, Math.abs(d[1])); if ((s.where = s.where || []).length < 6) s.where.push({ at: [+p[0].toFixed(2), +p[1].toFixed(2), +p[2].toFixed(2)], dy: +d[1].toFixed(3), dt: +dt.toFixed(3), t: +D.Re.t.toFixed(1), ev: !!D.me.active, busy: e.busy || null, vis: !!e.visiting || !!e.hosting }); }
          }
          s.step = h > 0.001 ? d : s.step;
        }
        s.last = p;
        if (frames % 12 === 0 && s.b0 !== null) { const b = bottom(e); if (b !== null && Math.abs(b - s.b0) > s.worstFloat) { s.worstFloat = Math.abs(b - s.b0); s.floatAt = { t: +D.Re.t.toFixed(1), ev: !!D.me.active, busy: e.busy || null, at: p.map((v) => +v.toFixed(2)), moving: !!e.moving }; } }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await wait(3000);
    // the Event: gathering, planting; the player near the Garden's edge
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50);
    D.At.position.set(0, D.At.position.y, -18);
    const g0 = D.Re.t; while (D.me.active && D.Re.t - g0 < 90 && performance.now() - t0 < 1500000) await wait(500);
    // and after it (the Event's end, everyone walking home over the Garden's rocks)
    if (D.me.active) { try { D.me.wrap(); } catch (e) {} }
    const g1 = D.Re.t; while (D.Re.t - g1 < 40 && performance.now() - t0 < 2400000) await wait(500);
    run = false; clearInterval(adv);
    return { frames, ents: [...st.values()].map((s) => ({ name: s.name, moving: s.moving, rev: s.rev, bumps: s.bumps, worstBump: +s.worstBump.toFixed(3), worstFloat: +s.worstFloat.toFixed(3), floatAt: s.floatAt || null, where: s.where || [] })) };
  });
  await g.close();
  const moved = r.ents.filter((e) => e.moving > 30);
  note(`${r.frames} frames; ` + moved.map((e) => `${e.name}: ${e.moving} moving, ${e.rev} reversals, ${e.bumps} bumps (worst ${e.worstBump} m), model drift ${e.worstFloat} m`).join('; '));
  expect('characters moved during the run', moved.length >= 5, String(moved.length));
  const jit = moved.filter((e) => e.rev > Math.max(2, 0.02 * e.moving));
  expect('no jitter: a moving character\'s drawn position never flips direction frame to frame (under 2% of its moving frames)', jit.length === 0, jit.map((e) => `${e.name} ${e.rev}/${e.moving}`).join(', '));
  const bump = moved.filter((e) => e.bumps > 3);
  expect('no bumps: walking, a drawn height never jumps over 4 cm in a frame (3 allowed)', bump.length === 0, bump.map((e) => `${e.name} ${e.bumps} (worst ${e.worstBump} m) at ${JSON.stringify(e.where)}`).join(', '));
  const fl = r.ents.filter((e) => e.worstFloat > 0.25);
  expect('no floating or sinking: every model stays within 25 cm of where it is drawn relative to the character', fl.length === 0, fl.map((e) => `${e.name} ${e.worstFloat} m at ${JSON.stringify(e.floatAt)}`).join(', '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `JITTER TEST FAILED (${failures.length})` : 'JITTER TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
