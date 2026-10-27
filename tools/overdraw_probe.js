// Overdraw probe (report): how many opaque fragments the GPU shades per covered pixel, in the order the
// game really draws them, and what front-to-back order would save. three.js sorts opaque draws by shader
// program and material first and by depth only as a tie-break, so far geometry is often drawn before the
// near geometry that hides it, and every fragment that passes the depth test when drawn is fully shaded.
// Method: render the view normally while recording the order of opaque draws; then replay the same draws
// in that order with an additive counter (depth-tested and depth-writing, so a fragment counts when it
// would have been shaded), and again sorted front to back by depth. Points/sprites/transparent excluded.
// Views: the town grid at eye height and the garden; with --event, also 25 s into the planting Event.
//
//   node tools/overdraw_probe.js [file] [--event]
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const withEvent = process.argv.includes('--event');
(async () => {
  const g = await boot({ file, vr: true, fastSim: false }); const page = g.page;
  await page.waitForTimeout(1500);
  const probe = (label) => page.evaluate((label) => {
    const D = window.__dbg, C = D.C, O = D.O, T = window.THREE, gl = O.getContext(), t = D.t;
    const xrWas = O.xr.enabled, rtWas = O.getRenderTarget(); O.xr.enabled = false; O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
    const N = 192, W = O.domElement.width, H = O.domElement.height, buf = new Uint8Array(N * N * 4);
    const cam = new T.PerspectiveCamera(90, 1, 0.05, 500);
    const shoot = () => { O.setViewport(0, 0, N, N); O.setScissor(0, 0, N, N); O.setScissorTest(true); O.setClearColor(0x000000, 1); O.clear(true, true, true); O.render(C, cam); O.setScissorTest(false); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, buf); let s = 0, cov = 0; for (let i = 0; i < buf.length; i += 4) { s += buf[i]; if (buf[i]) cov++; } return { frags: s, cov }; };
    const restore = [];
    const rbd = O.renderBufferDirect; let rec = null;
    O.renderBufferDirect = function (cam2, sc, geo, mat, obj, grp) { if (rec && !mat.transparent && !obj.isPoints && !obj.isSprite && !rec.has(obj)) rec.set(obj, rec.size); return rbd.apply(this, arguments); };
    const bg = C.background, fog = C.fog;
    const results = [];
    const view = (vl, eye, target) => {
      cam.position.copy(eye); cam.lookAt(target); cam.updateMatrixWorld(true);
      // 1. the game's order
      rec = new Map(); C.background = bg; C.fog = fog; O.setViewport(0, 0, N, N); O.setScissor(0, 0, N, N); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false); const order = rec; rec = null;
      // 2. counters, replayed in that order, then front to back
      const swaps = [];
      const counter = new Map();
      C.traverse((o) => { if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine) || !o.material) return; const orig = o.material; swaps.push([o, orig]); const mats = Array.isArray(orig) ? orig : [orig];
        if (!order.has(o)) { o.material = new T.MeshBasicMaterial({ visible: false }); return; }
        const mk = (m) => { const k = m.side + '|' + m.depthTest + '|' + m.depthWrite + '|' + m.polygonOffset + '|' + m.polygonOffsetFactor + '|' + m.polygonOffsetUnits; let c = counter.get(k); if (!c) { c = new T.MeshBasicMaterial({ color: new T.Color(1 / 255, 0, 0), blending: T.AdditiveBlending, side: m.side, depthTest: m.depthTest, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits, toneMapped: false, fog: false }); counter.set(k, c); } return c; };
        o.material = Array.isArray(orig) ? orig.map(mk) : mk(orig); });
      C.background = new T.Color(0, 0, 0); C.fog = null;
      O.setOpaqueSort((a, b) => (order.get(a.object) ?? 1e9) - (order.get(b.object) ?? 1e9) || a.id - b.id);
      const game = shoot();
      O.setOpaqueSort((a, b) => a.groupOrder - b.groupOrder || a.renderOrder - b.renderOrder || a.z - b.z || a.id - b.id);
      const f2b = shoot();
      O.setOpaqueSort(null);
      for (const [o, m] of swaps) o.material = m;
      C.background = bg; C.fog = fog;
      results.push({ label: vl, draws: order.size, cov: game.cov / (N * N), game: game.frags / Math.max(1, game.cov), f2b: f2b.frags / Math.max(1, f2b.cov) });
    };
    const half = t.parkHalf - 4, south = t.parkSouth - 4;
    for (let x = -half; x <= half; x += (2 * half) / 3) for (let z = -half; z <= south; z += (half + south) / 3) for (let h = 0; h < 4; h++) { const a = h * Math.PI / 2; const eye = new T.Vector3(x, 1.6, z); view(`town (${x.toFixed(0)}, ${z.toFixed(0)}) heading ${h * 90}`, eye, eye.clone().add(new T.Vector3(Math.sin(a) * 6, -0.6, Math.cos(a) * 6))); }
    const plots = []; C.traverse((o) => { if (o.isMesh && Array.isArray(o.material)) plots.push(o.getWorldPosition(new T.Vector3())); });
    const gc = plots.length ? plots.reduce((a, p) => a.add(p), new T.Vector3()).multiplyScalar(1 / plots.length) : new T.Vector3(-26, 0, -26);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; view(`garden angle ${k * 45}`, new T.Vector3(gc.x + Math.cos(a) * 7, 1.6, gc.z + Math.sin(a) * 7), new T.Vector3(gc.x, 1, gc.z)); }
    O.renderBufferDirect = rbd;
    O.setViewport(0, 0, W, H); O.state.bindXRFramebuffer(null); O.setRenderTarget(rtWas); O.xr.enabled = xrWas;
    return { label, results };
  }, label);
  const print = (r) => {
    const rs = r.results; const avg = (k) => rs.reduce((a, v) => a + v[k], 0) / rs.length;
    console.log(`\n== ${r.label}: ${rs.length} views; opaque fragments shaded per covered pixel: game order ${avg('game').toFixed(2)}, front to back ${avg('f2b').toFixed(2)} (${(100 * (1 - avg('f2b') / avg('game'))).toFixed(0)}% fewer)`);
    for (const v of rs.slice().sort((a, b) => b.game - a.game).slice(0, 8)) console.log(`    game ${v.game.toFixed(2)}  front-to-back ${v.f2b.toFixed(2)}  (${v.draws} opaque draws, ${(100 * v.cov).toFixed(0)}% covered)  ${v.label}`);
  };
  print(await probe('town at load'));
  if (withEvent) {
    const ok = await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); await wait(25000); clearInterval(adv); return !!D.me.active; });
    if (ok) print(await probe('the Event, 25 s in')); else console.log('the planting Event did not start');
  }
  if (g.errors.length) console.log('page errors: ' + g.errors.join(' | '));
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
