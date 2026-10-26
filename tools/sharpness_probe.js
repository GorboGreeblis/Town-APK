// Render sharpness report (graphical pass, T13): what decides how crisp the
// picture is on the headset, read from the built game. Render scale per quality
// level (the projection layer's scaleFactor), fixed foveation per level, the
// renderer's pixel ratio and antialias, and every texture's filtering: size,
// mipmaps, min/mag filters, anisotropy. Blurry textures at grazing angles come
// from anisotropy 1 with mipmaps; shimmering ones from no mipmaps on large
// textures; soft edges from a render scale below 1 or high foveation.
//
//   node tools/sharpness_probe.js [file]
const path = require('path');
const { boot } = require('./lib/harness');

const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const g = await boot({ file, vr: true });
  const r = await g.page.evaluate(() => {
    const D = window.__dbg, O = D.O, C = D.C, t = D.t, e = (D.we && D.we.cfg) || null;
    const cap = O.capabilities;
    const out = { renderer: { pixelRatio: O.getPixelRatio(), antialias: !!O.getContextAttributes().antialias, maxAnisotropy: cap.getMaxAnisotropy(), isWebGL2: cap.isWebGL2, maxSamples: cap.maxSamples } };
    // The XR tuning object lives in the VR module; the entry routine reads e.quality / e.foveation from it.
    try { const src = Function.prototype.toString.call(D.Ge ? () => {} : () => {}); } catch (_) {}
    out.quality = { levels: null, foveation: null, current: D.Ge ? D.Ge.level : null, governor: D.Ge ? { budget: D.Ge.budget, rebuilds: D.Ge.rebuilds, sos: D.Ge.sos } : null };
    try { const s = D.O.xr.getSession(); const bl = s && s.renderState.baseLayer; out.xr = { fbScale: bl && bl.__gbScale, fixedFoveation: bl && bl.fixedFoveation, w: bl && bl.framebufferWidth, h: bl && bl.framebufferHeight, shim: !!(window.__gtXR && window.__gtXR.shim), msaa: window.__gtXR && window.__gtXR.shim ? window.__gtXR.shim.samples : null }; } catch (err) { out.xr = { error: String(err) }; }
    // Textures in use by visible materials.
    const tex = new Map();
    C.traverse((o) => {
      if (!o.isMesh && !o.isSprite && !o.isPoints) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m) for (const k of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'bumpMap']) { const tx = m[k]; if (tx && tx.image) tex.set(tx.uuid, { tx, k, who: o.name || (o.parent && o.parent.name) || o.type }); }
    });
    const F = { 9728: 'NEAREST', 9729: 'LINEAR', 9984: 'NEAREST_MIPMAP_NEAREST', 9985: 'LINEAR_MIPMAP_NEAREST', 9986: 'NEAREST_MIPMAP_LINEAR', 9987: 'LINEAR_MIPMAP_LINEAR' };
    const rows = []; const hist = { noMip: 0, aniso1: 0, large: 0, total: 0 };
    for (const { tx, k, who } of tex.values()) {
      const w = tx.image.width || tx.image.videoWidth || 0, h = tx.image.height || 0;
      const mip = tx.generateMipmaps && tx.minFilter !== 9729 && tx.minFilter !== 9728;
      hist.total++; if (!mip) hist.noMip++; if ((tx.anisotropy || 1) <= 1) hist.aniso1++; if (w >= 512) hist.large++;
      rows.push({ who, slot: k, w, h, mip, min: F[tx.minFilter] || tx.minFilter, mag: F[tx.magFilter] || tx.magFilter, aniso: tx.anisotropy || 1, pot: (w & (w - 1)) === 0 && (h & (h - 1)) === 0 });
    }
    rows.sort((a, b) => b.w * b.h - a.w * a.h);
    out.textures = { hist, largest: rows.slice(0, 25), noMipLarge: rows.filter((r) => !r.mip && r.w >= 256).slice(0, 25) };
    out.tuning = { far: t.far, camera: t.camera };
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await g.close();
})().catch((e) => { console.error(e); process.exit(1); });
