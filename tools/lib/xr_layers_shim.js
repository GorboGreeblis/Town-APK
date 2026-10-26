/* WebXR Layers mode (embedded in the head script by tools/apply_entry_fix.py;
   `X` is window.__gtXR, `__gtLog` the page logger). Active only when the
   session was granted the "layers" feature. The Quest Browser then forbids
   updateRenderState({baseLayer}) ("Can't use baseLayer with layers feature
   requested", tools/NOTES.md 41), so:
   - the loading screen is drawn into compositor layers (cube + quad) that the
     browser re-renders every vsync whatever the page is doing (no stale frames
     while the head turns during the boot);
   - the game renders through an XRProjectionLayer behind a facade of the
     session that shows three.js its usual baseLayer: an MSAA framebuffer that
     is resolved into the layer's eye texture after every frame, the way
     three.js's own projection-layer path does it. */
X.layersMode = function (s) {
  try { return !!(s && s.enabledFeatures && Array.prototype.indexOf.call(s.enabledFeatures, "layers") >= 0 && window.XRWebGLBinding); } catch (e) { return false; }
};
/* projShim(session, gl, msaa): one projection layer plus the framebuffer an app renders into. */
X.projShim = function (s, g, msaa) {
  var W2 = typeof WebGL2RenderingContext !== "undefined" && g instanceof WebGL2RenderingContext;
  var bd = new XRWebGLBinding(s, g), ref = X.ref || null, fb = g.createFramebuffer(), rfb = g.createFramebuffer();
  var ms = null, msd = null, msW = 0, msH = 0, vp = [], tex = null, tw = 0, th = 0, fov = 0, samples = 0;
  if (msaa && W2) { try { samples = Math.min(4, g.getParameter(g.MAX_SAMPLES) || 0); } catch (e) { samples = 0; } }
  var S = { fb: fb, layer: null, w: 0, h: 0, samples: samples };
  S.setRef = function (r) { ref = r; };
  S.create = function (sc) {
    var o = { textureType: "texture", colorFormat: W2 ? g.RGBA8 : g.RGBA, scaleFactor: sc || 1 };
    if (!samples) o.depthFormat = W2 ? g.DEPTH24_STENCIL8 : g.DEPTH_STENCIL;
    var p = bd.createProjectionLayer(o);
    try { p.fixedFoveation = fov; } catch (e) {}
    s.updateRenderState({ layers: [p] });
    var old = S.layer; S.layer = p; S.scale = sc || 1;
    if (old) { try { old.destroy(); } catch (e) {} }
    return p;
  };
  Object.defineProperty(S, "fixedFoveation", { get: function () { return fov; }, set: function (v) { fov = v; try { if (S.layer) S.layer.fixedFoveation = v; } catch (e) {} } });
  /* begin(frame): attach this frame's eye texture; returns false when there is nothing to render into. */
  S.begin = function (f) {
    var L = S.layer; if (!L || !ref) return false;
    var pose = f.getViewerPose(ref); if (!pose) return false;
    var vs = pose.views;
    for (var i = 0; i < vs.length; i++) {
      var si = bd.getViewSubImage(L, vs[i]);
      vp[i] = { eye: vs[i].eye, x: si.viewport.x, y: si.viewport.y, width: si.viewport.width, height: si.viewport.height };
      if (i !== 0) continue;
      tex = si.colorTexture; tw = si.textureWidth; th = si.textureHeight;
      if (samples) {
        if (msW !== tw || msH !== th) {
          if (ms) g.deleteRenderbuffer(ms); if (msd) g.deleteRenderbuffer(msd);
          ms = g.createRenderbuffer(); g.bindRenderbuffer(g.RENDERBUFFER, ms); g.renderbufferStorageMultisample(g.RENDERBUFFER, samples, g.RGBA8, tw, th);
          msd = g.createRenderbuffer(); g.bindRenderbuffer(g.RENDERBUFFER, msd); g.renderbufferStorageMultisample(g.RENDERBUFFER, samples, g.DEPTH24_STENCIL8, tw, th);
          g.bindRenderbuffer(g.RENDERBUFFER, null);
          g.bindFramebuffer(g.FRAMEBUFFER, fb);
          g.framebufferRenderbuffer(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.RENDERBUFFER, ms);
          g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_STENCIL_ATTACHMENT, g.RENDERBUFFER, msd);
          msW = tw; msH = th;
        }
        g.bindFramebuffer(g.FRAMEBUFFER, rfb);
        g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
        g.bindFramebuffer(g.FRAMEBUFFER, fb);
      } else {
        g.bindFramebuffer(g.FRAMEBUFFER, fb);
        g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
        if (si.depthStencilTexture) g.framebufferTexture2D(g.FRAMEBUFFER, g.DEPTH_STENCIL_ATTACHMENT, g.TEXTURE_2D, si.depthStencilTexture, 0);
      }
    }
    S.w = tw; S.h = th; vp.length = vs.length;
    return true;
  };
  S.getViewport = function (v) { for (var i = 0; i < vp.length; i++) if (vp[i].eye === v.eye) return vp[i]; return vp[0] || { x: 0, y: 0, width: tw, height: th }; };
  /* end(): resolve the MSAA buffer into the eye texture (the framebuffer stays bound, as three.js's cache expects). */
  S.end = function () {
    if (samples && tex) {
      g.bindFramebuffer(g.READ_FRAMEBUFFER, fb); g.bindFramebuffer(g.DRAW_FRAMEBUFFER, rfb);
      g.blitFramebuffer(0, 0, tw, th, 0, 0, tw, th, g.COLOR_BUFFER_BIT, g.NEAREST);
      g.bindFramebuffer(g.FRAMEBUFFER, fb);
    }
  };
  return S;
};
/* installLayerStub(): in layers mode the game still constructs XRWebGLLayer objects (three.js and the quality
   governor); a stub records what they asked for, so no swapchain is allocated that could never be shown. */
X.installLayerStub = function () {
  if (X.layerStub) return;
  var Real = window.XRWebGLLayer;
  var Stub = function (s, g, init) {
    this.__gl = g; this.__init = init || {}; this.framebuffer = null; this.framebufferWidth = 0; this.framebufferHeight = 0;
    this.antialias = !!this.__init.antialias; this.ignoreDepthValues = false; this.fixedFoveation = 0;
    this.getViewport = function () { return null; };
  };
  Stub.getNativeFramebufferScaleFactor = function (s) { try { return Real && Real.getNativeFramebufferScaleFactor ? Real.getNativeFramebufferScaleFactor(s) : 1; } catch (e) { return 1; } };
  window.XRWebGLLayer = Stub; X.layerStub = Stub; X.realLayer = Real;
};
/* facade(session): what the game receives as its session in layers mode. */
X.facade = function (s) {
  var shim = null, fake = null;
  var rs = new Proxy(s.renderState, { get: function (t, k) { if (k === "baseLayer") return fake; var v = s.renderState[k]; return typeof v === "function" ? v.bind(s.renderState) : v; } });
  function setBase(b) {
    var init = (b && b.__init) || {}, sc = init.framebufferScaleFactor || 1;
    if (!shim) { shim = X.projShim(s, b.__gl, !!init.antialias); if (X.ref) shim.setRef(X.ref); X.shim = shim; }
    shim.create(sc);
    fake = b;
    b.framebuffer = shim.fb;
    b.getViewport = function (v) { return shim.getViewport(v); };
    Object.defineProperty(b, "fixedFoveation", { get: function () { return shim.fixedFoveation; }, set: function (v) { shim.fixedFoveation = v; }, configurable: true });
    Object.defineProperty(b, "framebufferWidth", { get: function () { return shim.w; }, configurable: true });
    Object.defineProperty(b, "framebufferHeight", { get: function () { return shim.h; }, configurable: true });
    __gtLog("projection layer live, scale " + sc + ", msaa " + shim.samples);
  }
  return new Proxy(s, {
    get: function (t, k) {
      if (k === "updateRenderState") return function (st) { if (st && st.baseLayer) { setBase(st.baseLayer); return; } return s.updateRenderState(st); };
      if (k === "renderState") return rs;
      if (k === "requestAnimationFrame") return function (cb) { return s.requestAnimationFrame(function (tm, f) { var ok = !!(shim && shim.begin(f)); try { cb(tm, f); } finally { if (ok) shim.end(); } }); };
      if (k === "requestReferenceSpace") return function (ty) { return s.requestReferenceSpace(ty).then(function (r) { X.ref = r; if (shim) shim.setRef(r); return r; }); };
      if (k === "__real") return s;
      var v = Reflect.get(t, k, t); return typeof v === "function" ? v.bind(t) : v;
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
};
