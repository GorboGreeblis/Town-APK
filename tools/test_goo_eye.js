// Goo never fills the view (standard tier; S8; the author: "Flashes are happening when he and Mama Gorbo are having a
// vignette while the user watches and moves around"). When Mama Gorbo and Gooward meet they throw goo blobs (spheres
// up to 0.2 m across) at each other's heads, three at a time with a random spread; a player watching close by and
// moving about put their eyes in the blobs' path, and a blob passing within a few centimetres of the eyes filled the
// view with goo colour for a frame or two. In VR (fake XR), their meeting is started and, while it plays, the player
// walks round them and between them at their heads' height; on every frame drawn every goo blob shown is measured
// against the eyes:
//   - blobs are seen in flight (the meeting threw goo);
//   - none is drawn within 0.7 m of the eyes;
//   - no GPU work happens inside a headset frame while they meet (the frame-hazard watch);
//   - no page errors or logged errors.
// Run on a build before S8 (`node tools/test_goo_eye.js old.html`) it shows how close the blobs came.
//
//   node tools/test_goo_eye.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(2000);
    if (!D.we.presenting || !D.we.headPos) return { noVR: true };
    const ma = D.It.byId.p_mamagorbo, gw = D.It.byId.gorbo; if (!ma || !gw) return { noPair: true };
    // the blobs: goo spheres (bounding radius 0.13) in the pair's goo colours
    const cols = new Set([...(ma.def.goo || []), ...(gw.def.goo || [])].map((c) => new T.Color(c).getHexString()));
    const blobs = () => D.C.children.filter((o) => o.isMesh && o.visible && o.material && o.material.color && cols.has(o.material.color.getHexString()) && o.geometry && (o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere)).radius > 0.1 && o.geometry.boundingSphere.radius < 0.2);
    let near = 0, seen = 0, minD = 1e9, frames = 0; const P = new T.Vector3();
    const R0 = D.O.render; D.O.render = function () { try { frames++; const h = D.we.headPos; for (const b of blobs()) { b.getWorldPosition(P); const d = P.distanceTo(h); seen++; minD = Math.min(minD, d); if (d < 0.7) near++; } } catch (e) {} return R0.apply(this, arguments); };
    // their meeting, now; the player kept in their goo's path while it plays: between them and round them, eyes at
    // their heads' height (the rig lowered so the eyes sit where the goo flies)
    const H = window.__gtFrameHaz, h0 = H ? H.n : 0, f0 = H ? H.first.length : 0;
    J.meetAt(D.Re.t); const t0 = performance.now(); let hearts = 0;
    // they only meet while the player is not beside them: wait away until their goo starts, then walk in among them
    D.At.position.set(30, D.At.position.y, 30);
    while (performance.now() - t0 < 180000 && !Math.max(ma.hearts || 0, gw.hearts || 0)) await wait(100);
    const t1 = performance.now();
    while (performance.now() - t1 < 60000) {
      await wait(50);
      const a = ma.group.position, b = gw.group.position, k = (performance.now() - t1) / 1000;
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, s = 0.6 * Math.sin(0.9 * k), u = 0.6 * Math.cos(0.7 * k);
      D.At.position.set(mx + s, D.At.position.y, mz + u);
      const hh = 0.5 * ((ma.height || 2) + (gw.height || 2)), eye = D.we.headPos ? D.we.headPos.y - D.At.position.y : 1.6;
      D.At.position.y = hh * 0.5 - eye + 0.2 * Math.sin(1.3 * k);
      hearts = Math.max(hearts, ma.hearts || 0, gw.hearts || 0);
      if (hearts >= 8 && performance.now() - t1 > 8000) break;
    }
    await wait(2500);
    D.O.render = R0;
    return { seen, near, minD: +minD.toFixed(2), frames, hearts, hidden: window.__gcGooEye || 0, haz: H ? H.n - h0 : null, hazFirst: H ? H.first.slice(f0, f0 + 3) : [] };
  });
  if (r.noVR) { expect('in VR with a head position', false); process.exit(1); }
  if (r.noPair) { expect('Mama Gorbo and Gooward are in the park', false); process.exit(1); }
  note(JSON.stringify(r));
  expect('their meeting threw goo (blobs seen in flight)', r.seen > 0 && r.hearts >= 2, `${r.seen} blob-frames, ${r.hearts} heart steps`);
  expect('no goo blob is drawn within 0.7 m of the eyes', r.near === 0, `${r.near} blob-frames within 0.7 m; closest ${r.minD} m`);
  expect('no GPU work inside a headset frame while they meet (frame-hazard watch)', r.haz === 0 || r.haz === null, JSON.stringify(r.hazFirst).slice(0, 400));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `GOO EYE TEST FAILED (${failures.length})` : 'GOO EYE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
