// Seeded decoration (standard tier; the author's randomness decisions, RULES.md 5, RANDOMNESS.md, FIXES R5): what the
// author chose to have the same on every launch stays so.
//   - the game file still draws each seeded item from its own named stream (`gcRnd("name")`): the stars, the clouds,
//     the blinkers (and Mama Gorbo's own blink), the five idle sway phases, Anomalee's glitch timing and jaw, and the
//     Event ring's sway; an edit that brings back Math.random for one of them fails here;
//   - two launches build the same night sky (all 700 stars) and the same 14 clouds (puffs, sizes, orbit, height, speed),
//     and the clouds still differ from each other (seeded, not made uniform);
//   - no page errors.
//
//   node tools/test_seeded.js [file]
const fs = require('fs');
const path = require('path');
const { boot, reporter, root } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const KEYS = ['stars', 'clouds', 'blinkers', 'mamaBlink', 'anomaleePhase', 'hennrickPhase', 'nextessaPhase', 'fortizmoPhase', 'montgummeryPhase', 'anomaleeGlitch', 'anomaleeJaw'];

(async () => {
  const { expect, note, failures } = reporter();
  const html = fs.readFileSync(file || path.join(root, 'tools/uncompressed.html'), 'utf8');
  const missing = KEYS.filter((k) => !html.includes(`gcRnd("${k}")`));
  if (!html.includes('gcRnd("ring"+')) missing.push('ring (per character)');
  if (!/blinker:function\([\w$]+\)\{const [\w$]+=\[\],([\w$]+)="blink"\+[\w$]+;[^]*?gcRnd\(\1\)/.test(html)) missing.push('blink gaps (per blinker)');   // local names are the minifier's
  expect('every seeded item draws from its own named stream (gcRnd)', missing.length === 0, missing.join(', '));

  const runs = [];
  for (let k = 0; k < 2; k++) {
    const g = await boot({ file, vr: true });
    runs.push(await g.page.evaluate(() => {
      const D = window.__dbg; let stars = null; const clouds = [];
      D.C.traverse((o) => {
        if (o.isPoints && o.geometry.attributes.position.count === 700) { let h = 2166136261; const a = o.geometry.attributes.position.array; for (let i = 0; i < a.length; i++) h = Math.imul(h ^ Math.round(a[i] * 1000), 16777619); stars = h >>> 0; }
        const u = o.userData; if (o.isGroup && u && u.r !== undefined && u.h !== undefined && u.w !== undefined && u.a !== undefined) clouds.push([u.r, u.h, u.w, o.children.length].map((v) => +(+v).toFixed(5)).join('/'));
      });
      return { stars, clouds };
    }));
    runs[k].errors = g.errors.slice(0, 3);
    await g.close();
  }
  const [a, b] = runs;
  note(`stars: ${a.stars} / ${b.stars}; clouds: ${a.clouds.length} (${a.clouds.join(' ')})`);
  expect('the night sky has 700 stars', a.stars !== null && b.stars !== null);
  expect('two launches build the same stars', a.stars === b.stars, `${a.stars} vs ${b.stars}`);
  expect('there are 14 clouds (7 until 3.15.68)', a.clouds.length === 14 && b.clouds.length === 14, `${a.clouds.length}, ${b.clouds.length}`);
  expect('two launches build the same clouds', a.clouds.join(' ') === b.clouds.join(' '), `${a.clouds.join(' ')} | ${b.clouds.join(' ')}`);
  expect('the clouds still differ from each other (seeded, not uniform)', new Set(a.clouds).size === a.clouds.length, a.clouds.join(' '));
  expect('no page errors', !a.errors.length && !b.errors.length, a.errors.concat(b.errors).join(' | '));
  console.log(failures.length ? `SEEDED TEST FAILED (${failures.length})` : 'SEEDED TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
