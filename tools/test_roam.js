// Roamers and the townsfolk over minutes (standard tier: 3 game minutes; --long: 10). The roamers (Mama Gorbo, Gooward,
// Hennrick by the Portal, and the dancers Etcher, Glyph and Montgummery on the floor) pick their own spots with
// JGP.roamFree: never inside a building hull, the Garden (15 m around the middle) or a solid zone (scenery, pools, the
// phone, the stump), always inside the park. The others keep to their posts. Every quarter second this samples where
// everyone stands and fails on anyone inside a building that is not theirs or outside the park, and on a roamer in a
// solid zone (standing in it, or walking 1.5 m into it: a walk may cut a zone's edge) or the Garden, two roamers
// standing in each other, and a roamer that never moves.
//
//   node tools/test_roam.js [file] [--long]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const GAME_S = process.argv.includes('--long') ? 600 : 180;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file });
  const page = g.page;
  await page.waitForTimeout(2000);
  const r = await page.evaluate(async (GAME_S) => {
    const D = window.__dbg, F = D.F, J = D.JGP, t = D.t, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const ids = ['p_mamagorbo', 'gorbo', 'gratelet', 'p_etcher', 'p_glyph', 'w_mont'];
    const ents = D.It.all.filter((h) => h.group && h.def);   // everyone: the roamers, and the townsfolk at their posts
    const floor = J.floor;   // [x0, z0, x1, z1]: the dance floor the floor roamers keep to
    const onFloor = (x, z) => floor && x >= floor[0] - 0.3 && x <= floor[2] + 0.3 && z >= floor[1] - 0.3 && z <= floor[3] + 0.3;
    const zl = () => (D.E && D.E.list && D.E.list.some((q) => q.tag)) ? D.E.list : D.z.list;
    const solid = () => zl().filter((q) => /^(scenery|pool|phone|stump)$/.test(q.tag));
    const st = new Map(ents.map((h) => [h, { name: (h.def && h.def.name) || h.id, kind: h.kind, hull: 0, garden: 0, zone: 0, minR: 99, oob: 0, overlap: 0, path: 0, last: null, samples: 0, where: [] }]));
    const g0 = D.Re.t, w0 = performance.now();
    while (D.Re.t - g0 < GAME_S && performance.now() - w0 < GAME_S * 6000) {
      await wait(250);
      for (const h of ents) {
        const s = st.get(h);
        if (!h.group.visible || h.heldBy || h.carried) continue;
        const p = h.group.position, r0 = h.bodyR || 1; s.samples++;
        const step = s.last ? Math.hypot(p.x - s.last[0], p.z - s.last[1]) : 0;
        if (s.last) s.path += step;
        s.last = [p.x, p.z];
        const add = (k, why) => { s[k]++; if (s.where.length < 3) s.where.push(why + ' at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1)); };
        const own = h.home && F.buildings.find((B) => F.inHull(B, h.home.x, h.home.z));
        for (const B of F.buildings) if (B !== own && F.inHull(B, p.x, p.z, -0.1) && !(ids.slice(2).includes(h.id) && onFloor(p.x, p.z))) add('hull', 'in ' + (B.name || B.id || 'a building'));
        // the gazebo's railings and posts are solid (3.15.67; its doorway open to anyone): no one stands in them
        if (F.gzSeg) for (const [a, b] of F.gzSeg) { const ex = b[0] - a[0], ez = b[1] - a[1], u = Math.max(0, Math.min(1, ((p.x - a[0]) * ex + (p.z - a[1]) * ez) / (ex * ex + ez * ez))); if (Math.hypot(p.x - a[0] - ex * u, p.z - a[1] - ez * u) < 0.12) { add('hull', 'in the gazebo\'s railing'); break; } }
        s.minR = Math.min(s.minR, Math.hypot(p.x, p.z));
        if (ids.includes(h.id) && Math.hypot(p.x, p.z) < 15 - 0.2) add('garden', 'in the Garden');
        // solid zones are the clearance roamers keep when they pick a spot (roamFree); the others stand at their designed
        // posts, some beside scenery (Fortizmo's pond edge), so the check is the roamers'. A roamer standing keeps the
        // whole clearance (0.2 m margin); one walking past may cut its edge (the clearance is generous: the house at
        // 31,14.5 has a 6.2 m one and Gooward's home is 0.6 m outside it, 3.15.54 and 3.15.64), so a walk counts only
        // 1.5 m deep, where it would reach the scenery itself
        const deep = step > 0.05 ? 1.5 : 0.2;
        if (ids.includes(h.id)) for (const q of solid()) if (Math.hypot(p.x - q.x, p.z - q.z) < q.r - deep && !(h.def.at && Math.hypot(h.def.at[0] - q.x, h.def.at[1] - q.z) < q.r)) add('zone', 'in ' + q.tag + (step > 0.05 ? ' (walking)' : ''));
        if (Math.abs(p.x) > t.parkHalf + 0.5 || p.z < -t.parkHalf - 0.5 || p.z > t.parkSouth + 0.5) add('oob', 'outside the park');
        for (const o of ents) if (o !== h && ids.includes(o.id) && ids.includes(h.id) && o.group.visible && Math.hypot(p.x - o.group.position.x, p.z - o.group.position.z) < 0.5 * (r0 + (o.bodyR || 1))) add('overlap', 'in ' + ((o.def && o.def.name) || o.id));
      }
    }
    return { gameS: +(D.Re.t - g0).toFixed(0), list: [...st.values()].map((s) => ({ ...s, path: +s.path.toFixed(1), minR: +s.minR.toFixed(1), last: undefined })) };
  }, GAME_S);
  const roamers = ['MAMA GORBO', 'GOOWARD', 'HENNRICK', 'ETCHER', 'GLYPH', 'MONTGUMMERY'];
  note(`${r.gameS} game seconds; ` + r.list.map((s) => `${s.name} (${s.kind}) walked ${s.path} m, nearest the middle ${s.minR} m`).join(', '));
  const bad = (k) => r.list.filter((s) => s[k]).map((s) => `${s.name}: ${s[k]} (${s.where.join('; ')})`);
  expect('the roamers and the townsfolk were found', roamers.every((n) => r.list.some((s) => s.name === n)) && r.list.length >= 10, JSON.stringify(r.list.map((s) => s.name)));
  expect(`over ${r.gameS} game seconds none stands inside a building it does not belong to`, bad('hull').length === 0, bad('hull').join(' | '));
  expect('no roamer walks into the Garden', bad('garden').length === 0, bad('garden').join(' | '));
  expect('no roamer stands inside a solid zone (scenery, pool, the phone, the stump), or walks 1.5 m into one', bad('zone').length === 0, bad('zone').join(' | '));
  expect('none leaves the park', bad('oob').length === 0, bad('oob').join(' | '));
  expect('no two roamers stand in each other', bad('overlap').length === 0, bad('overlap').join(' | '));
  const still = r.list.filter((s) => roamers.includes(s.name) && s.samples > 20 && s.path < 1);
  expect('every roamer moves (Mama Gorbo, Gooward, Hennrick, the three dancers)', still.length === 0, still.map((s) => s.name).join(', '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `ROAM TEST FAILED (${failures.length})` : 'ROAM TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
