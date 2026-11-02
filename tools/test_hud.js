// Wrist HUD and haptics (standard tier; A35, A41, A44; FIXES F-B27 for the pulses). Since 4.0.5 (A35) the HUD is hidden
// until Y is pressed while the player looks at the left-hand watch; opened, it lies on the watch face (A41; 10 cm wide
// since A44). Checked, in VR (fake XR, both controllers connected):
//   - the HUD is hidden by default (A35);
//   - Y while looking at the watch opens it, on the watch face (its mesh under the face mesh), not on the grip;
//   - opened, with nothing held, the three Event checkboxes are empty and no item is shown;
//   - each change to what is held is shown and redrawn within a second (Blossoms, flint, Artifacts, the Gem, the
//     book, the Stone, the Seeds, the pizza): the panel's signature carries the new count or flag and its draw ran;
//     nothing is redrawn when nothing changed;
//   - gaining a Blossom pulses both controllers (0.3, 35 ms), meeting someone new too (0.5, 70 ms), nothing else;
//   - no page errors.
//
//   node tools/test_hud.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  const r = await page.evaluate(async () => {
    const D = window.__dbg, X = window.__fakeXR, T = window.THREE, UI = D.UI, Kt = D.Kt, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = { steps: [] };
    if (!UI || !X) return { noUI: true };
    const idle = [{ handedness: 'left', buttons: [] }, { handedness: 'right', buttons: [] }];
    X.poses = true; X.setInputs(idle); await wait(1500);
    const left = UI.ctrls.find((c) => c.hand === 'left'), watch = left && left.handMesh && left.handMesh.userData.gcWatch;
    const hud = UI.hud; out.watch = !!watch; if (!watch) return out;
    // the panel cycles through three canvases, so a redraw is counted at the panel's own draw call
    let draws = 0; const d0 = hud.draw; hud.draw = function () { draws++; return d0.apply(this, arguments); };
    out.hiddenByDefault = !hud.mesh.visible;
    // the left hand held so the watch face is 0.32 m before the eyes, a little below, facing them (as test_watch.js)
    const lookPose = () => {
      const cam = D.B, E = new T.Vector3(), Q = new T.Quaternion(), S3 = new T.Vector3(); cam.updateMatrixWorld(true); cam.matrixWorld.decompose(E, Q, S3);
      const fwd = new T.Vector3(0, 0, -1).applyQuaternion(Q), up = new T.Vector3(0, 1, 0).applyQuaternion(Q);
      const target = E.clone().addScaledVector(fwd, 0.32).addScaledVector(up, -0.05);
      const toEye = E.clone().sub(target).normalize(), qF = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), toEye);
      const Fw = new T.Matrix4().compose(target, qF, new T.Vector3(1, 1, 1));
      left.grip.updateMatrixWorld(true); watch.updateMatrixWorld(true);
      const L = new T.Matrix4().copy(left.grip.matrixWorld).invert().multiply(watch.matrixWorld);
      const Gw = Fw.clone().multiply(L.clone().invert()), P = new T.Matrix4().copy(left.grip.parent.matrixWorld).invert().multiply(Gw);
      const p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(); P.decompose(p, q, sc);
      return { position: { x: p.x, y: p.y, z: p.z }, orientation: { x: q.x, y: q.y, z: q.z, w: q.w }, matrix: Array.from(P.elements) };
    };
    const pressY = async () => { X.setInputs([{ handedness: 'left', buttons: [0, 0, 0, 0, 0, { pressed: true, value: 1 }].map((b) => b || { pressed: false }) }, idle[1]]); await wait(120); X.setInputs(idle); await wait(120); };
    // a clean start: nothing held
    Kt.blossoms = 0; Kt.acorns = 0; Kt.artifacts = 0; Kt.gem = false; Kt.shyBook = false; Kt.shyFree = false; Object.assign(Kt.rewards, { seeds: false, stone: false, snacks: false, artifacts: false });
    X.leftPose = lookPose(); await wait(300); X.leftPose = lookPose(); await wait(300);
    await pressY(); await wait(900);
    out.opened = hud.mesh.visible; out.onWatch = hud.mesh.parent === watch; out.onGrip = hud.mesh.parent === left.grip;
    out.empty = hud.sig;
    X.pulses = [];
    const step = async (label, fn, want) => {
      const v0 = draws, p0 = X.pulses.length; X.leftPose = lookPose();
      fn(); await wait(900);
      out.steps.push({ label, sig: hud.sig, ok: want(hud.sig || ''), redrawn: draws > v0, pulses: X.pulses.slice(p0) });
    };
    await step('2 Blossoms', () => { Kt.blossoms = 2; }, (s) => /blossom,2/.test(s));
    await step('5 flint', () => { Kt.acorns = 5; }, (s) => /flint,5/.test(s));
    await step('2 Artifacts', () => { Kt.artifacts = 2; }, (s) => /artifact,2/.test(s));
    await step('the Gem', () => { Kt.gem = true; }, (s) => /(^|;)gem($|;)/.test(s.split('|')[3]));
    await step('the shyness book', () => { Kt.shyBook = true; }, (s) => /book/.test(s));
    await step('Zollod cured: the book is gone', () => { Kt.shyFree = true; }, (s) => !/book/.test(s));
    await step('the Summoning Stone', () => { Kt.rewards.stone = true; }, (s) => s.split('|')[1] === 'true' && /stone/.test(s.split('|')[3]));
    await step('the Seeds', () => { Kt.rewards.seeds = true; }, (s) => s.split('|')[0] === 'true' && /seeds/.test(s.split('|')[3]));
    await step('the pizza (Snacks)', () => { Kt.rewards.snacks = true; }, (s) => s.split('|')[2] === 'true' && /pizza/.test(s.split('|')[3]));
    await step('the Artifacts given in (the Speech)', () => { Kt.rewards.artifacts = true; }, (s) => !/artifact/.test(s));
    await step('a third Blossom', () => { Kt.blossoms = 3; }, (s) => /blossom,3/.test(s));
    await step('someone new met', () => { Kt.met.add('test-newcomer-' + Math.random()); }, () => true);
    await step('nothing changes', () => {}, () => true);
    return out;
  });
  note(JSON.stringify(r).slice(0, 1500));
  expect('the HUD is hidden by default (A35)', r.hiddenByDefault === true, String(r.hiddenByDefault));
  expect('Y while looking at the watch opens the HUD on the watch face, not on the grip (A35, A41)', r.opened && r.onWatch && !r.onGrip, JSON.stringify({ opened: r.opened, onWatch: r.onWatch, onGrip: r.onGrip }));
  expect('with nothing held, the three Event checkboxes are empty and no item is shown', r.empty === 'false|false|false|', JSON.stringify(r.empty));
  const steps = r.steps || [];
  const changes = steps.filter((s) => !['someone new met', 'nothing changes'].includes(s.label));
  const bad = changes.filter((s) => !(s.ok && s.redrawn));
  expect(`opened, each change to what is held is shown and redrawn (${changes.length} changes: Blossoms, flint, Artifacts, the Gem, the book, the Stone, the Seeds, the pizza)`, changes.length === 11 && bad.length === 0, JSON.stringify(bad).slice(0, 600));
  const still = steps.find((s) => s.label === 'nothing changes');
  expect('the HUD does not redraw when nothing changed', still && !still.redrawn, JSON.stringify(still));
  const bl = steps.filter((s) => /Blossom/.test(s.label)), met = steps.find((s) => s.label === 'someone new met');
  expect('gaining a Blossom pulses both controllers (strength 0.3, 35 ms)', bl.length > 0 && bl.every((s) => s.pulses.length === 2 && s.pulses.every((p) => p[1] === 0.3 && p[2] === 35)), JSON.stringify(bl.map((s) => s.pulses)));
  expect('meeting someone new pulses both controllers (strength 0.5, 70 ms)', met && met.pulses.length === 2 && met.pulses.every((p) => p[1] === 0.5 && p[2] === 70), JSON.stringify(met && met.pulses));
  const other = steps.filter((s) => !/Blossom/.test(s.label) && s.label !== 'someone new met');
  expect('nothing else pulses', other.every((s) => s.pulses.length === 0), JSON.stringify(other.filter((s) => s.pulses.length).map((s) => [s.label, s.pulses])));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `HUD TEST FAILED (${failures.length})` : 'HUD TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
