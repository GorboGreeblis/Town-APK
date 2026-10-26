#!/usr/bin/env node
// Hitch probe (analysis only, B12): for each "demanding moment" measure what
// the renderer has to create on the spot (new shader programs, new textures,
// geometries) and how the frame time spikes around it. Rendering is software
// GL here, so absolute times are not Quest times; the *deltas* (new programs /
// textures per action) and the relative spike are what matter.
//
//   node tools/hitch_probe.js [file]
const path = require('path');
const { boot } = require('./lib/harness.js');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { page, browser, bootS } = await boot({ file, fastSim: false });
  console.log(`booted in ${bootS}s`);
  await page.evaluate(() => { window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });
  const r = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, Kt = D.Kt, out = {};
    const sess = O.xr.getSession(); const samples = [];
    const orig = sess.requestAnimationFrame.bind(sess);
    sess.requestAnimationFrame = (cb) => orig((t, f) => { const a = performance.now(); cb(t, f); samples.push(performance.now() - a); });
    const progNames = () => O.info.programs.map((p) => p.name + (p.cacheKey ? '#' + String(p.cacheKey).length : ''));
    const snap = () => ({ programs: O.info.programs.length, progNames: progNames(), textures: O.info.memory.textures, geometries: O.info.memory.geometries, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const measure = async (name, act, settleMs = 2500) => {
      await wait(1500); const before = snap(); const n0 = samples.length; const base = samples.slice(-30);
      const baseP50 = base.slice().sort((a, b) => a - b)[Math.floor(base.length / 2)] || 0;
      try { await act(); } catch (e) { out[name] = { error: String(e) }; return; }
      await wait(settleMs); const after = snap(); const win = samples.slice(n0);
      const mx = Math.max(...win);
      out[name] = { newPrograms: after.programs - before.programs, newProgramNames: after.progNames.filter((n) => !before.progNames.includes(n)), newTextures: after.textures - before.textures, newGeometries: after.geometries - before.geometries, heapDeltaMB: after.heap - before.heap, baselineFrameMs: +baseP50.toFixed(1), worstFrameMs: +mx.toFixed(1), framesOver2xBaseline: win.filter((x) => x > 2 * baseP50).length, frames: win.length };
    };
    out.atStart = snap();
    // 1. blossom pickup: stand on the nearest blossom
    await measure('blossom pickup', async () => { const b = D.le.list.find((x) => x.visible && !x.userData.taken); D.At.position.set(b.position.x, D.At.position.y, b.position.z); });
    // 2. acorn pickup
    await measure('acorn pickup', async () => { const a = D.ce.list.find((x) => x.visible && !x.userData.taken); D.At.position.set(a.position.x, D.At.position.y, a.position.z); });
    // 3. a label with text never shown before (new 64x64 canvas texture)
    await measure('new floating label', async () => { D.Ut.at(D.At.position.x, 1.5, D.At.position.z - 1, 'ZZ9', '#ff00ff'); });
    // 4. second pickup of the same kind (textures cached?)
    await measure('second blossom pickup', async () => { const b = D.le.list.filter((x) => x.visible && !x.userData.taken)[1]; D.At.position.set(b.position.x, D.At.position.y, b.position.z); });
    // 5. dialogue box open
    await measure('dialogue open', async () => { D.qt.open('TEST', '#ffffff', 'Hello there.|Second line.'); });
    // 6. battle panel
    await measure('battle panel open', async () => { const m = D.It.all.find((h) => h.def && h.def.name === 'MONTGUMMERY'); if (D.Dbt && D.Dbt.start) D.Dbt.start(m); else throw new Error('no Dbt.start'); }, 3000);
    try { D._t.close(); } catch (e) {}
    // 7. garden Event start (Stone + Seeds + Snacks, then the pillar)
    await measure('garden Event start', async () => { Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); if (!D.me.active) throw new Error('event did not start'); }, 6000);
    out.duringEvent = await (async () => { const n0 = samples.length; await wait(8000); const w = samples.slice(n0).sort((a, b) => a - b); return { p50: +w[Math.floor(w.length / 2)].toFixed(1), p99: +w[Math.floor(w.length * 0.99)].toFixed(1), frames: w.length }; })();
    out.atEnd = snap(); out.governor = D.Ge ? { level: D.Ge.level, sos: D.Ge.sos, rebuilds: D.Ge.rebuilds, emaMs: +D.Ge.ema.toFixed(1) } : null;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close().catch(() => {}); process.exit(0);
})();
