// Frame governor and fixed foveation test (standard tier). Since 3.15.43 (F-B31, NOTES 83) the game never swaps the
// projection layer; since 4.0.13 (F-B83, the author: "rebuild the Foveation system to reflect the current game") it
// never touches the layer at all: fixed foveation is one value (0) set once at VR entry; since 4.0.14 (L1, the audit's
// leftovers) the governor's five quality levels are gone (they changed nothing since F-B83): what remains is the
// frame-time average (the perf line's fps), a frames-over-budget flag that only logs, and the Event's far-object
// safeguard (the far plane and the far scenery fades), which keys on the Event alone. Frames are slowed on purpose (a
// busy loop on the main thread) so the outcome does not depend on how fast this machine is. Checked:
//   - at VR entry the layer's foveation is the fixed value, the entry log says so, and the levels are gone (no
//     `quality` tuning, no `Ge.level`);
//   - in town, slow frames swap no layer, change no foveation, and frames keep coming;
//   - the frames-over-budget flag fires on frames far over a tiny budget, logs once, swaps nothing and changes no
//     foveation;
//   - the planting Event starts with the far-object safeguard on (the far plane at `finaleFar`), slow frames change
//     nothing (foveation fixed, no swap, frames coming, multiview as planned, no GL error); the Event ends and the far
//     plane is back (before 4.0.13 the lowest level, with full foveation, stayed on for the rest of the session: B52).
//
//   node tools/test_governor.js [file]
const path = require('path');
const { boot, reporter, root, finalBuild } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
// the final build writes no log lines (RULES.md 34, B129): there the behaviour is checked and the log lines are not
const FINAL = finalBuild(file || path.join(root, 'tools/site/index.html'));
(async () => {
  const { expect, note, failures } = reporter();
  global.__pageLog = [];
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  const slow = (on) => page.evaluate((on) => { if (on) { clearInterval(window.__slowT); window.__slowT = setInterval(() => { const t = performance.now(); while (performance.now() - t < 18) {} }, 4); } else clearInterval(window.__slowT); }, on);
  const log = () => (global.__pageLog || []).slice();
  const swaps = (from) => log().slice(from).filter((m) => /projection layer swapped|projection layer live/.test(m));
  await page.waitForTimeout(1500);
  const fov = () => page.evaluate(() => { const X = window.__gtXR; return X && X.shim ? X.shim.fixedFoveation : null; });
  const cfg = await page.evaluate(() => { const D = window.__dbg, Ge = D.Ge; return { layers: (window.__gtXR && window.__gtXR.shim && window.__gtXR.shim.scale) || null, fixed: D.t && D.t.xr ? D.t.xr.foveation : undefined, quality: D.t && D.t.xr ? D.t.xr.quality : undefined, level: Ge.level, keys: Object.keys(Ge).sort(), far0: D.B.far, finaleFar: D.t.xr.finaleFar }; });
  cfg.fov = await fov(); note(`start: layer scale ${cfg.layers}, layer foveation ${cfg.fov} (fixed ${cfg.fixed}); governor keys ${cfg.keys.join(',')}; far ${cfg.far0}, finale far ${cfg.finaleFar}`);
  expect('at VR entry the layer\'s foveation is the fixed value (0) and the entry log says so', cfg.fov === 0 && cfg.fixed === 0 && (FINAL || log().some((m) => /foveation fixed at 0 \(the layer reads 0\)/.test(m))), JSON.stringify({ fov: cfg.fov, fixed: cfg.fixed }));
  expect('the governor\'s quality levels are gone (L1): no `quality` tuning, no level, only the frame average and the over-budget flag', cfg.quality === undefined && cfg.level === undefined && cfg.keys.join(',') === 'budget,ema,hard,sos', JSON.stringify({ quality: cfg.quality, level: cfg.level, keys: cfg.keys }));

  if (FINAL) note('the final build: no log lines, so the entry log, the flag\'s log line and layer swaps (read from the log) are not checked (B129); the foveation, the flag and the frames are');
  // town: slow frames for a while
  const n0 = log().length;
  await slow(true);
  const town = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 8000)); return { frames: window.__fakeXR.frames - f0, emaMs: +window.__dbg.Ge.ema.toFixed(1) }; });
  await slow(false);
  expect('town: slow frames swap no layer and change no foveation; frames keep coming', swaps(n0).length === 0 && (await fov()) === 0 && town.frames > 10, JSON.stringify(town) + ' swaps ' + swaps(n0).join(' | ') + ' fov ' + (await fov()));

  // the frames-over-budget flag: frames far over a tiny budget fire it once; it logs and changes nothing
  const n1 = log().length;
  // the frames made slow, as in the town part: the final build without its debug code draws fast enough headless that
  // a 4 ms budget is not passed by 1.6 times on its own (B129)
  await slow(true);
  const sos = await page.evaluate(async () => { const Ge = window.__dbg.Ge, wait = (ms) => new Promise((r) => setTimeout(r, ms)); Ge.sos = 0; Ge.hard = 0; Ge.budget = 4; const t0 = performance.now(); while (!Ge.sos && performance.now() - t0 < 90000) await wait(100); await wait(1500); Ge.budget = 1000 / 72; return { sos: Ge.sos, waited: Math.round(performance.now() - t0) }; });
  await slow(false);
  const sosLines = log().slice(n1).filter((m) => /frames over budget for \d+ frames/.test(m));
  expect('the frames-over-budget flag fires, logs once, swaps no layer and changes no foveation', sos.sos === 1 && (FINAL || sosLines.length === 1) && swaps(n1).length === 0 && (await fov()) === 0, JSON.stringify(sos) + ' lines ' + sosLines.length + ' ' + swaps(n1).join(' | ') + ' fov ' + (await fov()));

  // the planting Event: the far-object safeguard, no swap, however slow
  const n2 = log().length;
  const st = await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    clearInterval(window.__adv); window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(100);
    await wait(500);
    return { active: D.me.active, far: D.B.far, finaleFar: D.t.xr.finaleFar, fading: (window.__gcEa && window.__gcEa.list || []).length };
  });
  expect('the Event: starts with the far-object safeguard on (the far plane at finaleFar, far scenery fading), the layer\'s foveation still fixed', st.active === true && st.far === st.finaleFar && st.fading > 0 && (await fov()) === 0, JSON.stringify(st) + ' fov ' + (await fov()));
  await slow(true); await page.waitForTimeout(15000); await slow(false);
  const live = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 4000)); return { frames: window.__fakeXR.frames - f0, mv: !!window.__gtXR.mvActive, err: window.__dbg.O.getContext().getError(), far: window.__dbg.B.far }; });
  expect('the Event: slow frames change nothing: the safeguard on, frames coming, multiview as planned, no GL error', live.far === st.finaleFar && live.frames > 10 && live.mv === !!process.env.GT_MULTIVIEW && live.err === 0, JSON.stringify(live));
  expect('the Event: no projection layer swap, however slow the frames', swaps(n2).length === 0, swaps(n2).join(' | '));
  const en = await page.evaluate(async () => { const D = window.__dbg; D.me.wrap(); await new Promise((r) => setTimeout(r, 6000)); clearInterval(window.__adv); return { active: D.me.active, far: D.B.far, far0: D.t.far }; });
  expect('the Event ended: the far plane is back and the foveation still fixed (B52: full foveation stayed on before 4.0.13)', en.active === false && en.far === en.far0 && (await fov()) === 0, JSON.stringify(en) + ' fov ' + (await fov()));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GOVERNOR TEST FAILED (${failures.length})` : 'GOVERNOR TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
