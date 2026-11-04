// Coming back from the system menu never stalls the game (standard tier; 4.0.45, B99, S41; the author's flash on
// 4.0.43: "That flash occurred at the same time audio resumed after coming back from the Universal Menu"). On every
// return to "visible" the game ran its check for painted canvases blanked while it was away, in the visibility event
// and again on the next animation frame: up to 3 pixel readbacks from the GPU for each of 184 painted textures (2.0 s
// headless; about 0.4 s on the Quest 3: no new frame for 0.4 s after each return, the headset showing a stale picture
// from before the menu, while the sound came back from the same handler). The Universal Menu leaves the page running
// ("visible-blurred"), so nothing can be cleared meanwhile: that return now skips the check. A return from "hidden"
// (or with the page hidden meanwhile) still runs it in full, as before. Checked here:
//   - menu open and closed (visible-blurred, then visible): the return takes under 30 ms, logs "back from the system
//     menu: no texture check", reads nothing back and repaints nothing; frames keep coming while the menu is open;
//   - hidden, then visible, with a painted canvas blanked meanwhile: the check runs and the canvas is repainted;
//   - no page errors.
//
//   node tools/test_menu_return.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    await wait(2500);
    const S = window.__fakeXR.sessions[window.__fakeXR.sessions.length - 1]; if (!S) return { error: 'no session' };
    const logs = [], L0 = window.__gtLog; window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    const tex = (window.__gbTexReg || []).find((t) => t && !t.__gbRetired && t.gbPaint && t.image && t.image.getContext && t.image.width >= 64 && t.image.width <= 1024);
    if (!tex) return { error: 'no painted canvas texture' };
    const px = () => { const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); let v = 0; for (const [a, b] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75]]) { x.clearRect(0, 0, 1, 1); x.drawImage(tex.image, Math.floor(a * tex.image.width), Math.floor(b * tex.image.height), 1, 1, 0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; v |= d[0] | d[1] | d[2] | d[3]; } return v; };
    // readbacks made by the game: getImageData calls on any canvas (the check's probe)
    let reads = 0; const gid = CanvasRenderingContext2D.prototype.getImageData;
    const count = (on) => { CanvasRenderingContext2D.prototype.getImageData = on ? function () { reads++; return gid.apply(this, arguments); } : gid; };
    const out = {};
    // 1. the Universal Menu: visible-blurred, then visible
    let f0 = window.__fakeXR.frames; S.setVisibility('visible-blurred'); await wait(700);
    out.menuFrames = window.__fakeXR.frames - f0;
    count(true); reads = 0; let t0 = performance.now(); S.setVisibility('visible'); out.menuMs = +(performance.now() - t0).toFixed(1);
    await wait(300); out.menuReads = reads; count(false);
    out.menuLine = logs.find((l) => /^back from the system menu: no texture check/.test(l)) || null;
    f0 = window.__fakeXR.frames; await wait(600); out.afterFrames = window.__fakeXR.frames - f0;
    // 2. hidden, with a painted canvas blanked meanwhile, then visible
    out.before = px(); S.setVisibility('hidden'); await wait(500);
    tex.image.getContext('2d').clearRect(0, 0, tex.image.width, tex.image.height); out.blanked = px();
    count(true); reads = 0; S.setVisibility('visible'); await wait(600); out.hiddenReads = reads; count(false);
    out.after = px(); out.state = S.visibilityState;
    return out;
  });
  note(JSON.stringify(r).slice(0, 600));
  expect('back from the menu: the return takes under 30 ms and skips the texture check (logged, nothing read back)', !r.error && r.menuMs < 30 && !!r.menuLine && r.menuReads === 0, JSON.stringify({ ms: r.menuMs, line: r.menuLine, reads: r.menuReads, error: r.error }));
  expect('frames keep coming while the menu is open and after it closes', !r.error && r.menuFrames >= 5 && r.afterFrames >= 5, JSON.stringify({ menu: r.menuFrames, after: r.afterFrames }));
  expect('back from hidden: the check still runs and a canvas blanked meanwhile is repainted', !r.error && r.before !== 0 && r.blanked === 0 && r.after !== 0 && r.hiddenReads > 0 && r.state === 'visible', JSON.stringify({ before: r.before, blanked: r.blanked, after: r.after, reads: r.hiddenReads }));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `MENU RETURN TEST FAILED (${failures.length})` : 'MENU RETURN TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
