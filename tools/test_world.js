#!/usr/bin/env node
/**
 * World-level checks on the real game (headless, 2D mode):
 *
 *   routes    JGP.route between random free cells never crosses a building
 *             hull and ends at the target.
 *   hulls     over a sampling window no NPC stands inside a building hull it
 *             does not belong to, and none leaves the park bounds.
 *   pickups   walking the player onto a blossom and an acorn increments the
 *             counters and the item regrows after its timer.
 *   watchdog  an NPC displaced from its post is sent home by the away
 *             watchdog and gets there.
 *
 * Usage: node tools/test_world.js [file.html] [sampleSeconds]
 */
const { boot, reporter } = require('./lib/harness');
const path = require('path');

const file = process.argv[2];
const SAMPLE_S = Number(process.argv[3] || 40);

(async () => {
  const g = await boot({ file });
  const { page } = g;
  const { failures, expect, note } = reporter();
  console.log(`booted in ${g.bootS.toFixed(1)}s; hooks: ${g.hooks.join(',')}`);

  // ---- routes
  const routes = await page.evaluate(() => {
    const D = window.__dbg, t = D.t, F = D.F, J = D.JGP;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const free = [];
    for (let k = 0; k < 400 && free.length < 40; k++) {
      const x = rnd(-t.parkHalf + 2, t.parkHalf - 2), z = rnd(-t.parkHalf + 2, t.parkSouth - 2);
      if (J.roamFree(x, z, 1)) free.push([x, z]);
    }
    let ok = 0, crossed = 0, missed = 0, empty = 0, maxLen = 0;
    const r = 0.6;
    for (let i = 0; i + 1 < free.length; i += 2) {
      const [x0, z0] = free[i], [x1, z1] = free[i + 1];
      const path = J.route(x0, z0, x1, z1, r);
      if (!path || !path.length) { empty++; continue; }
      maxLen = Math.max(maxLen, path.length);
      let px = x0, pz = z0, bad = false;
      for (const [x, z] of path) { if (F.segBlocked(px, pz, x, z, 0.2)) bad = true; px = x; pz = z; }
      const end = path[path.length - 1];
      if (Math.hypot(end[0] - x1, end[1] - z1) > 0.01) missed++;
      if (bad) crossed++; else ok++;
    }
    return { pairs: Math.floor(free.length / 2), ok, crossed, missed, empty, maxLen };
  });
  expect(`routes: ${routes.ok}/${routes.pairs} random pairs routed without crossing a hull`, routes.crossed === 0 && routes.empty === 0, JSON.stringify(routes));
  expect('routes end at the requested point', routes.missed === 0, `${routes.missed} missed`);

  // ---- hull / bounds sampling of all NPCs
  const sample = await page.evaluate(async (seconds) => {
    const D = window.__dbg, F = D.F, t = D.t;
    const viol = {}, oob = {}, names = {};
    let samples = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < seconds * 1000) {
      await new Promise((r) => setTimeout(r, 250));
      samples++;
      for (const h of D.It.all) {
        if (!h.group || !h.group.visible) continue;
        const p = h.group.position; names[h.id] = h.def && h.def.name;
        if (Math.abs(p.x) > t.parkHalf + 0.5 || p.z < -t.parkHalf - 0.5 || p.z > t.parkSouth + 0.5) oob[h.id] = (oob[h.id] || 0) + 1;
        for (const B of F.buildings) {
          const worker = h.home && F.inHull(B, h.home.x, h.home.z);
          if (!worker && F.inHull(B, p.x, p.z, -0.1)) viol[h.id] = (viol[h.id] || 0) + 1;
        }
      }
    }
    return { samples, npcs: D.It.all.length, viol, oob, names };
  }, SAMPLE_S);
  expect(`no NPC inside a foreign building hull over ${SAMPLE_S}s (${sample.samples} samples, ${sample.npcs} entities)`, Object.keys(sample.viol).length === 0, JSON.stringify(sample.viol));
  expect('no NPC outside the park bounds', Object.keys(sample.oob).length === 0, JSON.stringify(sample.oob));

  // ---- pickups
  const pick = await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, At = D.At;
    const out = {};
    for (const [name, mod] of [['blossom', D.le], ['acorn', D.ce]]) {
      const item = mod.list.find((o) => !o.userData.taken && o.visible);
      if (!item) { out[name] = { error: 'no item available' }; continue; }
      const key = name === 'blossom' ? 'blossoms' : 'acorns';
      const before = Kt[key];
      At.position.set(item.position.x, At.position.y, item.position.z);
      const t0 = performance.now();
      while (Kt[key] === before && performance.now() - t0 < 4000) await new Promise((r) => setTimeout(r, 50));
      const took = Kt[key] - before;
      const taken = item.userData.taken;
      // regrow: wait up to timer + 2 s
      const regrowS = name === 'blossom' ? D.t.blossomRegrowS : D.t.acornRegrowS;
      At.position.set(item.position.x + 6, At.position.y, item.position.z + 6);
      const t1 = performance.now();
      while (item.userData.taken && performance.now() - t1 < (regrowS + 3) * 1000) await new Promise((r) => setTimeout(r, 200));
      out[name] = { took, taken, regrew: !item.userData.taken, regrowWaitS: +((performance.now() - t1) / 1000).toFixed(1), regrowS };
    }
    return out;
  });
  for (const name of ['blossom', 'acorn']) {
    const r = pick[name];
    expect(`${name}: walking onto it picks it up (+1)`, r && r.took === 1 && r.taken, JSON.stringify(r));
    expect(`${name}: regrows after ${r && r.regrowS}s`, r && r.regrew, r && `${r.regrowWaitS}s`);
  }

  // ---- away watchdog on a posted NPC (Zollod at Garden Supplies, id cutebex)
  const wd = await page.evaluate(async () => {
    const D = window.__dbg, h = D.It.byId.cutebex || D.It.all.find((e) => e.def && e.def.at && e.id !== 'drifter');
    if (!h) return { error: 'no posted npc' };
    const home = h.def.at;
    h.group.position.set(home[0] + 7, 0, home[1] + 7);
    Object.assign(h, { vbk: -1, goHome: false, gcNavHome: false, gcNav: null, busy: null, dest: null });
    D.At.position.set(home[0] - 10, D.At.position.y, home[1] - 10);
    const d0 = Math.hypot(h.group.position.x - home[0], h.group.position.z - home[1]);
    const t0 = performance.now();
    let dist = d0;
    while (performance.now() - t0 < 40000) {
      await new Promise((r) => setTimeout(r, 250));
      dist = Math.hypot(h.group.position.x - home[0], h.group.position.z - home[1]);
      if (dist < 0.3) break;
    }
    return { id: h.id, name: h.def.name, d0: +d0.toFixed(2), dist: +dist.toFixed(2), seconds: +((performance.now() - t0) / 1000).toFixed(1) };
  });
  expect(`watchdog: displaced ${wd.name} (${wd.id}) returns home within 40s`, !wd.error && wd.dist < 0.3, JSON.stringify(wd));

  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `WORLD TEST FAILED (${failures.length})` : 'WORLD TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('WORLD TEST ERROR', e); process.exit(1); });
