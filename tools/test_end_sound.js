// No sound after the VR session ends (standard tier; 4.0.62; the author, testing 4.0.61: "Horn song and headset off
// behavior still need more investigation"). The 4.0.61 log: the headset taken off paused the game and held the sound;
// about 30 s later the system ended the VR session, and the sound hold, which only held while a session was
// presenting, let go: the sound came back with the headset off until the app was opened again. The sound is now
// held after a session ends, until a new one presents. In VR:
//   - with a session presenting and input in, the sound plays (its context running, not held);
//   - the session ending holds it (the context suspended), and it stays held;
//   - a new session presenting plays it again;
//   - no page errors.
//
//   node tools/test_end_sound.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const probe = () => {
  const Ctx = window.AudioContext; if (!Ctx) return;
  window.AudioContext = class extends Ctx { constructor(...a) { super(...a); window.__endCtx = this; } };
};

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, initScripts: [probe] });
  await g.page.waitForTimeout(3000);
  const r = await g.page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms)), X = window.__fakeXR;
    const ctl = (hand) => ({ handedness: hand, axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] });
    const st = () => ({ held: !!window.__gcAudHold, ctx: window.__endCtx ? window.__endCtx.state : 'none' });
    X.setInputs([ctl('left'), ctl('right')]); await wait(800);
    const out = { playing: st() };
    await X.sessions.at(-1).end(); await wait(600); out.ended = st();
    await wait(3000); out.later = st();
    let again = null;
    try {   // the gate's "Press A to Continue." (any press re-enters through the same function)
      const n0 = X.sessions.length;
      if (window.__gtXR && window.__gtXR.enter) {
        window.__gtXR.enter(); const t0 = performance.now();
        while (X.sessions.length === n0 && performance.now() - t0 < 5000) await wait(100);
        await wait(2000); X.setInputs([ctl('left'), ctl('right')]); await wait(1500);
        again = Object.assign(st(), { newSession: X.sessions.length > n0 });
      }
    } catch (e) { again = { error: String(e) }; }
    out.again = again;
    return out;
  });
  note(JSON.stringify(r));
  expect('with a session presenting and input in, the sound plays', !r.playing.held && r.playing.ctx === 'running', JSON.stringify(r.playing));
  expect('the session ending holds the sound (context suspended)', r.ended.held && r.ended.ctx === 'suspended', JSON.stringify(r.ended));
  expect('it stays held after the session ended', r.later.held && r.later.ctx === 'suspended', JSON.stringify(r.later));
  expect('pressing to continue (a new session presenting) plays it again', !!r.again && r.again.newSession && !r.again.held && r.again.ctx === 'running', JSON.stringify(r.again));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `END SOUND TEST FAILED (${failures.length})` : 'END SOUND TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
