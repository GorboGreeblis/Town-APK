// Final build (the author, 2026-11-05: "Please fence off logging / debug tools so that they can be removed from the
// final build"; 2026-11-06: "From the very last build: debug and logging features must be removed"). Writes
// tools/final.html from the game file with the debug code taken out:
//   - the debug switch's own script (`<script>var GT_DEBUG=!0;</script>`) is dropped and every script is minified again
//     with GT_DEBUG defined false, so terser drops each branch fenced by it: the log function itself (`__gtLog`, its
//     report to the APK's `/log` and its localStorage black box), the flight recorder (`__gtFR`), the light record
//     (a PBO and readPixels of the drawn frame), the native census, the frame-health counters, the display timeline,
//     the multiview statistics and GL call counters, the performance log (`__gcPf`) and the rest (FIXES.md, 4.0.63);
//   - in every script but the one that defines it, `window.__gtLog` is defined false too, so every guarded log call
//     (`window.__gtLog&&window.__gtLog(...)`) goes with the text it would have built; in the script that defines it
//     (the entry script) its direct calls `__gtLog(...)` are taken as pure, so they go too;
//   - then minified as the game file is (tools/minify_game.js on the result: the same names kept, the same renaming).
// Then checks (the build fails on any): no GT_DEBUG left; no `__gtLog` (no definition, no call); no `/log`; no
// localStorage, sessionStorage or indexedDB; no `__gtFR`; no `__dbg`; no PIXEL_PACK_BUFFER and no readPixels outside
// three.js (the library's own readRenderTargetPixels, which the game never calls); no network request but the
// pre-painted textures' (`fetch("tex/...`); no name used but never declared (test_freevars.js on the result); and the
// file is smaller. The final build is what goes to the Store (`tools/build.sh --bump --final` packs it); the builds
// the author tests keep everything (RULES.md 23).
//
//   node tools/final_build.js [file] [--out tools/final.html]
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const file = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(root, 'tools/uncompressed.html'));
const out = path.resolve(arg('--out', path.join(root, 'tools/final.html')));
const scripts = (h) => [...h.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];

(async () => {
  let html = fs.readFileSync(file, 'utf8');
  const flag = '<script>var GT_DEBUG=!0;</script>';
  if (!html.includes(flag)) throw new Error('final_build: the debug switch script is not in ' + file);
  html = html.replace(flag, '');
  let res = '', at = 0;
  for (const m of scripts(html)) {
    // every script but the one that defines the log function takes it as false (a definition cannot be folded); in
    // the one that defines it the definition is fenced by GT_DEBUG and its direct calls are taken as pure
    const defining = /window\.__gtLog=function/.test(m[2]);
    const defs = defining ? { GT_DEBUG: false } : { GT_DEBUG: false, 'window.__gtLog': false };
    // this pass only folds and drops (names stay); tools/minify_game.js then minifies the result as it does the game file
    const r = await minify(m[2], { ecma: 2020, compress: { passes: 2, reduce_funcs: false, global_defs: defs, hoist_props: false, pure_funcs: defining ? ['__gtLog'] : [] }, mangle: false, keep_classnames: true, keep_fnames: true, format: { comments: false } });
    res += html.slice(at, m.index) + `<script${m[1]}>${r.code}</script>`; at = m.index + m[0].length;
  }
  res += html.slice(at);
  fs.writeFileSync(out, res);
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'minify_game.js'), out], { stdio: 'inherit' });
  res = fs.readFileSync(out, 'utf8');
  const before = fs.statSync(file).size, after = fs.statSync(out).size;
  console.log(`final_build: ${path.relative(root, out)}: ${after} bytes (game file ${before}; ${(100 * (before - after) / before).toFixed(1)}% smaller)`);

  // the checks
  const count = (s, re) => (s.match(re) || []).length;
  const notThree = scripts(res).filter((m) => !/^var THREE=function/.test(m[2])).map((m) => m[2]).join('\n');
  const fetches = res.match(/fetch\([^)]{0,40}/g) || [];
  const checks = [
    ['GT_DEBUG left', count(res, /GT_DEBUG/g)],
    ['__gtLog left (a definition or a call)', count(res, /__gtLog/g)],
    ['/log left (the report to the APK\'s server)', count(res, /\/log\b/g)],
    ['localStorage, sessionStorage or indexedDB left', count(res, /localStorage|sessionStorage|indexedDB/g)],
    ['__gtFR left (the flight recorder)', count(res, /__gtFR/g)],
    ['__dbg left', count(res, /__dbg/g)],
    ['PIXEL_PACK_BUFFER left (the light record)', count(res, /PIXEL_PACK_BUFFER/g)],
    ['readPixels outside three.js', count(notThree, /readPixels/g)],
    ['network requests other than the textures\'', fetches.filter((f) => !/^fetch\("tex\//.test(f)).length + count(res, /sendBeacon|XMLHttpRequest|WebSocket/g)],
    ['the file not smaller than the game file', after < before ? 0 : 1],
  ];
  // no name used but never declared (GT_DEBUG and __gtLog are gone, so nothing may still read them)
  const fv = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'test_freevars.js'), out], { encoding: 'utf8' });
  checks.push(['undeclared names (test_freevars.js)', fv.status === 0 ? 0 : 1]);
  if (fv.status !== 0) console.log(fv.stdout.trim().split('\n').slice(-6).join('\n'));
  for (const [what, n] of checks) console.log(`  ${n ? 'FAIL' : 'ok  '}  ${what}: ${n}`);
  if (checks.some(([, n]) => n)) { console.log('FINAL BUILD CHECK FAILED'); process.exit(1); }
  console.log('FINAL BUILD CHECK PASSED');
})().catch((e) => { console.error(e); process.exit(1); });
