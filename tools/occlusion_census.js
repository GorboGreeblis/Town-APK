// Occlusion census (report): what is drawn but can never be seen by the player, proven exhaustively before anything is
// removed (the author: "fully test if things can be seen at any point before removing them").
//
// States. Visibility is judged in two states of the world, and an object counts as never seen only if it is never seen
// in either: "town, opened" (Zollod cured, so his shop is open; the Portal open) and "the Event" (which hides the far
// scenery, so things behind it may show). Objects hidden in a state are not judged in it (a shutter that opens stays).
// Not judged at all: the characters (they move: townsfolk, Sparkakus, the Ancient), everything attached to the player
// or the camera (hands, HUD, menus), objects drawn without frustum culling (the sky, stars, sun), and objects that
// move (whose key, made of type, centre and triangles, differs between the workers' boots).
//
// Reachable area: a 0.5 m grid flood-filled from the spawn through every spot the game's player collision (F.resolve
// with the player's own position object, which meets the buildings' walls and doorways; the park clamp) leaves standing; the run fails unless it reaches the church interior next to the Ancient.
//
// Pass A (bulk): wide views (100 degrees, 8 directions x 2 pitches, eye height 1.6 m) from reachable points
// every 8 m outdoors and every 2 m inside buildings, the batcher off (every part drawn on its own) and a GPU occlusion
// query around every draw: any sample passing the depth test in any view marks the object seen.
// Pass B (exhaustive, per object still unseen): from every reachable point (1 m apart within 15 m of the object, 2 m
// apart beyond), at eye heights 1.0, 1.6 and 2.2 m, a narrow view aimed at the object's centre and just wide enough to
// cover its bounding sphere, nearest points first, until the object is seen. Only what survives every point, height
// and state is listed. Three browsers share the work; progress is saved after every chunk (tools/.runs/
// occlusion_progress.json), so a rerun with --resume carries on after a restart.
//
//   node tools/occlusion_census.js [file] [--workers 3] [--resume]
//   writes tools/.runs/occlusion_census.json (the never-seen list, with a key per object for the removal fix)
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const WORKERS = +arg('--workers', 3), RESUME = process.argv.includes('--resume');
const RUNS = path.join(__dirname, '.runs'), PROG = path.join(RUNS, 'occlusion_progress.json');
fs.mkdirSync(RUNS, { recursive: true });
const prog = RESUME && fs.existsSync(PROG) ? JSON.parse(fs.readFileSync(PROG, 'utf8')) : { states: {} };
const save = () => fs.writeFileSync(PROG, JSON.stringify(prog));
const t0 = Date.now(), mins = () => ((Date.now() - t0) / 60000).toFixed(1);

// --- in the page: put the world in a state, list the judged objects with stable keys, wrap them with queries
async function prepare(page, state) {
  return page.evaluate(async (state) => {
    const D = window.__dbg, F = D.F, t = D.t, T = window.THREE, C = D.C, O = D.O, gl = O.getContext(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // the state
    D.Kt.shyFree = true;
    try { if (D.ot && D.ot.activate) D.ot.activate(); } catch (e) {}
    if (state === 'event') {
      const K = D.Kt; K.rewards.stone = K.rewards.seeds = K.rewards.snacks = true; D.oe.open(); await wait(300);
      const yes = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
      const w0 = performance.now(); while (!D.me.active && performance.now() - w0 < 15000) await wait(200);
      await wait(8000);   // the Event's own set dressing in place
    } else await wait(3000);
    // reachable area (0.5 m grid)
    const R = t.player.bodyR, lim = t.parkHalf - 0.15 - R, south = t.parkSouth - 0.15 - R, G = 0.5;
    // the player is tested against each building's walls (its parts, with the doorways) only when the position passed
    // in is the player's own position object; any other position meets the whole outline. So test with that object.
    const AP = D.At.position, ax = AP.x, ay = AP.y, az = AP.z;
    const free = (x, z) => { if (x < -lim || x > lim || z < -lim || z > south) return false; AP.set(x, 0, z); F.resolve(AP, R); return Math.hypot(AP.x - x, AP.z - z) < 0.02; };
    const cells = new Map(), key = (i, j) => i + ',' + j;
    const si = Math.round(t.player.spawn[0] / G), sj = Math.round(t.player.spawn[1] / G), q = [[si, sj]]; cells.set(key(si, sj), 1);
    while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj, k = key(a, b); if (cells.has(k) || !free(a * G, b * G) || !free((i + di / 2) * G, (j + dj / 2) * G)) continue; cells.set(k, 1); q.push([a, b]); } }
    const reach = [...cells.keys()].map((k) => k.split(',').map((v) => +v * G));
    AP.set(ax, ay, az);
    const slug = D.JGP && D.JGP.slug && D.JGP.slug.ent, sp = slug && slug.group.getWorldPosition(new T.Vector3());
    const church = sp ? reach.some(([x, z]) => Math.hypot(x - sp.x, z - sp.z) < 4) : null;
    // judged objects: drawable, shown now, not a character, not on the player or camera, frustum-culled
    const skip = new Set(), add = (g) => g && g.traverse((o) => skip.add(o));
    for (const h of D.It.all) add(h.group);
    if (D.st) add(D.st.group); if (slug) add(slug.group); add(D.At); add(D.B); if (D.B && D.B.parent) add(D.B.parent);
    if (D.ue && D.ue.courier && D.ue.courier.group) add(D.ue.courier.group);
    const shown = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
    const list = [], seenKeys = {}, v = new T.Vector3(), box = new T.Box3(), sz = new T.Vector3();
    C.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || skip.has(o) || o.frustumCulled === false) return;
      if (D.gcEB.root && o.parent === D.gcEB.root) return;   // the batch meshes themselves (their parts are judged)
      if (!shown(o) && !(o.layers.mask === (1 << 31))) return;
      box.setFromObject(o); if (box.isEmpty()) return; box.getCenter(v); box.getSize(sz);
      const geo = o.geometry, pos = geo && geo.attributes && geo.attributes.position;
      const tris = pos ? Math.floor((geo.index ? geo.index.count : pos.count) / 3) : 0;
      let k = `${o.type}|${v.x.toFixed(2)}|${v.y.toFixed(2)}|${v.z.toFixed(2)}|${tris}`;
      seenKeys[k] = (seenKeys[k] || 0) + 1; if (seenKeys[k] > 1) k += '#' + seenKeys[k];
      const where = []; for (let p = o; p && p !== C && where.length < 4; p = p.parent) where.push(p.name || p.type);
      list.push({ o, key: k, c: [v.x, v.y, v.z], r: Math.max(0.05, sz.length() / 2), tris, batched: o.layers.mask === (1 << 31), where: where.join(' < ') });
    });
    // occlusion queries around every judged draw (only while a census render runs)
    const S = window.__occ = { list, reach, seen: new Set(), pending: [], on: false, only: null };
    for (const it of list) {
      const o = it.o, b = o.onBeforeRender, a = o.onAfterRender;
      o.onBeforeRender = function () { if (S.on && !this.__occQ && (!S.only || S.only === this)) { const qq = gl.createQuery(); gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE, qq); this.__occQ = qq; S.pending.push([this, qq]); } return b.apply(this, arguments); };
      o.onAfterRender = function () { const r = a.apply(this, arguments); if (this.__occQ) { gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE); this.__occQ = null; } return r; };
      o.__occIt = it;
    }
    S.cam = new T.PerspectiveCamera(100, 1, 0.1, t.far || 310);
    const inside = (x, z) => F.buildings.some((B) => F.inHull(B, x, z));
    return { reach: reach.length, church, objects: list.map((it) => ({ key: it.key, c: it.c, r: it.r, tris: it.tris, batched: it.batched, where: it.where })),
      ptsA: reach.filter(([x, z]) => inside(x, z) ? (x % 2 === 0 && z % 2 === 0) : (((x % 8) + 8) % 8 === 0 && ((z % 8) + 8) % 8 === 0)) };
  }, state);
}

// --- in the page: render views (wide: [x,y,z,yaw,pitch]; aimed: [x,y,z,tx,ty,tz,fovDeg,far,onlyKey]) and return the seen keys
async function render(page, views) {
  return page.evaluate(async (views) => {
    const D = window.__dbg, C = D.C, O = D.O, gl = O.getContext(), S = window.__occ, cam = S.cam;
    const byKey = new Map(S.list.map((it) => [it.key, it.o]));
    const moved = [];
    const unbatch = () => { for (const b of D.gcEB.list) { if (b.mesh.visible) { b.mesh.visible = false; moved.push(b.mesh); } for (const p of b.P) if (p.on && p.st === 1 && p.o.layers.mask !== 1) { p.o.layers.set(0); moved.push(p.o); } } };
    const rebatch = () => { for (const o of moved) { if (o.parent === D.gcEB.root) o.visible = true; else o.layers.set(31); } moved.length = 0; };
    const draw = O.__realRender || O.render, xrWas = O.xr.enabled, W = O.domElement.width, H = O.domElement.height;
    const found = new Set();
    for (const v of views) {
      O.xr.enabled = false; O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
      O.setViewport(0, 0, 64, 64); O.setScissor(0, 0, 64, 64); O.setScissorTest(true);
      cam.position.set(v[0], v[1], v[2]);
      if (v.length > 5) { cam.fov = v[6]; cam.near = 0.05; cam.far = v[7]; cam.updateProjectionMatrix(); cam.lookAt(v[3], v[4], v[5]); S.only = byKey.get(v[8]) || null; }
      else { cam.fov = 100; cam.near = 0.1; cam.far = 310; cam.updateProjectionMatrix(); cam.rotation.set(v[4], v[3], 0, 'YXZ'); S.only = null; }
      cam.updateMatrixWorld(true);
      unbatch(); S.on = true;
      try { draw.call(O, C, cam); } finally { S.on = false; S.only = null; rebatch(); O.setScissorTest(false); O.setViewport(0, 0, W, H); O.xr.enabled = xrWas; }
    }
    gl.flush();
    let tries = 0;
    while (S.pending.length && tries++ < 400) {
      await new Promise((r) => setTimeout(r, 5));
      const left = [];
      for (const [o, q] of S.pending) { if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { left.push([o, q]); continue; } if (gl.getQueryParameter(q, gl.QUERY_RESULT)) found.add(o.__occIt.key); gl.deleteQuery(q); }
      S.pending = left;
    }
    return [...found];
  }, views);
}

(async () => {
  const STATES = ['town', 'event'];
  let objects = null, survivors = null;   // survivors: keys never seen so far (across states)
  for (const state of STATES) {
    const st = prog.states[state] = prog.states[state] || { seen: [], doneA: 0, doneB: {} };
    console.log(`\n=== state: ${state} (${mins()} min) ===`);
    const pages = [];
    for (let w = 0; w < WORKERS; w++) pages.push(boot({ file, vr: true, fastSim: true }));
    const gs = await Promise.all(pages);
    const preps = await Promise.all(gs.map((g) => prepare(g.page, state)));
    const P0 = preps[0];
    if (preps.some((p) => p.objects.length !== P0.objects.length)) console.log(`  NOTE: the workers list different object counts ${preps.map((p) => p.objects.length)} (keys are matched by content)`);
    console.log(`  reachable: ${P0.reach} cells of 0.5 m; church interior reached: ${P0.church}; judged objects: ${P0.objects.length}; pass A viewpoints: ${P0.ptsA.length}`);
    if (P0.church === false) { console.log('OCCLUSION CENSUS FAILED: the reachable area does not include the church interior'); process.exit(1); }
    const info = new Map(P0.objects.map((o) => [o.key, o]));
    if (!objects) objects = info;
    const seen = new Set(st.seen);
    const mark = (keys) => { for (const k of keys) seen.add(k); st.seen = [...seen]; save(); };
    // judged here: objects shown in this state and not yet seen in an earlier state
    // only objects every worker lists with the same key are judged: a key that differs between boots is moving
    const inAll = new Set(P0.objects.map((o) => o.key).filter((k) => preps.every((p) => p.objects.some((x) => x.key === k))));
    const moving = P0.objects.length - inAll.size; if (moving) console.log(`  ${moving} objects move (their key differs between boots): not judged, kept`);
    const judged = [...inAll].filter((k) => !survivors || survivors.has(k) || !objects.has(k));
    for (const [k, o] of info) if (!objects.has(k)) objects.set(k, o);
    // pass A
    const dirs = []; for (let k = 0; k < 8; k++) for (const p of [-0.4, 0.4]) dirs.push([k * Math.PI / 4, p]);
    const viewsA = []; for (const [x, z] of P0.ptsA) for (const h of [1.6]) for (const [yaw, pitch] of dirs) viewsA.push([x, h, z, yaw, pitch]);
    const CH = 96;
    const chunksA = []; for (let i = st.doneA; i < viewsA.length; i += CH) chunksA.push(i);
    console.log(`  pass A: ${viewsA.length} wide views${st.doneA ? ` (resuming at ${st.doneA})` : ''}`);
    let next = 0;
    await Promise.all(gs.map(async (g) => { while (next < chunksA.length) { const i = chunksA[next++]; mark(await render(g.page, viewsA.slice(i, i + CH))); st.doneA = Math.max(st.doneA, i + CH); save(); } }));
    const unseenA = judged.filter((k) => !seen.has(k));
    console.log(`  pass A done (${mins()} min): ${judged.length - unseenA.length} of ${judged.length} seen; ${unseenA.length} to check exhaustively`);
    // pass B: per object, every reachable point, nearest first
    const reach = await gs[0].page.evaluate(() => window.__occ.reach);
    const queue = unseenA.filter((k) => st.doneB[k] === undefined);
    let qi = 0, done = 0;
    await Promise.all(gs.map(async (g) => {
      while (qi < queue.length) {
        const k = queue[qi++], o = info.get(k); if (!o) { st.doneB[k] = 'gone'; continue; }
        const [cx, cy, cz] = o.c;
        const pts = reach.filter(([x, z]) => { const d = Math.hypot(x - cx, z - cz); return d < 15 ? (x % 1 === 0 && z % 1 === 0) : (x % 2 === 0 && z % 2 === 0); })
          .map(([x, z]) => [x, z, Math.hypot(x - cx, z - cz)]).sort((a, b) => a[2] - b[2]);
        const views = [];
        for (const [x, z] of pts) for (const h of [1.0, 1.6, 2.2]) {
          const d = Math.hypot(x - cx, h - cy, z - cz); if (d < 0.01) continue;
          const fov = Math.min(100, Math.max(1, 2 * Math.atan(Math.min(0.99, (o.r * 1.25) / d)) * 180 / Math.PI));
          views.push([x, h, z, cx, cy, cz, fov, d + o.r * 1.5 + 0.5, k]);
        }
        let hit = false;
        for (let i = 0; i < views.length && !hit; i += 200) { const f = await render(g.page, views.slice(i, i + 200)); if (f.includes(k)) hit = true; }
        st.doneB[k] = hit ? 'seen' : 'never'; if (hit) seen.add(k); st.seen = [...seen]; save();
        if (++done % 10 === 0) console.log(`  pass B: ${done} / ${queue.length} checked (${mins()} min)`);
      }
    }));
    const never = judged.filter((k) => !seen.has(k) && st.doneB[k] === 'never');
    survivors = new Set(never.concat(survivors ? [...survivors].filter((k) => !info.has(k)) : []));
    console.log(`  ${state}: never seen after both passes: ${never.length}`);
    await Promise.all(gs.map((g) => g.close()));
  }
  // the list: never seen in any state where it was shown
  const out = [...survivors].map((k) => objects.get(k)).filter(Boolean);
  const own = out.filter((o) => !o.batched), inB = out.filter((o) => o.batched), sum = (l) => l.reduce((a, o) => a + o.tris, 0);
  const band = (o) => Math.hypot(o.c[0], o.c[2]) > 56 ? 'beyond the park (more than 56 m out)' : o.c[1] < 0 ? 'below the ground' : 'inside the park or its buildings';
  console.log(`\nNEVER SEEN, in any state: ${out.length} objects (${own.length} drawn on their own: ${sum(own)} triangles, a draw call each; ${inB.length} inside batches: ${sum(inB)} triangles)`);
  const groups = {}; for (const o of out) (groups[band(o)] = groups[band(o)] || []).push(o);
  for (const [b, l] of Object.entries(groups)) { console.log(`  ${b}: ${l.length}, ${sum(l)} triangles`); for (const o of l.sort((a, c) => c.tris - a.tris).slice(0, 15)) console.log(`    ${o.tris} tris at (${o.c.map((v) => v.toFixed(1)).join(', ')})${o.batched ? ' [batched]' : ''} ${o.where}`); }
  fs.writeFileSync(path.join(RUNS, 'occlusion_census.json'), JSON.stringify({ date: new Date().toISOString(), states: STATES, never: out }, null, 1));
  console.log(`written to tools/.runs/occlusion_census.json (${mins()} min)`);
  console.log('OCCLUSION CENSUS DONE');
})().catch((e) => { console.error(e); process.exit(1); });
