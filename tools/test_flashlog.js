// The flash hunt's record and its view safeties (standard tier; S15; the author's log 8d838908: three flashes marked,
// none with anything the record watched; "if the log is not capturing the information you need, please update the
// logging methods so that it does"; "put in place safeties to prevent further flashes"; "nothing came close to my face
// when the flashes occurred"). In VR (fake XR, rendering on):
//   - an XR frame with no head pose is not drawn (it would draw into the last frame's picture) and is logged, and
//     frames keep coming after it;
//   - lost tracking (the head position emulated) is logged, and so is its return;
//   - the light record (opt-in since S18; the test turns it on): a one-frame white flash staged in front of the eyes
//     shows in the mark's "rec light" line as a one-frame spike at that frame, and the line is flat without it;
//   - the renderer clears to black behind the sky sphere (S18) and the sphere covers the view: no dark cell in a quiet
//     frame's record;
//   - the light record is off unless a test turns it on, and frames keep coming with it on (its readback costs frames
//     by design, S18; the old rule that it costs none held only while both 3 s windows stalled alike);
//   - the mark's dump does not stall the frame it is pressed in (its heavy part, the near-eyes scan, runs in slices
//     between frames: the dump call itself takes under 25 ms);
//   - the mark logs the layer path's line (S29, 4.0.23): `rec frames (3 s): N, late N, calls median, tris median,
//     under 70%, same swapchain image twice`;
//   - a geometry held for a frame is named in the log (what, its colour, its size and how far from the eyes);
//   - no frame-hazard (GPU work inside a headset frame), no page errors.
//
//   node tools/test_flashlog.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, X = window.__gtXR, F = window.__fakeXR, T = window.THREE, wait = (ms) => new Promise((res) => setTimeout(res, ms)), logs = [], L0 = window.__gtLog;
    window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    await wait(2500);
    const out = { mv: !!X.mvActive };
    window.__gtLumWasOff = !X.lum.on;   // off by default since S18 (its per-frame read binds another framebuffer inside the frame)
    X.lum.on = true;   // the test turns it on
    const frames = (n) => new Promise((res) => { const r0 = X.renders; const k = () => (X.renders >= r0 + n ? res() : requestAnimationFrame(k)); requestAnimationFrame(k); });
    // 1. a frame with no head pose
    const r0 = X.renders, np0 = X.fc.nopose; F.noPose = 1; await frames(5);
    out.nopose = { counted: X.fc.nopose - np0, held: X.fc.held, logged: logs.filter((l) => /no head pose: not drawn/.test(l)).length, after: X.renders - r0 };
    // 2. tracking lost and back
    F.emulated = true; await frames(3); F.emulated = false; await frames(3);
    out.tracking = { lost: logs.filter((l) => /^tracking lost/.test(l)).length, back: logs.filter((l) => /^tracking back/.test(l)).length };
    // 3. the frame cost of the light record: frames in 3 s with it on, then off, once the rate is steady (the entry's
    // warm-ups and first draws stall a few seconds early on; two 1 s windows within 15% of each other first, up to 20 s)
    const count = async (ms) => { const a = X.renders; await wait(ms); return X.renders - a; };
    { const t0 = performance.now(); let last = await count(1000); for (;;) { const n = await count(1000); if (Math.abs(n - last) <= 0.15 * Math.max(n, last) && n > 10) break; last = n; if (performance.now() - t0 > 20000) break; } }
    out.lumDefaultOff = window.__gtLumWasOff;
    out.rateOn = await count(3000); X.lum.on = false; out.rateOff = await count(3000); X.lum.on = true;
    // 4. a staged flash: a white shell round the head for three frames (its shape drawn once before, so no hold
    //    keeps it back), then the mark's dump
    const sh = new T.Mesh(new T.SphereGeometry(1, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, side: T.BackSide }));
    sh.position.set(0, -80, 0); D.C.add(sh); await frames(4);
    const quiet = logs.length; window.__gtFR.dump(); for (let k = 0; k < 240 && !logs.slice(quiet).some((l) => /^rec light/.test(l)); k++) await wait(250);
    out.flat = (logs.slice(quiet).find((l) => /^rec light/.test(l)) || '').replace(/.*one-frame spikes or dips: /, '');
    // S18: the renderer clears to black behind the sky sphere; the sphere covers the whole view, so no 8x8 cell of a quiet frame is dark
    { const rec = await new Promise((res) => X.lum.read(res)); out.darkest = rec && rec.length ? +Math.min(...rec.slice(-24).flatMap((e) => e.v)).toFixed(3) : null; }
    sh.position.copy(D.we.headPos); await frames(3); sh.position.set(0, -80, 0); await frames(20);
    const L1 = logs.length, t0 = performance.now(); window.__gtFR.dump(); out.dumpMs = Math.round(performance.now() - t0);
    for (let k = 0; k < 240 && !(logs.slice(L1).some((l) => /^rec near eyes/.test(l)) && logs.slice(L1).some((l) => /^rec light/.test(l))); k++) await wait(250);   // the sliced scan and the light read finish over the next frames
    await wait(500);
    const after = logs.slice(L1);
    out.light = after.find((l) => /^rec light/.test(l)) || null;
    out.xr = after.find((l) => /^rec xr frames/.test(l)) || null;
    out.near = after.find((l) => /^rec near eyes/.test(l)) || null;
    out.frames = after.find((l) => /^rec frames \(3 s\)/.test(l)) || null;
    D.C.remove(sh);
    // 5. a geometry held for a frame is named: a new shape put in view
    const box = new T.Mesh(new T.BoxGeometry(0.31, 0.31, 0.31), new T.MeshBasicMaterial({ color: 0x33aa55 }));
    box.name = 'flashlog test box'; const hp = D.we.headPos; box.position.set(hp.x, hp.y - 0.4, hp.z - 1.5); D.C.add(box);
    await frames(6); D.C.remove(box);
    out.held = logs.filter((l) => /^geometry held for one frame/.test(l)).slice(-3);
    const H = window.__gtFrameHaz; out.haz = H ? H.n : null; out.hazFirst = H ? H.first.slice(0, 3) : [];
    return out;
  });
  note(JSON.stringify(r).slice(0, 1500));
  expect('a frame with no head pose is not drawn, is logged, and frames keep coming', r.nopose.counted >= 1 && r.nopose.held >= 1 && r.nopose.logged >= 1 && r.nopose.after >= 4, JSON.stringify(r.nopose));
  expect('lost tracking and its return are logged', r.tracking.lost >= 1 && r.tracking.back >= 1, JSON.stringify(r.tracking));
  // the record reads the eye buffer every frame (a render-target switch and a forced resolve: S18 made it opt-in and off on the headset), so it costs frames by design; what must hold is that it is off unless asked for and that frames keep coming with it on
  expect('the light record is off unless a test turns it on (S18), and frames keep coming with it on (its readback costs frames by design)', r.lumDefaultOff === true && r.rateOn > 10 && r.rateOff > 10, `${r.rateOn} frames on, ${r.rateOff} off, in 3 s; off by default: ${r.lumDefaultOff}`);
  expect('without a flash the light line shows no spike', r.flat === 'none', r.flat);
  expect('nothing but the sky shows behind the scene: no dark cell in a quiet frame (the clear was black since S18; since S30 the colour is not cleared at all)', r.darkest !== null && r.darkest > 0.04, String(r.darkest) + ' (a black cell would read 0; dark objects read about 0.12)');
  expect('the staged one-frame flash shows in the mark\'s light line as a spike', !!r.light && /spikes or dips: \+\d+/.test(r.light), (r.light || 'no line').slice(-200));
  expect('the mark\'s dump does not stall its frame (under 25 ms; the near-eyes scan runs in slices)', r.dumpMs < 25 && !!r.near, `${r.dumpMs} ms; ${r.near ? 'near-eyes line logged' : 'no near-eyes line'}`);
  expect('the mark logs the XR frame health line', !!r.xr && /no head pose \d+/.test(r.xr), r.xr || 'none');
  expect('S29: the mark logs the layer path line: frames, late, calls and triangles medians, repeated swapchain images', !!r.frames && /^rec frames \(3 s\): \d+, late \d+/.test(r.frames) && /calls median \d+/.test(r.frames) && /tris median \d+k/.test(r.frames) && /same swapchain image twice: \d+/.test(r.frames), r.frames || 'none');
  expect('a geometry held for a frame is named in the log', r.held.some((l) => /flashlog test box #33aa55 r0\.\d+m at \d/.test(l)), r.held.join(' | ').slice(0, 300));
  expect('no GPU work inside a headset frame (frame-hazard watch)', r.haz === 0 || r.haz === null, JSON.stringify(r.hazFirst).slice(0, 300));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `FLASH LOG TEST FAILED (${failures.length})` : 'FLASH LOG TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
