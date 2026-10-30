// Mama Gorbo's walk over to Gooward goes around the scenery (standard tier; the author: "Mama Gorbo walking through
// scenery by the gallery"; FIXES F-B53). When the two are more than 16 m apart she walks over to a spot beside him
// first; that walk used to follow the building router only, which does not know the scenery's clearance (the gallery's
// 6.2 m circle, its easels), so from across the park she could cut through the gallery's front. Set up so the straight
// line from her to him crosses the gallery's circle (him 8.5 m from the gallery, her 23-28 m away on the far side,
// both on free ground), the meeting is called, and every 100 ms until the two have met:
//   - she is never inside a solid zone (scenery, pool, the phone, the stump; 0.2 m slack, as test_roam.js);
//   - the meeting happens (both reach their spots and the goo arcs start);
//   - no page errors. Three layouts (three headings around the gallery).
//
//   node tools/test_meet_walk.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const A = D.It.byId.p_mamagorbo, B = D.It.byId.gorbo, Gc = D.F.buildings.find((b) => b.name === 'gallery');
    const zl = () => (D.E && D.E.list && D.E.list.some((q) => q.tag)) ? D.E.list : D.z.list;
    const solid = () => zl().filter((q) => /^(scenery|pool|phone|stump)$/.test(q.tag));
    const gz = solid().find((q) => Math.hypot(q.x - Gc.x, q.z - Gc.z) < 0.5);
    D.At.position.set(-36, D.At.position.y, -20);
    const arcs = []; const ga = D.Nt.gooArc; D.Nt.gooArc = function () { arcs.push(D.Re.t); return ga.apply(this, arguments); };
    const segHits = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((gz.x - a[0]) * dx + (gz.z - a[1]) * dz) / L)); return Math.hypot(a[0] + t * dx - gz.x, a[1] + t * dz - gz.z) < gz.r; };
    const out = [];
    for (let th = 0; th < 2 * Math.PI && out.length < 3; th += Math.PI / 12) {
      const gb = [Gc.x + 8.5 * Math.cos(th), Gc.z + 8.5 * Math.sin(th)];
      let ma = null; for (const d of [28, 26, 24, 23]) { const p = [Gc.x - d * Math.cos(th) * 0.6 + 6 * Math.sin(th), Gc.z - d * Math.sin(th) * 0.6 - 6 * Math.cos(th)]; if (J.roamFree(p[0], p[1], A.bodyR || 1, true, A.def.at) && Math.hypot(p[0] - gb[0], p[1] - gb[1]) > 17 && segHits(p, gb)) { ma = p; break; } }
      if (!ma || !J.roamFree(gb[0], gb[1], B.bodyR || 1, true, B.def.at)) continue;
      const one = { th: +th.toFixed(2), her: ma.map((v) => +v.toFixed(1)), him: gb.map((v) => +v.toFixed(1)), inZone: [], met: false };
      for (const [h, p] of [[A, ma], [B, gb]]) { h.meeting = false; h.seek = null; h.gcNav = null; h.goHome = false; h.gcNavHome = false; h.dest = null; h.group.position.set(p[0], h.group.position.y, p[1]); h.home.set(p[0], h.home.y, p[1]); }
      await wait(300);
      const a0 = arcs.length; J.meetAt(D.Re.t);
      const t0 = D.Re.t, w0 = performance.now();
      while (D.Re.t - t0 < 90 && performance.now() - w0 < 600000) {
        await wait(100);
        const p = A.group.position;
        for (const q of solid()) if (Math.hypot(p.x - q.x, p.z - q.z) < q.r - 0.2 && one.inZone.length < 5) one.inZone.push([+p.x.toFixed(2), +p.z.toFixed(2), q.tag]);
        if (arcs.length > a0) { one.met = true; break; }
      }
      out.push(one);
      // let the meeting finish before the next layout
      const t1 = D.Re.t; while ((A.meeting || B.meeting) && D.Re.t - t1 < 40) await wait(200);
    }
    return { zone: gz && { x: gz.x, z: gz.z, r: gz.r }, out };
  });
  await g.close();
  note(JSON.stringify(r));
  expect('three layouts with her straight line to him through the gallery\'s circle', r.out.length === 3, String(r.out.length));
  expect('she never stands inside a solid zone on her way', r.out.every((o) => o.inZone.length === 0), JSON.stringify(r.out.map((o) => o.inZone)));
  expect('each time the two meet (the goo arcs start)', r.out.every((o) => o.met), JSON.stringify(r.out.map((o) => o.met)));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `MEET WALK TEST FAILED (${failures.length})` : 'MEET WALK TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
