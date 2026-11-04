#!/usr/bin/env node
/**
 * World-level checks on the real game (headless, 2D mode):
 *
 *   routes    JGP.route between random free cells never crosses a building
 *             hull and ends at the target.
 *   hulls     over a sampling window no NPC stands inside a building hull it
 *             does not belong to, and none leaves the park bounds.
 *   spots     the pickup spawn picker never puts a Blossom or Flint inside a
 *             building, within 4.1 m of the Gazebo or in a kiosk, nor are the
 *             live pickups there (B95)
 *   fade      a taken pickup fades out in place, no move and no shrink (A56), with no sound (A59)
 *   birds     picking the robin or the cardinal tweets once (A60)
 *   book      taking OVERCOMING SHYNESS plays its own sound once, not the pickup sound (A61)
 *   menus     every character's menu height is its highest visible point, not its bounding box (4.0.38: Mama Gorbo's
 *             tilted cap put hers 0.8 m too high)
 *   heal      a taken pickup left showing is hidden and logged (B97)
 *   ancient   the Ancient's size (15% larger), radii, visitor spot and skin
 *             textures (A52)
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

  // ---- a taken pickup fades out in place (A56, 4.0.36; the author: "I want the Blossoms and Flint to fade out in place,
  //      not move towards the player in any way"): position and size unchanged while its fade value falls, then hidden
  const fip = await page.evaluate(async () => {
    const D = window.__dbg, out = {};
    for (const [k, mod] of [['blossom', D.le], ['flint', D.ce]]) {
      const p = mod.list.find((q) => !q.userData.taken && q.visible && q.userData.regrowT0 === undefined); if (!p) { out[k] = 'none'; continue; }
      const p0 = p.position.clone(), s0 = p.scale.x, G = D.G, pk0 = G.pickup; let pk = 0; G.pickup = function () { pk++; return pk0.apply(this, arguments); }; mod.take(p); G.pickup = pk0; const tk = []; let moved = 0, scaled = 0;
      const t0 = performance.now(); while (p.visible && performance.now() - t0 < 3000) { await new Promise((r) => setTimeout(r, 30)); moved = Math.max(moved, p.position.distanceTo(p0)); scaled = Math.max(scaled, Math.abs(p.scale.x - s0)); if (p.userData.gcTk !== undefined) tk.push(+p.userData.gcTk.toFixed(2)); }
      out[k] = { moved: +moved.toFixed(3), scaled: +scaled.toFixed(3), hidden: !p.visible, fell: tk.length > 1 && tk[0] > tk[tk.length - 1], tk: tk.slice(0, 6), sound: pk };
    }
    return out;
  });
  expect('A56: a taken Blossom and Flint fade out in place (no move, no shrink; the fade value falls, then hidden)', ['blossom', 'flint'].every((k) => fip[k] && fip[k].moved < 1e-3 && fip[k].scaled < 1e-3 && fip[k].hidden && fip[k].fell), JSON.stringify(fip));
  expect('A59: taking a Blossom or Flint makes no sound', ['blossom', 'flint'].every((k) => fip[k] && fip[k].sound === 0), JSON.stringify(['blossom', 'flint'].map((k) => fip[k] && fip[k].sound)));
  // ---- the birds tweet when picked (A60, 4.0.37; the author: "Add a tweet tweet sound effect for interacting with either
  //      bird"): one tweet per pick, none while the bird is already away
  const tw = await page.evaluate(async () => {
    const D = window.__dbg, G = D.G, t0 = G.tweet; if (!t0) return { error: 'no tweet' }; let n = 0; G.tweet = function () { n++; return t0.apply(this, arguments); };
    const out = {}; for (const id of ['robin', 'cardinal']) { const z = D.z.list.find((q) => q.id === id); if (!z) { out[id] = 'none'; continue; } const n0 = n; z.run(); z.run(); out[id] = n - n0; }
    G.tweet = t0; return out;
  });
  expect('A60: picking the robin or the cardinal plays a tweet once (not again while it is away)', tw.robin === 1 && tw.cardinal === 1, JSON.stringify(tw));
  // ---- the shyness book's own sound (A61, 4.0.37; the author: "Add a special sound effect for picking up the
  //      Overcoming Shyness book"): one book sound when taken, no pickup sound, none on a second pick
  const bk = await page.evaluate(() => {
    const D = window.__dbg, G = D.G, z = D.z.list.find((q) => q.id === 'shybook'); if (!z || !G.book) return { error: !z ? 'no book zone' : 'no book sound' };
    const b0 = G.book, p0 = G.pickup; let b = 0, p = 0; G.book = function () { b++; return b0.apply(this, arguments); }; G.pickup = function () { p++; return p0.apply(this, arguments); };
    let err = null; try { z.run(); z.run(); } catch (e) { err = String(e); } G.book = b0; G.pickup = p0; return { book: b, pickup: p, err };
  });
  // ---- menus the same height above every head (4.0.38; the author: "Mama Gorbo's interact menu now appears too high over
  //      her head. All interact menus should appear with the same distance above the NPC's head"): the head top the menus
  //      stand on is each character's highest visible vertex (minus the same 0.07 m), never its bounding box's corner
  const hd = await page.evaluate(() => {
    const D = window.__dbg, T = window.THREE, v = new T.Vector3(), out = {};
    if (typeof D.Ke !== 'function') return { error: 'no head-top hook' };
    for (const e of D.It.all) { if (!e.group || !e.id) continue; e.group.updateMatrixWorld(true); let top = -Infinity;
      e.group.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return; for (let p = o; p && p !== e.group; p = p.parent) if (!p.visible) return; const a = o.geometry.attributes.position; for (let k = 0; k < a.count; k++) { v.fromBufferAttribute(a, k).applyMatrix4(o.matrixWorld); if (v.y > top) top = v.y; } });
      const want = (top - e.group.position.y) / (e.group.scale.y || 1) - 0.07; out[e.id] = +(D.Ke(e) - want).toFixed(2); }
    return out;
  });
  expect('every character\'s menu stands the same distance above its highest visible point (Mama Gorbo\'s too)', !hd.error && Object.keys(hd).length >= 8 && Object.values(hd).every((d) => Math.abs(d) <= 0.15), JSON.stringify(hd));
  expect('A61: taking OVERCOMING SHYNESS plays its own sound once (not the pickup sound)', bk.book === 1 && bk.pickup === 0 && !bk.err, JSON.stringify(bk));

  // ---- a taken pickup still showing is hidden (B97, 4.0.35; the author: a Blossom picked by pointing "did not
  //      disappear ... Instead it became uninteractable"): one put in that state (taken, shown, no fade or regrow
  //      running) is hidden by the next update and logged
  const heal = await page.evaluate(async () => {
    const D = window.__dbg, logs = [], L0 = window.__gtLog; window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    const out = {};
    for (const [k, mod] of [['blossom', D.le], ['flint', D.ce]]) {
      const p = mod.list.find((q) => !q.userData.taken && q.visible); if (!p) { out[k] = 'none'; continue; }
      const u = p.userData; u.taken = true; u.regrowAt = 1e9; delete u.fadeT0; delete u.regrowT0; p.visible = true;
      const t0 = performance.now(); while (p.visible && performance.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 50));
      out[k] = { hidden: !p.visible, logged: logs.some((l) => new RegExp('^recovery: a taken ' + (k === 'blossom' ? 'Blossom' : 'Flint') + ' was still showing').test(l)) };
      u.regrowAt = 0;
    }
    return out;
  });
  expect('B97: a taken Blossom or Flint still showing (no fade, no regrow) is hidden and logged', heal.blossom && heal.blossom.hidden && heal.blossom.logged && heal.flint && heal.flint.hidden && heal.flint.logged, JSON.stringify(heal));

  // ---- pickup spots never inside a kiosk (B95, 4.0.33; the author: "Flint and Blossoms should never spawn within any
  //      kiosk"; a Blossom was seen on the Gazebo's inner edge): 4000 spots from the spawn picker, none inside a building
  //      hull, the Gazebo's octagon (radius 3.3 m, plus a margin) or any kiosk's area (the phone booth, the portal)
  const spots = await page.evaluate(() => {
    const D = window.__dbg, F = D.F, E = D.E, go = window.__gtPickSpot, out = { n: 0, hull: 0, gazebo: 0, kiosk: 0, ex: [] };
    if (!go) return { error: 'no picker' };
    const kiosks = E.list.filter((e) => e.tag === 'phone' || e.tag === 'portal');
    const bad = (p) => { const h = F.buildings.some((b) => F.inHull(b, p.x, p.z, 0)), gz = F.gzAt && Math.hypot(p.x - F.gzAt[0], p.z - F.gzAt[1]) < 4.1, kk = kiosks.some((e) => Math.hypot(p.x - e.x, p.z - e.z) < e.r); return [h, gz, kk]; };
    for (let k = 0; k < 4000; k++) { const p = go(null, []); if (!p) continue; out.n++;
      const [h, gz, kk] = bad(p);
      if (h) out.hull++; if (gz) out.gazebo++; if (kk) out.kiosk++; if ((h || gz || kk) && out.ex.length < 4) out.ex.push([+p.x.toFixed(1), +p.z.toFixed(1)]); }
    // the live pickups too (placed at boot and moved on each regrow)
    out.live = 0; out.liveBad = 0;
    for (const mod of [D.le, D.ce]) for (const g of (mod && mod.list) || []) { out.live++; if (bad(g.position).some(Boolean)) out.liveBad++; }
    return out;
  });
  expect('B95: no Blossom or Flint spot inside a building, within 4.1 m of the Gazebo or in a kiosk (4000 spots, and every live pickup)', !spots.error && spots.n > 3000 && spots.hull === 0 && spots.gazebo === 0 && spots.kiosk === 0 && spots.live > 50 && spots.liveBad === 0, JSON.stringify(spots));

  // ---- the Ancient's size, radii and skin (A52, 4.0.33): 15% larger about its ground point (and in its breathing), its
  //      solid radius 1.0 m, its meeting radius 1.6 m, a visitor's spot clear of its body, its two skin textures 1024 x 256
  const anc = await page.evaluate(() => {
    const D = window.__dbg, J = D.JGP.slug, T = window.THREE; if (!J) return { error: 'no Ancient' };
    const c = J.core.scale, z = D.z.list.find((q) => q.id === 'slug'), b = new T.Box3().setFromObject(J.body), v = J.visit(0.9);
    const ax = J.ent.group.position, spot = v.spot, mid = new T.Vector3((b.min.x + b.max.x) / 2, 0, (b.min.z + b.max.z) / 2);
    // the visitor's spot against the body's outline: the nearest body vertex on the ground plane
    let near = 1e9; J.body.updateMatrixWorld(true); J.body.traverse((m) => { if (!m.isMesh || !m.geometry.attributes.position) return; const p = m.geometry.attributes.position, w = new T.Vector3();
      for (let i = 0; i < p.count; i += 7) { w.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); near = Math.min(near, Math.hypot(w.x - spot[0], w.z - spot[1])); } });
    return { core: [c.x, c.y, c.z].map((x) => +x.toFixed(3)), solidR: z && z.solidR, bodyR: J.ent.bodyR, len: +(b.max.z - b.min.z).toFixed(2), wid: +(b.max.x - b.min.x).toFixed(2), onFloor: +b.min.y.toFixed(2), spotClear: +near.toFixed(2) };
  });
  const man = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'android/app/src/main/assets/tex/manifest.json'), 'utf8'));
  const skins = man.filter((m) => /^1024x256_/.test(m.f)).length;
  expect('A52: the Ancient 15% larger (core scale about 1.15 x, 0.71 tall), its solid radius 1.0 m and meeting radius 1.6 m, still on the floor', !anc.error && Math.abs(anc.core[0] - 1.15) < 0.04 && Math.abs(anc.core[2] - 1.15) < 0.04 && Math.abs(anc.core[1] - 0.713) < 0.03 && anc.solidR === 1 && anc.bodyR === 1.6 && anc.onFloor > -0.15 && anc.len > 7, JSON.stringify(anc));
  expect('A52: a visitor\'s spot by the Ancient stays clear of its larger body (over 0.4 m from it)', !anc.error && anc.spotClear > 0.4, JSON.stringify(anc));
  expect('A52: the Ancient\'s skin and bump textures are pre-painted at 1024 x 256', skins >= 2, `${skins} textures of 1024 x 256 in tex/manifest.json`);

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
