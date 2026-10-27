// Headset frame-rate log reader: turns the `perf` lines the game posts to logcat every ten seconds
// (3.15.27, HEADSET_DIAG.md) into the same picture the performance report gives headless: frame rate
// by scene (town, the planting Event), the lowest readings and where the player stood, the governor
// levels, and verdicts against the target (72 fps, the headset's refresh rate: the author's aim) and the
// Store's floor (60 fps, VRC.Quest.Performance.1).
//
//   adb logcat -d -s GreeblisServer > run.txt      (on the computer the headset is plugged into)
//   node tools/perf_log.js run.txt
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node tools/perf_log.js <logcat.txt>'); process.exit(2); }
const text = fs.readFileSync(file, 'utf8');
const re = /perf fps=([\d.]+) level=(\d+) calls=(\d+) tris=(\d+)( event)? at=(-?\d+),(-?\d+)(?: dev=(\S+))?/g;
const rows = []; let m;
while ((m = re.exec(text))) rows.push({ fps: +m[1], level: +m[2], calls: +m[3], tris: +m[4], event: !!m[5], x: +m[6], z: +m[7], dev: m[8] || 'unknown' });
if (!rows.length) { console.log('no perf lines found (needs a 3.15.27 or later build; the line reads "page: m=perf fps=...")'); process.exit(1); }
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
console.log(`  governor levels (0-1 supersampled, 2 native, 3-4 foveated): ${JSON.stringify(levels)}`);
const low = rows.slice().sort((a, b) => a.fps - b.fps).slice(0, 5);
console.log('  lowest readings:');
for (const r of low) console.log(`    ${r.fps} fps at (${r.x}, ${r.z})${r.event ? ' during the Event' : ''}, level ${r.level}, ${r.calls} calls, ${r.tris} triangles`);
const cause = (r) => r.tris > 300000 ? 'triangles' : r.calls > 200 ? 'draw calls' : r.level >= 4 ? 'GPU-bound (governor at its floor)' : 'CPU or GPU, governor not at its floor';
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
