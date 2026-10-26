// Z-fighting / flicker candidates (graphical pass, T13): a static analysis of the
// built world. Every visible, non-UI triangle is put in a bucket by its world
// plane (normal and distance, quantised); inside a bucket, triangles that come
// from different meshes (or from different source parts of a merged batch) and
// overlap in the plane are coplanar overlaps: two surfaces drawn at the same
// depth, which the GPU resolves differently from frame to frame (shimmer) unless
// one of them is offset (polygonOffset) or ordered (depthTest off, renderOrder).
// Pairs where one side already has polygonOffset or depthWrite off are listed as
// "handled". Reports the candidates with world positions so they can be checked
// in the headset.
//
//   node tools/test_zfight.js [file] [--limit N]
const path = require('path');
const { boot, reporter, root } = require('./lib/harness');

const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const limit = +(process.argv.find((a, i) => process.argv[i - 1] === '--limit') || 40);

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false });
  const r = await g.page.evaluate((limit) => {
    const D = window.__dbg, C = D.C, T = window.THREE, EB = (D.gcEB && D.gcEB.list) || [];
    const batchOf = new Map(); for (const E of EB) batchOf.set(E.mesh, E);
    const Q = 1000;                                   // plane quantisation: 1 mm and 0.001 in the normal
    const buckets = new Map(); let tris = 0, meshes = 0, skipped = 0;
    const v = [new T.Vector3(), new T.Vector3(), new T.Vector3()], n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    const handled = (m) => !!(m && (m.polygonOffset || m.depthTest === false || m.depthWrite === false || m.transparent));
    C.updateMatrixWorld(true);
    C.traverse((o) => {
      if (!o.isMesh || !o.visible || o.userData.xrUI) return;
      let p = o; while (p) { if (p.visible === false || p.userData.xrUI) return; p = p.parent; }
      const geo = o.geometry, pos = geo.attributes.position; if (!pos) return;
      const count = geo.index ? geo.index.count : pos.count;
      if (count > 600000) { skipped++; return; }
      meshes++;
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
            if (area2 < 2e-3) continue;
            const d = n.dot(v[0]);
            const key = Math.round(n.x * Q) + ',' + Math.round(n.y * Q) + ',' + Math.round(n.z * Q) + ',' + Math.round(d * Q);
            let b = buckets.get(key); if (!b) buckets.set(key, b = []);
            // Keep the triangle in plane coordinates (u,v) for the overlap test.
            const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z); const drop = ax > ay && ax > az ? 'x' : ay > az ? 'y' : 'z';
            const pts = v.map((p) => drop === 'x' ? [p.y, p.z] : drop === 'y' ? [p.x, p.z] : [p.x, p.y]);
            let part = -1, src = null; const E = batchOf.get(o);
            if (E && geo.attributes.gcPart) { part = Math.round(geo.attributes.gcPart.getX(geo.index ? geo.index.getX(i) : i)); src = E.P[part] && E.P[part].o; if (src) { let q = src; while (q && q.parent && q.parent !== D.gcEB.root && q.parent !== C) q = q.parent; src = q; } }
            b.push({ mesh: o, inst: k, part, src, pts, mat, c: [(v[0].x + v[1].x + v[2].x) / 3, (v[0].y + v[1].y + v[2].y) / 3, (v[0].z + v[1].z + v[2].z) / 3] });
            tris++;
          }
        }
      }
    });
    // Triangle overlap in 2D (separating axis on both triangles' edges), with an AABB pre-test.
    const aabb = (p) => [Math.min(p[0][0], p[1][0], p[2][0]), Math.min(p[0][1], p[1][1], p[2][1]), Math.max(p[0][0], p[1][0], p[2][0]), Math.max(p[0][1], p[1][1], p[2][1])];
    const overlap2 = (A, B) => {
      const a = aabb(A), b = aabb(B); const eps = 0.01;
      if (a[2] - b[0] < eps || b[2] - a[0] < eps || a[3] - b[1] < eps || b[3] - a[1] < eps) return false;
      for (const [P, Qp] of [[A, B], [B, A]]) for (let i = 0; i < 3; i++) {
        const x1 = P[i][0], y1 = P[i][1], x2 = P[(i + 1) % 3][0], y2 = P[(i + 1) % 3][1]; const nx = y1 - y2, ny = x2 - x1;
        let minP = Infinity, maxP = -Infinity, minQ = Infinity, maxQ = -Infinity;
        for (const p of P) { const s = p[0] * nx + p[1] * ny; minP = Math.min(minP, s); maxP = Math.max(maxP, s); }
        for (const q of Qp) { const s = q[0] * nx + q[1] * ny; minQ = Math.min(minQ, s); maxQ = Math.max(maxQ, s); }
        const len = Math.hypot(nx, ny) || 1; if (maxP - minQ < eps * len || maxQ - minP < eps * len) return false;
      }
      return true;
    };
    const label = (o) => { if (!o) return '?'; const n = o.name || (o.userData && (o.userData.kind || o.userData.name)); const col = o.material && o.material.color ? '#' + o.material.color.getHexString() : ''; const cn = o.constructor && o.constructor.name; return (n || cn || o.type || '?') + (col ? col : ''); };
    const nameOf = (t) => (t.src ? 'batch:' + label(t.src) + '@' + [t.src.position.x, t.src.position.z].map((x) => x.toFixed(0)).join(',') : label(t.mesh) + (t.mesh.parent ? ' in ' + label(t.mesh.parent) : '')) + (t.mesh.isInstancedMesh ? '#' + t.inst : '');
    const found = new Map();
    for (const [key, b] of buckets) {
      if (b.length < 2) continue;
      // Only pairs from different meshes/instances count (a mesh's own faces never fight themselves).
      for (let i = 0; i < b.length && i < 400; i++) for (let j = i + 1; j < b.length && j < 400; j++) {
        const A = b[i], B = b[j]; if (A.mesh === B.mesh && A.inst === B.inst && A.part === B.part) continue;
        if (!overlap2(A.pts, B.pts)) continue;
        const k = [nameOf(A), nameOf(B)].sort().join(' vs ');
        const h = handled(A.mat) || handled(B.mat);
        // Same colour and material kind on both sides: the overlap shades identically, so nothing visible flickers.
        const ca = A.mat && A.mat.color ? A.mat.color.getHex() : -1, cb = B.mat && B.mat.color ? B.mat.color.getHex() : -1;
        const sameLook = ca === cb && (A.mat && A.mat.type) === (B.mat && B.mat.type) && ((A.mat && A.mat.map) || null) === ((B.mat && B.mat.map) || null);
        const desc = (t) => { const o = t.src || t.mesh; const bb = new T.Box3().setFromObject(o); const sz = bb.getSize(new T.Vector3()); const chain = []; let q = o; while (q && q !== C && chain.length < 5) { chain.push(q.name || (q.constructor && q.constructor.name) || q.type); q = q.parent; } return { geo: o.geometry && (o.geometry.type || o.geometry.constructor.name), size: [sz.x, sz.y, sz.z].map((x) => +x.toFixed(2)), min: [bb.min.x, bb.min.y, bb.min.z].map((x) => +x.toFixed(2)), chain, ud: Object.keys(o.userData || {}), part: t.part }; };
        const f = found.get(k) || { pair: k, tris: 0, handled: h, sameLook, at: A.c.map((x) => +x.toFixed(1)), plane: key, A: desc(A), B: desc(B), objA: A.src || A.mesh, objB: B.src || B.mesh };
        f.tris++; found.set(k, f);
      }
    }
    const list = [...found.values()].sort((a, b) => b.tris - a.tris);
    // Confirmation by rendering: look at each candidate spot from 3 m, render twice with a
    // 1 mm camera shift, and count the pixels that change colour. Coplanar surfaces with
    // different depth interpolation flip between the two renders (that is the flicker a
    // moving head sees); a stable overlap (identical vertices) does not.
    // window.THREE is a partial export (no render targets): render to the canvas and read a 192 px window from it.
    const O = D.O, gl = O.getContext(), cw = O.domElement.width, ch = O.domElement.height, cam = new T.PerspectiveCamera(50, cw / ch, 0.1, 400);
    const buf = [new Uint8Array(192 * 192 * 4), new Uint8Array(192 * 192 * 4)];
    const prevRT = O.getRenderTarget(), prevXR = O.xr.enabled; O.xr.enabled = false; O.setRenderTarget(null);
    for (const f of list) {
      if (f.handled || f.sameLook) continue;
      const nrm = f.plane.split(',').map(Number); const n3 = new T.Vector3(nrm[0], nrm[1], nrm[2]).divideScalar(Q).normalize();
      const at = new T.Vector3(f.at[0], f.at[1], f.at[2]);
      // View from the front of the surface, 3 m away, tilted 35 degrees so depth varies across the pixels.
      const side = Math.abs(n3.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0);
      const eye = at.clone().addScaledVector(n3, 2.4).addScaledVector(side, 1.7);
      // Isolate the two surfaces (and the lights) on a private layer so edge aliasing of the rest of the
      // scene cannot count as flips; only a depth fight between these two can change pixels.
      const objs = [f.objA, f.objB].filter(Boolean); const moved = [];
      C.traverse((o) => { if (o.isLight) moved.push(o); }); moved.push(...objs);
      const masks = moved.map((o) => o.layers.mask); moved.forEach((o) => o.layers.set(31)); cam.layers.set(31);
      let flips = 0;
      for (let k = 0; k < 2; k++) {
        cam.position.copy(eye).addScaledVector(side, k * 0.001); cam.lookAt(at); cam.updateMatrixWorld(true);
        O.render(C, cam); gl.readPixels((cw - 192) >> 1, (ch - 192) >> 1, 192, 192, gl.RGBA, gl.UNSIGNED_BYTE, buf[k]);
      }
      for (let i = 0; i < buf[0].length; i += 4) { if (Math.abs(buf[0][i] - buf[1][i]) + Math.abs(buf[0][i + 1] - buf[1][i + 1]) + Math.abs(buf[0][i + 2] - buf[1][i + 2]) > 60) flips++; }
      moved.forEach((o, i) => { o.layers.mask = masks[i]; });
      f.flipPct = +(100 * flips / (192 * 192)).toFixed(2);
    }
    O.setRenderTarget(prevRT); O.xr.enabled = prevXR;
    for (const f of list) { delete f.objA; delete f.objB; }
    return { meshes, tris, skipped, buckets: buckets.size, candidates: list.filter((f) => !f.handled && !f.sameLook).slice(0, limit), sameLook: list.filter((f) => !f.handled && f.sameLook).slice(0, limit), handledPairs: list.filter((f) => f.handled).length, total: list.length };
  }, limit);
  note(`${r.meshes} meshes, ${r.tris} planar triangles in ${r.buckets} plane buckets (${r.skipped} huge meshes skipped)`);
  note(`${r.total} coplanar-overlap pairs, ${r.handledPairs} already handled (offset/order/transparent)`);
  for (const c of r.candidates) console.log(`  CAND  ${c.pair}  ${c.tris} tris  near (${c.at.join(', ')})  render flips ${c.flipPct}% of pixels with a 1 mm camera shift${c.flipPct >= 0.5 ? '  <- FLICKERS' : '  (stable)'}`);
  for (const c of r.candidates) if (c.flipPct >= 0.5) console.log(`        A ${JSON.stringify(c.A)}\n        B ${JSON.stringify(c.B)}`);
  for (const c of r.sameLook) console.log(`  same  ${c.pair}  ${c.tris} tris  near (${c.at.join(', ')})  (same colour both sides, not visible)`);
  const flick = r.candidates.filter((c) => c.flipPct >= 0.5);
  note(`${r.candidates.length} different-looking coplanar overlaps, ${flick.length} flicker in a jittered render`);
  expect('no environmental surface flickers (z-fights) in a jittered render', flick.length === 0, flick.map((c) => c.pair + ' near (' + c.at.join(', ') + ') ' + c.flipPct + '%').join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.join(' | '));
  await g.close();
  console.log(failures.length ? `ZFIGHT TEST FAILED (${failures.length})` : 'ZFIGHT TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
