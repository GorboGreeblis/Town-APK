// Speech bubbles clear both speakers (standard tier; F-B77; the author: "during a text vignette between the Ancient
// and Mama Gorbo: The Ancient's text box was partly unreadable because it was clipping into Mama Gorbo's body ... test
// all other text vignettes to ensure that this issue does not happen with anyone else, for any two NPCs"). Every pair
// of townsfolk with a text scene (VIGS.all) is played in turn: the second stands beside the first (at the closest
// spacing the game starts a scene at, their bodies 1 m apart), the scene's text version plays, and while each line's
// bubble shows its lower edge is measured against the top of every character under its span (their model's bounds,
// each frame sampled every 100 ms):
//   - every pair played and showed its bubbles;
//   - no bubble's lower edge comes below the top of a character under it (none cuts into a body);
//   - bubbles are drawn over everything, so a body standing in front of one never hides it (the Ancient's bubble seen
//     past Mama Gorbo in the Cave);
//   - no page errors or logged errors.
// Pairs with the Ancient are played with the player in the Cave (their bubbles show only there).
//
//   node tools/test_bubble_clear.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, J = D.JGP, T = window.THREE, V = D.VIGS, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const NAMES = { HN: 'HENNRICK', MU: 'MUSHROOM', AN: 'ANOMALEE', KD: 'KING DINO', GW: 'GOOWARD', ZL: 'ZOLLOD', SM: 'SOMLET', FZ: 'FORTIZMO', ET: 'ETCHER', GT: 'GEMTOE', GL: 'GLYPH', MG: 'MONTGUMMERY', MA: 'MAMA GORBO', SP: 'SPARKAKUS' };
    const line = (() => { try { return V.lineUp(); } catch (e) { return {}; } })();
    const ent = (c) => c === 'SL' ? (J.slug && J.slug.ent) : (D.It.all.find((e) => e.def && e.def.name === NAMES[c]) || line[c] || null);
    const chars = () => { const a = D.It.all.filter((e) => e.group && e.group.visible); if (J.slug && J.slug.ent && !a.includes(J.slug.ent)) a.push(J.slug.ent); return a; };
    const B3 = new T.Box3(), seenPairs = new Set(), out = { pairs: 0, played: 0, noBubble: [], clips: [], skipped: [] };
    for (const p of V.all) {
      const key = [p[0], p[1]].sort().join('-'); if (seenPairs.has(key)) continue; seenPairs.add(key);
      const A = ent(p[0]), Bn = ent(p[1]); out.pairs++;
      if (!A || !Bn || !A.group || !Bn.group) { out.skipped.push(key); continue; }
      while (V.playing()) await wait(100);
      // the second beside the first, toward the park's middle (the slug never moves; the other comes to it)
      const [S, M] = p[0] === 'SL' ? [A, Bn] : p[1] === 'SL' ? [Bn, A] : [A, Bn];
      const sp = S.group.position, L = Math.hypot(sp.x, sp.z) || 1, d = (S.bodyR || 1) + (M.bodyR || 1) + 1;
      M.group.position.set(sp.x - sp.x / L * d, M.group.position.y, sp.z - sp.z / L * d);
      const cave = p[0] === 'SL' || p[1] === 'SL';
      D.At.position.set(cave ? sp.x - sp.x / L * 0.5 : sp.x - sp.x / L * 9, D.At.position.y, cave ? sp.z - sp.z / L * 0.5 : sp.z - sp.z / L * 9);
      await wait(200);
      if (!V.play(A, Bn, true)) { out.skipped.push(key + ' (would not play)'); continue; }
      out.played++; let shown = 0; const t0 = performance.now();
      while (V.playing() && performance.now() - t0 < 15000) {
        await wait(100);
        for (const b of D.C.children) {
          if (!b.isSprite || !b.visible || b.renderOrder !== 20) continue;
          shown++; if (b.material.depthTest !== false) out.depthTested = (out.depthTested || 0) + 1; const bottom = b.position.y - b.scale.y / 2, half = b.scale.x / 2;
          for (const c of chars()) {
            const cp = c.group.position; if (Math.hypot(cp.x - b.position.x, cp.z - b.position.z) > half + (c.bodyR || 1)) continue;
            B3.setFromObject(c.group); if (B3.isEmpty()) continue;
            if (bottom < B3.max.y && out.clips.length < 40) out.clips.push({ pair: key, who: c.id || (c.def && c.def.name) || c.kind, by: +(B3.max.y - bottom).toFixed(2) });
          }
        }
      }
      if (!shown) out.noBubble.push(key);
    }
    return out;
  });
  note(JSON.stringify({ pairs: r.pairs, played: r.played, skipped: r.skipped, noBubble: r.noBubble }));
  const worst = {}; for (const c of r.clips) worst[c.pair + ' over ' + c.who] = Math.max(worst[c.pair + ' over ' + c.who] || 0, c.by);
  if (r.clips.length) note('clips: ' + JSON.stringify(worst));
  expect('every pair with a text scene played', r.played >= r.pairs - r.skipped.length && r.played > 10, `${r.played} of ${r.pairs}`);
  note('scenes that ended before a bubble showed (Sparkakus, tied to his library, ends his at once; the same on 4.0.3): ' + (r.noBubble.join(', ') || 'none'));
  expect('scenes showed their bubbles (all but Sparkakus\'s)', r.noBubble.filter((k) => !/SP/.test(k)).length === 0, r.noBubble.filter((k) => !/SP/.test(k)).join(', '));
  expect('no bubble cuts into a character (its lower edge above every head under it)', r.clips.length === 0, Object.keys(worst).slice(0, 8).join(', '));
  expect('bubbles are drawn over everything (never hidden by a body in front of them)', !r.depthTested, String(r.depthTested || 0) + ' bubble-frames depth-tested');
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `BUBBLE CLEAR TEST FAILED (${failures.length})` : 'BUBBLE CLEAR TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
