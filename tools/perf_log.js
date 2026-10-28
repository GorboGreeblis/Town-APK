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
  const rv = /^\d+-\d+ (\d+):(\d+):(\d+)\.\d+\s+(\d+)\s+\d+ \w VrApi\s*: FPS=(\d+)\/(\d+),.*?Stale=(\d+)/gm;
  while ((v = rv.exec(text))) (vr[v[4]] = vr[v[4]] || []).push({ t: v[1] + ':' + v[2] + ':' + v[3], fps: +v[5], hz: +v[6], stale: +v[7] });
  const rc = /^\d+-\d+ [\d:.]+\s+(\d+)\s+\d+ \w (?:chromium|cr_\w+)/gm; while ((v = rc.exec(text))) chrome.add(v[1]);
  for (const [pid, list] of Object.entries(vr)) {
    const f = list.map((x) => x.fps).sort((a, b) => a - b), st = list.reduce((a, x) => a + x.stale, 0);
    const u60 = list.filter((x) => x.fps < 60), uhz = list.filter((x) => x.fps < x.hz - 1);
    console.log(`headset runtime (VrApi), process ${pid}${chrome.has(pid) ? ' (the browser: the game)' : ''}: ${list.length} s from ${list[0].t} to ${list[list.length - 1].t}; ` +
      `${f[0]}-${f[f.length - 1]} fps (median ${f[Math.floor(f.length / 2)]}), refresh ${[...new Set(list.map((x) => x.hz))].join('/')} Hz; ` +
      `${uhz.length} s under the refresh rate, ${u60.length} s under 60${u60.length ? ' (' + u60.map((x) => x.t + ' ' + x.fps).slice(0, 8).join(', ') + ')' : ''}; ${st} stale frames`);
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
