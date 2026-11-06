// Render A/B (report, not in the tiers; the CPU pass of 4.0.47 on, RULES.md 31): the main-thread cost of three.js's
// render for one frozen frame with a switch off and on. At each view the game is paused between two headset frames
// and the same frame is drawn again and again into a two-slice multiview target (as the headset draws), in blocks of
// 5 renders, the switch flipped every block, so the game, the views and the machine's load are the same on both
// sides and only the switch differs. Prints both sides' medians a render and the change. Far steadier than timing
// live frames (frame_parts.js, cpu_bench.js), whose medians move with the game and the software renderer's threads;
// it measures the render only (not the game's update), which is where the draw-path savings are.
//
//   node tools/render_ab.js [file] --toggle "<expression with X>" [--blocks 40] [--town] [--event] [--settle]
//     --settle: one untimed render after each flip (for a switch that rebuilds what it draws, such as P44's
//     __gcArrSet: the first render after a rebuild uploads the new shapes)
process.env.GT_MULTIVIEW = '1';
process.env.GT_HEADSET_FOV = process.env.GT_HEADSET_FOV || '1';
const path = require('path');
const { boot } = require('./lib/harness');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const TOGGLE = arg('--toggle', null), BLOCKS = +arg('--blocks', '40'), SETTLE = process.argv.includes('--settle');
if (!TOGGLE) { console.error('render_ab: --toggle "<expression with X>" is required'); process.exit(2); }
const onlyTown = process.argv.includes('--town'), onlyEvent = process.argv.includes('--event');
const TOWN = [[21, 25], [-22, -23], [-15, 23], [-36, -20]], EVENT = [[26, -23], [-28.3, -28.3], [-33, -7]];

(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page; await page.waitForTimeout(2500);
  await page.evaluate(() => { const D = window.__dbg; setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); });
  const out = [];
  const view = async (x, z, tag) => {
    await page.evaluate(([x, z]) => { const D = window.__dbg; D.At.position.x = x; D.At.position.z = z; window.__fakeXR.pose.yaw = Math.atan2(x, z); }, [x, z]);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(({ TOGGLE, BLOCKS, SETTLE }) => {
      const D = window.__dbg, O = D.O, C = D.C, B = D.B, X = window.__gtXR, gl = O.getContext(), set = new Function('X', TOGGLE);
      const cams = O.xr.getCamera(B).cameras, W = 320, H = 180;
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, W, H, 2);
      const d = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, d); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH24_STENCIL8, W, H, 2); gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); const mv = gl.getExtension('OVR_multiview2');
      mv.framebufferTextureMultiviewOVR(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, 0, 0, 2); mv.framebufferTextureMultiviewOVR(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, d, 0, 0, 2); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const vp0 = cams.map((c) => c.viewport.clone()); cams.forEach((c) => c.viewport.set(0, 0, W, H));
      const was = X.mvActive; X.mvActive = true;
      const side = [[], []]; let calls = 0;
      const block = (on) => { set(on); O.state.bindXRFramebuffer(f); if (SETTLE) { O.render(C, B); gl.finish(); } const a = performance.now(); for (let k = 0; k < 5; k++) O.render(C, B); const ms = (performance.now() - a) / 5; calls = O.info.render.calls; O.state.bindXRFramebuffer(null); gl.finish(); return ms; };
      block(false); block(true);   // warm both paths
      for (let k = 0; k < BLOCKS; k++) { const on = k % 2 === 1; side[on ? 1 : 0].push(block(on)); }
      set(true); X.mvActive = was; cams.forEach((c, i) => c.viewport.copy(vp0[i]));
      gl.deleteFramebuffer(f); gl.deleteTexture(t); gl.deleteTexture(d); try { O.state.reset(); } catch (e) {}
      const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
      return { off: med(side[0]), on: med(side[1]), calls };
    }, { TOGGLE, BLOCKS, SETTLE });
    out.push({ v: `${tag} (${x},${z})`, ...r });
    console.log(`  ${(tag + ' (' + x + ',' + z + ')').padEnd(26)} off ${r.off.toFixed(3)} ms  on ${r.on.toFixed(3)} ms  change ${(100 * (r.on / r.off - 1)).toFixed(1)}%  (${r.calls} draws)`);
  };
  console.log(`render_ab --toggle ${TOGGLE}: median ms a render (blocks of 5, ${BLOCKS / 2} blocks a side)`);
  if (!onlyEvent) for (const [x, z] of TOWN) await view(x, z, 'town');
  if (!onlyTown) {
    await page.evaluate(async () => {
      const D = window.__dbg, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
      const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
      const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
      while (D.JGP.mist.p() < 1 && performance.now() - t0 < 150000) await wait(250); await wait(3000);
    });
    for (const [x, z] of EVENT) await view(x, z, 'Event');
  }
  const mean = (k) => out.reduce((a, r) => a + r[k], 0) / out.length;
  console.log(`  mean                       off ${mean('off').toFixed(3)} ms  on ${mean('on').toFixed(3)} ms  change ${(100 * (mean('on') / mean('off') - 1)).toFixed(1)}%`);
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
