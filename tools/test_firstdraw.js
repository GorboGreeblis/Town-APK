// Nothing is uploaded inside a headset frame when something new appears (standard tier; the author's flash right as
// Nextessa came into view, log 7204dc64; FIXES F-B51). three.js makes a geometry's buffers the first time it draws it;
// objects made during play (Nextessa and her pizza box on each visit, the Event's plants batched as they grow,
// vignette props, the Gem's parts) were drawn first inside a headset frame. Since 3.15.59 an object whose geometry was
// never uploaded is held back for that one frame and uploaded right after it (as F-B31 does for textures).
// On the headset's path (multiview, rendering on), every buffer made inside a frame is counted while:
//   - Nextessa is called, comes out of the portal and walks to the player (the player keeps near her);
//   - she hands the pizza over; the Event starts and runs 2 minutes (its plants grow and are batched);
// expected: no buffer made inside a frame; the game reports holding something back at least once, each object only
// once (no object held frame after frame, which would leave it unseen); everything held back is on the GPU after its
// frame; no page errors.
//
//   node tools/test_firstdraw.js [file]
process.env.GT_MULTIVIEW = '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, noVisits: false, renderEvery: 3 });
  await g.page.waitForTimeout(2000);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, O = D.O, gl = O.getContext(), Kt = D.Kt, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 300);
    const inFrame = {}; let phase = 'start';
    const cb = gl.createBuffer.bind(gl);
    gl.createBuffer = function () { if (window.__fakeXR && window.__fakeXR.inFrame) inFrame[phase] = (inFrame[phase] || 0) + 1; return cb(); };
    const held = []; const L = window.__gtLog;
    window.__gtLog = function (m) { const k = /geometry held for one frame: (\d+)/.exec(String(m)); if (k) held.push(+k[1]); return L && L.apply(this, arguments); };
    const gone = new WeakSet(), GP = THREE.BufferGeometry.prototype, gd = GP.dispose; GP.dispose = function () { gone.add(this); return gd.call(this); };   // replaced batches
    const flushed = []; const up = O.gcObjUpdate; O.gcObjUpdate = function (o) { const res = up.call(this, o); flushed.push(o.geometry); return res; };
    const out = { inFrame, held };
    phase = 'courier'; Kt.rewards.snacks = false; D.ue.call();
    let t0 = performance.now(); while (!D.ue.courier && performance.now() - t0 < 150000) await wait(200);
    const c = D.ue.courier; out.came = !!c;
    for (let i = 0; i < 30 && c; i++) { const p = c.group.position; D.At.position.set(p.x + 2, D.At.position.y, p.z + 2); await wait(500); }
    phase = 'claim'; t0 = performance.now(); while (!Kt.rewards.snacks && performance.now() - t0 < 60000) { await wait(300); try { D.ue.claim(true); } catch (e) {} }
    phase = 'event'; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50);
    out.event = D.me.active; D.At.position.set(0, D.At.position.y, -6);
    t0 = performance.now(); while (performance.now() - t0 < 120000) await wait(500);
    out.plants = D.JGP.garden.plants.length;
    const live = flushed.filter((gm) => !gone.has(gm)); out.parts = live.length; out.disposed = flushed.length - live.length; out.uploaded = live.filter((gm) => !O.gcNeedsUpload(gm)).length;
    clearInterval(adv);
    return out;
  });
  await g.close();
  note(JSON.stringify(r));
  const total = Object.values(r.inFrame).reduce((a, b) => a + b, 0);
  expect('Nextessa came and the Event ran with plants growing', r.came && r.event && r.plants >= 1, JSON.stringify({ came: r.came, event: r.event, plants: r.plants }));
  expect('no buffer made inside a headset frame (courier, hand-over, the Event)', total === 0, JSON.stringify(r.inFrame));
  expect('new objects were held back for one frame and uploaded between frames', r.held.length >= 1, `${r.held.length} hold(s)`);
  expect('nothing held frame after frame (each hold is a new object; under 40 holds)', r.held.length < 40, `${r.held.length} hold(s): ${r.held.slice(0, 12).join(',')}`);
  expect('every object held back is on the GPU after its frame (vertices and indices; batches replaced since aside)', r.parts > 0 && r.uploaded === r.parts, `${r.uploaded} of ${r.parts}`);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `FIRST DRAW TEST FAILED (${failures.length})` : 'FIRST DRAW TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
