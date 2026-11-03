// The author's scenery asks of 2026-11-03 (standard tier; A45-A48). Checked from the scene as built while loading (the
// cap's parts measured; the kiosks and the church, merged into their builders' geometry, checked with rays):
//   - A45: Mama Gorbo's cap is closed underneath (a flat disc the width of the crown under it) and its brim is a full
//     disc (its back half inside the crown), so nothing shows inside the cap from below or beside the brim;
//   - A46, A49: Garden Supplies has one hanging basket, on the player's left facing the kiosk (local -x); the right one,
//     which Zollod clipped into, is gone;
//   - A47: the church's front doorway has a stone backing behind its arches, pier to pier and up through the window
//     sill (4.3 m wide, 3.25 m high, 0.2 m deep), so no notch or slit shows where the arches meet the tower;
//   - A48: no gold cross on the church tower (a ray down the tower's axis meets the stone cap at 18.1 m);
//   - no page errors.
//
//   node tools/test_scenery.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const T = window.THREE, D = window.__dbg, C = D.C; await new Promise((res) => setTimeout(res, 800)); C.updateMatrixWorld(true);
    const meshes = []; C.traverse((o) => { if (o.isMesh && o.visible && o.geometry && o.geometry.attributes.position) { let v = true; for (let q = o; q; q = q.parent) if (q.visible === false) v = false; if (v) meshes.push(o); } });
    const rc = new T.Raycaster(); rc.far = 60;
    const cast = (e, t) => { const o = new T.Vector3(...e), d = new T.Vector3(...t).sub(o).normalize(); rc.set(o, d); const arr = []; for (const m of meshes) rc.intersectObject(m, false, arr); arr.sort((a, b) => a.distance - b.distance); return arr[0] ? arr[0].point.toArray().map((v) => +v.toFixed(3)) : null; };
    const out = {};
    // A45: the cap's merged shape, in the cap's own space: the bottom disc adds a ring of vertices at the rim's height (y 0; the
    // crown's own rim ring is there too: 29 before, 58 with the disc), and the brim's back edge sits inside the crown (its
    // vertices near x 0, z 0.03, lifted 0.06 by the brim's tilt; a half disc has no vertex there)
    const K = window.__gcCapDbg, cap = K && K.cap; out.cap = null;
    if (cap) { let rim = 0, back = 0, n = 0; const v = new T.Vector3(); cap.children.forEach((o) => { if (!o.isMesh) return; o.updateMatrix(); const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrix); n++; if (Math.abs(v.y) < 1e-4 && Math.hypot(v.x, v.z / 1.05) < 0.51) rim++; if (Math.abs(v.x) < 0.1 && v.z > -0.02 && v.z < 0.1 && v.y > 0.04 && v.y < 0.08) back++; } });
      out.cap = { vertices: n, rimRing: rim, brimBack: back }; }
    // A46, A49: Garden Supplies' hanging basket: a ray from each side toward where a basket hangs (local x +-2.2, 2.15 m forward, at its pot's height 2.78 m): the kept pot (local -x, the player's left facing the kiosk) is met at its edge (x -2.42); from the right the ray crosses the empty spot and meets the kept basket (x about -1.97); the kiosk's frame is its group at 27.5, 34.5
    const kiosk = C.children.find((o) => o.isGroup && o.userData.keepInFinale && o.children.length >= 5 && Math.abs(o.position.x - 27.5) < 0.6 && Math.abs(o.position.z - 34.5) < 0.6) || null;
    out.baskets = null;
    if (kiosk) { kiosk.updateMatrixWorld(true); const L = (x, y, z) => new T.Vector3(x, y, z).applyMatrix4(kiosk.matrixWorld).toArray(), inv = new T.Matrix4().copy(kiosk.matrixWorld).invert();
      out.baskets = [-2.2, 2.2].map((x) => { const h = cast(L(x + (x > 0 ? 1.5 : -1.5), 2.78, 2.15), L(x, 2.78, 2.15)); return h ? +new T.Vector3(...h).applyMatrix4(inv).x.toFixed(2) : null; }); }
    // A47: a ray from beside the doorway into the old notch between the pier and the first arch: it meets the backing's side (x about 2.15, in front of the pier's face at z 27.15), not the tower wall at z 27.2
    out.notch = cast([3.5, 1.6, 26.6], [1.7, 2.0, 27.19]);
    // A48: a ray straight down the tower's axis from 24 m: the stone cap at 18.1 m, not the cross (its top was 20.5 m)
    out.towerTop = cast([0.03, 24, 29.43], [0.03, 17, 29.43]);
    out.meshes = meshes.length;
    return out;
  });
  note(JSON.stringify(r));
  expect('A45: Mama Gorbo\'s cap is closed underneath by a flat disc the width of its crown, at its rim (a second ring of vertices at the rim)', !!r.cap && r.cap.rimRing >= 120, JSON.stringify(r.cap));
  expect('A45: the brim is a full disc, its back edge inside the crown (vertices there; a half disc has none)', !!r.cap && r.cap.brimBack >= 2, JSON.stringify(r.cap));
  expect('A46, A49: Garden Supplies has one hanging basket, on the player\'s left (its local -x side); none on the right', !!r.baskets && r.baskets[0] !== null && r.baskets[0] < -2.3 && r.baskets[0] > -2.6 && r.baskets[1] !== null && r.baskets[1] < 1.5, JSON.stringify(r.baskets));
  expect('A47: the notch beside the church doorway is closed: a ray into it meets the backing\'s side, not the tower wall', !!r.notch && r.notch[0] > 2.1 && r.notch[2] < 27.12, JSON.stringify(r.notch));
  expect('A48: no cross on the church tower: a ray down its axis meets the stone cap at 18.1 m (the cross reached 20.5 m)', !!r.towerTop && r.towerTop[1] < 18.3 && r.towerTop[1] > 17.8, JSON.stringify(r.towerTop));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `SCENERY TEST FAILED (${failures.length})` : 'SCENERY TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
