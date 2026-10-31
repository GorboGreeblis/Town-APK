// Backpacka's water shows against the mist (standard tier; F-B74; the author: "When viewed against the fog / mist: The
// user cannot see Backpacka's water jets. This is a serious issue and must be fixed. Please also check the water dripping
// from his mouth"; "Have the water effects of Backpacka been fully tested against the fog / mist?"). The Event is started
// (with Seeds, so the rainbow shows) and its mist let rise to full; his show is then set to moments where water is out:
// drinking at the pond (his ripples round his mouth; the author: "Drinking should still work but needs to be retested
// as well"), lifting off it and flying to the Garden (the drip from his mouth: "he also has water drip out of his
// mouth"), and spraying the Garden (the four jets, the drops, and the rainbow: "The Rainbow may be hidden by the same
// issue?"). At each moment, from three eye-height viewpoints set so that a mist wall stands straight behind the water
// (the water between the eye and the mist wall nearest it; for the rainbow, three points along its arc), the view is
// drawn four ways: with and without the water, each with and without the mist walls (the mist module's own walls). The
// water's pixels are those it changes. Checked:
//   - drinking: his mouth comes down to the water (within 12 cm of its surface), his body swells as he drinks, and his
//     ripples show;
//   - water is out and seen at every moment (its parts found and showing), the rainbow while he sprays;
//   - against the mist the water (and the rainbow) changes at least 85% of the pixels it changes with the mist walls
//     gone (the mist hides none of it), in every view with a mist wall behind;
//   - where it shows, it stands out from the mist behind it (on average at least 6% brighter or darker per channel);
//   - no page errors or logged errors.
// Run on a build before F-B74 (`node tools/test_bp_water.js old.html`) it shows how much of the water the mist hid.
// Pictures of each view (with the water, against the mist) are written to tools/.runs/shots/bpwater_NN.png.
//
//   node tools/test_bp_water.js [file]
const path = require('path');
const fs = require('fs');
const { boot, reporter, root } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, T = window.THREE, O = D.O, C = D.C, BP = window.__gtBP, gl = O.getContext(), wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true;
    D.oe.open(); await wait(400); const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    let t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 20000) await wait(100);
    if (!D.me.active) return { noEvent: true };
    t0 = performance.now(); while (J.mist.p() < 0.97 && performance.now() - t0 < 300000) await wait(250);
    const mist = []; (J.mist && J.mist.group ? J.mist.group : C).traverse((o) => { if (o.isMesh && (J.mist && J.mist.group ? true : o.renderOrder === -3)) mist.push(o); });
    // the water: his module's parts (the ripples round his mouth, the jets, the drops, the rainbow)
    if (!BP.water || !BP.water()) { BP.prewarm && BP.prewarm(); }
    const W = () => { const P = (BP.water && BP.water()) || {}; return { ripples: P.ripples || [], jets: (P.jets || []).map((j) => j.m || j), drops: P.drops || null, rainbow: P.rainbow || null, head: P.head || null }; };
    const N = 400, M = 300, cam = new T.PerspectiveCamera(70, N / M, 0.1, 320), buf = () => new Uint8Array(N * M * 4);
    const draw = (b) => { const xr = O.xr.enabled; O.xr.enabled = false; O.state.bindXRFramebuffer && O.state.bindXRFramebuffer(null); O.setRenderTarget(null); const Wd = O.domElement.width, Hd = O.domElement.height; O.setViewport(0, 0, N, M); O.setScissor(0, 0, N, M); O.setScissorTest(true); O.render(C, cam); O.setScissorTest(false); gl.readPixels(0, 0, N, M, gl.RGBA, gl.UNSIGNED_BYTE, b); O.setViewport(0, 0, Wd, Hd); O.xr.enabled = xr; return b; };
    const pics = []; const pic = (b, label) => { const cv = document.createElement('canvas'); cv.width = N; cv.height = M; const cx = cv.getContext('2d'), im = cx.createImageData(N, M); for (let yy = 0; yy < M; yy++) im.data.set(b.subarray((M - 1 - yy) * N * 4, (M - yy) * N * 4), yy * N * 4); cx.putImageData(im, 0, 0); cx.fillStyle = '#000b'; cx.fillRect(0, 0, N, 18); cx.fillStyle = '#fff'; cx.font = '12px sans-serif'; cx.fillText(label, 4, 13); pics.push(cv.toDataURL('image/png')); };
    const diff = (a, b) => { let n = 0, s = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); if (d > 24) { n++; s += d / 3; } } return { n, mean: n ? s / n : 0 }; };
    const moments = [['drinking at the pond (his ripples)', 28], ['lifting off the pond (drip from his mouth)', 36.5], ['flying to the Garden (drip from his mouth)', 41], ['spraying the Garden (jets, drops, rainbow)', 60], ['spraying the Garden, later (drops, rainbow)', 66]];
    const out = { moments: [], mistWalls: mist.length, hasWater: !!(BP.water && BP.water()) };
    const allParts = (w) => [...w.ripples, ...w.jets, w.drops, w.rainbow].filter(Boolean);
    const measure = async (w, m, c, eyes, parts, tag) => {
      for (const eye of eyes) {
        cam.position.copy(eye); cam.lookAt(c); cam.updateMatrixWorld(true);
        const keep = new Map(); for (const o of [...parts, ...mist]) keep.set(o, o.visible);
        const vis = (on) => parts.forEach((o) => { o.visible = on && keep.get(o); });
        const mv = (on) => mist.forEach((o) => { o.visible = on && keep.get(o); });
        const A = draw(buf()); vis(false); const B = draw(buf()); mv(false); const Dm = draw(buf()); vis(true); const Cc = draw(buf()); mv(true);
        for (const [o, v] of keep) o.visible = v;
        const withMist = diff(A, B), noMist = diff(Cc, Dm), behind = diff(B, Dm).n;
        pic(A, `${m.name}${tag}: ${withMist.n} px vs ${noMist.n} without mist`);
        m.views.push({ what: tag || 'water', from: [+eye.x.toFixed(1), +eye.y.toFixed(1), +eye.z.toFixed(1)], withMist: withMist.n, noMist: noMist.n, ratio: noMist.n ? +(withMist.n / noMist.n).toFixed(2) : null, contrast: +withMist.mean.toFixed(1), mistBehind: behind });
      }
    };
    const V = new T.Vector3();
    const mouthY = () => { const w = W(); return w.head ? w.head.localToWorld(new T.Vector3(0, -0.02, 0.36)).y : null; };
    const swell = () => { const P = BP.water && BP.water(); return P && P.bodyG ? P.bodyG.scale.x : null; };
    for (const [name, T0] of moments) {
      BP.start(D.Re.t - T0); await wait(1800);
      const w = W(); const shown = { ripples: w.ripples.filter((r) => r.visible).length, jets: w.jets.filter((j) => j.visible).length, drops: 0, rainbow: !!(w.rainbow && w.rainbow.visible) };
      const pts = [];
      for (const r of w.ripples) if (r.visible) pts.push(r.getWorldPosition(new T.Vector3()));
      for (const j of w.jets) if (j.visible) { j.updateMatrixWorld(true); const p = j.geometry.attributes.position; for (let i = 0; i < p.count; i += 7) pts.push(V.fromBufferAttribute(p, i).applyMatrix4(j.matrixWorld).clone()); }
      if (w.drops && w.drops.visible) { const p = w.drops.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const yv = p.getY(i); if (yv > -100) { pts.push(new T.Vector3(p.getX(i), yv, p.getZ(i))); shown.drops++; } } }
      const m = { name, shown, views: [] };
      if (/drinking/.test(name)) {
        // drinking works: mouth at the water (the ripples sit 3 cm above its surface), body swelling as he drinks
        const rp = w.ripples.find((r) => r.visible), water = rp ? rp.getWorldPosition(new T.Vector3()).y - 0.03 : null;
        let lowest = 1e9; for (let k = 0; k < 10; k++) { lowest = Math.min(lowest, mouthY()); await wait(100); }
        BP.start(D.Re.t - 21); await wait(700); const s0 = swell(); BP.start(D.Re.t - 33.5); await wait(700); const s1 = swell();
        m.drink = { water: water === null ? null : +water.toFixed(2), mouth: +lowest.toFixed(2), swell: [s0 && +s0.toFixed(2), s1 && +s1.toFixed(2)] };
        BP.start(D.Re.t - T0); await wait(1200);
      }
      if (pts.length) {
        const c = pts.reduce((a, p) => a.add(p), new T.Vector3()).multiplyScalar(1 / pts.length);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, z]) => new T.Vector3(x, 0, z));
        const gap = (d) => d.x ? 37.6 - d.x * c.x : (d.z > 0 ? 49.6 - c.z : 37.6 + c.z);
        dirs.sort((a, b) => gap(a) - gap(b));
        await measure(w, m, c, dirs.slice(0, 3).map((d) => { const e = c.clone().addScaledVector(d, -7); e.y = Math.max(1.6, Math.min(c.y, 4)); return e; }), allParts(w).filter((o) => o !== w.rainbow), '');
      }
      if (w.rainbow && w.rainbow.visible) {
        // the rainbow: three points along its arc, each seen from 12 m on the park's side with the mist behind it
        w.rainbow.updateMatrixWorld(true); const p = w.rainbow.geometry.attributes.position; const arc = [];
        for (let i = 0; i < p.count; i++) arc.push(V.fromBufferAttribute(p, i).applyMatrix4(w.rainbow.matrixWorld).clone());
        arc.sort((a, b) => a.y - b.y); const top = arc[arc.length - 1], mid = arc[Math.floor(arc.length * 0.6)], low = arc[Math.floor(arc.length * 0.3)];
        for (const q of [top, mid, low]) { const d = new T.Vector3(q.x, 0, q.z); if (d.length() < 1) d.set(0, 0, 1); d.normalize(); const e = q.clone().addScaledVector(d, -12); e.y = 1.6; await measure(w, m, q, [e], [w.rainbow], ' (rainbow)'); }
      }
      out.moments.push(m);
    }
    out.pics = pics; return out;
  });
  if (r.noEvent) { expect('the Event started', false); process.exit(1); }
  const dir = path.join(root, 'tools/.runs/shots'); fs.mkdirSync(dir, { recursive: true });
  (r.pics || []).forEach((u, i) => fs.writeFileSync(path.join(dir, `bpwater_${String(i).padStart(2, '0')}.png`), Buffer.from(u.split(',')[1], 'base64')));
  delete r.pics; note(JSON.stringify(r));
  const views = r.moments.flatMap((m) => m.views.map((v) => Object.assign({ m: m.name }, v)));
  const counted = views.filter((v) => v.noMist >= 40 && v.mistBehind > 2000);
  const dr = (r.moments.find((m) => /drinking/.test(m.name)) || {}).drink;
  expect('his water parts are found (the module hands them to tests)', r.hasWater);
  expect('the mist walls are up', r.mistWalls >= 4, String(r.mistWalls));
  expect('drinking: his mouth comes down to the water (within 12 cm) and his body swells as he drinks', dr && dr.water !== null && Math.abs(dr.mouth - dr.water) <= 0.12 && dr.swell[1] > dr.swell[0], JSON.stringify(dr));
  expect('water is out and seen at every moment (ripples while drinking, the drip in flight, jets and drops while spraying)', r.moments.every((m) => m.views.some((v) => v.what === 'water' && v.noMist >= 40)), JSON.stringify(r.moments.map((m) => [m.name, m.shown, m.views.map((v) => v.noMist)])));
  expect('the rainbow shows while he sprays and is seen', r.moments.filter((m) => /spraying/.test(m.name)).every((m) => m.shown.rainbow && m.views.some((v) => v.what === ' (rainbow)' && v.noMist >= 40)), JSON.stringify(r.moments.filter((m) => /spraying/.test(m.name)).map((m) => [m.shown.rainbow, m.views.filter((v) => v.what === ' (rainbow)').map((v) => v.noMist)])));
  expect('views with a mist wall behind the water: at least 12', counted.length >= 12, String(counted.length));
  expect('against the mist the water (and the rainbow) shows at least 85% of what it shows without it, in every view', counted.every((v) => v.ratio >= 0.85), JSON.stringify(counted.filter((v) => v.ratio < 0.85).slice(0, 4)));
  expect('it stands out from the mist (6% or more per channel on average)', counted.every((v) => v.contrast >= 15), JSON.stringify(counted.filter((v) => v.contrast < 15).slice(0, 4)));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `BACKPACKA WATER TEST FAILED (${failures.length})` : 'BACKPACKA WATER TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
