#!/usr/bin/env node
/**
 * Visit system reproduction, aimed at the Mushroom (`drifter`), whose desk is
 * raised: hosting or visiting lowers his stand height for the walk and must
 * restore it on every exit path.
 *
 * Scenarios (fake VR session, real-time simulation):
 *   host-complete      Hennrick visits the Sheriff; visit runs to its end
 *   visitor-complete   the Sheriff visits Anomalee; runs to its end
 *   host-drop-out      visit interrupted (host made busy) while walking out
 *   host-drop-meet     interrupted during the meeting
 *   visitor-drop-out   visitor interrupted while walking out
 *   visitor-drop-back  visitor interrupted while walking back
 * Each ends with: Mushroom back on his desk (d < 0.2, y ~ standY) within the
 * budget and his pattern height restored.
 *
 * Usage: node tools/test_visits.js [file.html] [budgetSeconds] [scenario[,scenario]|all]
 */
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : undefined;
const BUDGET_S = Number(process.argv[3] || 240);
const ONLY = (process.argv[4] || 'all').split(',');   // scenario names, or all

(async () => {
  const g = await boot({ file, vr: true });
  const { page } = g;
  const { failures, expect, note } = reporter();
  console.log(`booted in ${g.bootS.toFixed(1)}s, presenting after ${g.presentS.toFixed(1)}s`);

  const scenarios = [
    { name: 'host-complete', v: 'gratelet', h: 'drifter' },
    { name: 'visitor-complete', v: 'drifter', h: 'blinker' },
    { name: 'host-drop-out', v: 'gratelet', h: 'drifter', dropAt: 'out', dropWho: 'h' },
    { name: 'host-drop-meet', v: 'gratelet', h: 'drifter', dropAt: 'meet', dropWho: 'h' },
    { name: 'visitor-drop-out', v: 'drifter', h: 'blinker', dropAt: 'out', dropWho: 'v' },
    { name: 'visitor-drop-back', v: 'drifter', h: 'blinker', dropAt: 'back', dropWho: 'v' },
  ].filter((s) => ONLY.includes('all') || ONLY.includes(s.name));

  for (const sc of scenarios) {
    const r = await page.evaluate(async ({ sc, budget }) => {
      const D = window.__dbg, J = D.JGP, m = D.It.byId.drifter, standY = m.def.pattern[1].y, home = m.def.at;
      const dist = () => Math.hypot(m.group.position.x - home[0], m.group.position.z - home[1]);
      const out = { startedAfterS: null, stages: [], dropped: false, yAtDrop: null, patY: [] };
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      // Make the pair free and ask the scheduler for exactly this visit.
      for (const id of [sc.v, sc.h]) { const e = D.It.byId[id]; if (e) { e.busy = null; e.nearPlayer = false; } }
      D.At.position.set(home[0] + 14, D.At.position.y, home[1] + 14);     // player out of greeting range
      J.visitAt(D.Re.t, sc.v, sc.h);
      const t0 = performance.now();
      const mine = () => (J.visits().all || []).find((q) => q.v === sc.v && q.h === sc.h);
      while (!mine() && performance.now() - t0 < 60000) await sleep(250);
      if (!mine()) return Object.assign(out, { error: 'visit never started; visits=' + JSON.stringify(J.visits().all) });
      out.startedAfterS = +((performance.now() - t0) / 1000).toFixed(1);
      let last = null;
      while (performance.now() - t0 < budget * 1000) {
        await sleep(250);
        const q = mine();
        const stage = q ? q.stage : 'ended';
        if (stage !== last) { out.stages.push(stage); last = stage; }
        if (q && sc.dropAt && stage === sc.dropAt && !out.dropped) {
          await sleep(1500);                                   // let the stage progress a little (hop in flight, etc.)
          const who = D.It.byId[sc.dropWho === 'h' ? sc.h : sc.v];
          out.yAtDrop = +m.group.position.y.toFixed(2); out.patYAtDrop = m.def.pattern[1].y;
          who.busy = 'test-interrupt';                          // the visit system drops the visit next step
          await sleep(1000);
          who.busy = null;
          out.dropped = true;
        }
        if (!q && last === 'ended') {
          // visit over: wait for him to be back on the desk
          const home1 = dist() < 0.2 && Math.abs(m.group.position.y - standY) < 0.08;
          if (home1) break;
        }
      }
      out.seconds = +((performance.now() - t0) / 1000).toFixed(1);
      out.final = { d: +dist().toFixed(2), y: +m.group.position.y.toFixed(2), patY: m.def.pattern[1].y, goHome: !!m.goHome, hosting: !!m.hosting, visiting: !!m.visiting, busy: m.busy };
      out.ok = out.final.d < 0.2 && Math.abs(out.final.y - standY) < 0.08 && out.final.patY === standY;
      return out;
    }, { sc, budget: BUDGET_S });
    expect(`${sc.name}: visit ran (${(r.stages || []).join(' > ')}) and Mushroom is back on his desk at height`, r.ok === true, r.error || JSON.stringify(r.final) + ` in ${r.seconds}s` + (sc.dropAt ? ` (dropped at ${sc.dropAt}, y=${r.yAtDrop}, patY=${r.patYAtDrop})` : ''));
  }
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `VISITS TEST FAILED (${failures.length})` : 'VISITS TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('VISITS TEST ERROR', e); process.exit(1); });
