// An Event started without Seeds fades no kiosk (standard tier; F-B72; the author: "If the user starts the Event without
// having completed 'Seeds', kiosks should NOT fade out. This causes multiple issues for NPCs who stay in their kiosk
// areas. This goes for all kiosks: Portal, Phone Booth, etc."). The Event is started with the Stone but not Seeds; once
// the mist is past half for 20 s, every kiosk item (the six stands, the gazebo, the phone booth, the portal) is still in
// full and shown, and so is the park's tree with the robin (the author: "Only the tree in the park should NOT fade out
// during the 'no Seeds' Event"), while the town's trees outside the fence have faded as usual. No page errors.
//
//   node tools/test_noseeds.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });   // the game's own caught errors too
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const S = window.__gcSt; if (!S) return { none: true };
    const Kt = D.Kt; Kt.rewards.stone = true; Kt.rewards.seeds = false; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    const started = D.me.active;
    t0 = performance.now(); while (D.me.active && J.mist.p() < 0.5 && performance.now() - t0 < 240000) await wait(200);
    const minF = {}; t0 = performance.now();
    while (D.me.active && performance.now() - t0 < 20000) { await wait(100); for (const s of S.list) minF[s.name] = Math.min(minF[s.name] === undefined ? 1 : minF[s.name], s.f); }
    const shown = Object.fromEntries(S.list.map((s) => [s.name, s.gs.every((o) => o.visible)]));
    return { started, mist: +J.mist.p().toFixed(2), minF, shown };
  });
  if (r.none) { expect('the stand fader exists', false); process.exit(1); }
  note(JSON.stringify(r));
  const kiosks = Object.keys(r.minF).filter((n) => n !== 'the town\'s trees');
  expect('the Event started without Seeds and its mist rose past half', r.started && r.mist >= 0.5, `mist ${r.mist}`);
  expect('every kiosk (the six stands, the gazebo, the phone booth, the portal) and the park\'s tree are checked', ['post', 'sheriff', 'garden', 'gallery', 'shop', 'juice', 'gazebo', 'phone booth', 'portal', 'the park\'s trees and birds'].every((n) => kiosks.includes(n)), kiosks.join(', '));
  expect('no kiosk, nor the park\'s tree with the robin, fades in an Event without Seeds', kiosks.every((n) => r.minF[n] === 1 && r.shown[n]), JSON.stringify(r.minF));
  expect('the town\'s trees still fade', r.minF['the town\'s trees'] < 1, String(r.minF['the town\'s trees']));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `NO-SEEDS TEST FAILED (${failures.length})` : 'NO-SEEDS TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
