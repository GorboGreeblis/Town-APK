// Nextessa's visits build nothing (standard tier; S12, the flash clean-up; the author: "let's try to clean things up to
// be less likely to cause these sorts of issues in the future"). Nextessa and her pizza box are made and uploaded while
// loading; each pizza order brings the same Nextessa and the same box back, and her leaving puts them away (nothing
// disposed). Pizza is ordered twice in VR (fake XR); each visit is followed to its end:
//   - each order brings her (through the Portal) and she delivers ("One hot and ready pie!"), then leaves;
//   - the second visit is the same Nextessa (the same model) carrying the same box as the first;
//   - no GL buffer is deleted from the call to her leaving (nothing disposed); at most a few small ones are made (two
//     quads and one small piece, uploaded between frames by the geometry hold), and none inside a headset frame;
//   - after each visit she is gone from the townsfolk list and the scene; no page errors or logged errors.
//
//   GT_MULTIVIEW=1 node tools/test_courier.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });   // drawn for real: GPU buffers are made when a geometry is first drawn
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((res) => setTimeout(res, ms)), gl = D.O.getContext();
    const said = []; const qo = D.qt.open; D.qt.open = function (n, c, text) { said.push(String(text)); return qo.apply(this, arguments); };
    setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1500);
    const cnt = { make: 0, del: 0, inFrame: 0, on: false };
    for (const k of ['createBuffer', 'deleteBuffer']) { const f = gl[k].bind(gl); gl[k] = function () { if (cnt.on && !/fakexr|XRWebGLBindingFake/.test(new Error().stack)) { k === 'createBuffer' ? cnt.make++ : cnt.del++; if (window.__fakeXR && window.__fakeXR.inFrame) cnt.inFrame++; } return f.apply(null, arguments); }; }
    D.Kt.phone = true; const visits = [];
    for (let v = 0; v < 2; v++) {
      const s0 = said.length; cnt.on = true; const b0 = { make: cnt.make, del: cnt.del };
      try { D.ue.call(); } catch (e) { visits.push({ err: String(e) }); break; }
      let t0 = performance.now(); while (!D.ue.courier && performance.now() - t0 < 180000) await wait(100);
      const n = D.ue.courier; if (!n) { visits.push({ noCourier: true, said: said.slice(s0) }); break; }
      let box = null; n.group.traverse((o) => { if (o.userData && o.userData.gcPz) box = o; });
      const rec = { group: n.group, box, came: true };
      // she walks to the player and delivers when near; else she is claimed
      t0 = performance.now(); while (D.ue.courier && !said.slice(s0).some((x) => x.startsWith('One hot and ready pie!')) && performance.now() - t0 < 240000) { D.At.position.x = n.group.position.x + 1.6; D.At.position.z = n.group.position.z; if (D.ue.state === 'waiting') D.ue.claim(true); await wait(200); }
      rec.delivered = said.slice(s0).some((x) => x.startsWith('One hot and ready pie!'));
      t0 = performance.now(); while (D.ue.courier && performance.now() - t0 < 480000) { D.At.position.set(0, D.At.position.y, -20); await wait(200); }
      await wait(800); cnt.on = false;
      rec.left = !D.ue.courier; rec.inList = D.It.all.includes(n); let inScene = false; for (let o = n.group; o; o = o.parent) if (o === D.C) inScene = true; rec.inScene = inScene;
      rec.made = cnt.make - b0.make; rec.deleted = cnt.del - b0.del;
      visits.push(rec);
      await wait(1500);
    }
    const out = visits.map((x) => Object.assign({}, x, { group: undefined, box: undefined }));
    return { visits: out, sameModel: visits.length === 2 && !!visits[0].group && visits[0].group === visits[1].group, sameBox: visits.length === 2 && !!visits[0].box && visits[0].box === visits[1].box, inFrame: cnt.inFrame };
  });
  note(JSON.stringify(r));
  const v = r.visits;
  expect('two orders: each brings her and she delivers, then leaves', v.length === 2 && v.every((x) => x.came && x.delivered && x.left), JSON.stringify(v));
  expect('the second visit is the same Nextessa carrying the same box', r.sameModel && r.sameBox, JSON.stringify({ model: r.sameModel, box: r.sameBox }));
  expect('no GL buffer deleted during either visit (nothing disposed), and at most a few small ones made (her first draw\'s held uploads, between frames)', v.every((x) => x.deleted === 0 && x.made <= 4), JSON.stringify(v.map((x) => [x.made, x.deleted])));
  expect('none inside a headset frame', r.inFrame === 0, String(r.inFrame));
  expect('after each visit she is gone from the townsfolk list and the scene', v.every((x) => !x.inList && !x.inScene), JSON.stringify(v.map((x) => [x.inList, x.inScene])));
  expect('no page errors or logged errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `COURIER TEST FAILED (${failures.length})` : 'COURIER TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
