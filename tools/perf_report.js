// Performance report (graphical and performance pass, T12): the game's situations in sequence, each
// measured the same way, with the cause named when something crosses a line.
//
// Situations: the town standing still, walking, a dialogue, the shop panel, a battle panel, the Speech
// (Sparkakus's library finale) and the planting Event in three 30-second phases. For each one:
//   - frame time on the XR frame loop, split into script time (game logic, three.js scene and matrix
//     work, batching, uniform and texture uploads) and time inside WebGL calls. The GL here is software
//     (SwiftShader), which compiles its own pipelines on first use and can block a GL call for seconds;
//     that is this machine, not the game. So by default the draw calls themselves are stubbed (every
//     other GL call runs, the renderer's counters are kept, nothing is rasterised): the script numbers
//     then carry to a headset (roughly three times slower there), and GL time is the upload cost.
//     --draw rasterises for real; the GL column is then software-GL noise and the frame counts drop;
//   - the main thread's top functions by self time (CDP profiler), with a source excerpt, so a spike has a
//     name;
//   - what the renderer created on the spot: new shader programs (a compile is a hitch of 50-1,000 ms on a
//     headset), textures, geometries, scene objects;
//   - the renderer's last frame: draw calls, triangles, visible transparent objects, lights;
//   - the heap, and the governor's level.
// Lines (headless): a new shader program during play fails; script p99 over 8 ms (12 in the Event) or a
// script frame over 120 ms fails with the top script functions as the cause; triangles over 320k,
// transparent objects over 120 or draw calls over 200 are reported as GPU risks; textures or geometries
// created during play are noted (an upload is a small hitch). A baseline (tools/perf_baseline.json, written
// with --update-baseline) turns a 40% rise in p50 or p99, or 15% in triangles, into a failure too. Script times
// depend on the machine, so the baseline keeps the time of a fixed in-page workload (matrix maths and small
// objects, like the game's own script) measured on the machine that wrote it; each run measures it again (before
// and after the situations) and scales the baseline's times, and the absolute frame-time limits on a slower machine,
// by the ratio (clamped to 0.5-4), so a busy or slower machine does not fail a good build. The absolute limits
// scale against the machine they were set on (ABS_CALIB), never below their own values.
//
//   node tools/perf_report.js [file] [--update-baseline] [--json out.json] [--only <regex>] [--no-profile] [--draw]
// --only runs the situations whose names match; --no-profile skips the CDP profiler (pure timing run).
const path = require('path');
const fs = require('fs');
const { boot, reporter, root } = require('./lib/harness');

const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
const updateBaseline = process.argv.includes('--update-baseline');
const jsonOut = process.argv.find((a, i) => process.argv[i - 1] === '--json') || path.join(root, 'tools/.runs/perf_report.json');
const baselinePath = path.join(root, 'tools/perf_baseline.json');
const only = process.argv.find((a, i) => process.argv[i - 1] === '--only'); const onlyRe = only ? new RegExp(only, 'i') : null;
const noProfile = process.argv.includes('--no-profile');
const realDraw = process.argv.includes('--draw');
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
const assetLines = fs.readFileSync(file, 'utf8').split('\n');
const excerpt = (line, col) => { const l = assetLines[line]; if (!l) return ''; return l.slice(Math.max(0, col - 30), col + 50).replace(/\s+/g, ' '); };

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.evaluate(() => { window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });
  // Frame timing on the real session's frame loop, and a renderer snapshot helper.
  await page.evaluate((realDraw) => {
    const D = window.__dbg, O = D.O; const sess = O.xr.getSession(); const real = sess.__real || sess;
    if (!realDraw) O.renderBufferDirect = (cam, sc, geo, mat, obj, grp) => { const idx = geo.index, pos = geo.attributes.position; let n = idx ? idx.count : pos ? pos.count : 0; if (grp && grp.count !== Infinity) n = grp.count; O.info.update(n, 4, 1); };
    window.__pf = { samples: [], gl: [], real, glMs: 0 };
    // Every WebGL call is timed so a frame splits into script time and GL time.
    const gl = O.getContext(); const proto = Object.getPrototypeOf(gl);
    for (const k of Object.getOwnPropertyNames(proto)) { let d; try { d = Object.getOwnPropertyDescriptor(proto, k); } catch (e) { continue; } if (!d || typeof d.value !== 'function' || k === 'constructor') continue; const f = d.value; gl[k] = ({ __glTimed: function () { const a = performance.now(); const r = f.apply(this, arguments); window.__pf.glMs += performance.now() - a; return r; } }).__glTimed; }
    const orig = real.requestAnimationFrame.bind(real);
    real.requestAnimationFrame = (cb) => orig((t, f) => { const a = performance.now(); window.__pf.glMs = 0; cb(t, f); const total = performance.now() - a; window.__pf.samples.push(total - window.__pf.glMs); window.__pf.gl.push(window.__pf.glMs); });
    window.__pfSnap = () => {
      const C = D.C, T = window.THREE; let transparent = 0, lights = 0, meshes = 0, pts = 0;
      C.traverse((o) => { if (!o.visible) return; let p = o.parent; while (p) { if (!p.visible) return; p = p.parent; } if (o.isLight) lights++; if (o.isPoints) pts++; if (!o.isMesh) return; meshes++; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.transparent && m.visible !== false) transparent++; });
      return { programs: O.info.programs.length, progNames: O.info.programs.map((p) => p.name), textures: O.info.memory.textures, geometries: O.info.memory.geometries, calls: O.info.render.calls, tris: O.info.render.triangles, points: O.info.render.points, transparent, lights, meshes, pts, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, level: D.Ge && D.Ge.level != null ? D.Ge.level : 'n/a', creaturesNear: (() => { try { const p = D.At.position; return D.It.all.filter((e) => e.group && e.group.visible !== false && Math.hypot(e.group.position.x - p.x, e.group.position.z - p.z) < 25).length; } catch (e) { return -1; } })(), objects: (() => { let n = 0; C.traverse(() => n++); return n; })() };
    };
  }, realDraw);
  const cdp = await page.context().newCDPSession(page);
  if (!noProfile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); }
  const logCount = () => (global.__pageLog || []).length;
  const lastPerfLine = (from) => { const l = (global.__pageLog || []).slice(from).filter((m) => /^perf fps=/.test(m)); return l.length ? l[l.length - 1] : null; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const results = [];
  const scenario = async (name, setup, ms, opts = {}) => {
    if (onlyRe && !onlyRe.test(name)) return null;
    const before = await page.evaluate(() => window.__pfSnap()); const log0 = logCount();
    let setupError = null;
    try { await setup(); } catch (e) { setupError = String(e && e.message || e); }
    await page.evaluate(() => { window.__pf.samples = []; window.__pf.gl = []; });
    if (!noProfile) await cdp.send('Profiler.start');
    await wait(ms);
    const profile = noProfile ? { nodes: [], samples: [], timeDeltas: [] } : (await cdp.send('Profiler.stop')).profile;
    const { frames, glFrames } = await page.evaluate(() => ({ frames: window.__pf.samples.slice(), glFrames: window.__pf.gl.slice() }));
    const after = await page.evaluate(() => window.__pfSnap());
    if (opts.teardown) { try { await opts.teardown(); } catch (e) {} }
    const w = frames.slice().sort((a, b) => a - b); const q = (p) => +(w[Math.min(w.length - 1, Math.floor(w.length * p))] || 0).toFixed(1);
    const wg = glFrames.slice().sort((a, b) => a - b); const qg = (p) => +(wg[Math.min(wg.length - 1, Math.floor(wg.length * p))] || 0).toFixed(1);
    const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map(); let busy = 0;
    for (let i = 0; i < profile.samples.length; i++) { const d = (profile.timeDeltas[i] || 0) / 1000; const f = byId.get(profile.samples[i]).callFrame; if (f.functionName === '(idle)') continue; busy += d; const k = (f.functionName || '(anonymous)') + ' @' + f.lineNumber + ':' + f.columnNumber; self.set(k, (self.get(k) || 0) + d); }
    const all = [...self.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => { const m = /@(-?\d+):(-?\d+)$/.exec(k); const native = !m || +m[1] < 0; return { fn: native ? k.replace(/ @.*$/, '') + ' (native)' : k, native, ms: Math.round(v), pct: +(100 * v / Math.max(1, busy)).toFixed(1), src: !native ? excerpt(+m[1], +m[2]) : '' }; });
    const script = all.filter((t) => !t.native && !/^__glTimed/.test(t.fn));
    const top = script.slice(0, 6), glTop = all.filter((t) => t.native).slice(0, 3);
    const scriptBusy = script.reduce((a, t) => a + t.ms, 0);
    const perfLine = lastPerfLine(log0); const lm = perfLine && /level=(\d+)/.exec(perfLine);
    const r = { name, setupError, frames: frames.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: +(w[w.length - 1] || 0).toFixed(1), glP50: qg(0.5), glP99: qg(0.99), glMax: +(wg[wg.length - 1] || 0).toFixed(1), scriptMsPerFrame: +(scriptBusy / Math.max(1, frames.length)).toFixed(2), glTop,
      newPrograms: after.programs - before.programs, newProgramNames: after.progNames.filter((n) => !before.progNames.includes(n)), newTextures: after.textures - before.textures, newGeometries: after.geometries - before.geometries, newObjects: after.objects - before.objects,
      calls: after.calls, tris: Math.round(after.tris), points: after.points, transparent: after.transparent, lights: after.lights, meshes: after.meshes, heapMB: after.heap, heapDeltaMB: after.heap - before.heap, level: lm ? +lm[1] : after.level, perfLine, creaturesNear: after.creaturesNear, top };
    results.push(r); return r;
  };

  // --- machine speed: a fixed workload, the median of nine runs
  const calibrate = () => page.evaluate(() => {
    const T = window.THREE, times = [];
    for (let r = 0; r < 9; r++) {
      const t0 = performance.now(); let acc = 0;
      if (T) { const m = new T.Matrix4(), n = new T.Matrix4().makeRotationY(0.3), v = new T.Vector3(); for (let i = 0; i < 60000; i++) { m.multiplyMatrices(n, m.copy(n)); v.set(i, 1, 2).applyMatrix4(m); const o = { a: i, b: [v.x, acc] }; acc += o.b.length + v.x * 1e-9; } }
      else { const a = new Float64Array(16); for (let i = 0; i < 60000 * 40; i++) { a[i & 15] = a[(i + 5) & 15] * 1.0000001 + i; acc += a[i & 15] * 1e-12; } }
      times.push(performance.now() - t0 + acc * 0);
    }
    times.sort((a, b) => a - b); return +times[4].toFixed(2);
  });
  await wait(2000);
  const calib0 = await calibrate();

  // --- the situations
  await scenario('town, standing', async () => {}, 6000);
  await scenario('town, walking', async () => { await page.evaluate(() => window.__fakeXR.setInputs([{ handedness: 'left', axes: [0, 0, 0, -1], buttons: [{}, {}, {}, {}, {}, {}, {}] }, { handedness: 'right', axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] }])); }, 6000,
    { teardown: () => page.evaluate(() => window.__fakeXR.setInputs([])) });
  await scenario('town, among creatures', async () => { await page.evaluate(() => { const D = window.__dbg; const es = D.It.all.filter((e) => e.group && e.group.visible !== false); if (!es.length) throw new Error('no creatures'); const c = es.reduce((a, e) => [a[0] + e.group.position.x, a[1] + e.group.position.z], [0, 0]).map((v) => v / es.length); D.At.position.x = c[0]; D.At.position.z = c[1] + 1; D.At.updateMatrixWorld(true); }); }, 6000);
  await scenario('dialogue open', async () => { await page.evaluate(() => window.__dbg.qt.open('TEST', '#ffffff', 'Hello there.|Second line.|Third line.')); }, 4000);
  await scenario('shop panel', async () => { await page.evaluate(() => { const D = window.__dbg; if (D.ne && D.ne.open) D.ne.open(); else throw new Error('no shop module'); }); }, 4000,
    { teardown: () => page.evaluate(() => { try { window.__dbg._t.close(); } catch (e) {} }) });
  await scenario('battle panel', async () => { await page.evaluate(() => { const D = window.__dbg; const m = D.It.all.find((h) => h.def && h.def.name === 'MONTGUMMERY'); if (!m) throw new Error('no Montgummery'); D.Dbt.start(m); }); }, 4000,
    { teardown: () => page.evaluate(() => { try { window.__dbg._t.close(); } catch (e) {} }) });
  await scenario('the Speech (library finale)', async () => { await page.evaluate(() => { const D = window.__dbg; D.Kt.artifacts = 3; D.LIB.talk(); }); }, 20000);
  await scenario('the Event, start (0-30 s)', async () => {
    const started = await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); return D.me.active; });
    if (!started) throw new Error('the Event did not start');
  }, 30000);
  await scenario('the Event, middle (30-60 s)', async () => {}, 30000);
  await scenario('the Event, late (60-90 s)', async () => {}, 30000);

  // --- verdicts
  const calib1 = await calibrate(), calib = +((calib0 + calib1) / 2).toFixed(2);
  // the absolute limits (p99 12 / 16 ms, max 120 ms) were set on a machine that ran the workload in about 2.0 ms
  // (estimated: the 3.15.27 baseline's situations ran 2.6 times faster there than 3.15.41's on a 5.35 ms machine)
  const ABS_CALIB = 2.0;
  const k = baseline && baseline.calib ? Math.min(4, Math.max(0.5, calib / baseline.calib)) : 1, kAbs = Math.min(4, Math.max(1, calib / ABS_CALIB));
  console.log(`  machine speed: workload ${calib0} / ${calib1} ms` + (baseline && baseline.calib ? ` (baseline machine ${baseline.calib} ms: baseline times scaled by ${k.toFixed(2)})` : ' (the baseline has no calibration: its times compared as they are)') + `; absolute limits scaled by ${kAbs.toFixed(2)}`);
  const lines = [];
  console.log(realDraw ? '  draws rasterised (software GL: GL stalls are this machine)' : '  draw calls stubbed (script and upload costs only; renderer counters kept)');
  const fmt = (r) => `${r.name.padEnd(28)} frames ${String(r.frames).padStart(4)}  script p50 ${String(r.p50).padStart(5)} p99 ${String(r.p99).padStart(5)} max ${String(r.max).padStart(6)} ms  GL p50 ${String(r.glP50).padStart(5)} p99 ${String(r.glP99).padStart(7)} ms  calls ${String(r.calls).padStart(3)}  tris ${String(r.tris).padStart(6)}  transp ${String(r.transparent).padStart(3)}  lights ${r.lights}  creatures<25m ${r.creaturesNear}  +prog ${r.newPrograms} +tex ${r.newTextures} +geo ${r.newGeometries}  heap ${r.heapMB} MB${r.level !== 'n/a' ? '  level ' + r.level : ''}`;
  for (const r of results) {
    console.log('  ' + fmt(r));
    if (r.setupError) console.log(`        setup error: ${r.setupError}`);
    for (const t of r.top.slice(0, 4)) console.log(`        script ${String(t.ms).padStart(5)} ms ${String(t.pct).padStart(5)}%  ${t.fn}${t.src ? '   ' + t.src : ''}`);
    if (r.glTop.length) console.log(`        native ${r.glTop.map((t) => t.fn.replace(' (native)', '') + ' ' + t.ms + ' ms').join(', ')}`);
    if (r.perfLine) console.log(`        game's own perf line: ${r.perfLine}`);
  }
  const base = baseline && baseline.scenarios;
  for (const r of results) {
    const isEvent = /Event/.test(r.name);
    const cause = r.top.slice(0, 3).map((t) => t.fn.replace(/ @.*$/, '') + ' ' + t.pct + '%').join(', ') || 'no script samples';
    expect(`${r.name}: no setup error`, !r.setupError, r.setupError || '');
    expect(`${r.name}: no shader program compiled during play`, r.newPrograms === 0, `${r.newPrograms} new: ${r.newProgramNames.join(', ')}`);
    if (r.frames < 60) note(`${r.name}: only ${r.frames} frames measured (GL stalls on this machine), frame-time verdicts skipped`);
    else {
      expect(`${r.name}: script p99 under ${+((isEvent ? 16 : 12) * kAbs).toFixed(1)} ms headless (cause: ${cause})`, r.p99 < (isEvent ? 16 : 12) * kAbs, `p99 ${r.p99} ms`);
      expect(`${r.name}: no script frame over ${Math.round(120 * kAbs)} ms (cause: ${cause})`, r.max < 120 * kAbs, `max ${r.max} ms`);
    }
    if (r.newTextures > 0 || r.newGeometries > 0) note(`${r.name}: ${r.newTextures} textures and ${r.newGeometries} geometries created during play (each upload is a small hitch on a headset)`);
    if (r.glP99 > 100) note(`${r.name}: GL calls blocked up to ${r.glMax} ms (software GL draining; on a headset this is where GPU-bound time would show)`);
    if (r.tris > 320000) note(`${r.name}: GPU risk, ${r.tris} triangles in the last frame (both eyes)`);
    if (r.transparent > 120) note(`${r.name}: GPU risk, ${r.transparent} visible transparent objects (fill rate)`);
    if (r.calls > 200) note(`${r.name}: CPU risk, ${r.calls} draw calls`);
    const b = base && base[r.name];
    if (b && r.frames >= 60) {
      expect(`${r.name}: script p50 and p99 within 40% of the baseline (${+(b.p50 * k).toFixed(1)} / ${+(b.p99 * k).toFixed(1)} ms on this machine)`, r.p50 <= b.p50 * k * 1.4 + 1 && r.p99 <= b.p99 * k * 1.4 + 1.5, `now ${r.p50} / ${r.p99} ms`);
      expect(`${r.name}: triangles within 15% of the baseline (${b.tris})`, r.tris <= b.tris * 1.15 + 1000, `now ${r.tris}`);
    }
  }
  if (!base) note('no baseline yet (tools/perf_baseline.json): run with --update-baseline on a known-good build');
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify({ file: path.relative(root, file), date: new Date().toISOString(), scenarios: Object.fromEntries(results.map((r) => [r.name, r])) }, null, 1));
  if (updateBaseline) { fs.writeFileSync(baselinePath, JSON.stringify({ date: new Date().toISOString(), file: path.relative(root, file), calib, scenarios: Object.fromEntries(results.map((r) => [r.name, { p50: r.p50, p99: r.p99, max: r.max, tris: r.tris, calls: r.calls, transparent: r.transparent, newPrograms: r.newPrograms }])) }, null, 1)); note(`baseline written to ${path.relative(root, baselinePath)}`); }
  expect('no page errors', g.errors.length === 0, g.errors.join(' | '));
  await g.close();
  console.log(failures.length ? `PERF REPORT FAILED (${failures.length})` : 'PERF REPORT PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
