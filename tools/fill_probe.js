// Fill probe (report): how many transparent layers the GPU shades per pixel, and which meshes cost it.
// Opaque geometry is drawn to depth only; every visible transparent mesh is drawn with an additive counter
// (one unit per fragment, depth-tested against the opaque scene, as the game draws them), so each pixel
// ends up holding the number of transparent layers shaded there. Then each transparent mesh in view is
// drawn alone to attribute the layers. Views: the town grid at eye height, the garden, and the same
// 25 s into the planting Event. Points and sprites are not counted (noted).
//
//   node tools/fill_probe.js [file] [--no-event]
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const noEvent = process.argv.includes('--no-event');
(async () => {
  const g = await boot({ file, vr: true, fastSim: false }); const page = g.page;
  await page.waitForTimeout(1500);
  const probe = (label) => page.evaluate((label) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), t = D.t;
    const xrWas = O.xr.enabled, rtWas = O.getRenderTarget(); O.xr.enabled = false; O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
    if (O.outputEncoding !== 3000) throw new Error('output encoding is not linear; counts would be distorted');
    const N = 192, W = O.domElement.width, H = O.domElement.height, buf = new Uint8Array(N * N * 4);
    const cam = new T.PerspectiveCamera(90, 1, 0.05, 500);
    const restore = []; const trans = []; let points = 0;
    const visible = (o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
    const depthOnly = new T.MeshBasicMaterial({ colorWrite: false });
    C.traverse((o) => {
      if (o.isPoints || o.isSprite) { if (visible(o)) points++; const v = o.visible; restore.push(() => { o.visible = v; }); o.visible = false; return; }
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material]; const orig = o.material; restore.push(() => { o.material = orig; });
      const isT = mats.some((m) => m.transparent && m.visible !== false && m.opacity > 0.002);
      if (isT && visible(o) && (o.layers.mask & 1)) {
        const cnt = new T.MeshBasicMaterial({ color: new T.Color(1 / 255, 0, 0), transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: mats[0].depthTest, side: mats[0].side, toneMapped: false, fog: false });
        o.material = Array.isArray(orig) ? orig.map(() => cnt) : cnt; trans.push(o);
      } else if (mats.every((m) => !m.transparent) && mats.some((m) => m.visible !== false && m.colorWrite !== false)) {
        o.material = Array.isArray(orig) ? orig.map((m) => { const d = depthOnly.clone(); d.side = m.side; return d; }) : (() => { const d = depthOnly.clone(); d.side = orig.side; return d; })();
      } else { o.material = new T.MeshBasicMaterial({ visible: false }); }
    });
    // batches: their parts are parked on layer 31 and the batch meshes carry them; the depth-only swap above
    // covers the batch meshes (opaque). Fog and background off.
    const bg = C.background, fog = C.fog; C.background = new T.Color(0, 0, 0); C.fog = null;
    const shoot = () => { O.setViewport(0, 0, N, N); O.setScissor(0, 0, N, N); O.setScissorTest(true); O.setClearColor(0x000000, 1); O.clear(true, true, true); O.render(C, cam); O.setScissorTest(false); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, buf); let s = 0, mx = 0, cov = 0; for (let i = 0; i < buf.length; i += 4) { s += buf[i]; if (buf[i] > mx) mx = buf[i]; if (buf[i]) cov++; } return { mean: s / (N * N), max: mx, cov: cov / (N * N) }; };
    const views = []; const per = new Map();
    const fr = new T.Frustum(), pm = new T.Matrix4();
    const view = (vl, eye, target) => {
      cam.position.copy(eye); cam.lookAt(target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
      const all = shoot(); const v = { label: vl, ...all, top: [] };
      if (all.mean > 0) {
        const shown = trans.map((o) => o.visible); trans.forEach((o) => { o.visible = false; });
        for (let i = 0; i < trans.length; i++) { const o = trans[i]; if (!shown[i]) continue; o.visible = true; const r = shoot(); o.visible = false; if (r.mean > 0) { v.top.push([o, r.mean]); const k = o; const e = per.get(k) || { sum: 0, views: 0, max: 0 }; e.sum += r.mean; e.views++; e.max = Math.max(e.max, r.mean); per.set(k, e); } }
        trans.forEach((o, i) => { o.visible = shown[i]; });
        v.top = v.top.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([o, m]) => describe(o) + ' ' + m.toFixed(3));
      }
      views.push(v);
    };
    const describe = (o) => { const names = []; let q = o; while (q && q !== C) { if (q.name) names.push(q.name); q = q.parent; } let top = o; while (top.parent && top.parent !== C) top = top.parent; const ent = D.It.all.find((e) => { let z = o; while (z) { if (z === e.group) return true; z = z.parent; } return false; }); const m = Array.isArray(restore) ? null : null; const p = o.getWorldPosition(new T.Vector3()); const geo = o.geometry; const tris = geo ? Math.round((geo.index ? geo.index.count : geo.attributes.position.count) / 3) : 0; return `${ent && ent.def ? ent.def.name : 'top #' + C.children.indexOf(top)}${names.length ? ' ' + names.slice(0, 2).join('<') : ''} (${tris} tris at ${p.x.toFixed(0)},${p.y.toFixed(1)},${p.z.toFixed(0)})`; };
    const half = t.parkHalf - 4, south = t.parkSouth - 4;
    for (let x = -half; x <= half; x += (2 * half) / 3) for (let z = -half; z <= south; z += (half + south) / 3) for (let h = 0; h < 4; h++) { const a = h * Math.PI / 2; const eye = new T.Vector3(x, 1.6, z); view(`town (${x.toFixed(0)}, ${z.toFixed(0)}) heading ${h * 90}`, eye, eye.clone().add(new T.Vector3(Math.sin(a) * 6, -0.6, Math.cos(a) * 6))); }
    // the garden (the Event's stage): around the plot at load
    const plots = []; C.traverse((o) => { if (o.isMesh && Array.isArray(o.material)) plots.push(o.getWorldPosition(new T.Vector3())); });
    const gc = plots.length ? plots.reduce((a, p) => a.add(p), new T.Vector3()).multiplyScalar(1 / plots.length) : new T.Vector3(-26, 0, -26);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; view(`garden angle ${k * 45}`, new T.Vector3(gc.x + Math.cos(a) * 7, 1.6, gc.z + Math.sin(a) * 7), new T.Vector3(gc.x, 1, gc.z)); }
    C.background = bg; C.fog = fog; for (const f of restore.reverse()) f(); O.setViewport(0, 0, W, H); O.state.bindXRFramebuffer(null); O.setRenderTarget(rtWas); O.xr.enabled = xrWas;
    const perList = [...per.entries()].map(([o, e]) => ({ what: describe(o), avg: e.sum / views.length, max: e.max, views: e.views })).sort((a, b) => b.avg - a.avg).slice(0, 15);
    return { label, transparent: trans.length, points, views: views.map((v) => ({ label: v.label, mean: +v.mean.toFixed(3), max: v.max, cov: +v.cov.toFixed(3), top: v.top })), perList };
  }, label);
  const print = (r) => {
    const vs = r.views; const avg = vs.reduce((a, v) => a + v.mean, 0) / vs.length; const worst = vs.slice().sort((a, b) => b.mean - a.mean);
    console.log(`\n== ${r.label}: ${r.transparent} visible transparent meshes, ${r.points} points/sprites (not counted); ${vs.length} views`);
    console.log(`  transparent layers per pixel: average ${avg.toFixed(3)} over all views; worst views:`);
    for (const v of worst.slice(0, 6)) console.log(`    ${v.mean.toFixed(3)} per pixel (max ${v.max} layers, ${(100 * v.cov).toFixed(0)}% of the view covered)  ${v.label}   ${v.top.join(' | ')}`);
    console.log('  meshes by layers per pixel averaged over all views (max in one view):');
    for (const m of r.perList) console.log(`    ${m.avg.toFixed(4)} avg  ${m.max.toFixed(3)} max  in ${m.views} views  ${m.what}`);
  };
  print(await probe('town at load'));
  if (!noEvent) {
    const ok = await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); await wait(25000); clearInterval(adv); return !!D.me.active; });
    if (ok) print(await probe('the Event, 25 s in')); else console.log('the planting Event did not start');
  }
  if (g.errors.length) console.log('page errors: ' + g.errors.join(' | '));
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
