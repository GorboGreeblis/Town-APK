// Greeting test (standard tier): how the townsfolk react when the player walks up (config greetR 3.2 m,
// proximityFreezeS 12 s, greetClear 6 m). A walking townsperson the player comes within 3.2 m of stops and turns to
// face the player; after 12 s they go on with their day even if the player stays; only after the player has been more
// than 6 m away does a new approach stop them again. Sparkakus greets from 6 m with a "!" and a tip of his crown.
//
//   node tools/test_greet.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, renderEvery: 3 });
  const page = g.page;
  await page.waitForTimeout(2000);
  const r = await page.evaluate(async () => {
    const D = window.__dbg, At = D.At, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = { npcs: [] };
    const gs = () => D.Re.t;   // game seconds
    const gwait = async (s) => { const g0 = gs(), w0 = performance.now(); while (gs() - g0 < s && performance.now() - w0 < s * 6000) await wait(50); };
    // and at least n animation frames: under load a game second can pass in a handful of frames (the 3.15.54 full pass)
    let fr = 0; (function tick() { fr++; requestAnimationFrame(tick); })();
    const fwait = async (s, n) => { const f0 = fr; await gwait(s); const w0 = performance.now(); while (fr - f0 < n && performance.now() - w0 < 20000) await wait(50); };
    const angTo = (e) => { const p = e.group.position; return Math.atan2(At.position.x - p.x, At.position.z - p.z); };
    const diff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
    const tried = new Set();
    for (let k = 0; k < 3; k++) {
      // a townsperson walking on their own (not busy, not visiting, not a gazer), the player put 2 m ahead of them
      let e = null; const t0 = performance.now();
      while (!e && performance.now() - t0 < 60000) { e = D.It.all.find((h) => h.kind && h.def && !tried.has(h) && h.moving && !h.busy && !h.visiting && !(h.def.gazeUp) && h.group.visible); if (!e) await wait(250); }
      if (!e) break; tried.add(e);
      const p = e.group.position, yaw = e.group.rotation.y;
      // the player is put 2 m ahead and kept on that spot on every tick (a single move can be undone by the next head
      // movement in VR), the same spot through the stay
      // spots are open ground (a spot inside a kiosk's hull would see the player pushed out of it)
      const F = D.F, open = (x, z) => Math.abs(x) < 36 && Math.abs(z) < 36 && !(F && F.buildings && F.buildings.some((B) => F.inHull(B, x, z)));
      const spot = (cx, cz, r, a0) => { for (let k = 0; k < 16; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 8, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; if (open(x, z)) return [x - cx, z - cz]; } return [Math.sin(a0) * r, Math.cos(a0) * r]; };
      const [s0x, s0z] = spot(p.x, p.z, 2, yaw), P0x = p.x + s0x, P0z = p.z + s0z;
      const stay = async (s) => { const g0 = gs(), w0 = performance.now(); while (gs() - g0 < s && performance.now() - w0 < s * 6000) { At.position.set(P0x, At.position.y, P0z); await wait(40); } };
      await stay(1.5);
      const rec = { name: e.def.name, near: e.nearPlayer, held: e.held, moving: e.moving, facing: +diff(e.group.rotation.y, angTo(e)).toFixed(2) };
      // stay: still held at 10 s, released by 14 s (the 12 s greeting)
      await stay(8.5); rec.heldAt10 = e.held;
      await stay(4); rec.heldAt14 = e.held;
      // step 8 m away, then come back: greeted again (S32: the far reset also runs while they are busy)
      // in VR the game puts the player back on the headset rig each frame, so the player is held at the spot on every tick
      // of each window, and from where the townsperson is then (they walk on meanwhile)
      const q = e.group.position;
      const hold = async (r, s, each) => { const g0 = gs(), w0 = performance.now(); while (gs() - g0 < s && performance.now() - w0 < s * 6000) { const [ox, oz] = spot(q.x, q.z, r, Math.atan2(At.position.x - q.x, At.position.z - q.z)); At.position.set(q.x + ox, At.position.y, q.z + oz); await wait(40); each && each(); } };
      { let minD = 99, busy = 0, seen0 = false; await hold(8, 1.5, () => { minD = Math.min(minD, Math.hypot(At.position.x - q.x, At.position.z - q.z)); if (e.busy) busy++; if (!e.nearSince) seen0 = true; });
        rec.farMin = +minD.toFixed(2); rec.busyFar = busy > 0; rec.resetFar = seen0 && !e.nearSince; }
      await hold(2, 1.5); rec.heldAgain = e.held;
      out.npcs.push(rec);
      At.position.set(q.x + 12, At.position.y, q.z + 12); await gwait(1);
    }
    // Sparkakus: a "!" from 6 m
    let bang = 0; const ua = D.Ut.at; D.Ut.at = function (x, y, z, s) { const q = D.st && D.st.pos ? D.st.pos() : null; if (s === '!' && q && Math.hypot(x - q.x, z - q.z) < 1.5) bang++; return ua.apply(this, arguments); };   // his own "!" only (Gooward's emote is a "!" too)
    const sp = D.st && D.st.pos ? D.st.pos() : null;
    // he walks about, so the player is placed from where he is at each step, and held there each frame of the wait
    const hold = async (d, s) => { const g0 = gs(), w0 = performance.now(); while (gs() - g0 < s && performance.now() - w0 < s * 6000) { const p = D.st.pos(); At.position.set(p.x + d, At.position.y, p.z); await wait(50); } await fwait(0, 20); };
    if (sp) { await hold(9, 1); const b0 = bang; await hold(4.5, 1.5); out.spBang = bang - b0; await hold(9, 1); await hold(4.5, 1.5); out.spBangAgain = bang - b0; }
    D.Ut.at = ua;
    return out;
  });
  note('greeted: ' + r.npcs.map((n) => `${n.name} (facing off by ${n.facing} rad)`).join(', '));
  expect('three walking townsfolk were found and approached', r.npcs.length === 3, JSON.stringify(r.npcs.map((n) => n.name)));
  const bad = (f) => r.npcs.filter((n) => !f(n)).map((n) => n.name + ' ' + JSON.stringify(n));
  expect('within 3.2 m a walking townsperson stops and turns to face the player', bad((n) => n.near && n.held && !n.moving && n.facing < 0.35).length === 0, bad((n) => n.near && n.held && !n.moving && n.facing < 0.35).join(' | '));
  expect('they stay for the greeting (still held at 10 s) and go on after 12 s even if the player stays', bad((n) => n.heldAt10 && !n.heldAt14).length === 0, bad((n) => n.heldAt10 && !n.heldAt14).join(' | '));
  expect('after the player has been more than 6 m away, a new approach stops them again', bad((n) => n.resetFar && n.heldAgain).length === 0, bad((n) => n.resetFar && n.heldAgain).join(' | '));
  expect('Sparkakus greets with a "!" from 6 m, once per approach', r.spBang === 1 && r.spBangAgain === 2, JSON.stringify({ first: r.spBang, total: r.spBangAgain }));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GREET TEST FAILED (${failures.length})` : 'GREET TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
