// Headset frame-rate log reader: turns the `perf` lines the game posts to logcat every ten seconds
// (3.15.27, HEADSET_DIAG.md) into the same picture the performance report gives headless: frame rate
// by scene (town, the planting Event), the lowest readings and where the player stood, the governor
// levels, and a verdict against the Store's 60 fps line.
//
//   adb logcat -d -s GreeblisServer > run.txt      (on the computer the headset is plugged into)
//   node tools/perf_log.js run.txt
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node tools/perf_log.js <logcat.txt>'); process.exit(2); }
const text = fs.readFileSync(file, 'utf8');
const re = /perf fps=([\d.]+) level=(\d+) calls=(\d+) tris=(\d+)( event)? at=(-?\d+),(-?\d+)/g;
const rows = []; let m;
while ((m = re.exec(text))) rows.push({ fps: +m[1], level: +m[2], calls: +m[3], tris: +m[4], event: !!m[5], x: +m[6], z: +m[7] });
if (!rows.length) { console.log('no perf lines found (needs a 3.15.27 or later build; the line reads "page: m=perf fps=...")'); process.exit(1); }
const stats = (list) => { const f = list.map((r) => r.fps).sort((a, b) => a - b); return { n: f.length, min: f[0], p10: f[Math.floor(f.length * 0.1)], median: f[Math.floor(f.length / 2)], max: f[f.length - 1] }; };
const town = rows.filter((r) => !r.event), ev = rows.filter((r) => r.event);
console.log(`${rows.length} readings (one every 10 s): ${town.length} in the town, ${ev.length} in the planting Event`);
if (town.length) console.log(`  town:  ${JSON.stringify(stats(town))}`);
if (ev.length) console.log(`  Event: ${JSON.stringify(stats(ev))}`);
const levels = {}; for (const r of rows) levels[r.level] = (levels[r.level] || 0) + 1;
console.log(`  governor levels (0-1 supersampled, 2 native, 3-4 foveated): ${JSON.stringify(levels)}`);
const low = rows.slice().sort((a, b) => a.fps - b.fps).slice(0, 5);
console.log('  lowest readings:');
for (const r of low) console.log(`    ${r.fps} fps at (${r.x}, ${r.z})${r.event ? ' during the Event' : ''}, level ${r.level}, ${r.calls} calls, ${r.tris} triangles`);
const below = rows.filter((r) => r.fps < 60);
const cause = (r) => r.tris > 300000 ? 'triangles' : r.calls > 200 ? 'draw calls' : r.level >= 4 ? 'GPU-bound (governor at its floor)' : 'CPU or GPU, governor not at its floor';
if (below.length) { console.log(`  VERDICT: ${below.length} of ${rows.length} readings under 60 fps (VRC.Quest.Performance.1): ` + [...new Set(below.map(cause))].join('; ')); process.exit(1); }
console.log('  VERDICT: every reading at or above 60 fps'); process.exit(0);
