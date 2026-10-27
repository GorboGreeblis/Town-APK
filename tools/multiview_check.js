// Multiview equivalence check (experiment "multiview", NOTES 65): renders the same frame of the game both
// ways, in one synchronous step so nothing moves in between, and compares each eye pixel for pixel.
//   - multiview: both eyes in one pass into a two-slice texture array (the experiment's path);
//   - classic: each eye drawn separately, side by side in one texture (the release path).
// Multiview is the release path since 3.15.34 (the classic path stays as the fallback, used here for the
// comparison). Both without MSAA (SwiftShader has OVR_multiview2 but not the headset's OCULUS_multiview). Views: the
// spawn, the town centre among the creatures, the garden, and 25 s into the planting Event. Also counts
// the draw calls each way. A pixel counts as different when its channels differ by more than 3 in sum
// (lights for the right eye are rotated in the shader instead of on the CPU: rounding only).
//
//   node tools/multiview_check.js [asset] [--save]      (default: the release asset)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
process.env.GT_MULTIVIEW = '1';
const { boot, reporter, root } = require('./lib/harness');
let file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : null;
const save = process.argv.includes('--save');
if (!file) file = path.join(root, 'tools/android/app/src/main/assets/index.html');
const outDir = path.join(root, 'tools/.runs/multiview');
(async () => {
  const { expect, note, failures } = reporter();
  global.__pageLog = [];
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(2000);
  const live = await page.evaluate(() => ({ plan: window.__gtXR.mvPlan, active: window.__gtXR.mvActive }));
  expect('multiview is planned and live', live.plan === true && live.active === true, JSON.stringify(live));
  if (save) fs.mkdirSync(outDir, { recursive: true });
  const compare = (label) => page.evaluate(({ label, save }) => {
    const D = window.__dbg, O = D.O, C = D.C, B = D.B, X = window.__gtXR, gl = O.getContext(), mv = gl.getExtension('OVR_multiview2');
    const cams = O.xr.getCamera(B).cameras; const W = 320, H = 180;
    const mk2 = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, W, H, 2); const d = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, d); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH24_STENCIL8, W, H, 2); gl.bindTexture(gl.TEXTURE_2D_ARRAY, null); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); mv.framebufferTextureMultiviewOVR(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, 0, 0, 2); mv.framebufferTextureMultiviewOVR(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, d, 0, 0, 2); return { f, t, d }; };
    const mkC = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 2 * W, H); gl.bindTexture(gl.TEXTURE_2D, null); const d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, 2 * W, H); gl.bindRenderbuffer(gl.RENDERBUFFER, null); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, d); return { f, t, d }; };
    const A = window.__mvA || (window.__mvA = mk2()), K = window.__mvK || (window.__mvK = mkC());
    const vp0 = cams.map((c) => c.viewport.clone());
    const renderInto = (fb, multiview) => { X.mvActive = multiview; O.state.bindXRFramebuffer(fb); const calls0 = O.info.render.calls; O.render(C, B); const calls = O.info.render.calls; O.state.bindXRFramebuffer(null); return calls; };
    // multiview: both eyes share one viewport
    cams[0].viewport.set(0, 0, W, H); cams[1].viewport.set(0, 0, W, H);
    const callsMV = renderInto(A.f, true);
    // classic: side by side
    cams[0].viewport.set(0, 0, W, H); cams[1].viewport.set(W, 0, W, H);
    const callsC = renderInto(K.f, false);
    X.mvActive = true; cams.forEach((c, i) => c.viewport.copy(vp0[i]));
    const rd = gl.createFramebuffer(); const read = (eye) => { const a = new Uint8Array(W * H * 4), b = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rd); gl.framebufferTextureLayer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, A.t, 0, eye); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, a); gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, K.t, 0); gl.readPixels(eye * W, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return [a, b]; };
    const eyes = [0, 1].map((eye) => { const [a, b] = read(eye); let n = 0, mx = 0, nz = 0, exact = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); if (d > mx) mx = d; if (d > 3) n++; if (d === 0) exact++; if (b[i] | b[i + 1] | b[i + 2]) nz++; }
      let png = null; if (save) { const cv = document.createElement('canvas'); cv.width = 2 * W; cv.height = H; const cx = cv.getContext('2d'); [a, b].forEach((buf, k) => { const im = cx.createImageData(W, H); for (let y = 0; y < H; y++) im.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(im, k * W, 0); }); png = cv.toDataURL('image/png'); }
      return { eye: eye ? 'right' : 'left', differing: n, pct: +(100 * n / (W * H)).toFixed(3), exactPct: +(100 * exact / (W * H)).toFixed(2), maxChannelSum: mx, lit: +(100 * nz / (W * H)).toFixed(1), png }; });
    gl.deleteFramebuffer(rd); gl.bindFramebuffer(gl.FRAMEBUFFER, null); try { O.state.reset(); } catch (e) {}
    return { label, callsMV, callsC, eyes, glErr: gl.getError() };
  }, { label, save });
  const results = [];
  const run = async (label) => {
    const r = await compare(label); results.push(r);
    for (const e of r.eyes) {
      if (e.png) fs.writeFileSync(path.join(outDir, `${label.replace(/[^\w]+/g, '_')}_${e.eye}.png`), Buffer.from(e.png.split(',')[1], 'base64'));
      note(`${label}, ${e.eye} eye: ${e.exactPct}% of pixels bit-identical, ${e.pct}% differ by more than rounding (max channel sum ${e.maxChannelSum}); ${e.lit}% of the view drawn`);
      expect(`${label}, ${e.eye} eye: the image is not blank`, e.lit > 20, `${e.lit}% drawn`);
      expect(`${label}, ${e.eye} eye: multiview matches the classic path (under 0.05% of pixels beyond rounding)`, e.pct < 0.05, `${e.pct}% (${e.differing} px), max ${e.maxChannelSum}`);
    }
    expect(`${label}: multiview draws at most half as many calls as the classic path`, r.callsMV * 2 <= r.callsC + 2, `multiview ${r.callsMV}, classic ${r.callsC}`);
    expect(`${label}: no GL error`, r.glErr === 0, `error ${r.glErr}`);
  };
  const placeAt = (x, z, yaw) => page.evaluate(([x, z, yaw]) => { const D = window.__dbg; D.At.position.x = x; D.At.position.z = z; window.__fakeXR.pose.yaw = yaw; }, [x, z, yaw]);
  // Flash fix (the author's flashes on pickups and menu hovers, NOTES 67): nothing may make the GPU save and reload a
  // half-drawn multiview frame: no texture upload or copy, mipmap build, pixel read, blit or switch to another
  // framebuffer while a frame draws (the game counts them, tools/lib/xr_multiview.js). Pickups, a dialogue, the
  // shop, a battle panel and the Speech. Runs first, before the comparisons below switch programs to the classic path and back.
  const up = await page.evaluate(async () => {
    const D = window.__dbg, X = window.__gtXR, wait = (ms) => new Promise((r) => setTimeout(r, ms)); const s0 = { ...X.mvStats, inFrameKinds: { ...X.mvStats.inFrameKinds } };
    const b = D.le.list.find((x) => x.visible && !x.userData.taken); if (b) { D.At.position.set(b.position.x, D.At.position.y, b.position.z); await wait(1500); }
    const a = D.ce.list.find((x) => x.visible && !x.userData.taken); if (a) { D.At.position.set(a.position.x, D.At.position.y, a.position.z); await wait(1500); }
    D.qt.open('TEST', '#ffffff', 'Hello there.|Second line.'); await wait(1500); while (D.qt.isOpen) { D.qt.advance(); await wait(300); }
    try { D.ne.open(); await wait(1500); D._t.close(); } catch (e) {}
    try { const m = D.It.all.find((h) => h.def && h.def.name === 'MONTGUMMERY'); D.Dbt.start(m); await wait(2000); D._t.close(); } catch (e) {}
    try { D.Kt.artifacts = 3; D.LIB.talk(); const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); await wait(8000); clearInterval(adv); } catch (e) {}
    await wait(500);
    const s1 = X.mvStats; return { pickups: !!(a && b), preUploads: s1.preUploads - s0.preUploads, inFrame: s1.inFrame - s0.inFrame, kinds: s1.inFrameKinds, programs: s1.programsDuringPlay - s0.programsDuringPlay, names: (s1.newPrograms || []).slice((s0.newPrograms || []).length) };
  });
  note(`pickups, dialogue, shop: ${up.preUploads} texture uploads moved before the frame, ${up.inFrame} while a frame drew ${JSON.stringify(up.kinds)}, ${up.programs} programs compiled`);
  expect('nothing saves and reloads a half-drawn frame (uploads before the frame, no switch, read or blit while it draws), across pickups, dialogue, shop, battle and the Speech', up.preUploads > 0 && up.inFrame === 0, JSON.stringify(up));
  expect('no shader compiled during that play', up.programs === 0, `${up.programs} programs: ${(up.names || []).join(' | ')}`);
  await run('spawn');
  const centre = await page.evaluate(() => { const D = window.__dbg; const es = D.It.all.filter((e) => e.group && e.group.visible !== false); return es.reduce((a, e) => [a[0] + e.group.position.x / es.length, a[1] + e.group.position.z / es.length], [0, 0]); });
  await placeAt(centre[0], centre[1] + 4, 0); await page.waitForTimeout(800); await run('town centre');
  await placeAt(-20, -20, Math.PI * 0.75); await page.waitForTimeout(800); await run('garden');
  const started = await page.evaluate(async () => { const D = window.__dbg, Kt = D.Kt; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250); Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick(); const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await wait(200); await wait(25000); clearInterval(adv); return !!D.me.active; });
  if (started) await run('the Event, 25 s in'); else note('the planting Event did not start');
  // no frame hazard over the whole run (the Event included; the comparisons render outside the game's frames)
  const total = await page.evaluate(() => window.__gtXR.mvStats); expect('no frame hazard over the whole run, the Event included', total.inFrame === 0, JSON.stringify(total.inFrameKinds));
  // the game keeps running in multiview afterwards (no errors, frames advance; software GL is slow after the Event)
  const after = await page.evaluate(async () => { const f0 = window.__fakeXR.frames; await new Promise((r) => setTimeout(r, 6000)); return { frames: window.__fakeXR.frames - f0, active: window.__gtXR.mvActive, err: window.__dbg.O.getContext().getError() }; });
  expect('the game keeps rendering in multiview after the checks', after.frames > 5 && after.active && after.err === 0, JSON.stringify(after));
  const logs = (global.__pageLog || []).filter((m) => /multiview|incomplete/i.test(m));
  note('page log: ' + logs.join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 4).join(' | '));
  await g.close();
  console.log(failures.length ? `MULTIVIEW CHECK FAILED (${failures.length})` : 'MULTIVIEW CHECK PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
