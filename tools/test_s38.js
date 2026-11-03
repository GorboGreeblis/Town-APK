#!/usr/bin/env node
// S38, the stability safeties of 4.0.32 (the author: "Please analyze the game file for any other easy and safe
// stability safeties"). In VR (fake XR, rendering on), each fault injected and its guard checked:
//   1. the stick value is cleared at the start of the player's update, so an update that fails before its input
//      step every frame (here: the reference space throwing during the height calibration) does not keep walking
//      the player on the last stick value;
//   2. a throw in the head-inside-object hide before the draw is caught and logged as "eye-hide": the frame is still
//      drawn and the safe mode does not step down (gcSafe.lv stays);
//   3. the scene hold (Bulb.hold) left on for 60 game seconds with no dialogue open is cleared and logged, so the
//      game cannot be soft-locked with every interaction refused; with a dialogue open it stays;
//   4. a non-number movement step (a bad head direction) is skipped: the player stays where they were, not sent to
//      the spawn point;
//   5. the Event's end no longer waits forever on its ending show (present in the game file; its 60 s past the
//      Event's time is not waited out headless);
//   6. VR exit whose clean-up throws part way still ends "presenting", so VR can be entered again.
//   No page errors but the injected ones.
//
//   node tools/test_s38.js [file]
const path = require('path');
const fs = require('fs');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = {}, logs = [];
    const L0 = window.__gtLog; window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    await wait(500);
    // 1. the stick cleared at the start of the update
    { const gr = O.xr.getReferenceSpace, p0 = D.At.position.clone();
      D.we.calibrateHeight = true; O.xr.getReferenceSpace = () => { throw new Error('injected s38 reference space fault'); };
      D.we.move.x = 1; await wait(1500);
      out.stick = { moved: +D.At.position.distanceTo(p0).toFixed(2), move: D.we.move.x };
      O.xr.getReferenceSpace = gr; D.we.calibrateHeight = false; await wait(300); }
    // 2. the eye hide's throw caught before the draw
    { const lv0 = window.gcSafe.lv, eh = window.__gcEyeL, X = window.__gtXR, r0 = X.renders, f0 = (X.fc && X.fc.fallback) || 0;
      window.__gcEyeL = () => { throw new Error('injected s38 eye-hide fault'); };
      { const t0 = performance.now(); while (X.renders - r0 < 30 && performance.now() - t0 < 20000) await wait(50); }   // counted, not timed (B53)
      out.eye = { lv: [lv0, window.gcSafe.lv], frames: X.renders - r0, fallback: ((X.fc && X.fc.fallback) || 0) - f0 };
      window.__gcEyeL = eh; await wait(300); }
    // 3. the scene hold cleared after 60 game seconds with no dialogue open (the start time set back, not waited)
    { D.Bulb.hold = true; await wait(1300); const started = D.Bulb.gcH !== undefined; D.Bulb.gcH = D.Re.t - 61; await wait(1300);
      out.hold = { started, cleared: D.Bulb.hold === false, logged: logs.some((l) => /^recovery: the scene hold stayed on 60 s/.test(l)) };
      D.Bulb.hold = false; }
    // 4. a non-number movement step skipped
    { const p0 = D.At.position.clone(), desc = Object.getOwnPropertyDescriptor(D.we, 'headYaw');
      Object.defineProperty(D.we, 'headYaw', { configurable: true, get: () => NaN, set: () => {} });
      D.we.move.x = 1; await wait(1200);
      const p1 = D.At.position.clone();
      if (desc) Object.defineProperty(D.we, 'headYaw', desc); else { delete D.we.headYaw; D.we.headYaw = 0; }
      D.we.move.x = 0; await wait(300);
      out.nan = { finite: Number.isFinite(p1.x) && Number.isFinite(p1.z), moved: +p1.distanceTo(p0).toFixed(2) }; }
    // 6. VR exit whose clean-up throws still ends presenting (last: it ends the session)
    { const hud = D.UI.hud; D.UI.hud = {}; let threw = null;
      try { D.we.exit(); } catch (e) { threw = String(e).slice(0, 80); }
      await wait(1200); out.exit = { presenting: D.we.presenting, threw }; D.UI.hud = hud; }
    return out;
  });
  const src = fs.readFileSync(file || path.join(__dirname, 'android/app/src/main/assets/index.html'), 'utf8');
  expect('1. an update failing before its input step does not keep walking the player on the last stick value', r.stick.moved < 0.05, JSON.stringify(r.stick));
  expect('2. a throw in the eye hide is caught before the draw: frames still drawn, no fallback, the safe mode unchanged', r.eye.lv[0] === r.eye.lv[1] && r.eye.frames >= 30 && r.eye.fallback === 0, JSON.stringify(r.eye));
  expect('3. the scene hold left on 60 game seconds with no dialogue open is cleared and logged', r.hold.started && r.hold.cleared && r.hold.logged, JSON.stringify(r.hold));
  expect('4. a non-number movement step is skipped: the player stays put, not sent to the spawn point', r.nan.finite && r.nan.moved < 0.05, JSON.stringify(r.nan));
  expect('5. the Event\'s end waits at most 60 s past its time for the ending show (in the game file)', src.includes('recovery: the Event\'s ending show stayed busy 60 s past its time: ended'), '');
  expect('6. VR exit whose clean-up throws part way still ends presenting', r.exit.presenting === false, JSON.stringify(r.exit));
  const other = g.errors.filter((e) => !/injected s38|Cannot read properties of undefined|setting 'visible'|mesh/.test(e));
  expect('no page errors but the injected ones', other.length === 0, other.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `S38 TEST FAILED (${failures.length})` : 'S38 TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('S38 TEST ERROR', e); process.exit(1); });
