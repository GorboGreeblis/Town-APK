// Single-sided pass check (P6): the game sets every material to DoubleSide; P6 turns the
// materials of closed, outward-wound meshes to FrontSide, which must be pixel-identical.
// This renders the town from a grid of eye-height views and every character from a close
// orbit, with the flipped materials as P6 left them and then flipped back to DoubleSide,
// in the same frame (nothing moves between the two renders), and counts the pixels that
// differ. Silhouette edges differ by one pixel (a grazing triangle culled on one side only);
// a view fails when differing pixels form an area (0.05% of pixels with all four neighbours
// differing too; thin tubes seen edge-on account for a few).
//
//   node tools/sides_check.js [file] [--save]
const path = require('path');
const fs = require('fs');
const { boot, reporter, root } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const save = process.argv.includes('--save');
const outDir = path.join(root, 'tools/.runs/sides');
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false, fastSim: false });
  if (save) fs.mkdirSync(outDir, { recursive: true });
  const r = await g.page.evaluate(({ save }) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), t = D.t;
    const e = document.getElementById('gate'); if (e) e.style.display = 'none';
    O.xr.enabled = false; O.setRenderTarget(null);
    const W = O.domElement.width, H = O.domElement.height, N = 384;
    const cam = new T.PerspectiveCamera(60, 1, 0.1, 400);
    const bufs = [new Uint8Array(N * N * 4), new Uint8Array(N * N * 4)];
    // Every material P6 flipped (sources and the batch clones built from them).
    const flipped = new Set(); C.traverse((o) => { if (!o.isMesh) return; const m = o.material; if (m && !Array.isArray(m) && m.__gbFS && m.side === T.FrontSide) flipped.add(m); });
    const setSide = (side) => { flipped.forEach((m) => { m.side = side; m.needsUpdate = true; }); };
    const shot = (k) => { O.setViewport(0, 0, N, N); O.setScissor(0, 0, N, N); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false); O.setViewport(0, 0, W, H); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, bufs[k]); };
    // Differences on silhouette edges are rasterisation: a grazing triangle culled on one side and not the
    // other changes one pixel along the outline. What would show is an area: a differing pixel whose four
    // neighbours also differ ("interior").
    const mask = new Uint8Array(N * N);
    const diff = () => { let n = 0, big = 0, interior = 0; const a = bufs[0], b = bufs[1]; for (let i = 0, p = 0; i < a.length; i += 4, p++) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); mask[p] = d > 24 ? 1 : 0; if (d > 24) n++; if (d > 96) big++; }
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const p = y * N + x; if (mask[p] && mask[p - 1] && mask[p + 1] && mask[p - N] && mask[p + N]) interior++; }
      return { pct: 100 * n / (N * N), big: 100 * big / (N * N), interior: 100 * interior / (N * N) }; };
    // Picture: single-sided | double-sided | difference mask (red where the pixels differ, on a dimmed copy).
    const png = () => { const cv = document.createElement('canvas'); cv.width = 3 * N; cv.height = N; const cx = cv.getContext('2d'); [0, 1].forEach((k) => { const im = cx.createImageData(N, N); for (let y = 0; y < N; y++) im.data.set(bufs[k].subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4); cx.putImageData(im, k * N, 0); }); const im = cx.createImageData(N, N); const a = bufs[0], b = bufs[1]; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = ((N - 1 - y) * N + x) * 4, o = (y * N + x) * 4; const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24; im.data[o] = d ? 255 : a[i] >> 2; im.data[o + 1] = d ? 0 : a[i + 1] >> 2; im.data[o + 2] = d ? 0 : a[i + 2] >> 2; im.data[o + 3] = 255; } cx.putImageData(im, 2 * N, 0); return cv.toDataURL('image/png'); };
    const views = [];
    const view = (label, eye, target, layer) => {
      cam.layers.set(layer); cam.position.copy(eye); cam.lookAt(target); cam.updateMatrixWorld(true);
      setSide(T.FrontSide); shot(0); setSide(T.DoubleSide); shot(1); setSide(T.FrontSide);
      const d = diff(); const v = { label, pct: +d.pct.toFixed(3), big: +d.big.toFixed(3), interior: +d.interior.toFixed(3) }; if (save && d.interior > 0.05) v.png = png(); views.push(v);
    };
    const half = t.parkHalf - 4, south = t.parkSouth - 4;
    for (let x = -half; x <= half; x += (2 * half) / 4) for (let z = -half; z <= south; z += (half + south) / 4) for (let h = 0; h < 4; h++) {
      const a = h * Math.PI / 2; const eye = new T.Vector3(x, 1.6, z); view(`town (${x.toFixed(0)}, ${z.toFixed(0)}) heading ${h * 90}`, eye, eye.clone().add(new T.Vector3(Math.sin(a) * 6, -0.8, Math.cos(a) * 6)), 0);
    }
    // Characters alone on layer 30 (the batch meshes carry them; their sources are parked on 31).
    const ents = D.It.all.map((e) => ({ name: e.def && e.def.name, group: e.group })).concat([{ name: 'player', group: D.At }]);
    for (const en of ents) {
      if (!en.group) continue; en.group.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(en.group); if (bb.isEmpty()) continue; const c = bb.getCenter(new T.Vector3()); const h = bb.max.y - bb.min.y;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; const eye = new T.Vector3(c.x + Math.cos(a) * (h + 1.2), bb.min.y + 0.6 * h, c.z + Math.sin(a) * (h + 1.2)); view(`${en.name} angle ${Math.round(a * 180 / Math.PI)}`, eye, new T.Vector3(c.x, bb.min.y + 0.5 * h, c.z), 0); }
    }
    return { flipped: flipped.size, views };
  }, { save });
  const bad = r.views.filter((v) => v.interior > 0.05);
  const edgeOnly = r.views.filter((v) => v.pct > 0.02 && v.interior <= 0.05).length;
  note(`${r.flipped} materials single-sided; ${r.views.length} views compared with the flips on and off`);
  const worst6 = new Set(bad.slice().sort((a, b) => b.pct - a.pct).slice(0, 6));
  note(`${edgeOnly} views differ on silhouette edges only (one-pixel outlines, rasterisation)`);
  for (const v of bad) { console.log(`  DIFF  ${v.label}: ${v.pct}% of pixels differ, ${v.interior}% in areas (${v.big}% strongly)`); if (v.png && worst6.has(v)) fs.writeFileSync(path.join(outDir, v.label.replace(/[^\w]+/g, '_') + '.png'), Buffer.from(v.png.split(',')[1], 'base64')); }
  const worst = r.views.slice().sort((a, b) => b.interior - a.interior)[0];
  note(`worst view: ${worst ? worst.label + ' ' + worst.pct + '% differing, ' + worst.interior + '% in areas' : 'none'}`);
  expect('single-sided rendering differs from double-sided on silhouette edges only, never in an area', bad.length === 0, bad.map((v) => v.label + ' ' + v.interior + '%').join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.join(' | '));
  await g.close();
  console.log(failures.length ? `SIDES CHECK FAILED (${failures.length})` : 'SIDES CHECK PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
