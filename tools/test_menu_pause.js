// The game pauses every time the system (Universal) menu opens (standard tier; B115, 4.0.56; the author: "The first
// time that the Universal Menu is opened, the game does not pause ... It needs to pause every time"; VRC
// Functional.2). The author's 4.0.55 log: the menu opened twice; the session's visibility changed only the second
// time. The game now also pauses while the browser's window has lost focus. In VR:
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
    const out = { before: await run() };
    window.dispatchEvent(new Event('blur')); await wait(100); out.blurred = await run();
    window.dispatchEvent(new Event('focus')); await wait(100); const a = t(); await wait(100); out.jump = +(t() - a).toFixed(2); out.focused = await run();
    window.dispatchEvent(new Event('blur')); await wait(100); window.__fakeXR.sessions.at(-1).pressSelect(1); await wait(100); out.afterSelect = await run();
    return out;
  });
  note(JSON.stringify(r));
  expect('the game runs before (its clock advances about 1 s a second)', r.before > 0.8, String(r.before));
  expect('B115: a window blur (the system menu) pauses the game: its clock stands still', r.blurred < 0.05, String(r.blurred));
  expect('B115: the focus coming back resumes it, without a jump', r.focused > 0.8 && r.jump < 0.3, JSON.stringify(r));
  expect('B115: a trigger press while paused resumes it (input focus means no menu)', r.afterSelect > 0.8, String(r.afterSelect));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `MENU PAUSE TEST FAILED (${failures.length})` : 'MENU PAUSE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
