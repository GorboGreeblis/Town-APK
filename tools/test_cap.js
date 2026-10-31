// Mama Gorbo's cap clears her eyes (standard tier; A36; the author: "it is clipping into her eye disk, this is a bug,
// it should never do that"). Her big porthole eye covers the upper front of her head (up to about 2.65 m), so the cap
// is worn pushed back. Measured in her model's own space (the game hands the cap and both eye groups to tests as
// window.__gcCapDbg): each eye disk (its rim and backing plate, 1.1 x its size plus 3 cm, at its back, middle and
// front) sampled at 288 points, every point checked against the cap's crown (a half ellipsoid) and its brim (a half
// disc 3 cm thick):
//   - the cap and both eyes are found;
//   - every eye point is at least 3 cm clear of the cap;
//   - the cap's rim sits on her head (no point of it more than 5 cm off her body's surface);
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
    const cg = K.cap, surf = K.surf; cg.updateMatrix();
    // the body's centre, from the surface function's points in opposite directions
    const pA = surf([1, 0, 0]).p, pB = surf([-1, 0, 0]).p, pC = surf([0, 0, 1]).p, pD = surf([0, 0, -1]).p;
    const cen = new T.Vector3((pA.x + pB.x) / 2, (pA.y + pB.y) / 2, (pC.z + pD.z) / 2);
    const off = (v) => { const d = v.clone().sub(cen); return d.length() - surf([d.x, d.y, d.z]).p.clone().sub(cen).length(); };
    const inv = cg.matrix.clone().invert(), bm = new T.Matrix4().makeRotationX(-0.12), sc = cg.scale.x, L = new T.Vector3();
    let clr = 1e9, n = 0;
    K.eyes.forEach((U, i) => {
      U.updateMatrix(); const rr = 1.1 * K.sizes[i] + 0.03;
      for (let a = 0; a < 32; a++) for (const f of [1, 0.75, 0.5]) for (const d of [-0.012, 0.05, 0.13]) {
        L.set(Math.cos(a / 32 * 2 * Math.PI) * rr * f, Math.sin(a / 32 * 2 * Math.PI) * rr * f, d).applyMatrix4(U.matrix).applyMatrix4(inv); n++;
        const crown = L.y > -0.02 ? (Math.sqrt(L.x * L.x / 0.25 + L.y * L.y / (0.31 * 0.31) + L.z * L.z / (0.525 * 0.525)) - 1) * 0.31 : -L.y;
        const q = L.clone().sub(new T.Vector3(0, 0.012, 0.45)).applyMatrix4(bm);
        const brim = Math.max(Math.abs(q.y) - 0.015, Math.hypot(q.x, q.z) - 0.42, -q.z);
        clr = Math.min(clr, Math.min(crown, brim) * sc);
      }
    });
    let rim = -1e9; for (let a = 0; a < 48; a++) { const t = a / 48 * 2 * Math.PI; rim = Math.max(rim, off(new T.Vector3(0.5 * Math.sin(t), 0, 0.525 * Math.cos(t)).applyMatrix4(cg.matrix))); }
    return { points: n, clear: +clr.toFixed(3), rim: +rim.toFixed(3), scale: +sc.toFixed(2), tilt: +cg.rotation.x.toFixed(2) };
  });
  if (r.none) { expect('the cap and both eyes are found', false); process.exit(1); }
  note(JSON.stringify(r));
  expect('the cap and both eyes are found', r.points > 0);
  expect('every eye point is at least 3 cm clear of the cap', r.clear >= 0.03, `${r.clear} m at the closest`);
  expect('the cap\'s rim sits on her head (nowhere more than 5 cm off it)', r.rim <= 0.05, `${r.rim} m at most`);
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `CAP TEST FAILED (${failures.length})` : 'CAP TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
