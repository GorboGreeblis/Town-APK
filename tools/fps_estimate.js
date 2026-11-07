// FPS estimate for the Quest 3S and the Quest 3 (report; the author: "For every improvement: I want an estimate for FPS
// on Quest 3 and Quest 3S"). From a headset run's log (the runtime's line every second: frames shown, refresh, the
// app's GPU time) and a CPU saving measured headless (cpu_bench.js), it estimates what the same run would read with
// the saving, second by second, in the town and in the planting Event.
//
// The model (fitted, not guessed): on the headset the game is limited by the CPU (the GPU has room). A frame whose CPU
// time passes the refresh budget (13.9 ms at 72 Hz) is shown a refresh late, so a second at f fps had a share
// p = refresh / f - 1 of late frames. Each frame's CPU time is the second's mean times (1 + e), e normal with spread
// SIGMA; so p fixes the mean, a saving s scales it by (1 - s), and the new late share gives the new fps. SIGMA comes
// from two runs of one build (4.0.46): plugged in (CPU about 2208 MHz, log 8d197bb0, median 71.6 fps) and on battery
// (about 1600 MHz, log 14b455ce, median 65.4): the same work at 1.38 times the CPU time; the only spread that turns
// one median into the other is 0.49 (the frames vary a lot: the per-frame and periodic work, the collector).
// The Quest 3 has the same chip and about 30% more pixels: the same CPU, the GPU time times 1.3; a second whose GPU
// time then passes the budget is held to what the GPU allows. The run's headset is read from the perf line (dev=):
// a Quest 3 run gives the Quest 3S with the GPU time divided by 1.3 (4.0.63). Seconds while the game is paused (the
// system menu, the headset off) are left out, a second either side.
//
// Estimates, not measurements: the headset run after a change is the check (TASKS T3).
//
//   node tools/fps_estimate.js <headset log> [--town 12] [--event 10] [--sigma 0.49] [--q3gpu 1.3] [--device q3s|q3]
//     --town / --event: the CPU saving in percent (cpu_bench.js's "saving" for the town and the Event views)
const fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = process.argv[2];
if (!file || file.startsWith('--')) { console.error('usage: node tools/fps_estimate.js <headset log> [--town %] [--event %]'); process.exit(2); }
const S_TOWN = +arg('--town', '0') / 100, S_EV = +arg('--event', '0') / 100, SIGMA = +arg('--sigma', '0.49'), Q3GPU = +arg('--q3gpu', '1.3');

let txt = fs.readFileSync(file);
txt = (txt[0] === 0xff && txt[1] === 0xfe) ? txt.toString('utf16le') : txt.toString('utf8');
const lines = txt.split(/\r?\n/);
const ts = (l) => { const m = l.match(/^(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)\.(\d+)/); return m ? ((+m[3] * 60 + +m[4]) * 60 + +m[5]) + +('0.' + m[6]) : null; };
// the game's runtime lines: FPS=a/b with b the refresh; the process that draws the game is the one whose lines sit
// inside the game's session (between its first and last page line)
const page = lines.filter((l) => /GreeblisServer: page: m=/.test(l)).map(ts).filter((t) => t !== null);
const t0 = page[0], t1 = page[page.length - 1];
// the Event's spans from the game's event trail
const spans = []; let open = null;
for (const l of lines) {
  if (!/GreeblisServer: page: m=\d+ms ev event /.test(l)) continue;
  const t = ts(l); if (/false > true/.test(l)) open = t; else if (/true > false/.test(l) && open !== null) { spans.push([open, t]); open = null; }
}
if (open !== null) spans.push([open, t1]);
const inEvent = (t) => spans.some(([a, b]) => t >= a && t <= b);
// the game's pauses (all input gone, the window's focus lost, the session blurred: the system menu or the headset off)
// with a second either side: those seconds are the system's, not the game's (4.0.63)
const pauses = []; let pOpen = null;
for (const l of lines) {
  if (!/GreeblisServer: page: m=/.test(l)) continue;
  const t = ts(l);
  if (/the game pauses|xr visibility visible-blurred|window blur/.test(l)) { if (pOpen === null) pOpen = t; }
  else if (/the game resumes|xr visibility visible$|window focus/.test(l) && pOpen !== null) { pauses.push([pOpen - 1, t + 1]); pOpen = null; }
}
if (pOpen !== null) pauses.push([pOpen - 1, t1 + 1]);
const paused = (t) => pauses.some(([a, b]) => t >= a && t <= b);
// the headset the run was on (the perf line's dev=): the estimate is made for the other one too
const devM = lines.map((l) => (l.match(/ perf fps=.* dev=(\S+)/) || [])[1]).find(Boolean) || 'Quest_3S';
// --device q3s|q3 says which headset the run was on: the browser's user agent (the perf line's dev=) reads "Quest 3" on
// a Quest 3S too (the author's 4.0.62 run on a Quest 3S logged dev=Quest_3), so dev= cannot tell them apart
const DEV = arg('--device', null);
const BASE_Q3 = DEV ? /^q3$/i.test(DEV) : /^Quest_3$/.test(devM);
const secs = [];
for (const l of lines) {
  const m = l.match(/VrApi\s*: FPS=(\d+)\/(\d+).*?App=([\d.]+)ms/); if (!m) continue;
  const t = ts(l); if (t === null || t < t0 + 15 || t > t1 || paused(t)) continue;   // after the first 15 s (loading); not while paused
  const f = +m[1], hz = +m[2], gpu = +m[3]; if (hz < 60 || f < 20) continue;
  secs.push({ t, f: Math.min(f, hz), hz, gpu, ev: inEvent(t) });
}
if (!secs.length) { console.error('no runtime lines inside the game session'); process.exit(1); }

// normal distribution helpers
const erf = (x) => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const invPhi = (p) => { let lo = -8, hi = 8; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
// a second at f of hz: the late share p, the mean CPU time as a share of the budget (a = budget / mean)
const est = (s, saving, gpuScale) => {
  const p = Math.min(0.999, Math.max(1e-4, s.hz / s.f - 1));
  const z = invPhi(1 - p);                 // budget = mean * (1 + SIGMA * z)
  const a = 1 + SIGMA * z;                 // budget / mean
  const a2 = a / (1 - saving);             // the saving lowers the mean
  const p2 = 1 - Phi((a2 - 1) / SIGMA);
  let f2 = s.hz / (1 + p2);
  if (!saving) f2 = s.f;                            // no saving: the second as run
  const gpu = s.gpu * gpuScale, budget = 1000 / s.hz;
  if (gpu > 0.92 * budget) f2 = Math.min(f2, s.hz * Math.min(1, (0.92 * budget) / gpu) + 0.5);
  return Math.min(s.hz, f2);
};
const stats = (a) => { const s = a.slice().sort((x, y) => x - y), q = (k) => s[Math.min(s.length - 1, Math.max(0, Math.round(k * (s.length - 1))))]; return { n: s.length, min: s[0], p10: q(0.1), median: q(0.5), under60: s.filter((x) => x < 59.5).length }; };
// the longest stretch under 60 (seconds in a row, in the order played; Performance.1's reviewer looks for "extended
// periods of rendering rate below 60 fps" on a graph, not for single seconds), and the stretches of 3 s or more
const runs = (a) => { let cur = 0, best = 0, n3 = 0; for (const f of a) { if (f < 59.5) { cur++; if (cur > best) best = cur; if (cur === 3) n3++; } else cur = 0; } return { best, n3 }; };
const fmt = (x, r) => `median ${x.median.toFixed(1)}, lowest 10% ${x.p10.toFixed(1)}, lowest ${x.min.toFixed(1)}, ${x.under60} of ${x.n} s under 60 (${(100 * x.under60 / x.n).toFixed(0)}%)` + (r ? `; longest run under 60: ${r.best} s, runs of 3 s or more: ${r.n3}` : '');

console.log(`fps_estimate: ${file.split('/').pop()} (run on ${DEV ? (BASE_Q3 ? 'Quest 3' : 'Quest 3S') + ', as given' : devM.replace('_', ' ') + ' (the user agent; a Quest 3S reads Quest 3 too: pass --device)'}; ${pauses.length} pauses left out): ${secs.length} s of play (${secs.filter((s) => s.ev).length} in the Event); saving town ${(100 * S_TOWN).toFixed(1)}%, Event ${(100 * S_EV).toFixed(1)}%; spread ${SIGMA}`);
for (const [label, pick, sv] of [['town', (s) => !s.ev, S_TOWN], ['the Event', (s) => s.ev, S_EV]]) {
  const sel = secs.filter(pick); if (!sel.length) continue;
  const now = stats(sel.map((s) => s.f));
  // the run's own headset as run; the other with its GPU time scaled (the Quest 3 1.3 times the 3S's), the same CPU
  const other = BASE_Q3 ? 1 / Q3GPU : Q3GPU, [mine, theirs] = BASE_Q3 ? ['Quest 3', 'Quest 3S'] : ['Quest 3S', 'Quest 3'];
  const aNow = sel.map((s) => s.f), aMine = sel.map((s) => est(s, sv, 1)), aTheirsNow = sel.map((s) => est(s, 0, other)), aTheirs = sel.map((s) => est(s, sv, other));
  const mineEst = stats(aMine), theirsNow = stats(aTheirsNow), theirsEst = stats(aTheirs);
  console.log(`  ${label}:`);
  console.log(`    ${(mine + ', as run:').padEnd(22)} ${fmt(now, runs(aNow))}`);
  console.log(`    ${(mine + ', estimated:').padEnd(22)} ${fmt(mineEst, runs(aMine))}`);
  console.log(`    ${(theirs + ', as run (est):').padEnd(22)} ${fmt(theirsNow, runs(aTheirsNow))}`);
  console.log(`    ${(theirs + ', estimated:').padEnd(22)} ${fmt(theirsEst, runs(aTheirs))}`);
}
