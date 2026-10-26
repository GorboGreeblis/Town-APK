#!/usr/bin/env node
// Performance probe (analysis only): scene statistics and per-frame CPU cost of
// the bundled game inside the fake VR session. Rendering runs on software GL
// here, so draw-call / triangle counts are meaningful, GPU time is not.
//
//   node tools/perf_probe.js [file]
const path = require('path');
const { boot, root } = require('./lib/harness.js');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { page, browser, bootS } = await boot({ file, fastSim: false });
  console.log(`booted in ${bootS}s`);
  const r = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, C = D.C, out = {};
    const sess = O.xr.getSession();
    // Time each XR frame callback (game update + render) by wrapping the fake session's rAF.
    const samples = [];
    const orig = sess.requestAnimationFrame.bind(sess);
    sess.requestAnimationFrame = (cb) => orig((t, f) => { const a = performance.now(); cb(t, f); samples.push(performance.now() - a); });
    const renderT = []; const realRender = O.render.bind(O);
    O.render = (...a) => { const t0 = performance.now(); realRender(...a); renderT.push(performance.now() - t0); };
    await new Promise((r) => setTimeout(r, 6000));
    out.info = { calls: O.info.render.calls, triangles: O.info.render.triangles, points: O.info.render.points, lines: O.info.render.lines, geometries: O.info.memory.geometries, textures: O.info.memory.textures, programs: O.info.programs.length };
    const pct = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : null; };
    out.withRender = { frames: samples.length, p50: pct(samples, 0.5), p90: pct(samples, 0.9), renderP50: pct(renderT, 0.5) };
    // Now update-only: stub the draw and measure the game logic alone.
    O.render = () => {}; samples.length = 0;
    await new Promise((r) => setTimeout(r, 8000));
    out.updateOnly = { frames: samples.length, p50: pct(samples, 0.5), p90: pct(samples, 0.9), p99: pct(samples, 0.99), max: pct(samples, 1) };
    // Scene census
    let meshes = 0, visible = 0, sprites = 0, transparent = 0, lights = 0, instanced = 0, skinned = 0, mats = new Set(), geos = new Set(), culledOff = 0, maxVerts = 0, totalVerts = 0;
    C.traverse((o) => {
      if (o.isLight) lights++;
      if (o.isSprite) sprites++;
      if (o.isMesh) { meshes++; if (o.visible) visible++; if (o.isInstancedMesh) instanced++; if (o.isSkinnedMesh) skinned++; if (o.frustumCulled === false) culledOff++;
        const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((x) => { mats.add(x); if (x && x.transparent) transparent++; });
        if (o.geometry) { geos.add(o.geometry); const n = o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; totalVerts += n; if (n > maxVerts) maxVerts = n; } }
    });
    out.scene = { meshes, visible, sprites, instanced, skinned, lights, materials: mats.size, geometries: geos.size, transparentMeshes: transparent, frustumCulledOff: culledOff, totalVertsInScene: totalVerts, largestGeometryVerts: maxVerts };
    const kinds = {}; mats.forEach((m) => { kinds[m.type] = (kinds[m.type] || 0) + 1; }); out.materialKinds = kinds;
    out.heapMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null;
    out.camera = { far: D.B.far, fogNear: C.fog && C.fog.near, fogFar: C.fog && C.fog.far };
    out.xr = { fbScale: O.xr.getFramebufferScaleFactor ? O.xr.getFramebufferScaleFactor() : null, level: D.Ge && D.Ge.level };
    out.entities = D.It.all.length;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close().catch(() => {}); process.exit(0);
})();
