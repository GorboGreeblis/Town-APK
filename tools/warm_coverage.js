// Warm-up coverage (report; fails when a reachable material is missing a variant): every shader program the game can
// need must be compiled while loading, because a compile during play stalls a Quest for 50-1,000 ms. In three.js the
// number of lights in the scene is part of every lit shader's key, so until 4.0.18 a material first drawn while one of
// the two point lights was shown (the Portal's blue light while the pizza courier comes through, Sparkakus's light bulb
// during the Speech) needed a variant the town alone never compiled: B27 was exactly that (the Gem under the bulb),
// and P19 kept the Portal's light off while the bulb was lit so the two-light variant never came up. Since 4.0.18
// (S25, B83) both point lights are always visible and their intensity drives them (0 when off), so the game has one
// light state (both lights counted) and compiles its shaders once, while loading. Checked, in VR:
//   - both point lights are in the scene and visible, all the way up, at boot;
//   - after building what the game creates on first use (the Gem pieces and the glue drop, Backpacka), compiling the
//     scene in that one state gives no lit material on show, or built on first use, a program it did not have; what
//     the hidden pools and the unlit materials get is listed for review (lights do not change unlit programs);
//   - frame by frame through the Portal opening, the bulb held lit (as in the Speech) and both closing: both lights
//     visible in every frame, the Portal's intensity 0 while the bulb is lit (P19 as an intensity now), its glow back
//     after, and no program compiled through the whole sequence;
//   - no page errors.
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
    const up = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
    out.bothVisible = !!(portal && bulb && up(portal) && up(bulb));
    const shown = up;
    const lazySet = new Set(); lazy.forEach(([, g]) => g && g.traverse((o) => lazySet.add(o)));
    // the one light state the game reaches: both point lights counted (S25); nothing is toggled for the compile
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
    out.states['both lights (the one state)'] = [...fresh.values()].map((e) => ({ ...e, where: [...e.where] }));
    lazy.forEach(([, g, mine]) => mine && g && g.parent && g.parent.remove(g));   // only what this check added
    return out;
  });
  // frame by frame: open the Portal (its glow on), hold Sparkakus's bulb lit, close both; both lights stay visible, the
  // Portal's intensity is 0 while the bulb is lit (P19), and no program is compiled on the way
  const both = await page.evaluate(async () => {
    const D = window.__dbg, O = D.O, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    if (!(D.ot && D.ot.light)) return { skipped: true };
    let bulb = null; D.C.traverse((o) => { if (o.isPointLight && o.color.getHex() === 0xfff0c8) bulb = o; });
    const portal = D.ot.light, up = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
    let frames = 0, bothVisible = 0, portalGlow = 0, portalDark = 0, bulbLit = 0; const programs0 = O.info.programs.length;
    const r0 = O.render; O.render = function () { frames++; if (up(portal) && up(bulb)) bothVisible++; if (portal.intensity > 0) portalGlow++; else portalDark++; if (bulb.intensity > 0) bulbLit++; return r0.apply(this, arguments); };
    D.ot.activate(); await wait(1500); const opened = { frames, portalGlow };
    const f0 = frames, b0 = bulbLit, g0 = portalGlow, d0 = portalDark;
    D.Bulb.hold = true; D.Bulb.start(() => D.st.pos(), 3.6); await wait(3000);   // held lit, as during the Speech
    const during = { frames: frames - f0, bulbLit: bulbLit - b0, portalGlow: portalGlow - g0, portalDark: portalDark - d0 };
    D.Bulb.hold = false; D.Bulb.stop(); await wait(2500); const g1 = portalGlow; await wait(500); const after = { portalGlowBack: portalGlow > g1 };
    D.ot.close(); await wait(800);
    O.render = r0;
    return { opened, during, after, frames, bothVisible, programs: O.info.programs.length - programs0 };
  });
  if (both.skipped) note('Portal + bulb: no Portal light in this build');
  else {
    expect('both point lights stay visible in every frame through the Portal opening, the bulb held lit and both closing (S25: one light state)', both.bothVisible === both.frames && both.frames > 30, JSON.stringify({ frames: both.frames, bothVisible: both.bothVisible }));
    expect('the Portal opened glows (its intensity above 0); while the bulb is lit its intensity is 0 in every frame (P19); it glows again after', both.opened.portalGlow > 0 && both.during.bulbLit > both.during.frames / 2 && both.during.portalGlow === 0 && both.during.portalDark === both.during.frames && both.after.portalGlowBack, JSON.stringify(both));
    expect('no program is compiled through the Portal and bulb sequence', both.programs === 0, `${both.programs} new programs`);
  }
  note(`lights: ${r.lights.join(', ')}; built for the check: ${r.lazy.join(', ') || 'nothing'}`);
  expect('both point lights (the Portal\'s #3aa8ff and the bulb\'s #fff0c8) are in the scene and visible, all the way up, at boot (S25)', r.bothVisible === true, r.lights.join(', '));
  for (const [state, list] of Object.entries(r.states)) {
    note(`${state}: ${list.length ? list.map((e) => `${e.material} (${e.seen} seen, ${e.hidden} hidden, ${e.lazy} first-use; ${e.where.join(' / ')})`).join(' | ') : 'nothing new'}`);
  }
  // A gap fails when a lit material that is on show or built on first use has no program for the light state the game
  // is in; hidden pools and unlit materials are listed above for review (lights do not change unlit programs).
  const gaps = Object.entries(r.states).flatMap(([s, l]) => l.filter((e) => e.lit && (e.seen || e.lazy)).map((e) => `${s}: ${e.material} on ${e.where[0]}`));
  expect('every lit material on show or built on first use has its programs for the game\'s light state at load', gaps.length === 0, gaps.slice(0, 6).join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `WARM COVERAGE FAILED (${failures.length})` : 'WARM COVERAGE PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
