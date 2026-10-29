// Mushroom and his desk (standard tier; the author, 3.15.56: "After returning from a visit: Mushroom left again but
// [he] appeared to jump into his desk and then was pulled to the side of his kiosk. He should never fall inside of
// his desk. Can we give the desk solid collision and make it wider? Also he should never be jumping now that he has
// the ramp"; FIXES F-B46). Mushroom (`drifter`) makes back-to-back visits (he visits, is visited, visits again at once),
// with the player standing in front of his desk, where the author stood; every animation frame:
//   - a rise: his height going up more than 12 cm in one frame (a jump; the ramp climbs a few centimetres a frame);
//   - inside the desk: his position over the desk or its front margin (kiosk-local x -1.04..2.86, z .05..1.5) with
//     his height between 5 cm and 1.4 m (below the desk's top, 1.545 m, and above the ground);
// expected: no rise, never inside the desk, home and on top (1.54 m) after each visit; no page errors.
// On 3.15.56: 4 rises and 175 frames inside the desk in 6 visits.
//
//   node tools/test_mushroom_desk.js [file] [visits, default 4]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? path.resolve(process.argv[2]) : undefined;
const visits = +(process.argv.find((a) => /^\d+$/.test(a)) || 4);

(async () => {
  const { expect, note, failures } = reporter();
  // the player in front of the desk (kiosk-local 0.3, 1.9)
  const g = await boot({ file, vr: true, initScripts: ['window.__front=[0.3,1.9]'] });
  const r = await g.page.evaluate(async (N) => {
    const D = window.__dbg, J = D.JGP, F = D.F, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const m = D.It.byId.drifter, B = F.buildings.find((b) => b.name === 'sheriff'), c = Math.cos(B.ry), s = Math.sin(B.ry);
    const loc = (x, z) => [(x - B.x) * c - (z - B.z) * s, (x - B.x) * s + (z - B.z) * c];
    const ev = []; let prevY = m.group.position.y, frames = 0;
    const tick = () => { frames++; const p = m.group.position, [lx, lz] = loc(p.x, p.z), dy = p.y - prevY;
      // the counter: x -1.09..2.86, z .48..1.2 (kiosk-local), top 1.545; his body radius about .42
      const inDesk = lx > -1.04 && lx < 2.86 && lz > .05 && lz < 1.5 && p.y < 1.4 && p.y > .05;   // the desk and its front margin, not the ramp
      if (dy > 0.12) ev.push(['rise', +D.Re.t.toFixed(1), +lx.toFixed(2), +lz.toFixed(2), +prevY.toFixed(2), +p.y.toFixed(2), m.visiting ? 'v' : m.hosting ? 'h' : '-']);
      if (inDesk) ev.push(['inDesk', +D.Re.t.toFixed(1), +lx.toFixed(2), +lz.toFixed(2), +p.y.toFixed(2), m.visiting ? 'v' : m.hosting ? 'h' : '-']);
      prevY = p.y; if (window.__run) requestAnimationFrame(tick); };
    window.__run = true; requestAnimationFrame(tick);
    const pairs = [['drifter', 'gratelet'], ['drifter', 'blinker'], ['gratelet', 'drifter'], ['drifter', 'p_glyph'], ['blinker', 'drifter'], ['drifter', 'gorbo']];
    const out = [];
    const fr = (lx, lz) => [B.x + lx * c + lz * s, B.z - lx * s + lz * c];
    if (window.__front) { const [x, z] = fr(window.__front[0], window.__front[1]); D.At.position.set(x, D.At.position.y, z); }
    for (let k = 0; k < N; k++) {
      const [v, h] = pairs[k % pairs.length];
      const n0 = Object.values(J.visits().made).reduce((a, b) => a + b, 0);
      J.visitAt(D.Re.t, v, h);
      let t0 = performance.now(); while (Object.values(J.visits().made).reduce((a, b) => a + b, 0) === n0 && performance.now() - t0 < 8000) await wait(50);
      // until the visit is over and he is back up (or 200 s)
      t0 = performance.now(); while (performance.now() - t0 < 200000 && (m.visiting || m.hosting || J.visits().all.length)) await wait(100);
      const home = Math.hypot(m.group.position.x - m.home.x, m.group.position.z - m.home.z);
      out.push([v + '>' + h, +((performance.now() - t0) / 1000).toFixed(0), +home.toFixed(2), +m.group.position.y.toFixed(2)]);
            // leave again at once: no pause after returning
    }
    window.__run = false;
    return { out, frames, ev: ev.slice(0, 40), nEv: ev.length, rises: ev.filter((e) => e[0] === 'rise').length, inDesk: ev.filter((e) => e[0] === 'inDesk').length };
  }, visits);
  await g.close();
  note(`${r.frames} frames; visits (pair, seconds, distance from home, height): ${JSON.stringify(r.out)}`);
  expect('Mushroom never jumps (no rise over 12 cm in a frame)', r.rises === 0, JSON.stringify(r.ev.filter((e) => e[0] === 'rise').slice(0, 5)));
  expect('Mushroom is never inside his desk', r.inDesk === 0, JSON.stringify(r.ev.filter((e) => e[0] === 'inDesk').slice(0, 5)));
  expect('after each visit attempt he is home on top of the desk (a host may decline while the player stands at his desk)', r.out.length === visits && r.out.every((o) => o[2] < 0.3 && o[3] > 1.4), JSON.stringify(r.out));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `MUSHROOM DESK TEST FAILED (${failures.length})` : 'MUSHROOM DESK TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
