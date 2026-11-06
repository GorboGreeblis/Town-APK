// Pixel A/B for a performance switch (standard tier for the switches in SWITCHES; RULES.md 31, 2026-11-05: "Anything
// that impacts visual quality is not an option"). Renders the same frame twice in one synchronous step, nothing in
// the game moving in between, with a switch off and then on, into a two-slice multiview texture (both eyes, as the
// headset draws), and compares each eye pixel for pixel, in both orders (the switch kept on through play and the
// on-render first, so a saving that fell behind in play shows). A pair with the switch off both times gives the floor
// (what two renders of one frame differ by on their own, normally nothing). Views: the town at the battery run's
// slowest spots, in four directions each, and the planting Event with the mist full at its slowest and heaviest spots.
// Passes when no view differs by more than the floor (plus a switch's draw-order allowance). A switch with a setting
// of its own runs in a session of its own (P44: anisotropic filtering off on both sides, see SWITCHES).
//
//   node tools/pixel_ab.js [asset] [--switch name] [--save]
//     --switch: one of SWITCHES, or several by prefix separated by commas (default: all of them, each in turn); --save writes the pairs that differ
const path = require('path');
const fs = require('fs');
process.env.GT_MULTIVIEW = '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const { boot, reporter, root } = require('./lib/harness');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
let file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
const save = process.argv.includes('--save'), outDir = path.join(root, 'tools/.runs/pixel_ab');
// each switch: [name, the expression that sets it (X = true for on), the pixels a view it may change: 0, or for a
// draw-order change at most 4 (RULES.md 31's allowance: which of two surfaces at exactly one depth wins a pixel)]
// anisotropic filtering off on every texture and texture array (for a switch that runs in a session of its own)
const ANISO1 = '(() => { const D = window.__dbg, seen = new Set(); D.C.traverse((o) => { const m = o.material; if (!m || Array.isArray(m)) return; for (const k of ["map", "bumpMap"]) { const t = m[k]; if (t && !seen.has(t)) { seen.add(t); if (t.anisotropy > 1) { t.anisotropy = 1; t.needsUpdate = true; } } } }); D.gcEB.list.forEach((b) => { const A = b.mat.userData.gcArr; if (A && !seen.has(A)) { seen.add(A); A.anisotropy = 1; A.needsUpdate = true; } }); return seen.size; })()';
const SWITCHES = [
  ['P34 townsfolk out of view skipped', '__gcOff.st.on = X'],
  ['P36 opaque draws grouped by program', 'window.__gcPS = X', 4],
  ['P37 texture UV transforms cached', 'window.__gcTU = X'],
  ['P38 batcher skips still parts', 'window.__gcQF = X'],
  ['P39 lights and eye offset set once a draw list', 'window.__gcLV = X'],
  ['P39 normal matrices only where a shader reads them', 'window.__gcNM = X'],
  ['P40 vertex layouts checked by version', 'window.__gcVL = X'],
  ['P40 light flags set only when they change', 'window.__gcNL = X'],
  ['P40 shader-hold check cached', 'window.__gcPN = X'],
  ['P41 shape updates stamped once a frame', 'window.__gcOU = X'],
  ['P43 batcher writes only the matrix when a moving part\'s colour is unchanged', 'window.__gcQC = X'],
  ['P43 light probe sent only when it changes', 'window.__gcLP = X'],
  // P44: the headless renderer (SwiftShader) filters a texture array anisotropically a little differently from a 2D
  // texture (up to 8 levels in 255 on steep character surfaces; the headset's GPU samples both in the same texture
  // hardware), so P44 runs in a session of its own with anisotropic filtering off everywhere, on and off alike, and
  // the draw-order allowance (its batches group the parts differently: a tie at one depth can change hands)
  ['P44 character textures in arrays (the batches rebuilt per texture when off)', 'window.__gcArrSet(X)', 4],
  // P45 and P46 change the picture by design (the author, 2026-11-06: the Event's frame rate, minor losses allowed):
  // P45 within its allowance (a far character drawn at the frame before's pose), P46 under a pixel at this size
  ['P45 far characters posed every other frame', 'window.__gcHalf = X', 120],   // a far figure a frame behind: at most 120 px a view (54 the most in 4.0.53's 28 views)
  ['P46 tiny far details hidden (the Event and, from 4.0.55, the town)', 'window.__gcTiny = X'],
  // P47 changes the picture by design too (near-identical character materials keyed alike: a one-sided part in a
  // double-sided batch shows its inside at silhouettes; bump strength to 0.05); off in 4.0.54 for 481 px over 28 views,
  // back in 4.0.55 (the author, 2026-11-06: "P47 was acceptable when I tested. Let's bring it back"): at most 40 px a view
  ['P47 near-identical character materials keyed alike (the characters\' batches rebuilt)', 'window.__gcKN = X; window.__gcArrSet(false); window.__gcArrSet(true)', 40],
];
const only = arg('--switch', null);
const TOWN = [[21, 25], [-22, -23], [-15, 23], [-36, -20], [5, -12]], EVENT = [[26, -23], [-9, 35], [-28.3, -28.3], [-33, -7]];

(async () => {
  const { expect, note, failures } = reporter();
  const swAll = SWITCHES.filter((s) => !only || only.split(',').some((o) => s[0].startsWith(o)));
  const results = {}, errors = [];
  // a switch with a setting of its own (the fourth field) runs in a session of its own
  const sessions = [swAll.filter((s) => !s[3]), ...swAll.filter((s) => s[3]).map((s) => [s])].filter((l) => l.length);
  for (const sw of sessions) {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(2500);
  if (sw[0][3]) { await page.evaluate(sw[0][3]); await page.waitForTimeout(1500); }
  const pair = (expr, a, b, label) => page.evaluate(({ expr, a, b, label, save }) => {
    const D = window.__dbg, O = D.O, C = D.C, B = D.B, X = window.__gtXR, gl = O.getContext();
    const set = new Function('X', expr);
    const cams = O.xr.getCamera(B).cameras; const W = 320, H = 180;
    const mk = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, W, H, 2); const d = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, d); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH24_STENCIL8, W, H, 2); gl.bindTexture(gl.TEXTURE_2D_ARRAY, null); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); const mv = gl.getExtension('OVR_multiview2'); mv.framebufferTextureMultiviewOVR(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, 0, 0, 2); mv.framebufferTextureMultiviewOVR(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, d, 0, 0, 2); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f }; };
    const P = window.__pabP || (window.__pabP = [mk(), mk()]);
    const vp0 = cams.map((c) => c.viewport.clone());
    cams[0].viewport.set(0, 0, W, H); cams[1].viewport.set(0, 0, W, H);
    const was = X.mvActive; X.mvActive = true;
    const draw = (fb, on) => { set(on); O.state.bindXRFramebuffer(fb.f); O.render(C, B); const n = O.info.render.calls; O.state.bindXRFramebuffer(null); return n; };
    const ca = draw(P[0], a), cb = draw(P[1], b);
    set(true); X.mvActive = was; cams.forEach((c, i) => c.viewport.copy(vp0[i]));
    const rd = gl.createFramebuffer();
    const read = (fb, eye) => { const p = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rd); gl.framebufferTextureLayer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, fb.t, 0, eye); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
    const eyes = [0, 1].map((eye) => {
      const x = read(P[0], eye), y = read(P[1], eye); let n = 0, mx = 0, lit = 0; const at = [];
      for (let i = 0; i < x.length; i += 4) { const d = Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); if (d) { n++; at.length < 4 && at.push([(i / 4) % W, Math.floor(i / 4 / W)]); } if (d > mx) mx = d; if (y[i] | y[i + 1] | y[i + 2]) lit++; }
      let png = null; if (save && n) { const cv = document.createElement('canvas'); cv.width = 2 * W; cv.height = H; const cx = cv.getContext('2d'); [x, y].forEach((buf, k) => { const im = cx.createImageData(W, H); for (let r = 0; r < H; r++) im.data.set(buf.subarray((H - 1 - r) * W * 4, (H - r) * W * 4), r * W * 4); cx.putImageData(im, k * W, 0); }); png = cv.toDataURL('image/png'); }
      return { n, mx, at, lit: +(100 * lit / (W * H)).toFixed(1), png };
    });
    gl.deleteFramebuffer(rd); gl.bindFramebuffer(gl.FRAMEBUFFER, null); try { O.state.reset(); } catch (e) {}
    return { label, calls: [ca, cb], eyes, err: gl.getError() };
  }, { expr, a, b, label, save });
  const place = (x, z, yaw) => page.evaluate(([x, z, yaw]) => { const D = window.__dbg; D.At.position.x = x; D.At.position.z = z; window.__fakeXR.pose.yaw = yaw; }, [x, z, yaw]);
  const views = async (list, tag) => {
    for (const [x, z] of list) for (let k = 0; k < (tag === 'town' ? 4 : 2); k++) {
      const yaw = Math.atan2(x, z) + k * Math.PI / 2; await place(x, z, yaw); await page.waitForTimeout(500);
      for (const [name, expr, allow = 0] of sw) {
        const label = `${tag} (${x},${z}) yaw ${Math.round(yaw * 180 / Math.PI)}`;
        // the switch on through play, then: on first and off second (a saving that fell behind in play shows here),
        // and off first and on second
        await page.evaluate((expr) => new Function('X', expr)(true), expr); await page.waitForTimeout(300);
        const ba = await pair(expr, true, false, label);
        const floor = await pair(expr, false, false, label), ab0 = await pair(expr, false, true, label);
        const ab = (ba.eyes[0].n + ba.eyes[1].n) > (ab0.eyes[0].n + ab0.eyes[1].n) ? ba : ab0;
        if (name.startsWith('P38') || name.startsWith('P43 batcher')) {   // the batcher's part data after play with the fast path, against a full pass
          const bad = await page.evaluate(() => { const D = window.__dbg, EB = D.gcEB, C = D.C; const before = EB.list.map((b) => Float32Array.from(b.R)); const was = window.__gcQF; window.__gcQF = false; try { C.onBeforeRender(D.O, C, D.B); } finally { window.__gcQF = was; } let n = 0; EB.list.forEach((b, i) => { for (let k = 0; k < b.R.length; k++) if (Math.fround(b.R[k]) !== before[i][k]) { n++; break; } }); return n; });
          if (bad) (results[name] || (results[name] = { views: 0, worse: [], floorPx: 0, abPx: 0, lit: [] })).worse.push(`${label}: ${bad} batch(es) whose part data differ from a full pass`);
        }
        const r = results[name] || (results[name] = { views: 0, worse: [], floorPx: 0, abPx: 0, lit: [] });
        r.views++; const fp = floor.eyes[0].n + floor.eyes[1].n, ap = ab.eyes[0].n + ab.eyes[1].n; r.floorPx += fp; r.abPx += ap; r.lit.push(ab.eyes[0].lit); if (ap > fp) r.viewsDiff = (r.viewsDiff || 0) + 1;
        if (ap > fp + allow) { r.worse.push(`${label}: ${ap} px (floor ${fp}), max ${Math.max(ab.eyes[0].mx, ab.eyes[1].mx)}, calls ${ab.calls.join('/')}, at ${JSON.stringify(ab.eyes.map((e) => e.at))}`);
          if (save) { fs.mkdirSync(outDir, { recursive: true }); ab.eyes.forEach((e, i) => e.png && fs.writeFileSync(path.join(outDir, `${name.split(' ')[0]}_${label.replace(/[^\w]+/g, '_')}_${i ? 'right' : 'left'}.png`), Buffer.from(e.png.split(',')[1], 'base64'))); } }
      }
    }
  };
  await views(TOWN, 'town');
  await page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    while (D.JGP.mist.p() < 1 && performance.now() - t0 < 150000) await wait(250); await wait(3000);
  });
  await views(EVENT, 'Event');
  errors.push(...g.errors); await g.close();
  }
  for (const [name] of swAll) {
    const r = results[name]; if (!r) continue;
    const litMin = Math.min(...r.lit);
    note(`${name}: ${r.views} views, ${r.abPx} px differing with the switch in ${r.viewsDiff || 0} of them (floor ${r.floorPx}); the least-drawn view ${litMin}% lit`);
    expect(`${name}: the same picture with the switch on and off (no view differs beyond what two renders of a frame do)`, r.worse.length === 0 && litMin > 20, r.worse.slice(0, 6).join(' | ') || 'ok');
  }
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `PIXEL A/B FAILED (${failures.length})` : 'PIXEL A/B PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
