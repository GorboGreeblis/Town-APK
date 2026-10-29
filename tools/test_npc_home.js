#!/usr/bin/env node
/**
 * Reproduction harness for NPC "return home" behaviour, built for the Mushroom
 * (entity id "drifter"): the only character whose home is raised (a kiosk desk,
 * standY 1.545); since F-B39 he walks up a ramp on the desk's left (no hop).
 *
 * It runs the real game in headless Chromium inside a fake WebXR session (NPCs
 * only move while the game presents), with a
 * debug hook injected into a TEMPORARY copy of the game that exposes the
 * closure-scoped objects (It, JGP, F, lo, Be, De, t, At, B, Re). The shipped
 * game is not touched.
 *
 * For each scenario it places the NPC (and the player, who is kept within
 * 12 m so the off-screen teleport rescue is disabled unless stated), lets the
 * game run, and records whether and when the NPC reaches home at desk height,
 * plus any teleports, re-plans (gcStuckN) and oscillation.
 *
 * Usage: node tools/test_npc_home.js [file.html] [npcId] [maxSeconds] [firstNScenarios]
 * Exit 1 if any scenario fails to get the NPC home.
 */
const { boot } = require('./lib/harness');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = process.argv[2] || path.join(root, 'tools/android/app/src/main/assets/index.html');
const NPC = process.argv[3] || 'drifter';
const MAX_S = Number(process.argv[4] || 45);
const ONLY = process.argv[5] ? Number(process.argv[5]) : null;   // run only the first N scenarios (smoke)
const outDir = path.join(root, 'tools', '.runs');
fs.mkdirSync(outDir, { recursive: true });

// Runs inside the page: frame-locked observer of one NPC.
const observe = ({ id, maxS, standY }) => new Promise((resolve) => {
  const D = window.__dbg, h = D.It.byId[id] || D.It.all.find((e) => e.def && e.def.__type === id);
  const home = h.def.at, trace = [];
  let last = null, teleports = 0, t0 = performance.now(), maxStuck = 0, maxY = 0, rePlans = 0, lastStuckN = h.gcStuckN || 0;
  const dist = () => Math.hypot(h.group.position.x - home[0], h.group.position.z - home[1]);
  const tick = () => {
    const p = h.group.position, now = (performance.now() - t0) / 1000;
    if (last && Math.hypot(p.x - last.x, p.z - last.z) > 2) teleports++;
    last = { x: p.x, z: p.z };
    maxStuck = Math.max(maxStuck, h.gcStuckN || 0); maxY = Math.max(maxY, p.y);
    if ((h.gcStuckN || 0) > lastStuckN) rePlans++; lastStuckN = h.gcStuckN || 0;
    if (trace.length === 0 || now - trace[trace.length - 1].t >= 0.5) {
      trace.push({ t: +now.toFixed(1), x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), d: +dist().toFixed(2),
        goHome: !!h.goHome, nav: h.gcNav ? h.gcNav.length : 0, vbk: h.vbk, stuckN: h.gcStuckN || 0, blk: +((h.gcBlk || 0).toFixed(2)), moving: !!h.moving, held: !!h.held, near: !!h.nearPlayer });
    }
    const homeNow = dist() < 0.15 && Math.abs(p.y - standY) < 0.08 && !h.goHome;
    if (homeNow && now > 0.5) return resolve({ ok: true, t: +now.toFixed(1), teleports, maxStuck, rePlans, maxY: +maxY.toFixed(2), trace, final: trace[trace.length - 1] });
    if (now > maxS) return resolve({ ok: false, t: +now.toFixed(1), teleports, maxStuck, rePlans, maxY: +maxY.toFixed(2), trace, final: { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), d: +dist().toFixed(2), goHome: !!h.goHome, nav: h.gcNav ? h.gcNav.length : 0, vbk: h.vbk, stuckN: h.gcStuckN || 0 } });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

(async () => {
  const g = await boot({ file, vr: true });
  const { page, errors } = g;
  console.log(`booted in ${g.bootS.toFixed(1)}s, presenting after ${g.presentS.toFixed(1)}s`);
  const info = await page.evaluate((id) => {
    const D = window.__dbg; let h = D.It.byId[id] || D.It.all.find((e) => e.def && e.def.__type === id);
    // Kiosk keepers (Zollod is cast type "cutebex") spawn on the game's schedule; spawn one now if needed.
    if (!h && D.Mo) { try { D.Mo(id); } catch (e) { return { error: 'spawn failed: ' + (e && e.message) }; } h = D.It.byId[id] || D.It.all.find((e) => e.def && e.def.__type === id); }
    if (!h) return { error: 'no such npc: ' + id + '; ids: ' + Object.keys(D.It.byId).join(',') };
    const K = D.F.buildings.find((B) => D.F.inHull(B, h.home.x, h.home.z));   // the kiosk his home is in
    return { kiosk: K ? { x: K.x, z: K.z, c: K.c, s: K.s, home: D.F.local(K, h.home.x, h.home.z) } : null, name: h.def.name, at: h.def.at, via: h.def.via, standY: h.def.pattern && h.def.pattern[1] && h.def.pattern[1].y || 0, bodyR: h.bodyR,
      pos: [h.group.position.x, h.group.position.y, h.group.position.z], player: [D.At.position.x, D.At.position.z], hooks: Object.keys(D) };
  }, NPC);
  if (info.error) { console.log(info.error); process.exit(2); }
  console.log(`${info.name} (${NPC}): home=${JSON.stringify(info.at)} via=${JSON.stringify(info.via)} standY=${info.standY} start=${JSON.stringify(info.pos.map((v) => +v.toFixed(2)))} hooks=${info.hooks.join(',')}`);

  // The kiosk's own frame, from his home on the desk: f forward (out of the kiosk's front), r right (the desk's long side;
  // since F-B39 the desk is against the right wall and his ramp on its left).
  const K = info.kiosk; if (!K) { console.log('his home is in no building'); process.exit(2); }
  const local = (f, r) => { const x = K.home[0] + r, z = K.home[1] + f; return [K.x + x * K.c + z * K.s, K.z - x * K.s + z * K.c]; };

  const scenarios = [
    { name: 'in front of the desk, on the ground (1.0 m out)', npc: local(1.0, 0), player: local(7, 0) },
    { name: 'in front of the desk where the hop used to start (kiosk 0,2)', npc: local(1.28, -0.88), player: local(7, 0) },
    { name: 'just outside the front (2.6 m)', npc: local(2.6, 0), player: local(7, 0) },
    { name: 'front 5 m', npc: local(5, 0), player: local(8, 3) },
    { name: 'front 8 m', npc: local(8, 0), player: local(9, 4) },
    { name: 'right side 3 m (through the wall line)', npc: local(0, 3.6), player: local(6, 4) },
    { name: 'left side 3 m', npc: local(0, -3.6), player: local(6, -4) },
    { name: 'behind the kiosk 3 m', npc: local(-3.2, 0), player: local(-7, 2) },
    { name: 'behind the kiosk 6 m', npc: local(-6, 0), player: local(-9, 3) },
    { name: 'diagonal 5 m', npc: local(3.5, 3.5), player: local(7, 5) },
    { name: 'front 5 m, nav return (garden-event style goHome)', npc: local(5, 0), player: local(8, 3), navReturn: true },
    { name: 'front 5 m, forced stuck re-plan (De safety net)', npc: local(5, 0), player: local(8, 3), forceStuck: true },
    { name: 'front 6 m, PLAYER BLOCKING the doorway for 15 s', npc: local(6, 0), player: local(3.0, 0), unblockAfter: 15 },
    { name: 'inside the back of the kiosk (local 0,-2) with player far: teleport allowed', npc: local(-2.0, 0), player: local(40, 0), far: true },
    { name: 'at home but at ground level (y=0): back up on the desk', npc: local(0, 0), player: local(7, 0) },
    { name: 'interrupted visit: straight nav to home from behind 6 m (drop path)', npc: local(-6, 0), player: local(-9, 3), navHome: true },
    { name: 'interrupted visit: straight nav to home from right side 3 m (drop path)', npc: local(0, 3.6), player: local(6, 4), navHome: true },
  ];

  const results = [];
  for (const sc of (ONLY ? scenarios.slice(0, ONLY) : scenarios)) {
    const r = await page.evaluate(async ({ id, sc, maxS, standY, observeSrc }) => {
      const D = window.__dbg, h = D.It.byId[id] || D.It.all.find((e) => e.def && e.def.__type === id);
      // Reset NPC state.
      h.group.position.set(sc.npc[0], 0, sc.npc[1]);
      h.home.set(h.def.at[0], h.home.y, h.def.at[1]);
      Object.assign(h, { vbk: -1, goHome: false, gcNavHome: false, gcNav: null, gcStuckN: 0, gcBlk: 0, dest: null, busy: null, visiting: false, held: false, nearPlayer: false, moving: false, trek: false });
      // Player placement (also moves the 2D camera, which the De visibility check uses).
      D.At.position.set(sc.player[0], D.At.position.y, sc.player[1]);
      if (D.B && D.B.position) { D.B.position.set(sc.player[0], 1.7, sc.player[1]); D.B.lookAt(h.def.at[0], 1.2, h.def.at[1]); }
      if (sc.navReturn) {
        const via = h.def.via, now = D.Re.t;
        D.Be(h, via[via.length - 1][0], via[via.length - 1][1], now);
        h.gcNav.push(...via.slice(0, -1).reverse().map((w) => [w[0], w[1]]), [h.home.x, h.home.z]);
        h.gcNavHome = true;
      }
      if (sc.forceStuck) { h.gcWant = 1; h.gcBlk = 1.3; }
      if (sc.navHome) { D.Be(h, h.home.x, h.home.z, D.Re.t); h.gcNavHome = true; }
      if (sc.unblockAfter) setTimeout(() => { D.At.position.set(sc.player[0] + 9, D.At.position.y, sc.player[1] + 3); }, sc.unblockAfter * 1000);
      const observe = eval('(' + observeSrc + ')');
      return observe({ id, maxS, standY });
    }, { id: NPC, sc, maxS: MAX_S, standY: info.standY, observeSrc: observe.toString() });
    results.push({ scenario: sc.name, ...r });
    const f = r.final;
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${sc.name}: ${r.ok ? 'home in ' + r.t + 's' : 'NOT home after ' + r.t + 's'}; teleports=${r.teleports} rePlans=${r.rePlans} maxStuckN=${r.maxStuck} maxY=${r.maxY}; final d=${f.d} y=${f.y} goHome=${f.goHome} nav=${f.nav} vbk=${f.vbk}`);
  }
  fs.writeFileSync(path.join(outDir, `npc_home_${NPC}.json`), JSON.stringify({ info, results, errors }, null, 1));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`page errors: ${errors.length}${errors.length ? ' | ' + errors.slice(0, 3).join(' | ') : ''}`);
  console.log(`traces written to tools/.runs/npc_home_${NPC}.json`);
  console.log(failed ? `NPC HOME TEST: ${failed} scenario(s) did not get home` : 'NPC HOME TEST PASSED');
  await g.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('NPC HOME TEST ERROR', e); process.exit(1); });
