// Z-fighting sweep (graphical pass, T13): a render-based detector that catches
// what the planar analysis (test_zfight.js) cannot, such as a flat light sitting
// exactly on a curved metal cuff (B20). Every view is rendered three times: at
// the camera position, shifted 0.1 mm, and shifted 1 mm. Pixels that change
// between renders are counted. Edge aliasing grows with the shift (about ten
// times more flips at 1 mm than at 0.1 mm); a depth fight flips the same pixels
// at both shifts. A view is flagged when the 0.1 mm flips exceed a floor and
// are at least a third of the 1 mm flips. Flagged views are saved as difference
// images in tools/.runs/zsweep/ for the eye.
//
// Modes: the town (a grid of eye-height positions and four headings) and every
// character alone on a private layer (12 orbit views at 2.5 m), where only the
// character's own surfaces can fight.
//
//   node tools/zfight_sweep.js [file] [--floor 0.25] [--save]
const path = require('path');
const fs = require('fs');
const { boot, reporter, root } = require('./lib/harness');

const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const floor = +(process.argv.find((a, i) => process.argv[i - 1] === '--floor') || 0.25);
const save = process.argv.includes('--save');
const outDir = path.join(root, 'tools/.runs/zsweep');

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false, fastSim: false });
  if (save) fs.mkdirSync(outDir, { recursive: true });
  const r = await g.page.evaluate(({ floor, save }) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), t = D.t;
    const e = document.getElementById('gate'); if (e) e.style.display = 'none';
    O.xr.enabled = false; O.setRenderTarget(null);
    const W = O.domElement.width, H = O.domElement.height, N = 384;
    const cam = new T.PerspectiveCamera(70, W / H, 0.1, 400);
    const bufs = [0, 1, 2].map(() => new Uint8Array(N * N * 4));
    const diffPNG = (a, b) => { const cv = document.createElement('canvas'); cv.width = cv.height = N; const cx = cv.getContext('2d'); const im = cx.createImageData(N, N); for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60; im.data[i] = d ? 255 : a[i] >> 2; im.data[i + 1] = d ? 0 : a[i + 1] >> 2; im.data[i + 2] = d ? 0 : a[i + 2] >> 2; im.data[i + 3] = 255; } cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
    const flips = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60) n++; return 100 * n / (N * N); };
    const view = (eye, target, layerOnly) => {
      const res = [];
      for (let k = 0; k < 3; k++) {
        const dx = [0, 0.0001, 0.001][k];
        cam.position.copy(eye).add(new T.Vector3(dx, 0, 0)); cam.lookAt(target); cam.updateMatrixWorld(true);
        if (layerOnly) cam.layers.set(31); else cam.layers.set(0);
        O.render(C, cam); gl.readPixels((W - N) >> 1, (H - N) >> 1, N, N, gl.RGBA, gl.UNSIGNED_BYTE, bufs[k]);
      }
      const f01 = flips(bufs[0], bufs[1]), f1 = flips(bufs[0], bufs[2]);
      const flagged = f01 >= floor && f01 >= f1 / 3;
      return { f01: +f01.toFixed(2), f1: +f1.toFixed(2), flagged, png: flagged && save ? diffPNG(bufs[0], bufs[1]) : null };
    };
    const out = { town: [], npcs: [] };
    // Town sweep: eye height 1.6 m on a grid, four headings, looking slightly down.
    const half = t.parkHalf - 4, south = t.parkSouth - 4; cam.fov = 45; cam.updateProjectionMatrix();
    for (let x = -half; x <= half; x += (2 * half) / 5) for (let z = -half; z <= south; z += (half + south) / 5) for (let h = 0; h < 4; h++) {
      const a = h * Math.PI / 2; const eye = new T.Vector3(x, 1.6, z), target = eye.clone().add(new T.Vector3(Math.sin(a) * 6, -0.6, Math.cos(a) * 6));
      const v = view(eye, target, false); out.town.push({ at: [+x.toFixed(1), +z.toFixed(1)], heading: h * 90, ...v });
    }
    // Characters alone: close orbit (1.5 m, 25-degree lens: a 0.66 m window, about 580 px/m, so an 8 cm detail
    // is 45 px wide), four heights, eight angles.
    const ents = D.It.all.map((e) => ({ id: e.id, name: e.def && e.def.name, group: e.group })).concat([{ id: 'player', name: 'player', group: D.At }]);
    const lights = []; C.traverse((o) => { if (o.isLight) lights.push(o); });
    const wide = cam.fov; cam.fov = 25; cam.updateProjectionMatrix();
    for (const en of ents) {
      const grp = en.group; if (!grp) continue; grp.updateMatrixWorld(true);
      const bb = new T.Box3().setFromObject(grp); const c = bb.getCenter(new T.Vector3()); const hgt = bb.max.y - bb.min.y;
      const moved = []; grp.traverse((o) => moved.push(o)); moved.push(...lights);
      const masks = moved.map((o) => o.layers.mask); moved.forEach((o) => o.layers.set(31));
      for (const hy of [0.25, 0.45, 0.65, 0.85]) for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2 + 0.2; const target = new T.Vector3(c.x, bb.min.y + hy * hgt, c.z);
        const eye = target.clone().add(new T.Vector3(Math.cos(a) * 1.5, 0.15, Math.sin(a) * 1.5));
        const v = view(eye, target, true); out.npcs.push({ id: en.id, name: en.name, hy, angle: Math.round(a * 180 / Math.PI) % 360, ...v });
      }
      moved.forEach((o, i) => { o.layers.mask = masks[i]; });
    }
    cam.fov = wide; cam.updateProjectionMatrix();
    return out;
  }, { floor, save });
  const flaggedTown = r.town.filter((v) => v.flagged), flaggedNpc = r.npcs.filter((v) => v.flagged);
  note(`town: ${r.town.length} views, ${flaggedTown.length} flagged; characters: ${r.npcs.length} views, ${flaggedNpc.length} flagged (floor ${floor}% at 0.1 mm, and at least a third of the 1 mm flips)`);
  for (const v of flaggedTown) { console.log(`  FLAG  town at (${v.at.join(', ')}) heading ${v.heading}: ${v.f01}% at 0.1 mm, ${v.f1}% at 1 mm`); if (v.png) fs.writeFileSync(path.join(outDir, `town_${v.at.join('_')}_${v.heading}.png`), Buffer.from(v.png.split(',')[1], 'base64')); }
  for (const v of flaggedNpc) { console.log(`  FLAG  ${v.name || v.id} height ${v.hy} angle ${v.angle}: ${v.f01}% at 0.1 mm, ${v.f1}% at 1 mm`); if (v.png) fs.writeFileSync(path.join(outDir, `npc_${v.id}_${v.hy}_${v.angle}.png`), Buffer.from(v.png.split(',')[1], 'base64')); }
  // Per-character summary of the worst 0.1 mm flips, flagged or not.
  const byNpc = {}; for (const v of r.npcs) { const k = v.name || v.id; byNpc[k] = Math.max(byNpc[k] || 0, v.f01); }
  note('worst 0.1 mm flips per character: ' + Object.entries(byNpc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}%`).join(', '));
  expect('no view of the town shows a depth fight', flaggedTown.length === 0, `${flaggedTown.length} flagged views`);
  expect('no character shows a depth fight on its own surfaces', flaggedNpc.length === 0, flaggedNpc.map((v) => (v.name || v.id) + '@' + v.angle).join(', '));
  await g.close();
  console.log(failures.length ? `ZFIGHT SWEEP FAILED (${failures.length})` : 'ZFIGHT SWEEP PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
