// Draw-call breakdown (report): what one frame draws, at the spawn, at the town centre (where the
// creatures gather) and, with --event, during the planting Event. Each draw is classed (batch mesh,
// creature part, UI, points, other), keyed by its material signature, and the batches are grouped by
// signature so the calls that only exist because of the batcher's part limit (gcEB.N parts per batch)
// show up as such.
//
//   node tools/draw_calls.js [file] [--event] [--at "x,z;x,z" --yaws 4]
// --at: in the Event, stand at these positions (e.g. the ones a headset perf line logged) and look in
// --yaws directions from each; prints each view's draws and the reasons summed over all of them.
// With GT_HEADSET_FOV=1 the fake eyes are Quest 3-shaped; with GT_MULTIVIEW=1 each draw serves both eyes.
const path = require('path');
const { boot, root } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const withEvent = process.argv.includes('--event');
// The batcher's vertex cap for scenery parts: the game batches the scene's other top-level objects with _e(w, 6e4)
// (P23; it was 4000 before 3.15.47); the creatures' groups have no cap.
const VCAP = 60000;
(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.evaluate((VCAP) => {
    const D = window.__dbg, O = D.O, T = window.THREE;
    const sig = (m) => [m.type, m.color ? '#' + m.color.getHexString() : '', m.emissive && m.emissive.getHex() ? 'e' + m.emissive.getHexString() : '', m.map ? 'map' : '', m.transparent ? 'T' + (m.opacity < 1 ? m.opacity.toFixed(2) : '') : '', m.side, m.vertexColors ? 'vc' : '', m.flatShading ? 'flat' : '', m.shininess != null ? 's' + m.shininess : ''].filter(Boolean).join(' ');
    window.__dc = { draws: null };
    // Why the batcher left a mesh out (mirrors the game's eligibility test in _e).
    const obr = D.gcEB.obr, obc = D.gcEB.obc;
    const top = (o) => { let p = o; while (p.parent && p.parent !== D.C) p = p.parent; return p; };
    const tops = D.C.children;
    const excluded = new Set([...(D.le && D.le.list || []), ...(D.ce && D.ce.list || [])]);
    const why = (t) => {
      const tp = top(t); if (excluded.has(tp)) return 'pickup (excluded)';
      if (tp.isLight || tp.isCamera) return 'light/camera';
      if (t.isInstancedMesh) return 'instanced';
      if (t.layers.mask !== 1) return 'layer ' + t.layers.mask;
      if (t.onBeforeRender !== obr) return 'has onBeforeRender';
      const e = t.material, o = t.geometry;
      if (!e || Array.isArray(e)) return 'multi-material';
      if (!(e.isMeshPhongMaterial || e.isMeshLambertMaterial || e.isMeshBasicMaterial)) return 'material ' + e.type;
      if (e.transparent) return 'transparent';
      if (e.blending !== 1) return 'blending';
      if (e.alphaMap || e.aoMap || e.lightMap || e.emissiveMap || e.normalMap || e.specularMap || e.envMap || e.displacementMap) return 'extra maps';
      if (e.onBeforeCompile !== obc) return 'custom shader hook';
      if (o.drawRange.start || o.drawRange.count !== Infinity) return 'drawRange';
      if (Object.keys(o.morphAttributes).length) return 'morph';
      if ((o.userData.gcN || o.attributes.position.count) > VCAP && !D.It.all.some((x) => x.group === tp)) return `over ${VCAP} vertices`;
      if (!tp.userData.gcEB) return 'added after batching';
      const part = D.gcEB.list.some((b) => b.P.some((q) => q.o === t && !q.on)); if (part) return 'batch part switched off';
      return 'lone signature in its group';
    };
    window.__dcWhy = why;
    const rbd = O.renderBufferDirect.bind(O);
    O.renderBufferDirect = (cam, sc, geo, mat, obj, grp) => { if (window.__dc.draws) { const idx = geo.index, pos = geo.attributes.position; let n = idx ? idx.count : pos ? pos.count : 0; if (grp && grp.count !== Infinity) n = grp.count; let cat = 'other', p = obj, ent = null; while (p) { if (D.gcEB && p === D.gcEB.root) cat = 'batch'; if (p.userData && p.userData.xrUI) cat = 'ui'; p = p.parent; } if (cat === 'other') { ent = D.It.all.find((e) => { let q = obj; while (q) { if (q === e.group) return true; q = q.parent; } return false; }); if (ent) cat = 'creature'; else if (obj === D.At || (() => { let q = obj; while (q) { if (q === D.At) return true; q = q.parent; } return false; })()) cat = 'player'; } if (obj.isPoints) cat = 'points'; const nm = (() => { const out = []; let p = obj; while (p && p !== D.C) { if (p.name) out.push(p.name); p = p.parent; } return out.slice(0, 3).join('<'); })(); const tp = (() => { let p = obj; while (p.parent && p.parent !== D.C) p = p.parent; return p; })(); window.__dc.draws.push({ nm, mm: Array.isArray(obj.material) ? obj.material.map((m) => m.type + (m.map ? '+map' : '') + '#' + (m.color ? m.color.getHexString() : '')).join(',') : '', cat, why: cat === 'other' || cat === 'creature' ? why(obj) : '', top: (tp.name || tp.type) + '#' + D.C.children.indexOf(tp), verts: geo.attributes.position ? geo.attributes.position.count : 0, sig: sig(mat), tris: Math.round(n / 3), name: obj.name || '', ent: ent && ent.def ? ent.def.name : '', parts: (() => { const b = D.gcEB.list.find((x) => x.mesh === obj); return b ? b.P.length : 0; })(), cap: D.gcEB.N, pos: cat !== 'batch' ? [Math.round(obj.getWorldPosition(new T.Vector3()).x), Math.round(obj.getWorldPosition(new T.Vector3()).z)] : null }); } return rbd(cam, sc, geo, mat, obj, grp); };
    window.__dcFrame = () => new Promise((res) => { window.__dc.draws = []; const sess = O.xr.getSession(); const real = sess.__real || sess; real.requestAnimationFrame(() => setTimeout(() => { const d = window.__dc.draws; window.__dc.draws = null; res(d); }, 0)); });
  }, VCAP);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const summarise = (draws) => {
    // one draw per eye: the fake session renders both eyes in one render call, three.js issues the draw once per view
    const byCat = {}; for (const d of draws) { const c = byCat[d.cat] = byCat[d.cat] || { calls: 0, tris: 0 }; c.calls++; c.tris += d.tris; }
    const batches = {}; for (const d of draws.filter((d) => d.cat === 'batch')) { const b = batches[d.sig] = batches[d.sig] || { calls: 0, tris: 0, parts: 0 }; b.calls++; b.tris += d.tris; b.parts += d.parts; }
    // a batch at the part limit (gcEB.N parts) is one that split: its signature's next parts went into another batch
    const mergeable = draws.filter((d) => d.cat === 'batch' && d.parts >= d.cap).length, N = (draws.find((d) => d.cap) || {}).cap;
    const nonBatch = {}; for (const d of draws.filter((d) => d.cat !== 'batch')) { const k = d.cat + ' | ' + d.sig; const b = nonBatch[k] = nonBatch[k] || { calls: 0, tris: 0, names: new Set() }; b.calls++; b.tris += d.tris; b.names.add(d.ent || d.name || '?'); }
    const whys = {}; for (const d of draws.filter((d) => d.why)) { const w = whys[d.why] = whys[d.why] || { calls: 0, tris: 0, ex: new Set() }; w.calls++; w.tris += d.tris; w.ex.add(d.top + ' ' + d.verts + 'v'); }
    return { whys: Object.entries(whys).sort((a, b) => b[1].calls - a[1].calls).map(([k, v]) => [k, v.calls, v.tris, [...v.ex].slice(0, 6).join(', ')]), total: draws.length, tris: draws.reduce((a, d) => a + d.tris, 0), byCat, batchSigs: Object.keys(batches).length, mergeable, N, topBatches: Object.entries(batches).sort((a, b) => b[1].calls - a[1].calls).slice(0, 8), topNonBatch: Object.entries(nonBatch).sort((a, b) => b[1].calls - a[1].calls).slice(0, 12).map(([k, v]) => [k, { calls: v.calls, tris: v.tris, names: [...v.names].slice(0, 4).join(',') }]) };
  };
  const print = (label, s) => {
    console.log(`\n== ${label}: ${s.total} draws, ${s.tris} triangles (both eyes)`);
    console.log('  by class: ' + Object.entries(s.byCat).map(([k, v]) => `${k} ${v.calls} calls / ${v.tris} tris`).join('; '));
    console.log(`  batches: ${s.byCat.batch ? s.byCat.batch.calls : 0} calls over ${s.batchSigs} material signatures; ${s.mergeable} drawn batches are full (${s.N} parts; each full one split its signature into another batch)`);
    for (const [k, v] of s.topBatches) console.log(`    ${String(v.calls).padStart(3)} batches  ${String(v.parts).padStart(4)} parts  ${String(v.tris).padStart(7)} tris  ${k}`);
    console.log('  unbatched draws by reason (calls are both eyes):');
    for (const [k, c, t, ex] of s.whys) console.log(`    ${String(c).padStart(3)} calls ${String(t).padStart(7)} tris  ${k}   e.g. ${ex}`);
    console.log('  other draws by class and material:');
    for (const [k, v] of s.topNonBatch) console.log(`    ${String(v.calls).padStart(3)} calls  ${String(v.tris).padStart(7)} tris  ${k}  (${v.names})`);
  };
  await wait(1500);
  print('spawn', summarise(await page.evaluate(() => window.__dcFrame())));
  await page.evaluate(() => { const D = window.__dbg; const es = D.It.all.filter((e) => e.group && e.group.visible !== false); const c = es.reduce((a, e) => [a[0] + e.group.position.x, a[1] + e.group.position.z], [0, 0]).map((v) => v / es.length); D.At.position.x = c[0]; D.At.position.z = c[1] + 1; D.At.updateMatrixWorld(true); });
  await wait(1500);
  print('town centre (among the creatures)', summarise(await page.evaluate(() => window.__dcFrame())));
  if (withEvent) {
    await page.evaluate(() => { window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });
    const started = await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); return D.me.active; });
    const atArg = process.argv.find((a, i) => process.argv[i - 1] === '--at');
    if (started && atArg) {
      await wait(30000);
      const yaws = +(process.argv.find((a, i) => process.argv[i - 1] === '--yaws') || 4);
      const pts = atArg.split(';').map((p) => p.split(',').map(Number));
      const sumWhy = {}, sumCls = {}; let n = 0, tot = 0, tris = 0;
      for (const [x, z] of pts) for (let k = 0; k < yaws; k++) {
        const yaw = k * 2 * Math.PI / yaws;
        await page.evaluate(([x, z, yaw]) => { const D = window.__dbg; D.At.position.x = x; D.At.position.z = z; window.__fakeXR.pose.yaw = yaw; }, [x, z, yaw]);
        await wait(500);
        const s = summarise(await page.evaluate(() => window.__dcFrame()));
        n++; tot += s.total; tris += s.tris;
        for (const [k2, c, t] of s.whys) { const w = sumWhy[k2] = sumWhy[k2] || { calls: 0, tris: 0 }; w.calls += c; w.tris += t; }
        for (const [k2, v] of Object.entries(s.byCat)) { const w = sumCls[k2] = sumCls[k2] || { calls: 0, tris: 0 }; w.calls += v.calls; w.tris += v.tris; }
        console.log(`  at (${x}, ${z}) yaw ${Math.round(yaw * 180 / Math.PI)}: ${s.total} draws, ${s.tris} triangles; ` + Object.entries(s.byCat).map(([k2, v]) => `${k2} ${v.calls}`).join(', '));
      }
      console.log(`\n== the Event, ${n} views at the given positions: average ${(tot / n).toFixed(0)} draws, ${(tris / n / 1000).toFixed(0)}k triangles per frame`);
      console.log('  by class (average per view): ' + Object.entries(sumCls).sort((a, b) => b[1].calls - a[1].calls).map(([k2, v]) => `${k2} ${(v.calls / n).toFixed(0)} draws / ${(v.tris / n / 1000).toFixed(0)}k tris`).join('; '));
      console.log('  unbatched draws by reason (average per view):');
      for (const [k2, v] of Object.entries(sumWhy).sort((a, b) => b[1].calls - a[1].calls)) console.log(`    ${(v.calls / n).toFixed(1).padStart(6)} draws ${(v.tris / n / 1000).toFixed(1).padStart(6)}k tris  ${k2}`);
    } else if (started) { await wait(20000); print('the Event, 20 s in', summarise(await page.evaluate(() => window.__dcFrame()))); await wait(40000); print('the Event, 60 s in', summarise(await page.evaluate(() => window.__dcFrame()))); } else console.log('the Event did not start');
  }
  if (process.argv.includes('--detail')) {
    const d = await page.evaluate(() => window.__dcFrame());
    const rows = {}; for (const x of d.filter((x) => x.why && x.why !== `over ${VCAP} vertices`)) { const k = `${x.why} | ${x.cat} ${x.ent} | top ${x.top} ${x.nm} | ${x.verts}v | ${x.sig}${x.mm ? ' | ' + x.mm : ''}`; rows[k] = (rows[k] || 0) + 1; }
    console.log('\n== detail (count = draws, both eyes)'); for (const [k, v] of Object.entries(rows).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
  }
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
