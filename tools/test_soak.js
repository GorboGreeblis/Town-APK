#!/usr/bin/env node
// Stability soak (T14; full tier, 10 minutes): runs the game in the fake VR session for N minutes with
// all systems exercised in a loop (pickups, dialogue, shop, battle, pizza call,
// visits unparked) and samples heap, renderer counts and errors every 30 s.
// Fails on page errors, on heap growth over 60% from the 2-minute mark, or on
// unbounded growth of programs/textures/geometries. Note: the harness stubs
// the draw call (fastSim), so GPU texture/geometry counters stay at their
// boot values; heap, programs and entity counts are the meaningful signals.
//
//   node tools/test_soak.js [file] [minutes=10]
const path = require('path');
const { boot, reporter, root } = require('./lib/harness.js');
const args = process.argv.slice(2);
const file = args[0] && !/^\d+$/.test(args[0]) ? path.resolve(args[0]) : undefined;
const minutes = +(args.find((a) => /^\d+$/.test(a)) || 10);
(async () => {
  const { page, browser, errors, bootS } = await boot({ file, noVisits: false });
  const { expect, failures } = reporter();
  console.log(`booted in ${bootS}s; soaking for ${minutes} min`);
  await page.evaluate(() => { window.__autoAdvance = setInterval(() => { try { const q = window.__dbg.qt; if (q && q.isOpen) q.advance(); } catch (e) {} }, 250); });
  const samples = [];
  const t0 = Date.now(); let cycle = 0;
  while (Date.now() - t0 < minutes * 60000) {
    cycle++;
    const s = await page.evaluate(async (cycle) => {
      const D = window.__dbg, O = D.O, Kt = D.Kt; const out = { cycle };
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        // pickups: stand on a blossom and an acorn
        const b = D.le.list.find((x) => x.visible && !x.userData.taken); if (b) D.At.position.set(b.position.x, D.At.position.y, b.position.z);
        await wait(800);
        const a = D.ce.list.find((x) => x.visible && !x.userData.taken); if (a) D.At.position.set(a.position.x, D.At.position.y, a.position.z);
        await wait(800);
        // dialogue with a random NPC
        const npcs = D.It.all.filter((h) => h.def && h.def.lines && h.def.lines.length); const n = npcs[cycle % npcs.length];
        if (n) { D.qt.open(n.def.name, '#fff', n.def.lines[0], () => {}); await wait(1200); }
        // shop open/close every 3rd cycle, battle every 5th, pizza every 7th
        if (cycle % 3 === 0) { Kt.shyFree = true; try { D.ne.open(); } catch (e) {} await wait(1000); try { D._t.close(); } catch (e) {} }
        if (cycle % 5 === 0) { const m = D.It.all.find((h) => h.def && h.def.name === 'MONTGUMMERY'); if (m) { try { D.Dbt.start(m); } catch (e) {} await wait(1500); try { D._t.close(); } catch (e) {} } }
        if (cycle % 7 === 0) { try { D.ue.call(); } catch (e) {} }
        await wait(20000);
      } catch (e) { out.threw = String(e); }
      out.t = Math.round(performance.now() / 1000);
      out.heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      out.programs = O.info.programs.length; out.textures = O.info.memory.textures; out.geometries = O.info.memory.geometries;
      out.entities = D.It.all.length; out.errors = D.Re.errors; out.courier = !!D.ue.courier; out.event = !!(D.me && D.me.active);
      return out;
    }, cycle);
    samples.push(s);
    console.log(`  [${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s] heap ${s.heap}MB programs ${s.programs} textures ${s.textures} geometries ${s.geometries} entities ${s.entities} errors ${s.errors}${s.threw ? ' threw=' + s.threw : ''}`);
  }
  const base = samples.find((s) => s.t - samples[0].t >= 120) || samples[0]; const last = samples[samples.length - 1];
  expect('no page errors during the soak', errors.length === 0 && !last.errors, errors.slice(0, 3).join(' | '));
  expect(`JS heap grew less than 60% after the 2-minute mark (${base.heap} -> ${last.heap} MB)`, last.heap <= base.heap * 1.6);
  expect(`textures bounded (${base.textures} -> ${last.textures})`, last.textures <= base.textures + 40);
  expect(`geometries bounded (${base.geometries} -> ${last.geometries})`, last.geometries <= base.geometries + 120);
  expect(`programs bounded (${base.programs} -> ${last.programs})`, last.programs <= base.programs + 10);
  expect(`entity count stable (${samples[0].entities} -> ${last.entities})`, Math.abs(last.entities - samples[0].entities) <= 2);
  await browser.close().catch(() => {});
  console.log(failures.length ? `SOAK TEST FAILED (${failures.length})` : 'SOAK TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})();
