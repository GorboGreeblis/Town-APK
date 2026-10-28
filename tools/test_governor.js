// Quality governor test (standard tier): since 3.15.43 (F-B31, NOTES 83) the governor never swaps the projection layer:
// every quality level and the emergency step keep the native render scale, and only foveation changes, on the same
// layer. Frames are slowed on purpose (a busy loop on the main thread) so the outcome does not depend on how fast this
// machine is. Checked:
//   - in town, slow frames lower the quality level (foveation) without a layer swap;
//   - the planting Event drops the governor to its lowest level (full foveation) and locks it there, with no layer swap,
//     however slow the frames; frames and multiview keep going; the Event ends and the lock is released;
//   - the emergency step fires (frames far over a tiny budget) and still swaps nothing.
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
  const cfg = await page.evaluate(() => { const D = window.__dbg, Ge = D.Ge; return { level: Ge.level, layers: (window.__gtXR && window.__gtXR.shim && window.__gtXR.shim.scale) || null }; });
  note(`start: level ${cfg.level}, layer scale ${cfg.layers}`);

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
  expect('the Event: starts at the governor\'s lowest level (full foveation), locked', st.active === true && st.level === 4 && st.locked, JSON.stringify(st));
  await slow(true); await page.waitForTimeout(15000); await slow(false);
  const live = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 4000)); return { frames: window.__fakeXR.frames - f0, mv: !!window.__gtXR.mvActive, err: window.__dbg.O.getContext().getError(), level: window.__dbg.Ge.level }; });
  expect('the Event: slow frames change nothing: still the lowest level, frames coming, multiview as planned, no GL error', live.level === 4 && live.frames > 10 && live.mv === !!process.env.GT_MULTIVIEW && live.err === 0, JSON.stringify(live));
  expect('the Event: no projection layer swap, however slow the frames', swaps(n1).length === 0, swaps(n1).join(' | '));
  const en = await page.evaluate(async () => { const D = window.__dbg; D.me.wrap(); await new Promise((r) => setTimeout(r, 6000)); clearInterval(window.__adv); return { active: D.me.active, locked: D.Ge.lockUntil > 0 }; });
  expect('the Event ended and the governor\'s lock is released', en.active === false && !en.locked, JSON.stringify(en));

  // the emergency step: frames far over a tiny budget at the lowest level fire it; it swaps nothing either
  const n2 = log().length;
  const sos = await page.evaluate(async () => { const Ge = window.__dbg.Ge, wait = (ms) => new Promise((r) => setTimeout(r, ms)); Ge.level = 4; Ge.lockout = 1e12; Ge.budget = 4; const t0 = performance.now(); while (!Ge.sos && performance.now() - t0 < 90000) await wait(100); await wait(1500); Ge.budget = 1000 / 72; Ge.lockout = 0; return { sos: Ge.sos }; });
  expect('the emergency step fires and swaps no layer (its scale is the native one)', sos.sos === 1 && swaps(n2).length === 0, JSON.stringify(sos) + ' ' + swaps(n2).join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GOVERNOR TEST FAILED (${failures.length})` : 'GOVERNOR TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
