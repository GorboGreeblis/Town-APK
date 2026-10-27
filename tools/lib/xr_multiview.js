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
  /* The GPU's real limits and name, once per boot: the test tools assume Quest values (tools/fakexr.js
     S.DEVICES), and this line is how a headset run confirms or corrects them. */
  try {
    var dri = g.getExtension("WEBGL_debug_renderer_info"), lim = ["MAX_VERTEX_UNIFORM_VECTORS", "MAX_FRAGMENT_UNIFORM_VECTORS", "MAX_VARYING_VECTORS", "MAX_TEXTURE_IMAGE_UNITS", "MAX_VERTEX_TEXTURE_IMAGE_UNITS", "MAX_SAMPLES", "MAX_TEXTURE_SIZE"].map(function (k) { return k.replace("MAX_", "").toLowerCase() + "=" + g.getParameter(g[k]); }).join(" ");
    __gtLog("gpu: " + (dri ? g.getParameter(dri.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) + "; " + lim + "; device " + (((navigator.userAgent || "").match(/Quest[^;)]*/) || ["unknown"])[0]));
  } catch (e) {}
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
/* Flash fix (the author saw full-screen flashes on pickups and menu hovers): three.js uploads a texture the
   first time it is drawn after a change, i.e. in the middle of the frame. A canvas upload in Chrome goes
   through the GPU process with its own framebuffer, and switching framebuffers in the middle of a
   multisampled multiview frame (rendered straight into the headset's image, resolved on the tile) can
   lose the frame. The classic path renders into ordinary buffers and copies at the end, so it never saw
   this. Every texture marked dirty (Texture.needsUpdate) is now uploaded before the frame starts drawing.
   Diagnostics: any upload, mipmap generation or copy that still happens while a multiview frame draws is
   logged (first twelve), and so is a shader program compiled during play. */
X.mvWrap = function (r) {
  var r0 = r.render, dirty = new Set();
  X.mvStats = { preUploads: 0, inFrame: 0, inFrameKinds: {}, programsDuringPlay: 0 };
  try {
    /* The bundle exports no Texture class; walk up from CanvasTexture to the prototype that owns the setter
       (three.js's Texture), which every texture inherits. */
    var TP = THREE.CanvasTexture && THREE.CanvasTexture.prototype, d = null;
    while (TP && !(d = Object.getOwnPropertyDescriptor(TP, "needsUpdate"))) TP = Object.getPrototypeOf(TP);
    if (d && d.set) { Object.defineProperty(TP, "needsUpdate", { configurable: true, enumerable: d.enumerable, get: d.get, set: function (v) { d.set.call(this, v); if (v === true) dirty.add(this); } }); X.mvHook = true; }
    else __gtLog("multiview: texture hook not installed (no needsUpdate setter found)");
  } catch (e) { __gtLog("multiview: texture hook failed " + e); }
  try {
    var gl = r.getContext();
    /* Anything that makes the GPU save and reload a half-drawn multiview frame: texture uploads and copies,
       mipmap builds, pixel reads, blits, and binding any framebuffer other than the headset's. */
    ["texImage2D", "texSubImage2D", "texImage3D", "texSubImage3D", "generateMipmap", "copyTexImage2D", "copyTexSubImage2D", "readPixels", "blitFramebuffer", "bindFramebuffer"].forEach(function (k) {
      var f = gl[k]; if (typeof f !== "function") return;
      gl[k] = function () {
        if (X.mvInFrame && (k !== "bindFramebuffer" || !(X.shim && arguments[1] === X.shim.fb))) { var st = X.mvStats; st.inFrame++; st.inFrameKinds[k] = (st.inFrameKinds[k] || 0) + 1; if (st.inFrame <= 12) __gtLog("multiview: " + k + " while a frame draws (" + st.inFrame + ")"); }
        return f.apply(this, arguments);
      };
    });
  } catch (e) {}
  r.render = function () {
    var xr = r.xr, pres = xr && xr.isPresenting && xr.enabled;
    if (pres && X.mvActive) {
      if (dirty.size) {
        dirty.forEach(function (t) { try { if (t.image && !t.isCubeTexture && !t.isDataTexture3D && !t.isDataTexture2DArray && !t.isVideoTexture) { r.initTexture(t); X.mvStats.preUploads++; } } catch (e) {} });
        dirty.clear();
      }
      var np = r.info.programs ? r.info.programs.length : 0;
      X.mvInFrame = true;
      try { return r0.apply(r, arguments); } finally {
        X.mvInFrame = false;
        var n2 = r.info.programs ? r.info.programs.length : 0;
        if (n2 > np) { X.mvStats.programsDuringPlay += n2 - np; if (X.mvStats.programsDuringPlay <= 12) __gtLog("multiview: " + (n2 - np) + " shader program(s) compiled during play"); }
      }
    }
    var fb = X.mvScratchFor(r);
    if (!fb) return r0.apply(r, arguments);
    r.state.bindXRFramebuffer(fb);
    try { return r0.apply(r, arguments); } finally { r.state.bindXRFramebuffer(null); }
  };
};
