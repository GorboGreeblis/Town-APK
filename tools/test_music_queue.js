// The Event's song builds each bar's notes over the frames before the bar, not all in one frame (standard tier; P41,
// 4.0.51; the author's 4.0.50 run ac3e97d5: in the second and third Events the Event's update took 9-16 ms once every
// 2.72 s, one bar of the Event's song (the Horn song), and every one of those frames was late). The song schedules a bar 0.6 s ahead of
// time; building every oscillator, filter and gain of the bar took one frame. The notes are now queued in the order the
// bar asks for them and built a share each frame, all of them by 0.25 s before the bar starts; each is scheduled at the
// same absolute times, so the song sounds the same. Here, the song played twice from its start in one session, the
// queue on and then off:
//   - the same notes, in the same order, with the same values and the same times within their bar (to 1e-9 s);
//   - from the second bar (the first is asked for 0.08 s ahead either way), every note built at least 0.2 s before
//     it starts, and no frame builds a whole bar: the most notes built in one frame (one audio clock reading) at most
//     half the off run's;
//   - King Dino's drums (his dance floor and the dance battles; B104, 4.0.51): scheduled up to 3 s ahead, each bar's
//     hits used to be built in one frame (about 95 audio nodes; 167 on walking into earshot); each hit is now built
//     0.3-1.5 s before it plays, at most a few a frame beyond those due within 0.3 s. In earshot, the queue on and then
//     off: every scheduled hit built exactly once with its own time and values, at least 0.2 s before it plays, and the
//     most audio nodes made in one frame at most a third of the off run's;
//   - no page errors.
//
//   node tools/test_music_queue.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, X = window.__fakeXR, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    await wait(2500);
    if (!window.__gcMQrec || !D.ee) return { error: 'no recorder or no song' };
    const play = async (on) => {
      window.__gcMQ = on; const rec = []; window.__gcMQrec(rec);
      const f0 = X.frames;
      // the song's update runs once a frame: the notes each call builds (index ranges into rec)
      const calls = [], up = D.ee.update; D.ee.update = function () { const i = rec.length; try { return up.apply(this, arguments); } finally { calls.push([i, rec.length]); } };
      D.ee.start(); const t0 = performance.now();
      // twelve bars or 40 s
      while (performance.now() - t0 < 40000 && new Set(rec.map((n) => n[2])).size < 12) await wait(200);
      D.ee.stop(); await wait(1500); window.__gcMQrec(null); D.ee.update = up;
      return { rec, calls, frames: X.frames - f0 };
    };
    const a = await play(true), b = await play(false);
    window.__gcMQ = true;
    // the time argument of each note: Se's second, the others' first
    const ti = (n) => (n[0] === 'Se' ? 1 : 0);
    const norm = (rec) => { const bars = [...new Set(rec.map((n) => n[2]))]; return rec.map((n) => { const args = n[1].slice(); args[ti(n)] = args[ti(n)] - n[2]; return { f: n[0], bar: bars.indexOf(n[2]), args }; }); };
    const A = norm(a.rec), B = norm(b.rec);
    const n = Math.min(A.length, B.length); let diff = null;
    // compare the bars both runs completed
    const bars = Math.min(Math.max(-1, ...A.map((x) => x.bar)), Math.max(-1, ...B.map((x) => x.bar)));
    const Ab = A.filter((x) => x.bar < bars), Bb = B.filter((x) => x.bar < bars);
    if (Ab.length !== Bb.length) diff = `notes ${Ab.length} vs ${Bb.length}`;
    else for (let i = 0; i < Ab.length && !diff; i++) { const x = Ab[i], y = Bb[i]; if (x.f !== y.f || x.bar !== y.bar || x.args.length !== y.args.length) diff = `note ${i}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`; else for (let k = 0; k < x.args.length; k++) { const u = x.args[k], v = y.args[k]; if (typeof u === 'number' ? Math.abs(u - v) > 1e-9 : JSON.stringify(u) !== JSON.stringify(v)) { diff = `note ${i} arg ${k}: ${u} vs ${v} (${x.f})`; break; } } }
    // each note built before it plays (queue on), from the second bar (the song's first bar is asked for 0.08 s
    // ahead, queue or not): the build time against its start; and the notes built in one frame (one call of the
    // song's update), from the second bar
    const bar1 = [...new Set(a.rec.map((n) => n[2]))][1], bar1b = [...new Set(b.rec.map((n) => n[2]))][1];
    let late = 0, worst = 1e9; for (const x of a.rec) { if (x[2] < bar1) continue; const start = x[1][ti(x)]; const lead = start - x[3]; worst = Math.min(worst, lead); if (lead < 0.2) late++; }
    const perFrame = (run, from) => { let m = 0; for (const [i, j] of run.calls) { let c = 0; for (let k = i; k < j; k++) if (run.rec[k][2] >= from) c++; m = Math.max(m, c); } return m; };
    a.maxPerFrame = perFrame(a, bar1); b.maxPerFrame = perFrame(b, bar1b);
    // King Dino's drums (his dance floor and the dance battles, B104): scheduled up to 3 s ahead; each hit now built
    // 0.3-1.5 s before it plays, a few a frame. In earshot with the queue on and then off: every scheduled hit built
    // exactly once with its own time and values, before it plays; the audio nodes made in one frame against the off run
    const P = BaseAudioContext.prototype, made = []; const orig = {};
    for (const k of Object.getOwnPropertyNames(P).filter((k) => /^create/.test(k))) { orig[k] = P[k]; P[k] = function () { made.push(X.frames); return orig[k].apply(this, arguments); }; }
    const near = async (on) => {
      window.__gcJQ = on; D.At.position.x = 80; D.At.position.z = 80; await wait(2500);
      const rec = [], sch = []; window.__gcJQrec(rec, sch); made.length = 0;
      const hold = setInterval(() => { D.At.position.x = -30; D.At.position.z = 19; }, 100); await wait(12000); clearInterval(hold);
      window.__gcJQrec(null, null);
      const per = {}; for (const f of made) per[f] = (per[f] || 0) + 1;
      return { rec, sch, maxNodes: Math.max(0, ...Object.values(per)), nodes: made.length };
    };
    const jOn = await near(true), jOff = await near(false);
    for (const k in orig) P[k] = orig[k];
    window.__gcJQ = true; D.At.position.x = 80; D.At.position.z = 80;
    const key = (h) => h[0].toFixed(9) + '|' + h[1] + '|' + h[2];
    const tEnd = Math.max(0, ...jOn.rec.map((h) => h[3]));
    const want = jOn.sch.filter((h) => h[0] < tEnd), got = new Map(); for (const h of jOn.rec) got.set(key(h), (got.get(key(h)) || 0) + 1);
    let missing = 0, twice = 0; for (const h of want) { const c = got.get(key(h)) || 0; if (!c) missing++; if (c > 1) twice++; }
    const extra = jOn.rec.filter((h) => !jOn.sch.some((x) => key(x) === key(h))).length;
    // a hit counts as late when built less than 0.2 s before it plays, or less than it was scheduled ahead (the first
    // beat on walking into earshot is scheduled 0.06 s ahead, queue or not)
    const at = new Map(jOn.sch.map((x) => [key(x), x[3]]));
    let jLate = 0, jWorst = 1e9; for (const h of jOn.rec) { const lead = h[0] - h[3], ahead = h[0] - (at.has(key(h)) ? at.get(key(h)) : h[3]); jWorst = Math.min(jWorst, lead); if (lead < Math.min(0.2, ahead) - 0.001) jLate++; }
    const drums = { scheduled: want.length, built: jOn.rec.length, missing, twice, extra, late: jLate, worstLead: +jWorst.toFixed(3), maxOn: jOn.maxNodes, maxOff: jOff.maxNodes, offBuilt: jOff.rec.length };
    return { notesOn: a.rec.length, notesOff: b.rec.length, bars, compared: Ab.length, diff, late, worstLead: +worst.toFixed(3), maxOn: a.maxPerFrame, maxOff: b.maxPerFrame, n, drums };
  });
  note(JSON.stringify(r));
  expect('the song played (notes recorded with the queue on and off)', !r.error && r.notesOn > 50 && r.notesOff > 50 && r.bars >= 4, JSON.stringify(r).slice(0, 300));
  expect('the same notes in the same order, the same values and times within their bar', !r.error && !r.diff && r.compared > 50, r.diff || `${r.compared} notes in ${r.bars} bars`);
  expect('from the second bar, every queued note built at least 0.2 s before it plays', !r.error && r.late === 0, `${r.late} late; the shortest lead ${r.worstLead} s`);
  expect('no frame builds a whole bar (from the second bar, the most notes built in a frame at most half the off run\'s)', !r.error && r.maxOn * 2 <= r.maxOff, `on ${r.maxOn}, off ${r.maxOff}`);
  const dr = r.drums || {};
  expect('King Dino\'s drums: every scheduled hit built exactly once with its own time and values (B104)', !r.error && dr.scheduled > 20 && dr.missing === 0 && dr.twice === 0 && dr.extra === 0, JSON.stringify(dr));
  expect('King Dino\'s drums: every hit built at least 0.2 s before it plays (or as far ahead as it was scheduled)', !r.error && dr.late === 0, `${dr.late} late; the shortest lead ${dr.worstLead} s`);
  expect('King Dino\'s drums: the most audio nodes made in one frame at most a third of the off run\'s', !r.error && dr.maxOn * 3 <= dr.maxOff, `on ${dr.maxOn}, off ${dr.maxOff}`);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `MUSIC QUEUE TEST FAILED (${failures.length})` : 'MUSIC QUEUE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
