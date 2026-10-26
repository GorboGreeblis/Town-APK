#!/usr/bin/env node
// Flash probe (analysis only, B12): renders the game in the fake VR session on
// software GL and reads every frame back, looking for one-frame brightness
// anomalies on objects: pixels that jump to near-white and back, while the
// camera is still. Scenarios: pickups while looking at the shop kiosk from a
// distance; the garden Event looking at the garden.
//
//   node tools/flash_probe.js [file]
const path = require('path');
const { boot } = require('./lib/harness.js');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { page, browser, bootS } = await boot({ file, fastSim: false });
  console.log(`booted in ${bootS}s`);
  await page.evaluate(() => { window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });
  const r = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, Kt = D.Kt, out = { phases: {} };
    const gl = O.getContext(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; out.fb = [W, H];
    const px = new Uint8Array(W * H * 4); let prev = null; let phase = 'idle'; const frames = [];
    const real = O.render.bind(O);
    O.render = (...a) => { real(...a); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let sum = 0, white = 0, diff = 0; const n = W * H; const cur = new Uint8Array(n);
      for (let i = 0, j = 0; i < n; i++, j += 4) { const l = (px[j] * 3 + px[j + 1] * 6 + px[j + 2]) / 10; cur[i] = l; sum += l; if (px[j] > 245 && px[j + 1] > 245 && px[j + 2] > 245) white++; if (prev && Math.abs(l - prev[i]) > 110) diff++; }
      frames.push({ phase, t: +performance.now().toFixed(0), mean: +(sum / n).toFixed(1), white, diff }); prev = cur; };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const B = D.B, F = D.F;
    const lookAt = async (x, z) => { // steer the fake head yaw until the point projects near the view centre
      const v = new THREE.Vector3(); const proj = () => { B.updateMatrixWorld(); v.applyMatrix4(B.matrixWorldInverse).applyMatrix4(B.projectionMatrix); }; for (let k = 0; k < 12; k++) { await wait(400); v.set(x, 1, z); proj(); if (v.z < 1 && Math.abs(v.x) < 0.25) return { ok: true, nx: +v.x.toFixed(2), ny: +v.y.toFixed(2) }; window.__fakeXR.pose.yaw += (v.z < 1 ? -v.x * 0.6 : 1.2); } v.set(x, 1, z); proj(); return { ok: false, nx: +v.x.toFixed(2), nz: +v.z.toFixed(2) }; };
    // Scenario A: 22 m from Zollod's Garden Supplies kiosk (building 'garden'), facing it; pick up three blossoms and two acorns without moving.
    const shop = F.buildings.find((b) => b.name === 'garden') || F.buildings.find((b) => b.name === 'shop'); out.A_building = shop.name; const dx = -shop.x, dz = -shop.z, L = Math.hypot(dx, dz) || 1;
    D.At.position.set(shop.x + dx / L * 22, D.At.position.y, shop.z + dz / L * 22);
    out.A_look = await lookAt(shop.x, shop.z); await wait(2500);
    phase = 'A-still'; await wait(3000);
    phase = 'A-pickups'; for (const b of D.le.list.filter((x) => x.visible && !x.userData.taken).slice(0, 3)) { D.le.take(b); await wait(1500); }
    if (D.ce && D.ce.take) for (const a of D.ce.list.filter((x) => x.visible && !x.userData.taken).slice(0, 2)) { D.ce.take(a); await wait(1500); }
    phase = 'A-after'; await wait(3000);
    // Scenario B: the garden Event, standing at the garden edge looking at its centre.
    Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); out.eventStarted = !!D.me.active;
    const R = (D.JGP.GARDEN_R || 12) + 2; D.At.position.set(R, D.At.position.y, 0); out.B_look = await lookAt(0, 0);
    phase = 'B-event'; await wait(20000);
    phase = 'B-event-pickup'; const b2 = D.le.list.find((x) => x.visible && !x.userData.taken); if (b2) D.le.take(b2); await wait(4000);
    O.render = real;
    // Summaries per phase and the anomalous frames.
    const byPhase = {}; for (const f of frames) { (byPhase[f.phase] = byPhase[f.phase] || []).push(f); }
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
    for (const k in byPhase) { const a = byPhase[k]; const wm = med(a.map((f) => f.white)), dm = med(a.map((f) => f.diff));
      out.phases[k] = { frames: a.length, meanLum: +med(a.map((f) => f.mean)).toFixed(1), whiteMedian: wm, whiteMax: Math.max(...a.map((f) => f.white)), diffMedian: dm, diffMax: Math.max(...a.map((f) => f.diff)),
        anomalies: a.filter((f) => f.white > wm * 2 + 40 || f.diff > dm * 3 + Math.round(W * H * 0.01)).map((f) => ({ t: f.t, white: f.white, diff: f.diff, mean: f.mean })).slice(0, 8) }; }
    out.governor = D.Ge ? { level: D.Ge.level, sos: D.Ge.sos, rebuilds: D.Ge.rebuilds } : null;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close().catch(() => {}); process.exit(0);
})();
