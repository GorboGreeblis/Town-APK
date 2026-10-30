// Headset frame-rate log reader: turns the `perf` lines the game posts to logcat every ten seconds
// (3.15.27, HEADSET_DIAG.md) into the same picture the performance report gives headless: frame rate
// by scene (town, the planting Event), the lowest readings and where the player stood, the governor
// levels, and verdicts against the target (72 fps, the headset's refresh rate: the author's aim) and the
// Store's floor (60 fps, VRC.Quest.Performance.1).
//
//   adb logcat -c; adb logcat -v threadtime -s GreeblisServer VrApi > run.txt   (live, while playing; Ctrl+C after)
//   (`adb logcat -d` dumps a ring buffer that a long session overruns: only its last minutes survive)
//   node tools/perf_log.js run.txt
// A log saved by Windows PowerShell (UTF-16) is read as well. Each reading carries the render scale in force at the
// time (from the layer lines), the layer swaps are listed with their times, and the limiter is named from the
// readings themselves: whichever of draw calls and triangles the frame rate follows more closely.
// Since 3.15.57 it also reads the flight recorder written after each flash mark, geometry first drawn inside a frame,
// the XR focus changes and the event trail (`--trail` prints it), and finds the stretches when another process (the
// system shell) drew instead of the game (HEADSET_DIAG.md, D3).
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node tools/perf_log.js <logcat.txt>'); process.exit(2); }
const buf = fs.readFileSync(file);
// PowerShell's `>` writes UTF-16 little-endian with a byte-order mark; plain adb output is UTF-8
const text = (buf[0] === 0xff && buf[1] === 0xfe) || (buf.length > 3 && buf[1] === 0 && buf[3] === 0) ? buf.toString('utf16le').replace(/^\ufeff/, '') : buf.toString('utf8');
const re = /(?:m=(\d+)ms )?perf fps=([\d.]+) level=(\d+) calls=(\d+) tris=(\d+)( event)? at=(-?\d+),(-?\d+)(?: dev=(\S+))?/g;
const rows = []; let m;
while ((m = re.exec(text))) rows.push({ ms: m[1] ? +m[1] : null, fps: +m[2], level: +m[3], calls: +m[4], tris: +m[5], event: !!m[6], x: +m[7], z: +m[8], dev: m[9] || 'unknown' });
// the render scale over time, from the layer lines ("projection layer swapped to scale 0.82", "... live, scale 1")
const swaps = []; const rs = /m=(\d+)ms projection layer (?:swapped to scale|live, scale) ([\d.]+)/g;
while ((m = rs.exec(text))) swaps.push({ ms: +m[1], scale: +m[2] });
swaps.sort((a, b) => a.ms - b.ms);
// a swap logs twice (the new layer live, then the old one dropped a frame or two later): keep one
for (let i = swaps.length - 1; i > 0; i--) if (swaps[i].scale === swaps[i - 1].scale && swaps[i].ms - swaps[i - 1].ms < 2000) swaps.splice(i, 1);
for (const r of rows) { if (r.ms === null) continue; let sc = null; for (const w of swaps) if (w.ms <= r.ms) sc = w.scale; r.scale = sc; }
// The headset runtime's own line, once a second per XR app ("VrApi : FPS=66/72,...,Stale=8,..."): it survives when the
// game's lines do not, and it counts every second, not one in ten. The game runs in the browser's process: the one that
// also logs Chromium lines.
{
  const vr = {}, chrome = new Set(); let v;
  const rv = /^\d+-\d+ (\d+):(\d+):(\d+)\.\d+\s+(\d+)\s+\d+ \w VrApi\s*: FPS=(\d+)\/(\d+),.*?Stale=(\d+)(?:.*?App=([\d.]+)ms)?(?:.*?GPU%=([\d.]+))?(?:,CPU%=([\d.]+))?/gm;
  while ((v = rv.exec(text))) (vr[v[4]] = vr[v[4]] || []).push({ t: v[1] + ':' + v[2] + ':' + v[3], fps: +v[5], hz: +v[6], stale: +v[7], app: v[8] ? +v[8] : null, gpu: v[9] ? +v[9] : null, cpu: v[10] ? +v[10] : null });
  const rc = /^\d+-\d+ [\d:.]+\s+(\d+)\s+\d+ \w (?:chromium|cr_\w+)/gm; while ((v = rc.exec(text))) chrome.add(v[1]);
  // the scene of each second, from the game's own perf lines (their logcat time and the "event" flag)
  const scene = []; const rp = /^\d+-\d+ (\d+):(\d+):(\d+)\.\d+.*?perf fps=[\d.]+[^\n]*?( event)? at=/gm; let sp;
  while ((sp = rp.exec(text))) scene.push({ s: 3600 * sp[1] + 60 * sp[2] + +sp[3], ev: !!sp[4] });
  const sceneAt = (t) => { const [h, m2, s2] = t.split(':').map(Number), x = 3600 * h + 60 * m2 + s2; let r = null; for (const q of scene) if (q.s <= x + 10 && q.s >= x - 1) { r = q.ev ? 'the Event' : 'town'; if (q.s >= x) break; } return r; };
  // the game's process: the browser's (it logs Chromium lines); in a capture filtered to the game's and the runtime's
  // tags there are none, so the process with the most runtime lines
  if (!chrome.size && Object.keys(vr).length) chrome.add(Object.entries(vr).sort((p, q) => q[1].length - p[1].length)[0][0]);
  for (const [pid, list] of Object.entries(vr)) {
    const f = list.map((x) => x.fps).sort((a, b) => a - b), st = list.reduce((a, x) => a + x.stale, 0);
    const u60 = list.filter((x) => x.fps < 60), uhz = list.filter((x) => x.fps < x.hz - 1);
    console.log(`headset runtime (VrApi), process ${pid}${chrome.has(pid) ? ' (the game)' : ''}: ${list.length} s from ${list[0].t} to ${list[list.length - 1].t}; ` +
      `${f[0]}-${f[f.length - 1]} fps (median ${f[Math.floor(f.length / 2)]}), refresh ${[...new Set(list.map((x) => x.hz))].join('/')} Hz; ` +
      `${uhz.length} s under the refresh rate, ${u60.length} s under 60${u60.length ? ' (' + u60.map((x) => x.t + ' ' + x.fps).slice(0, 8).join(', ') + ')' : ''}; ${st} stale frames`);
    // CPU or GPU: in the seconds under the refresh rate, the app's GPU time against the frame budget
    if (chrome.has(pid) && list.some((x) => x.app !== null)) {
      const med = (a) => { const b = a.filter((x) => x !== null).sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)] : null; };
      for (const sc of ['town', 'the Event', null]) {
        const slow = list.filter((x) => x.fps < x.hz - 1 && x.fps > 20 && sceneAt(x.t) === sc); if (!slow.length) continue;
        const app = med(slow.map((x) => x.app)), gpu = med(slow.map((x) => x.gpu)), cpu = med(slow.map((x) => x.cpu)), budget = 1000 / med(slow.map((x) => x.hz));
        const verdict = app === null ? '' : app < 0.8 * budget ? `CPU-bound: the GPU has room (app GPU time ${app} ms of a ${budget.toFixed(1)} ms frame)` : `GPU-bound (app GPU time ${app} ms of a ${budget.toFixed(1)} ms frame)`;
        console.log(`  ${sc || 'unlabelled'}: ${slow.length} s under the refresh rate, median ${med(slow.map((x) => x.fps))} fps, GPU busy ${gpu}, CPU ${cpu}; ${verdict}`);
      }
    }
  }
}
// Flash marks (B on the right controller, 3.15.48): each with what the log shows in the 3 s before it
{
  const ev = []; let e2; const re2 = /m=(\d+)ms (MARK flash seen[^\n]*|long frame \d+ ms[^\n]*|uploaded \d+ texture[^\n]*|multiview: \d+ shader program[^\n]*|multiview: \w+ while a frame draws[^\n]*|frame \d+: \d+ geometry buffer[^\n]*|ev [^\n]*|xr visibility [^\n]*|rec [^\n]*|frame gap \d+ ms[^\n]*|frame \d+ drew \d+ calls[^\n]*|frame \d+: the camera matrix[^\n]*|governor level [^\n]*|geometry held for one frame[^\n]*|shader held for one frame[^\n]*|no progress: [^\n]*|head inside [^\n]*|\[draw hook\][^\n]*|\[entity:[^\n]*|\[world\][^\n]*|\[render\][^\n]*)/g;
  while ((e2 = re2.exec(text))) ev.push({ ms: +e2[1], what: e2[2].trim() });
  const marks = ev.filter((x) => x.what.startsWith('MARK'));
  if (marks.length) {
    console.log(`flash marks (B pressed): ${marks.length}`);
    for (const mk of marks) {
      // since 3.15.57 the flight recorder writes its 10 s right after the mark (rec lines), and the event trail runs all along
      const near = ev.filter((x) => !x.what.startsWith('MARK') && !x.what.startsWith('rec ') && x.ms <= mk.ms && x.ms >= mk.ms - (ev.some((y) => y.what.startsWith('ev ')) ? 10000 : 3000));
      console.log(`  ${(mk.ms / 1000).toFixed(1)} s ${mk.what}: ${near.length ? near.map((x) => `${((x.ms - mk.ms) / 1000).toFixed(1)} s ${x.what.slice(0, 120)}`).join('; ') : 'nothing logged in the 3 s before'}`);
      const rec = ev.filter((x) => x.what.startsWith('rec ') && x.ms >= mk.ms && x.ms <= mk.ms + 1000);
      for (const x of rec) console.log(`    recorder: ${x.what.slice(0, 600)}`);
    }
  }
  // geometry first drawn inside a headset frame (3.15.57, F-B48: should be none)
  const geo = ev.filter((x) => /^frame \d+: \d+ geometry buffer/.test(x.what));
  if (geo.length) console.log(`geometry buffers made inside headset frames (a flash cause, F-B48): ${geo.length} frame(s); first ${(geo[0].ms / 1000).toFixed(1)} s: ${geo[0].what}`);
  // since 3.15.62 (D5): stalls between frames (with the JS heap: a drop is the garbage collector), frames that drew
  // almost nothing (a full-screen flash: the clear colour only), an invalid camera, the quality governor's changes
  const gaps = ev.filter((x) => x.what.startsWith('frame gap'));
  if (gaps.length) console.log(`frame gaps over 45 ms (frames the headset did not get): ${gaps.length}; longest ${Math.max(...gaps.map((x) => +/gap (\d+)/.exec(x.what)[1]))} ms; with the heap dropping (garbage collection): ${gaps.filter((x) => { const m = /heap ([\d.]+) > ([\d.]+)/.exec(x.what); return m && +m[2] < +m[1] - 1; }).length}`);
  const empty = ev.filter((x) => / drew \d+ calls|camera matrix/.test(x.what));
  if (empty.length) console.log(`frames that drew almost nothing or had no valid camera (a full-screen flash): ${empty.length}: ${empty.slice(0, 5).map((x) => (x.ms / 1000).toFixed(1) + ' s ' + x.what).join(' | ')}`);
  // the 3.15.62-63 safeties at work: a shader compiled between frames (S2), the head inside a character (S1), a
  // townsfolk making no progress towards its target (F-B55), and errors the frame survived (S1's draw hooks)
  for (const [re, label] of [[/^shader held/, 'shaders held for one frame and compiled between frames (S2; a warm-up gap: report it)'], [/^head inside/, 'frames with the head inside a character, hidden for the frame (S1)'], [/^no progress/, 'townsfolk stuck and moved on by the stuck detector (F-B55)'], [/^\[(draw hook|entity:|world|render)/, 'errors caught during frames (the frame went on; each is a bug to fix)']]) {
    const hit = ev.filter((x) => re.test(x.what)); if (hit.length) console.log(`${label}: ${hit.length}: ${hit.slice(0, 4).map((x) => (x.ms / 1000).toFixed(1) + ' s ' + x.what.slice(0, 90)).join(' | ')}`);
  }
  const gov = ev.filter((x) => x.what.startsWith('governor level'));
  if (gov.length) console.log(`quality governor changes: ${gov.length}: ${gov.slice(0, 8).map((x) => (x.ms / 1000).toFixed(0) + ' s ' + x.what.slice(15)).join(', ')}`);
  // the XR session's focus (the system menu, the headset taken off) as the game saw it, and in the runtime's lines
  const vis = ev.filter((x) => x.what.startsWith('xr visibility'));
  if (vis.length) console.log(`XR focus changes: ${vis.map((x) => `${(x.ms / 1000).toFixed(1)} s ${x.what.slice(14)}`).join(', ')}`);
  {
    // when the runtime's VrApi lines switch to another process (the system shell) while the game runs, the game is out of
    // the foreground (the system menu): list those stretches from the timestamps
    const vr = []; const rv = /^(\d\d-\d\d \d\d:\d\d:\d\d)\.\d+\s+(\d+)\s+\d+ I VrApi\s+: FPS=/gm; let v;
    while ((v = rv.exec(text))) vr.push({ t: v[1], pid: v[2] });
    if (vr.length) {
      const count = {}; for (const x of vr) count[x.pid] = (count[x.pid] || 0) + 1;
      const game = Object.keys(count).sort((a, b) => count[b] - count[a])[0], out = []; let run = null, seenGame = false;
      for (const x of vr) { if (x.pid === game) { seenGame = true; if (run) { out.push(run); run = null; } } else if (seenGame) { if (!run) run = { from: x.t, to: x.t }; else run.to = x.t; } }
      const away = out.filter((r) => r.from !== r.to);
      if (away.length) console.log(`the game out of the foreground (another process drew, e.g. the system menu): ${away.map((r) => r.from.slice(6) + '-' + r.to.slice(12)).join(', ')}`);
    }
  }
  const trail = ev.filter((x) => x.what.startsWith('ev '));
  if (trail.length) console.log(`event trail: ${trail.length} changes logged (pickups, Cave, vignettes, Event, screens, courier, Gem, snap turns); pass --trail to print them`);
  if (process.argv.includes('--trail')) for (const x of trail) console.log(`  ${(x.ms / 1000).toFixed(1)} s ${x.what.slice(3)}`);
  {
    const longs = ev.filter((x) => x.what.startsWith('long frame'));
  if (longs.length) console.log(`long frames (over 28 ms, at most two a second): ${longs.length}; longest ${Math.max(...longs.map((x) => +x.what.match(/\d+/)[0]))} ms`);
  }
}
if (!rows.length) {
  console.log('no perf lines found (needs a 3.15.27 or later build; the line reads "page: m=perf fps=...").');
  console.log('If the game ran, the log lost them: `adb logcat -d` dumps a ring buffer that a long session overruns. Capture live instead');
  console.log('(HEADSET_DIAG.md): adb logcat -c, then adb logcat -v threadtime -s GreeblisServer VrApi > run.txt while playing.');
  process.exit(1);
}
const stats = (list) => { const f = list.map((r) => r.fps).sort((a, b) => a - b); return { n: f.length, min: f[0], p10: f[Math.floor(f.length * 0.1)], median: f[Math.floor(f.length / 2)], max: f[f.length - 1] }; };
const town = rows.filter((r) => !r.event), ev = rows.filter((r) => r.event);
console.log(`${rows.length} readings (one every 10 s): ${town.length} in the town, ${ev.length} in the planting Event`);
const devs = [...new Set(rows.map((r) => r.dev))];
console.log(`  device: ${devs.join(', ')}${devs.length > 1 ? ' (several devices in one log: split the runs)' : ''}`);
const gpuLine = (text.match(/gpu: ([^\n]+)/) || [])[1]; if (gpuLine) console.log(`  gpu: ${gpuLine.trim()}`);
const mv = (text.match(/multiview (planned|not used)[^\n]*/) || [])[0]; const mvLive = /multiview live/.test(text), mvFall = /framebuffer incomplete/.test(text);
console.log(`  multiview: ${mv ? mv.split(' (')[0].replace('multiview ', '') : 'no line (pre-3.15.33 build?)'}${mvLive ? ', live' : ''}${mvFall ? ', FELL BACK to the classic path' : ''}`);
const hz = (text.match(/multiview: (texImage2D|texSubImage2D|generateMipmap|copyTex\w+|texImage3D|texSubImage3D) while a frame draws/g) || []).length;
if (hz) console.log(`  WARNING: ${hz} texture operations logged while a multiview frame drew (the flash hazard; see NOTES 67)`);
const comp = (text.match(/shader program\(s\) compiled during play/g) || []).length; if (comp) console.log(`  WARNING: ${comp} shader compiles during play logged (hitches)`);
if (town.length) console.log(`  town:  ${JSON.stringify(stats(town))}`);
if (ev.length) console.log(`  Event: ${JSON.stringify(stats(ev))}`);
const levels = {}; for (const r of rows) levels[r.level] = (levels[r.level] || 0) + 1;
console.log(`  governor levels (all native scale since 3.15.43; 3-4 foveated): ${JSON.stringify(levels)}`);
const low = rows.slice().sort((a, b) => a.fps - b.fps).slice(0, 5);
console.log('  lowest readings:');
for (const r of low) console.log(`    ${r.fps} fps at (${r.x}, ${r.z})${r.event ? ' during the Event' : ''}, level ${r.level}${r.scale ? ', scale ' + r.scale : ''}, ${r.calls} calls, ${r.tris} triangles`);
// which load the frame rate follows: Pearson correlation over the readings (needs a spread of readings)
const corr = (xs, ys) => { const n = xs.length; if (n < 4) return null; const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
const rCalls = corr(rows.map((r) => r.calls), rows.map((r) => r.fps)), rTris = corr(rows.map((r) => r.tris), rows.map((r) => r.fps));
const follows = rCalls !== null && rTris !== null ? (Math.abs(rCalls) >= Math.abs(rTris) ? 'draw calls' : 'triangles') : null;
if (rCalls !== null) console.log(`  the frame rate follows ${follows} (correlation with draw calls ${rCalls.toFixed(2)}, with triangles ${rTris.toFixed(2)}; -1 is a perfect match)`);
const cause = (r) => follows && (r.tris > 300000 || r.calls > 200) ? follows : r.tris > 300000 ? 'triangles' : r.calls > 200 ? 'draw calls' : r.level >= 4 ? 'GPU-bound (governor at its floor)' : 'CPU or GPU, governor not at its floor';
if (swaps.length) {
  console.log(`  render scale changes (projection layer swaps): ${swaps.map((w) => `${(w.ms / 1000).toFixed(0)} s -> ${w.scale}`).join(', ')}`);
  const byScale = {}; for (const r of rows) if (r.scale !== null && r.scale !== undefined) (byScale[r.scale] = byScale[r.scale] || []).push(r);
  for (const [sc, list] of Object.entries(byScale)) { const st = stats(list); console.log(`    at scale ${sc}: ${st.n} readings, ${st.min}-${st.max} fps (median ${st.median}), ${Math.round(list.reduce((a, r) => a + r.calls, 0) / list.length)} calls on average`); }
}
if (text.length && rows[0].ms !== null && rows[0].ms > 60000) console.log(`  NOTE: the first reading is ${(rows[0].ms / 1000).toFixed(0)} s into the session: the log lost the start (capture it live with adb logcat -s GreeblisServer > run.txt)`);
// The governor's average reads a frame or two under the refresh rate when it is met (71.x at 72 Hz).
const TARGET = 70.5, FLOOR = 60;
const under = (lim) => rows.filter((r) => r.fps < lim);
const floor = under(FLOOR), target = under(TARGET);
const pct = (n) => (100 * n / rows.length).toFixed(0) + '%';
console.log(`  target 72 fps: ${rows.length - target.length} of ${rows.length} readings meet it (${pct(rows.length - target.length)})` + (target.length ? `; short of it: ${[...new Set(target.map(cause))].join('; ')}` : ''));
console.log(`  floor 60 fps (VRC.Quest.Performance.1): ${floor.length ? floor.length + ' readings under it: ' + [...new Set(floor.map(cause))].join('; ') : 'never under it'}`);
const by = (list) => { const m = {}; for (const r of list) { const k = r.event ? 'the Event' : 'town'; m[k] = (m[k] || 0) + 1; } return JSON.stringify(m); };
if (target.length) console.log(`  under the target by scene: ${by(target)}`);
if (devs.length > 1) for (const d of devs) { const rs = rows.filter((r) => r.dev === d); const f = rs.filter((r) => r.fps < FLOOR).length, tg = rs.filter((r) => r.fps < TARGET).length; console.log(`  ${d}: ${rs.length} readings, ${rs.length - tg} at the 72 target, ${f} under the 60 floor`); }
console.log(floor.length ? '  VERDICT: FAILS the 60 fps floor' : target.length ? '  VERDICT: passes the floor, misses the 72 fps target' : '  VERDICT: meets the 72 fps target throughout');
process.exit(floor.length ? 1 : target.length ? 3 : 0);
