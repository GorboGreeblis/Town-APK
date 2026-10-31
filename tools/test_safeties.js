// The flash safeties (standard tier; FIXES S1; the author: "Are there any kind of global safeties we can add to prevent
// screen flashes in general?"). In VR (fake XR, rendering on):
//   - the player's head inside a character (its body radius, below its height) hides that character for the frame
//     only: logged "head inside ... hidden for the frame", and the character is visible again between frames;
//   - the head inside a Garden flower leaves it drawn (S6 revised, the author: "Flowers in the Garden disappear when the
//     user walks into them. This should not occur"); S6 keeps to pickups;
//   - an object whose per-object draw hook throws does not stop the frame: the frame's draw calls stay what they were
//     without it (three.js would otherwise draw nothing after it), the error is logged once for that object (not
//     every frame), and frames keep coming;
//   - the head guard (the view dims to black as the head goes into a wall) shows there and compiles no shader the first
//     time (B47: it rides on the camera, which joins the scene only at VR entry, so the loading warm-up never reached it;
//     its shader is now compiled at VR entry);
//   - no page errors but the injected one.
//
//   node tools/test_safeties.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, O = D.O, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms)), logs = [], L0 = window.__gtLog;
    window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    const errs = []; const ce = console.error; console.error = function () { errs.push([...arguments].join(' ')); return ce.apply(this, arguments); };
    await wait(2000);
    const out = {};
    // 1. the head inside a character: hold the player on a standing townsperson for a second, every frame
    // a townsperson standing at home, taller than the head (the guard: within 0.75 of its body radius, below its height)
    const eye = D.we.headPos ? D.we.headPos.y : 1.6;
    const cand = D.It.all.filter((x) => x.home && x.group && x.group.visible && (x.height || 2) > eye - x.group.position.y + 0.2);
    const h = (cand.filter((x) => !x.busy).length ? cand.filter((x) => !x.busy) : cand).sort((a, b) => (b.bodyR || 0.8) - (a.bodyR || 0.8))[0] || D.It.all.filter((x) => x.group && x.group.visible).sort((a, b) => (b.height || 2) - (a.height || 2))[0];
    let holding = true, betweenHidden = 0, frames = 0;
    // move the player so the head itself (the headset's position, a little off the player's) is at the character
    const hold = () => { if (!holding) return; const hp = D.we.headPos; if (hp) { D.At.position.x += h.group.position.x - hp.x; D.At.position.z += h.group.position.z - hp.z; } frames++; if (!h.group.visible) betweenHidden++; requestAnimationFrame(hold); };
    // body collision would push the player out before each frame (the guard is the backstop for when it does not):
    // switched off for the second
    const res0 = D.uo.resolve; D.uo.resolve = () => false;
    requestAnimationFrame(hold); await wait(1200); holding = false; D.uo.resolve = res0; await wait(100);
    D.At.position.set(h.group.position.x + 8, D.At.position.y, h.group.position.z);
    out.head = { id: h.id, logged: logs.filter((s) => /^head inside \d+ character\(s\): hidden for the frame/.test(s)).length, frames, betweenHidden, visibleAfter: h.group.visible };
    // 1b. the head inside a Garden flower leaves it drawn (S6 revised): a plant-sized object put in the Garden's list of
    // flowers at the head
    await wait(400);   // the head position follows the player's move on the next frames
    { const J = D.JGP, plants = J.garden && J.garden.plants; if (plants) { const n0 = logs.length; const hp = D.we.headPos || D.At.position, fh = hp.y + 0.6; const g0 = new T.Group(), m0 = new T.Mesh(new T.BoxGeometry(0.8, fh, 0.8), new T.MeshLambertMaterial({ color: 0x44aa33 })); m0.position.y = fh / 2; g0.add(m0); g0.position.set(hp.x, 0, hp.z); D.C.add(g0); const e = { g: g0, grow: 1, kind: 0 }; plants.push(e);
      // hidden at the moment each frame is drawn (the log line is capped at 20 a session), shown between frames
      let between = 0, fr = 0, hiddenDrawn = 0, drawn = 0, on = true; const R0 = D.O.render; D.O.render = function () { if (on) { drawn++; if (!g0.visible) hiddenDrawn++; } return R0.apply(this, arguments); };
      const chk = () => { if (!on) return; fr++; if (!g0.visible) between++; requestAnimationFrame(chk); }; requestAnimationFrame(chk); await wait(1000); on = false; D.O.render = R0;
      out.flower = { hiddenDrawn, drawn, between, fr, visibleAfter: g0.visible };
      plants.splice(plants.indexOf(e), 1); D.C.remove(g0); } }
    // 2. a draw hook that throws: the frame is drawn to the end
    const R = O.render; let n = 0, calls = 0; O.render = function () { const x = R.apply(this, arguments); n++; calls += O.info.render.calls; return x; };
    const measure = async () => { n = calls = 0; await wait(1000); return { frames: n, draws: Math.round(calls / Math.max(1, n)) }; };
    const p = D.At.position; D.At.position.set(0, p.y, -14); await wait(600);
    const base = await measure();
    const m = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.3), new T.MeshLambertMaterial({ color: 0xff00ff })); m.position.set(0, 1.4, -16); m.frustumCulled = false; m.renderOrder = -1000;
    m.onBeforeRender = () => { throw new Error('injected draw hook fault'); }; D.C.add(m);
    await wait(600);
    const e0 = errs.filter((s) => /draw hook/.test(s)).length;
    const bad = await measure();
    const e1 = errs.filter((s) => /draw hook/.test(s)).length;
    D.C.remove(m); O.render = R;
    out.hook = { base, bad, loggedOnce: e0 === 1 && e1 === 1, logged: e1 };
    console.error = ce;
    // 4. the head guard (the view dims to black as the head goes into a wall; B47): its shader is compiled while loading,
    //    so the first time it shows nothing is compiled
    { const HG = D.JGP.headGuard, F = D.F, p0 = O.info.programs.length; let at = null;
      // a point at a wall: the guard's own distance to the nearest building part, within 5 cm
      for (const b of F.buildings) { for (let k = 0; k <= 40 && !at; k++) { const w = F.world(b, b.hull[0] + (b.hull[2] - b.hull[0]) * k / 40, b.hull[1]); const d = HG.sdist(w[0], 1.6, w[1]); if (d > -0.05 && d < 0.05) at = new T.Vector3(w[0], 1.6, w[1]); } if (at) break; }
      HG.at = at; let shown = 0; for (let k = 0; k < 40; k++) { await wait(30); if (HG.mesh && HG.mesh.visible) shown++; } HG.at = null; await wait(300);
      out.guard = { at: at && at.toArray().map((v) => +v.toFixed(2)), mesh: !!HG.mesh, shown, level: +HG.level().toFixed(2), newPrograms: O.info.programs.length - p0, hiddenAfter: HG.mesh ? !HG.mesh.visible : null }; }
    return out;
  });
  await g.close();
  note(JSON.stringify(r));
  expect('the head guard shows as the head goes into a wall, and compiles no shader then (its shader is compiled at VR entry; B47)', r.guard && r.guard.mesh && r.guard.shown > 0 && r.guard.newPrograms === 0, JSON.stringify(r.guard));
  expect('the head inside a character hides it for the frame (logged)', r.head.logged >= 1, JSON.stringify(r.head));
  expect('the character is visible between frames and after', r.head.betweenHidden === 0 && r.head.visibleAfter, JSON.stringify(r.head));
  expect('the head inside a Garden flower leaves it drawn (S6 revised: flowers never vanish when walked into)', r.flower && r.flower.drawn > 10 && r.flower.hiddenDrawn === 0 && r.flower.between === 0 && r.flower.visibleAfter, JSON.stringify(r.flower));
  expect('a throwing draw hook does not stop the frame: the draws stay as without it (within 10%: townsfolk move; a frame stopped short loses most) and frames keep coming', r.hook.bad.frames > 20 && r.hook.bad.draws >= 0.9 * r.hook.base.draws, JSON.stringify(r.hook));
  expect('the draw hook error is logged once for the object, not every frame', r.hook.loggedOnce, String(r.hook.logged));
  const other = g.errors.filter((e) => !/injected draw hook fault/.test(e));
  expect('no page errors other than the injected one', other.length === 0, other.slice(0, 3).join(' | '));
  console.log(failures.length ? `SAFETIES TEST FAILED (${failures.length})` : 'SAFETIES TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
