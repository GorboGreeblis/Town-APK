// Load-time draw merges hold (standard tier; 4.0.59 P48 panel sheets, 4.0.60 P49 glass, P50 Mama Gorbo's tubes, P51
// Gemtoe's cape; the author: "Any FPS under 60 fps is still considered a bug"). At load:
//   - the panel sheets merged at least 16 draws, the glass panes at least 6;
//   - Mama Gorbo's three goo tubes are one mesh ("gcTubes") that is still reshaped every frame (its positions change
//     and its shape version climbs) and never leaves its bounds (so it is never culled while on screen);
//   - every character part the batcher holds is drawn in a batch, except the merged tubes (reshaped on the CPU):
//     Gemtoe's cape left its batch from 4.0.53 to 4.0.59 (its picture's anisotropy differed from the batch's);
//   - no page errors.
//
//   node tools/test_merges.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true });
  await g.page.waitForTimeout(3000);
  const r = await g.page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms)), T = window.THREE;
    let tubes = null; window.__dbg.C.traverse((o) => { if (o.isMesh && o.name === 'gcTubes') tubes = o; });
    const out = { atlas: window.__gcAtlasN, glass: window.__gcGlassN, tubes: !!tubes };
    if (tubes) {
      const pos = tubes.geometry.attributes.position, a = Array.from(pos.array), v0 = pos.version;
      let outside = 0; const V = new T.Vector3, sph = tubes.geometry.boundingSphere;
      for (let k = 0; k < 10; k++) {
        await wait(100);
        for (let i = 0; i < pos.count; i++) { V.fromBufferAttribute(pos, i); if (V.distanceTo(sph.center) > sph.radius + 1e-4) outside++; }
      }
      let moved = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - pos.array[i]) > 1e-5) moved++;
      Object.assign(out, { verts: pos.count, moved, versions: pos.version - v0, outside });
    }
    const off = [];
    if (typeof gcEB !== 'undefined' && gcEB.list) for (const b of gcEB.list) for (const U of b.P) if (!U.on) off.push(U.o && U.o.name || '?');
    out.off = off; out.batches = typeof gcEB !== 'undefined' && gcEB.list ? gcEB.list.length : 0;
    return out;
  });
  note(JSON.stringify(r));
  expect('P48: the panel sheets merged at least 16 draws', r.atlas >= 16, String(r.atlas));
  expect('P49: the glass panes merged at least 6 draws', r.glass >= 6, String(r.glass));
  expect('P50: Mama Gorbo\'s tubes are one mesh', r.tubes);
  expect('P50: the merged tubes are still reshaped every frame (positions change, shape uploaded)', r.tubes && r.moved > 0 && r.versions >= 5, `${r.moved} of ${r.verts * 3} values moved, ${r.versions} uploads in 1 s`);
  expect('P50: the merged tubes never leave their bounds', r.tubes && r.outside === 0, `${r.outside} vertex samples outside`);
  expect('P51: every batched character part is drawn in its batch, except the merged tubes (Gemtoe\'s cape included)', r.batches > 0 && r.off.every((n) => n === 'gcTubes'), JSON.stringify(r.off));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `MERGES TEST FAILED (${failures.length})` : 'MERGES TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
