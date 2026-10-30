// Far detail and the batcher (standard tier).
//
// Far detail: the kiosks with fine parts have two models, the full one and a coarse one; four times a second the
// game shows the full one while the camera is within 62 m of it, the coarse one beyond 66 m, and keeps whichever it
// had in between (no flicker at the line). Walking the player out from 40 m to 84 m and back, this checks after every
// tick that exactly one of the two shows, the right one outside the band, and that inside the band it never swaps.
//
// The batcher (gcEB): many small static parts are drawn as one mesh per material, each part's world matrix and colour
// (and, in the release, its shininess and specular colour: five vec4 a part instead of four) written into a uniform
// array every frame (a part that is hidden, or whose material, geometry or handedness changed,
// is dropped back to the normal draw). After every rendered frame of 20 s of play this checks for every part: a
// batched part (state 1) has exactly its object's world matrix rows, colour (and shininess, specular) in the array; a dropped one has zeros;
// no number is NaN or infinite; and no part is drawn twice (batched and on the normal layer at once).
//
//   node tools/test_lod.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, renderEvery: 3 });
  const page = g.page;
  await page.waitForTimeout(2000);
  const bat = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, EB = D.gcEB, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = { meshes: EB.list.length, parts: 0, frames: 0, on: 0, off: 0, badRows: 0, badZero: 0, nonFinite: 0, twice: 0, examples: [] };
    if (!EB.list.length) return out;
    const r0 = O.render;
    O.render = function () {
      const res = r0.apply(this, arguments);
      out.frames++;
      for (const E of EB.list) {
        const R = E.R && (E.R.value || E.R);
        for (const p of E.P) {
          const S = p.k ? p.k.length + 1 : 16, M = S * p.slot, f = p.o.matrixWorld.elements;   // 16 floats a part, 20 with shininess/specular
          for (let i = 0; i < S; i++) if (!Number.isFinite(R[M + i])) { out.nonFinite++; break; }
          if (p.st === 1) {
            out.on++;
            const want = [f[0], f[4], f[8], f[12], f[1], f[5], f[9], f[13], f[2], f[6], f[10], f[14]];
            let bad = false; for (let i = 0; i < 12; i++) if (Math.abs(R[M + i] - want[i]) > 1e-6 * Math.max(1, Math.abs(want[i]))) bad = true;
            const c = p.o.material.color; if (c && (Math.abs(R[M + 12] - c.r) > 1e-6 || Math.abs(R[M + 13] - c.g) > 1e-6 || Math.abs(R[M + 14] - c.b) > 1e-6)) bad = true;
            if (S === 20) {
              const mt = p.o.material, sp = mt.specular, sh = mt.shininess === undefined ? 1 : Math.max(mt.shininess, 1e-4);
              const w2 = [sh, sp ? sp.r : 0, sp ? sp.g : 0, sp ? sp.b : 0];
              for (let i = 0; i < 4; i++) if (Math.abs(R[M + 15 + i] - w2[i]) > 1e-5 * Math.max(1, Math.abs(w2[i]))) bad = true;
            }
            if (bad) { out.badRows++; if (out.examples.length < 3) out.examples.push((p.o.name || p.o.type) + ' rows differ'); }
            if (p.o.layers.mask !== (1 << 31)) { out.twice++; if (out.examples.length < 3) out.examples.push((p.o.name || p.o.type) + ' batched but on layer mask ' + p.o.layers.mask); }
          } else {
            out.off++;
            if (p.st === 0) { for (let i = 0; i < S; i++) if (R[M + i] !== 0) { out.badZero++; if (out.examples.length < 3) out.examples.push((p.o.name || p.o.type) + ' dropped but not zeroed'); break; } }
          }
        }
      }
      return res;
    };
    out.parts = EB.list.reduce((a, E) => a + E.P.length, 0);
    // 20 s of play with the townsfolk walking about (their batched parts move every frame)
    const t0 = performance.now(); while (performance.now() - t0 < 20000) await wait(200);
    O.render = r0;
    return out;
  });
  note(`batcher: ${bat.meshes} batch meshes, ${bat.parts} parts, ${bat.frames} frames checked; part-frames batched ${bat.on}, dropped ${bat.off}` + (bat.examples.length ? '; ' + bat.examples.join(' | ') : ''));
  expect('the batcher is on and frames were checked', bat.meshes > 0 && bat.frames >= 30, JSON.stringify({ meshes: bat.meshes, frames: bat.frames }));
  expect('every batched part has exactly its object\'s world matrix, colour, shininess and specular in the array, every frame', bat.badRows === 0, String(bat.badRows));
  expect('every dropped part is zeroed in the array (so the batch mesh does not draw it)', bat.badZero === 0, String(bat.badZero));
  expect('no NaN or infinite number in any batch array', bat.nonFinite === 0, String(bat.nonFinite));
  expect('no part is drawn twice (batched and on the normal layer)', bat.twice === 0, String(bat.twice));

  const lod = await page.evaluate(async () => {
    const D = window.__dbg, FD = D.JGP.farDetail, At = D.At, B = D.B, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    if (!FD || !FD.list.length) return { items: 0 };
    const out = { items: FD.list.length, ticks: 0, both: 0, none: 0, wrongNear: 0, wrongFar: 0, flips: 0, swapsOut: [], swapsIn: [], examples: [] };
    const it = FD.list.find((x) => x.x !== undefined) || FD.list[0];
    await wait(600);
    const cx = it.x, cz = it.z;
    // walk out along the line away from the park's middle, and back
    const ux = cx / (Math.hypot(cx, cz) || 1), uz = cz / (Math.hypot(cx, cz) || 1);
    const dist = () => { const e = B.matrixWorld.elements; return Math.hypot(e[12] - it.x, e[13] - it.y, e[14] - it.z); };
    let prev = it.mesh.visible;
    const steps = []; for (let d = 40; d <= 84; d += 1) steps.push(d); for (let d = 84; d >= 40; d -= 1) steps.push(d);
    let dir = 'out';
    // waits in game time (the game checks every 0.25 game seconds; a busy machine stretches them), and the walk starts
    // only once the game has seen the player at its first point: the teleport there is a jump no player makes
    const gwait = async (s) => { const g0 = D.Re.t, w0 = performance.now(); while (D.Re.t - g0 < s && performance.now() - w0 < 20000) await wait(40); };
    At.position.set(cx - ux * steps[0], At.position.y, cz - uz * steps[0]); await gwait(0.6); prev = it.mesh.visible;
    for (const [k, d] of steps.entries()) {
      if (k === 45) dir = 'in';
      At.position.set(cx - ux * d, At.position.y, cz - uz * d);
      await gwait(0.32);   // the game checks every 0.25 s
      const dd = dist(), m = it.mesh.visible, f = it.far.visible; out.ticks++;
      if (m && f) out.both++; if (!m && !f) out.none++;
      if (dd < 61.5 && !m) { out.wrongNear++; if (out.examples.length < 3) out.examples.push(`coarse at ${dd.toFixed(1)} m`); }
      if (dd > 66.5 && m) { out.wrongFar++; if (out.examples.length < 3) out.examples.push(`full at ${dd.toFixed(1)} m`); }
      if (m !== prev && k > 0) { (m ? out.swapsIn : out.swapsOut).push(+dd.toFixed(1)); if (dd > 62.5 && dd < 65.5) out.flips++; }
      prev = m;
    }
    return out;
  });
  note(`far detail: ${lod.items} kiosks with two models; ${lod.ticks} steps; swapped to coarse at ${JSON.stringify(lod.swapsOut)} m, back to full at ${JSON.stringify(lod.swapsIn)} m` + (lod.examples && lod.examples.length ? '; ' + lod.examples.join(' | ') : ''));
  expect('there are kiosks with a far model', lod.items > 0, String(lod.items));
  expect('exactly one of the two models shows at every step', lod.both === 0 && lod.none === 0, JSON.stringify({ both: lod.both, none: lod.none }));
  expect('the full model within 62 m, the coarse one beyond 66 m', lod.wrongNear === 0 && lod.wrongFar === 0, JSON.stringify({ wrongNear: lod.wrongNear, wrongFar: lod.wrongFar }));
  expect('one swap each way, at the band\'s edges (out at 66-68.5 m, in at 59.5-62.5 m: the game checks four times a second, the walk steps 1 m), none inside it', lod.swapsOut.length === 1 && lod.swapsIn.length === 1 && lod.flips === 0 && lod.swapsOut[0] >= 65.5 && lod.swapsOut[0] <= 68.5 && lod.swapsIn[0] >= 59.5 && lod.swapsIn[0] <= 62.5, JSON.stringify({ out: lod.swapsOut, in: lod.swapsIn, flips: lod.flips }));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `LOD TEST FAILED (${failures.length})` : 'LOD TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
