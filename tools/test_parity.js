#!/usr/bin/env node
/**
 * Parity check: unpack the compressed release build (tools/index.compressed.html)
 * in headless Chromium, capture the HTML it writes into the document, and diff
 * it against the uncompressed source the APK ships.
 *
 * The compressed build decodes a binary blob and calls document.write() with the
 * full game; this script replaces document.write to capture that string.
 *
 * Usage: node tools/test_parity.js [compressed.html] [uncompressed.html]
 * The release build is the same source run through a stronger minifier
 * (renamed locals, "a"+"b" joined, constants folded), so a textual diff is
 * meaningless. Instead the check compares what the player can notice: the set
 * of string literals (dialogue, labels, colours, asset names, version) after
 * joining literal concatenations. Numeric literals are reported for
 * information only, because constant folding legitimately changes them.
 * Exit 0 when the string sets match (code-like leftovers such as inline
 * worker source are reported, not failed); exit 1 otherwise. Details go to
 * tools/.parity/.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const compressed = path.resolve(process.argv[2] || path.join(root, 'tools/index.compressed.html'));
const uncompressed = path.resolve(process.argv[3] || path.join(root, 'tools/uncompressed.html'));
const outDir = path.join(root, 'tools', '.parity');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) OculusBrowser/35.0 Chrome/128.0 VR' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__captured = null;
    const open = document.open.bind(document);
    document.open = function () { return document; };          // keep our hook alive
    document.write = function (s) { window.__captured = (window.__captured || '') + s; };
    document.close = function () {};
    void open;
  });
  await page.goto('file://' + compressed, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__captured !== null, null, { timeout: 600000 });
  const unpacked = await page.evaluate(() => window.__captured);
  await browser.close();

  fs.mkdirSync(outDir, { recursive: true });
  const unpackedPath = path.join(outDir, 'unpacked.html');
  fs.writeFileSync(unpackedPath, unpacked);
  const src = fs.readFileSync(uncompressed, 'utf8');
  console.log(`unpacked ${Buffer.byteLength(unpacked)} bytes -> ${unpackedPath}`);
  console.log(`source   ${Buffer.byteLength(src)} bytes    ${uncompressed}`);
  if (unpacked === src) { console.log('PARITY: byte-identical'); process.exit(0); }
  console.log('not byte-identical (release build is re-minified); comparing content literals');

  // Join "a"+"b" literal concatenations so both builds are compared on the same footing.
  const fold = (s) => { let prev; do { prev = s; s = s.replace(/"((?:[^"\\\n]|\\.)*)"\+"((?:[^"\\\n]|\\.)*)"/g, '"$1$2"'); } while (s !== prev); return s; };
  const strings = (s) => (fold(s).match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g) || []).filter((x) => x.length > 3);
  const codeLike = (x) => /[;(){}<>=]|\+"|"\+/.test(x);
  const numbers = (s) => (s.match(/(?<![\w.])\d+(?:\.\d+)?(?:e[+-]?\d+)?(?![\w.])/g) || []);
  const bag = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return m; };
  const diff = (ma, mb) => { const out = []; for (const [k, v] of ma) { const w = mb.get(k) || 0; if (v > w) out.push(`${k}  (x${v - w})`); } return out; };

  let failed = 0;
  const report = (label, a, b, exitOnDiff, asSet) => {
    if (asSet) { a = [...new Set(a)]; b = [...new Set(b)]; }
    let onlyA = diff(bag(a), bag(b)), onlyB = diff(bag(b), bag(a));
    if (asSet) {
      // Inline worker/shader source strings are concatenated with variables at
      // runtime; the minifier inlined some of them. Report, do not fail.
      const noteA = onlyA.filter(codeLike), noteB = onlyB.filter(codeLike);
      onlyA = onlyA.filter((x) => !codeLike(x)); onlyB = onlyB.filter((x) => !codeLike(x));
      for (const x of noteA) console.log('  NOTE  code-like string differs (release): ' + x.slice(0, 120));
      for (const x of noteB) console.log('  NOTE  code-like string differs (source):  ' + x.slice(0, 120));
    }
    fs.writeFileSync(path.join(outDir, label + '_only_in_release.txt'), onlyA.join('\n'));
    fs.writeFileSync(path.join(outDir, label + '_only_in_source.txt'), onlyB.join('\n'));
    const ok = onlyA.length === 0 && onlyB.length === 0;
    console.log(`  ${ok ? 'PASS' : (exitOnDiff ? 'FAIL' : 'NOTE')}  ${label}: release ${a.length}, source ${b.length}; only-in-release ${onlyA.length}, only-in-source ${onlyB.length}`);
    const show = (arr) => arr.slice(0, 10).map((s) => '        ' + s.slice(0, 140)).join('\n');
    if (onlyA.length) console.log('      release-only:\n' + show(onlyA));
    if (onlyB.length) console.log('      source-only:\n' + show(onlyB));
    if (!ok && exitOnDiff) failed++;
  };
  // Strings that belong to the compressed loader itself, not the game.
  const loaderOnly = new Set(['"DOMContentLoaded"', '"loading"']);
  report('strings', strings(unpacked).filter((x) => !loaderOnly.has(x)), strings(src), true, true);
  report('numbers (informational: constant folding changes these)', numbers(unpacked), numbers(src), false, false);
  console.log('details in ' + outDir);
  console.log(failed ? 'PARITY FAILED' : 'PARITY OK: release build and APK source carry the same content');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('PARITY ERROR', e); process.exit(1); });
