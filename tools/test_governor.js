// Quality governor test (standard tier): since 3.15.43 (F-B31, NOTES 83) the governor never swaps the projection layer,
// and since 4.0.13 (F-B83, the author: "rebuild the Foveation system to reflect the current game") it never touches the
// layer at all: fixed foveation is one value (0) set once at VR entry, and the governor's level only drives the Event's
// far-object safeguard. Frames are slowed on purpose (a busy loop on the main thread) so the outcome does not depend on
// how fast this machine is. Checked:
//   - at VR entry the layer's foveation is the fixed value, and the entry log says so;
//   - in town, slow frames move the governor's level without a layer swap, and the layer's foveation stays fixed;
//   - the planting Event drops the level to its lowest and locks it there, with no layer swap and the foveation still
//     fixed, however slow the frames; the Event ends, the lock is released and the level goes back to the entry level
//     (before 4.0.13 it stayed at the lowest level, with full foveation, for the rest of the session: B52);
//   - the emergency step fires (frames far over a tiny budget) and still swaps nothing and changes no foveation.
//
//   node tools/test_governor.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
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
  const cfg = await page.evaluate(() => { const D = window.__dbg, Ge = D.Ge; return { level: Ge.level, layers: (window.__gtXR && window.__gtXR.shim && window.__gtXR.shim.scale) || null, fixed: D.t && D.t.xr ? D.t.xr.foveation : undefined }; });
  cfg.fov = await fov(); note(`start: level ${cfg.level}, layer scale ${cfg.layers}, layer foveation ${cfg.fov} (fixed ${cfg.fixed})`);
  expect('at VR entry the layer\'s foveation is the fixed value (0) and the entry log says so', cfg.fov === 0 && cfg.fixed === 0 && log().some((m) => /foveation fixed at 0 \(the layer reads 0\)/.test(m)), JSON.stringify({ fov: cfg.fov, fixed: cfg.fixed }));

  // town: let the governor step up (frames well under budget), then slow the frames so it steps down
  const n0 = log().length;
  const town = await page.evaluate(async () => {
    const Ge = window.__dbg.Ge, wait = (ms) => new Promise((r) => setTimeout(r, ms)), seen = new Set([Ge.level]), from = Ge.level;
    Ge.budget = 50; Ge.ema = 5; Ge.under = 1e9; Ge.lockout = 0; Ge.next = 0; Ge.probe = false;
    const t0 = performance.now(); while (Ge.level !== 0 && performance.now() - t0 < 6000) { seen.add(Ge.level); await wait(50); }
    seen.add(Ge.level); Ge.budget = 1000 / 72; return { from, top: Math.min(...seen), seen: [...seen] };
  });
  await slow(true);
  const down = await page.evaluate(async (top) => { const Ge = window.__dbg.Ge, wait = (ms) => new Promise((r) => setTimeout(r, ms)); const t0 = performance.now(); while (Ge.level <= top && performance.now() - t0 < 30000) await wait(100); return Ge.level; }, town.top);
  await slow(false);
  expect('town: the governor steps up with headroom and down when frames are slow', town.top < town.from && down > town.top, JSON.stringify({ ...town, down }));
  expect('town: no projection layer swap at any level (F-B31: native scale at every level)', swaps(n0).length === 0, swaps(n0).join(' | '));
  expect('town: the layer\'s foveation stays fixed through every level change (F-B83)', (await fov()) === 0, String(await fov()));

  // the planting Event: lowest level, locked, no swap, however slow
  const n1 = log().length;
  const st = await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    clearInterval(window.__adv); window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(100);
    const t1 = performance.now(); while (D.Ge.level !== 4 && performance.now() - t1 < 3000) await wait(20);
    return { active: D.me.active, level: D.Ge.level, locked: D.Ge.lockUntil > 0 };
  });
  expect('the Event: starts at the governor\'s lowest level, locked, the layer\'s foveation still fixed', st.active === true && st.level === 4 && st.locked && (await fov()) === 0, JSON.stringify(st) + ' fov ' + (await fov()));
  await slow(true); await page.waitForTimeout(15000); await slow(false);
  const live = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 4000)); return { frames: window.__fakeXR.frames - f0, mv: !!window.__gtXR.mvActive, err: window.__dbg.O.getContext().getError(), level: window.__dbg.Ge.level }; });
  expect('the Event: slow frames change nothing: still the lowest level, frames coming, multiview as planned, no GL error', live.level === 4 && live.frames > 10 && live.mv === !!process.env.GT_MULTIVIEW && live.err === 0, JSON.stringify(live));
  expect('the Event: no projection layer swap, however slow the frames', swaps(n1).length === 0, swaps(n1).join(' | '));
  const n3 = log().length;
  const en = await page.evaluate(async () => { const D = window.__dbg; D.me.wrap(); await new Promise((r) => setTimeout(r, 6000)); clearInterval(window.__adv); return { active: D.me.active, locked: D.Ge.lockUntil > 0, level: D.Ge.level, level0: D.Ge.level0 }; });
  // the level is put back to the entry level when the Event ends (headless frames run over budget, so the governor may
  // step it up again within seconds; since F-B83 the level changes nothing on the layer, so only the restore matters)
  expect('the Event ended, the governor\'s lock is released and its level is put back to the entry level (B52: it stayed at the lowest)', en.active === false && !en.locked && log().slice(n3).some((m) => new RegExp('governor level ' + en.level0 + '\\b').test(m)), JSON.stringify(en) + ' ' + log().slice(n3).filter((m) => /governor level/.test(m)).join(' | '));

  // the emergency step: frames far over a tiny budget at the lowest level fire it; it swaps nothing either
  const n2 = log().length;
  const sos = await page.evaluate(async () => { const Ge = window.__dbg.Ge, wait = (ms) => new Promise((r) => setTimeout(r, ms)); Ge.level = 4; Ge.lockout = 1e12; Ge.budget = 4; const t0 = performance.now(); while (!Ge.sos && performance.now() - t0 < 90000) await wait(100); await wait(1500); Ge.budget = 1000 / 72; Ge.lockout = 0; return { sos: Ge.sos }; });
  expect('the emergency step fires, swaps no layer and changes no foveation', sos.sos === 1 && swaps(n2).length === 0 && (await fov()) === 0, JSON.stringify(sos) + ' ' + swaps(n2).join(' | ') + ' fov ' + (await fov()));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GOVERNOR TEST FAILED (${failures.length})` : 'GOVERNOR TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
