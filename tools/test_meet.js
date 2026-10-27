// Mama Gorbo and Gorbo's meetings (standard tier). Twenty to forty seconds into the game, and again 20-40 s after
// each meeting, the two walk to a pair of spots beside each other (if they are more than 16 m apart, Mama walks over
// first), face each other and take turns: a goo arc with a "blorp" from one, a pink heart from the other, eight beats
// in all, then each goes back to roaming. A meeting is called off (and tried again 40 s later) if either is busy, on
// a visit, in a vignette, or the planting Event is on.
//
//   node tools/test_meet.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const page = g.page;
  const r = await page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = { meetings: [] };
    const A = D.It.byId.p_mamagorbo, B = D.It.byId.gorbo;
    out.names = [A && A.def.name, B && B.def.name];
    if (!A || !B) return out;
    // count the goo arcs and hearts the meeting makes, with the game time of each
    const arcs = [], hearts = [];
    const ga = D.Nt.gooArc; D.Nt.gooArc = function () { arcs.push(+D.Re.t.toFixed(2)); return ga.apply(this, arguments); };
    const ab = D.Ut.above; D.Ut.above = function (h, s) { if (s === '♥' && (h === A || h === B)) hearts.push(+D.Re.t.toFixed(2)); return ab.apply(this, arguments); };
    const gs = () => D.Re.t;
    const until = async (cond, s) => { const g0 = gs(), w0 = performance.now(); while (!cond() && gs() - g0 < s && performance.now() - w0 < s * 6000) await wait(50); return cond(); };
    // keep the player out of the way, so neither stops to greet
    D.At.position.set(-36, D.At.position.y, -20);
    // the first meeting is due 20-40 s in; record when the two start for their spots
    for (let k = 0; k < 2; k++) {
      const m = {};
      const g0 = gs();
      m.started = await until(() => A.meeting && B.meeting, 80); m.startAfter = +(gs() - g0).toFixed(1); m.startT = +gs().toFixed(1);
      if (!m.started) { out.meetings.push(m); break; }
      const a0 = arcs.length, h0 = hearts.length;
      m.arrived = await until(() => A.hearts > 0 || arcs.length > a0, 70);
      const pa = A.group.position, pb = B.group.position;
      m.apart = +Math.hypot(pa.x - pb.x, pa.z - pb.z).toFixed(2);
      const face = (h, o) => { const want = Math.atan2(o.group.position.x - h.group.position.x, o.group.position.z - h.group.position.z); let d = (h.group.rotation.y - want) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return +Math.abs(d).toFixed(2); };
      await wait(400); m.faceA = face(A, B); m.faceB = face(B, A);
      m.ended = await until(() => !A.meeting && !B.meeting, 30); m.endAt = +gs().toFixed(1);
      m.arcs = arcs.slice(a0); m.hearts = hearts.slice(h0);
      out.meetings.push(m);
    }
    // the Event calls a meeting off: start one, then the Event
    D.JGP.meetAt(gs());
    const st = await until(() => A.meeting && B.meeting, 40);
    out.offByEvent = { started: st };
    if (st) {
      D.me.active = true; await until(() => !A.meeting && !B.meeting, 5); out.offByEvent.called = !A.meeting && !B.meeting; D.me.active = false;
    }
    D.Nt.gooArc = ga; D.Ut.above = ab;
    return out;
  });
  note('pair: ' + JSON.stringify(r.names));
  r.meetings.forEach((m, i) => note(`meeting ${i + 1}: ${JSON.stringify(m)}`));
  const [m1, m2] = r.meetings;
  expect('the two are Mama Gorbo and Gorbo', r.names && r.names.every(Boolean), JSON.stringify(r.names));
  expect('the first meeting starts 20-40 s into the game (game clock, plus a walk of up to 30 s)', m1 && m1.started && m1.startT <= 75, JSON.stringify(m1));
  expect('the second starts 20-40 s after the first ends (plus the walk)', m2 && m2.started && m2.startAfter >= 19 && m2.startAfter <= 45, JSON.stringify(m2 && m2.startAfter));
  const ok = (m) => m && m.arrived && m.ended && m.arcs.length === 4 && m.hearts.length === 4;
  expect('at each meeting the two take turns: four goo arcs and four hearts, then go back to roaming', ok(m1) && ok(m2), JSON.stringify(r.meetings.map((m) => [m.arcs.length, m.hearts.length, m.ended])));
  const beats = (m) => { const t = [...m.arcs, ...m.hearts].sort((a, b) => a - b); return t.slice(1).map((x, i) => +(x - t[i]).toFixed(2)); };
  expect('the beats come 0.6-0.9 s apart (goo arc 0.9 s, heart 0.6 s)', [m1, m2].every((m) => ok(m) && beats(m).every((d) => d >= 0.55 && d <= 1.3)), JSON.stringify([m1, m2].map((m) => m && m.arcs && beats(m))));
  expect('they stand beside each other (centres 2-4 m apart) and face each other', [m1, m2].every((m) => m && m.apart >= 1.5 && m.apart <= 4.5 && m.faceA < 0.5 && m.faceB < 0.5), JSON.stringify([m1, m2].map((m) => m && [m.apart, m.faceA, m.faceB])));
  expect('the planting Event calls a meeting off', r.offByEvent && r.offByEvent.started && r.offByEvent.called, JSON.stringify(r.offByEvent));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `MEET TEST FAILED (${failures.length})` : 'MEET TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
