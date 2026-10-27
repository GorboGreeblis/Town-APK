// Jazz drums timing (standard tier). King Dino's kit plays a swung pattern at 104 beats a minute (a bar of 2.31 s:
// brushes for 8 bars, then time, funk, trades and shout choruses of 8 bars each). Heard (the player on the dance
// floor or at the kit, or in a battle) it is scheduled on the audio clock up to 3 s ahead; within 45 m but not heard
// it runs on the game clock only, to move the drummer's sticks. Either way each hit is handed to the drummer's
// animation when its time comes. This checks, on both clocks: every hit lies on the beat grid (quarter beats and
// swung thirds of a beat from the bar's start), bars follow each other exactly, hits reach the animation at most one
// frame late and never early, the audio clock keeps its 3 s look-ahead, and the drums fall silent while the horn plays
// or the player walks away.
//
//   node tools/test_jazz.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const page = g.page;
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP.jazz, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = {};
    if (!J) return { missing: true };
    const BEAT = 60 / 104, BAR = 4 * BEAT;
    let log = null;
    const u0 = J.update;
    J.update = function (tt, on) {
      const f = u0.apply(this, arguments);
      if (log) { const st = J.state, ctx = D.G.ctx && D.G.ctx(); const now = st.clock === 'a' ? ctx.c.currentTime : tt; log.push({ clock: st.clock, now, ahead: st.ahead, fired: f ? f.map((x) => [x[0], x[1]]) : [] }); }
      return f;
    };
    const gs = () => D.Re.t;
    const record = async (x, z, gameS) => {
      D.At.position.set(x, D.At.position.y, z); await wait(800);
      log = []; const g0 = gs(), w0 = performance.now();
      while (gs() - g0 < gameS && performance.now() - w0 < gameS * 6000) await wait(100);
      const l = log; log = null; return l;
    };
    const judge = (l) => {
      const clocks = [...new Set(l.map((e) => e.clock))];
      const hits = []; let late = 0, early = 0, maxLate = 0, prevNow = null;
      for (const e of l) { for (const [t, v] of e.fired) { hits.push([t, v]); const d = e.now - t; if (d < -1e-6) early++; maxLate = Math.max(maxLate, d); } prevNow = e.now; }
      // the beat grid: bars start BAR apart from the first crash or brush-on-one; every hit is on a twelfth of a beat
      const frames = l.slice(1).map((e, i) => e.now - l[i].now).filter((d) => d > 0).sort((a, b) => a - b);
      const frame = frames.length ? frames[Math.floor(frames.length * 0.95)] : 0;
      for (const e of l) for (const [t] of e.fired) if (e.now - t > frame + 0.02) late++;
      const t0 = hits.length ? hits[0][0] : 0;
      const off = hits.map(([t]) => { const q = ((t - t0) / BEAT) * 12; return Math.abs(q - Math.round(q)) * BEAT / 12; });
      const offGrid = off.filter((d) => d > 0.002).length;
      return { clocks, hits: hits.length, kinds: [...new Set(hits.map((h) => h[1]))], early, late, maxLate: +maxLate.toFixed(3), frame: +frame.toFixed(3), offGrid, maxOff: +Math.max(0, ...off).toFixed(4), aheadMin: Math.min(...l.filter((e) => e.clock === 'a').map((e) => e.ahead)), bar: J.state.bar, part: J.state.part };
    };
    // heard: at the kit (the audio clock)
    out.heard = judge(await record(-36.6, 21.2, 14));
    // within 45 m, not heard (the game clock, the drummer's sticks only)
    out.ghost = judge(await record(-34.8, -2, 14));
    // far away: off
    const far = await record(30, -30, 4); out.far = { clocks: [...new Set(far.map((e) => e.clock))], fired: far.reduce((a, e) => a + e.fired.length, 0) };
    // the horn takes over: the drums stop while it plays
    if (D.ee && D.ee.start) {
      D.At.position.set(-36.6, D.At.position.y, 21.2); await wait(1500);
      D.ee.start(gs()); const l = await record(-36.6, 21.2, 3); D.ee.stop && D.ee.stop();
      out.horn = { clocks: [...new Set(l.map((e) => e.clock))], fired: l.reduce((a, e) => a + e.fired.length, 0) };
    }
    J.update = u0;
    out.BAR = BAR;
    return out;
  });
  if (r.missing) { expect('JGP.jazz exists', false, 'not found'); await g.close(); process.exit(1); }
  note('heard: ' + JSON.stringify(r.heard)); note('within 45 m: ' + JSON.stringify(r.ghost)); note('far: ' + JSON.stringify(r.far) + '; horn: ' + JSON.stringify(r.horn));
  expect('at the kit the drums run on the audio clock and play (14 game seconds, about 6 bars)', r.heard.clocks.includes('a') && r.heard.hits >= 40, JSON.stringify(r.heard));
  expect('within 45 m but not heard they run on the game clock (the sticks move, no sound)', r.ghost.clocks.includes('g') && !r.ghost.clocks.includes('a') && r.ghost.hits >= 40, JSON.stringify(r.ghost));
  for (const [k, x] of [['heard', r.heard], ['within 45 m', r.ghost]]) {
    expect(`${k}: every hit lies on the beat grid (a twelfth of a beat at 104 bpm, within 2 ms)`, x.offGrid === 0, JSON.stringify({ offGrid: x.offGrid, maxOff: x.maxOff }));
    expect(`${k}: hits reach the drummer's animation when due, never early, at most one frame late`, x.early === 0 && x.late === 0, JSON.stringify({ early: x.early, late: x.late, maxLate: x.maxLate, frame: x.frame }));
  }
  expect('heard: the audio is scheduled ahead of the clock (the 3 s look-ahead never runs dry)', r.heard.aheadMin > 0, String(r.heard.aheadMin));
  expect('far from the kit the drums are off', r.far.fired === 0 && r.far.clocks.every((c) => c === ''), JSON.stringify(r.far));
  if (r.horn) expect('the drums stop while the horn plays', r.horn.fired === 0, JSON.stringify(r.horn));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `JAZZ TEST FAILED (${failures.length})` : 'JAZZ TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
