// Near-coincident surfaces (graphical pass, T13): the curved-surface complement of
// test_zfight.js. The planar test only sees two faces in the same world plane; a
// flat light lying tangent on a round cuff (B20), a strap resting a hair above a
// blob body, or a sign a millimetre off a curved wall never share a plane, yet
// they are drawn at (nearly) the same depth along a band, and the headset resolves
// that band differently from frame to frame. This is a geometric test, not a
// rendered one: the headless renderer's depth precision is finer than the Quest's,
// so such bands do not flicker here (the pre-B20 cuff did not).
//
// Every triangle of a visible, non-UI mesh up to 0.6 m across goes into a 5 cm
// spatial hash. Pairs from different surfaces (different mesh, instance or batch
// part) with different looks and nearly parallel normals are sampled: points of
// one triangle, 2 mm apart, that lie within `tol` (0.5 mm) of the other's plane
// and inside it are near-coincident. Counting the points again at a fifth of
// the tolerance tells a coplanar or tangent contact (a depth fight, fails the
// pass) from two surfaces crossing at an angle (an ordinary intersection line,
// listed only). Same-look pairs (invisible fights) are listed, not failed.
// Depth fights the author has looked at and accepted live in
// tools/zfight_baseline.json with the reason; only new ones fail.
//
//   node tools/test_coincident.js [file] [--tol 0.0005] [--limit N] [--save] [--dump WHERE] [--baseline tools/zfight_baseline.json]
//   (--save: a picture per pair in tools/.runs/coinc/, context view and close-up; --dump: print the triangles of the pairs at WHERE)
const path = require('path');
const fs = require('fs');
const { boot, reporter } = require('./lib/harness');

const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const tol = +(process.argv.find((a, i) => process.argv[i - 1] === '--tol') || 0.0005);
const limit = +(process.argv.find((a, i) => process.argv[i - 1] === '--limit') || 40);
const save = process.argv.includes('--save');
const dump = process.argv.find((a, i) => process.argv[i - 1] === '--dump') || '';
const baselinePath = process.argv.find((a, i) => process.argv[i - 1] === '--baseline') || path.join(__dirname, 'zfight_baseline.json');
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : { accepted: [] };
const outDir = path.join(__dirname, '.runs', 'coinc');

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false });
  if (process.env.COINC_DEBUG) g.page.on('console', (m) => console.log('  [page]', m.text()));
  const r = await g.page.evaluate(({ tol, limit, save, dump }) => {
    const D = window.__dbg, C = D.C, T = window.THREE;
    const CELL = 0.05, MAXEXT = 0.6, COS = Math.cos(15 * Math.PI / 180);
    // Pass 1: the drawn meshes (layer 0, visible, not UI) and their triangle total, so the triangle
    // store can be typed arrays (the town has about 800k drawn triangles; objects per triangle would
    // exhaust the page).
    // The batcher merges small meshes into batch meshes whose geometry is stored in each part's local
    // space and placed by per-part uniforms in the vertex shader (`gcR`), so a batch mesh's vertices say
    // nothing about where its parts are. The merged source meshes stay in the scene, parked on layer 31
    // with live world matrices (the batch copies them every frame), so the real world geometry is: every
    // drawn layer-0 mesh that is not a batch mesh, plus every parked source.
    const drawn = []; let skippedHuge = 0, batchMeshes = 0, parked = 0;
    C.updateMatrixWorld(true);
    C.traverse((o) => {
      if (!o.isMesh || !o.visible || o.userData.xrUI) return;
      const onScreen = (o.layers.mask & 1) !== 0, isParked = (o.layers.mask & (1 << 31)) !== 0;
      if (!onScreen && !isParked) return;
      if (o.geometry.attributes.gcPart) { batchMeshes++; return; }
      let p = o; while (p) { if (p.visible === false || p.userData.xrUI) return; p = p.parent; }
      const geo = o.geometry, pos = geo.attributes.position; if (!pos) return;
      const count = geo.index ? geo.index.count : pos.count; if (count > 600000) { skippedHuge++; return; }
      if (isParked) parked++;
      drawn.push(o);
    });
    let total = 0; for (const o of drawn) total += ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 | 0) * (o.isInstancedMesh ? o.count : 1);
    const P = new Float32Array(total * 9), NV = new Float32Array(total * 4), BB = new Float32Array(total * 6);
    const OWN = new Int32Array(total), LOOK = new Int32Array(total), MESH = new Int32Array(total), PART = new Int32Array(total), INST = new Int32Array(total), MAT = new Int32Array(total);
    const mats = [], matId = new Map(), looks = [], lookId = new Map(), owners = new Map();
    const lookOf = (m) => (m.type || '?') + (m.color ? '#' + m.color.getHexString() : '') + (m.emissive ? '/e' + m.emissive.getHexString() : '') + (m.map ? '/map' + m.map.uuid.slice(0, 8) : '') + (m.vertexColors ? '/vc' : '');
    const label = (o) => { if (!o) return '?'; const nm = o.name || (o.userData && (o.userData.kind || o.userData.name)); const col = o.material && o.material.color ? '#' + o.material.color.getHexString() : ''; return (nm || (o.constructor && o.constructor.name) || o.type || '?') + col; };
    const chainOf = (o) => { const ch = []; let q = o; while (q && q !== C && ch.length < 6) { ch.push(q.name || (q.constructor && q.constructor.name) || q.type); q = q.parent; } return ch.join('<'); };
    const v = [new T.Vector3(), new T.Vector3(), new T.Vector3()], n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    let nt = 0, skippedBig = 0;
    drawn.forEach((o, mi) => {
      const geo = o.geometry, pos = geo.attributes.position, count = geo.index ? geo.index.count : pos.count;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const groups = geo.groups && geo.groups.length ? geo.groups : [{ start: 0, count, materialIndex: 0 }];
      const inst = o.isInstancedMesh ? o.count : 1; const im = new T.Matrix4(), mw = new T.Matrix4();
      for (let k = 0; k < inst; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, im); mw.multiplyMatrices(o.matrixWorld, im); } else mw.copy(o.matrixWorld);
        for (const gr of groups) {
          const mat = ms[gr.materialIndex] || ms[0]; if (!mat || mat.visible === false) continue;
          let mid = matId.get(mat); if (mid === undefined) { matId.set(mat, mid = mats.length); mats.push(mat); }
          const lk = lookOf(mat); let lid = lookId.get(lk); if (lid === undefined) { lookId.set(lk, lid = looks.length); looks.push(lk); }
          for (let i = gr.start; i + 2 < gr.start + gr.count; i += 3) {
            for (let j = 0; j < 3; j++) { const idx = geo.index ? geo.index.getX(i + j) : i + j; v[j].fromBufferAttribute(pos, idx).applyMatrix4(mw); }
            e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); n.crossVectors(e1, e2);
            const area2 = n.length(); if (area2 < 1e-7) continue; n.divideScalar(area2);
            const mnx = Math.min(v[0].x, v[1].x, v[2].x), mny = Math.min(v[0].y, v[1].y, v[2].y), mnz = Math.min(v[0].z, v[1].z, v[2].z);
            const mxx = Math.max(v[0].x, v[1].x, v[2].x), mxy = Math.max(v[0].y, v[1].y, v[2].y), mxz = Math.max(v[0].z, v[1].z, v[2].z);
            if (Math.max(mxx - mnx, mxy - mny, mxz - mnz) > MAXEXT) { skippedBig++; continue; }
            const part = -1;
            const ok = o.id + ':' + k + ':' + part; let oid = owners.get(ok); if (oid === undefined) owners.set(ok, oid = owners.size);
            const t = nt++;
            P[t * 9] = v[0].x; P[t * 9 + 1] = v[0].y; P[t * 9 + 2] = v[0].z; P[t * 9 + 3] = v[1].x; P[t * 9 + 4] = v[1].y; P[t * 9 + 5] = v[1].z; P[t * 9 + 6] = v[2].x; P[t * 9 + 7] = v[2].y; P[t * 9 + 8] = v[2].z;
            NV[t * 4] = n.x; NV[t * 4 + 1] = n.y; NV[t * 4 + 2] = n.z; NV[t * 4 + 3] = n.dot(v[0]);
            BB[t * 6] = mnx; BB[t * 6 + 1] = mny; BB[t * 6 + 2] = mnz; BB[t * 6 + 3] = mxx; BB[t * 6 + 4] = mxy; BB[t * 6 + 5] = mxz;
            OWN[t] = oid; LOOK[t] = lid; MESH[t] = mi; PART[t] = part; INST[t] = k; MAT[t] = mid;
          }
        }
      }
    });
    const mem = () => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '?';
    console.log(`coincident: ${nt} triangles collected from ${drawn.length} meshes (${parked} batched sources, ${batchMeshes} batch meshes skipped), heap ${mem()}`);
    // Spatial hash by AABB (integer cell keys).
    const cells = new Map(); const K = 1 << 21, ckey = (x, y, z) => ((x + 1e5) * K + (y + 1e5)) * K + (z + 1e5);
    for (let t = 0; t < nt; t++) {
      const ax = Math.floor((BB[t * 6] - tol) / CELL), ay = Math.floor((BB[t * 6 + 1] - tol) / CELL), az = Math.floor((BB[t * 6 + 2] - tol) / CELL);
      const bx = Math.floor((BB[t * 6 + 3] + tol) / CELL), by = Math.floor((BB[t * 6 + 4] + tol) / CELL), bz = Math.floor((BB[t * 6 + 5] + tol) / CELL);
      for (let x = ax; x <= bx; x++) for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) { const k = ckey(x, y, z); let c = cells.get(k); if (!c) cells.set(k, c = []); c.push(t); }
    }
    console.log(`coincident: ${cells.size} cells, heap ${mem()}`);
    const tri = (t) => ({ p: [[P[t * 9], P[t * 9 + 1], P[t * 9 + 2]], [P[t * 9 + 3], P[t * 9 + 4], P[t * 9 + 5]], [P[t * 9 + 6], P[t * 9 + 7], P[t * 9 + 8]]], n: [NV[t * 4], NV[t * 4 + 1], NV[t * 4 + 2]], d: NV[t * 4 + 3] });
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    // Point q (already within tol of B's plane) inside triangle B, at least `margin` from its edges? Two surfaces
    // that merely meet along an edge (tiles, a wall and its floor) are not a fight, so the point must be inside.
    const margin = 0.001;
    const inside = (qx, qy, qz, B) => {
      for (let e = 0; e < 3; e++) {
        const a = B.p[e], b = B.p[(e + 1) % 3], c = B.p[(e + 2) % 3];
        // Edge a->b; the inward direction is the component of (c - a) perpendicular to the edge.
        const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2]; const el2 = ex * ex + ey * ey + ez * ez || 1e-12;
        const cx = c[0] - a[0], cy = c[1] - a[1], cz = c[2] - a[2]; const tc = (cx * ex + cy * ey + cz * ez) / el2;
        let ix = cx - tc * ex, iy = cy - tc * ey, iz = cz - tc * ez; const il = Math.hypot(ix, iy, iz) || 1e-12; ix /= il; iy /= il; iz /= il;
        const dist = (qx - a[0]) * ix + (qy - a[1]) * iy + (qz - a[2]) * iz;   // signed distance inward from edge a->b
        if (dist < margin) return false;
      }
      return true;
    };
    // Sample A against B. The signed distance of A's points to B's plane is linear over A, so when all three
    // vertices are on one side and further than tol there is nothing to sample. Otherwise grid points of A at
    // most 2 mm apart that lie within tol of B's plane and inside B are near-coincident.
    const near = (A, B) => {
      const d0 = dot(B.n, A.p[0]) - B.d, d1 = dot(B.n, A.p[1]) - B.d, d2 = dot(B.n, A.p[2]) - B.d;
      if ((d0 > tol && d1 > tol && d2 > tol) || (d0 < -tol && d1 < -tol && d2 < -tol)) return { hits: 0, minGap: Infinity };
      const L = Math.max(Math.hypot(...sub(A.p[1], A.p[0])), Math.hypot(...sub(A.p[2], A.p[0])), Math.hypot(...sub(A.p[2], A.p[1])));
      const N = Math.min(60, Math.max(2, Math.ceil(L / 0.002))); let hits = 0, minGap = Infinity;
      const [a0, a1, a2] = A.p; const pts = []; let tight = 0;
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
        const s = i / N, t = j / N, u = 1 - s - t;
        const gap = Math.abs(d0 * u + d1 * s + d2 * t); if (gap > tol) continue;
        const qx = a0[0] * u + a1[0] * s + a2[0] * t, qy = a0[1] * u + a1[1] * s + a2[1] * t, qz = a0[2] * u + a1[2] * s + a2[2] * t;
        if (!inside(qx, qy, qz, B)) continue; hits++; if (gap <= tol / 5) tight++; if (gap < minGap) minGap = gap; if (pts.length < 600) pts.push(qx, qy, qz);
      }
      return { hits, tight, minGap, pts };
    };
    const F = D.F, ents = (D.It && D.It.all) || [];
    const whereOf = (x, y, z) => {
      let best = null, bd = Infinity;
      for (const e of ents) { if (!e.group) continue; const d = Math.hypot(e.group.position.x - x, e.group.position.z - z); if (d < 1.6 && d < bd) { bd = d; best = (e.def && e.def.name) || e.id; } }
      if (D.At && Math.hypot(D.At.position.x - x, D.At.position.z - z) < 1.6) best = best || 'player';
      if (best) return best;
      if (F && F.buildings) { for (const B of F.buildings) if (F.inHull(B, x, z, 1.5)) return B.name || 'building'; }
      return 'town';
    };
    const nameOf = (t) => { const o = drawn[MESH[t]]; return label(o) + ' <' + chainOf(o.parent) + (o.isInstancedMesh ? '#' + INST[t] : ''); };
    const seen = new Set(); const found = new Map(); let pairsTested = 0, done = 0;
    let multi = 0;
    for (const c of cells.values()) {
      if ((++done % 50000) === 0) console.log(`coincident: ${done} of ${cells.size} cells, ${multi} with two surfaces, ${pairsTested} pairs sampled, ${found.size} near`);
      if (c.length < 2) continue;
      // Most cells hold one surface only (a blob body's dense skin); those have nothing to compare.
      let single = true; for (let i = 1; i < c.length; i++) if (OWN[c[i]] !== OWN[c[0]]) { single = false; break; }
      if (single) continue; multi++;
      for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
        const a = c[i], b = c[j]; if (OWN[a] === OWN[b]) continue;
        // AABBs must touch (within tol) and the normals be nearly parallel; opposite-facing pairs only count when a side is double-sided.
        if (BB[a * 6] - BB[b * 6 + 3] > tol || BB[b * 6] - BB[a * 6 + 3] > tol || BB[a * 6 + 1] - BB[b * 6 + 4] > tol || BB[b * 6 + 1] - BB[a * 6 + 4] > tol || BB[a * 6 + 2] - BB[b * 6 + 5] > tol || BB[b * 6 + 2] - BB[a * 6 + 5] > tol) continue;
        // Which way does each surface show? A FrontSide face shows along its normal, a BackSide face against it,
        // a DoubleSide face both ways. Two faces fight only when they show the same way (a back-face outline
        // shell a hair outside a body never fights the body's front faces).
        const dn = NV[a * 4] * NV[b * 4] + NV[a * 4 + 1] * NV[b * 4 + 1] + NV[a * 4 + 2] * NV[b * 4 + 2];
        const sa = mats[MAT[a]].side, sb = mats[MAT[b]].side;
        const showA = sa === T.DoubleSide ? 0 : sa === T.BackSide ? -1 : 1, showB = sb === T.DoubleSide ? 0 : sb === T.BackSide ? -1 : 1;
        const sameWay = (showA === 0 || showB === 0) ? Math.abs(dn) > COS : (showA * showB) * dn > COS;
        if (!sameWay) continue;
        const pk = a < b ? a * total + b : b * total + a; if (seen.has(pk)) continue; seen.add(pk); pairsTested++;
        const A = tri(a), B = tri(b); const ab = near(A, B), ba = near(B, A); const hits = ab.hits + ba.hits; if (!hits) continue;
        // Identical triangles (the same three corners) are a double draw, not a sliding fight: listed apart.
        let same3 = true; for (let q = 0; q < 9 && same3; q++) if (Math.abs(P[a * 9 + q] - P[b * 9 + q]) > 1e-6) same3 = false;
        const k = [nameOf(a) + ' [' + looks[LOOK[a]] + ']', nameOf(b) + ' [' + looks[LOOK[b]] + ']'].sort().join('  vs  ');
        const handled = [mats[MAT[a]], mats[MAT[b]]].some((m) => m.polygonOffset || m.depthTest === false || m.depthWrite === false || m.transparent);
        const at = [0, 1, 2].map((q) => +((A.p[0][q] + A.p[1][q] + A.p[2][q]) / 3).toFixed(2));
        const f = found.get(k) || { pair: k, tris: 0, hits: 0, tight: 0, dup: 0, minGap: Infinity, sameLook: LOOK[a] === LOOK[b], handled, at, where: whereOf(at[0], at[1], at[2]), owners: new Set(), pts: [], n: [NV[a * 4], NV[a * 4 + 1], NV[a * 4 + 2]], objs: [drawn[MESH[a]], drawn[MESH[b]]] };
        f.tris++; if (same3) f.dup++; f.tight += ab.tight + ba.tight; if (f.pts.length < 6000) f.pts.push(...ab.pts, ...ba.pts);
        if (dump && f.where === dump) { f.dumped = f.dumped || []; if (f.dumped.length < 6) f.dumped.push({ A: A.p.map((q) => q.map((v) => +v.toFixed(4))), nA: A.n.map((v) => +v.toFixed(3)), B: B.p.map((q) => q.map((v) => +v.toFixed(4))), nB: B.n.map((v) => +v.toFixed(3)), gaps: [ab.minGap, ba.minGap].map((v) => +(v * 1000).toFixed(3)), hits: [ab.hits, ba.hits] }); } f.hits += hits; f.minGap = Math.min(f.minGap, ab.minGap, ba.minGap); f.owners.add(OWN[a]); f.owners.add(OWN[b]); found.set(k, f);
      }
    }
    console.log(`coincident: ${pairsTested} pairs sampled, ${found.size} near, heap ${mem()}`);
    const meshes = drawn.length, tris = { length: nt }; const batchInfo = { parked, batchMeshes };
    // How the near region grows with the tolerance tells the cases apart: two faces in one plane have the
    // same count at a fifth of the tolerance (ratio 1); a flat face tangent to a round one grows with the
    // square root (about 2.2); two surfaces crossing at an angle grow linearly (about 5). The first two
    // are depth fights the headset shows; a crossing is an ordinary intersection line and is only listed.
    for (const f of found.values()) { f.ratio = f.tight ? +(f.hits / f.tight).toFixed(1) : Infinity; f.crossing = f.ratio > 3.5; }
    const list = [...found.values()].sort((a, b) => b.hits - a.hits);
    // Pictures (--save): each different-looking pair's spot from 0.9 m along the surface normal, the near
    // points drawn in red on top, the two surfaces' own objects shown and the rest of the scene as context.
    if (save) {
      const O = D.O, gl = O.getContext(), W = O.domElement.width, H = O.domElement.height, S = 384;
      const prevRT = O.getRenderTarget(), prevXR = O.xr.enabled; O.xr.enabled = false; O.setRenderTarget(null);
      const cam = new T.PerspectiveCamera(30, 1, 0.05, 200); cam.layers.enable(31);
      const e = document.getElementById('gate'); if (e) e.style.display = 'none';
      let idx = 0;
      for (const f of list) {
        if (f.sameLook || f.handled || idx >= limit) continue;
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(f.pts, 3));
        const dots = new T.Points(geo, new T.PointsMaterial({ color: 0xff2020, size: 5, sizeAttenuation: false, depthTest: false })); dots.renderOrder = 999; C.add(dots);
        const nrm = new T.Vector3(...f.n).normalize(); const at = new T.Vector3(...f.at);
        // Look along the surface normal from the shown side (stepping sideways when the normal is near vertical):
        // a 2.2 m context view on the left, a 0.8 m close-up on the right.
        const cv = document.createElement('canvas'); cv.width = 2 * S; cv.height = S; const cx = cv.getContext('2d');
        [[2.2, 50], [0.8, 30]].forEach(([dist, fov], k) => {
          const eye = at.clone().addScaledVector(nrm, dist); if (Math.abs(nrm.y) > 0.9) eye.x += 0.3 * dist;
          cam.fov = fov; cam.aspect = 1; cam.updateProjectionMatrix(); cam.position.copy(eye); cam.lookAt(at); cam.updateMatrixWorld(true);
          O.setViewport(0, 0, S, S); O.setScissor(0, 0, S, S); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false); O.setViewport(0, 0, W, H);
          const buf = new Uint8Array(S * S * 4); gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          const im = cx.createImageData(S, S); for (let y = 0; y < S; y++) im.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);   // flip
          cx.putImageData(im, k * S, 0);
        });
        f.png = cv.toDataURL('image/png'); f.pic = idx++;
        C.remove(dots); geo.dispose();
      }
      O.setRenderTarget(prevRT); O.xr.enabled = prevXR;
    }
    for (const f of list) { delete f.pts; delete f.objs; f.owners = f.owners.size; f.minGap = +(f.minGap * 1000).toFixed(3); }
    return { meshes, tris: tris.length, skippedBig, skippedHuge, cells: cells.size, pairsTested, list: list.slice(0, limit), total: list.length, ...batchInfo };
  }, { tol, limit, save, dump });
  note(`${r.meshes} meshes (${r.parked} batched sources in place of ${r.batchMeshes} batch meshes), ${r.tris} triangles up to 0.6 m in ${r.cells} cells (${r.skippedBig} larger triangles left to the planar test, ${r.skippedHuge} huge meshes skipped); ${r.pairsTested} parallel pairs sampled`);
  // Accepted depth fights (tools/zfight_baseline.json, the author's call): keyed by the place and the two
  // looks without texture ids, which change every boot.
  const keyOf = (f) => f.where + ' | ' + f.pair.replace(/<[^\]]*\[/g, '[').replace(/\/map[0-9A-F]{8}/g, '/map').replace(/Kt#[0-9a-f]{6} /g, '').replace(/MeshPhongMaterial/g, 'Phong').replace(/MeshBasicMaterial/g, 'Basic').replace(/MeshLambertMaterial/g, 'Lambert');
  const accepted = new Map((baseline.accepted || []).map((e) => [e.key, e]));
  for (const f of r.list) { f.key = keyOf(f); f.accepted = accepted.get(f.key); }
  const bad = r.list.filter((f) => !f.sameLook && !f.handled && !f.crossing && !f.accepted), known = r.list.filter((f) => !f.sameLook && !f.handled && !f.crossing && f.accepted), cross = r.list.filter((f) => !f.sameLook && !f.handled && f.crossing), same = r.list.filter((f) => f.sameLook && !f.handled), handled = r.list.filter((f) => f.handled);
  if (save) { fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true }); }
  for (const f of bad) {
    let pic = ''; if (f.png) { const name = `${String(f.pic).padStart(2, '0')}_${f.where.replace(/[^\w]+/g, '_')}.png`; fs.writeFileSync(path.join(outDir, name), Buffer.from(f.png.split(',')[1], 'base64')); pic = `  -> .runs/coinc/${name}`; }
    console.log(`  NEAR  ${f.where} (${f.at.join(', ')}): ${f.pair}  ${f.tris} triangle pairs${f.dup ? ` (${f.dup} identical)` : ''}, ${f.hits} points within ${tol * 1000} mm (growth ${f.ratio}), closest ${f.minGap} mm${pic}\n        key: ${f.key}`);
    if (f.dumped) for (const d of f.dumped) console.log(`        A ${JSON.stringify(d.A)} n ${JSON.stringify(d.nA)}\n        B ${JSON.stringify(d.B)} n ${JSON.stringify(d.nB)}  gaps ${d.gaps.join('/')} mm, hits ${d.hits.join('/')}`);
  }
  for (const f of known) {
    let pic = ''; if (f.png) { const name = `k${String(f.pic).padStart(2, '0')}_${f.where.replace(/[^\w]+/g, '_')}.png`; fs.writeFileSync(path.join(outDir, name), Buffer.from(f.png.split(',')[1], 'base64')); pic = `  -> .runs/coinc/${name}`; }
    console.log(`  known ${f.where} (${f.at.join(', ')}): ${f.key}  ${f.hits} points (growth ${f.ratio})  accepted: ${f.accepted.why}${pic}`);
  }
  for (const f of cross) {
    let pic = ''; if (f.png) { const name = `x${String(f.pic).padStart(2, '0')}_${f.where.replace(/[^\w]+/g, '_')}.png`; fs.writeFileSync(path.join(outDir, name), Buffer.from(f.png.split(',')[1], 'base64')); pic = `  -> .runs/coinc/${name}`; }
    console.log(`  cross ${f.where} (${f.at.join(', ')}): ${f.pair}  ${f.tris} pairs, ${f.hits} points within ${tol * 1000} mm (growth ${f.ratio}: surfaces crossing at an angle, not a depth fight)${pic}`);
  }
  for (const f of same) console.log(`  same  ${f.where} (${f.at.join(', ')}): ${f.pair}  ${f.tris} pairs, closest ${f.minGap} mm  (same look both sides, not visible)`);
  for (const f of handled) console.log(`  hand  ${f.where} (${f.at.join(', ')}): ${f.pair}  ${f.tris} pairs, closest ${f.minGap} mm  (offset/order/transparent)`);
  note(`${r.total} near-coincident pairs: ${bad.length} new depth fights, ${known.length} accepted (baseline), ${cross.length} crossings, ${same.length} same-look, ${handled.length} handled`);
  expect('no two different-looking surfaces lie within ' + tol * 1000 + ' mm of each other (curved z-fighting)', bad.length === 0, bad.map((f) => f.where + ' (' + f.at.join(', ') + ')').join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.join(' | '));
  await g.close();
  console.log(failures.length ? `COINCIDENT TEST FAILED (${failures.length})` : 'COINCIDENT TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
