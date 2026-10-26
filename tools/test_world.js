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
    const free = []; let tried = 0, thrown = null;
    for (let k = 0; k < 600 && free.length < 40; k++) {
      const x = rnd(-t.parkHalf + 2, t.parkHalf - 2), z = rnd(-t.parkHalf + 2, t.parkSouth - 2);
      tried++;
      try { if (J.roamFree(x, z, 0.6)) free.push([x, z]); } catch (e) { thrown = String(e); break; }
    }
    let ok = 0, crossed = 0, missed = 0, empty = 0, maxLen = 0, crossings = null;
    const r = 0.6;
    for (let i = 0; i + 1 < free.length; i += 2) {
      const [x0, z0] = free[i], [x1, z1] = free[i + 1];
      const path = J.route(x0, z0, x1, z1, r);
      if (!path || !path.length) { empty++; continue; }
      maxLen = Math.max(maxLen, path.length);
      let px = x0, pz = z0, bad = false;
      for (const [x, z] of path) {
        if (F.segBlocked(px, pz, x, z, 0.2)) {
          bad = true;
          // How deep does the segment cut into the real hull? Sample along it.
          let worst = 0, who = null;
          for (let k = 0; k <= 20; k++) {
            const sx = px + (x - px) * k / 20, sz = pz + (z - pz) * k / 20;
            for (const B of F.buildings) {
              if (!F.inHull(B, sx, sz)) continue;
              const [lx, lz] = F.local(B, sx, sz), h = B.hull;
              const depth = Math.min(lx - h[0], h[2] - lx, lz - h[1], h[3] - lz);
              if (depth > worst) { worst = depth; who = B.name; }
            }
          }
          (crossings = crossings || []).push({ building: who, depthM: +worst.toFixed(2), from: [+px.toFixed(1), +pz.toFixed(1)], to: [+x.toFixed(1), +z.toFixed(1)] });
        }
        px = x; pz = z;
      }
      const end = path[path.length - 1];
      if (Math.hypot(end[0] - x1, end[1] - z1) > 0.01) missed++;
      if (bad) crossed++; else ok++;
    }
    return { pairs: Math.floor(free.length / 2), ok, crossed, missed, empty, maxLen, tried, freeCells: free.length, thrown, crossings };
  });
  expect(`routes: ${routes.ok}/${routes.pairs} random pairs routed without crossing a hull`, routes.pairs >= 5 && routes.crossed === 0 && routes.empty === 0 && !routes.thrown, JSON.stringify(routes));
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
    const D = window.__dbg;
    // A posted (stationary) NPC other than the Mushroom: Fortizmo, King Dino, Etcher...
    const h = ['frog', 'm_kingdino', 'p_etcher', 'p_glyph', 'w_mont', 'm_somlet'].map((id) => D.It.byId[id]).find((e) => e && e.def && e.def.at && e.def.stationary);
    if (!h) return { error: 'no posted npc; ids=' + Object.keys(D.It.byId).join(',') };
    const home = h.def.at;
    h.group.position.set(home[0] + 7, 0, home[1] + 7);
    Object.assign(h, { vbk: -1, goHome: false, gcNavHome: false, gcNav: null, busy: null, dest: null });
    D.At.position.set(home[0] - 10, D.At.position.y, home[1] - 10);
    const d0 = Math.hypot(h.group.position.x - home[0], h.group.position.z - home[1]);
    const t0 = performance.now();
    let dist = d0;
    while (performance.now() - t0 < 70000) {
      await new Promise((r) => setTimeout(r, 250));
      dist = Math.hypot(h.group.position.x - home[0], h.group.position.z - home[1]);
      if (dist < 0.3) break;
    }
    return { id: h.id, name: h.def.name, d0: +d0.toFixed(2), dist: +dist.toFixed(2), seconds: +((performance.now() - t0) / 1000).toFixed(1) };
  });
  expect(`watchdog: displaced ${wd.name} (${wd.id}) returns home within 70s`, !wd.error && wd.dist < 0.5, JSON.stringify(wd));

  // B2: an NPC stuck in view for 8 stalls is rescued visibly (sparkle poof + move to its target).
  const b2 = await page.evaluate(() => {
    const D = window.__dbg; const h = D.It.byId.frog || D.It.all.find((x) => x.def && x.def.at && x.home);
    if (!h) return { error: 'no npc' };
    const p = h.group.position; D.At.position.set(p.x + 3, D.At.position.y, p.z + 3);   // within 12 m: counts as "in view"
    const before = [p.x, p.z]; const target = h.goHome && h.dest ? [h.dest.x, h.dest.z] : [h.home.x, h.home.z];
    h.gcStuckN = 8; h.gcBlk = 1.3; h.gcWant = 1;
    let threw = null; try { D.De(h, null, 0.016, 0); } catch (e) { threw = String(e); }
    const after = [h.group.position.x, h.group.position.z];
    return { name: h.def.name, moved: +Math.hypot(after[0] - before[0], after[1] - before[1]).toFixed(2), atTarget: +Math.hypot(after[0] - target[0], after[1] - target[1]).toFixed(2), stuckN: h.gcStuckN, threw };
  });
  expect(`B2: ${b2.name || '?'} stuck in view for 8 stalls is moved to its target with a visible poof`, !b2.error && !b2.threw && b2.atTarget < 0.05 && b2.stuckN === 0, JSON.stringify(b2));

  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `WORLD TEST FAILED (${failures.length})` : 'WORLD TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('WORLD TEST ERROR', e); process.exit(1); });
