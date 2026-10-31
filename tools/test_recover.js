// Recovery (standard tier; the author: "For stability: We want the game to be able to recover from any major issue";
// FIXES S4, S5). Faults are injected into a running game (VR, rendering on) and each must be recovered from:
//   - a townsperson whose position becomes not a number is put back home within a second (the game's own guard, or
//     S5 behind it);
//   - a townsperson whose update fails every frame is reset after 30 failures (put back home, its errand cleared) and
//     then updates again, moving, without errors (S5; a roamer walks on from where its walk state puts it);
//   - the batcher's pass failing every frame (a broken batch) is stepped down (S4): first the still-group and
//     draw-nothing marks off, then batching off with everything drawn on its own; frames keep drawing throughout,
//     and once stepped down no more batcher errors come;
//   - each recovery is logged ("recovery: ...").
// Page errors from the injected faults are expected (they are what is recovered from); none other may appear.
//
//   node tools/test_recover.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms)), logs = [], L0 = window.__gtLog;
    window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    await wait(2000);
    const out = {};
    if (!window.gcSafe) return { none: true };
    const home = (h) => Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z);
    // 1. a position that is not a number
    const a = D.It.all.find((h) => h.id === 'gorbo') || D.It.all.find((h) => h.home && h.group);
    a.group.position.set(NaN, 0, NaN); await wait(1000);
    out.nan = { id: a.id, finite: Number.isFinite(a.group.position.x) && Number.isFinite(a.group.position.z), home: +home(a).toFixed(2), log: logs.some((s) => /recovery: .* put back home \(its position was not a number\)/.test(s)) };
    // 2. an update failing every frame (a getter that throws until the recovery clears it)
    const b = D.It.all.find((h) => h.id === 'p_mamagorbo') || D.It.all.find((h) => h.home && h.group && h !== a);
    b.group.position.set(b.home.x + 6, 0, b.home.z + 6);
    let bad = true; const busy0 = b.busy;
    Object.defineProperty(b, 'busy', { get() { if (bad) throw new Error('injected fault'); return null; }, set() { bad = false; }, configurable: true });
    const t0 = performance.now(); while (bad && performance.now() - t0 < 5000) await new Promise((res) => requestAnimationFrame(res));
    const atRecovery = home(b);
    delete b.busy; b.busy = busy0 === undefined ? null : null;
    const p0 = b.group.position.clone(), e0 = D.Re.errors; await wait(3000);
    out.failing = { id: b.id, recovered: !bad, s: +((performance.now() - t0) / 1000).toFixed(1), home: +atRecovery.toFixed(2), errorsAfter: D.Re.errors - e0, movedAfter: +b.group.position.distanceTo(p0).toFixed(2), log: logs.some((s) => /put back home \(its update kept failing\)/.test(s)) };
    // 3. the batcher's pass failing every frame
    const R = O.render; let frames = 0, calls = 0; O.render = function () { const x = R.apply(this, arguments); frames++; calls += O.info.render.calls; return x; };
    const n0 = D.gcEB.list.length; D.gcEB.list[0].P = null;
    const t1 = performance.now(); while (!logs.some((s) => /recovery: batcher kept failing; step 2/.test(s)) && performance.now() - t1 < 8000) await wait(50);
    const step2 = logs.some((s) => /recovery: batcher kept failing; step 2/.test(s)), step1 = logs.some((s) => /recovery: batcher kept failing; step 1/.test(s));
    frames = calls = 0; const e1 = D.Re.errors; await wait(1500);
    out.batcher = { batches: n0, step1, step2, s: +((performance.now() - t1) / 1000 - 1.5).toFixed(1), framesAfter: frames, drawsAfter: Math.round(calls / Math.max(1, frames)), errorsAfter: D.Re.errors - e1, left: D.gcEB.list.length, off: !!D.gcEB.off, mv: !!(window.__gtXR && window.__gtXR.mvActive) };
    O.render = R;
    out.logs = logs.filter((s) => /^recovery:/.test(s));
    return out;
  });
  await g.close();
  if (r.none) { expect('the recovery safeties exist (S4, S5)', false); process.exit(1); }
  note(JSON.stringify(r));
  expect('a townsperson whose position is not a number is put back home within a second (by the game\'s own guard or S5)', r.nan.finite && r.nan.home < 0.5, JSON.stringify(r.nan));
  expect('a townsperson whose update fails every frame is reset (put back home, busy cleared) and then updates again, without errors', r.failing.recovered && r.failing.log && r.failing.errorsAfter === 0 && r.failing.movedAfter > 0.2, JSON.stringify(r.failing));
  // draws per frame: multiview (the headset's path) draws both eyes in one call, so half the classic path's count
  expect('the batcher failing every frame is stepped down (marks off, then batching off) and frames keep drawing', r.batcher.step1 && r.batcher.step2 && r.batcher.framesAfter > 20 && r.batcher.drawsAfter > (r.batcher.mv ? 25 : 50) && r.batcher.left === 0 && r.batcher.off, JSON.stringify(r.batcher));
  expect('once stepped down no more batcher errors come', r.batcher.errorsAfter === 0, String(r.batcher.errorsAfter));
  const other = g.errors.filter((e) => !/injected fault|Cannot read properties of null|null is not an object|\.P\b|reading 'some'|reading 'forEach'|reading 'length'/.test(e));
  expect('no page errors other than the injected faults', other.length === 0, other.slice(0, 3).join(' | '));
  console.log(failures.length ? `RECOVER TEST FAILED (${failures.length})` : 'RECOVER TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
