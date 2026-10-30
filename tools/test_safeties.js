// The flash safeties (standard tier; FIXES S1; the author: "Are there any kind of global safeties we can add to prevent
// screen flashes in general?"). In VR (fake XR, rendering on):
//   - the player's head inside a character (its body radius, below its height) hides that character for the frame
//     only: logged "head inside ... hidden for the frame", and the character is visible again between frames;
//   - an object whose per-object draw hook throws does not stop the frame: the frame's draw calls stay what they were
//     without it (three.js would otherwise draw nothing after it), the error is logged once for that object (not
//     every frame), and frames keep coming;
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
    const h = D.It.all.filter((x) => x.home && x.group && x.group.visible && !x.busy && (x.height || 2) > eye - x.group.position.y + 0.2).sort((a, b) => (b.bodyR || 0.8) - (a.bodyR || 0.8))[0];
    let holding = true, betweenHidden = 0, frames = 0;
    // move the player so the head itself (the headset's position, a little off the player's) is at the character
    const hold = () => { if (!holding) return; const hp = D.we.headPos; if (hp) { D.At.position.x += h.group.position.x - hp.x; D.At.position.z += h.group.position.z - hp.z; } frames++; if (!h.group.visible) betweenHidden++; requestAnimationFrame(hold); };
    // body collision would push the player out before each frame (the guard is the backstop for when it does not):
    // switched off for the second
    const res0 = D.uo.resolve; D.uo.resolve = () => false;
    requestAnimationFrame(hold); await wait(1200); holding = false; D.uo.resolve = res0; await wait(100);
    D.At.position.set(h.group.position.x + 8, D.At.position.y, h.group.position.z);
    out.head = { id: h.id, logged: logs.filter((s) => /^head inside \d+ character\(s\): hidden for the frame/.test(s)).length, frames, betweenHidden, visibleAfter: h.group.visible };
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
    return out;
  });
  await g.close();
  note(JSON.stringify(r));
  expect('the head inside a character hides it for the frame (logged)', r.head.logged >= 1, JSON.stringify(r.head));
  expect('the character is visible between frames and after', r.head.betweenHidden === 0 && r.head.visibleAfter, JSON.stringify(r.head));
  expect('a throwing draw hook does not stop the frame: the draws stay as without it (within 3) and frames keep coming', r.hook.bad.frames > 20 && r.hook.bad.draws >= r.hook.base.draws - 3, JSON.stringify(r.hook));
  expect('the draw hook error is logged once for the object, not every frame', r.hook.loggedOnce, String(r.hook.logged));
  const other = g.errors.filter((e) => !/injected draw hook fault/.test(e));
  expect('no page errors other than the injected one', other.length === 0, other.slice(0, 3).join(' | '));
  console.log(failures.length ? `SAFETIES TEST FAILED (${failures.length})` : 'SAFETIES TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
