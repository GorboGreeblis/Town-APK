// The final build (standard tier for the Store build; 4.0.63; the author: "From the very last build: debug and
// logging features must be removed"). tools/final.html (tools/final_build.js: the game without its debug code) is
// served exactly as it is, with no test hook (no window.__dbg: the harness's `hook: false`), and played in VR:
//   - none of the debug code is there at run time: no GT_DEBUG, no __gtLog, no flight recorder (__gtFR), no light
//     record, census or frame-health counters on the loader (__gtXR), no __dbg;
//   - the version shown (the gate's corner) is tools/game_version.txt, and every version the file carries is it;
//   - it boots, the VR session presents and frames keep coming for about 20 s with both controllers in (the
//     sticks moved, the right B pressed, the debug build's flight-recorder mark), with no page error;
//   - the sound plays while the session presents with input in (its context running, read through an AudioContext
//     wrapper put in before the game's first line), and the session ending holds it (the context suspended);
//   - it never asks for /log (the APK's server's diagnostics endpoint) and asks for nothing but the page and the
//     pre-painted textures, from its own server;
//   - it writes nothing to localStorage (nor sessionStorage).
//
//   node tools/test_final.js [file]       default: tools/final.html (write it with node tools/final_build.js)
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const fs = require('fs');
const path = require('path');
const { boot, reporter, root } = require('./lib/harness');
const file = path.resolve(process.argv[2] || path.join(root, 'tools/final.html'));
if (!fs.existsSync(file)) { console.log(`no ${path.relative(root, file)}: run node tools/final_build.js first`); process.exit(2); }
const probe = () => {
  // the sound's context, as the game makes it
  const Ctx = window.AudioContext;
  if (Ctx) window.AudioContext = class extends Ctx { constructor(...a) { super(...a); window.__finCtx = this; } };
  // every write to the page's storage
  window.__finStore = [];
  try {
    const P = Storage.prototype;
    for (const k of ['setItem', 'removeItem', 'clear']) { const f = P[k]; P[k] = function () { window.__finStore.push(k + ' ' + String(arguments[0])); return f.apply(this, arguments); }; }
  } catch (e) {}
};

(async () => {
  const { expect, note, failures } = reporter();
  const html = fs.readFileSync(file, 'utf8');
  const version = fs.readFileSync(path.join(root, 'tools/game_version.txt'), 'utf8').trim();
  note(`${path.relative(root, file)}: ${Buffer.byteLength(html)} bytes; the game's version ${version} (tools/game_version.txt)`);
  // the four places build.sh stamps in the game file (the final build's minification may join the gate's two into one)
  const shown = html.match(/v\d+\.\d+(?:\.\d+)?(?=")/g) || [];
  expect(`every version the file shows is v${version} (landing text, gate corner, VR loading box)`, shown.length >= 3 && shown.every((v) => v === 'v' + version), shown.join(' '));
  global.__pageLog = [];
  const g = await boot({ file, vr: true, hook: false, fastSim: false, initScripts: [probe] });
  const page = g.page;
  const absent = await page.evaluate(() => ({
    GT_DEBUG: typeof GT_DEBUG !== 'undefined', __gtLog: 'undefined' !== typeof window.__gtLog, __gtFR: 'undefined' !== typeof window.__gtFR,
    __dbg: 'undefined' !== typeof window.__dbg, __gcPf: !!window.__gcPf,
    loader: ['lum', 'lumProbe', 'nat', 'census', 'fc', 'frameCheck', 'recTimeline', 'recDisplay', 'mvStats'].filter((k) => window.__gtXR && window.__gtXR[k] !== undefined),
    gateVer: (document.getElementById('gateVer') || {}).textContent || '',
  }));
  note(JSON.stringify(absent));
  expect('no GT_DEBUG, __gtLog, __gtFR, __dbg or performance log at run time', !absent.GT_DEBUG && !absent.__gtLog && !absent.__gtFR && !absent.__dbg && !absent.__gcPf, JSON.stringify(absent));
  expect('the loader has no light record, census, frame-health counters, display timeline or multiview statistics', absent.loader.length === 0, absent.loader.join(', '));
  expect(`the version shown is v${version}`, absent.gateVer === 'v' + version, absent.gateVer);
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms)), X = window.__fakeXR;
    const ctl = (hand, ax = [0, 0, 0, 0], b = -1) => ({ handedness: hand, axes: ax, buttons: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ pressed: i === b, value: i === b ? 1 : 0 })) });
    const st = () => ({ held: !!window.__gcAudHold, ctx: window.__finCtx ? window.__finCtx.state : 'none' });
    const out = { frames: [], presenting: !!(X.sessions.length && !X.sessions.at(-1).ended) };
    X.setInputs([ctl('left'), ctl('right')]); await wait(800);
    out.playing = st();
    // about 20 s of play: walk, turn, the right B (the debug build's recorder mark) pressed and let go
    const steps = [[ctl('left', [0, 0, 0, -1]), ctl('right')], [ctl('left'), ctl('right', [0, 0, 1, 0])], [ctl('left'), ctl('right', [0, 0, 0, 0], 5)], [ctl('left'), ctl('right')]];
    for (let i = 0; i < 4; i++) {
      const f0 = X.frames; X.setInputs(steps[i]); await wait(5000); out.frames.push(X.frames - f0);
    }
    out.stillPlaying = st();
    await X.sessions.at(-1).end(); await wait(600); out.ended = st();
    await wait(2000); out.later = st();
    out.store = window.__finStore.slice(0, 8); out.storeN = window.__finStore.length;
    try { out.local = localStorage.length; out.session = sessionStorage.length; } catch (e) { out.local = out.session = 'error ' + e; }
    return out;
  });
  note(JSON.stringify(r));
  expect('the VR session presents', r.presenting);
  expect('frames keep coming for 20 s of play (every 5 s)', r.frames.length === 4 && r.frames.every((n) => n > 0), r.frames.join(', '));
  expect('with a session presenting and input in, the sound plays (context running)', !r.playing.held && r.playing.ctx === 'running' && r.stillPlaying.ctx === 'running', JSON.stringify([r.playing, r.stillPlaying]));
  expect('the session ending holds the sound (context suspended) and it stays held', r.ended.held && r.ended.ctx === 'suspended' && r.later.ctx === 'suspended', JSON.stringify([r.ended, r.later]));
  expect('nothing written to localStorage or sessionStorage', r.storeN === 0 && r.local === 0 && r.session === 0, JSON.stringify({ writes: r.store, local: r.local, session: r.session }));
  const host = new URL(g.url).host, reqs = g.requests.map((q) => q.url);
  const logReqs = reqs.filter((u) => /\/log(\?|$)/.test(new URL(u).pathname + new URL(u).search) || new URL(u).pathname === '/log');
  const other = reqs.filter((u) => { const x = new URL(u); return !/^(data|blob):/.test(u) && (x.host !== host || !(x.pathname === '/' || x.pathname.startsWith('/tex/'))); });
  note(`${reqs.length} requests (${reqs.filter((u) => /\/tex\//.test(u)).length} textures)`);
  expect('no request to /log', logReqs.length === 0 && global.__pageLog.length === 0, logReqs.slice(0, 3).join(' '));
  expect('no request but the page and its textures, from its own server', other.length === 0, other.slice(0, 3).join(' '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `FINAL BUILD TEST FAILED (${failures.length})` : 'FINAL BUILD TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
