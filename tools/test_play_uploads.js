// Nothing reaches the GPU for the first time during the Speech or the Event (standard tier; 4.0.46, S42; the author's
// logs 284613aa and 971128fc on 4.0.43 and 4.0.45: "geometry held for one frame: ... mesh of 148 vertices #ffffff",
// and 4 geometries with 21 buffers when an Event with Snacks started). Two shapes were made in play and went up between
// frames (the hold, safe, but against the rule that nothing is built or uploaded mid-play):
//   - the glue bottle's band in the Speech (a 24-sided cylinder carrying three materials, the GLUE label and two reds):
//     the multi-material merger (`__gtMM`) builds a copy with one draw group per material, every 120 frames from the
//     scene; the load-time warm-up put the Speech's props in the scene and took them out before the merger looked,
//     so its copy was first built, and uploaded, in the Speech. The warm-ups now run the merger first
//     (`__gtMM.scan`), so the copy is built and uploaded at load and found in its cache in play;
//   - the pizza boxes' draw batches in the Event (4 of 312 vertices): the batcher merged the boxes once they had
//     faded in, building new batch shapes each Event; the load-time warm-up had built the same 4 and thrown them away
//     ("batches of warm-up objects dropped while loading: 4"). A batch shape is now kept by its contents
//     (`__gcBG`, released rather than disposed when its batch goes) and reused for the same parts.
// Checked here, with the drawing on so that every first draw would upload:
//   - the Speech (Sparkakus, three artifacts): no geometry made, uploaded or held, the renderer's geometry count
//     unchanged, the glue band drawn from its load-time merged copy;
//   - an Event with the Stone, the Seeds and the Snacks, through the pizza boxes fading in and being batched: no
//     geometry uploaded or held, no GL buffer made; the batches drawn from kept shapes;
//   - B101 (4.0.48; the author's run 764bd9d7: a second Event 3 s after the first built 4 batch shapes): every batch
//     shape the warm-up kept has a spare copy from load; a second Event started right after the first, the first
//     copies marked taken, uploads nothing (headless the second Event's boxes are not batched within the window, so
//     this part does not reproduce the author's sequence; the spare check does catch a build without spares);
//   - no page errors.
//
//   node tools/test_play_uploads.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, renderEvery: 3 });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message));
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, O = D.O, Kt = D.Kt, st = D.st, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 300);
    const logs = [], L0 = window.__gtLog; window.__gtLog = (s) => { logs.push(String(s)); try { L0 && L0(s); } catch (e) {} };
    const gl = O.getContext(); let bufs = 0; const cb = gl.createBuffer.bind(gl); gl.createBuffer = function () { bufs++; return cb(); };
    let ups = 0; const u0 = O.gcObjUpdate.bind(O); O.gcObjUpdate = function (o) { ups++; return u0(o); };
    const flat = () => (window.__gcBG ? [...window.__gcBG.values()].flatMap((e) => (Array.isArray(e) ? e : [e])) : []);
    const lists = () => (window.__gcBG ? [...window.__gcBG.values()].map((v) => (Array.isArray(v) ? v : [v])) : []);
    const out = { keptAtLoad: window.__gcBG ? flat().filter((e) => !e.n).length : -1, spareless: lists().filter((l) => l.every((e) => !e.n) && l.length < 2).length };
    await wait(1500);
    // the Speech
    let t0 = performance.now(); while (!st.atHome() && performance.now() - t0 < 60000) await wait(200);
    const z = D.z.list.find((z) => z.name === 'stump' || z.id === 'stump'); D.At.position.set((z.x || 0) + 1.6, D.At.position.y, (z.z || 0) + 1.6); await wait(800);
    let m0 = O.info.memory.geometries, b0 = bufs, p0 = ups, l0 = logs.length;
    Kt.artifacts = 3; D.LIB.talk(); let band = null;
    t0 = performance.now();
    while (performance.now() - t0 < 150000) {   // the Speech runs on the game's clock, slower than real time headless
      await wait(300);
      D.C.traverse((o) => { if (!band && o.isMesh && Array.isArray(o.material) && o.material.length === 3 && o.geometry.attributes.position && o.geometry.attributes.position.count === 148) band = o; });
      if (band && !out.bandAt) { out.bandAt = performance.now(); out.bandF = window.__fakeXR.frames; }
      // the band drawn until its merged copy is in (the merger looks every 120 drawn frames, and this test draws one frame
      // in three: B138, the 4.0.65 pass, gave up at 150 frames before the merge on the final build), at most 60 s
      if (out.bandAt && ((band && band.geometry.__mmOf && performance.now() - out.bandAt > 6000) || performance.now() - out.bandAt > 60000)) break;
    }
    out.speech = { bandSeen: !!band, geos: O.info.memory.geometries - m0, bufs: bufs - b0, uploads: ups - p0, held: logs.slice(l0).filter((l) => /held for one frame/.test(l)), bandMerged: !!(band && band.geometry.__mmOf) };
    // an Event with the Snacks: the pizza boxes fade in and are batched
    m0 = O.info.memory.geometries; b0 = bufs; p0 = ups; l0 = logs.length;
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(400);
    const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    await wait(25000);
    const used = flat().filter((e) => e.n > 0).length;
    out.event = { started: D.me.active, geos: O.info.memory.geometries - m0, bufs: bufs - b0, uploads: ups - p0, held: logs.slice(l0).filter((l) => /held for one frame/.test(l)), keptInUse: used };
    // B101 (the author's 4.0.47 run 764bd9d7: a second Event 3 s after the first built 4 geometries, 21 buffers): the
    // Event ends (its length cut short) and a second one starts at once, the first's pizza boxes still on the ground
    const F = D.t.finale, dur = F.durationS; F.durationS = 1;
    // up to 120 s: an Event's end waits up to 60 s past its time for a busy townsperson (S38), and the Speech above can
    // still be running (B138: 60 s here was right at that limit)
    t0 = performance.now(); while (D.me.active && performance.now() - t0 < 120000) await wait(100);
    F.durationS = dur; const ended = !D.me.active;
    // the first Event's boxes still out (as in the author's run, 3 s apart): the first copy of every kept shape no
    // batch uses is marked taken, so the second Event must use the spares (without them it builds in play)
    const taken = []; if (window.__gcBG) for (const v of window.__gcBG.values()) { const l = Array.isArray(v) ? v : [v]; if (l.length && l.every((e) => !e.n)) { l[0].n++; taken.push(l[0]); } }
    m0 = O.info.memory.geometries; b0 = bufs; p0 = ups; l0 = logs.length;
    D.oe.open(); await wait(400);
    const y2 = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y2) y2.onClick();
    t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await wait(100);
    await wait(25000);
    taken.forEach((e) => e.n--);
    out.second = { ended, taken: taken.length, started: D.me.active, geos: O.info.memory.geometries - m0, bufs: bufs - b0, uploads: ups - p0, held: logs.slice(l0).filter((l) => /held for one frame/.test(l)), spares: logs.find((l) => /batch shapes kept for a second Event/.test(l)) || null };
    return out;
  });
  note(JSON.stringify(r).slice(0, 700));
  expect('the warm-up keeps the batch shapes it built (the pizza boxes\' among them)', r.keptAtLoad >= 4, String(r.keptAtLoad));
  expect('the Speech: no geometry made, uploaded or held; the glue band drawn from its load-time merged copy', r.speech.bandSeen && r.speech.geos === 0 && r.speech.bufs === 0 && r.speech.uploads === 0 && r.speech.held.length === 0 && r.speech.bandMerged, JSON.stringify(r.speech));
  expect('an Event with the Snacks: no geometry uploaded or held, no GL buffer made; the pizza batches drawn from kept shapes', r.event.started && r.event.geos === 0 && r.event.bufs === 0 && r.event.uploads === 0 && r.event.held.length === 0 && r.event.keptInUse >= 1, JSON.stringify(r.event));
  expect('every batch shape the warm-up kept and no batch uses has a spare copy from load (B101)', r.keptAtLoad >= 2 && r.spareless === 0, JSON.stringify({ kept: r.keptAtLoad, withoutSpare: r.spareless }));
  expect('a second Event right after the first: no geometry uploaded or held, no GL buffer made (the spare batch shapes, B101)', r.second.ended && r.second.started && r.second.geos === 0 && r.second.bufs === 0 && r.second.uploads === 0 && r.second.held.length === 0, JSON.stringify(r.second));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `PLAY UPLOADS TEST FAILED (${failures.length})` : 'PLAY UPLOADS TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
