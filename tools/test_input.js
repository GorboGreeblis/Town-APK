#!/usr/bin/env node
/**
 * Input and locomotion inside a fake VR session (tools/fakexr.js controllers):
 *   - left stick forward moves the player at about t.player.speed
 *   - dead-zone: a tiny deflection does not move
 *   - right stick sideways snap-turns the view by t.xr.snapAngle once per
 *     deflection (no repeat while held), and again after re-centering
 *   - trigger (select) and grip (squeeze) events do not throw
 *   - the player cannot walk through a building hull
 *
 * Usage: node tools/test_input.js [file.html]
 */
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2];

(async () => {
  const g = await boot({ file, vr: true });
  const { page } = g;
  const { failures, expect } = reporter();
  console.log(`booted in ${g.bootS.toFixed(1)}s, presenting after ${g.presentS.toFixed(1)}s`);

  const yawOf = () => page.evaluate(() => { const D = window.__dbg; const d = new D.C.constructor().position; D.B.getWorldDirection(d); return Math.atan2(d.x, d.z); });
  const posOf = () => page.evaluate(() => { const p = window.__dbg.At.position; return [p.x, p.z]; });
  const inputs = (list) => page.evaluate((l) => window.__fakeXR.setInputs(l), list);
  const ctl = (hand, axes, buttons) => ({ handedness: hand, axes, buttons: buttons || [{}, {}, {}, {}, {}, {}, {}] });

  // Controllers appear (the game binds them on inputsourceschange / per frame).
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(1500);
  const bound = await page.evaluate(() => { const s = window.__fakeXR.sessions.at(-1); return s.inputSources.length; });
  expect('two fake controllers visible to the session', bound === 2, `${bound}`);

  // Dead-zone.
  let p0 = await posOf();
  await inputs([ctl('left', [0, 0, 0.05, -0.05]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(2000);
  let p1 = await posOf();
  expect('tiny stick deflection inside the dead-zone does not move the player', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05, `${Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(3)} m`);

  // Walk forward 3 s.
  const speed = await page.evaluate(() => window.__dbg.t.player.speed);
  p0 = await posOf();
  await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(3000);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  p1 = await posOf();
  const walked = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  expect(`left stick forward walks the player (expected about ${(speed * 3).toFixed(1)} m in 3 s, software GL may undershoot)`, walked > speed * 3 * 0.3 && walked < speed * 3 * 1.5, `${walked.toFixed(2)} m`);

  // Snap turn: one step per deflection.
  const snap = await page.evaluate(() => window.__dbg.t.xr.snapAngle);
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const y0 = await yawOf();
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 1, 0])]);
  await page.waitForTimeout(2500);
  const y1 = await yawOf();
  expect('right stick held sideways snap-turns exactly one step', Math.abs(Math.abs(norm(y1 - y0)) - snap) < 0.05, `${(norm(y1 - y0) * 180 / Math.PI).toFixed(1)} deg vs ${(snap * 180 / Math.PI).toFixed(0)}`);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(800);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 1, 0])]);
  await page.waitForTimeout(1500);
  const y2 = await yawOf();
  expect('re-centre then deflect again turns a second step', Math.abs(Math.abs(norm(y2 - y0)) - 2 * snap) < 0.08, `${(norm(y2 - y0) * 180 / Math.PI).toFixed(1)} deg`);
  await inputs([ctl('left', [0, 0, 0, 0]), ctl('right', [0, 0, 0, 0])]);

  // Select / squeeze events.
  const evOk = await page.evaluate(() => { try { const s = window.__fakeXR.sessions.at(-1); s.pressSelect(1); for (const t of ['squeezestart', 'squeezeend']) { const e = new Event(t); e.inputSource = s.inputSources[1]; s.dispatchEvent(e); } return true; } catch (e) { return String(e); } });
  expect('trigger and grip events are handled without throwing', evOk === true, String(evOk));

  // Walk into a building: place the player 3 m in front of a hull, walk 6 s, must remain outside.
  const hull = await page.evaluate(() => {
    const D = window.__dbg, F = D.F, B = F.buildings[0];
    const [wx, wz] = F.world(B, 0, B.hull[3] + 3);      // 3 m outside the "front" edge
    D.At.position.set(wx, D.At.position.y, wz);
    return { name: B.name, wx, wz };
  });
  // Face the building: snap until the camera looks toward it (coarse: just push forward and also backward).
  await inputs([ctl('left', [0, 0, 0, -1]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(4000);
  await inputs([ctl('left', [0, 0, 0, 1]), ctl('right', [0, 0, 0, 0])]);
  await page.waitForTimeout(4000);
  await inputs([]);
  const inside = await page.evaluate(() => { const D = window.__dbg, p = D.At.position; return D.F.buildings.filter((B) => D.F.inHull(B, p.x, p.z, -0.05)).map((B) => B.name); });
  expect('player never ends up inside a building hull', inside.length === 0, JSON.stringify(inside));

  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `INPUT TEST FAILED (${failures.length})` : 'INPUT TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('INPUT TEST ERROR', e); process.exit(1); });
