// Mama Gorbo's cap clears her eyes (standard tier; A36; the author: "it is clipping into her eye disk, this is a bug,
// it should never do that"). Her big porthole eye covers the upper front of her head (up to about 2.65 m), so the cap
// is worn pushed back. Measured in her model's own space (the game hands the cap and both eye groups to tests as
// window.__gcCapDbg): each eye disk (its rim and backing plate, 1.1 x its size plus 3 cm, at its back, middle and
// front) sampled at 288 points, every point checked against the cap's crown (a half ellipsoid) and its brim (a half
// disc 3 cm thick):
//   - the cap and both eyes are found;
//   - her head never pokes through the crown or the brim (the author: "Around the brim: you can see that her head
//     clips through the hat"): no vertex of her body, drips or goo tube above the rim inside the crown's footprint and
//     outside the crown, none through the brim;
//   - every eye point is at least 3 cm clear of the cap;
//   - the cap sits on her head: no point of its rim more than 12 cm outside her head (her head is a tall egg; a cap
//     that clears her eyes and is never pierced leaves a gap at the back, 10 cm at most);
//   - no page errors or logged errors.
//
//   node tools/test_cap.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const T = window.THREE; await new Promise((res) => setTimeout(res, 1200));
    const K = window.__gcCapDbg; if (!K || !K.cap || !K.eyes || K.eyes.length !== 2) return { none: true };
    const cg = K.cap, N = K.N; N.updateMatrixWorld(true); cg.updateMatrix();
    // her head: every vertex of her vertex-coloured meshes (body, drips, goo tube) in the cap's parent's space
    const Ninv = new T.Matrix4().copy(N.matrixWorld).invert(), H = [], V = new T.Vector3();
    N.traverse((o) => { if (!o.isMesh || !o.geometry.attributes.color) return; for (let x = o; x; x = x.parent) if (x === cg) return; const m = new T.Matrix4().multiplyMatrices(Ninv, o.matrixWorld), a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) H.push(V.fromBufferAttribute(a, i).applyMatrix4(m).clone()); });
    const inv = cg.matrix.clone().invert(), L = new T.Vector3(), bmi = new T.Matrix4().makeRotationX(-0.12), bo = new T.Vector3(0, 0.012, 0.45);
    const sx = cg.scale.x, sy = cg.scale.y;
    // the head through the crown (above the rim, inside its footprint, outside the crown) and through the brim
    let through = 0, throughMax = 0, brimThrough = 0;
    for (const p of H) { L.copy(p).applyMatrix4(inv);
      if (L.y >= 0 && L.x * L.x / 0.25 + L.z * L.z / (0.525 * 0.525) < 1) { const e = Math.sqrt(L.x * L.x / 0.25 + L.y * L.y / (0.31 * 0.31) + L.z * L.z / (0.525 * 0.525)); if (e > 1) { through++; throughMax = Math.max(throughMax, (e - 1) * 0.31 * sy); } }
      const q = L.clone().sub(bo).applyMatrix4(bmi); if (q.z >= 0 && Math.hypot(q.x, q.z) < 0.42 && q.y > 0.015 && q.y < 0.3) brimThrough++; }
    // both eye disks (rim and backing, 1.1 x size + 3 cm, back, middle and front) against the crown and brim
    let clr = 1e9, n = 0;
    K.eyes.forEach((U, i) => { U.updateMatrix(); const rr = 1.1 * K.sizes[i] + 0.03; for (let a = 0; a < 32; a++) for (const f of [1, 0.75, 0.5]) for (const d of [-0.012, 0.05, 0.13]) { L.set(Math.cos(a / 32 * 2 * Math.PI) * rr * f, Math.sin(a / 32 * 2 * Math.PI) * rr * f, d).applyMatrix4(U.matrix).applyMatrix4(inv); n++;
      const crown = L.y > -0.02 ? (Math.sqrt(L.x * L.x / 0.25 + L.y * L.y / (0.31 * 0.31) + L.z * L.z / (0.525 * 0.525)) - 1) * 0.31 * Math.min(sx, sy) : -L.y * sy;
      const q = L.clone().sub(bo).applyMatrix4(bmi); clr = Math.min(clr, Math.min(crown, Math.max(Math.abs(q.y) - 0.015, Math.hypot(q.x, q.z) - 0.42, -q.z) * sx)); } });
    // the rim on her head: each rim point against her head's surface in its direction from the head's centre
    const top = H.reduce((m, p) => Math.max(m, p.y), -1e9), cen = new T.Vector3(); let nc = 0; for (const p of H) if (p.y > top - 1.2) { cen.add(p); nc++; } cen.multiplyScalar(1 / nc);
    const NB = 60, rad = new Float32Array(NB * 30), bin = (v) => { const d = v.clone().sub(cen), r = d.length(); return [Math.min(NB - 1, Math.floor((Math.atan2(d.z, d.x) + Math.PI) / (2 * Math.PI) * NB)), Math.min(29, Math.floor(Math.acos(Math.max(-1, Math.min(1, d.y / r))) / Math.PI * 30)), r]; };
    for (const p of H) { const [a, b, r] = bin(p); if (r > rad[a * 30 + b]) rad[a * 30 + b] = r; }
    let rim = -1e9; for (let k = 0; k < 48; k++) { const t = k / 48 * 2 * Math.PI, w = new T.Vector3(0.5 * Math.sin(t), 0, 0.525 * Math.cos(t)).applyMatrix4(cg.matrix); const [a, b, r] = bin(w); let m = 0; for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) m = Math.max(m, rad[((a + da + NB) % NB) * 30 + Math.max(0, Math.min(29, b + db))]); rim = Math.max(rim, r - m); }
    return { head: H.length, points: n, through, throughMax: +throughMax.toFixed(3), brimThrough, clear: +clr.toFixed(3), rim: +rim.toFixed(3), scale: [+sx.toFixed(2), +sy.toFixed(2)], tilt: +cg.rotation.x.toFixed(2) };
  });
  if (r.none) { expect('the cap and both eyes are found', false); process.exit(1); }
  note(JSON.stringify(r));
  expect('the cap and both eyes are found', r.points > 0);
  expect('her head never pokes through the crown (no head vertex above the rim, inside it, outside the crown)', r.through === 0, `${r.through} vertices, up to ${r.throughMax} m`);
  expect('her head never pokes through the brim', r.brimThrough === 0, `${r.brimThrough} vertices`);
  expect('every eye point is at least 3 cm clear of the cap', r.clear >= 0.03, `${r.clear} m at the closest`);
  expect('the cap sits on her head (its rim nowhere more than 12 cm off it)', r.rim <= 0.12, `${r.rim} m at most`);
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `CAP TEST FAILED (${failures.length})` : 'CAP TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
