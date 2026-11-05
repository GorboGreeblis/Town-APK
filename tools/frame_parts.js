// Frame parts (report, not in the tiers; the CPU pass of 4.0.47 on): where the main thread's time goes in one XR
// frame, part by part, as the median over many frames at fixed views (the town at the battery run's slowest spots,
// the planting Event at its slowest and heaviest): the whole frame callback, three.js's render, inside it the scene's
// matrix walk, the batcher's pass (the scene's onBeforeRender), the draw path (renderBufferDirect for every draw:
// program and uniforms, vertex bindings, the draw call) and the rest (culling, sorting, lights); outside it, the
// game's update. Medians of parts are far steadier than the whole frame's mean (the software renderer's threads
// take turns with the game's), so a saving in one part shows even when the frame's total is noisy.
//   --toggle "<expression with X>": each view in windows of 30 frames, the expression run with X = false and true in
//   turns; prints both sides' medians and the change per part.
//
//   GT_HEADSET_FOV=1 node tools/frame_parts.js [file] [--frames 300] [--town] [--event] [--toggle expr]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const path = require('path');
const { boot } = require('./lib/harness');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const FRAMES = +arg('--frames', '300'), TOGGLE = arg('--toggle', null);
const onlyTown = process.argv.includes('--town'), onlyEvent = process.argv.includes('--event');
const TOWN = [['town (21,25)', 21, 25], ['town (-22,-23)', -22, -23], ['town (-15,23)', -15, 23], ['town (-36,-20)', -36, -20]];
const EVENT = [['Event (26,-23)', 26, -23], ['Event SW (-28.3,-28.3)', -28.3, -28.3], ['Event low (-33,-7)', -33, -7]];
const PARTS = ['frame', 'render', 'walk', 'batcher', 'draws', 'render other', 'update'];

(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const views = [...(onlyEvent ? [] : TOWN), ...(onlyTown ? [] : EVENT)];
  const res = await g.page.evaluate(async ({ views, FRAMES, TOGGLE, PARTS }) => {
    const D = window.__dbg, X = window.__fakeXR, O = D.O, C = D.C, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(2500);
    // per-frame accumulators, reset by the frame callback timer
    let cur = { walk: 0, batcher: 0, draws: 0, render: 0, n: 0 };
    const wrapT = (o, k, part) => { const f = o[k]; o[k] = function () { const a = performance.now(); try { return f.apply(this, arguments); } finally { cur[part] += performance.now() - a; } }; };
    wrapT(C, 'updateMatrixWorld', 'walk'); wrapT(C, 'onBeforeRender', 'batcher'); wrapT(O, 'render', 'render');
    const rbd = O.renderBufferDirect; O.renderBufferDirect = function () { const a = performance.now(); try { return rbd.apply(this, arguments); } finally { cur.draws += performance.now() - a; cur.n++; } };
    const frames = []; let last = X.cbMs, lastF = X.frames, rec = false;
    const tick = () => { if (X.frames !== lastF) { const cb = X.cbMs - last; if (rec) frames.push({ frame: cb, render: cur.render, walk: cur.walk, batcher: cur.batcher, draws: cur.draws, n: cur.n }); last = X.cbMs; lastF = X.frames; cur = { walk: 0, batcher: 0, draws: 0, render: 0, n: 0 }; } };
    const poll = setInterval(tick, 1);
    const set = TOGGLE ? new Function('X', TOGGLE) : null;
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
    const sum = (list) => { const o = {}; for (const p of PARTS) o[p] = 0; if (!list.length) return o;
      o.frame = med(list.map((f) => f.frame)); o.render = med(list.map((f) => f.render)); o.walk = med(list.map((f) => f.walk)); o.batcher = med(list.map((f) => f.batcher)); o.draws = med(list.map((f) => f.draws));
      o['render other'] = med(list.map((f) => f.render - f.walk - f.batcher - f.draws)); o.update = med(list.map((f) => f.frame - f.render)); o.drawN = med(list.map((f) => f.n)); return o; };
    const waitFrames = (n) => new Promise((r) => { const f0 = X.frames; const k = () => (X.frames - f0 >= n ? r() : setTimeout(k, 2)); k(); });
    const out = [];
    const measure = async (v) => {
      D.At.position.set(v[1], D.At.position.y, v[2]); X.pose.yaw = Math.atan2(v[1], v[2]); await wait(1200);
      if (!set) { frames.length = 0; rec = true; await waitFrames(FRAMES); rec = false; out.push({ v: v[0], a: sum(frames) }); return; }
      const side = [[], []];
      for (let k = 0; side[0].length < FRAMES || side[1].length < FRAMES; k++) {
        const s = k % 2; set(!!s); await waitFrames(2); frames.length = 0; rec = true; await waitFrames(30); rec = false; side[s].push(...frames);
      }
      set(true); out.push({ v: v[0], a: sum(side[0]), b: sum(side[1]) });
    };
    for (const v of views.filter((v) => v[0].startsWith('town'))) await measure(v);
    if (views.some((v) => v[0].startsWith('Event'))) {
      const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
      const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
      const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
      while (D.JGP.mist.p() < 1 && performance.now() - t0 < 150000) await wait(250); await wait(3000);
      for (const v of views.filter((v) => v[0].startsWith('Event'))) await measure(v);
    }
    clearInterval(poll);
    return out;
  }, { views, FRAMES, TOGGLE, PARTS });
  await g.close();
  const f = (x) => x.toFixed(2).padStart(6);
  console.log(`frame_parts${TOGGLE ? ' --toggle ' + TOGGLE : ''}: medians per frame in ms over ${FRAMES} frames${TOGGLE ? ' each side' : ''}`);
  console.log('  ' + 'view'.padEnd(26) + PARTS.map((p) => p.padStart(13)).join('') + '   draws');
  for (const r of res) {
    console.log('  ' + (r.v + (r.b ? ' off' : '')).padEnd(26) + PARTS.map((p) => f(r.a[p]).padStart(13)).join('') + String(r.a.drawN).padStart(8));
    if (r.b) {
      console.log('  ' + (r.v + ' on').padEnd(26) + PARTS.map((p) => f(r.b[p]).padStart(13)).join('') + String(r.b.drawN).padStart(8));
      console.log('  ' + 'change'.padEnd(26) + PARTS.map((p) => ((r.a[p] ? (100 * (r.b[p] / r.a[p] - 1)).toFixed(0) : '0') + '%').padStart(13)).join(''));
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
