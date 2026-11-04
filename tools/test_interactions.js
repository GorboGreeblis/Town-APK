// Every interaction in the game, in every state that changes what is offered (standard tier; 4.0.40; the author:
// "Please ensure that the test suite covers all possible game interactions"). The game's own interaction menu is the
// one list of what the player can do with a character or a place (`xe.actionsFor(target)`: the options a controller
// pick shows), so this test takes every target the game has (every character in `It.all`, every place in `z.list`
// with a label) and runs every option it offers, in four states:
//   empty      no Blossoms, no flint, nothing bought or earned (a new game)
//   stocked    6 Blossoms and 40 flint (every gift and every purchase is offered)
//   quests     the Artifacts, the Gem, the shyness book and its cure, the Sheriff's bribe, the Seeds, Stone and Snacks
//   event      the planting Event under way (with the Seeds, Stone and Snacks)
// For each option: it runs; any dialogue it opens is read to the end; any panel it opens has each of its items
// clicked (the shop's outfits, the Pillar's "No" but never its "Yes", which starts the Event: the event state starts
// it once on purpose) and is closed; then the game must be back in play within 20 s (no soft-lock: nothing left
// open, no hold left on), with no page error, no error the game logged or printed, and no counter below zero.
// The Pillar, the phone and every dancer's battle are among the options, so they are all exercised.
//
// Then the audit's fixes (S40), each through the path the player uses:
//   menus      every townsperson's menu, opened by pointing the controller and pressing the trigger, stands the same
//              angle above that character's highest point (Mama Gorbo's cap had put hers 0.8 m higher)
//   courier    Nextessa walking her route in the church while a dialogue is open: no error (it threw every frame)
//
//   node tools/test_interactions.js [file]
process.env.GT_MULTIVIEW = process.env.GT_MULTIVIEW === '0' ? '' : '1';
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

const SETUP = `(() => {
  const D = window.__dbg; window.__errs = []; window.__glog = [];
  const ce = console.error.bind(console);
  console.error = function () { try { window.__errs.push([...arguments].map((a) => (a && a.stack) ? a.stack : String(a)).join(' ').slice(0, 300)); } catch (e) {} return ce.apply(console, arguments); };
  const L0 = window.__gtLog; window.__gtLog = function (t) { try { window.__glog.push(String(t)); } catch (e) {} try { return L0 && L0.apply(this, arguments); } catch (e) {} };
  window.__wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // read a dialogue to its end; click every item of a panel (never the Pillar's "Yes") and close it
  window.__settle = async (maxMs = 20000) => {
    const t0 = performance.now(), panels = [];
    while (performance.now() - t0 < maxMs) {
      if (D.qt.isOpen) { D.qt.advance(); await window.__wait(60); continue; }
      const st = D._t.state;
      if (st) {
        const title = st.title || st.kind || '?', items = (st.items || []).filter((i) => i && i.onClick && i.label !== 'Yes');
        panels.push(title + ' [' + (st.items || []).map((i) => i.label).join(', ') + ']');
        for (const i of items.slice(0, 12)) { try { i.onClick(); } catch (e) { window.__errs.push('panel item ' + i.label + ': ' + e); } await window.__wait(80); for (let k = 0; k < 30 && D.qt.isOpen; k++) { D.qt.advance(); await window.__wait(40); } }
        try { D._t.close(); } catch (e) {} await window.__wait(150); continue;
      }
      if (D.Bulb.hold || D.st.romping()) { await window.__wait(200); continue; }
      if (D.jt.top === 'playing') return { ok: true, panels, ms: Math.round(performance.now() - t0) };
      await window.__wait(100);
    }
    return { ok: false, panels, top: D.jt.top, hold: !!D.Bulb.hold };
  };
})()`;

const SWEEP = async (state) => {
  const D = window.__dbg, Kt = D.Kt, out = { state, ran: [], stuck: [], errors: [], negative: [], targets: 0 };
  const name = (t) => (t.def && t.def.name) || t.id || t.kind || '?';
  const targets = [...D.It.all.filter((t) => t.group && t.kind !== 'courier'), ...D.z.list.filter((z) => { try { return !!z.label(); } catch (e) { return false; } })];
  out.targets = targets.length;
  for (const t of targets) {
    let acts = []; try { acts = D.xe.actionsFor(t) || []; } catch (e) { out.errors.push(name(t) + ' actionsFor: ' + e); continue; }
    for (const a of acts) {
      if (state !== 'event' && /Summoning Pillar/.test(a.label)) { /* its panel is opened and "No" clicked below */ }
      if (state === 'stocked' || state === 'quests') { Kt.blossoms = Math.max(Kt.blossoms, 3); Kt.acorns = Math.max(Kt.acorns, 30); }
      const e0 = window.__errs.length, g0 = window.__glog.length;
      try { a.run(); } catch (e) { out.errors.push(name(t) + ' / ' + a.label + ': ' + e); }
      const s = await window.__settle();
      const errs = window.__errs.slice(e0).concat(window.__glog.slice(g0).filter((l) => /^ERR|TypeError|ReferenceError|RangeError|is not a function|Cannot read/.test(l)));
      out.ran.push(name(t) + ' / ' + a.label + (s.panels.length ? ' {' + s.panels.join('; ') + '}' : ''));
      if (!s.ok) out.stuck.push(name(t) + ' / ' + a.label + ' (screen ' + s.top + (s.hold ? ', the Speech held' : '') + ')');
      for (const e of errs) out.errors.push(name(t) + ' / ' + a.label + ': ' + e);
      for (const k of ['blossoms', 'acorns', 'artifacts']) if (Kt[k] < 0) out.negative.push(name(t) + ' / ' + a.label + ': ' + k + ' ' + Kt[k]);
      await window.__wait(120);
    }
  }
  return out;
};

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: true });
  const page = g.page, pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.waitForTimeout(1500);
  await page.evaluate(SETUP);
  const sweep = (s) => page.evaluate(`(${SWEEP.toString()})(${JSON.stringify(s)})`);

  // ---- the four states
  const res = {};
  await page.evaluate(() => { const Kt = window.__dbg.Kt; Kt.blossoms = 0; Kt.acorns = 0; });
  res.empty = await sweep('empty');
  await page.evaluate(() => { const Kt = window.__dbg.Kt; Kt.blossoms = 6; Kt.acorns = 40; });
  res.stocked = await sweep('stocked');
  await page.evaluate(() => { const Kt = window.__dbg.Kt; Kt.artifacts = 3; Kt.gem = true; Kt.shyBook = true; Kt.shyFree = true; Kt.phone = true; Object.assign(Kt.rewards, { seeds: true, stone: true, snacks: true }); Kt.blossoms = 6; Kt.acorns = 40; });
  res.quests = await sweep('quests');
  const started = await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt; Object.assign(Kt.rewards, { seeds: true, stone: true, snacks: true });
    D.oe.open(); await window.__wait(400); const y = ((D._t.state && D._t.state.items) || []).find((i) => i.label === 'Yes'); if (y) y.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 30000) await window.__wait(100);
    for (let k = 0; k < 40 && D.qt.isOpen; k++) { D.qt.advance(); await window.__wait(60); }
    return D.me.active;
  });
  res.event = started ? await sweep('event') : { state: 'event', ran: [], stuck: ['the Event did not start'], errors: [], negative: [], targets: 0 };
  for (const k of ['empty', 'stocked', 'quests', 'event']) {
    const r = res[k];
    note(k + ': ' + r.targets + ' targets, ' + r.ran.length + ' options run; ' + r.ran.slice(0, 60).join(' | ').slice(0, 1800));
    expect(k + ': every option of every character and place runs without an error', r.errors.length === 0, r.errors.slice(0, 6).join(' | '));
    expect(k + ': after every option the game is back in play within 20 s (nothing left open or held)', r.stuck.length === 0, r.stuck.slice(0, 6).join(' | '));
    expect(k + ': no counter goes below zero', r.negative.length === 0, r.negative.slice(0, 4).join(' | '));
  }
  const total = Object.values(res).reduce((a, r) => a + r.ran.length, 0);
  expect('the sweep is complete: every state ran options for at least 17 targets (characters and places), ' + total + ' options in all', ['empty', 'stocked', 'quests'].every((k) => res[k].targets >= 17 && res[k].ran.length >= 17) && res.stocked.ran.length > res.empty.ran.length && res.event.ran.length >= 10, Object.entries(res).map(([k, r]) => k + ' ' + r.targets + '/' + r.ran.length).join(', '));
  const all = Object.values(res).flatMap((r) => r.ran).join(' | ');
  for (const [what, re] of [['talk', /\/ Talk to /], ['a gift', /\/ Give a blossom/], ['a dance battle', /Let's dance|dance/i], ['the shop (Garden Supplies)', /\{GARDEN SUPPLIES/], ['the TELEPHONE', /Call for pizza/], ['the Summoning Pillar', /Summoning Pillar/], ['the shyness book', /OVERCOMING SHYNESS/], ['the robin', /\/ Robin/], ['the cardinal', /\/ Cardinal/], ['Sparkakus', /SPARKAKUS/]])
    expect('the sweep includes ' + what, re.test(all), '');
  await page.evaluate(() => { const D = window.__dbg; try { D.me.wrap(); } catch (e) {} });
  await page.waitForTimeout(3000);

  // ---- menus: the same angle above every head, through the controller (S40)
  const menus = await page.evaluate(async () => {
    const D = window.__dbg, At = D.At, O = D.O, M = window.__jgpMenu, T = window.THREE, wait = window.__wait;
    const ctl = (hand) => ({ handedness: hand, axes: [0, 0, 0, 0], buttons: [{}, {}, {}, {}, {}, {}, {}] });
    window.__fakeXR.setInputs([ctl('left'), ctl('right')]); await wait(800);
    let menu = null; D.C.traverse((o) => { if (!menu && o.isMesh && o.renderOrder === 10001 && o.userData.xrUI) menu = o; });
    if (!menu || !M) return { error: 'no XR menu panel' };
    const v = new T.Vector3(), out = {};
    const top = (e) => { let m = -Infinity; e.group.updateMatrixWorld(true); e.group.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return; for (let p = o; p && p !== e.group; p = p.parent) if (!p.visible || p.userData.notModel) return; const a = o.geometry.attributes.position; for (let k = 0; k < a.count; k++) { v.fromBufferAttribute(a, k).applyMatrix4(o.matrixWorld); if (v.y > m) m = v.y; } }); return m; };
    const standing = D.It.all.filter((h) => h.def && h.def.at && h.home && !h.busy && !h.visiting && Math.hypot(h.group.position.x - h.home.x, h.group.position.z - h.home.z) < 1);
    for (const npc of standing.slice(0, 10)) {
      const c = O.xr.getController(1); c.updateMatrixWorld(true);
      const dir = new T.Vector3(0, 0, -1).transformDirection(c.matrixWorld); dir.y = 0; dir.normalize();
      const n = npc.group.position; At.position.set(n.x - dir.x * 3, At.position.y, n.z - dir.z * 3);
      await wait(600); window.__fakeXR.sessions.at(-1).pressSelect(1); await wait(900);
      if (!M.open()) { out[npc.id] = 'no menu'; continue; }
      menu.updateMatrixWorld(true); const mp = new T.Vector3().setFromMatrixPosition(menu.matrixWorld), h = D.we.headPos;
      const sy = menu.scale.y, rows = 24 + 76 * M.labels().length, bottom = mp.y + sy / 2 - sy * rows / D.UI.menu.h;   // the drawn options' lower edge: the menu stands on it (the canvas below it is empty)
      const pitchMenu = Math.atan2(bottom - h.y, Math.hypot(mp.x - h.x, mp.z - h.z));
      const tg = D.we.menuTarget && D.we.menuTarget(); if (!tg || !tg.group) { M.choose(M.labels().length - 1); await wait(300); continue; }   // the menu is the one the ray chose
      const tp = tg.group.position, pitchTop = Math.atan2(top(tg) - h.y, Math.max(0.5, Math.hypot(tp.x - h.x, tp.z - h.z)));
      out[tg.id || (tg.def && tg.def.name) || '?'] = +(pitchMenu - pitchTop).toFixed(3);
      M.choose(M.labels().length - 1); await wait(300);
    }
    return out;
  });
  note('menus (angle above the highest point, radians): ' + JSON.stringify(menus));
  const gaps = Object.values(menus).filter((x) => typeof x === 'number');
  expect('S40: every townsperson\'s menu, opened with the controller, stands 0.04 rad above their highest point, within 0.09 for breathing, bobbing and where the ray lands (Mama Gorbo\'s too; hers had been about 0.25 rad higher)', !menus.error && gaps.length >= 5 && gaps.every((x) => Math.abs(x - 0.04) <= 0.09) && typeof menus.p_mamagorbo === 'number', JSON.stringify(menus));

  // ---- the courier's route in the church under a dialogue (S40)
  const courier = await page.evaluate(async () => {
    const D = window.__dbg, wait = window.__wait, Kt = D.Kt; Kt.phone = true;
    const ch = D.F.buildings.find((b) => b.name === 'church'); if (!ch) return { error: 'no church' };
    const w = D.F.world(ch, (ch.hull[0] + ch.hull[2]) / 2, (ch.hull[1] + ch.hull[3]) / 2); D.At.position.set(w[0], D.At.position.y, w[1]);
    const ph = D.z.list.find((z) => z.id === 'phone'); if (!ph) return { error: 'no phone' };
    const e0 = window.__errs.length, g0 = window.__glog.length;
    try { D.ue.call && D.ue.call(); } catch (e) {} await wait(400); for (let k = 0; k < 30 && D.qt.isOpen; k++) { D.qt.advance(); await wait(60); }
    let t0 = performance.now(); while (!(D.ue.courier) && performance.now() - t0 < 60000) await wait(200);
    D.qt.open('TEST', '#ffffff', 'a long dialogue held open|page two|page three');   // the player reading, not advancing
    await wait(8000);
    const errs = window.__errs.slice(e0).concat(window.__glog.slice(g0).filter((l) => /TypeError|Assignment to constant|\[pizza\]/.test(l)));
    for (let k = 0; k < 30 && D.qt.isOpen; k++) { D.qt.advance(); await wait(60); }
    return { came: !!D.ue.courier, state: D.ue.state, errs: errs.slice(0, 4) };
  });
  note('courier: ' + JSON.stringify(courier));
  expect('S40: Nextessa walking in the church while a dialogue is open logs no error', !courier.error && courier.came && courier.errs.length === 0, JSON.stringify(courier));

  expect('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `INTERACTIONS TEST FAILED (${failures.length})` : 'INTERACTIONS TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
