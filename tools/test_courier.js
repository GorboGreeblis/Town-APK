#!/usr/bin/env node
// B11: Nextessa (the pizza courier) must reach a player standing on the far side
// of the Ancient inside the church, deliver, and walk back out, without pinning
// against the Ancient. Also covers B10: the courier spawns 30 s after the phone
// call (the portal sets pizza.callDelayMs to 30 s).
//
//   node tools/test_courier.js [file] [side]   side: left (default) | right
const path = require('path');
const { boot, reporter, root } = require('./lib/harness.js');
const file = process.argv[2] && !/^(left|right)$/.test(process.argv[2]) ? path.resolve(process.argv[2]) : undefined;
const side = (process.argv.slice(2).find((a) => /^(left|right)$/.test(a))) || 'left';

(async () => {
  const { page, browser, errors, bootS } = await boot({ file });
  const { expect, done } = reporter('COURIER TEST');
  console.log(`booted in ${bootS}s; side=${side}`);
  await page.evaluate(() => { window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });

  const r = await page.evaluate(async (side) => {
    const D = window.__dbg, Kt = D.Kt, F = D.F, out = {};
    const cb = F.buildings.find((B) => B.name === 'church'); if (!cb) return { error: 'no church' };
    const sv = D.JGP.slug.visit(0.92);
    const slug = D.JGP.slug.ent.home; const [sx, sz] = F.local(cb, slug.x, slug.z);
    // Player beside the Ancient, on the side opposite the visitor waypoints (which are at +x).
    const px = side === 'left' ? -(0.95 + 1.3) : (0.95 + 1.3);
    const [wx, wz] = F.world(cb, px, sz); D.At.position.set(wx, D.At.position.y, wz);
    out.playerLocal = [px, +sz.toFixed(2)]; out.playerInChurch = F.inHull(cb, wx, wz);
    // Order the pizza; the courier appears 30 s after the call ends.
    D.ue.call(); await new Promise((r) => setTimeout(r, 300));
    const tCall = performance.now();
    while (!D.ue.courier && performance.now() - tCall < 45000) await new Promise((r) => setTimeout(r, 250));
    out.spawnedAfterS = +((performance.now() - tCall) / 1000).toFixed(1); out.spawned = !!D.ue.courier;
    if (!D.ue.courier) return out;
    const n = D.ue.courier, p = n.group.position;
    // Shortcut the 75 m walk: start her at the church's outside waypoint.
    p.set(sv.out[0], 0, sv.out[1]);
    const trace = []; let last = [p.x, p.z], lastMoveT = performance.now(), maxStillS = 0, stillState = null;
    const t0 = performance.now(); let delivered = false, deliveredAt = 0, left = false, leftAt = 0, gone = false;
    while (performance.now() - t0 < 150000) {
      await new Promise((r) => setTimeout(r, 200));
      const c = D.ue.courier; if (!c) { gone = true; break; }
      const q = c.group.position, st = D.ue.state;
      const [lx, lz] = F.local(cb, q.x, q.z);
      if (Math.hypot(q.x - last[0], q.z - last[1]) > 0.15) { last = [q.x, q.z]; lastMoveT = performance.now(); }
      else if (st !== 'speaking' && !D.qt.isOpen) { const s = (performance.now() - lastMoveT) / 1000; if (s > maxStillS) { maxStillS = s; stillState = st + '@' + lx.toFixed(1) + ',' + lz.toFixed(1); } }
      if (trace.length === 0 || performance.now() - trace[trace.length - 1].t > 1500) trace.push({ t: Math.round((performance.now() - t0) / 1000), st, lx: +lx.toFixed(1), lz: +lz.toFixed(1), inC: F.inHull(cb, q.x, q.z) });
      if (!delivered && (st === 'speaking' || Kt.rewards.snacks)) { delivered = true; deliveredAt = (performance.now() - t0) / 1000; }
      if (delivered && !left && st === 'leaving' && !F.inHull(cb, q.x, q.z)) { left = true; leftAt = (performance.now() - t0) / 1000; }
      if (left && performance.now() - t0 > leftAt * 1000 + 3000) break;
    }
    out.delivered = delivered; out.deliveredAtS = +deliveredAt.toFixed(1); out.snacks = !!Kt.rewards.snacks;
    out.leftChurch = left; out.leftAtS = +leftAt.toFixed(1); out.gone = gone; out.maxStillS = +maxStillS.toFixed(1); out.stillState = stillState;
    out.trace = trace.filter((x, i, a) => i === 0 || i === a.length - 1 || x.st !== a[i - 1].st || Math.abs(x.lx - a[i - 1].lx) + Math.abs(x.lz - a[i - 1].lz) > 1.5).slice(0, 40);
    out.errors = D.Re.errors;
    return out;
  }, side);
  console.log(JSON.stringify(r));
  expect('courier spawns after the 30 s portal delay', r.spawned, `${r.spawnedAfterS}s`);
  expect(`player placed inside the church on the ${side} of the Ancient`, r.playerInChurch, JSON.stringify(r.playerLocal));
  expect('courier reaches the player and delivers (+Snacks)', r.delivered && r.snacks, `delivered at ${r.deliveredAtS}s`);
  expect('courier never stands still for more than 8 s while arriving or leaving', r.maxStillS <= 8, `max still ${r.maxStillS}s (${r.stillState})`);
  expect('courier walks back out of the church after delivering', r.leftChurch, `left at ${r.leftAtS}s`);
  expect('no page errors', errors.length === 0 && !r.errors, errors.slice(0, 3).join(' | '));
  await browser.close().catch(() => {});
  done();
})();
