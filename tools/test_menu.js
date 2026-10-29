// The interaction menu never shows a stale picture (standard tier; the author's report, BUGS B40, FIXES F-B38: "after
// you've given your last Blossom ... the 3 options will flash quickly before changing to 2"; also Shy Zollod after
// another character). The XR menu is one panel whose picture is painted into the next of three canvases and, on the
// headset's multiview path, uploaded after the frame (F-B31); a menu shown before its own picture is on the panel shows
// the previous menu for a frame.
//
// The author's case, on the multiview path the headset runs: with one Blossom, open a townsperson's menu with the
// controller (Talk, Give, CLOSE), give the Blossom, open the same menu again (Talk, CLOSE). Every frame drawn while the
// menu is visible is checked: its picture must not be the previous menu's canvas. Then once more with another
// townsperson. Also: the reopened menu has the right options, it does show, and no page errors.
//
//   node tools/test_menu.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW === '0' ? '' : '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  const r = await page.evaluate(async () => {
    const D = window.__dbg, At = D.At, O = D.O, M = window.__jgpMenu, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = { mv: false, steps: [] };
    const ctl = (hand) => ({ handedness: hand, axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] });
    window.__fakeXR.setInputs([ctl('left'), ctl('right')]); await wait(800);      // controllers to point with
    let menu = null; D.C.traverse((o) => { if (!menu && o.isMesh && o.renderOrder === 10001 && o.userData.xrUI) menu = o; });
    if (!menu || !M) return { error: 'no XR menu panel or menu hook' };
    // every frame: is the menu drawn, and with which canvas
    let watch = null; const R = O.render;
    O.render = function () { if (watch && menu.visible && (!menu.parent || menu.parent.visible !== false)) { watch.frames++; if (menu.material.map && menu.material.map.image === watch.stale) watch.staleFrames++; } out.mv = out.mv || !!(window.__gtXR && window.__gtXR.mvActive); return R.apply(this, arguments); };
    const pick = async (npc) => {
      const c = O.xr.getController(1); c.updateMatrixWorld(true);
      const dir = new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld); dir.y = 0; dir.normalize();
      const n = npc.group.position; At.position.set(n.x - dir.x * 2.5, At.position.y, n.z - dir.z * 2.5);
      await wait(600); window.__fakeXR.sessions.at(-1).pressSelect(1); await wait(50);
    };
    const finishDialogue = async () => { for (let i = 0; i < 40 && D.qt.isOpen; i++) { D.qt.advance(); await wait(80); } await wait(300); };
    const standing = D.It.all.filter((h) => h.def && h.def.at && h.home && !h.busy && !h.visiting && Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z) < 1);
    const npc = standing[0], other = standing.find((h) => h !== npc);
    if (!npc) return { error: 'no standing townsperson' };
    // 1. one Blossom: Talk, Give, CLOSE
    D.Kt.blossoms = 1; await pick(npc); await wait(800);
    const first = M.labels(); out.steps.push({ who: npc.def.name, labels: first });
    const gi = first.findIndex((l) => /blossom|give/i.test(l));
    if (gi < 0) return Object.assign(out, { error: 'no Give option with one Blossom: ' + first.join(', ') });
    const staleCanvas = menu.material.map.image;          // the picture of the 3-option menu
    M.choose(gi); await wait(300); await finishDialogue();
    for (let i = 0; i < 30 && D.Kt.blossoms > 0; i++) { await wait(100); await finishDialogue(); }
    if (D.Kt.blossoms > 0) return Object.assign(out, { error: 'the Blossom was not given (still ' + D.Kt.blossoms + ')' });
    // 2. the same townsperson again: Talk, CLOSE; no frame may show the 3-option picture
    watch = { stale: staleCanvas, frames: 0, staleFrames: 0 };
    await pick(npc); await wait(1500);
    out.steps.push({ who: npc.def.name, labels: M.labels(), open: M.open(), frames: watch.frames, staleFrames: watch.staleFrames, shownNow: menu.visible });
    watch = null;
    // 3. another townsperson right after (the Shy Zollod case: a different menu after another character's)
    if (other) {
      const prev = menu.material.map.image; M.choose(M.labels().length - 1); await wait(400);   // CLOSE
      D.Kt.blossoms = 2; watch = { stale: prev, frames: 0, staleFrames: 0 };
      await pick(other); await wait(1500);
      out.steps.push({ who: other.def.name, labels: M.labels(), open: M.open(), frames: watch.frames, staleFrames: watch.staleFrames, shownNow: menu.visible });
      watch = null;
    }
    O.render = R;
    return out;
  });
  await g.close();
  if (r.error) { expect('the menu test could run', false, r.error); }
  else {
    note(`multiview path: ${r.mv}; ` + r.steps.map((s) => `${s.who}: [${s.labels.join(', ')}]${s.frames !== undefined ? ` ${s.frames} frames shown, ${s.staleFrames} with the previous menu's picture` : ''}`).join(' | '));
    expect('runs on the headset\'s multiview path', r.mv === true);
    const re = r.steps[1], other = r.steps[2];
    expect('after giving the last Blossom the menu has two options (Talk, CLOSE)', re && re.open && re.labels.length === 2, JSON.stringify(re && re.labels));
    expect('the reopened menu shows', re && re.shownNow && re.frames > 0, JSON.stringify(re));
    expect('no frame shows the previous menu (the 3-option picture) after giving the last Blossom', re && re.staleFrames === 0, `${re && re.staleFrames} of ${re && re.frames} frames`);
    if (other) expect(`no frame shows the previous character's menu when opening ${other.who}'s`, other.staleFrames === 0 && other.shownNow, `${other.staleFrames} of ${other.frames} frames`);
  }
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `MENU TEST FAILED (${failures.length})` : 'MENU TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
