/* Multiview (experiment "multiview", tools/apply_entry_fix.py; NOTES 65). Embedded in the head script
   after the layers shim. Both eyes are drawn in one pass into a texture-array projection layer
   (OVR_multiview2; OCULUS_multiview for the 4x MSAA path on the headset), so every draw call is
   issued once instead of twice. The bundled three.js is patched to pick each eye's matrices in the
   shader (the right eye's model-view and normal matrices are computed on the CPU exactly as before).
   - mvPlanFor(gl): decided once, at the first call during the boot: layers session, WebGL 2,
     OVR_multiview2, and OCULUS_multiview when the context is antialiased (headless tests set
     __fakeXR.multiview to run multiview without MSAA).
   - mvProg(renderer): whether programs compiled now are multiview programs: while presenting with
     the multiview layer; during the loading warm-up (so VR entry compiles nothing); never for a
     render with XR switched off (the test tools' off-screen renders).
   - mvWrap(renderer): during the loading warm-up, renders go into a tiny multiview target (draws
     with multiview programs need one), so the warm-up uploads exactly what VR uses. */
X.mvPlanFor = function (g) {
  if (X.mvPlan !== undefined) return X.mvPlan;
  var ok = false, why = "";
  try {
    var W2 = typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext;
    var s = X.session && X.session.__real;
    var lm = !!(s && X.layersMode(s));
    var mv = W2 && lm && g.getExtension("OVR_multiview2");
    var aa = !!(g.getContextAttributes && g.getContextAttributes().antialias);
    var ms = mv && aa ? g.getExtension("OCULUS_multiview") : null;
    var force = !!(window.__fakeXR && window.__fakeXR.multiview);
    ok = !!(mv && (!aa || ms || force));
    why = "webgl2 " + W2 + ", layers " + lm + ", OVR_multiview2 " + !!mv + ", antialias " + aa + ", OCULUS_multiview " + !!ms + (force ? ", test override" : "");
  } catch (e) { ok = false; why = String(e); }
  X.mvPlan = ok;
  __gtLog("multiview " + (ok ? "planned" : "not used") + " (" + why + ")");
  return ok;
};
X.mvProg = function (r) {
  if (X.mvPlan === undefined) { try { X.mvPlanFor(r.getContext()); } catch (e) { X.mvPlan = false; } }
  if (!X.mvPlan) return false;
  var xr = r.xr;
  if (xr && xr.isPresenting) return !!(xr.enabled && X.mvActive);
  return !X.mvDone;
};
X.mvScratchFor = function (r) {
  if (!X.mvProg(r) || (r.xr && r.xr.isPresenting)) return null;
  if (X.mvScratch) return X.mvScratch;
  var g = r.getContext(), mv = g.getExtension("OVR_multiview2");
  var t = g.createTexture(), d = g.createTexture(), fb = g.createFramebuffer();
  g.bindTexture(g.TEXTURE_2D_ARRAY, t); g.texStorage3D(g.TEXTURE_2D_ARRAY, 1, g.RGBA8, 4, 4, 2);
  g.bindTexture(g.TEXTURE_2D_ARRAY, d); g.texStorage3D(g.TEXTURE_2D_ARRAY, 1, g.DEPTH24_STENCIL8, 4, 4, 2);
  g.bindTexture(g.TEXTURE_2D_ARRAY, null);
  g.bindFramebuffer(g.FRAMEBUFFER, fb);
  mv.framebufferTextureMultiviewOVR(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, t, 0, 0, 2);
  mv.framebufferTextureMultiviewOVR(g.FRAMEBUFFER, g.DEPTH_STENCIL_ATTACHMENT, d, 0, 0, 2);
  g.bindFramebuffer(g.FRAMEBUFFER, null);
  try { r.state.reset(); } catch (e) {}
  return (X.mvScratch = fb);
};
X.mvWrap = function (r) {
  var r0 = r.render;
  r.render = function () {
    var fb = X.mvScratchFor(r);
    if (!fb) return r0.apply(r, arguments);
    r.state.bindXRFramebuffer(fb);
    try { return r0.apply(r, arguments); } finally { r.state.bindXRFramebuffer(null); }
  };
};
