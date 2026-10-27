// Quality governor test (standard tier): the Event's adaptive render scale (P16, P17) and the Event lock it builds on.
// Run per device: GT_DEVICE=quest3s (the Event scale only when the frame rate asks for it) and GT_DEVICE=quest3 (the
// Event starts at 0.9). Frames are slowed on purpose (a busy loop on the main thread) so the outcome does not depend on
// how fast this machine is. Two Events in one session:
//   1. the governor's frame budget is raised for the test so its emergency drop (0.82 at 1.6x the budget) cannot fire:
//      the Event lock, the 0.9 scale (under 62 fps, or at once on a Quest 3, in one layer swap), the second step to 0.82
//      (under 60 fps at 0.9), frames and multiview live throughout, and the return to the level's own scale at the end;
//   2. the normal budget and the same load: the emergency drop may fire as well; the Event starts with the governor
//      already at its lowest level (a Quest 3 then takes the other branch to 0.9); at the end, if the emergency drop
//      fired, it stays (the game's own rule), else the scale returns.
// In town, slow frames never trigger the Event scale.
//
//   GT_DEVICE=quest3s node tools/test_governor.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  global.__pageLog = [];
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  const slow = (on) => page.evaluate((on) => { if (on) { clearInterval(window.__slowT); window.__slowT = setInterval(() => { const t = performance.now(); while (performance.now() - t < 18) {} }, 4); } else clearInterval(window.__slowT); }, on);
  const q3 = await page.evaluate(() => /Quest 3(?!S)/.test(navigator.userAgent || ''));
  note(`device: ${q3 ? 'Quest 3' : 'not a Quest 3'} (${process.env.GT_DEVICE || 'default user agent'}), multiview ${!!process.env.GT_MULTIVIEW}`);
  await page.waitForTimeout(1500);
  const n00 = (global.__pageLog || []).length;
  await slow(true); await page.waitForTimeout(6000); await slow(false);
  const town = (global.__pageLog || []).slice(n00).filter((m) => /event scale/.test(m));
  expect('town: slow frames do not trigger the Event scale', town.length === 0, town.join(' | '));

  const startEvent = () => page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    clearInterval(window.__adv); window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(100);
    const t1 = performance.now(); while (D.Ge.level !== 4 && performance.now() - t1 < 3000) await wait(20);   // the drop comes on the next XR frame
    return { active: D.me.active, level: D.Ge.level, ev: D.Ge.ev, sos: D.Ge.sos };
  });
  const endEvent = () => page.evaluate(async () => { const D = window.__dbg; D.me.wrap(); await new Promise((r) => setTimeout(r, 6000)); clearInterval(window.__adv); return { active: D.me.active, ev: D.Ge.ev, evN: D.Ge.evN, sos: D.Ge.sos }; });

  for (const phase of [1, 2]) {
    const tag = phase === 1 ? 'Event 1 (no emergency drop)' : 'Event 2 (normal budget)';
    // Event 1 starts from the top level, as on a headset in town (headless town frames are slow and the governor is
    // usually at its lowest level by now): the level drop at the Event start then picks the Event's scale itself
    if (phase === 1) {
      const top = await page.evaluate(async () => {
        const Ge = window.__dbg.Ge, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        // let the governor itself step up to level 0 (a real layer at scale 1.2): frames count as well under budget
        Ge.budget = 50; Ge.ema = 5; Ge.level = 1; Ge.under = 1e9; Ge.lockout = 0; Ge.next = 0; Ge.probe = false;
        const t0 = performance.now(); while (Ge.level !== 0 && performance.now() - t0 < 5000) await wait(50);
        await wait(600); return Ge.level;
      });
      expect(`${tag}: the governor stepped up to level 0 (scale 1.2) before the Event, as in town on a headset`, top === 0 && (global.__pageLog || []).some((m) => /swapped to scale 1\.2/.test(m)), 'level ' + top);
    }
    const levelBefore = await page.evaluate(() => window.__dbg.Ge.level);
    const n0 = (global.__pageLog || []).length;   // after any step-up above
    const after = (re) => (global.__pageLog || []).slice(n0).filter((m) => re.test(m));
    const st = await startEvent();
    expect(`${tag}: the planting Event started at the governor's lowest level`, st.active === true && st.level === 4, JSON.stringify(st) + ', level before ' + levelBefore);
    if (phase === 1) await page.evaluate(() => { window.__dbg.Ge.budget = 1000 / 30; });   // the emergency drop needs 1.6x this: out of reach
    await page.waitForTimeout(1500);
    if (q3) {
      const q = after(/event scale 0\.9 \(Quest 3, from the start\)/), sw = after(/projection layer swapped to scale/);
      expect(`${tag}, Quest 3: the Event starts at the 0.9 scale at once` + (levelBefore === 4 ? ' (already at the lowest level)' : ''), q.length === 1, q.join(' | ') || after(/event scale|swapped/).join(' | '));
      expect(`${tag}, Quest 3: one layer swap at the Event start, straight to 0.9 (no undrawn intermediate layer)`, sw.length === 1 && /scale 0\.9$/.test(sw[0]), sw.join(' | '));
    } else {
      expect(`${tag}: not a Quest 3, so no Event scale before the frame rate asks for it`, after(/event scale/).length === 0, after(/event scale/).join(' | '));
      if (levelBefore !== 4) expect(`${tag}: the level drop at the Event start swaps in one layer at the level's scale (1)`, after(/projection layer swapped to scale/).length === 1 && /scale 1$/.test(after(/projection layer swapped to scale/)[0]), after(/swapped/).join(' | '));
    }
    await slow(true);
    const t0 = Date.now(); while (!after(/swapped to scale 0\.82/).length && Date.now() - t0 < 150000) await page.waitForTimeout(500);   // two 216-frame windows; slow when the machine is busy
    await page.waitForTimeout(2000);
    const s1 = after(/event scale 0\.9/), s2 = after(/event scale 0\.82 \(under 60 fps/), em = after(/projection layer swapped to scale 0\.82/);
    expect(`${tag}: the 0.9 scale engages once (under 62 fps, or at once on a Quest 3)`, s1.length === 1, s1.join(' | ') || 'no 0.9 line');
    expect(`${tag}: the 0.9 layer is swapped in once (behind the old one first, no undrawn frame)`, after(/projection layer swapped to scale 0\.9/).length === 1, after(/swapped/).join(' | '));
    expect(`${tag}: still under 60 fps at 0.9, the scale steps to 0.82`, em.length === 1, after(/event scale|swapped/).join(' | '));
    if (phase === 1) expect(`${tag}: the step to 0.82 is P17's (under 60 fps), not the emergency drop`, s2.length === 1, after(/event scale|swapped/).join(' | '));
    const live = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 3000)); return { frames: window.__fakeXR.frames - f0, mv: !!window.__gtXR.mvActive, err: window.__dbg.O.getContext().getError() }; });
    expect(`${tag}: frames keep coming at the lower scale, multiview as planned, no GL error`, live.frames > 10 && live.mv === !!process.env.GT_MULTIVIEW && live.err === 0, JSON.stringify(live));
    await slow(false);
    if (phase === 1) await page.evaluate(() => { window.__dbg.Ge.budget = 1000 / 72; });
    const en = await endEvent();
    note(`${tag}, layer log: ` + after(/projection layer|event scale|quality L/).slice(-6).join(' | '));
    const off = after(/event scale off/), all = (global.__pageLog || []).slice(n0), offAt = all.findIndex((m) => /event scale off/.test(m));
    const back = offAt < 0 ? [] : all.slice(offAt).filter((m) => /projection layer swapped to scale 1\b/.test(m));   // swaps after the Event ended
    expect(`${tag}: the Event ended and the Event scale state is cleared`, en.active === false && en.ev === 0 && en.evN === 0, JSON.stringify(en));
    if (en.sos) expect(`${tag}: at the end the emergency scale stays (the game's rule) and nothing swaps back`, off.length === 1 && /emergency scale 0\.82 stays/.test(off[0]) && back.length === 0, off.concat(back).join(' | '));
    else expect(`${tag}: at the end the scale returns to the level's own (1)`, off.length === 1 && /back to 1/.test(off[0]) && back.length === 1, off.concat(back).join(' | ') || 'no restore line');
    note(`${tag}: emergency drop ${en.sos ? 'fired' : 'did not fire'}`);
  }
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `GOVERNOR TEST FAILED (${failures.length})` : 'GOVERNOR TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
