// Allocation probe (report): which functions allocate memory every frame, and how much time the garbage
// collector takes. A steady stream of short-lived objects means collector pauses, which on a headset are
// dropped frames. Samples the heap allocations (CDP sampling heap profiler) for 15 s in each situation:
// the town standing, walking, and the planting Event; reports bytes per second by allocating function
// with a source excerpt, and the collector's share of main-thread time (CPU profiler).
//
//   node tools/alloc_probe.js [file] [--after-events] [--vignettes] [--cave]
// --after-events: play two Events to their end first (the author's flash came only after the Events, log 2d18deee),
// then measure the town standing and walking. --vignettes: also measure 60 s with visits forced every 8 s (their
// vignettes playing; the author: "check if vignettes also cause garbage collection issues").
// --cave: also measure 40 s of the player going into the Cave (the inside of the church) and out again every 4 s
// (the author: "does entering and exiting the Cave cause any garbage collection issues?").
const path = require('path');
const fs = require('fs');
const { boot, root } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
const lines = fs.readFileSync(file, 'utf8').split('\n');
const excerpt = (l, c) => (lines[l] || '').slice(Math.max(0, c - 20), c + 60).replace(/\s+/g, ' ');
(async () => {
  const g = await boot({ file, vr: true, fastSim: false }); const page = g.page;
  // draw calls stubbed (as perf_report.js does): software GL time is not the game's
  await page.evaluate(() => { const O = window.__dbg.O; O.renderBufferDirect = (cam, sc, geo, mat, obj, grp) => { const idx = geo.index, pos = geo.attributes.position; let n = idx ? idx.count : pos ? pos.count : 0; if (grp && grp.count !== Infinity) n = grp.count; O.info.update(n, 4, 1); }; window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable'); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const measure = async (name, setup, ms = 15000) => {
    if (setup) await setup();
    await wait(1000);
    const f0 = await page.evaluate(() => { const s = window.__dbg.O.xr.getSession(); return (s.__real || s).__frames || 0; });
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096 });
    await cdp.send('Profiler.start');
    const t0 = Date.now(); await wait(ms); const secs = (Date.now() - t0) / 1000;
    const { profile: heap } = await cdp.send('HeapProfiler.stopSampling');
    const { profile: cpu } = await cdp.send('Profiler.stop');
    // heap: self size per call frame
    const by = new Map(); const walk = (n) => { const f = n.callFrame; const k = (f.functionName || '(anonymous)') + ' @' + f.lineNumber + ':' + f.columnNumber; by.set(k, (by.get(k) || 0) + n.selfSize); n.children.forEach(walk); }; walk(heap.head);
    const total = [...by.values()].reduce((a, b) => a + b, 0);
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => { const m = /@(-?\d+):(-?\d+)$/.exec(k); return { fn: k, kbs: +(v / 1024 / secs).toFixed(1), src: m && +m[1] >= 0 ? excerpt(+m[1], +m[2]) : '' }; });
    // cpu: garbage collector share
    const ids = new Map(cpu.nodes.map((n) => [n.id, n])); let gc = 0, busy = 0;
    for (let i = 0; i < cpu.samples.length; i++) { const fn = ids.get(cpu.samples[i]).callFrame.functionName; const d = (cpu.timeDeltas[i] || 0) / 1000; if (fn === '(idle)') continue; busy += d; if (fn === '(garbage collector)') gc += d; }
    console.log(`\n== ${name}: ${(total / 1024 / secs).toFixed(0)} KB/s sampled allocation; garbage collector ${gc.toFixed(0)} ms in ${secs.toFixed(0)} s (${(100 * gc / Math.max(1, busy)).toFixed(1)}% of busy main-thread time)`);
    for (const t of top) console.log(`  ${String(t.kbs).padStart(8)} KB/s  ${t.fn}   ${t.src}`);
  };
  await wait(1500);
  const after = process.argv.includes('--after-events');
  if (after) {
    for (let n = 0; n < 2; n++) await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400); const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(50); t0 = performance.now(); while (D.me.active && performance.now() - t0 < 900000) await wait(500); await wait(20000); clearInterval(adv); });
    console.log('(two Events played to their end)');
  }
  await measure('town, standing' + (after ? ', after two Events' : ''));
  await measure('town, walking', () => page.evaluate(() => window.__fakeXR.setInputs([{ handedness: 'left', axes: [0, 0, 0, -1], buttons: [{}, {}, {}, {}, {}, {}, {}] }, { handedness: 'right', axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] }])));
  await page.evaluate(() => window.__fakeXR.setInputs([]));
  if (process.argv.includes('--vignettes')) await measure('visits and their vignettes (one called every 8 s)', async () => { await page.evaluate(() => { const D = window.__dbg; window.__vigT = setInterval(() => { try { const B = D.F.buildings, b = B[Math.floor(Math.random() * B.length)]; D.At.position.set(b.x + 3, D.At.position.y, b.z + 3); D.JGP.visitAt(D.Re.t); } catch (e) {} }, 8000); window.__vigA = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 300); }); await wait(9000); }, 60000);
  await page.evaluate(() => { clearInterval(window.__vigT); clearInterval(window.__vigA); });
  if (process.argv.includes('--cave')) await measure('in and out of the Cave (every 4 s)', async () => { await page.evaluate(() => { const D = window.__dbg, c = D.F.buildings.find((B) => B.name === 'church'), out = D.JGP.slug.visit(1).out; let k = 0; window.__caveT = setInterval(() => { try { k++ % 2 ? D.At.position.set(out[0], D.At.position.y, out[1] + 3) : D.At.position.set(c.x, D.At.position.y, c.z); } catch (e) {} }, 4000); }); await wait(4500); }, 40000);
  await page.evaluate(() => clearInterval(window.__caveT));
  if (!after) await measure('the planting Event (from 10 s in)', async () => { await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); await wait(10000); }); }, 30000);
  if (g.errors.length) console.log('page errors: ' + g.errors.join(' | '));
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
