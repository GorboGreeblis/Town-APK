// Uniform budget check (standard tier): every shader program the game compiles must fit the GPU limits of the
// headsets it ships on. Headless Chromium allows 4096 vertex uniform vectors, so an overflow on a Quest (256,
// tools/fakexr.js S.DEVICES; the game logs the real values at boot) would never show here: on the headset the
// program fails to link, the batcher switches itself off and the draw calls jump. This boots the game with a
// device profile (the batcher and multiview size themselves from those limits, as on the device), runs the town,
// a battle panel and the planting Event so the light and Event variants are compiled too, then counts each
// program's uniform rows per stage (active uniforms, matrices as 2-4 rows, array elements one row each: an upper
// bound of what the driver's packing needs) and its texture samplers per stage.
// Runs twice: multiview (the release path) and the classic fallback (a headset without OCULUS_multiview).
//
//   GT_DEVICE=quest3s node tools/uniform_budget.js [file]     (default device: quest3s; quest2 is not supported
//   since 3.15.34 but its profile stays for checks)
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
if (!process.env.GT_DEVICE) process.env.GT_DEVICE = 'quest3s';
if (process.argv.includes('--child')) return child();
// parent: run the two modes in separate processes (the harness reads GT_MULTIVIEW at boot)
let failed = 0;
for (const mode of ['multiview', 'classic']) {
  const env = { ...process.env, GT_MULTIVIEW: mode === 'multiview' ? '1' : '' };
  const r = spawnSync(process.execPath, [__filename, file, '--child', mode], { env, encoding: 'utf8', timeout: 900000 });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.status !== 0) failed++;
}
console.log(failed ? `UNIFORM BUDGET FAILED (${failed} mode(s))` : 'UNIFORM BUDGET PASSED');
process.exit(failed ? 1 : 0);

async function child() {
  const mode = process.argv[process.argv.indexOf('--child') + 1];
  const { boot, reporter } = require('./lib/harness');
  const { expect, note, failures } = reporter();
  global.__pageLog = [];
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(1500);
  console.log(`\n== ${process.env.GT_DEVICE}, ${mode}`);
  // compile the variants: a battle panel, the planting Event (night, glow light), a pickup
  await page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    try { const b = D.le.list.find((x) => x.visible && !x.userData.taken); if (b) { D.At.position.set(b.position.x, D.At.position.y, b.position.z); await wait(1200); } } catch (e) {}
    try { const m = D.It.all.find((h) => h.def && h.def.name === 'MONTGUMMERY'); D.Dbt.start(m); await wait(1500); D._t.close(); } catch (e) {}
    Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200);
    await wait(20000); clearInterval(adv);
  });
  const r = await page.evaluate(() => {
    const D = window.__dbg, O = D.O, gl = O.getContext(), X = window.__gtXR;
    const lim = { vu: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS), fu: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS), vt: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS), ft: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) };
    const rows = (t) => ({ [gl.FLOAT_MAT4]: 4, [gl.FLOAT_MAT3]: 3, [gl.FLOAT_MAT2]: 2, [gl.FLOAT_MAT2x3]: 2, [gl.FLOAT_MAT2x4]: 2, [gl.FLOAT_MAT3x2]: 3, [gl.FLOAT_MAT3x4]: 3, [gl.FLOAT_MAT4x2]: 4, [gl.FLOAT_MAT4x3]: 4 }[t] || 1);
    const isSampler = (t) => [gl.SAMPLER_2D, gl.SAMPLER_CUBE, gl.SAMPLER_3D, gl.SAMPLER_2D_ARRAY, gl.SAMPLER_2D_SHADOW, gl.SAMPLER_CUBE_SHADOW, gl.SAMPLER_2D_ARRAY_SHADOW, gl.INT_SAMPLER_2D, gl.UNSIGNED_INT_SAMPLER_2D].includes(t);
    const out = [];
    for (const p of O.info.programs) {
      const prog = p.program; if (!prog) continue;
      const sh = gl.getAttachedShaders(prog) || []; let vs = '', fs = '';
      for (const s of sh) { const src = gl.getShaderSource(s) || ''; if (gl.getShaderParameter(s, gl.SHADER_TYPE) === gl.VERTEX_SHADER) vs = src; else fs = src; }
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) || 0; const st = { v: 0, f: 0, vs: 0, fs: 0, big: [] };
      const uses = (src, base) => (src.match(new RegExp('\\b' + base + '\\b', 'g')) || []).length >= 2;
      const per = {};
      for (let i = 0; i < n; i++) {
        const u = gl.getActiveUniform(prog, i); const base = u.name.replace(/\[.*$/, '').split('.')[0];
        const inV = uses(vs, base), inF = uses(fs, base);
        if (isSampler(u.type)) { if (inV) st.vs += u.size; if (inF) st.fs += u.size; continue; }
        const r = rows(u.type) * u.size; if (inV) st.v += r; if (inF) st.f += r; per[base] = (per[base] || 0) + r;
      }
      st.big = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ' ' + v);
      out.push({ name: p.name, mv: /GC_MULTIVIEW/.test(vs), batch: /gcPart/.test(vs), ...st });
    }
    return { lim, N: D.gcEB.N, batches: D.gcEB.list.length, batchingOff: !!D.gcEB.off, mvPlan: X.mvPlan, mvActive: X.mvActive, programs: out };
  });
  const p = r.programs;
  note(`limits: vertex ${r.lim.vu} uniform vectors, fragment ${r.lim.fu}, samplers ${r.lim.vt}/${r.lim.ft}; batcher parts per batch ${r.N}, ${r.batches} batches; multiview planned ${r.mvPlan}, live ${r.mvActive}`);
  const worstV = p.slice().sort((a, b) => b.v - a.v)[0], worstF = p.slice().sort((a, b) => b.f - a.f)[0];
  note(`${p.length} programs (${p.filter((x) => x.mv).length} multiview, ${p.filter((x) => x.batch).length} batch); heaviest vertex: ${worstV.name} ${worstV.v} rows (${worstV.big.join(', ')}); heaviest fragment: ${worstF.name} ${worstF.f} rows`);
  const overV = p.filter((x) => x.v > r.lim.vu), overF = p.filter((x) => x.f > r.lim.fu), overS = p.filter((x) => x.vs > r.lim.vt || x.fs > r.lim.ft);
  expect(`${mode}: every program's vertex uniforms fit ${r.lim.vu} vectors (worst ${worstV.v}, margin ${r.lim.vu - worstV.v})`, overV.length === 0, overV.map((x) => `${x.name} ${x.v}`).join(' | '));
  expect(`${mode}: every program's fragment uniforms fit ${r.lim.fu} vectors (worst ${worstF.f})`, overF.length === 0, overF.map((x) => `${x.name} ${x.f}`).join(' | '));
  expect(`${mode}: every program's samplers fit the texture units`, overS.length === 0, overS.map((x) => `${x.name} ${x.vs}/${x.fs}`).join(' | '));
  expect(`${mode}: the batcher stayed on`, !r.batchingOff && r.batches > 50, `off ${r.batchingOff}, ${r.batches} batches`);
  if (mode === 'multiview') expect('multiview: planned and live with the device limits', r.mvPlan === true && r.mvActive === true, `planned ${r.mvPlan}, live ${r.mvActive}`);
  const gpu = (global.__pageLog || []).find((m) => /gpu: /.test(m)); if (gpu) note(gpu.replace(/^\d+ms /, ''));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  process.exit(failures.length ? 1 : 0);
}
