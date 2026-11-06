// The game pauses every time the system (Universal) menu opens (standard tier; B115, 4.0.56; the author: "The first
// time that the Universal Menu is opened, the game does not pause ... It needs to pause every time"; VRC
// Functional.2). The author's 4.0.55 and 4.0.56 logs: the first opening (after the headset was off a while) changed
// neither the session's visibility nor the window's focus; every opening took all input sources away. The game now
// pauses while all input is gone (and while the window has lost focus). In VR:
//   - all input sources going (the system menu, the headset off) stops the game's clock and holds the sound; a
//     controller back for a moment does not resume it; input back for 0.6 s does, and the sound with it (B118);
//   - a window blur stops the game's clock (no update while it lasts);
//   - the focus coming back starts it again, without a jump;
//   - a trigger press while paused also resumes (the app has input focus, so no menu is open);
//   - the session's own visibility change still pauses (as before);
//   - no page errors.
//
//   node tools/test_menu_pause.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  await g.page.waitForTimeout(3000);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((res) => setTimeout(res, ms)), t = () => D.Re.t;
    const run = async () => { const a = t(); await wait(1000); return +(t() - a).toFixed(2); };
    const ctl = (hand) => ({ handedness: hand, axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] });
    window.__fakeXR.setInputs([ctl('left'), ctl('right')]); await wait(300);
    const out = { before: await run() };
    window.__fakeXR.setInputs([]); await wait(100); out.noInput = await run(); out.soundHeld = !!window.__gcAudHold;
    window.__fakeXR.setInputs([ctl('right')]); await wait(150); window.__fakeXR.setInputs([]); await wait(150); out.flap = await run();   // a controller waking for a moment (the headset off): no resume
    window.__fakeXR.setInputs([ctl('left'), ctl('right')]); await wait(800); out.inputBack = await run(); out.soundBack = !window.__gcAudHold;
    window.dispatchEvent(new Event('blur')); await wait(100); out.blurred = await run();
    window.dispatchEvent(new Event('focus')); await wait(100); const a = t(); await wait(100); out.jump = +(t() - a).toFixed(2); out.focused = await run();
    window.dispatchEvent(new Event('blur')); await wait(100); window.__fakeXR.sessions.at(-1).pressSelect(1); await wait(100); out.afterSelect = await run();
    return out;
  });
  note(JSON.stringify(r));
  expect('the game runs before (its clock advances about 1 s a second)', r.before > 0.8, String(r.before));
  expect('B115: all input gone (the system menu, the headset off) pauses the game; a controller back for a moment does not resume it; input back for 0.6 s does', r.noInput < 0.05 && r.flap < 0.05 && r.inputBack > 0.8, JSON.stringify(r));
  expect('B118: the sound is paused with the game (the system menu, the headset off) and resumes with it', r.soundHeld && r.soundBack, JSON.stringify(r));
  expect('B115: a window blur (the system menu) pauses the game: its clock stands still', r.blurred < 0.05, String(r.blurred));
  expect('B115: the focus coming back resumes it, without a jump', r.focused > 0.8 && r.jump < 0.3, JSON.stringify(r));
  expect('B115: a trigger press while paused resumes it (input focus means no menu)', r.afterSelect > 0.8, String(r.afterSelect));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `MENU PAUSE TEST FAILED (${failures.length})` : 'MENU PAUSE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
