// No townsfolk ever stuck (standard tier; the author: Fortizmo "getting stuck while trying to move into the bar area",
// "please ensure that the issue that caused Fortizmo to get stuck does not occur with other NPCs as well"; FIXES F-B55).
// Fortizmo was stuck when a visit's waypoint (outside her bar) became her home for a moment: the route planner added
// her bar's doorway route to it, into a bar she then collided with as a solid block; the stuck detector did not see
// her jiggling against the counter as stuck. The doorway routes (Fortizmo's bar, the Mushroom's ramp, Gemtoe's gazebo,
// Zollod's kiosk) are now used only for the townsfolk's real home inside, and no progress towards a target for 5 s
// counts as stuck.
//
// Natural play with the visit scheduler on, the clock run 4 times fast, and on top of it visits forced to and from
// each townsfolk with a doorway route, one every 30 game seconds; every 250 ms, for every townsfolk that wants to
// move (not busy, not in a vignette, not held), its distance to its target (the walk's waypoint, or its home):
//   - no townsfolk goes 12 game seconds without getting 0.3 m closer to a target over 0.6 m away;
//   - the stuck detector's last resort ("no progress" in the log) never trips;
//   - every townsfolk with a doorway route is back home at the end;
//   - no page errors.
//
//   node tools/test_stuck.js [file] [game minutes, default 12]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? path.resolve(process.argv[2]) : undefined;
const MIN = Number(process.argv.find((a, i) => i > 1 && /^\d+$/.test(a)) || 12);
const FAST = `(() => { const n = performance.now.bind(performance), t0 = n(); performance.now = () => t0 + (n() - t0) * 4; })();`;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, noVisits: false, initScripts: [FAST] });
  const r = await g.page.evaluate(async (MIN) => {
    const D = window.__dbg, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const logs = []; const L0 = window.__gtLog; window.__gtLog = (s) => { if (/^no progress/.test(s)) logs.push(s); try { L0 && L0(s); } catch (e) {} };
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 300);
    D.At.position.set(-20, D.At.position.y, -25);
    const viaE = D.It.all.filter((e) => e.def && e.def.via && e.def.via.length), via = viaE.map((e) => e.id || e.def.__type);
    const partners = ['p_gemtoe', 'gorbo', 'cutebex', 'blinker', 'p_mamagorbo', 'gratelet', 'drifter', 'p_etcher', 'frog', 'p_glyph'].filter((k) => D.It.byId[k]);
    const track = new Map(), spells = []; let forced = 0, nextForce = D.Re.t + 5;
    const g0 = D.Re.t;
    while (D.Re.t - g0 < MIN * 60) {
      await wait(250);
      const t = D.Re.t;
      if (t > nextForce) {
        nextForce = t + 30;
        const a = via[forced % via.length], b = partners.filter((k) => k !== a)[forced % (partners.length - 1)];
        const pair = forced % 2 ? [a, b] : [b, a]; forced++;
        try { J.visitAt(t, pair[0], pair[1]); } catch (e) {}
      }
      for (const e of D.It.all) {
        if (!e.id || e.busy || e.vig || e.held) { track.delete(e); continue; }
        const q = e.goHome && e.dest ? e.dest : e.pattern ? e.home : e.dest, p = e.group.position;
        if (!q || !(e.gcWant > 0)) { track.delete(e); continue; }
        const d = Math.hypot(p.x - q.x, p.z - q.z), k = track.get(e);
        if (!k || k.q !== q || k.x !== q.x || k.z !== q.z || d < k.best - 0.3) { track.set(e, { q, x: q.x, z: q.z, best: d, t0: t }); continue; }
        if (d > 0.6 && t - k.t0 > 12 && !k.told) { k.told = true; spells.push({ id: e.id, at: [+p.x.toFixed(2), +p.z.toFixed(2)], target: [+q.x.toFixed(2), +q.z.toFixed(2)], d: +d.toFixed(2), visiting: !!e.visiting, hosting: !!e.hosting, t: +(t - g0).toFixed(0) }); }
      }
    }
    J.visitAt(D.Re.t + 1e6);
    // home again: every doorway townsfolk within 2 game minutes
    const t1 = D.Re.t; let away = viaE;
    while (D.Re.t - t1 < 120) { await wait(500); away = viaE.filter((e) => { const p = e.group.position; return e.visiting || e.hosting || Math.hypot(p.x - e.home.x, p.z - e.home.z) > 0.5 || !J.homeGround(e); }); if (!away.length) break; }
    return { minutes: +((D.Re.t - g0) / 60).toFixed(1), made: Object.values(J.visits().made).reduce((a, b) => a + b, 0), forced, via, spells, logs: logs.slice(0, 8), nLogs: logs.length, away: away.map((e) => e.id || e.def.name) };
  }, MIN);
  await g.close();
  note(`${r.minutes} game minutes, ${r.made} visits (${r.forced} forced to and from ${r.via.join(', ')})`);
  expect('no townsfolk goes 12 game seconds without getting closer to its target', r.spells.length === 0, JSON.stringify(r.spells.slice(0, 6)));
  expect('the stuck detector\'s last resort never trips ("no progress")', r.nLogs === 0, r.logs.join(' | '));
  expect('every townsfolk with a doorway route is back home at the end', r.away.length === 0, r.away.join(', '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `STUCK TEST FAILED (${failures.length})` : 'STUCK TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
