// Event sweep (report; T16, the author: "Please eventually test watching the Event from all possible distances, for
// performance"): watches the planting Event from rings around the Garden (every --radii distance, --dirs directions,
// facing the middle; positions outside the fence are left out), with the mist at full, at the headset's field of view
// in multiview. For each view: draws, triangles and three.js's render time (headless, averaged over --ms; compare runs on
// the same machine, not with the headset). With --apply "EXPR" each view is measured twice, as the game is and with EXPR
// evaluated in the page (v = true to apply, false to undo: a what-if, e.g. hiding a set of objects), so a change's saving
// is measured view by view before it is built. Prints every view, then the worst views and the averages.
//
//   node tools/event_sweep.js [file] [--radii 10,20,30,40,50] [--dirs 8] [--ms 1500] [--eye 1.6] [--apply "EXPR"]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const path = require('path');
const { boot } = require('./lib/harness');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const RADII = arg('--radii', '10,20,30,40,50').split(',').map(Number), DIRS = +arg('--dirs', '8'), MS = +arg('--ms', '1500');
const APPLY = arg('--apply', null);

(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async ({ RADII, DIRS, MS, APPLY }) => {
    const D = window.__dbg, J = D.JGP, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50);
    while (J.mist.p() < 1 && performance.now() - t0 < 120000) await wait(200);
    // render time and draw counts of the frames drawn in a window
    const R = O.render; let acc = 0, n = 0, calls = 0, tris = 0;
    O.render = function () { const a = performance.now(); try { return R.apply(this, arguments); } finally { acc += performance.now() - a; n++; calls += O.info.render.calls; tris += O.info.render.triangles; } };
    const measure = async () => { await wait(250); acc = n = calls = tris = 0; await wait(MS); return { ms: +(acc / Math.max(1, n)).toFixed(2), draws: Math.round(calls / Math.max(1, n)), tris: Math.round(tris / Math.max(1, n)) }; };
    const what = APPLY ? new Function('v', 'D', 'J', APPLY) : null;
    const views = [];
    for (const rad of RADII) for (let k = 0; k < DIRS; k++) {
      const a = k * 2 * Math.PI / DIRS, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (x < -37 || x > 37 || z < -37 || z > 49) continue;   // inside the fence: where the player can stand
      D.At.position.set(x, D.At.position.y, z); window.__fakeXR.pose.yaw = Math.atan2(x, z);   // face the middle
      const v = { at: [+x.toFixed(1), +z.toFixed(1)], r: rad, base: await measure() };
      if (what) { what(true, D, J); v.applied = await measure(); what(false, D, J); }
      views.push(v);
      if (!D.me.active) break;   // the Event ended: later views would not be the Event's
    }
    O.render = R;
    return { views, active: !!D.me.active };
  }, { RADII, DIRS, MS, APPLY });
  await g.close();
  const f = (m) => `${String(m.draws).padStart(4)} draws ${String(Math.round(m.tris / 1000)).padStart(4)}k tris ${m.ms.toFixed(2).padStart(6)} ms`;
  for (const v of r.views) console.log(`  r ${String(v.r).padStart(2)} m at (${v.at.join(', ')}): ${f(v.base)}` + (v.applied ? `  ->  ${f(v.applied)}  (${v.applied.draws - v.base.draws} draws)` : ''));
  const avg = (k, s) => (r.views.reduce((a, v) => a + (v[s] ? v[s][k] : 0), 0) / Math.max(1, r.views.length));
  const worst = r.views.slice().sort((a, b) => b.base.draws - a.base.draws).slice(0, 5);
  console.log(`${r.views.length} views${r.active ? '' : ' (the Event ended during the sweep)'}; average ${avg('draws', 'base').toFixed(0)} draws, ${avg('ms', 'base').toFixed(2)} ms` + (APPLY ? `; applied: ${avg('draws', 'applied').toFixed(0)} draws, ${avg('ms', 'applied').toFixed(2)} ms` : ''));
  console.log('heaviest views: ' + worst.map((v) => `(${v.at.join(', ')}) ${v.base.draws}` + (v.applied ? ` -> ${v.applied.draws}` : '')).join('; '));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
