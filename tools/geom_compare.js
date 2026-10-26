// Geometry equivalence check (analysis): boots two assets and compares every
// character's mesh vertices (positions, in traversal order) so a change to the
// model builders can be proven not to change the models. Reports, per entity,
// the vertex count and the maximum position difference.
//
//   node tools/geom_compare.js <before.html> <after.html> [--tol 1e-4]
const path = require('path');
const { boot } = require('./lib/harness');

const a = path.resolve(process.argv[2]), b = path.resolve(process.argv[3]);
const tol = +(process.argv.find((x, i) => process.argv[i - 1] === '--tol') || 1e-4);

async function dump(file) {
  const g = await boot({ file, vr: false });
  const r = await g.page.evaluate(() => {
    const D = window.__dbg, out = {};
    const take = (name, root) => { const verts = []; root.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) { const p = o.geometry.attributes.position.array; for (let i = 0; i < p.length; i++) verts.push(p[i]); } }); out[name] = verts; };
    for (const e of D.It.all) take(e.id || (e.def && e.def.name) || ('e' + Object.keys(out).length), e.group);
    take('player', D.At);
    return out;
  });
  await g.close();
  return r;
}

(async () => {
  const [A, B] = [await dump(a), await dump(b)];
  let worst = 0, bad = 0, n = 0;
  for (const k of Object.keys(A)) {
    const x = A[k], y = B[k] || [];
    let mx = 0; const same = x.length === y.length;
    if (same) for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d > mx) mx = d; }
    worst = Math.max(worst, same ? mx : Infinity); n++;
    const ok = same && mx <= tol; if (!ok) bad++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${k}: ${x.length / 3} verts${same ? `, max |dpos| ${mx.toExponential(2)}` : `, vertex count differs (${y.length / 3})`}`);
  }
  console.log(bad ? `GEOM COMPARE FAILED (${bad} of ${n} entities differ beyond ${tol})` : `GEOM COMPARE PASSED (${n} entities, worst |dpos| ${worst.toExponential(2)})`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
