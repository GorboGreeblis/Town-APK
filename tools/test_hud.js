// Wrist HUD and haptics test (standard tier). The HUD is a small display on the left controller's grip that faces the
// player when they look at their wrist: the SEEDS, SUMMONING STONE and SNACKS checkboxes of the planting Event, and an
// inventory row (Blossoms, flint, Artifacts with their counts; the Gem, the Stone, the shyness book while Zollod is shy,
// the Seeds, the pizza). It redraws only when what it shows changes. Gaining a Blossom or meeting someone new pulses
// the controllers (VRC.Quest.Accessibility.3, more than one feedback cue): the fake controllers record each pulse.
//
//   node tools/test_hud.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, renderEvery: 3 });
  const page = g.page;
  await page.evaluate(() => { window.__fakeXR.poses = true; window.__fakeXR.inputs = [{ handedness: 'left' }, { handedness: 'right' }]; });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const D = window.__dbg, F = D.UI, Kt = D.Kt, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = { steps: [] };
    const hud = F.hud;
    // the panel cycles through three canvases, so a redraw is counted at the panel's own draw call
    let draws = 0; const d0 = hud.draw; hud.draw = function () { draws++; return d0.apply(this, arguments); };
    out.visible = hud.mesh.visible; out.onLeftGrip = !!(hud.mesh.parent && F.ctrls[0] && hud.mesh.parent === F.ctrls[0].grip);
    window.__fakeXR.pulses = [];
    const step = async (label, fn, want) => {
      const v0 = draws, p0 = window.__fakeXR.pulses.length;
      fn(); await wait(500);
      out.steps.push({ label, sig: hud.sig, ok: want(hud.sig || ''), redrawn: draws > v0, pulses: window.__fakeXR.pulses.slice(p0) });
    };
    // a clean start: nothing held
    Kt.blossoms = 0; Kt.acorns = 0; Kt.artifacts = 0; Kt.gem = false; Kt.shyBook = false; Kt.shyFree = false; Object.assign(Kt.rewards, { seeds: false, stone: false, snacks: false, artifacts: false });
    await wait(500);
    out.empty = hud.sig;
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
  expect('the HUD sits on the left controller grip and faces the player', r.visible === true && r.onLeftGrip === true, JSON.stringify({ visible: r.visible, onLeftGrip: r.onLeftGrip }));
  expect('with nothing held, the three Event checkboxes are empty and no item is shown', r.empty === 'false|false|false|', JSON.stringify(r.empty));
  const changes = r.steps.filter((s) => !['someone new met', 'nothing changes'].includes(s.label));
  const bad = changes.filter((s) => !(s.ok && s.redrawn));
  expect(`each change to what is held is shown and redrawn (${changes.length} changes: Blossoms, flint, Artifacts, the Gem, the book, the Stone, the Seeds, the pizza)`, bad.length === 0, JSON.stringify(bad));
  const still = r.steps.find((s) => s.label === 'nothing changes');
  expect('the HUD does not redraw when nothing changed', still && !still.redrawn, JSON.stringify(still));
  const bl = r.steps.filter((s) => /Blossom/.test(s.label)), met = r.steps.find((s) => s.label === 'someone new met');
  expect('gaining a Blossom pulses both controllers (strength 0.3, 35 ms)', bl.every((s) => s.pulses.length === 2 && s.pulses.every((p) => p[1] === 0.3 && p[2] === 35)), JSON.stringify(bl.map((s) => s.pulses)));
  expect('meeting someone new pulses both controllers (strength 0.5, 70 ms)', met && met.pulses.length === 2 && met.pulses.every((p) => p[1] === 0.5 && p[2] === 70), JSON.stringify(met && met.pulses));
  const other = r.steps.filter((s) => !/Blossom/.test(s.label) && s.label !== 'someone new met');
  expect('nothing else pulses', other.every((s) => s.pulses.length === 0), JSON.stringify(other.filter((s) => s.pulses.length).map((s) => [s.label, s.pulses])));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `HUD TEST FAILED (${failures.length})` : 'HUD TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
