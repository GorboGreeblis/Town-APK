// Handover profile (analysis only): what the main thread does from the moment
// the game takes the VR session until a few seconds into presenting. Lists the
// long frames (with the time since the handover) and the functions that used the
// CPU in that window. SwiftShader GL, so absolute times are not Quest times; the
// shape (which frames are long, which functions dominate) is what matters.
//
//   node tools/entry_profile.js [file] [seconds=5]
const path = require('path');
const { boot } = require('./lib/harness');

const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const seconds = +(process.argv[3] || 5);

(async () => {
  let cdp = null;
  const g = await boot({ file, vr: true, fastSim: false, onBeforeGrant: async (page, ctx) => {
    await page.evaluate(() => {
      // Frame timer around the renderer: long gaps between renders are the stalls a headset would re-project.
      const O = window.__dbg.O; const t0 = performance.now(); const log = (window.__entryFrames = { t0, long: [], n: 0, firstAt: null });
      let last = null; const real = O.render.bind(O);
      O.render = function (s, c) { const now = performance.now(); if (log.firstAt === null) log.firstAt = now - t0; if (last !== null && now - last > 30) log.long.push({ atS: +((now - t0) / 1000).toFixed(2), gapMs: Math.round(now - last) }); last = now; log.n++; return real(s, c); };
    });
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Profiler.start');
  } });
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const { profile } = await cdp.send('Profiler.stop');
  const frames = await g.page.evaluate(() => window.__entryFrames);
  const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map(); let total = 0;
  for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const d = profile.timeDeltas[i] || 0; total += d; const f = n.callFrame; const k = (f.functionName || '(anonymous)') + ' @' + f.lineNumber + ':' + f.columnNumber; self.set(k, (self.get(k) || 0) + d); }
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = (name) => { let s = 0; for (let i = 0; i < profile.samples.length; i++) { let id = profile.samples[i]; while (id) { const n = byId.get(id); if (n.callFrame.functionName === name) { s += profile.timeDeltas[i] || 0; break; } id = parent.get(id); } } return Math.round(s / 1000); };
  console.log(`handover window ${seconds}s: first render ${Math.round(frames.firstAt)} ms after the grant, ${frames.n} renders, long gaps (>30 ms): ${JSON.stringify(frames.long.slice(0, 20))}`);
  console.log(`CPU busy ${Math.round(total / 1000)} ms of ${seconds * 1000}; inclusive: je=${incl('je')} buildUI=${incl('buildUI')} Ho.capture(i)=${incl('i')} warm=${incl('warm')} compile=${incl('compile')} setSession=${incl('setSession')}`);
  // Self time restricted to the first 600 ms after the grant (the first frames).
  const early = new Map(); let cum = 0;
  for (let i = 0; i < profile.samples.length; i++) { cum += profile.timeDeltas[i] || 0; if (cum > 600000) break; const f = byId.get(profile.samples[i]).callFrame; const k = (f.functionName || '(anonymous)') + ' @' + f.lineNumber + ':' + f.columnNumber; early.set(k, (early.get(k) || 0) + (profile.timeDeltas[i] || 0)); }
  console.log('first 600 ms after the grant, top self time:');
  [...early.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(`  ${String(Math.round(v / 1000)).padStart(6)} ms  ${k}`));
  console.log('top self time:');
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log(`  ${String(Math.round(v / 1000)).padStart(6)} ms  ${k}`));
  await g.close();
})().catch((e) => { console.error(e); process.exit(1); });
