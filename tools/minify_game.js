// Minifies the game file in place (the author: "apply minification to the current game file, as much as possible";
// full minification, names renamed too; RULES.md 19). Every <script> block goes through terser (safe compression in
// two passes, local names shortened); whitespace between the HTML's tags goes; the license notice at the top (an HTML
// comment: the author's CC0 dedication and three.js's MIT notice, which must stay) and the rest of the HTML are kept.
//
// Names that are kept (`RESERVED`): the ones the test harness reads in the game's scope (`HOOK_NAMES` and the tagged
// declarations in tools/lib/harness.js) and the few the tools find the game by (`bend`, `park`, `W`). A tool that
// needs another name of the game's must add it here first. Class names are kept (three.js and the tests name
// objects by their class). Painting is seeded from the painter's source (FIXES R1), so a minification that changes a
// painter changes its grain and its pre-painted file: rebuild with tools/build.sh afterwards.
//
//   node tools/minify_game.js [file]         default: tools/uncompressed.html (the game file), rewritten in place
//   node tools/minify_game.js --check [file] exit 1 if minifying would change the file (it is not fully minified;
//                                            run after every edit to the game file: the quick tier does)
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const { HOOK_NAMES } = require('./lib/harness');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2), check = args.includes('--check');
const file = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(root, 'tools/uncompressed.html'));
const RESERVED = [...new Set([...HOOK_NAMES, 'Ge', 'VIGS', 'F', 'W', 't', 'bend', 'park'])];
// reduce_funcs off: a function used once stays a function (test_bend_exact.js runs `bend` on its own; 447 bytes)
const OPTIONS = { ecma: 2020, compress: { passes: 2, reduce_funcs: false }, mangle: { reserved: RESERVED }, keep_classnames: true, format: { comments: false } };

async function minifyHtml(html) {
  // the HTML around the scripts: only whitespace between tags goes (the stylesheet is already one line)
  const outer = (h) => h.replace(/>\s+</g, '><').replace(/\s+$/, '\n');
  let out = '', at = 0;
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const r = await minify(m[2], OPTIONS);
    out += outer(html.slice(at, m.index)) + `<script${m[1]}>${r.code}</script>`; at = m.index + m[0].length;
  }
  return out + outer(html.slice(at));
}

(async () => {
  const html = fs.readFileSync(file, 'utf8');
  // repeated until nothing changes (terser's own output still shrinks once more), so a minified file is a fixed point
  let out = html, runs = 0;
  for (let prev = null; out !== prev && runs < 6; runs++) { prev = out; out = await minifyHtml(out); }
  if (check) {
    console.log(out === html ? `MINIFY CHECK PASSED: ${path.basename(file)} is fully minified (${html.length} bytes)` : `MINIFY CHECK FAILED: minifying would change ${path.basename(file)} (${html.length} -> ${out.length} bytes): run node tools/minify_game.js`);
    process.exit(out === html ? 0 : 1);
  }
  if (out === html) { console.log(`${path.relative(root, file)}: already fully minified (${html.length} bytes)`); return; }
  fs.writeFileSync(file, out);
  console.log(`${path.relative(root, file)}: ${html.length} -> ${out.length} bytes (${(100 * (html.length - out.length) / html.length).toFixed(1)}% smaller, ${runs} runs); now run python3 tools/sync_game.py and tools/build.sh --bump`);
})().catch((e) => { console.error(e); process.exit(1); });
