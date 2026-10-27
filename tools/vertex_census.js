// Vertex census (report): where the vertex shader's work goes in one frame. Every draw is recorded through
// three.js's renderBufferDirect; per drawn geometry it reports the vertices the GPU shades (a non-indexed
// mesh shades three per triangle; an indexed one each distinct vertex once, give or take the post-transform
// cache), how many of those are bit-identical copies (position, normal, colour, uv: what indexing would
// share, as P10 and P12 did for batches and scenery), whether the positions change while the game runs
// (a geometry rewritten every frame, like the P13 tentacle bend, needs its copies kept in step), and what
// owns it (creature, batch, scenery, pickup). Sorted by vertices saved.
//
//   node tools/vertex_census.js [file] [--event]      (GT_MULTIVIEW=1 GT_HEADSET_FOV=1 for headset-shaped frames)
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const withEvent = process.argv.includes('--event');
(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(1500);
  if (withEvent) {
    const ok = await page.evaluate(async () => {
      const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
      Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
      const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
      const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200);
      await wait(25000); clearInterval(adv); return !!D.me.active;
    });
    console.log(ok ? 'the planting Event, 25 s in' : 'the Event did not start; town');
  }
  const views = withEvent ? [[-20, -20, Math.PI * 0.75], [-12, -12, Math.PI * 0.75]] : [[0, 8, 0], [-20, -20, Math.PI * 0.75]];
  const res = await page.evaluate(async (views) => {
    const D = window.__dbg, O = D.O, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const creatures = new Map(); (D.It.all || []).forEach((h) => h.group && creatures.set(h.group, h.def && h.def.name || 'creature'));
    const pick = new Set([...(D.le && D.le.list || []), ...(D.ce && D.ce.list || [])]);
    const batch = new Set(D.gcEB.list.map((b) => b.mesh));
    const owner = (o) => { if (batch.has(o)) return 'batch'; for (let p = o; p; p = p.parent) { if (creatures.has(p)) return 'creature ' + creatures.get(p); if (pick.has(p)) return 'pickup'; } return 'scenery/other'; };
    const seen = new Map(); let frames = 0;
    const r0 = O.renderBufferDirect;
    O.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
      if (geo && geo.attributes && geo.attributes.position) {
        let e = seen.get(geo); if (!e) seen.set(geo, e = { geo, obj, draws: 0, groups: new Set(), v0: geo.attributes.position.version });
        e.draws++; e.groups.add(grp ? grp.start + ':' + grp.count : 'all');
      }
      return r0.apply(this, arguments);
    };
    for (const [x, z, yaw] of views) { D.At.position.x = x; D.At.position.z = z; window.__fakeXR.pose.yaw = yaw; const f0 = window.__fakeXR.frames; while (window.__fakeXR.frames < f0 + 3) await wait(50); frames += 3; }
    await wait(5000);
    O.renderBufferDirect = r0;
    const out = [];
    const u32 = (a) => a ? new Uint32Array(a.array.buffer, a.array.byteOffset, a.count * a.itemSize) : null;
    for (const e of seen.values()) {
      const g = e.geo, A = g.attributes, n = A.position.count;
      const shaded = g.index ? new Set(g.index.array).size : Math.min(n, g.drawRange.count === Infinity ? n : g.drawRange.count);
      let uniq = shaded;
      if (!g.index && A.position.itemSize === 3 && !A.position.isInterleavedBufferAttribute) {
        const P = u32(A.position), N = A.normal && !A.normal.isInterleavedBufferAttribute ? u32(A.normal) : null, Cc = A.color && !A.color.isInterleavedBufferAttribute ? u32(A.color) : null, U = A.uv && !A.uv.isInterleavedBufferAttribute ? u32(A.uv) : null;
        const set = new Set(); const ps = A.position.itemSize, ns = A.normal ? A.normal.itemSize : 0, cs = A.color ? A.color.itemSize : 0, us = A.uv ? A.uv.itemSize : 0;
        const others = Object.keys(A).filter((k) => !['position', 'normal', 'color', 'uv'].includes(k));
        if (!others.length) {
          for (let i = 0; i < n; i++) { let k = P[i * ps] + ',' + P[i * ps + 1] + ',' + P[i * ps + 2]; if (N) for (let j = 0; j < ns; j++) k += ',' + N[i * ns + j]; if (Cc) for (let j = 0; j < cs; j++) k += ',' + Cc[i * cs + j]; if (U) for (let j = 0; j < us; j++) k += ',' + U[i * us + j]; set.add(k); }
          uniq = set.size;
        } else uniq = -1;
      }
      out.push({ owner: owner(e.obj), name: e.obj.name || e.obj.type, indexed: !!g.index, verts: n, shaded, uniq, dynamic: A.position.version !== e.v0, draws: e.draws, attrs: Object.keys(A).join('+'), mat: (Array.isArray(e.obj.material) ? 'multi' : e.obj.material.type) });
    }
    return { frames, out };
  }, views);
  const rows = res.out;
  const by = {};
  for (const r of rows) { const k = r.owner.startsWith('creature') ? 'creature' : r.owner; const b = by[k] || (by[k] = { geos: 0, shaded: 0, save: 0, nonIdx: 0 }); b.geos++; b.shaded += r.shaded; if (r.uniq >= 0) b.save += r.shaded - r.uniq; if (!r.indexed) b.nonIdx++; }
  console.log(`\n${rows.length} geometries drawn over ${res.frames} frames in ${views.length} views (vertices shaded per draw, summed once per geometry)`);
  for (const [k, b] of Object.entries(by)) console.log(`  ${k.padEnd(14)} ${String(b.geos).padStart(4)} geometries (${b.nonIdx} non-indexed), ${String(b.shaded).padStart(8)} vertices shaded, ${String(b.save).padStart(8)} are copies indexing would share`);
  console.log('\nlargest savings (owner | mesh | material | indexed | shaded -> distinct | positions change | attributes):');
  rows.filter((r) => r.uniq >= 0 && r.shaded > r.uniq).sort((a, b) => (b.shaded - b.uniq) - (a.shaded - a.uniq)).slice(0, 30)
    .forEach((r) => console.log(`  ${r.owner} | ${r.name} | ${r.mat} | ${r.indexed} | ${r.shaded} -> ${r.uniq} | ${r.dynamic ? 'YES' : 'no'} | ${r.attrs}`));
  const dyn = rows.filter((r) => r.dynamic);
  console.log(`\n${dyn.length} drawn geometries had their positions rewritten during the window: ` + dyn.slice(0, 12).map((r) => `${r.owner} ${r.name} ${r.shaded}`).join(', '));
  await g.close();
})().catch((e) => { console.error(e); process.exit(1); });
