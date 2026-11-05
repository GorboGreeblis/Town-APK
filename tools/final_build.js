// Final build (the author, 2026-11-05: "Please fence off logging / debug tools so that they can be removed from the
// final build"). Writes tools/final.html from the game file with the debug code taken out:
//   - the debug switch's own script (`<script>var GT_DEBUG=!0;</script>`) is dropped and every script is minified again
//     with GT_DEBUG defined false, so terser drops each branch fenced by it: the performance log (`__gcPf`), the
//     flight recorder's records, and whatever else tests GT_DEBUG;
//   - in every script but the one that defines it, `window.__gtLog` is defined false too, so every guarded log call
//     (`window.__gtLog&&window.__gtLog(...)`) goes with the text it would have built;
//   - then minified as the game file is (tools/minify_game.js on the result: the same names kept, the same renaming).
// Then checks: no GT_DEBUG left, no guarded log call left in the game's script, and the file is smaller. The final
// build is what goes to the Store; the builds the author tests keep everything (RULES.md 23).
//
//   node tools/final_build.js [file] [--out tools/final.html]
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(root, 'tools/uncompressed.html'));
const out = path.resolve(arg('--out', path.join(root, 'tools/final.html')));

(async () => {
  let html = fs.readFileSync(file, 'utf8');
  const flag = '<script>var GT_DEBUG=!0;</script>';
  if (!html.includes(flag)) throw new Error('final_build: the debug switch script is not in ' + file);
  html = html.replace(flag, '');
  let res = '', at = 0;
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    // every script but the one that defines the log function takes it as false (a definition cannot be folded)
    const defs = /window\.__gtLog=function/.test(m[2]) ? { GT_DEBUG: false } : { GT_DEBUG: false, 'window.__gtLog': false };
    // this pass only folds and drops (names stay); tools/minify_game.js then minifies the result as it does the game file
    const r = await minify(m[2], { ecma: 2020, compress: { passes: 2, reduce_funcs: false, global_defs: defs, hoist_props: false }, mangle: false, keep_classnames: true, keep_fnames: true, format: { comments: false } });
    res += html.slice(at, m.index) + `<script${m[1]}>${r.code}</script>`; at = m.index + m[0].length;
  }
  res += html.slice(at);
  fs.writeFileSync(out, res);
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'minify_game.js'), out], { stdio: 'inherit' });
  res = fs.readFileSync(out, 'utf8');
  const left = (res.match(/GT_DEBUG/g) || []).length, logs = (res.match(/window\.__gtLog&&window\.__gtLog\(/g) || []).length;
  fs.writeFileSync(out, res);
  const before = fs.statSync(file).size;
  console.log(`final_build: ${path.relative(root, out)}: ${res.length} bytes (game file ${before}; ${(100 * (before - res.length) / before).toFixed(1)}% smaller); GT_DEBUG left: ${left}; guarded log calls left: ${logs}`);
  if (left || logs) { console.log('FINAL BUILD CHECK FAILED'); process.exit(1); }
  console.log('FINAL BUILD CHECK PASSED');
})().catch((e) => { console.error(e); process.exit(1); });
