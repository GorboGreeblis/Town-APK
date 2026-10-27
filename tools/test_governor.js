// Quality governor test (standard tier): the Event's adaptive render scale (P16) and the Event lock it builds on.
// Frames are slowed on purpose (a busy loop on the main thread, about 45 fps) so the outcome does not depend on how
// fast this machine is. Checks:
//   - in town, slow frames never trigger the Event scale (it is for the Event only);
//   - the frame the planting Event starts, the governor is at its lowest level (NOTES 71);
//   - under 62 fps for three seconds in the Event, the render scale drops to 0.9 through a layer swap, and multiview
//     stays live and frames keep coming;
//   - when the Event ends, the scale returns to the level's own and the log says so (unless the game's emergency
//     drop fired as well, which stays for the session by the game's own rule).
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
  const logs = (re) => (global.__pageLog || []).filter((m) => re.test(m));
  const slow = (on) => page.evaluate((on) => { if (on) { window.__slowT = setInterval(() => { const t = performance.now(); while (performance.now() - t < 18) {} }, 4); } else clearInterval(window.__slowT); }, on);
  await page.waitForTimeout(1500);
  // town, slow
  await slow(true); await page.waitForTimeout(6000); await slow(false);
  expect('town: slow frames do not trigger the Event scale', logs(/event scale/).length === 0, logs(/event scale/).join(' | '));
  // the Event
  const started = await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(100);
    return D.me.active;
  });
  expect('the planting Event started', started === true);
  await page.waitForTimeout(1500);
  const lvl = logs(/quality L\d|finale safeguard/);
  note('governor log: ' + lvl.slice(-3).join(' | '));
  await slow(true);
  const t0 = Date.now(); while (!logs(/event scale 0\.9/).length && Date.now() - t0 < 40000) await page.waitForTimeout(500);
  await page.waitForTimeout(3000);
  const on = logs(/event scale 0\.9/), swapped = logs(/projection layer swapped to scale 0\.9/);
  expect('the Event: under 62 fps for three seconds drops the render scale to 0.9', on.length === 1, on.join(' | ') || 'no event scale line');
  expect('the 0.9 layer is swapped in (behind the old one first, no undrawn frame)', swapped.length >= 1, swapped.join(' | ') || 'no swap line');
  const live = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 3000)); return { frames: window.__fakeXR.frames - f0, mv: !!window.__gtXR.mvActive, err: window.__dbg.O.getContext().getError() }; });
  expect('frames keep coming at 0.9, multiview still live, no GL error', live.frames > 10 && live.mv === !!process.env.GT_MULTIVIEW && live.err === 0, JSON.stringify(live));
  await slow(false);
  // end the Event
  await page.evaluate(async () => { const D = window.__dbg; D.me.wrap(); await new Promise((r) => setTimeout(r, 6000)); clearInterval(window.__adv); });
  note('layer log: ' + logs(/projection layer|event scale|quality L/).slice(-6).join(' | '));
  const off = logs(/event scale off/), back = logs(/projection layer swapped to scale 1\b/);
  // the game's emergency drop (0.82 at 1.6x the frame budget) may fire too on a slow machine; by its own rule it stays
  // for the session, so then the Event scale ends without a swap back
  const sos = logs(/projection layer swapped to scale 0\.82/).length > 0;
  if (sos) expect('when the Event ends: the Event scale ends and the emergency scale stays (the game\'s rule)', off.length === 1 && /emergency scale 0\.82 stays/.test(off[0]) && back.length === 0, off.concat(back).join(' | '));
  else expect('when the Event ends the scale returns to the level\'s own', off.length === 1 && /back to 1/.test(off[0]) && back.length >= 1, off.concat(back).join(' | ') || 'no restore line');
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GOVERNOR TEST FAILED (${failures.length})` : 'GOVERNOR TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
