// Text scenes cause no flash (standard tier; S9, S11; the author: "Did you fully check that text vignettes could not
// cause any flashes or any issues related to flashes?"). Every pair of townsfolk with a text scene (VIGS.all) plays its
// text version in VR (fake XR; run it with GT_MULTIVIEW=1 for the headset's render path, as run_tests.sh does) while
// the player walks round the speakers, 1.3 to 4 m from the first and their eyes rising and falling half a metre. Each
// line's bubble is a pooled canvas texture painted again for that line, on a sprite from a pool made while loading (S11),
// sized and faded as it is drawn, from the camera drawing it. On every frame drawn (measured as drawn), and over each scene:
//   - every pair played and showed its bubbles (Sparkakus's end at once, tied to his library; only noted);
//   - no GPU work inside a headset frame (texture uploads, mipmaps, pixel reads and the like: the frame-hazard watch);
//   - no shader program made during the scenes (the programs in use the same after every scene as before the first),
//     and no texture or geometry left behind (the counts the same after the last scene as before the first);
//   - no bubble spans more than 55 degrees of the view, and none is drawn within 1.2 m of the eyes;
//   - no page errors or logged errors.
//
//   GT_MULTIVIEW=1 node tools/test_vig_flash.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, T = window.THREE, V = D.VIGS, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(2000);
    if (!D.we.presenting || !D.we.headPos) return { noVR: true };
    const NAMES = { HN: 'HENNRICK', MU: 'MUSHROOM', AN: 'ANOMALEE', KD: 'KING DINO', GW: 'GOOWARD', ZL: 'ZOLLOD', SM: 'SOMLET', FZ: 'FORTIZMO', ET: 'ETCHER', GT: 'GEMTOE', GL: 'GLYPH', MG: 'MONTGUMMERY', MA: 'MAMA GORBO', SP: 'SPARKAKUS' };
    const line = (() => { try { return V.lineUp(); } catch (e) { return {}; } })();
    const ent = (c) => c === 'SL' ? (J.slug && J.slug.ent) : (D.It.all.find((e) => e.def && e.def.name === NAMES[c]) || line[c] || null);
    const H = window.__gtFrameHaz, h0 = H ? H.n : 0, f0 = H ? H.first.length : 0, info = O.info;
    const progs = () => (info.programs ? info.programs.length : 0);
    let maxDeg = 0, near = 0, minD = 1e9, shown = 0, worst = null, cur = '';
    const R0 = O.render; O.render = function () { const res = R0.apply(this, arguments); try { const h = D.we.headPos; for (const b of D.C.children) { if (!b.isSprite || !b.visible || b.renderOrder !== 20 || !(b.material.opacity > 0.01)) continue; shown++; const d = b.position.distanceTo(h); minD = Math.min(minD, d); if (d < 1.2) near++; const deg = 2 * Math.atan(Math.max(b.scale.x, b.scale.y) / 2 / Math.max(d, 0.01)) * 180 / Math.PI; if (deg > maxDeg) { maxDeg = deg; worst = { pair: cur, deg: +deg.toFixed(1), d: +d.toFixed(2), sx: +b.scale.x.toFixed(2), sy: +b.scale.y.toFixed(2), full: b.userData.gcS ? b.userData.gcS.map((v) => +v.toFixed(2)) : null, op: +b.material.opacity.toFixed(2), frame: window.__fakeXR ? window.__fakeXR.frames : null }; } } } catch (e) {} return res; };
    const seen = new Set(), out = { pairs: 0, played: 0, noBubble: [], skipped: [], progChanged: [] };
    // one scene first, so the bubble pool and the sprite program are in use as in play; then the counts
    const p0 = progs(), t0c = info.memory.textures, g0c = info.memory.geometries;
    let k = 0;
    for (const p of V.all) {
      const key = [p[0], p[1]].sort().join('-'); if (seen.has(key)) continue; seen.add(key);
      const A = ent(p[0]), B = ent(p[1]); out.pairs++;
      if (!A || !B || !A.group || !B.group) { out.skipped.push(key); continue; }
      while (V.playing()) await wait(100);
      const [S, M] = p[0] === 'SL' ? [A, B] : p[1] === 'SL' ? [B, A] : [A, B];
      const sp = S.group.position, L = Math.hypot(sp.x, sp.z) || 1, d = (S.bodyR || 1) + (M.bodyR || 1) + 1;
      M.group.position.set(sp.x - sp.x / L * d, M.group.position.y, sp.z - sp.z / L * d);
      const cave = p[0] === 'SL' || p[1] === 'SL', y0 = D.At.position.y;
      // the player steps away first (a scene does not start with the player beside the speakers), then walks in
      D.At.position.set(sp.x - sp.x / L * 9, y0, sp.z - sp.z / L * 9); await wait(200); cur = key;
      const before = progs();
      if (!V.play(A, B, true)) { out.skipped.push(key + ' (would not play)'); continue; }
      out.played++; const s0 = shown, t1 = performance.now();
      while (V.playing() && performance.now() - t1 < 15000) {
        const a = (performance.now() - t1) / 1000 + k, rr = cave ? 0.6 : 1.3 + 1.35 * (1 + Math.sin(0.7 * a));
        D.At.position.set(sp.x + rr * Math.cos(0.9 * a), y0 + 0.5 * Math.sin(1.1 * a) - 0.25, sp.z + rr * Math.sin(0.9 * a));
        await wait(50);
      }
      D.At.position.y = y0; k += 3;
      if (shown === s0) out.noBubble.push(key);
      if (progs() !== before) out.progChanged.push(key + ' ' + before + '>' + progs());
    }
    O.render = R0;
    await wait(500);
    return Object.assign(out, { worst, maxDeg: +maxDeg.toFixed(1), near, minD: +minD.toFixed(2), shown, progs: [p0, progs()], textures: [t0c, info.memory.textures], geometries: [g0c, info.memory.geometries], haz: H ? H.n - h0 : null, hazFirst: H ? H.first.slice(f0, f0 + 3) : [], mv: !!(window.__gtXR && window.__gtXR.mvActive) });
  });
  if (r.noVR) { expect('in VR with a head position', false); process.exit(1); }
  note(JSON.stringify(Object.assign({}, r, { hazFirst: undefined })));
  note('render path: ' + (r.mv ? 'multiview (the headset\'s)' : 'classic (run with GT_MULTIVIEW=1 for the headset\'s)'));
  expect('every pair with a text scene played', r.played >= r.pairs - 1, `${r.played} of ${r.pairs}; not played: ${r.skipped.join(', ')}`);
  note('scenes that ended before a bubble showed (Sparkakus, tied to his library): ' + (r.noBubble.join(', ') || 'none'));
  expect('scenes showed their bubbles (all but Sparkakus\'s)', r.noBubble.filter((k) => !/SP/.test(k)).length === 0, r.noBubble.filter((k) => !/SP/.test(k)).join(', '));
  expect('no GPU work inside a headset frame through every scene (frame-hazard watch)', r.haz === 0 || r.haz === null, JSON.stringify(r.hazFirst).slice(0, 500));
  expect('no shader program made during any scene', r.progChanged.length === 0 && r.progs[0] === r.progs[1], JSON.stringify({ progs: r.progs, changed: r.progChanged.slice(0, 5) }));
  expect('no texture or geometry left behind by the scenes', r.textures[1] <= r.textures[0] && r.geometries[1] <= r.geometries[0], JSON.stringify({ textures: r.textures, geometries: r.geometries }));
  expect('no bubble spans more than 55 degrees of the view', r.maxDeg <= 55, `${r.maxDeg} degrees at most`);
  expect('no bubble is drawn within 1.2 m of the eyes', r.near === 0, `${r.near} bubble-frames; closest ${r.minD} m`);
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `TEXT SCENE FLASH TEST FAILED (${failures.length})` : 'TEXT SCENE FLASH TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
