#!/usr/bin/env node
// Pre-renders the game's procedural canvas textures once, at build time, into
// tools/android/app/src/main/assets/tex/ (PNG + manifest.json). At runtime the
// head script loads them and the painter blits them instead of repainting
// (FIXES.md, entry edit 9), and Gooward's gallery mural (its worker's three strips, F-B34). Painters that draw text are skipped so fonts stay
// the headset's own. Re-run whenever a painter in tools/uncompressed.html (the
// game file) changes:   node tools/prerender_textures.js
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { boot, root } = require('./lib/harness.js');
const out = path.join(root, 'tools/android/app/src/main/assets/tex');
(async () => {
  const cap = path.join(root, 'tools/.runs/exp_texcapture.html');
  execFileSync('python3', [path.join(root, 'tools/experiment.py'), 'texcapture', path.join(root, 'tools/uncompressed.html'), cap], { stdio: 'inherit' });
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });   // capture must not load old files
  const { page, browser, bootS } = await boot({ file: cap, vr: true });
  console.log(`booted in ${bootS}s`);
  // Gooward's gallery mural is painted by a worker after the boot (minutes headless): wait for its three strips
  const t0 = Date.now();
  await page.waitForFunction(() => (window.__gtXR.tex.capture || []).filter((e) => /^mural:/.test(e.k)).length >= 3, null, { timeout: 30 * 60000, polling: 2000 });
  console.log(`mural strips painted in ${((Date.now() - t0) / 1000).toFixed(0)} s more`);
  // Probe points: the same sampling Ho.capture does at runtime (up to 3 of 8 fixed points with a
  // non-transparent pixel), computed here so the headset does no readback for these textures.
  const list = await page.evaluate(() => (window.__gtXR.tex.capture || []).map((e) => {
    const cx = e.c.getContext('2d', { willReadFrequently: true }), pr = [];
    for (const [r, s] of [[.5, .5], [.25, .25], [.75, .25], [.25, .75], [.75, .75], [.5, .15], [.1, .9], [.9, .1]]) {
      if (pr.length >= 3) break; const x = Math.min(e.w - 1, Math.round(r * e.w)), y = Math.min(e.h - 1, Math.round(s * e.h));
      const d = cx.getImageData(x, y, 1, 1).data; if (d[0] | d[1] | d[2] | d[3]) pr.push([x, y]);
    }
    return { k: e.k, i: e.i, w: e.w, h: e.h, pr, data: e.c.toDataURL('image/png') };
  }));
  await browser.close().catch(() => {});
  const manifest = []; let bytes = 0;
  for (const e of list) {
    const f = `${e.k.replace(/[^a-z0-9]/gi, '_')}_${e.i}.png`; const buf = Buffer.from(e.data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, f), buf); bytes += buf.length; manifest.push({ k: e.k, i: e.i, f, w: e.w, h: e.h, pr: e.pr });
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest));
  console.log(`pre-rendered ${manifest.length} textures, ${(bytes / 1048576).toFixed(2)} MB -> ${path.relative(root, out)}`);
  process.exit(0);
})();
