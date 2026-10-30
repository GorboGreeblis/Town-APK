// The gazebo's collision (standard tier; FIXES F-B65; the author: "The doorway to the Gazebo should be open and
// collision free for anyone to enter and exit"; "It's just the walls of the Gazebo that need consistent collision"):
//   - walking the player at the gazebo's middle from eight sides (the game's own collision, F.resolve, every 2 cm
//     step): the seven railed sides stop the player at the railing, the doorway lets the player in to the middle;
//   - a body standing inside is left where it is (the doorway side is open, nothing pushes it out);
//   - Gemtoe can be talked to from outside the railing;
//   - Gemtoe, sent 13 m away, walks home through the doorway within 60 s;
//   - no page errors.
//
//   node tools/test_gazebo.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, F = D.F, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    await wait(1500);
    if (!F.gz) return { none: true };
    const [cx, cz] = F.gzAt, pl = D.At.position, out = { sides: [] };
    const walkIn = (x, z) => { pl.set(x, pl.y, z); for (let i = 0; i < 600; i++) { const dx = cx - pl.x, dz = cz - pl.z, d = Math.hypot(dx, dz); if (d < 0.05) break; pl.x += dx / d * 0.02; pl.z += dz / d * 0.02; F.resolve(pl, 0.6); } return +Math.hypot(pl.x - cx, pl.z - cz).toFixed(2); };
    // the doorway's direction: Gemtoe's route home runs straight through it
    const via = J.gazeboVia(), door = Math.atan2(via[2][1] - cz, via[2][0] - cx);
    for (let k = 0; k < 8; k++) { const a = door + k * Math.PI / 4; out.sides.push({ k, reached: walkIn(cx + 7 * Math.cos(a), cz + 7 * Math.sin(a)) }); }
    pl.set(cx + 0.5, pl.y, cz); F.resolve(pl, 0.6); out.inside = +Math.hypot(pl.x - cx, pl.z - cz).toFixed(2);
    const h = D.It.byId.p_gemtoe;
    pl.set(cx + 4.4, pl.y, cz); await wait(600); try { D.xe.scan(); } catch (e) {} out.talk = D.xe.current && D.xe.current.id;
    pl.set(cx + 30, pl.y, cz);
    h.group.position.set(cx + 9, 0, cz + 9); const t0 = performance.now(); out.home = null;
    while (performance.now() - t0 < 60000) { await wait(250); if (Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z) < 1.2) { out.home = +((performance.now() - t0) / 1000).toFixed(1); break; } }
    return out;
  });
  await g.close();
  if (r.none) { expect('the gazebo has its wall collision (F-B65)', false); process.exit(1); }
  note(JSON.stringify(r));
  const door = r.sides[0].reached, walls = r.sides.slice(1).map((s) => s.reached);
  expect('the doorway lets the player in to the middle', door < 0.1, String(door));
  expect('the seven railed sides stop the player at the railing (3.6-4.1 m from the middle)', walls.every((d) => d > 3.6 && d < 4.1), walls.join(', '));
  expect('a player standing inside is left where they are', r.inside < 0.6, String(r.inside));
  expect('Gemtoe can be talked to from outside the railing', r.talk === 'p_gemtoe', String(r.talk));
  expect('Gemtoe walks home through the doorway within 60 s', r.home !== null, String(r.home));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `GAZEBO TEST FAILED (${failures.length})` : 'GAZEBO TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
