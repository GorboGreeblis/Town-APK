// Matrix trace (report): how much of three.js's per-frame scene update is work on objects that did not move.
// Every frame the game calls scene.updateMatrixWorld, which recomposes each auto-updating object's local matrix
// and multiplies it into its parent's world matrix, for every object in the scene (the largest single item of
// the game's script time in the Event, PERF.md 7). This samples, frame by frame, which objects' world matrices
// actually changed, times the update, and groups the result by top-level subtree: how many objects are walked,
// how many auto-update, how many changed in any frame of the window, and which subtrees never changed at all.
// It is the ceiling for any exact skip of unchanged objects (a skip may only drop work on objects that did not
// change, and must prove that without walking them).
//
//   node tools/matrix_trace.js [file] [--event] [--seconds 20] [--root-static]
// --root-static: the scene root stops recomposing its own (identity) matrix every frame, so it no longer forces every
// world matrix in the scene to be recomputed (P15). After each frame's update every object's world matrix is then
// checked bit for bit against a fresh parent x local product: any difference fails, naming the object.
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const withEvent = process.argv.includes('--event');
const rootStatic = process.argv.includes('--root-static');
const secs = Number((process.argv[process.argv.indexOf('--seconds') + 1]) || 20) || 20;
(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(1500);
  if (withEvent) {
    const ok = await page.evaluate(async () => {
      const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
      Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
      const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
      const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200);
      await wait(20000); clearInterval(adv); return !!D.me.active;
    });
    console.log(ok ? 'the planting Event, 20 s in' : 'the Event did not start; town');
  } else console.log('town, standing at the spawn');
  const r = await page.evaluate(async ([secs, rootStatic]) => {
    const D = window.__dbg, C = D.C, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const last = new Map(), changed = new Map(), top = new Map();
    let frames = 0, tUpd = 0, walked = 0, changedPerFrame = [];
    const topOf = (o) => { let p = o; while (p.parent && p.parent !== C) p = p.parent; return p; };
    const T = window.THREE, ref = new T.Matrix4(); let checked = 0, bad = 0; const badNames = [];
    const rootWas = C.matrixAutoUpdate; if (rootStatic) C.matrixAutoUpdate = false;
    const u0 = C.updateMatrixWorld;
    C.updateMatrixWorld = function () {
      const t = performance.now(); const res = u0.apply(this, arguments); tUpd += performance.now() - t;
      let n = 0, w = 0;
      C.traverse((o) => {
        w++; const e = o.matrixWorld.elements; let a = last.get(o);
        if (!a) { last.set(o, a = Float64Array.from(e)); return; }
        let d = false; for (let i = 0; i < 16; i++) if (a[i] !== e[i]) { d = true; a[i] = e[i]; }
        if (d) { n++; changed.set(o, (changed.get(o) || 0) + 1); }
      });
      if (rootStatic) C.traverse((o) => {
        if (o.parent) ref.multiplyMatrices(o.parent.matrixWorld, o.matrix); else ref.copy(o.matrix);
        const a = ref.elements, e = o.matrixWorld.elements; checked++;
        for (let i = 0; i < 16; i++) if (a[i] !== e[i] && !(a[i] !== a[i] && e[i] !== e[i])) { bad++; if (badNames.length < 12) { let q = o, nm = []; while (q && q !== C) { nm.push(q.name || q.type); q = q.parent; } badNames.push(nm.join('<') + ' auto=' + o.matrixAutoUpdate); } break; }
      });
      frames++; walked = w; changedPerFrame.push(n); return res;
    };
    await wait(secs * 1000);
    C.updateMatrixWorld = u0; C.matrixAutoUpdate = rootWas;
    // per top-level subtree
    C.traverse((o) => { if (o === C) return; const t = topOf(o); let s = top.get(t); if (!s) top.set(t, s = { name: t.name || t.type, objs: 0, auto: 0, moved: 0, batchedParts: 0 }); s.objs++; if (o.matrixAutoUpdate) s.auto++; if (changed.has(o)) s.moved++; if (o.layers && o.layers.mask === (1 << 31)) s.batchedParts++; });
    const subs = [...top.values()];
    const all = subs.reduce((a, s) => ({ objs: a.objs + s.objs, auto: a.auto + s.auto, moved: a.moved + s.moved, parts: a.parts + s.batchedParts }), { objs: 0, auto: 0, moved: 0, parts: 0 });
    const still = subs.filter((s) => s.moved === 0);
    changedPerFrame.sort((a, b) => a - b);
    return { frames, msPerFrame: tUpd / Math.max(1, frames), walked, all, med: changedPerFrame[changedPerFrame.length >> 1], p90: changedPerFrame[Math.floor(changedPerFrame.length * 0.9)],
      checked, bad, badNames, stillSubs: still.length, stillObjs: still.reduce((a, s) => a + s.objs, 0), subs: subs.sort((a, b) => b.objs - a.objs).slice(0, 25) };
  }, [secs, rootStatic]);
  console.log(`${r.frames} frames: scene update ${r.msPerFrame.toFixed(3)} ms a frame (headless), ${r.walked} objects walked`);
  if (rootStatic) console.log(`root static (P15): ${r.checked} world matrices checked against parent x local, ${r.bad} differ` + (r.bad ? ': ' + r.badNames.join(' | ') : ''));
  console.log(`objects: ${r.all.objs}, auto-updating ${r.all.auto}, batched parts (drawn through a batch, matrices read by the batcher) ${r.all.parts}`);
  console.log(`world matrix changed in a frame: median ${r.med}, 90th percentile ${r.p90} objects; ever changed in the window: ${r.all.moved} (${(100 * r.all.moved / r.all.objs).toFixed(1)}%)`);
  console.log(`top-level subtrees that never changed: ${r.stillSubs} holding ${r.stillObjs} objects (${(100 * r.stillObjs / r.all.objs).toFixed(1)}%)`);
  console.log('\nlargest top-level subtrees (objects, auto-updating, changed in the window, batched parts):');
  r.subs.forEach((s) => console.log(`  ${String(s.name).slice(0, 30).padEnd(30)} ${String(s.objs).padStart(5)} ${String(s.auto).padStart(5)} ${String(s.moved).padStart(5)} ${String(s.batchedParts).padStart(5)}`));
  await g.close();
  if (rootStatic && r.bad) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
