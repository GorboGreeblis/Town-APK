// Garden Event render cost (report, T12): what the Event adds to the frame. Starts the Event the way the
// hitch probe does (Stone + Seeds + Snacks, then "Yes") and samples the renderer every 2 s for 90 s:
// draw calls, triangles, points, visible meshes, visible transparent objects and lights, with the
// scene's heaviest visible objects at a few points in time. The GPU cost on the headset follows these
// counts (fill rate for transparent objects and points, vertices for triangles).
//
//   node tools/event_probe.js [file] [seconds]
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const seconds = +(process.argv[3] || 90);
(async () => {
  const g = await boot({ file, vr: true });
  await new Promise((r) => setTimeout(r, 3000));
  const r = await g.page.evaluate(async (seconds) => {
    const D = window.__dbg, O = D.O, C = D.C, T = window.THREE, Kt = D.Kt;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const snap = (top) => {
      const s = { calls: O.info.render.calls, tris: O.info.render.triangles, points: O.info.render.points, lines: O.info.render.lines, meshes: 0, transparent: 0, lights: 0, pointsObjs: 0, sprites: 0 };
      const heavy = [];
      C.traverse((o) => {
        if (o.isLight && o.visible) s.lights++;
        if (!o.visible) return; let p = o.parent; while (p) { if (!p.visible) return; p = p.parent; }
        if (o.isPoints) { s.pointsObjs++; const n = o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; heavy.push({ kind: 'points', n, name: o.name || (o.userData && Object.keys(o.userData)[0]) || '', op: o.material.opacity }); return; }
        if (o.isSprite) { s.sprites++; return; }
        if (!o.isMesh) return; s.meshes++;
        const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.transparent && m.visible !== false) s.transparent++;
        const ge = o.geometry, n = (ge.index ? ge.index.count : (ge.attributes.position ? ge.attributes.position.count : 0)) / 3;
        if (top && n > 3000) { const bb = new T.Box3().setFromObject(o); const sz = bb.getSize(new T.Vector3()); heavy.push({ kind: 'mesh', n: Math.round(n), mat: m ? m.type.replace('Material', '') + (m.transparent ? '/T' : '') + (m.map ? '/map' : '') : '?', size: sz.toArray().map((v) => +v.toFixed(1)), batch: !!ge.attributes.gcPart, inst: o.isInstancedMesh ? o.count : 0 }); }
      });
      if (top) s.heavy = heavy.sort((a, b) => b.n - a.n).slice(0, 14);
      return s;
    };
    const out = { before: snap(true), samples: [] };
    Kt.rewards.stone = true; Kt.rewards.seeds = true; Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200);
    if (!D.me.active) return { error: 'event did not start', out };
    const start = performance.now();
    for (let t = 0; t < seconds; t += 2) { await wait(2000); const s = snap(t === 30 || t === 60); s.t = Math.round((performance.now() - start) / 1000); out.samples.push(s); }
    out.governor = D.Ge ? { level: D.Ge.level, emaMs: +D.Ge.ema.toFixed(1) } : null;
    return out;
  }, seconds);
  if (r.error) { console.log(r.error); await g.close(); process.exit(1); }
  const f = (s) => `calls ${s.calls} tris ${s.tris} points ${s.points} meshes ${s.meshes} transparent ${s.transparent} lights ${s.lights} pointsObjs ${s.pointsObjs} sprites ${s.sprites}`;
  console.log('before the Event: ' + f(r.before));
  for (const h of r.before.heavy || []) console.log('   heavy: ' + JSON.stringify(h));
  for (const s of r.samples) { console.log(`t+${String(s.t).padStart(3)}s: ` + f(s)); for (const h of s.heavy || []) console.log('   heavy: ' + JSON.stringify(h)); }
  console.log('governor: ' + JSON.stringify(r.governor));
  await g.close();
})().catch((e) => { console.error(e); process.exit(1); });
