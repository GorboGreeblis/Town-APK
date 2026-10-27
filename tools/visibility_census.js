// Visibility census (report): which geometry the player can ever see. Every opaque mesh (batch parts
// drawn as their own meshes) is drawn in a unique ID colour; the town is rendered from a grid of standable
// positions (inside the park, clear of the obstacle circles, outside every building hull) at three eye heights, six
// directions each (a full cube of 90-degree views), and the pixels each mesh gets are counted.
//
// Output:
//   - meshes never seen from any position, with their triangles (geometry drawn for nothing: candidates
//     for removal with no visible change, after a look at each one);
//   - meshes by triangles per largest on-screen size (many triangles that never cover more than a few
//     pixels: level-of-detail candidates; those change the look and are the author's call);
//   - the share of the scene's triangles in each class.
//
//   node tools/visibility_census.js [file] [--step 3] [--res 256] [--json out]
const path = require('path');
const fs = require('fs');
const { boot, root } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const step = +arg('--step', 3), res = +arg('--res', 256);
const jsonOut = arg('--json', path.join(root, 'tools/.runs/visibility_census.json'));
(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  const r = await page.evaluate(async ({ step, res }) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), t = D.t;
    const xrWas = O.xr.enabled, rtWas = O.getRenderTarget(); O.xr.enabled = false; O.state.bindXRFramebuffer(null);  // see opt_identity.js
    // Freeze the game: the census renders directly and never yields, so nothing moves meanwhile.
    // Batches off: every live part back on its own mesh.
    const restore = [];
    for (const b of D.gcEB.list) { restore.push(() => { b.mesh.visible = true; }); b.mesh.visible = false; for (const p of b.P) if (p.on) { const o = p.o; restore.push(() => o.layers.set(31)); o.layers.set(0); } }
    // ID materials.
    const meshes = []; const idOf = new Map();
    C.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      const m = o.material; const mats = Array.isArray(m) ? m : [m];
      let vis = true; let p = o; while (p) { if (!p.visible) { vis = false; break; } p = p.parent; }
      const opaque = o.isMesh && mats.every((x) => x && !x.transparent && x.visible !== false && x.colorWrite !== false);
      const orig = o.material; restore.push(() => { o.material = orig; });
      if (!vis || !opaque || !(o.layers.mask & 1)) { o.material = new T.MeshBasicMaterial({ visible: false }); return; }
      const id = meshes.length + 1; const col = new T.Color((id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255);
      const mk = (x) => new T.MeshBasicMaterial({ color: col, side: x.side, depthTest: x.depthTest, depthWrite: x.depthWrite, polygonOffset: x.polygonOffset, polygonOffsetFactor: x.polygonOffsetFactor, polygonOffsetUnits: x.polygonOffsetUnits, toneMapped: false });
      o.material = Array.isArray(orig) ? orig.map(mk) : mk(orig);
      const geo = o.geometry; const tris = geo ? Math.round((geo.index ? geo.index.count : geo.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1) : 0;
      let top = o; while (top.parent && top.parent !== C) top = top.parent;
      const names = []; let q = o; while (q && q !== C) { if (q.name) names.push(q.name); q = q.parent; }
      const ent = D.It.all.find((e) => { let z = o; while (z) { if (z === e.group) return true; z = z.parent; } return false; });
      const wp = o.getWorldPosition(new T.Vector3());
      meshes.push({ id, tris, top: C.children.indexOf(top), name: names.slice(0, 3).join('<'), ent: ent && ent.def ? ent.def.name : '', batched: o.layers.mask === 1 && D.gcEB.list.some((b) => b.P.some((x) => x.o === o)), custom: !!(Array.isArray(orig) ? orig[0].onBeforeCompile : orig.onBeforeCompile) && (Array.isArray(orig) ? orig[0] : orig).onBeforeCompile !== D.gcEB.obc, pos: [+wp.x.toFixed(1), +wp.y.toFixed(1), +wp.z.toFixed(1)], px: 0, maxPx: 0, views: 0 });
      idOf.set(o, id);
    });
    const bgWas = C.background, fogWas = C.fog; C.background = new T.Color(0, 0, 0); C.fog = null;
    O.setRenderTarget(null); const W = O.domElement.width, H = O.domElement.height; if (W < res || H < res) throw new Error('canvas ' + W + 'x' + H + ' smaller than ' + res); const buf = new Uint8Array(res * res * 4);
    const cam = new T.PerspectiveCamera(90, 1, 0.05, 500);
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
    const half = t.parkHalf - 1, south = t.parkSouth - 1;
    const points = []; let views = 0, blankViews = 0; const seen = new Uint32Array(meshes.length + 1), counts = new Uint32Array(meshes.length + 1);
    for (let x = -half; x <= half; x += step) for (let z = -half; z <= south; z += step) {
      if (!D.E.clear(x, z, 0.3)) continue;
      if (D.F && D.F.buildings && D.F.buildings.some((B) => D.F.inHull(B, x, z, 0.3))) continue;
      points.push([x, z]);
      for (const h of [0.7, 1.6, 2.1]) for (const d of dirs) {
        cam.position.set(x, h, z); cam.up.set(0, d[1] ? 0 : 1, d[1] ? 1 : 0); cam.lookAt(x + d[0], h + d[1], z + d[2]); cam.updateMatrixWorld(true);
        O.setViewport(0, 0, res, res); O.setScissor(0, 0, res, res); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false); gl.readPixels(0, 0, res, res, gl.RGBA, gl.UNSIGNED_BYTE, buf); views++;
        counts.fill(0); let any = false; for (let i = 0; i < buf.length; i += 4) if (buf[i] | buf[i + 1] | buf[i + 2]) { any = true; break; } if (!any) blankViews++;
        for (let i = 0; i < buf.length; i += 4) { const id = buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16); if (id) counts[id]++; }
        for (let id = 1; id <= meshes.length; id++) if (counts[id]) { const m = meshes[id - 1]; m.px += counts[id]; if (counts[id] > m.maxPx) m.maxPx = counts[id]; m.views++; }
      }
    }
    O.setRenderTarget(rtWas); O.xr.enabled = xrWas; C.background = bgWas; C.fog = fogWas; for (const f of restore.reverse()) f(); O.setViewport(0, 0, W, H);
    return { meshes, points: points.length, views, blankViews };
  }, { step, res });
  const ms = r.meshes, total = ms.reduce((a, m) => a + m.tris, 0);
  const never = ms.filter((m) => m.views === 0), neverT = never.reduce((a, m) => a + m.tris, 0);
  console.log(`census: ${r.points} standable positions x 3 heights x 6 directions = ${r.views} views at ${res}px, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`opaque meshes ${ms.length}, triangles ${total}; views with nothing in them: ${r.blankViews} (looking straight up at open sky is expected)`);
  if (r.blankViews > r.views * 0.3) { console.log('CENSUS INVALID: too many blank views (renders are not reaching the canvas)'); await g.close(); process.exit(1); }
  console.log(`never seen: ${never.length} meshes, ${neverT} triangles (${(100 * neverT / total).toFixed(1)}% of opaque triangles)`);
  const grp = (list) => { const m = {}; for (const x of list) { const k = (x.ent ? 'creature ' + x.ent : 'top #' + x.top) + (x.name ? ' ' + x.name : ''); const v = m[k] = m[k] || { n: 0, tris: 0, batched: 0, ex: x.pos }; v.n++; v.tris += x.tris; v.batched += x.batched ? 1 : 0; } return Object.entries(m).sort((a, b) => b[1].tris - a[1].tris); };
  for (const [k, v] of grp(never).slice(0, 25)) console.log(`  ${String(v.tris).padStart(7)} tris  ${String(v.n).padStart(4)} meshes (${v.batched} batched)  ${k}  e.g. at ${v.ex.join(',')}`);
  // Level-of-detail candidates: triangles per pixel of the largest view the mesh ever gets (1 px at 256 over
  // 90 degrees is about 7 headset pixels across).
  const lod = ms.filter((m) => m.views > 0 && m.tris >= 500).map((m) => ({ ...m, tpp: m.tris / m.maxPx })).sort((a, b) => b.tris * Math.min(1, b.tpp) - a.tris * Math.min(1, a.tpp));
  console.log('largest triangle counts against the most screen they ever cover (triangles per pixel of their largest view):');
  for (const m of lod.slice(0, 20)) console.log(`  ${String(m.tris).padStart(7)} tris  max ${String(m.maxPx).padStart(6)} px  ${m.tpp.toFixed(2)} tris/px  seen in ${m.views} views  ${m.ent ? 'creature ' + m.ent : 'top #' + m.top} ${m.name}${m.custom ? ' (custom shader)' : ''} at ${m.pos.join(',')}`);
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true }); fs.writeFileSync(jsonOut, JSON.stringify(r, null, 1));
  if (g.errors.length) console.log('page errors: ' + g.errors.join(' | '));
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
