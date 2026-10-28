// Standalone test (standard tier, pass/fail): the game file runs fully on its own, and the one extra the APK ships
// with it (the pre-painted textures in assets/tex/) is exactly what the game file paints itself (the author: it must
// run without any outside things; extras only when built from the game file itself).
//
// The game file is served alone, as by any plain web server: every other path is a 404 (no tex/, no /log). In that
// session, with the texture painters recorded as they paint (the `texcapture` variant, which paints exactly as the
// game does and keeps a reference to each canvas):
//   - every request the page makes is listed: it may ask for the optional extras (and get a 404), nothing else, and
//     nothing from another host;
//   - it boots, enters VR, draws frames, walks, opens a dialogue and starts the planting Event, with no page error;
//   - every texture it paints that has a pre-painted copy in assets/tex/ is compared pixel for pixel with that copy,
//     and every pre-painted copy must have been painted in the session: a stale or wrong tex/ fails (rebuild it with
//     `node tools/prerender_textures.js`).
//
//   node tools/test_standalone.js [game file]      default: tools/uncompressed.html
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { boot, reporter, root } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'tools/uncompressed.html');
const texDir = path.join(root, 'tools/android/app/src/main/assets/tex');
(async () => {
  const { expect, note, failures } = reporter();
  const cap = path.join(root, 'tools/.runs/standalone_capture.html');
  execFileSync('python3', [path.join(root, 'tools/experiment.py'), 'texcapture', file, cap], { stdio: 'ignore' });
  const g = await boot({ file: cap, vr: true, fastSim: false, standalone: true });
  const page = g.page;
  await page.waitForTimeout(2000);
  const play = await page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
    const f0 = window.__fakeXR.frames; await wait(3000); out.frames = window.__fakeXR.frames - f0;
    const p0 = D.At.position.clone(); D.At.position.x += 6; await wait(800); out.moved = D.At.position.distanceTo(p0) > 5;
    D.qt.open('TEST', '#ffffff', 'Hello there.|Second line.'); await wait(800); out.dialogue = D.qt.isOpen; while (D.qt.isOpen) { D.qt.advance(); await wait(300); }
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(300);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 15000) await wait(200);
    out.event = !!D.me.active; await wait(4000); clearInterval(adv);
    const tex = window.__gtXR && window.__gtXR.tex; out.used = tex ? (tex.used || 0) : null; out.captured = tex && tex.capture ? tex.capture.length : 0;
    return out;
  });
  // the pre-painted textures, compared in the page against what it painted
  const manifest = JSON.parse(fs.readFileSync(path.join(texDir, 'manifest.json'), 'utf8'));
  const cmp = await page.evaluate(async (list) => {
    const C = window.__gtXR.tex.capture, out = { missing: [], differ: [], same: 0 };
    for (const e of list) {
      const c = C.find((q) => q.k === e.k && q.i === e.i);
      if (!c) { out.missing.push(e.f); continue; }
      // both through the same path (PNG, decoded, drawn, read back): semi-transparent pixels round when drawn into a
      // canvas, so a canvas read directly is not comparable with a decoded PNG
      const px = async (url) => { const bmp = await createImageBitmap(await (await fetch(url)).blob()); const cv = document.createElement('canvas'); cv.width = e.w; cv.height = e.h; const x = cv.getContext('2d'); x.drawImage(bmp, 0, 0); return x.getImageData(0, 0, e.w, e.h).data; };
      const a = await px('data:image/png;base64,' + e.b64), b = await px(c.c.toDataURL('image/png'));
      let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
      if (n) out.differ.push(e.f + ' (' + n + ' values)'); else out.same++;
    }
    return out;
  }, manifest.map((e) => ({ k: e.k, i: e.i, f: e.f, w: e.w, h: e.h, b64: fs.readFileSync(path.join(texDir, e.f)).toString('base64') })));
  const base = g.url.replace(/\/$/, '');
  const reqs = g.requests.filter((r) => !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
  const other = reqs.filter((r) => !r.url.startsWith(base));
  const local = reqs.filter((r) => r.url.startsWith(base)).map((r) => r.url.slice(base.length).split('?')[0]);
  const optional = new Set(['/', '/tex/manifest.json', '/log']);
  const unexpected = local.filter((u) => !optional.has(u));
  note(`requests: ${[...new Set(local)].join(', ')} (${reqs.length} in all); the game file itself and, optionally, the APK extras (refused here)`);
  expect('nothing from another host (no fonts, libraries or files from the web)', other.length === 0, other.slice(0, 5).map((r) => r.url).join(' | '));
  expect('nothing from its own server but the game file and the optional extras', unexpected.length === 0, [...new Set(unexpected)].slice(0, 8).join(', '));
  expect('without the extras it boots, enters VR, draws frames, walks, shows a dialogue and starts the planting Event', play.frames > 5 && play.moved && play.dialogue && play.event, JSON.stringify(play));
  expect('without tex/ every texture is painted by the game itself (none taken from files)', play.used === 0, JSON.stringify({ used: play.used }));
  const realErrors = g.errors.filter((e) => !/Failed to load resource: the server responded with a status of 404/.test(e));
  expect('no page errors (the refused optional extras aside)', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
  note(`pre-painted textures: ${manifest.length} in tex/, ${cmp.same} identical to what the game painted`);
  expect('every pre-painted texture in tex/ is pixel for pixel what the game file paints', cmp.differ.length === 0, cmp.differ.slice(0, 6).join(', '));
  expect('every pre-painted texture in tex/ was painted by the game in this session (none stale)', cmp.missing.length === 0, cmp.missing.slice(0, 6).join(', ') + (cmp.missing.length ? '  (rebuild: node tools/prerender_textures.js)' : ''));
  await g.close();
  console.log(failures.length ? `STANDALONE TEST FAILED (${failures.length})` : 'STANDALONE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
