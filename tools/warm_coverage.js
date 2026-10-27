// Warm-up coverage (report; fails when a reachable material is missing a variant): every shader program the game can
// need must be compiled while loading, because a compile during play stalls a Quest for 50-1,000 ms. In three.js the
// number of lights in the scene is part of every lit shader's key, so a material first drawn while one of the two
// point lights is on (the Portal's blue light while the pizza courier comes through, Sparkakus's light bulb during
// the Speech) needs a variant the town alone never compiles. B27 was exactly that (the Gem under the bulb).
// After boot this builds what the game creates on first use and can be reached here (the Gem pieces and the glue drop,
// Backpacka), then compiles the scene under each light state (none, Portal, bulb, both) and lists every material that
// gets a program it did not have: by material, light state, and whether its object can be seen (visible all the way up)
// or is hidden at the moment (a pool, an effect, a panel, which may show later).
//
//   node tools/warm_coverage.js [file]       (GT_MULTIVIEW=1, the default in run_tests.sh, for the headset's programs)
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const D = window.__dbg, O = D.O, C = D.C, out = { lazy: [], states: {} };
    // what the game builds on first use, put out of sight
    const lazy = [];
    try { if (D.ARTS && D.ARTS.warm) { const gem = D.ARTS.warm(); gem.position.set(0, -60, 0); C.add(gem); lazy.push(['the Gem and glue', gem, true]); } } catch (e) { out.lazy.push('Gem: ' + e); }
    try { const bp = D.JGP && D.JGP.backpacka; if (bp && bp.preview) { const root = bp.preview(1), mine = !!root && !root.parent; if (mine) C.add(root); lazy.push(['Backpacka', root, mine]); } } catch (e) { out.lazy.push('Backpacka: ' + e); }
    C.updateMatrixWorld(true);
    out.lazy = out.lazy.concat(lazy.map(([n]) => n));
    const lights = []; C.traverse((o) => { if (o.isPointLight) lights.push(o); });
    const portal = lights.find((l) => l.color.getHex() === 0x3aa8ff), bulb = lights.find((l) => l.color.getHex() === 0xfff0c8);
    out.lights = lights.map((l) => '#' + l.color.getHexString() + (l.visible ? ' on' : ' off'));
    const was = lights.map((l) => [l, l.visible, l.parent ? l.parent.visible : true]);
    const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
    const lazySet = new Set(); lazy.forEach(([, g]) => g && g.traverse((o) => lazySet.add(o)));
    // P19 holds the Portal's light off while the bulb is lit, so both together cannot happen there (checked frame by
    // frame below); on builds without it the state is compiled like the others
    out.p19 = !!(D.ot && D.ot.light);
    const states = [['none', []], ['Portal', [portal]], ['bulb', [bulb]]].concat(out.p19 ? [] : [['Portal + bulb', [portal, bulb]]]);
    for (const [name, on] of states) {
      lights.forEach((l) => { l.visible = on.includes(l); for (let q = l.parent; q && q !== C; q = q.parent) if (on.includes(l)) q.visible = true; });
      const before = new Set(O.info.programs);
      O.compile(C, D.B);
      const fresh = new Map();
      C.traverse((o) => {
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) {
          const pr = O.properties.get(m); if (!pr || !pr.programs) continue;
          for (const p of pr.programs.values()) if (!before.has(p)) {
            let path0 = [], q = o; while (q && q !== C) { path0.push(q.name || q.type); q = q.parent; }
            const k = m.type + (m.flatShading ? ' flat' : '') + (m.transparent ? ' transparent' : '') + (m.vertexColors ? ' vcol' : '') + (m.map ? ' map' : '');
            const e = fresh.get(k) || { material: k, lit: !(m.isMeshBasicMaterial || m.isLineBasicMaterial || m.isSpriteMaterial || m.isPointsMaterial), seen: 0, hidden: 0, lazy: 0, where: new Set() };
            if (lazySet.has(o)) e.lazy++; else if (shown(o)) e.seen++; else e.hidden++;
            if (e.where.size < 3) e.where.add(path0.slice(0, 3).join('<'));
            fresh.set(k, e);
          }
        }
      });
      out.states[name] = [...fresh.values()].map((e) => ({ ...e, where: [...e.where] }));
      was.forEach(([l, v, pv]) => { l.visible = v; if (l.parent) l.parent.visible = pv; });
    }
    lazy.forEach(([, g, mine]) => mine && g && g.parent && g.parent.remove(g));   // only what this check added
    return out;
  });
  // P19, frame by frame: open the Portal (its light on), then light Sparkakus's bulb, and look at every rendered frame
  const both = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    if (!(D.ot && D.ot.light)) return { skipped: true };
    let bulb = null; D.C.traverse((o) => { if (o.isPointLight && o.color.getHex() === 0xfff0c8) bulb = o; });
    const portal = D.ot.light; let frames = 0, bothOn = 0, portalOn = 0, bulbOn = 0;
    const r0 = O.render; O.render = function () { frames++; if (portal.visible) portalOn++; if (bulb.visible) bulbOn++; if (portal.visible && bulb.visible) bothOn++; return r0.apply(this, arguments); };
    D.ot.activate(); await wait(1500); const portalLit = portalOn > 0;
    const f0 = frames, b0 = bulbOn, p0 = portalOn;
    D.Bulb.hold = true; D.Bulb.start(() => D.st.pos(), 3.6); await wait(3000);   // held lit, as during the Speech
    const during = { frames: frames - f0, bothOn, bulbOn: bulbOn - b0, portalOn: portalOn - p0 };
    D.Bulb.hold = false; D.Bulb.stop(); await wait(2500); D.ot.close(); await wait(800);
    O.render = r0;
    return { portalLit, during, after: { frames, bothOn, portalOn } };
  });
  if (both.skipped) note('Portal + bulb: no P19 in this build (compiled above instead)');
  else expect('P19: with the Portal open and the bulb lit, no frame has both point lights on', both.portalLit && both.during.bulbOn > both.during.frames / 2 && both.after.bothOn === 0, JSON.stringify(both));
  note(`lights: ${r.lights.join(', ')}; built for the check: ${r.lazy.join(', ') || 'nothing'}`);
  for (const [state, list] of Object.entries(r.states)) {
    note(`${state}: ${list.length ? list.map((e) => `${e.material} (${e.seen} seen, ${e.hidden} hidden, ${e.lazy} first-use; ${e.where.join(' / ')})`).join(' | ') : 'nothing new'}`);
  }
  // A gap fails when a lit material that is on show or built on first use has no program for a light state the game
  // can be in; hidden pools and unlit materials are listed above for review (lights do not change unlit programs).
  const gaps = Object.entries(r.states).flatMap(([s, l]) => l.filter((e) => e.lit && (e.seen || e.lazy)).map((e) => `${s}: ${e.material} on ${e.where[0]}`));
  expect('every lit material on show or built on first use has its programs for every light state at load', gaps.length === 0, gaps.slice(0, 6).join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `WARM COVERAGE FAILED (${failures.length})` : 'WARM COVERAGE PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
