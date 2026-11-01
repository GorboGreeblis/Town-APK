// Visitors to the Ancient while the player is in the Cave (standard tier; the author: "slightly increase the frequency
// of visitors to the Ancient while the user is inside the Cave (the inside of the church). Rates should return to
// normal after the user exits the Cave"; FIXES A3). The visit scheduler draws once per attempt: below 0.125 (0.32 in the
// Cave) the Ancient's visits may be picked, and in the Cave below 0.1 only the Ancient's visits are considered. The
// Cave is checked at every attempt (it used to be a flag refreshed only while some vignette played, so it could stay
// on after the player left).
//
// The draws are forced (Math.random held at one value while one attempt is made), so the outcome is not chance:
//   1. in the Cave, draw 0.05: the visit made is to the Ancient;
//   2. just out of the Cave, draw 0.2 (inside it, 0.32 would allow the Ancient): the visit made is not to the Ancient;
//   3. no page errors.
// Measured (clock run 4 times fast, 48 game minutes each, NOTES 94): visits to the Ancient a game minute, 0.23 outside
// the Cave, 0.23 in it without the 1-in-10 tries, 0.29 with them (about 27% more).
//
//   node tools/test_cave.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, F = D.F, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const church = F.buildings.find((B) => B.name === 'church');
    const total = () => Object.values(J.visits().made).reduce((a, b) => a + b, 0);
    const attempt = async (inCave, draw) => {
      // in the Cave: at the end of the visitors' walkway, where the Ancient is visited (the church's origin is no longer
      // open floor: the player was pushed out of the church before the check, B51)
      if (inCave) { const w = J.slug.visit(1).way, p = w[w.length - 1]; D.At.position.set(p[0], D.At.position.y, p[1]); }
      else { const [x, z] = J.slug.visit(1).out; D.At.position.set(x, D.At.position.y, z + 3); }
      await wait(300);
      const cave = J.vigs.computeInCave(), n0 = total(), before = new Set(J.visits().all.map((v) => v.v + '>' + v.h));
      const R = Math.random; Math.random = () => draw;
      try { J.visitAt(D.Re.t); for (let i = 0; i < 40 && total() === n0; i++) await wait(50); }
      finally { Math.random = R; J.visitAt(D.Re.t + 1e6); }
      const made = J.visits().all.map((v) => v.v + '>' + v.h).filter((k) => !before.has(k));
      return { cave, made };
    };
    const a = await attempt(true, 0.05);
    const b = await attempt(false, 0.2);
    return { a, b };
  });
  note(`in the Cave, draw 0.05: ${JSON.stringify(r.a)}; out of it, draw 0.2: ${JSON.stringify(r.b)}`);
  expect('the player was in the Cave, then out of it', r.a.cave === true && r.b.cave === false);
  expect('in the Cave, a draw below 0.1 makes a visit to the Ancient', r.a.made.length === 1 && /> ?slug$/.test(r.a.made[0]), JSON.stringify(r.a.made));
  expect('just out of the Cave, a draw of 0.2 makes a visit, not to the Ancient (the rate is back to normal)', r.b.made.length === 1 && !/slug$/.test(r.b.made[0]), JSON.stringify(r.b.made));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `CAVE TEST FAILED (${failures.length})` : 'CAVE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
