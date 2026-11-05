// CPU benchmark (report, not in the tiers; the author's battery run 14b455ce on 4.0.46: "failing the above 60 fps bar
// is a blocker"): the main thread's time in the game's XR frame callback (the whole frame: the game's update, three.js's
// render, the batcher, the holds), at fixed views in the town and in the planting Event, for one game file or two
// compared. On the headset the game is limited by the CPU (the GPU has room), so this is the measure for CPU savings;
// feed the saving it prints to fps_estimate.js for the Quest 3S and Quest 3.
//   - views: the town at the battery run's slowest spots, each facing the town's centre, and the Event (mist full) at
//     its slowest spots, its heaviest view (the south-west corner) and the author's low spot;
//   - per view: --frames XR frames after a 1.5 s settle; the mean callback time, the draws and the triangles;
//   - two files: alternating rounds (A, B, A, B...) so drift on the machine falls on both; the saving per view and in
//     all is the median over the rounds.
// Headless frame times are not the headset's (software GL, a desktop CPU); the ratio between two builds is what carries
// over. Run on a quiet machine (no other browser tests).
//
//   GT_HEADSET_FOV=1 node tools/cpu_bench.js [fileA] [fileB] [--rounds 2] [--frames 240] [--town] [--event] [--toggle expr]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const path = require('path');
const { boot } = require('./lib/harness');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const files = process.argv.slice(2).filter((a, i, A) => !a.startsWith('--') && !(i && /^--(rounds|frames|toggle)$/.test(A[i - 1]))).map((f) => path.resolve(f));
const TOGGLE = arg('--toggle', null);
const ROUNDS = +arg('--rounds', '2'), FRAMES = +arg('--frames', '240');
const onlyTown = process.argv.includes('--town'), onlyEvent = process.argv.includes('--event');
// [label, x, z]; each view faces the town's centre (yaw = atan2(x, z): 0 looks north, -z)
const TOWN = [['town (21,25)', 21, 25], ['town (-22,-23)', -22, -23], ['town (-15,23)', -15, 23], ['town (-36,-20) start', -36, -20], ['town (5,-12)', 5, -12]];
const EVENT = [['Event (26,-23)', 26, -23], ['Event (-9,35)', -9, 35], ['Event SW corner (-28.3,-28.3)', -28.3, -28.3], ['Event low spot (-33,-7)', -33, -7]];

async function run(file) {
  const g = await boot({ file, vr: true, fastSim: false });
  const views = [...(onlyEvent ? [] : TOWN), ...(onlyTown ? [] : EVENT)];
  const out = await g.page.evaluate(async ({ views, FRAMES, TOGGLE }) => {
    const D = window.__dbg, X = window.__fakeXR, O = D.O, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(2500);
    const res = [];
    const set = TOGGLE ? new Function('X', TOGGLE.replace(/\bX\b/g, 'X')) : null;
    const frames = (n) => new Promise((r) => { const f0 = X.frames; const k = () => (X.frames - f0 >= n ? r() : setTimeout(k, 2)); k(); });
    const measure = async (v) => {
      D.At.position.set(v[1], D.At.position.y, v[2]); X.pose.yaw = Math.atan2(v[1], v[2]); await wait(1500);
      if (set) {
        // windows of 30 frames, the two sides in turns; each side's figure is the median window (a window the software
        // renderer's threads slowed is an outlier, and the median ignores it)
        const acc = [{ w: [], f: 0 }, { w: [], f: 0 }]; let draws = 0, tris = 0, n = 0;
        for (let k = 0; acc[0].f < FRAMES || acc[1].f < FRAMES; k++) {
          const side = k % 2; set(!!side); await frames(2);   // the switch settles over two frames
          const f0 = X.frames, c0 = X.cbMs; await frames(30);
          acc[side].w.push((X.cbMs - c0) / (X.frames - f0)); acc[side].f += X.frames - f0; draws += O.info.render.calls; tris += O.info.render.triangles; n++;
        }
        set(true);
        const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
        res.push({ v: v[0], ms: med(acc[0].w), ms1: med(acc[1].w), draws: Math.round(draws / n), tris: Math.round(tris / n) });
        return;
      }
      const f0 = X.frames, c0 = X.cbMs; let draws = 0, tris = 0, n = 0;
      while (X.frames - f0 < FRAMES) { await wait(100); draws += O.info.render.calls; tris += O.info.render.triangles; n++; }
      res.push({ v: v[0], ms: (X.cbMs - c0) / (X.frames - f0), draws: Math.round(draws / n), tris: Math.round(tris / n) });
    };
    for (const v of views.filter((v) => v[0].startsWith('town'))) await measure(v);
    if (views.some((v) => v[0].startsWith('Event'))) {
      const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
      const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
      const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50);
      while (D.JGP.mist.p() < 1 && performance.now() - t0 < 120000) await wait(200);
      await wait(3000);
      for (const v of views.filter((v) => v[0].startsWith('Event'))) await measure(v);
    }
    return res;
  }, { views, FRAMES, TOGGLE });
  await g.close();
  return out;
}

(async () => {
  if (TOGGLE) {
    const res = await run(files[0]);
    console.log(`cpu_bench --toggle ${TOGGLE}: ${FRAMES} frames each side a view, in turns of 30; the main thread's ms per XR frame`);
    const t = { town: [0, 0, 0], ev: [0, 0, 0] };
    for (const x of res) { const k = x.v.startsWith('town') ? 'town' : 'ev'; t[k][0] += x.ms; t[k][1] += x.ms1; t[k][2]++;
      console.log(`  ${x.v.padEnd(32)} off ${x.ms.toFixed(2)} ms  on ${x.ms1.toFixed(2)} ms  saving ${(100 * (1 - x.ms1 / x.ms)).toFixed(1)}%  (${x.draws} draws, ${Math.round(x.tris / 1000)}k tris)`); }
    for (const k of ['town', 'ev']) if (t[k][2]) console.log(`  ${(k === 'town' ? 'town, mean' : 'Event, mean').padEnd(32)} off ${(t[k][0] / t[k][2]).toFixed(2)} ms  on ${(t[k][1] / t[k][2]).toFixed(2)} ms  saving ${(100 * (1 - t[k][1] / t[k][0])).toFixed(1)}%`);
    process.exit(0);
  }
  const F = files.length ? files : [undefined];
  const runs = F.map(() => []);
  for (let r = 0; r < ROUNDS; r++) for (let i = 0; i < F.length; i++) { runs[i].push(await run(F[i])); process.stderr.write(`round ${r + 1} ${F[i] ? path.basename(F[i]) : 'the asset'} done\n`); }
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const views = runs[0][0].map((x) => x.v);
  const row = (i, v) => { const xs = runs[i].map((r) => r.find((x) => x.v === v)); return { ms: med(xs.map((x) => x.ms)), draws: med(xs.map((x) => x.draws)), tris: med(xs.map((x) => x.tris)) }; };
  console.log(`cpu_bench: ${ROUNDS} round(s), ${FRAMES} frames a view; the main thread's ms per XR frame (median over rounds)`);
  const tot = F.map(() => ({ town: 0, ev: 0, nt: 0, ne: 0 }));
  for (const v of views) {
    const cells = F.map((f, i) => row(i, v));
    cells.forEach((c, i) => { if (v.startsWith('town')) { tot[i].town += c.ms; tot[i].nt++; } else { tot[i].ev += c.ms; tot[i].ne++; } });
    const d = cells.length > 1 ? `  saving ${(100 * (1 - cells[1].ms / cells[0].ms)).toFixed(1)}%` : '';
    console.log(`  ${v.padEnd(32)} ${cells.map((c) => `${c.ms.toFixed(2)} ms (${c.draws} draws, ${Math.round(c.tris / 1000)}k tris)`).join('  |  ')}${d}`);
  }
  for (const k of ['town', 'ev']) {
    const n = k === 'town' ? 'nt' : 'ne'; if (!tot[0][n]) continue;
    const a = tot.map((t) => t[k] / t[n]);
    console.log(`  ${(k === 'town' ? 'town, mean' : 'Event, mean').padEnd(32)} ${a.map((x) => x.toFixed(2) + ' ms').join('  |  ')}${a.length > 1 ? `  saving ${(100 * (1 - a[1] / a[0])).toFixed(1)}%` : ''}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
