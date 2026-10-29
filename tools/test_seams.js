// Seams (graphical pass, the author's 3.15.56 report: "On the sides of the houses, where the wall meets the triangle of
// the roof, a slight flicker is present on this edge"): a static analysis of the built world, the complement of
// test_zfight.js. Two flat pieces in the same world plane that meet along a line, without overlapping, are drawn as
// one surface only if their shared edge is made of the same vertices on both sides. Where a corner of one piece lies
// partway along the other's edge (a T-junction), the two edges are rasterised from different end points and leave
// pinholes along the line: the background shows through as a dotted crack that sparkles when the head moves (the ring
// houses' gables met their walls so until 3.15.57, FIXES F-B47).
//
// Every visible, non-UI triangle is bucketed by its world plane as in test_zfight.js. Inside a bucket, two triangles
// (also within one mesh: the builders merge a house's pieces into one geometry) that do not overlap but have collinear edges sharing more than
// 2 cm, with end points that differ by more than 0.5 mm, are a T-junction seam, unless a third triangle (or one piece on
// both sides) spans the line there. Seams whose every contact is under 5 cm (letters, small trim) are listed only, as are seams on surfaces whose surface faces away from every eye point in the fence (1.2-1.9 m up), are never seen and are listed only; every other seam fails the pass unless accepted in
// tools/seams_baseline.json (by its pair name).
//
//   node tools/test_seams.js [file] [--limit N] [--baseline tools/seams_baseline.json]
const path = require('path');
const fs = require('fs');
const { boot, reporter } = require('./lib/harness');

const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const limit = +(process.argv.find((a, i) => process.argv[i - 1] === '--limit') || 40);
const baselinePath = process.argv.find((a, i) => process.argv[i - 1] === '--baseline') || path.join(__dirname, 'seams_baseline.json');
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : { accepted: [] };

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false });
  const r = await g.page.evaluate(({ limit }) => {
    const D = window.__dbg, C = D.C, T = window.THREE;
    const Q = 1000;                                   // plane quantisation: 1 mm and 0.001 in the normal
    const buckets = new Map(); let tris = 0, meshes = 0, skipped = 0;
    const v = [new T.Vector3(), new T.Vector3(), new T.Vector3()], n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    const handled = (m) => !!(m && (m.polygonOffset || m.depthTest === false || m.depthWrite === false || m.transparent));
    C.updateMatrixWorld(true);
    // The batcher merges small meshes into batch meshes whose geometry is stored per part in local space
    // and placed by per-part uniforms in the vertex shader, so a batch mesh's vertices are not world
    // positions. The merged sources stay in the scene, parked on layer 31 with live world matrices, so the
    // world geometry is every drawn layer-0 mesh that is not a batch mesh, plus every parked source.
    let batchMeshes = 0, parked = 0;
    C.traverse((o) => {
      if (!o.isMesh || !o.visible || o.userData.xrUI) return;
      const onScreen = (o.layers.mask & 1) !== 0, isParked = (o.layers.mask & (1 << 31)) !== 0;
      if (!onScreen && !isParked) return;
      if (o.geometry.attributes.gcPart) { batchMeshes++; return; }
      let p = o; while (p) { if (p.visible === false || p.userData.xrUI) return; p = p.parent; }
      const geo = o.geometry, pos = geo.attributes.position; if (!pos) return;
      const count = geo.index ? geo.index.count : pos.count;
      if (count > 600000) { skipped++; return; }
      meshes++; if (isParked) parked++;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const groups = geo.groups && geo.groups.length ? geo.groups : [{ start: 0, count, materialIndex: 0 }];
      const inst = o.isInstancedMesh ? o.count : 1; const im = new T.Matrix4(), mw = new T.Matrix4();
      for (let k = 0; k < inst; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, im); mw.multiplyMatrices(o.matrixWorld, im); } else mw.copy(o.matrixWorld);
        for (const gr of groups) {
          const mat = mats[gr.materialIndex] || mats[0];
          for (let i = gr.start; i + 2 < gr.start + gr.count; i += 3) {
            for (let j = 0; j < 3; j++) { const idx = geo.index ? geo.index.getX(i + j) : i + j; v[j].fromBufferAttribute(pos, idx).applyMatrix4(mw); }
            e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); n.crossVectors(e1, e2);
            const area2 = n.length(); if (area2 < 1e-5) continue; n.divideScalar(area2);
            // Only roughly horizontal or vertical faces matter for the eye (walls, floors, signs, decals); skip tiny slivers.
            if (area2 < 2e-4) continue;
            const d = n.dot(v[0]);
            const key = Math.round(n.x * Q) + ',' + Math.round(n.y * Q) + ',' + Math.round(n.z * Q) + ',' + Math.round(d * Q);
            let b = buckets.get(key); if (!b) buckets.set(key, b = []);
            // Keep the triangle in plane coordinates (u,v) for the overlap test.
            const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z); const drop = ax > ay && ax > az ? 'x' : ay > az ? 'y' : 'z';
            const pts = v.map((p) => drop === 'x' ? [p.y, p.z] : drop === 'y' ? [p.x, p.z] : [p.x, p.y]);
            b.push({ mesh: o, inst: k, part: -1, src: null, pts, w: v.map((p) => [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)]), mat, c: [(v[0].x + v[1].x + v[2].x) / 3, (v[0].y + v[1].y + v[2].y) / 3, (v[0].z + v[1].z + v[2].z) / 3] });
            tris++;
          }
        }
      }
    });
        const label = (o) => { if (!o) return '?'; const n = o.name || (o.userData && (o.userData.kind || o.userData.name)); const col = o.material && o.material.color ? '#' + o.material.color.getHexString() : ''; const cn = o.constructor && o.constructor.name; return (n || cn || o.type || '?') + (col ? col : ''); };
    const nameOf = (t) => (t.src ? 'batch:' + label(t.src) + '@' + [t.src.position.x, t.src.position.z].map((x) => x.toFixed(0)).join(',') : label(t.mesh) + (t.mesh.parent ? ' in ' + label(t.mesh.parent) : '')) + (t.mesh.isInstancedMesh ? '#' + t.inst : '');
    const EPS = 0.0005, MINLEN = 0.02;
    // the part of edge (p,q) of B that lies on the line of edge (a,b) of A, as an interval along A's edge (metres)
    const shared = (a, b, p, q) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < MINLEN) return null;
      const ux = dx / L, uy = dy / L, off = (s) => Math.abs((s[0] - a[0]) * uy - (s[1] - a[1]) * ux);
      if (off(p) > EPS || off(q) > EPS) return null;
      const tp = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy, tq = (q[0] - a[0]) * ux + (q[1] - a[1]) * uy;
      const lo = Math.max(0, Math.min(tp, tq)), hi = Math.min(L, Math.max(tp, tq));
      if (hi - lo < MINLEN) return null;
      const ends = [0, L], other = [tp, tq], match = (x, list) => list.some((y) => Math.abs(x - y) < EPS);
      // the same edge on both sides (or one edge's ends both on the other's ends): watertight
      if (match(tp, ends) && match(tq, ends)) return null;
      return { len: hi - lo, t: (lo + hi) / 2, ux, uy, a };
    };
    const found = new Map();
    for (const [key, b] of buckets) {
      if (b.length < 2) continue;
      for (let i = 0; i < b.length && i < 600; i++) for (let j = i + 1; j < b.length && j < 600; j++) {
        const A = b[i], B = b[j];   // pairs inside one mesh count too: merged pieces (a house's walls and gables) share no vertices
        // ...but two triangles of one mesh that share a corner belong to one piece, whose own triangulation is watertight
        if (A.mesh === B.mesh && A.inst === B.inst && A.w.some((p) => B.w.some((q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 1e-4))) continue;
        let best = null;
        for (let e = 0; e < 3 && !best; e++) for (let f = 0; f < 3 && !best; f++) {
          const pairs = [[A, e, B, f], [B, f, A, e]];
          for (const [P, i, Q2, j] of pairs) {
            if (best) break;
            const h = shared(P.pts[i], P.pts[(i + 1) % 3], Q2.pts[j], Q2.pts[(j + 1) % 3]);
            if (h) { const a = P.w[i], b2 = P.w[(i + 1) % 3], L = Math.hypot(b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]), k = h.t / L, a2 = P.pts[i], c2 = P.pts[(i + 1) % 3]; best = { ...h, mid: [a[0] + (b2[0] - a[0]) * k, a[1] + (b2[1] - a[1]) * k, a[2] + (b2[2] - a[2]) * k], mid2: [a2[0] + (c2[0] - a2[0]) * k, a2[1] + (c2[1] - a2[1]) * k] }; }
          }
        }
        if (!best) continue;
        // covered: a third triangle of the same plane spans the line there (a disc over a box's end), so no crack shows
        const inside = (t, q) => { let s0 = 0; for (let i = 0; i < 3; i++) { const p0 = t[i], p1 = t[(i + 1) % 3], e = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, d = ((p1[0] - p0[0]) * (q[1] - p0[1]) - (p1[1] - p0[1]) * (q[0] - p0[0])) / e; if (Math.abs(d) < 0.0005) return false; s0 += Math.sign(d); } return Math.abs(s0) === 3; };
        if (b.some((t) => t !== A && t !== B && inside(t.pts, best.mid2))) continue;
        // ...or one piece has triangles on both sides of the line (a disc whose diameter lies on a box's edge)
        { const o = 0.002, q1 = [best.mid2[0] - best.uy * o, best.mid2[1] + best.ux * o], q2 = [best.mid2[0] + best.uy * o, best.mid2[1] - best.ux * o];
          const pk = (t) => t.mesh.id + ':' + t.inst, s1 = new Set(b.filter((t) => inside(t.pts, q1)).map(pk));
          if (b.some((t) => s1.has(pk(t)) && inside(t.pts, q2))) continue; }
        const k = [nameOf(A), nameOf(B)].sort().join(' vs ') + ' @' + Math.round(A.c[0] / 4) * 4 + ',' + Math.round(A.c[2] / 4) * 4;   // by pair and 4 m cell (merged scenery shares one name)
        // never seen: the surface faces away from every eye the player can have (inside the fence, 1.2-1.9 m up)
        const nn = key.split(',').slice(0, 3).map((x) => +x / 1000), eyesN = [];
        for (const x of [-37.6, 0, 37.6]) for (const z of [-37.6, 6, 49.6]) for (const y of [1.2, 1.9]) eyesN.push([x, y, z]);
        const down = !eyesN.some((e) => (e[0] - A.c[0]) * nn[0] + (e[1] - A.c[1]) * nn[1] + (e[2] - A.c[2]) * nn[2] > 0.005);
        const f = found.get(k) || { pair: k, n: 0, len: 0, at: best.mid.map((x) => +x.toFixed(2)), down, y: A.c[1], edge: [A.w, B.w], normal: nn, mids: [] };
        if (f.mids.length < 4) f.mids.push(best.mid);
        f.n++; f.len += best.len; f.max = Math.max(f.max || 0, best.len); found.set(k, f);
      }
    }
    const list = [...found.values()].sort((a, b) => b.len - a.len).map((f) => ({ ...f, len: +f.len.toFixed(2) }));
    const O = D.O, gl = O.getContext(), px = 24, buf = new Uint8Array(px * px * 4), cam = new T.PerspectiveCamera(1.2, 1, 0.3, 400);
    const mk = new T.Mesh(new T.SphereGeometry(1, 8, 6), new T.MeshBasicMaterial({ color: 0xff00ff, fog: false })); mk.frustumCulled = false; C.add(mk);
    // eye points where the player can stand: a 6 m grid in the fence, clear of every building by 0.8 m, and the Cave
    const blds = (D.F && D.F.buildings) || [], clear = (x, z) => !blds.some((B) => D.F.inHull(B, x, z, 0.8));
    const eyes = []; for (let x = -36; x <= 36; x += 6) for (let z = -36; z <= 48; z += 6) if (clear(x, z)) for (const y of [1.25, 1.85]) eyes.push([x, y, z]);
    for (let x = -4.5; x <= 4.5; x += 1.5) for (let z = 33; z <= 47; z += 2) eyes.push([x, 1.6, z]);   // the Cave (the church's inside)
    const seenFrom = (p, n) => {
      const cands = eyes.filter((e) => (e[0] - p[0]) * n[0] + (e[1] - p[1]) * n[1] + (e[2] - p[2]) * n[2] > 0.05).map((e) => [e, Math.hypot(e[0] - p[0], e[1] - p[1], e[2] - p[2])]).filter(([, d]) => d < 90).sort((a, b) => a[1] - b[1]).slice(0, 40);
      for (const [e, d] of cands) {
        mk.position.set(p[0] + n[0] * 0.003, p[1] + n[1] * 0.003, p[2] + n[2] * 0.003); mk.scale.setScalar(Math.max(0.01, d * 0.0012));
        cam.position.set(e[0], e[1], e[2]); cam.lookAt(mk.position); cam.updateMatrixWorld(true);
        const xr = O.xr.enabled; O.xr.enabled = false; O.setRenderTarget(null); const W = O.domElement.width, H = O.domElement.height;
        O.setViewport(0, 0, px, px); O.setScissor(0, 0, px, px); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false);
        gl.readPixels(0, 0, px, px, gl.RGBA, gl.UNSIGNED_BYTE, buf); O.setViewport(0, 0, W, H); O.xr.enabled = xr;
        for (let i = 0; i < buf.length; i += 4) if (buf[i] > 240 && buf[i + 1] < 20 && buf[i + 2] > 240) return e;
      }
      return null;
    };
    for (const f of list) { if (f.down) continue; let from = null; for (const m of f.mids) { from = seenFrom(m, f.normal); if (from) break; } f.seenFrom = from; if (!from) f.down = 'occluded'; }
    C.remove(mk);
    return { tris, meshes, buckets: buckets.size, list };
  }, { limit });
  await g.close();
  const accepted = new Set(baseline.accepted || []);
  const tiny = r.list.filter((f) => !f.down && f.max < 0.05), seen = r.list.filter((f) => !f.down && f.max >= 0.05), hidden = r.list.filter((f) => f.down);
  const fresh = seen.filter((f) => !accepted.has(f.pair));
  note(`${r.meshes} meshes, ${r.tris} planar triangles in ${r.buckets} plane buckets; ${r.list.length} T-junction seams (${tiny.length} detail-sized: every contact under 5 cm, letters and small trim, listed only; ${hidden.length} facing away from everywhere the player can be, ${seen.length - fresh.length} accepted)`);
  for (const f of fresh.slice(0, limit)) console.log(`  seam  ${f.pair}  ${f.n} edge pairs, ${f.len} m  near (${f.at.join(', ')}), facing (${f.normal.join(', ')}), seen from (${f.seenFrom})${process.env.SEAMS_EDGES ? '  A ' + JSON.stringify(f.edge[0]) + ' B ' + JSON.stringify(f.edge[1]) : ''}`);
  for (const f of tiny.slice(0, 8)) console.log(`  tiny  ${f.pair}  ${f.n} contacts, the longest ${(f.max * 100).toFixed(1)} cm, near (${f.at.join(', ')})`);
  for (const f of hidden.slice(0, process.env.SEAMS_EDGES ? 99 : 5)) console.log(`  hid   ${f.pair}  ${f.len} m  near (${f.at.join(', ')}), ${f.down === 'occluded' ? 'hidden behind other geometry from every eye point' : 'never faces the player'}`);
  expect('no T-junction seam between two pieces of one surface (dotted cracks that sparkle)', fresh.length === 0, `${fresh.length} seams; the longest: ${fresh.slice(0, 3).map((f) => f.pair + ' ' + f.len + ' m').join(' | ')}`);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `SEAMS TEST FAILED (${failures.length})` : 'SEAMS TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
