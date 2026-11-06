// OVERCOMING SHYNESS leaves the shelf when taken (standard tier; B120, 4.0.61; the author: "The 'Overcoming Shyness'
// book did not disappear after being picked up. This is a new issue. The book should fade out after being selected").
// From 4.0.59 the panel sheets (P48) merged the book's painted cover into the Library's sheet at load, so hiding the
// book left its cover on the shelf. The book is now kept out of every load-time merge and, taken, shrinks away over
// 0.4 s (as a Blossom does; no material change, so nothing is compiled). The player at the shelf, facing the book:
//   - the book's cover is drawn by the book itself (not merged into a sheet);
//   - taken: it shrinks away over 0.25-0.8 s (part-way at some sample, not a pop) and is then hidden;
//   - the picture where it stood changes (the cover is gone: over a third of the view), and near it only the book's
//     own meshes left;
//   - it stays gone after an Event's fade out and back (the fade shows the Library's groups again; 4.0.60 showed it);
//   - no page errors.
//
//   node tools/test_shybook.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW || '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  await g.page.waitForTimeout(3000);
  const pre = await g.page.evaluate(async () => {
    const D = window.__dbg, T = window.THREE, X = window.__fakeXR, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const z = D.z.list.find((q) => q.id === 'shybook'); if (!z) return { error: 'no book zone' };
    const book = z.pickObj[0]; window.__tsBook = { z, book };
    let cover = null; book.traverse((o) => { if (o.isMesh && o.material && o.material.map) cover = o; });
    const p = new T.Vector3(), n = new T.Vector3(0, 0, 1); book.updateMatrixWorld(true); book.getWorldPosition(p); n.transformDirection(book.matrixWorld); n.y = 0; n.normalize();
    // a camera 0.9 m in front of the book, at its height, looking at it
    const e = [p.x + n.x * 0.9, p.y + 0.05, p.z + n.z * 0.9]; window.__tsEye = { e, t: [p.x, p.y, p.z] };
    D.At.position.set(p.x + n.x * 2.5, D.At.position.y, p.z + n.z * 2.5); await wait(800);
    return { cover: !!cover, coverInBook: !!cover && (() => { for (let o = cover; o; o = o.parent) if (o === book) return true; return false; })(), y: +p.y.toFixed(2), label: z.label() };
  });
  const shot = () => g.page.evaluate(() => {
    const D = window.__dbg, O = D.O, gl = O.getContext(), T = window.THREE, { e, t } = window.__tsEye, N = 96;
    const cam = new T.PerspectiveCamera(30, 1, 0.05, 50), buf = new Uint8Array(N * N * 4), xr = O.xr.enabled;
    O.xr.enabled = false; O.state.bindXRFramebuffer && O.state.bindXRFramebuffer(null); O.setRenderTarget(null);
    const W = O.domElement.width, H = O.domElement.height;
    cam.position.set(e[0], e[1], e[2]); cam.lookAt(t[0], t[1], t[2]); cam.updateMatrixWorld(true);
    O.setViewport(0, 0, N, N); O.setScissor(0, 0, N, N); O.setScissorTest(true); O.render(D.C, cam); O.setScissorTest(false);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, buf); O.setViewport(0, 0, W, H); O.xr.enabled = xr;
    return Array.from(buf);
  });
  const before = pre.error ? null : await shot();
  const r = pre.error ? pre : await g.page.evaluate(async () => {
    const { z, book } = window.__tsBook, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const bp = new THREE.Vector3(), mp = new THREE.Vector3(); book.getWorldPosition(bp); const meshesBefore = []; window.__dbg.C.traverse((o) => { if (o.isMesh && o.visible && o.geometry && (o.geometry.computeBoundingSphere(), mp.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld)).distanceTo(bp) < 1) meshesBefore.push(o); });   // what was drawn within 1 m of the book
    const t0 = performance.now(); z.run(); const samples = [];
    while (performance.now() - t0 < 1500) { await new Promise((res) => requestAnimationFrame(res)); samples.push([+((performance.now() - t0) / 1000).toFixed(2), +book.scale.x.toFixed(3), book.visible]); if (!book.visible) break; }
    await wait(400);
    const gone = meshesBefore.filter((o) => { for (let p = o; p; p = p.parent) if (!p.visible) return true; return !o.parent; });
    const inBook = gone.filter((o) => { for (let p = o; p; p = p.parent) if (p === book) return true; return false; });
    const hiddenAt = samples.find((s) => !s[2]);
    // an Event's fade out and back shows its buildings' groups again (the book is one of the Library's): it stays gone
    let afterEvent = null; if (window.__gcSt) { window.__gcSt.set(0); await wait(100); window.__gcSt.set(1); await wait(300); afterEvent = book.visible; }
    return { samples: samples.filter((_, i) => i % 4 === 0).slice(0, 12), partWay: samples.some((s) => s[2] && s[1] > 0.05 && s[1] < 0.95), hiddenAt: hiddenAt ? hiddenAt[0] : null, gone: gone.length, goneInBook: inBook.length, taken: !!window.__dbg.Kt.shyBook, afterEvent };
  });
  const after = r.error ? null : await shot();
  let diff = 0; if (before && after) for (let i = 0; i < before.length; i += 4) if (Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]) > 60) diff++;
  note(JSON.stringify({ pre, r, changedPixels: diff }));
  expect('the book\'s cover is drawn by the book itself (not merged into a panel sheet)', !pre.error && pre.cover && pre.coverInBook, JSON.stringify(pre));
  expect('B120: taken, the book shrinks away (part-way at some frame) and is hidden after 0.25-0.8 s', !r.error && r.taken && r.partWay && r.hiddenAt > 0.25 && r.hiddenAt < 0.8, JSON.stringify(r));
  expect('B120: the taken book stays gone after an Event\'s fade out and back (the fade shows the Library\'s groups again)', !r.error && r.afterEvent === false, String(r.afterEvent));
  expect('B120: near the book (1 m), only the book\'s own meshes left the picture', !r.error && r.gone > 0 && r.gone === r.goneInBook, `${r.goneInBook} of ${r.gone}`);
  expect('B120: the picture where the book stood changed (its cover is gone)', diff > 3000, `${diff} of 9216 pixels changed (4.0.60: 845, its cover left behind)`);
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `SHYBOOK TEST FAILED (${failures.length})` : 'SHYBOOK TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
