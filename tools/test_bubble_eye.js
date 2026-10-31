// Speech bubbles never fill the view (standard tier; S9; the author: "I notice it with text vignettes while moving
// around, is there something there that's being rebuilt every time?"). In a text scene each line's bubble is a
// camera-facing panel 4.4 m wide and up to 2.7 m tall, mostly cream white, 1.1 m above the speaker's head (its lower half
// at the player's eye height), fading in over 0.25 s: from 2 m away it spanned about 95 degrees of the view, so a line
// starting near the player, or walking past a speaker, whited out the view. In VR (fake XR) Mama Gorbo and Gooward's text
// scene is played while the player walks from 7 m away up to the speaker and past her (as close as her body lets them,
// about 3 m from her bubble); on every
// frame drawn each bubble shown is measured:
//   - bubbles are shown (the scene played its lines);
//   - none spans more than 55 degrees of the view;
//   - none is drawn within 1.2 m of the eyes (where a bubble now fades out);
//   - no GPU work happens inside a headset frame (the frame-hazard watch); no page errors or logged errors.
// Run on a build before S9 (`node tools/test_bubble_eye.js old.html`) it shows how wide the bubbles got (70.6 degrees
// on 4.0.3 here; nearer, as from a raised spot, wider still: the cap now holds at any distance).
//
//   node tools/test_bubble_eye.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(2000);
    if (!D.we.presenting || !D.we.headPos) return { noVR: true };
    const ma = D.It.byId.p_mamagorbo, gw = D.It.byId.gorbo; if (!ma || !gw) return { noPair: true };
    const H = window.__gtFrameHaz, h0 = H ? H.n : 0;
    // the bubbles: sprites drawn at render order 20 with a canvas map
    const bubbles = () => D.C.children.filter((o) => o.isSprite && o.visible && o.renderOrder === 20 && o.material && o.material.opacity > 0.01);
    let shown = 0, maxDeg = 0, nearN = 0, minD = 1e9, frames = 0; const P = new T.Vector3();
    const R0 = D.O.render; D.O.render = function () { try { frames++; const h = D.we.headPos; for (const b of bubbles()) { shown++; const d = b.position.distanceTo(h); minD = Math.min(minD, d); if (d < 1.2) nearN++; const deg = 2 * Math.atan(Math.max(b.scale.x, b.scale.y) / 2 / Math.max(d, 0.01)) * 180 / Math.PI; maxDeg = Math.max(maxDeg, deg); } } catch (e) {} return R0.apply(this, arguments); };
    const ok = D.VIGS.play(ma, gw, true); if (!ok) { D.O.render = R0; return { noPlay: true }; }
    // walk from 7 m out on the far side of Mama Gorbo straight through her and her bubble, eyes at the bubble's height
    const a = ma.group.position, b = gw.group.position, dx = a.x - b.x, dz = a.z - b.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    const t0 = performance.now();
    while (performance.now() - t0 < 9000) {
      const k = (performance.now() - t0) / 9000, s = 7 - 9 * k;   // from 7 m out on her side to 2 m past her
      D.At.position.set(a.x + ux * s, D.At.position.y, a.z + uz * s);
      await wait(30);
    }
    await wait(1500); D.O.render = R0;
    return { shown, maxDeg: +maxDeg.toFixed(1), nearN, minD: +minD.toFixed(2), frames, haz: H ? H.n - h0 : null };
  });
  if (r.noVR) { expect('in VR with a head position', false); process.exit(1); }
  if (r.noPair || r.noPlay) { expect('Mama Gorbo and Gooward\'s text scene plays', false, JSON.stringify(r)); process.exit(1); }
  note(JSON.stringify(r));
  expect('the scene\'s bubbles are shown', r.shown > 0, String(r.shown));
  expect('no bubble spans more than 55 degrees of the view', r.maxDeg <= 55, `${r.maxDeg} degrees at most`);
  expect('no bubble is drawn within 1.2 m of the eyes', r.nearN === 0, `${r.nearN} bubble-frames; closest ${r.minD} m`);
  expect('no GPU work inside a headset frame (frame-hazard watch)', r.haz === 0 || r.haz === null, String(r.haz));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `BUBBLE EYE TEST FAILED (${failures.length})` : 'BUBBLE EYE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
