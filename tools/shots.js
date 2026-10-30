// Pictures (report): renders views of the game for a look before and after a visual change (the author's "pictures
// first"), one PNG per view with its name written on it, into tools/.runs/shots/<prefix>_NN.png. Presets cover the places
// recent work changed; free views take "ex,ey,ez>tx,ty,tz" (eye and the point looked at, metres).
//
//   node tools/shots.js [file] --preset NAME[,NAME] [--prefix P]
//   node tools/shots.js [file] --view "label@ex,ey,ez>tx,ty,tz" [--view ...] [--event] [--prefix P]
// presets: garden (from above, standing, ground level; flowers set out as the Event plants them), cave (the visitors'
//   walkway, the visit spot, the entrance from both sides, with a visitor placed), gemtoe (front, side, close on the tie,
//   three-quarter, feet), mist (the Event's mist at full: four sides of the fence from 4 m and 1 m, seated and standing),
//   church (the Event's mist at full: approaching the church roof from six distances), park (the whole park from above
//   and its four corners, in play and in the Event with the fade groups in full and hidden), pond (the water at four
//   moments 1.5 s apart, from 7 m and 3 m), stands (the Event's stands
//   fading, P33: three views from the Garden's edge at 100, 60, 30 and 0%).
// --event starts the planting Event and waits for its mist to be full before the free views.
const fs = require('fs');
const path = require('path');
const { boot, root } = require('./lib/harness');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const presets = (arg('--preset') || '').split(',').filter(Boolean);
const views = process.argv.flatMap((a, i) => (process.argv[i - 1] === '--view' ? [a] : []));
const prefix = arg('--prefix') || 'shot';
const out = path.join(root, 'tools/.runs/shots'); fs.mkdirSync(out, { recursive: true });

(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  await g.page.waitForTimeout(2000);
  const urls = await g.page.evaluate(async ({ presets, views, event }) => {
    const D = window.__dbg, O = D.O, C = D.C, T = window.THREE, J = D.JGP, gl = O.getContext(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const N = 800, M = 500, cam = new T.PerspectiveCamera(70, N / M, 0.1, 320), buf = new Uint8Array(N * M * 4), res = [];
    const shoot = (label, e, t) => {
      const xr = O.xr.enabled; O.xr.enabled = false; O.state.bindXRFramebuffer && O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
      const W = O.domElement.width, H = O.domElement.height;
      cam.position.set(e[0], e[1], e[2]); cam.lookAt(t[0], t[1], t[2]); cam.updateMatrixWorld(true);
      O.setViewport(0, 0, N, M); O.setScissor(0, 0, N, M); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false);
      gl.readPixels(0, 0, N, M, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const cv = document.createElement('canvas'); cv.width = N; cv.height = M; const cx = cv.getContext('2d'), im = cx.createImageData(N, M);
      for (let y = 0; y < M; y++) im.data.set(buf.subarray((M - 1 - y) * N * 4, (M - y) * N * 4), y * N * 4);
      cx.putImageData(im, 0, 0); cx.fillStyle = '#000b'; cx.fillRect(0, 0, N, 24); cx.fillStyle = '#fff'; cx.font = '15px sans-serif'; cx.fillText(label + (D.me.active ? `  [Event, mist ${Math.round(J.mist.p() * 100)}%]` : ''), 6, 17);
      res.push(cv.toDataURL('image/png')); O.setViewport(0, 0, W, H); O.xr.enabled = xr;
    };
    const go = async (x, z) => { D.At.position.set(x, D.At.position.y, z); await wait(600); };
    const mistFull = async () => {
      if (!D.me.active) { const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400); const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick(); while (!D.me.active) await wait(50); }
      while (J.mist.p() < 1) await wait(200); await wait(1000);
    };
    const place = (id, x, z, inside) => { const e = D.It.byId[id]; if (!e) return; e.busy = 'shots'; if (inside) e.inside = inside; e.group.position.set(x, 0, z); };
    for (const p of presets) {
      if (p === 'garden') {
        await go(30, 30);
        const ws = J.plantWarm(); ws.forEach((g0, i) => { for (let k = 0; k < 3; k++) { const c = k ? g0.clone() : g0; c.position.set(5 + 0.9 * i, 0.015, 4.2 + 1.1 * k); c.rotation.y = k; if (k) g0.parent.add(c); } });
        await wait(300);
        shoot('Garden from above', [0, 34, 22], [0, 0, 0]); shoot('rock ring, standing', [19, 1.6, 6], [12, 0, 2]); shoot('furrows and stones, standing', [6, 1.6, 10], [3, 0, 3]); shoot('flowers, ground level', [11, 0.12, 6], [5, 0.05, 6]);
      } else if (p === 'cave') {
        const v = J.slug.visit(1), o = v.out, w1 = v.way[1], sp = v.spot, dx = sp[0] - o[0], dz = sp[1] - o[1];
        place('p_gemtoe', sp[0], sp[1], 'church'); place('frog', w1[0], w1[1], 'church'); await go(sp[0], sp[1]);
        shoot('Cave entrance, outside looking in', [o[0] - 0.3 * dx, 1.6, o[1] - 0.3 * dz], [w1[0], 0.2, w1[1]]); shoot('Cave walkway from above', [w1[0] - 0.2 * dx, 6, w1[1] - 0.2 * dz], [(w1[0] + sp[0]) / 2, 0, (w1[1] + sp[1]) / 2]); shoot('Cave visit spot, low', [w1[0], 0.45, w1[1]], [sp[0], 0.15, sp[1]]); shoot('Cave entrance, inside looking out', [sp[0], 1.6, sp[1]], [o[0], 0.4, o[1]]);
      } else if (p === 'gemtoe') {
        place('p_gemtoe', 0, -28); D.It.byId.p_gemtoe.group.rotation.y = 0; await go(8, -36);
        shoot('Gemtoe front', [0, 1.6, -24.5], [0, 1.2, -28]); shoot('Gemtoe side', [3.5, 1.6, -28], [0, 1.2, -28]); shoot('Gemtoe side, close on the tie', [1.8, 1.7, -27.7], [0, 1.5, -27.7]); shoot('Gemtoe three-quarter', [2.4, 1.5, -25.6], [0, 1.2, -28]); shoot('Gemtoe feet, ground level', [3, 0.12, -28], [0, 0.1, -28]);
      } else if (p === 'mist') {
        await mistFull();
        const sides = [['east', (d) => [37.6 - d, -8], [1, 0]], ['west', (d) => [-37.6 + d, -8], [-1, 0]], ['north', (d) => [-12, 49.6 - d], [0, 1]], ['south', (d) => [12, -37.6 + d], [0, -1]]];
        for (const [nm, P, dir] of sides) for (const eh of [1.1, 1.7]) for (const d of [4, 1]) { const [x, z] = P(d); await go(x, z); shoot(`${nm} fence, ${d} m away, eye ${eh} m, up 8 deg`, [x, eh, z], [x + 30 * dir[0], eh + 30 * Math.tan(8 * Math.PI / 180), z + 30 * dir[1]]); }
      } else if (p === 'stands') {
        // P33: the stands fading during the Event, from the Garden's edge (each view: full, 60%, 30%, hidden)
        await mistFull(); const S = window.__gcSt;
        for (const [nm, e, t] of [['the Sheriff\'s kiosk and the post office', [0, 1.6, -14], [25, 2, -24]], ['the juice bar and the shop', [-14, 1.6, 0], [-30, 2, -12]], ['the gallery and Garden Supplies', [14, 1.6, 14], [29, 2, 24]]]) {
          await go(e[0], e[2]);
          for (const f of [1, 0.6, 0.3, 0]) { if (S) S.set(f); shoot(`${nm}: stands at ${Math.round(f * 100)}%`, e, t); }
          if (S) S.set(1);
        }
      } else if (p === 'park') {
        // the whole park: from above and from the four corners inside the fence, in play, then in the Event (mist full)
        // with the fade groups (all kiosks and the gazebo; all trees with the robin) in full and hidden
        const S = window.__gcSt, V = [['from above, south', [0, 38, -36], [0, 0, 8]], ['from above, north-east', [30, 30, 44], [-2, 0, -2]], ['south-west corner', [-34, 1.7, -34], [0, 1, 6]], ['south-east corner', [34, 1.7, -34], [0, 1, 6]], ['north-east corner', [34, 1.7, 46], [0, 1, 4]], ['north-west corner', [-34, 1.7, 46], [0, 1, 4]]];
        for (const [nm, e, t] of V) { await go(e[0], e[2]); shoot(`Park ${nm}`, e, t); }
        await mistFull();
        for (const [nm, e, t] of V) { await go(e[0], e[2]); for (const f of [1, 0]) { if (S) S.set(f); shoot(`Park ${nm}: fade groups ${f ? 'in full' : 'hidden'}`, e, t); } if (S) S.set(1); }
      } else if (p === 'pond') {
        // the pond's water (ripples spread from three spots, the painted rings drift): one view at four moments
        await go(22.6, -2.6);
        for (let k = 0; k < 4; k++) { shoot(`Pond, 7 m, t+${(k * 1.5).toFixed(1)} s`, [23.6, 1.6, -2.6], [29.6, 0, -2.6]); shoot(`Pond close, 3 m, t+${(k * 1.5).toFixed(1)} s`, [27, 1.5, 0], [29.6, 0.1, -2.6]); await wait(1500); }
      } else if (p === 'church') {
        await mistFull();
        for (const z of [-30, -15, 0, 10, 18, 24]) { await go(3, z); shoot(`church roof from z ${z} (the church spans z 25.6-48.6), eye 1.7 m`, [3, 1.7, z], [0, 8, 34]); }
      }
    }
    if (views.length) {
      if (event) await mistFull();
      for (const v of views) { const m = /^(.*)@([-\d.]+),([-\d.]+),([-\d.]+)>([-\d.]+),([-\d.]+),([-\d.]+)$/.exec(v); if (!m) continue; const n = m.slice(2).map(Number); await go(n[0], n[2]); shoot(m[1], n.slice(0, 3), n.slice(3)); }
    }
    return res;
  }, { presets, views, event: process.argv.includes('--event') });
  urls.forEach((u, i) => fs.writeFileSync(path.join(out, `${prefix}_${String(i).padStart(2, '0')}.png`), Buffer.from(u.split(',')[1], 'base64')));
  console.log(`wrote ${urls.length} pictures to ${path.relative(root, out)}/${prefix}_NN.png`);
  await g.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
