// The Horn song carries on after a pause without playing over itself (standard tier; B124, 4.0.61; the author: "Music
// seems to overlap, after a pause (observed with the Horn song)"). The song schedules a bar (2.7 s) at a time ahead
// in the sound's clock; from 4.0.58 (B118) a pause holds the sound and the song instead of stopping it, but each held
// frame reset the next bar's time, so on resume the next bar started at once over the notes already scheduled. In an
// Event with the Horn song playing, the player pauses (all input gone) for 2 s and comes back (input and a moving head):
//   - the sound was held during the pause, and the song is playing after it;
//   - every bar starts at least a bar after the one before (none starts over another), before and after the pause;
//   - no note is scheduled twice;
//   - no page errors.
//
//   node tools/test_horn_pause.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  await g.page.waitForTimeout(2500);
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, X = window.__fakeXR, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const ctl = (hand) => ({ handedness: hand, axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] });
    X.setInputs([ctl('left'), ctl('right')]);
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true;
    D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    const f = D.It.all.find((e) => e.hornK !== undefined); if (!f) return { error: 'no horn player' };
    t0 = performance.now(); while (!f.hornPlaying && performance.now() - t0 < 120000) await wait(200);
    if (!f.hornPlaying) return { error: 'the horn never played' };
    if (!window.__gcMQrec) return { error: 'no note recorder (debug build needed)' };
    const rec = []; window.__gcMQrec(rec); await wait(4000);
    const nBefore = rec.length;
    // pause: all input gone for 2 s (the sound is held), then input back with the head moving (worn)
    X.setInputs([]); await wait(2000); const held = !!window.__gcAudHold;
    X.setInputs([ctl('left'), ctl('right')]);
    let k = 0; const jig = setInterval(() => { X.pose.yaw = 0.01 * Math.sin(k++ / 3); }, 16);
    await wait(1500); clearInterval(jig);
    await wait(5000);
    window.__gcMQrec(null);
    const bars = [...new Set(rec.map((e) => +e[2].toFixed(4)))].sort((a, b) => a - b);
    const gaps = bars.slice(1).map((b, i) => +(b - bars[i]).toFixed(3));
    const keys = rec.map((e) => e[0] + '|' + JSON.stringify(e[1]));
    const dup = keys.length - new Set(keys).size;
    return { notes: rec.length, nBefore, held, playing: !!f.hornPlaying, resumed: !window.__gtNoIn, bars: bars.length, gaps, dup };
  });
  note(JSON.stringify(r));
  const BAR = 4 * 60 / 88;
  expect('the sound was held during the pause and the song plays after it', !r.error && r.held && r.resumed && r.playing && r.notes > r.nBefore, r.error || JSON.stringify(r));
  expect('B124: every bar starts at least a bar after the one before (none plays over another)', !r.error && r.bars >= 3 && r.gaps.every((d) => d > BAR * 0.98), JSON.stringify(r.gaps));
  expect('B124: no note is scheduled twice', !r.error && r.dup === 0, String(r.dup));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `HORN PAUSE TEST FAILED (${failures.length})` : 'HORN PAUSE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
