// Optimisation identity check (full tier): every performance change that claims "nothing visible
// changes" publishes an on/off switch; this renders the same views with the switch on and off in the
// same frame (nothing moves between the two renders) and fails if any view differs by more than
// rasterisation noise. It also counts the draw calls and triangles of each state, so the saving is
// measured, not estimated.
//
// Switches checked: P8 multi-material merge (window.__gtMM), and any later ones registered in OPTS.
// Views: a town grid at eye height (four headings), an orbit of every multi-material mesh (the garden
// plots), and the same after the planting Event has laid out its thirteen plots.
//
//   node tools/opt_identity.js [file] [--save] [--no-event]
const path = require('path');
const fs = require('fs');
const { boot, reporter, root } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const save = process.argv.includes('--save');
const noEvent = process.argv.includes('--no-event');
const outDir = path.join(root, 'tools/.runs/opt_identity');
// name, the page expression that switches it (v = true/false), and which views matter most.
const OPTS = [
  // The batcher as a whole (and P9's per-part shininess and specular inside it): batches drawn, against
  // every source mesh drawn on its own with the batch meshes hidden.
  { name: 'batcher (merged parts vs their own meshes)', expr: 'window.__idBatch(v)', present: '!!(window.__dbg && window.__dbg.gcEB && window.__dbg.gcEB.list.length)', moreTris: true },
  { name: 'P8 multi-material merge', expr: 'window.__gtMM && window.__gtMM.set(v)', present: '!!window.__gtMM' },
  { name: 'P10 matrix cache', expr: 'window.__gtMx && window.__gtMx.set(v)', present: '!!window.__gtMx' },
];
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  if (save) fs.mkdirSync(outDir, { recursive: true });
  const page = g.page;
  // Batch switch for the identity check: after the game's own pre-render work (the batcher's update runs
  // there and decides each batch's visibility), hide every batch mesh and put its live parts back on layer 0.
  await page.evaluate(() => {
    const D = window.__dbg, C = D.C; let off = false; const prev = C.onBeforeRender; const moved = [];
    C.onBeforeRender = function () { const r = prev ? prev.apply(this, arguments) : undefined; if (off) for (const b of D.gcEB.list) { if (b.mesh.visible) { b.mesh.visible = false; moved.push(b.mesh); } for (const p of b.P) if (p.on && p.st === 1 && p.o.layers.mask !== 1) { p.o.layers.set(0); moved.push(p.o); } } return r; };
    window.__idBatch = (v) => { off = !v; if (v) { for (const o of moved) { if (o.isMesh && o.parent === D.gcEB.root) o.visible = true; else o.layers.set(31); } moved.length = 0; } };
  });
  const run = (label, opt) => page.evaluate(({ label, opt, save }) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), t = D.t;
    const sw = new Function('v', opt.expr);
    const el = document.getElementById('gate'); if (el) el.style.display = 'none';
    // In a VR session three.js substitutes the XR framebuffer whenever the canvas is asked for; clear that
    // override so the renders land on the canvas (the game's frame loop binds the XR one again next frame).
    const xrWas = O.xr.enabled, rtWas = O.getRenderTarget(); O.xr.enabled = false; O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
    const W = O.domElement.width, H = O.domElement.height, N = 320;
    const cam = new T.PerspectiveCamera(70, 1, 0.1, 400);
    const bufs = [new Uint8Array(N * N * 4), new Uint8Array(N * N * 4)];
    const stats = [{ calls: 0, tris: 0 }, { calls: 0, tris: 0 }];
    const shot = (k) => { O.setViewport(0, 0, N, N); O.setScissor(0, 0, N, N); O.setScissorTest(true); O.render(C, cam); stats[k].calls += O.info.render.calls; stats[k].tris += O.info.render.triangles; O.setScissorTest(false); O.setViewport(0, 0, W, H); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, bufs[k]); };
    const mask = new Uint8Array(N * N);
    // A blank or uniform image would compare as identical: count it as a failed view.
    const blank = (b) => { let nz = 0; const r0 = b[0], g0 = b[1], b0 = b[2]; let uni = true; for (let i = 0; i < b.length; i += 4) { if (b[i] | b[i + 1] | b[i + 2]) nz++; if (uni && (b[i] !== r0 || b[i + 1] !== g0 || b[i + 2] !== b0)) uni = false; } return nz === 0 || uni; };
    const diff = () => { let n = 0, interior = 0, maxd = 0; const a = bufs[0], b = bufs[1]; for (let i = 0, p = 0; i < a.length; i += 4, p++) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); if (d > maxd) maxd = d; mask[p] = d > 24 ? 1 : 0; if (d > 24) n++; }
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const p = y * N + x; if (mask[p] && mask[p - 1] && mask[p + 1] && mask[p - N] && mask[p + N]) interior++; }
      return { pct: 100 * n / (N * N), interior: 100 * interior / (N * N), maxd }; };
    const png = () => { const cv = document.createElement('canvas'); cv.width = 2 * N; cv.height = N; const cx = cv.getContext('2d'); [0, 1].forEach((k) => { const im = cx.createImageData(N, N); for (let y = 0; y < N; y++) im.data.set(bufs[k].subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4); cx.putImageData(im, k * N, 0); }); return cv.toDataURL('image/png'); };
    const views = [];
    const view = (vl, eye, target) => {
      cam.position.copy(eye); cam.lookAt(target); cam.updateMatrixWorld(true);
      sw(true); shot(0); sw(false); shot(1); sw(true);
      const d = diff(); const v = { label: vl, pct: +d.pct.toFixed(3), interior: +d.interior.toFixed(3), maxd: d.maxd, blank: blank(bufs[0]) || blank(bufs[1]) }; if (save && d.pct > 0) v.png = png(); views.push(v);
    };
    const half = t.parkHalf - 4, south = t.parkSouth - 4;
    for (let x = -half; x <= half; x += (2 * half) / 3) for (let z = -half; z <= south; z += (half + south) / 3) for (let h = 0; h < 4; h++) { const a = h * Math.PI / 2; const eye = new T.Vector3(x, 1.6, z); view(`town (${x.toFixed(0)}, ${z.toFixed(0)}) heading ${h * 90}`, eye, eye.clone().add(new T.Vector3(Math.sin(a) * 6, -0.8, Math.cos(a) * 6))); }
    const mm = []; C.traverse((o) => { if (o.isMesh && Array.isArray(o.material) && o.visible) mm.push(o); });
    for (const o of mm) { const c = o.getWorldPosition(new T.Vector3()); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; view(`multi-material mesh at (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) angle ${k * 90}`, new T.Vector3(c.x + Math.cos(a) * 2.2, c.y + 1.4, c.z + Math.sin(a) * 2.2), c); } }
    O.xr.enabled = xrWas; O.setRenderTarget(rtWas);
    return { label, views, stats, mm: mm.length };
  }, { label, opt, save });
  const results = [];
  const check = async (phase) => {
    for (const opt of OPTS) {
      const present = await page.evaluate((e) => { try { return eval(e); } catch (x) { return false; } }, opt.present);
      if (!present) { note(`${phase}: ${opt.name} not in this build, skipped`); continue; }
      const r = await run(phase, opt); results.push({ opt: opt.name, ...r });
      const blanks = r.views.filter((v) => v.blank);
      expect(`${phase}: ${opt.name}: every view rendered something (no blank or uniform image)`, blanks.length === 0, `${blanks.length} blank: ${blanks.slice(0, 4).map((v) => v.label).join(' | ')}`);
      const bad = r.views.filter((v) => v.pct > 0.02 || v.interior > 0);
      const [on, off] = r.stats;
      note(`${phase}: ${opt.name}: ${r.views.length} views (${r.mm} multi-material meshes); draw calls ${off.calls} -> ${on.calls} (${off.calls - on.calls} fewer), triangles ${off.tris} -> ${on.tris}`);
      for (const v of bad.slice(0, 8)) console.log(`  DIFF  ${v.label}: ${v.pct}% of pixels differ, ${v.interior}% in areas, max channel sum ${v.maxd}`);
      if (save) for (const v of r.views.filter((v) => v.png)) fs.writeFileSync(path.join(outDir, `${opt.name.split(' ')[0]}_${v.label.replace(/[^\w]+/g, '_')}.png`), Buffer.from(v.png.split(',')[1], 'base64'));
      expect(`${phase}: ${opt.name} renders the same pixels on and off`, bad.length === 0, bad.map((v) => `${v.label} ${v.pct}%`).slice(0, 6).join(' | '));
      // A batch is culled as a whole, so the batcher may submit more triangles than its parts would; it must
      // still save draws. Every other switch must save without adding either.
      expect(`${phase}: ${opt.name} never adds draw calls${opt.moreTris ? '' : ' or triangles'}`, on.calls <= off.calls && (opt.moreTris || on.tris <= off.tris), `calls ${off.calls} -> ${on.calls}, tris ${off.tris} -> ${on.tris}`);
    }
  };
  await page.waitForTimeout(1500);
  await check('town at load');
  if (!noEvent) {
    // the planting Event lays out its plots; run it in the background renderer, then check again.
    const started = await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); await wait(25000); clearInterval(adv); return !!D.me.active; });
    if (started) await check('the Event, 25 s in'); else note('the planting Event did not start in the desktop session; Event views skipped');
  }
  expect('no page errors', g.errors.length === 0, g.errors.join(' | '));
  fs.mkdirSync(path.join(root, 'tools/.runs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tools/.runs/opt_identity.json'), JSON.stringify(results.map((r) => ({ opt: r.opt, label: r.label, stats: r.stats, worst: r.views.slice().sort((a, b) => b.pct - a.pct).slice(0, 5) })), null, 1));
  await g.close();
  console.log(failures.length ? `OPT IDENTITY FAILED (${failures.length})` : 'OPT IDENTITY PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
