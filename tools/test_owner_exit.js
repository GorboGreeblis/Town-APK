// Owners leave home through their way out, never through a wall (standard tier; F-B66; the author: "I think I just saw
// Mushroom teleport through the side of his desk instead of moving down his ramp", "let's make sure the issue with
// Mushroom never occurs with anyone else"). Every townsperson whose home is inside a kiosk (and Gemtoe at the gazebo) is
// sent on a visit from home with the player standing in their way out (on the first point of their way out, or 1.5 m
// from home toward the park's middle). A trap on their position records any single write that moves them more than
// 0.5 m (a jump through a wall); none may happen, and each must be on their way (more than 2 m from home) within 60 s,
// or, where the player fills their only doorway (Gemtoe's gazebo), within 30 s once the player steps away.
//
//   node tools/test_owner_exit.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, F = D.F, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(2000);
    const gz = window.__gcCarved && window.__gcCarved.own;
    const owners = D.It.all.filter((e) => e.id && e.kind === 'npc' && e.home && e.group && (e === gz || F.buildings.some((B) => B.name !== 'church' && F.inHull(B, e.home.x, e.home.z))));
    const ids = owners.map((e) => e.id), out = { owners: ids, runs: [] };
    for (const m of owners) {
      const home = m.home.clone(), P = m.group.position, hits = []; let armed = false;
      let t0 = performance.now();
      while ((m.visiting || m.busy || J.visits().now || Math.hypot(P.x - home.x, P.z - home.z) > 0.3) && performance.now() - t0 < 240000) await wait(200);   // one visit at a time
      const via = m.def.via && m.def.via[0], d = Math.hypot(home.x, home.z) || 1;
      const [px, pz] = via ? [via[0], via[1]] : [home.x - 1.5 * home.x / d, home.z - 1.5 * home.z / d];
      D.At.position.set(px, D.At.position.y, pz);
      const desc = {};
      for (const k of ['x', 'z']) { desc[k] = Object.getOwnPropertyDescriptor(P, k); let v = P[k]; Object.defineProperty(P, k, { configurable: true, enumerable: true, get() { return v; }, set(n) { if (armed && Math.abs(n - v) > 0.5 && hits.length < 4) hits.push({ k, from: +v.toFixed(2), to: +n.toFixed(2), stack: new Error().stack.split('\n').slice(2, 6).map((l) => l.trim().replace(/https?:\/\/[^ ]*\//, '')).join(' < ') }); v = n; } }); }
      const partner = D.It.byId[m.id === 'gratelet' ? 'blinker' : 'gratelet'];
      armed = true; J.visitAt(D.Re.t); J.visitAt(D.Re.t, m.id, partner.id);   // the pair, and its time now
      t0 = performance.now(); let away = false, awayAt = 0;   // watched until 5 s after they are 2 m out
      while (performance.now() - t0 < 60000 && !hits.length && !(awayAt && performance.now() - awayAt > 5000)) { if (!away && Math.hypot(P.x - home.x, P.z - home.z) > 2) { away = true; awayAt = performance.now(); } await wait(50); }
      // a doorway the player stands in (the gazebo's) blocks the way out: then the player steps away and the owner must go
      let blocked = false;
      if (!away && !hits.length) { blocked = true; D.At.position.set(30, D.At.position.y, 30); const t1 = performance.now(); while (performance.now() - t1 < 30000 && !hits.length && !away) { if (Math.hypot(P.x - home.x, P.z - home.z) > 2) away = true; await wait(50); } }
      armed = false;
      const x = P.x, z = P.z; for (const k of ['x', 'z']) { delete P[k]; } P.x = x; P.z = z;
      out.runs.push({ id: m.id, via: !!via, player: [+px.toFixed(2), +pz.toFixed(2)], away, blocked, hits });
      D.At.position.set(30, D.At.position.y, 30);
    }
    return out;
  });
  note(JSON.stringify(r.runs.map((x) => ({ id: x.id, via: x.via, away: x.away, blockedByPlayer: x.blocked, hits: x.hits.length }))));
  expect('every townsperson living in a kiosk (Mushroom, Fortizmo) and Gemtoe at the gazebo are checked', ['drifter', 'frog', 'p_gemtoe'].every((id) => r.owners.includes(id)), r.owners.join(', '));
  expect('no owner jumps more than 0.5 m in one step leaving home with the player in the way (never through a wall)', r.runs.every((x) => !x.hits.length), JSON.stringify(r.runs.filter((x) => x.hits.length)).slice(0, 600));
  expect('every owner is on their way (more than 2 m from home) within 60 s, or within 30 s once the player steps out of their way', r.runs.every((x) => x.away), r.runs.filter((x) => !x.away).map((x) => x.id).join(', '));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `OWNER EXIT TEST FAILED (${failures.length})` : 'OWNER EXIT TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
