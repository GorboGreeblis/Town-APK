// Event CPU profile (report; T16, the author: "We need to keep the game at a 60 fps minimum"): where the main thread's
// time goes in a headset frame while the planting Event plays, seen from a chosen spot. The Event is limited by the CPU
// on the headset (NOTES 91; the author's 3.15.58 run: CPU 12-14 ms of a 13.9 ms frame at (-33, -7)), so this is the
// map for CPU savings. Starts the Event as a player does, waits for the mist to be full and the dancing to start,
// stands the player at --at facing --yaw (degrees; 0 looks north, -z), then records a sampling CPU profile and prints:
//   - the share of sampled time in the game's update, three.js's render (and inside it: the matrix walk, culling and
//     sorting, the batcher's pass, draw submission), the head script, and the collector;
//   - the game's and three.js's functions with the most inclusive time (with all they call), and the functions with
//     the most self time, each with the start of its code (the game file is minified).
// Headless frame times are not the headset's (software GL, no thermal limits); compare shares and before/after runs
// on the same machine. Run it on a quiet machine: other browser tests skew the absolute numbers.
//
//   GT_HEADSET_FOV=1 node tools/event_cpu.js [file] [--at "-33,-7"] [--yaw 80] [--secs 12] [--top 30]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib/harness');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const [AX, AZ] = arg('--at', '-33,-7').split(',').map(Number);
const YAW = +arg('--yaw', '80') * Math.PI / 180, SECS = +arg('--secs', '12'), TOP = +arg('--top', '30');

(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  const src = fs.readFileSync(file || path.join(__dirname, 'android/app/src/main/assets/index.html'), 'utf8').split('\n');
  const ready = await page.evaluate(async ({ AX, AZ, YAW }) => {
    const D = window.__dbg, J = D.JGP, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50);
    while (J.mist.p() < 1 && performance.now() - t0 < 120000) await wait(200);
    D.At.position.set(AX, D.At.position.y, AZ); window.__fakeXR.pose.yaw = YAW;
    await wait(4000);
    // frame timing over the profile: the whole XR frame callback and three.js's render inside it
    const X = window.__gtXR, O = D.O, R = O.render, st = window.__evCpu = { frames: 0, render: 0, renders: [] };
    O.render = function () { const a = performance.now(); try { return R.apply(this, arguments); } finally { const d = performance.now() - a; st.render += d; st.renders.push(d); st.frames++; } };
    return { active: !!D.me.active, mist: J.mist.p(), draws: O.info.render.calls };
  }, { AX, AZ, YAW });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  const f0 = await page.evaluate(() => window.__fakeXR.frames), w0 = Date.now();
  await cdp.send('Profiler.start');
  await page.waitForTimeout(SECS * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const frames = (await page.evaluate(() => window.__fakeXR.frames)) - f0, wall = (Date.now() - w0) / 1000;
  const ft = await page.evaluate(() => { const s = window.__evCpu, r = s.renders.slice().sort((a, b) => a - b); return { frames: s.frames, renderMs: s.render / Math.max(1, s.frames), p90: r[Math.floor(r.length * 0.9)] || 0, draws: window.__dbg.O.info.render.calls, tris: window.__dbg.O.info.render.triangles }; });
  await g.close();

  // self and inclusive time per node, from the samples
  const byId = new Map(profile.nodes.map((n) => [n.id, n])), parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const self = new Map(); let total = 0;
  profile.samples.forEach((id, i) => { const dt = profile.timeDeltas[i] || 0; total += dt; self.set(id, (self.get(id) || 0) + dt); });
  const where = (cf) => `${cf.functionName || '(anonymous)'} @${cf.lineNumber + 1}:${cf.columnNumber}`;
  const snippet = (cf) => { const l = src[cf.lineNumber] || ''; return l.slice(cf.columnNumber, cf.columnNumber + 90).replace(/\s+/g, ' '); };
  // categories by stack: the first matching frame from the leaf up decides (most specific first)
  const SCRIPT = (cf) => (cf.lineNumber === 0 ? 'head' : cf.lineNumber === 2 ? 'three' : cf.lineNumber >= 5 ? 'game' : 'other');
  const cats = {}, fnSelf = new Map();
  for (const [id, t] of self) {
    const n = byId.get(id), cf = n.callFrame; const k = where(cf);
    const e = fnSelf.get(k) || { t: 0, cf }; e.t += t; fnSelf.set(k, e);
    let cat = null, p = id, inRender = false;
    while (p !== undefined) { const c = byId.get(p).callFrame; if (/^(render)$/.test(c.functionName) && SCRIPT(c) === 'three') inRender = true; p = parent.get(p); }
    if (/garbage|GC/i.test(cf.functionName)) cat = 'garbage collector';
    else if (cf.functionName === '(idle)' || cf.functionName === '(program)') cat = cf.functionName;
    else if (inRender) cat = 'render: ' + (SCRIPT(cf) === 'three' ? 'three.js' : SCRIPT(cf) === 'game' ? 'game hooks (batcher, holds)' : SCRIPT(cf) === 'head' ? 'head script (multiview)' : 'native (GL calls)');
    else cat = SCRIPT(cf) === 'game' ? 'game update' : SCRIPT(cf) === 'three' ? 'three.js outside render (matrices, raycasts)' : SCRIPT(cf) === 'head' ? 'head script' : 'native / other';
    cats[cat] = (cats[cat] || 0) + t;
  }
  const busy = total - (cats['(idle)'] || 0);
  // inclusive time: each function counted once per sample it is on the stack of
  const incl = new Map();
  for (const [id, t] of self) {
    const seen = new Set(); let p = id;
    while (p !== undefined) { const cf = byId.get(p).callFrame, k = where(cf); if (!seen.has(k)) { seen.add(k); const e = incl.get(k) || { t: 0, cf }; e.t += t; incl.set(k, e); } p = parent.get(p); }
  }
  console.log(`Event at (${AX}, ${AZ}) yaw ${Math.round(YAW * 180 / Math.PI)}: active ${ready.active}, mist ${ready.mist.toFixed(2)}; ${frames} XR frames in ${wall.toFixed(1)} s (${(frames / wall).toFixed(1)} fps headless); render ${ft.renderMs.toFixed(2)} ms a frame (p90 ${ft.p90.toFixed(2)}), ${ft.draws} draws, ${ft.tris} triangles`);
  console.log(`main thread busy ${(100 * busy / total).toFixed(0)}% of ${(total / 1e6).toFixed(1)} s; ${(busy / 1000 / Math.max(1, frames)).toFixed(2)} ms busy a frame`);
  for (const [k, t] of Object.entries(cats).sort((a, b) => b[1] - a[1])) if (k !== '(idle)') console.log(`  ${(100 * t / busy).toFixed(1).padStart(5)}%  ${(t / 1000 / Math.max(1, frames)).toFixed(2)} ms/frame  ${k}`);
  console.log(`top ${TOP} game and three.js functions by inclusive time (with what they call):`);
  for (const [k, e] of [...incl].filter(([, e]) => /^(game|three)$/.test(SCRIPT(e.cf)) && e.cf.functionName !== '').sort((a, b) => b[1].t - a[1].t).slice(0, TOP)) console.log(`  ${(100 * e.t / busy).toFixed(1).padStart(5)}%  ${(e.t / 1000 / Math.max(1, frames)).toFixed(3)} ms  ${SCRIPT(e.cf).padEnd(5)} ${k}  | ${snippet(e.cf)}`);
  console.log(`top ${TOP} functions by self time (share of busy time; code start):`);
  for (const [k, e] of [...fnSelf].sort((a, b) => b[1].t - a[1].t).filter(([k2]) => !/^\((idle|program)\)/.test(k2)).slice(0, TOP)) console.log(`  ${(100 * e.t / busy).toFixed(1).padStart(5)}%  ${(e.t / 1000 / Math.max(1, frames)).toFixed(3)} ms  ${SCRIPT(e.cf).padEnd(5)} ${k}  | ${snippet(e.cf)}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
