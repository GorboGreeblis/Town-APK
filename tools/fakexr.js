/**
 * Minimal deterministic WebXR device for headless testing.
 *
 * Installed before any page script (Playwright addInitScript). Replaces
 * navigator.xr with an object that grants immersive-vr sessions whose frames
 * deliver a stereo viewer pose, enough for three.js's WebXRManager and for
 * this game. No sensors, no fullscreen, no network.
 *
 * Controls exposed on window.__fakeXR:
 *   fire()                    dispatch `sessiongranted` (Meta immersive launch)
 *   sessions                  every session created (last one is current)
 *   pose.y / pose.yaw         head height (m) and yaw (rad) used for views
 *   setInputs([{handedness, axes:[x,y,x2,y2], buttons:[{pressed,value}]}])
 *                             fake controllers (gamepad-like), [] for none
 *   frames                    XR animation frames delivered so far
 *   supportLocalFloor         set false to make `local-floor` reject
 *   fbMax                     max framebuffer width (default 320; software GL is fill-bound)
 */
(function () {
  const S = (window.__fakeXR = { poses: false, sessions: [], frames: 0, pose: { y: 1.6, yaw: 0 }, inputs: [], supportLocalFloor: true, fbMax: 320 });

  function perspective(fovDeg, aspect, near, far) {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 360), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
    return m;
  }
  function matrixFor(x, y, z, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, x, y, z, 1]);
  }
  function invert(m) {
    // rigid transform inverse: R^T, -R^T t
    const r = new Float32Array(16);
    r[0] = m[0]; r[1] = m[4]; r[2] = m[8]; r[4] = m[1]; r[5] = m[5]; r[6] = m[9]; r[8] = m[2]; r[9] = m[6]; r[10] = m[10];
    r[12] = -(r[0] * m[12] + r[4] * m[13] + r[8] * m[14]);
    r[13] = -(r[1] * m[12] + r[5] * m[13] + r[9] * m[14]);
    r[14] = -(r[2] * m[12] + r[6] * m[13] + r[10] * m[14]);
    r[15] = 1;
    return r;
  }
  class RigidTransform {
    constructor(position, orientation, matrix) {
      this.position = Object.assign({ x: 0, y: 0, z: 0, w: 1 }, position || {});
      this.orientation = Object.assign({ x: 0, y: 0, z: 0, w: 1 }, orientation || {});
      this.matrix = matrix || matrixFor(this.position.x, this.position.y, this.position.z, 0);
    }
    get inverse() { return new RigidTransform(null, null, invert(this.matrix)); }
  }
  class Space { constructor(type) { this.type = type; } getOffsetReferenceSpace() { return this; } }
  class Layer {
    constructor(session, gl, init) {
      this.session = session; this.gl = gl; this.init = init || {};
      const c = gl.canvas, scale = init && init.framebufferScaleFactor || 1;
      this.framebuffer = null;
      let w = Math.max(2, Math.round((c.width || 1280) * scale)), h = Math.max(2, Math.round((c.height || 720) * scale));
      // Software GL is fill-bound: keep the stereo framebuffer small so the
      // simulation runs at a usable rate (S.fbMax, default 320 px wide).
      if (S.fbMax && w > S.fbMax) { h = Math.round(h * S.fbMax / w); w = S.fbMax; }
      this.framebufferWidth = w; this.framebufferHeight = h;
      this.ignoreDepthValues = false; this.fixedFoveation = 0; this.antialias = !!(init && init.antialias);
    }
    getViewport(view) {
      const w = this.framebufferWidth / 2, h = this.framebufferHeight;
      return { x: view.eye === 'right' ? w : 0, y: 0, width: w, height: h };
    }
    static getNativeFramebufferScaleFactor() { return 1; }
  }
  class View {
    constructor(eye, session) {
      this.eye = eye; const dx = eye === 'left' ? -0.032 : 0.032;
      const floor = session.floorSpace;              // local-floor: origin at floor; local: origin at head
      const y = floor ? S.pose.y : 0;
      this.transform = new RigidTransform({ x: dx, y, z: 0 }, null, matrixFor(dx, y, 0, S.pose.yaw));
      const rs = session.renderState;
      this.projectionMatrix = perspective(90, (session.layerAspect || (16 / 9)) / 2, rs.depthNear, rs.depthFar);
      this.recommendedViewportScale = null;
    }
  }
  class Frame {
    constructor(session) { this.session = session; this.predictedDisplayTime = performance.now(); }
    getViewerPose() {
      const v = [new View('left', this.session), new View('right', this.session)];
      return { views: v, transform: new RigidTransform({ x: 0, y: this.session.floorSpace ? S.pose.y : 0, z: 0 }), emulatedPosition: false };
    }
    // Controller poses are null unless a test turns them on (window.__fakeXR.poses = true): three.js shows a
    // controller's ray and grip groups only while their spaces have poses, and the input test steers the rays
    // itself, so poses are opt-in (left hand at x -0.2, right at +0.2, 1.2 m up, 0.3 m forward).
    getPose(space) {
      if (!S.poses || !space || (space.type !== 'ray' && space.type !== 'grip')) return null;
      const right = this.session._sources.findIndex((src) => src && (src.targetRaySpace === space || src.gripSpace === space)) !== 0;
      return { transform: new RigidTransform({ x: right ? 0.2 : -0.2, y: 1.2, z: -0.3 }), emulatedPosition: false };
    }
    getJointPose() { return null; }
  }
  class Session extends EventTarget {
    constructor(mode, init) {
      super();
      this.mode = mode; this.init = init || {}; this.ended = false;
      this.renderState = { baseLayer: null, depthNear: 0.1, depthFar: 1000, inlineVerticalFieldOfView: null, layers: undefined };
      this.visibilityState = 'visible'; this.environmentBlendMode = 'opaque'; this.interactionMode = 'world-space';
      // Quest Browser grants these optional features when asked for them.
      const opt = (this.init.optionalFeatures || []).concat(this.init.requiredFeatures || []);
      this.enabledFeatures = ['viewer', 'local', 'local-floor'].concat(['bounded-floor', 'layers', 'hand-tracking'].filter((f) => opt.includes(f)));
      this.supportedFrameRates = new Float32Array([72, 90]); this.frameRate = 72;
      this.floorSpace = false; this.layerAspect = 16 / 9; this._raf = new Map(); this._id = 0;
      // Stable XRInputSource objects (three.js maps controllers by identity);
      // gamepad data is refreshed in place from S.inputs on every read.
      this._sources = [];
      Object.defineProperty(this, 'inputSources', { get: () => this.syncSources() });
    }
    syncSources() {
      const want = S.inputs || [];
      while (this._sources.length > want.length) this._sources.pop();
      want.forEach((d, i) => {
        let src = this._sources[i];
        if (!src || src.handedness !== (d.handedness || 'right')) {
          src = this._sources[i] = { handedness: d.handedness || 'right', targetRayMode: 'tracked-pointer', profiles: ['oculus-touch-v3'],
            targetRaySpace: new Space('ray'), gripSpace: new Space('grip'),
            gamepad: { axes: [0, 0, 0, 0], buttons: [], connected: true, mapping: 'xr-standard', hapticActuators: [] } };
        }
        src.gamepad.axes = d.axes || [0, 0, 0, 0];
        src.gamepad.buttons = (d.buttons || []).map((b) => ({ pressed: !!b.pressed, touched: !!b.touched, value: b.value || 0 }));
      });
      return this._sources.slice();
    }
    updateRenderState(s) {
      // The Quest Browser's own rules (strings in its libchrome.so), see tools/NOTES.md 41.
      s = s || {};
      if (s.baseLayer && s.layers) throw new TypeError("Can't set both baseLayer and layers");
      if (s.baseLayer && this.enabledFeatures.includes('layers')) throw new TypeError("Can't use baseLayer with layers feature requested");
      if (s.layers && !this.enabledFeatures.includes('layers')) throw new DOMException("The 'layers' feature was not enabled for this XRSession.", 'NotSupportedError');
      if (s.layers && new Set(s.layers).size !== s.layers.length) throw new TypeError('All layers in render state must be unique.');
      Object.assign(this.renderState, s); if (s.baseLayer) this.layerAspect = s.baseLayer.framebufferWidth / s.baseLayer.framebufferHeight;
    }
    requestReferenceSpace(type) {
      if (type === 'bounded-floor' || (type === 'local-floor' && !S.supportLocalFloor)) return Promise.reject(new DOMException('not supported', 'NotSupportedError'));
      if (type === 'local-floor') this.floorSpace = true;
      return Promise.resolve(new Space(type));
    }
    requestAnimationFrame(cb) {
      const id = ++this._id;
      const h = window.requestAnimationFrame((t) => { this._raf.delete(id); if (this.ended) return; S.frames++; cb(t, new Frame(this)); });
      this._raf.set(id, h); return id;
    }
    cancelAnimationFrame(id) { const h = this._raf.get(id); if (h != null) window.cancelAnimationFrame(h); this._raf.delete(id); }
    updateTargetFrameRate(r) { this.frameRate = r; return Promise.resolve(); }
    end() {
      if (this.ended) return Promise.resolve();
      this.ended = true; this.visibilityState = 'hidden';
      const ev = new Event('end'); ev.session = this; this.dispatchEvent(ev);
      return Promise.resolve();
    }
    setVisibility(state) { this.visibilityState = state; const ev = new Event('visibilitychange'); ev.session = this; this.dispatchEvent(ev); }
    pressSelect(handIndex) { const src = this.inputSources[handIndex || 0]; for (const t of ['selectstart', 'select', 'selectend']) { const ev = new Event(t); ev.inputSource = src; ev.frame = new Frame(this); this.dispatchEvent(ev); } }
  }
  class XRSystem extends EventTarget {
    isSessionSupported(mode) { return Promise.resolve(mode === 'immersive-vr' || mode === 'inline'); }
    requestSession(mode, init) { const s = new Session(mode, init); S.sessions.push(s); return Promise.resolve(s); }
  }
  const xr = new XRSystem();
  try { delete Navigator.prototype.xr; } catch (e) {}
  Object.defineProperty(navigator, 'xr', { value: xr, configurable: true });
  // WebXR Layers, as the Quest Browser exposes them: enough for the loader's cube/quad
  // layers and the game's projection-layer shim to run their real GL calls headless
  // (nothing is composited; the textures are plain WebGL textures of the binding's context).
  class FakeLayer {
    constructor(binding, kind, init) { this.binding = binding; this.kind = kind; this.init = init || {}; this.needsRedraw = true; this.fixedFoveation = 0; this.destroyed = false; this.layout = this.init.layout || 'default'; this.space = this.init.space; this.transform = this.init.transform; this.width = this.init.width; this.height = this.init.height; this.textureWidth = 0; this.textureHeight = 0; this._tex = null; }
    destroy() { this.destroyed = true; if (this._tex) { this.binding.gl.deleteTexture(this._tex); this._tex = null; } if (this._dtex) { this.binding.gl.deleteTexture(this._dtex); this._dtex = null; } }
  }
  class XRWebGLBindingFake {
    constructor(session, gl) {
      if (!(session instanceof Session)) throw new TypeError('XRWebGLBinding: not a session');
      if (session.ended) throw new DOMException('Cannot create an XRWebGLBinding for an XRSession which has already ended.', 'InvalidStateError');
      if (session.mode !== 'immersive-vr') throw new DOMException('Cannot create an XRWebGLBinding with a non-immersive session.', 'InvalidStateError');
      if (!session.enabledFeatures.includes('layers')) throw new DOMException('XRSession was not created with the layers feature', 'NotSupportedError');
      if (!gl || typeof gl.createTexture !== 'function') throw new TypeError('XRWebGLBinding: not a WebGL context');
      this.session = session; this.gl = gl; this.nativeProjectionScaleFactor = 1;
    }
    _check(layer) { if (!(layer instanceof FakeLayer)) throw new TypeError('not an XRLayer'); if (layer.binding.session !== this.session) throw new DOMException('XRLayer was created with a different session.', 'InvalidStateError'); if (layer.destroyed) throw new DOMException('layer destroyed', 'InvalidStateError'); }
    _tex(layer, w, h, cube) {
      const gl = this.gl; if (layer._tex && layer._w === w && layer._h === h) return layer._tex;
      if (layer._tex) gl.deleteTexture(layer._tex);
      const T = cube ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D; layer._tex = gl.createTexture(); gl.bindTexture(T, layer._tex);
      if (cube) for (let k = 0; k < 6; k++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + k, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(T, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(T, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.bindTexture(T, null);
      layer._w = w; layer._h = h; return layer._tex;
    }
    createProjectionLayer(init) { if (this.session.ended) throw new DOMException('Cannot create a new layer for an XRSession which has already ended.', 'InvalidStateError'); return new FakeLayer(this, 'projection', init); }
    createCubeLayer(init) { return new FakeLayer(this, 'cube', init); }
    createQuadLayer(init) { return new FakeLayer(this, 'quad', init); }
    getSubImage(layer, frame) {
      this._check(layer); if (layer.kind === 'projection') throw new TypeError('getSubImage: use getViewSubImage for projection layers');
      const w = layer.init.viewPixelWidth || 256, h = layer.init.viewPixelHeight || 256; const tex = this._tex(layer, w, h, layer.kind === 'cube'); layer.needsRedraw = false;
      return { colorTexture: tex, depthStencilTexture: null, textureWidth: w, textureHeight: h, imageIndex: 0, viewport: { x: 0, y: 0, width: w, height: h } };
    }
    // texture-array projection layers (multiview): one slice per eye, each the size of one eye's viewport,
    // and a matching depth/stencil array when the layer asks for a depth format.
    _arr(layer, w, h) {
      const gl = this.gl; if (layer._tex && layer._w === w && layer._h === h) return layer._tex;
      if (layer._tex) gl.deleteTexture(layer._tex); if (layer._dtex) { gl.deleteTexture(layer._dtex); layer._dtex = null; }
      layer._tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, layer._tex); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, 2);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (layer.init.depthFormat) { layer._dtex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, layer._dtex); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH24_STENCIL8, w, h, 2); }
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null); layer._w = w; layer._h = h; return layer._tex;
    }
    getViewSubImage(layer, view) {
      this._check(layer); if (layer.kind !== 'projection') throw new TypeError('getViewSubImage: not a projection layer');
      const L = this.session.renderState.layers; if (!L || !L.includes(layer)) throw new DOMException('layer is not in the render state', 'InvalidStateError');
      if (layer.init.textureType === 'texture-array') {
        if (!(this.gl instanceof WebGL2RenderingContext)) throw new TypeError('texture-array layers need WebGL 2');
        const sc = layer.init.scaleFactor || 1; const w = Math.max(8, Math.round(S.fbMax * sc)), h = Math.round(w * 9 / 16); const tex = this._arr(layer, w, h);
        layer.textureWidth = w; layer.textureHeight = h; layer.textureArrayLength = 2; S.arrayLayers = (S.arrayLayers || 0) + (view.eye === 'left' ? 1 : 0);
        return { colorTexture: tex, depthStencilTexture: layer._dtex || null, textureWidth: w, textureHeight: h, imageIndex: view.eye === 'right' ? 1 : 0, viewport: { x: 0, y: 0, width: w, height: h } };
      }
      const sc = layer.init.scaleFactor || 1; const w = Math.max(8, Math.round(S.fbMax * sc)), h = Math.round(w * 9 / 16); const tex = this._tex(layer, 2 * w, h, false);
      layer.textureWidth = 2 * w; layer.textureHeight = h;
      return { colorTexture: tex, depthStencilTexture: null, textureWidth: 2 * w, textureHeight: h, imageIndex: 0, viewport: { x: view.eye === 'right' ? w : 0, y: 0, width: w, height: h } };
    }
  }
  window.XRWebGLBinding = XRWebGLBindingFake;
  window.XRWebGLLayer = Layer; window.XRRigidTransform = RigidTransform;
  // Chromium's native makeXRCompatible rejects (InvalidStateError) when no real
  // XR device exists, so always replace it.
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (C) C.prototype.makeXRCompatible = function () { return Promise.resolve(); };
  }
  S.fire = () => xr.dispatchEvent(new Event('sessiongranted'));
  S.setInputs = (list) => {
    const s = S.sessions[S.sessions.length - 1];
    const before = s ? s.inputSources : [];
    S.inputs = list || [];
    if (!s) return;
    const after = s.inputSources;
    const ev = new Event('inputsourceschange');
    ev.session = s; ev.added = after.filter((x) => !before.includes(x)); ev.removed = before.filter((x) => !after.includes(x));
    s.dispatchEvent(ev);
  };
})();
