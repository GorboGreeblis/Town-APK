// Texture census (standard tier, pass/fail): no texture is made during play (F-B29, F-B30, NOTES 82). The author's
// flashes came where the game made a texture on the spot: an emote in a new colour (speaking to Nextessa, dance
// battles, planting), the pizza at the start of the Event, Montgummery's screen faces, the townsfolk's speech
// bubbles. After loading, this plays those situations and records every canvas the game creates and every GL texture
// it allocates (with the game code that did it); either during play fails the test. It also lays out every text
// exchange's two lines as the bubble does and fails if one needs a bubble height the loading pool does not hold.
//
//   node tools/texture_census.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false, renderEvery: 4 });
  const page = g.page;
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const D = window.__dbg, gl = D.O.getContext(), t0 = performance.now();
    const where = () => new Error().stack.split('\n').slice(3, 7).map((l) => l.trim().replace(/\(?https?:\/\/[^/]+\//, '(')).join(' < ');
    window.__tc = { step: 'start', canvases: [], textures: [] };
    const mark = (list, what) => list.push({ t: ((performance.now() - t0) / 1000).toFixed(1), step: window.__tc.step, what, where: where() });
    // a canvas created after loading (named by its size when it is first drawn into); redrawing one made at load is fine
    const ce = document.createElement.bind(document), gc = HTMLCanvasElement.prototype.getContext;
    document.createElement = function (tag) { const el = ce.apply(document, arguments); if (String(tag).toLowerCase() === 'canvas') { const rec = { t: ((performance.now() - t0) / 1000).toFixed(1), step: window.__tc.step, what: 'canvas', where: where() }; window.__tc.canvases.push(rec); el.__tcRec = rec; } return el; };
    HTMLCanvasElement.prototype.getContext = function () { if (this.__tcRec && this.__tcRec.what === 'canvas') this.__tcRec.what = `canvas ${this.width}x${this.height}`; return gc.apply(this, arguments); };
    // a GL texture allocated after loading, named by its first upload (size and source); the fake headset's own eye
    // textures (a layer swap on the headset makes its own) are not the game's
    const ct = gl.createTexture.bind(gl), fresh = new Map(), ti = gl.texImage2D.bind(gl);
    gl.createTexture = function () { const t = ct(); const w = where(); if (!/XRWebGLBindingFake/.test(new Error().stack)) { const rec = { t: ((performance.now() - t0) / 1000).toFixed(1), step: window.__tc.step, what: 'GL texture', where: w }; window.__tc.textures.push(rec); fresh.set(t, rec); } return t; };
    gl.texImage2D = function () { const b = gl.getParameter(gl.TEXTURE_BINDING_2D), rec = b && fresh.get(b); if (rec) { fresh.delete(b); const a = arguments, src = a[a.length - 1]; rec.what = 'GL texture ' + (src && src.width ? src.width + 'x' + src.height + ' ' + (src.tagName || src.constructor.name) : a[3] + 'x' + a[4]); } return ti.apply(null, arguments); };
  });
  const r = await page.evaluate(async () => {
    const D = window.__dbg, V = D.VIGS, TC = window.__tc, wait = (ms) => new Promise((r) => setTimeout(r, ms)), out = { steps: [] };
    // every shader program made during play, with the step it appeared in (a compile in a frame is a hitch or a flash)
    const progSeen = new Set(D.O.info.programs.map((p) => p.id)); out.newProgs = [];
    const progAll = new Map(D.O.info.programs.map((p) => [p.id, p]));
    const progCheck = () => { for (const p of D.O.info.programs) if (!progSeen.has(p.id)) {
      progSeen.add(p.id); progAll.set(p.id, p);
      // who draws with it, and how its key differs from the closest program of its kind (D2's method)
      const users = []; D.C.traverse((o) => { for (const m of (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [])) { const pr = D.O.properties.get(m); if (pr && (pr.currentProgram === p || pr.program === p)) { const w = o.getWorldPosition(new THREE.Vector3()); users.push(m.type + (m.map ? '+map' : '') + (m.transparent ? ' transparent' : '') + ' at ' + w.x.toFixed(1) + ',' + w.y.toFixed(1) + ',' + w.z.toFixed(1)); } } });
      const diff = [...progAll.values()].filter((q) => q !== p && q.name === p.name).map((q) => { const a = p.cacheKey.split(','), b = q.cacheKey.split(','), d = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) d.push(i + ':' + b[i] + '->' + a[i]); return d; }).sort((x, y) => x.length - y.length)[0];
      out.newProgs.push(TC.step + ': ' + p.name + ' [' + (diff ? diff.slice(0, 6).join(' ') : 'no program of its kind') + '] used by ' + (users.slice(0, 3).join('; ') || 'nothing in the scene now'));
    } };
    const progTimer = setInterval(progCheck, 100);
    const step = (s) => { progCheck(); TC.step = s; out.steps.push(s); };
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const near = (e, d = 1.4) => { D.At.position.x = e.group.position.x + d; D.At.position.z = e.group.position.z; };
    const gwait = async (cond, gameS, wallS = 300) => { const g0 = D.Re.t, w0 = performance.now(); while (!cond() && D.Re.t - g0 < gameS && performance.now() - w0 < wallS * 1000) await wait(100); return cond(); };
    step('pickups');
    for (const L of [D.le.list, D.ce.list]) { const p = L.find((x) => x.visible && !x.userData.taken); if (p) { D.At.position.set(p.position.x, D.At.position.y, p.position.z); await wait(1500); } }
    step('shop'); try { D.ne.open(); await wait(1500); D._t.close(); } catch (e) {}
    // every character spoken to (each shows its emote)
    step('speaking to everyone');
    for (const e of D.It.all.filter((x) => x.group && x.def)) { try { near(e); await wait(300); const a = D.xe.actionsFor(e) || []; const t = a.find((x) => /talk|chat|hi|hello|greet/i.test(x.label || '')) || a[0]; if (t) t.run(); await gwait(() => !D.qt.isOpen, 20, 30); } catch (err) {} }
    step('dance battle'); try { const m = D.It.all.find((h) => h.def && h.def.name === 'MONTGUMMERY'); near(m); D.Dbt.start(m); await wait(2500); const st = D._t.state; const items = (st && st.items) || []; for (let k = 0; k < 6 && items.length; k++) { const it = items[k % items.length]; if (it && it.onClick) it.onClick(); await wait(500); } D._t.close(); } catch (e) {}
    step('phone call and Nextessa');
    try { D.ue.call(); await gwait(() => !!D.ue.courier, 45, 90); const n = D.ue.courier; out.courier = !!n; if (n) { near(n); await wait(500); const a = D.xe.actionsFor(n) || []; for (const x of a.slice(0, 2)) { x.run(); await gwait(() => !D.qt.isOpen, 20, 30); } await gwait(() => !D.ue.courier, 60, 120); } } catch (e) { out.courierErr = String(e); }
    step('text exchanges'); out.vigs = 0;
    try { const m = V.lineUp(); const town = V.all.filter((pk) => pk[0] !== 'SL' && pk[1] !== 'SL'); for (const pk of town.filter((_, i) => i % 7 === 0).slice(0, 8)) { const A = m[pk[0]], B = m[pk[1]]; if (!A || !B) continue; D.xe.lastTarget = null; await gwait(() => !A.busy && !B.busy && !D.qt.isOpen && !V.playing(), 30, 60); if (V.play(A, B, true)) { out.vigs++; await gwait(() => !V.playing(), 12, 120); } else (out.vigNo = out.vigNo || []).push(pk[0] + pk[1] + (V.playing() ? ' (one already playing)' : '') + (V.computeInCave() ? ' (player in the Cave)' : '') + (A.busy || B.busy ? ' (busy: ' + (A.busy || B.busy) + ')' : '')); } } catch (e) { out.vigErr = String(e); }
    // the Speech: Sparkakus with the three Artifacts (the Gem assembled with the glue bottle)
    step('the Speech');
    try { const Kt = D.Kt; Kt.artifacts = 3; Kt.rewards.artifacts = false; if (D.st && D.st.group) { D.At.position.x = D.st.group.position.x + 1.4; D.At.position.z = D.st.group.position.z; } await wait(500); D.LIB.talk(); await gwait(() => Kt.rewards.artifacts, 120, 900); /* 18 game s; software rendering runs ~1/6 of real time */ out.speech = !!Kt.rewards.artifacts; await wait(3000); } catch (e) { out.speechErr = String(e); }
    step('the Event');
    try { const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(300); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); await gwait(() => D.me.active, 10, 30); out.event = !!D.me.active; await gwait(() => !D.me.active, 240, 900); out.eventEnded = !D.me.active; } catch (e) { out.eventErr = String(e); }
    clearInterval(adv); step('done (the census\'s own measuring)'); clearInterval(progTimer);
    // every text exchange's lines laid out as the bubble lays them out: their heights must be in the loading pool
    const meas = document.createElement('canvas').getContext('2d'); meas.font = 'bold 34px sans-serif';
    const rowsOf = (text) => { const rows = []; let line = ''; for (const w of String(text).split(' ')) { const t = line ? line + ' ' + w : w; meas.measureText(t).width > 440 && line ? (rows.push(line), line = w) : line = t; } line && rows.push(line); return rows.length; };
    const heights = new Set(); for (const pk of V.all) for (const k of [3, 4]) if (pk[k]) heights.add(66 + 42 * rowsOf(pk[k]));
    out.heights = [...heights].sort((a, b) => a - b);
    out.pool = window.__gtBb ? Object.keys(window.__gtBb) : null;
    out.canvases = TC.canvases; out.textures = TC.textures;
    return out;
  });
  note(`played: ${r.steps.join(', ')}; Nextessa came: ${r.courier}; text exchanges: ${r.vigs}${r.vigNo ? ' (refused: ' + r.vigNo.join(', ') + ')' : ''}${r.vigErr ? ' (error: ' + r.vigErr + ')' : ''}; the Speech: ${r.speech}; the Event ran: ${r.event} (to its end: ${r.eventEnded})`);
  note('shader programs made during play: ' + (r.newProgs && r.newProgs.length ? r.newProgs.join(' | ') : 'none'));
  for (const k of ['courierErr', 'vigErr', 'speechErr', 'eventErr']) if (r[k]) note(`${k}: ${r[k]}`);
  const play = (l) => l.filter((x) => !/^done/.test(x.step)); r.canvases = play(r.canvases); r.textures = play(r.textures);
  const show = (l) => l.slice(0, 12).map((x) => `${x.t}s [${x.step}] ${x.what}  ${x.where}`).join('\n      ');
  expect('no canvas is created during play (every emote, face, bubble and print is made while loading)', r.canvases.length === 0, '\n      ' + show(r.canvases));
  expect('no GL texture is allocated during play', r.textures.length === 0, '\n      ' + show(r.textures));
  expect('the situations ran: Nextessa came, two or more text exchanges played, the Speech, the Event to its end (Backpacka\'s show)', r.courier && r.vigs >= 2 && r.speech && r.event && r.eventEnded, JSON.stringify({ courier: r.courier, vigs: r.vigs, speech: r.speech, event: r.event, ended: r.eventEnded }));
  const pooled = r.pool ? new Set(r.pool.map((k) => +k.split('|')[1])) : null;
  const missing = pooled ? r.heights.filter((h) => !pooled.has(h)) : r.heights;
  note(`speech bubble heights the exchanges need: ${r.heights.join(', ')}; pooled at load: ${pooled ? [...pooled].sort((a, b) => a - b).join(', ') : 'none (a build before F-B30)'}`);
  expect('every text exchange line fits a bubble height made at load', missing.length === 0, 'missing ' + missing.join(', '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `TEXTURE CENSUS FAILED (${failures.length})` : 'TEXTURE CENSUS PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
