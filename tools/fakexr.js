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
 */
(function () {
  const S = (window.__fakeXR = { sessions: [], frames: 0, pose: { y: 1.6, yaw: 0 }, inputs: [], supportLocalFloor: true });

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
      this.framebufferWidth = Math.max(2, Math.round((c.width || 1280) * scale));
      this.framebufferHeight = Math.max(2, Math.round((c.height || 720) * scale));
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
    getPose() { return null; }
    getJointPose() { return null; }
  }
  class Session extends EventTarget {
    constructor(mode, init) {
      super();
      this.mode = mode; this.init = init || {}; this.ended = false;
      this.renderState = { baseLayer: null, depthNear: 0.1, depthFar: 1000, inlineVerticalFieldOfView: null, layers: undefined };
      this.visibilityState = 'visible'; this.environmentBlendMode = 'opaque'; this.interactionMode = 'world-space';
      this.enabledFeatures = ['viewer', 'local', 'local-floor'];
      this.supportedFrameRates = new Float32Array([72, 90]); this.frameRate = 72;
      this.floorSpace = false; this.layerAspect = 16 / 9; this._raf = new Map(); this._id = 0;
      Object.defineProperty(this, 'inputSources', { get: () => S.inputs.map((d) => ({
        handedness: d.handedness || 'right', targetRayMode: 'tracked-pointer', profiles: ['oculus-touch-v3'],
        targetRaySpace: new Space('ray'), gripSpace: new Space('grip'),
        gamepad: { axes: d.axes || [0, 0, 0, 0], buttons: (d.buttons || []).map((b) => ({ pressed: !!b.pressed, touched: !!b.touched, value: b.value || 0 })), connected: true, mapping: 'xr-standard', hapticActuators: [] },
      })) });
    }
    updateRenderState(s) { Object.assign(this.renderState, s || {}); if (s && s.baseLayer) this.layerAspect = s.baseLayer.framebufferWidth / s.baseLayer.framebufferHeight; }
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
  window.XRWebGLLayer = Layer; window.XRRigidTransform = RigidTransform;
  // Chromium's native makeXRCompatible rejects (InvalidStateError) when no real
  // XR device exists, so always replace it.
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (C) C.prototype.makeXRCompatible = function () { return Promise.resolve(); };
  }
  S.fire = () => xr.dispatchEvent(new Event('sessiongranted'));
  S.setInputs = (list) => { S.inputs = list || []; const s = S.sessions[S.sessions.length - 1]; if (s) s.dispatchEvent(new Event('inputsourceschange')); };
})();
