// Occlusion census (report): what is drawn but can never be seen. The author's rule is to remove whatever the player
// never sees (behind the ring of buildings, inside closed buildings, under the ground); it costs draw calls, and the
// planting Event is limited by draw calls (NOTES 79).
//
// 1. Reachable area: a 1 m grid flood-filled from the player's spawn through every spot the game's own player collision
//    (F.resolve, the park clamp) leaves the player standing in, so building interiors the player can walk into count.
// 2. Views (96 x 96 pixels, drawn into a corner of the canvas): from reachable points (every STEP m outdoors, every 2 m inside buildings) at eye heights 1.1 and 2.0 m, in 8
//    directions x 3 pitches with a 100-degree view, the scene is rendered with the batcher off (every part draws on its
//    own) and a GPU occlusion query around every draw: an object counts as seen when any of its samples passes the
//    depth test in any view.
// 3. Verification: every object never seen in 2 is looked at directly from the 12 reachable points nearest to it, at
//    eye heights 1.0, 1.6 and 2.2 m. What is still never seen is listed, grouped by where it is, with its triangles and
//    whether it draws on its own or inside a batch (only the first saves a draw call; both save vertex work).
// Characters (they move) and anything hidden at the moment are left out. Writes tools/.runs/occlusion_census.json.
//
//   node tools/occlusion_census.js [file] [--step 6]
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const STEP = +(process.argv.find((x, i) => process.argv[i - 1] === '--step') || 6);
(async () => {
  const t0 = Date.now();
  const g = await boot({ file, vr: true, fastSim: true });
  const page = g.page;
  await page.waitForTimeout(2000);
  // --- setup: reachable area, query wrappers, a small render target
  const setup = await page.evaluate((STEP) => {
    const D = window.__dbg, F = D.F, t = D.t, T = window.THREE, C = D.C, O = D.O, gl = O.getContext();
    const R = t.player.bodyR, lim = t.parkHalf - 0.15 - R, south = t.parkSouth - 0.15 - R;
    const free = (x, z) => { if (x < -lim || x > lim || z < -lim || z > south) return false; const p = new T.Vector3(x, 0, z); F.resolve(p, R); return Math.hypot(p.x - x, p.z - z) < 0.02; };
    const key = (i, j) => i + ',' + j, cells = new Map();
    const si = Math.round(t.player.spawn[0]), sj = Math.round(t.player.spawn[1]);
    const queue = [[si, sj]]; cells.set(key(si, sj), [si, sj]);
    while (queue.length) {
      const [i, j] = queue.shift();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj, k = key(a, b);
        if (cells.has(k) || !free(a, b) || !free(i + di / 2, j + dj / 2)) continue;
        cells.set(k, [a, b]); queue.push([a, b]);
      }
    }
    const reach = [...cells.values()];
    const inside = (x, z) => F.buildings.some((B) => F.inHull(B, x, z));
    const pts = reach.filter(([x, z]) => inside(x, z) ? (x % 2 === 0 && z % 2 === 0) : (((x % STEP) + STEP) % STEP === 0 && ((z % STEP) + STEP) % STEP === 0));
    window.__occ = { reach, pts, seen: new Set(), pending: [], on: false };
    // wrap every drawable object (not characters: they move) with an occlusion query around its draw
    const ents = new Set(); for (const h of D.It.all) if (h.group) h.group.traverse((o) => ents.add(o));
    if (D.st && D.st.group) D.st.group.traverse((o) => ents.add(o));
    const all = [];
    C.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || ents.has(o)) return;
      const b = o.onBeforeRender, a = o.onAfterRender; all.push(o);
      o.onBeforeRender = function () { if (window.__occ.on && !this.__occQ) { const q = gl.createQuery(); gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, q); this.__occQ = q; window.__occ.pending.push([this, q]); } return b.apply(this, arguments); };
      o.onAfterRender = function () { const r = a.apply(this, arguments); if (this.__occQ) { gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE); this.__occQ = null; } return r; };
    });
    window.__occ.all = all;
    // what is shown now: visible all the way up (only those can be judged)
    const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
    window.__occ.cands = all.filter(shown);
    window.__occ.cam = new T.PerspectiveCamera(100, 1, 0.1, t.far || 310);
    return { reach: reach.length, pts: pts.length, objects: all.length, shownNow: window.__occ.cands.length, batches: D.gcEB.list.length };
  }, STEP);
  console.log(`reachable: ${setup.reach} m2 of grid, ${setup.pts} viewpoints; ${setup.objects} drawable objects (${setup.shownNow} shown now), ${setup.batches} batches`);
  // --- render a list of views with the batcher off; read the queries after returning to the event loop
  const render = (views) => page.evaluate(async (views) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), S = window.__occ, cam = S.cam;
    const xrWas = O.xr.enabled, rtWas = O.getRenderTarget();
    const moved = [];
    const unbatch = () => { for (const b of D.gcEB.list) { if (b.mesh.visible) { b.mesh.visible = false; moved.push(b.mesh); } for (const p of b.P) if (p.on && p.st === 1 && p.o.layers.mask !== 1) { p.o.layers.set(0); moved.push(p.o); } } };
    const rebatch = () => { for (const o of moved) { if (o.parent === D.gcEB.root) o.visible = true; else o.layers.set(31); } moved.length = 0; };
    const draw = O.__realRender || O.render;
    for (const [x, y, z, yaw, pitch, tx, ty, tz] of views) {
      O.xr.enabled = false; O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
      const W = O.domElement.width, H = O.domElement.height; O.setViewport(0, 0, 96, 96); O.setScissor(0, 0, 96, 96); O.setScissorTest(true);
      cam.position.set(x, y, z);
      if (tx !== undefined) cam.lookAt(tx, ty, tz); else { cam.rotation.set(pitch, yaw, 0, 'YXZ'); }
      cam.updateMatrixWorld(true);
      unbatch(); S.on = true;
      try { draw.call(O, C, cam); } finally { S.on = false; rebatch(); }
      O.setScissorTest(false); O.setViewport(0, 0, W, H); O.setRenderTarget(rtWas); O.xr.enabled = xrWas;
    }
    gl.flush();
    // query results become available only once control has returned to the browser
    let tries = 0;
    while (S.pending.length && tries++ < 200) {
      await new Promise((r) => setTimeout(r, 5));
      const left = [];
      for (const [o, q] of S.pending) {
        if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { left.push([o, q]); continue; }
        if (gl.getQueryParameter(q, gl.QUERY_RESULT)) S.seen.add(o);
        gl.deleteQuery(q);
      }
      S.pending = left;
    }
    return { seen: S.seen.size, unresolved: S.pending.length };
  }, views);
  const pts = await page.evaluate(() => window.__occ.pts);
  const dirs = [];
  for (let k = 0; k < 8; k++) for (const p of [-0.75, 0, 0.75]) dirs.push([k * Math.PI / 4, p]);
  let views = [];
  for (const [x, z] of pts) for (const h of [1.1, 2.0]) for (const [yaw, pitch] of dirs) views.push([x, h, z, yaw, pitch]);
  console.log(`pass 1: ${views.length} views`);
  let last = null;
  for (let i = 0; i < views.length; i += 240) { last = await render(views.slice(i, i + 240)); if ((i / 240) % 10 === 0) console.log(`  ${Math.min(i + 240, views.length)} / ${views.length} views, ${last.seen} objects seen so far`); }
  // --- verification: look straight at every unseen object from the reachable points nearest to it
  const unseen = await page.evaluate(() => {
    const S = window.__occ, T = window.THREE, v = new T.Vector3(), box = new T.Box3();
    return S.cands.map((o, i) => [o, i]).filter(([o]) => !S.seen.has(o)).map(([o, i]) => { box.setFromObject(o); box.getCenter(v); return [i, v.x, v.y, v.z]; });
  });
  console.log(`pass 1: ${unseen.length} shown objects never seen; verifying each from its nearest reachable points`);
  views = [];
  const reach = await page.evaluate(() => window.__occ.reach);
  for (const [, cx, cy, cz] of unseen) {
    const near = reach.map(([x, z]) => [x, z, Math.hypot(x - cx, z - cz)]).sort((a, b) => a[2] - b[2]).slice(0, 12);
    for (const [x, z] of near) for (const h of [1.0, 1.6, 2.2]) views.push([x, h, z, 0, 0, cx, cy, cz]);
  }
  for (let i = 0; i < views.length; i += 240) await render(views.slice(i, i + 240));
  // --- the list
  const r = await page.evaluate(() => {
    const S = window.__occ, D = window.__dbg, T = window.THREE, v = new T.Vector3(), box = new T.Box3();
    const BATCH = 1 << 31, out = [];
    for (const o of S.cands) {
      if (S.seen.has(o)) continue;
      box.setFromObject(o); box.getCenter(v);
      const geo = o.geometry, pos = geo && geo.attributes && geo.attributes.position;
      const tris = pos ? Math.floor((geo.index ? geo.index.count : pos.count) / 3) : 0;
      const where = []; for (let q = o; q && q !== D.C && where.length < 4; q = q.parent) where.push(q.name || q.type);
      const r0 = Math.hypot(v.x, v.z);
      out.push({ where: where.join(' < '), x: +v.x.toFixed(1), y: +v.y.toFixed(1), z: +v.z.toFixed(1), fromCentre: +r0.toFixed(0), tris, batched: o.layers.mask === BATCH, type: o.type });
    }
    return { unseen: out, seen: S.seen.size, shown: S.cands.length };
  });
  const own = r.unseen.filter((o) => !o.batched), inBatch = r.unseen.filter((o) => o.batched);
  const sum = (l) => l.reduce((a, o) => a + o.tris, 0);
  const band = (o) => o.fromCentre > 56 ? 'beyond the park (more than 56 m out)' : o.y < 0 ? 'below the ground' : 'inside the park or its buildings';
  console.log(`seen: ${r.seen} of ${r.shown} shown objects; never seen: ${r.unseen.length} (${own.length} drawn on their own, ${sum(own)} triangles; ${inBatch.length} inside batches, ${sum(inBatch)} triangles)`);
  const groups = {};
  for (const o of r.unseen) (groups[band(o)] = groups[band(o)] || []).push(o);
  for (const [k, l] of Object.entries(groups)) {
    console.log(`  ${k}: ${l.length} objects, ${sum(l)} triangles, ${l.filter((o) => !o.batched).length} own draws`);
    for (const o of l.sort((a, b) => b.tris - a.tris).slice(0, 12)) console.log(`    ${o.tris} tris at (${o.x}, ${o.y}, ${o.z})${o.batched ? ' [batched]' : ''} ${o.where}`);
  }
  const out = path.join(__dirname, '.runs', 'occlusion_census.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), step: STEP, ...setup, ...r }, null, 1));
  console.log(`written to tools/.runs/occlusion_census.json (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
  if (g.errors.length) console.log('page errors: ' + g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log('OCCLUSION CENSUS DONE');
})().catch((e) => { console.error(e); process.exit(1); });
