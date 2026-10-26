#!/usr/bin/env node
// Pre-renders the game's procedural canvas textures once, at build time, into
// tools/android/app/src/main/assets/tex/ (PNG + manifest.json). At runtime the
// head script loads them and the painter blits them instead of repainting
// (tools/apply_entry_fix.py, edit 9). Painters that draw text are skipped so
// fonts stay the headset's own. Re-run whenever tools/uncompressed.html or the
// fix list changes:   node tools/prerender_textures.js
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { boot, root } = require('./lib/harness.js');
const out = path.join(root, 'tools/android/app/src/main/assets/tex');
(async () => {
  const cap = path.join(root, 'tools/.runs/exp_texcapture.html');
  execFileSync('python3', [path.join(root, 'tools/apply_entry_fix.py'), '--experiment', 'texcapture', path.join(root, 'tools/uncompressed.html'), cap], { stdio: 'inherit' });
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });   // capture must not load old files
  const { page, browser, bootS } = await boot({ file: cap, vr: true });
  console.log(`booted in ${bootS}s`);
  const list = await page.evaluate(() => (window.__gtXR.tex.capture || []).map((e) => ({ k: e.k, i: e.i, w: e.w, h: e.h, data: e.c.toDataURL('image/png') })));
  await browser.close().catch(() => {});
  const manifest = []; let bytes = 0;
  for (const e of list) {
    const f = `${e.k.replace(/[^a-z0-9]/gi, '_')}_${e.i}.png`; const buf = Buffer.from(e.data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, f), buf); bytes += buf.length; manifest.push({ k: e.k, i: e.i, f, w: e.w, h: e.h });
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest));
  console.log(`pre-rendered ${manifest.length} textures, ${(bytes / 1048576).toFixed(2)} MB -> ${path.relative(root, out)}`);
  process.exit(0);
})();
