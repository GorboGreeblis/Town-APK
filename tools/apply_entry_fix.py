#!/usr/bin/env python3
"""Produce the APK copy of the game from the untouched original.

Usage:  python3 tools/apply_entry_fix.py [src] [dst]
        python3 tools/apply_entry_fix.py --experiment nobatch|noeffects|nogovernor [src] dst   (diagnostic variant)
        python3 tools/apply_entry_fix.py --entry-only [src] dst   (VR-entry edits only, no gameplay fixes)
        python3 tools/apply_entry_fix.py --verify [src] [dst]
Default src: tools/uncompressed.html   Default dst: tools/android/app/src/main/assets/index.html
(the default dst is also mirrored to index.html at the repository root; --verify checks both)

--verify does not write anything: it re-derives the patched file from src and
checks that dst is byte-identical to it, i.e. the APK copy differs from the
original by exactly these edits and nothing else.

The game is copied byte-for-byte except for the VR-entry fix below. The fix only
changes how the game enters VR when Meta Quest launches it in immersive mode
(the browser fires a `sessiongranted` event instead of waiting for a button press).
No gameplay, art, audio or world code is touched.

Every replacement must match exactly once; the script fails loudly otherwise.
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
# --experiment NAME: additionally apply one diagnostic variant (headset A/B tests for B12 etc.).
# Variants are never used for the release asset; build_experiment.sh writes them elsewhere.
EXPERIMENTS = {
    # Native: the release renders at scale 1.2 / 1.1 at the top two quality
    # levels and native 1.0 below (the author found the sharper picture better;
    # the governor steps down under load, swaps are flash-free). This variant
    # goes back to native scale at every level for A/B comparisons.
    "native": [(
        'quality:[1.2,1.1,1,1,1],foveation:[0,0,0,.5,1],',
        'quality:[1,1,1,1,1],foveation:[0,.25,.5,.75,1],',
    )],
    # No layers: the release requests the WebXR "layers" feature (compositor
    # layers for the loading screen, projection layer for the game, NOTES 42,
    # confirmed on the headset). This variant goes back to the plain
    # projection-layer loader for A/B comparisons.
    "nolayers": [(
        'optionalFeatures:["local-floor","bounded-floor","layers"]})}catch(e){return null}}function park(p){',
        'optionalFeatures:["local-floor","bounded-floor"]})}catch(e){return null}}function park(p){',
    )],
    # Texture capture: record every pre-renderable canvas painter's output during
    # the boot (used by tools/prerender_textures.js, never shipped).
    "texcapture": [("X.tex={map:{},pr:{},n:{},on:!0};", "X.tex={map:{},pr:{},n:{},on:!0,capture:[]};")],
    # No multiview (NOTES 65, 67): the release draws both eyes in one pass (multiview, headset-
    # confirmed in 3.15.33's experiment); this variant plans it off, so the game takes the classic
    # path (each eye drawn separately) for A/B comparisons.
    "nomultiview": [("ok = !!(mv && (!aa || ms || force));", "ok = false; why = \"experiment nomultiview; \";")],
    # Direct request: once the world is ready, call the game's own VR request
    # (je) immediately without waiting for sessiongranted, and log the browser's
    # reason to the console (logcat shows it) if it refuses. Tests whether the
    # immersive activity accepts a page-initiated request without a press.
    "directrequest": [(
        '(function(){var X=window.__gtXR={granted:!1,pending:null,enter:null};',
        '(function(){var X=window.__gtXR={granted:!1,pending:null,enter:null};'
        'var rep=X.rep=function(m){try{fetch("/log?m="+encodeURIComponent(m))}catch(e){}};'
        'try{var xr=navigator.xr,orq=xr&&xr.requestSession;if(orq){xr.requestSession=function(){var a=arguments;rep("requestSession called: "+JSON.stringify(a[0])+" activation="+(navigator.userActivation?navigator.userActivation.isActive:"?"));'
        'return orq.apply(xr,a).then(function(s){rep("requestSession OK");return s},function(e){rep("requestSession rejected: "+(e&&e.name)+": "+(e&&e.message));throw e})}}rep("head script ran, xr="+!!navigator.xr)}catch(e){rep("wrap failed "+e)}',
    ), (
        'gcEB.ready=!0;',
        'gcEB.ready=!0;setTimeout(function(){var X=window.__gtXR;try{X.rep("world ready; granted="+X.granted+" enter="+!!X.enter+"; calling enter()");X.enter&&X.enter()}catch(e){X.rep("enter threw "+e)}},0);',
    )],
    # Session keep-alive: when the grant arrives before the world is built, the
    # early-created session gets a tiny WebGL layer and a clear-colour frame loop
    # right away, so the OS sees frames (no loading-screen stall / session timeout)
    # until the game takes the session over. Candidate fix for the 3.15.6 symptom.
    "keepalive": [(
        'X.pending=p;p.then(function(s){try{s.addEventListener("end",function(){X.pending===p&&(X.pending=null)})}catch(e){}},',
        'X.pending=p;p.then(function(s){try{s.addEventListener("end",function(){X.pending===p&&(X.pending=null)})}catch(e){}'
        'try{var c=document.createElement("canvas"),g=c.getContext("webgl2",{xrCompatible:!0})||c.getContext("webgl",{xrCompatible:!0});'
        'if(g){var L=new XRWebGLLayer(s,g);s.updateRenderState({baseLayer:L});X.keep=L;'
        'var f=function(){if(X.taken||X.pending!==p)return;try{g.bindFramebuffer(g.FRAMEBUFFER,L.framebuffer);g.clearColor(.52,.69,.89,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT)}catch(e){}s.requestAnimationFrame(f)};'
        's.requestAnimationFrame(f)}}catch(e){}},'
    ), (
        'window.__gtXR.pending||navigator.xr.requestSession(',
        '(window.__gtXR.taken=!0,window.__gtXR.pending)||navigator.xr.requestSession(',
    )],
    # Flash diagnostics (3.15.41 on the author's Quest 3S: three bright, washed-out flashes, two partway through
    # the Event; NOTES 79). Plays exactly like the release; only the log changes: B on the right controller (the one
    # button the game leaves free) writes "MARK flash seen" (with a short buzz), so each flash can be lined up with what happened then; the hazard watch
    # also counts texture storage, framebuffer attachments, renderbuffer storage, buffer uploads, flushes and syncs
    # while a frame draws, logs up to 300 with the frame number (not only the first 12), and every perf line carries
    # the totals; frames over 28 ms are logged; the old layer's destruction after a swap is logged.
    "flashlog": [(
        '["texImage2D", "texSubImage2D", "texImage3D", "texSubImage3D", "generateMipmap", "copyTexImage2D", "copyTexSubImage2D", "readPixels", "blitFramebuffer", "bindFramebuffer", "invalidateFramebuffer"].forEach(function (k) {',
        '["texImage2D", "texSubImage2D", "texImage3D", "texSubImage3D", "generateMipmap", "copyTexImage2D", "copyTexSubImage2D", "readPixels", "blitFramebuffer", "bindFramebuffer", "invalidateFramebuffer", "texStorage2D", "texStorage3D", "compressedTexImage2D", "compressedTexSubImage2D", "framebufferTexture2D", "framebufferTextureLayer", "framebufferRenderbuffer", "renderbufferStorage", "renderbufferStorageMultisample", "bufferData", "flush", "finish", "fenceSync", "clientWaitSync", "deleteTexture", "deleteFramebuffer", "deleteRenderbuffer"].forEach(function (k) {',
    ), (
        'if (st.inFrame <= 12) __gtLog("multiview: " + k + " while a frame draws (" + st.inFrame + ")");',
        'if (st.inFrame <= 300) __gtLog("multiview: " + k + " while a frame draws (" + st.inFrame + ", frame " + (X.mvFrame || 0) + ")");',
    ), (
        '      X.mvInFrame = true;\n',
        '      X.mvFrame = (X.mvFrame || 0) + 1; X.mvInFrame = true;\n',
    ), (
        '.replace(/\\s+/g,"_"))))}catch(e){}F.ctrls',
        '.replace(/\\s+/g,"_"))+(function(){try{var S=window.__gtXR&&window.__gtXR.mvStats;return" hz="+(S?S.inFrame:0)+(S&&S.inFrame?":"+JSON.stringify(S.inFrameKinds).replace(/[{}"]/g,""):"")+" pre="+(S?S.preUploads:0)+" tex="+O.info.memory.textures+" geo="+O.info.memory.geometries}catch(e){return""}})()))}catch(e){}F.ctrls',
    ), (
        'const t=performance.now(),l=e?t-e:16.7;e=t;',
        'const t=performance.now(),l=e?t-e:16.7;e&&l>28&&t-(window.__gtLongAt||0)>500&&(window.__gtLongAt=t,window.__gtLog&&window.__gtLog("long frame "+Math.round(l)+" ms"+(me&&me.active?" event":"")));e=t;',
    ), (
        'r&&N(r,5)&&ve();',
        'r&&N(r,5)&&ve(),i&&N(i,5)&&(window.__gtLog&&window.__gtLog("MARK flash seen"+(me&&me.active?" event":"")+" frame "+((window.__gtXR&&window.__gtXR.mvFrame)||0)),Y(i,.5,60));',
    ), (
        'var o = S.old; S.old = null; setTimeout(function () { try { o.destroy(); } catch (e) {} }, 100);',
        'var o = S.old; S.old = null; setTimeout(function () { try { o.destroy(); __gtLog("old projection layer destroyed"); } catch (e) {} }, 100);',
    ), (
        '__gtLog("multiview " + (ok ? "planned" : "not used") + " (" + why + ")");',
        '__gtLog("flashlog experiment; multiview " + (ok ? "planned" : "not used") + " (" + why + ")");',
    )],
    # Draw every mesh individually: no gcEB batches, no custom vertex shader.
    "nobatch": [("const gcEB={list:[],mats:new WeakMap,geos:new WeakMap,root:null,N:32,f:0,tmp:[]};",
                 "const gcEB={list:[],mats:new WeakMap,geos:new WeakMap,root:null,N:32,f:0,tmp:[],off:!0};")],
    # No pickup effects: no sparkle particles, no floating labels, no HUD/label texture churn from pickups.
    "noeffects": [("gcEB.ready=!0;", "gcEB.ready=!0;Nt.sparkle=()=>{};Ut.at=()=>{};Ut.above=()=>{};")],
    # Quality governor frozen: foveation stays 0 and the layer is never rebuilt.
    "nogovernor": [("quality:[1,1,1,1,1],foveation:[0,.25,.5,.75,1],sosScale:.82,sosFrac:1.6,sosFrames:216,maxLayerRebuilds:30,",
                    "quality:[1,1,1,1,1],foveation:[0,0,0,0,0],sosScale:1,sosFrac:1.6,sosFrames:216,maxLayerRebuilds:0,")],
}
experiment = None
_argv = sys.argv[1:]
if "--experiment" in _argv:
    experiment = _argv[_argv.index("--experiment") + 1]
    if experiment not in EXPERIMENTS:
        sys.exit("unknown experiment %r; known: %s" % (experiment, ", ".join(EXPERIMENTS)))
    _argv = [a for i, a in enumerate(_argv) if a != "--experiment" and (i == 0 or _argv[i - 1] != "--experiment")]
args = [a for a in _argv if a not in ("--verify", "--entry-only")]
verify = "--verify" in sys.argv[1:]
# --entry-only: write src + the 4 VR-entry edits only (no gameplay fixes), for before/after comparisons in the harness.
entry_only = "--entry-only" in sys.argv[1:]
src = pathlib.Path(args[0]) if len(args) > 0 else root / "tools" / "uncompressed.html"
default_dst = root / "tools" / "android" / "app" / "src" / "main" / "assets" / "index.html"
dst = pathlib.Path(args[1]) if len(args) > 1 else default_dst

html = src.read_text(encoding="utf-8")

SHIM = (root / "tools" / "lib" / "xr_layers_shim.js").read_text(encoding="utf-8")

MVJS = (root / "tools" / "lib" / "xr_multiview.js").read_text(encoding="utf-8")


def _multiview():
    """Edits for the multiview experiment, in order. Three groups:
    1. three.js: a `multiview` program parameter (part of the program key and of the
       needs-a-new-program check); multiview programs get the extension, `num_views = 2`, and
       macros that pick each eye's projection, view, model-view and normal matrices and camera
       position (eye 0 reads the uniforms three.js always uploads; eye 1 reads gc*1 uniforms
       computed on the CPU exactly as three.js computes them for that eye); lights are rotated
       or moved into eye 1's view in the shader; the render loop draws each object once with
       the left camera when the multiview layer is live.
    2. The game: the batcher reserves vertex uniforms for the extra per-eye matrices; the renderer
       is wrapped so the loading warm-up renders into a multiview target.
    3. The layers shim: texture-array projection layer, multiview attachments, no resolve blit."""
    E = []
    def add(old, new):
        E.append((old, new))
    MVQ = '!!(window.__gtXR&&window.__gtXR.mvProg&&window.__gtXR.mvProg(%s))'
    # 1a. program parameter, key and recompile check
    add('customProgramCacheKey:r.customProgramCacheKey()}}',
        'customProgramCacheKey:r.customProgramCacheKey(),multiview:' + MVQ % 'e' + '}}')
    add('f=["precision","isWebGL2",', 'f=["multiview","precision","isWebGL2",')
    add('n.version===h.__version?h.needsLights&&h.lightsStateVersion!==c.state.version||',
        'n.version===h.__version?h.multiview!==' + MVQ % 'm' + '||h.needsLights&&h.lightsStateVersion!==c.state.version||')
    add('i.environment=e.isMeshStandardMaterial?t.environment:null,i.fog=t.fog,',
        'i.environment=e.isMeshStandardMaterial?t.environment:null,i.fog=t.fog,i.multiview=o.multiview,')
    # 1b. shader text
    add(r'n.isWebGL2&&!0!==n.isRawShaderMaterial&&(_="#version 300 es\n",',
        r'n.isWebGL2&&!0!==n.isRawShaderMaterial&&(_="#version 300 es\n"+(n.multiview?"#extension GL_OVR_multiview2 : require\n":""),')
    mvv = (r'#define GC_MULTIVIEW 1\nlayout(num_views = 2) in;\nuniform mat4 gcP1;\nuniform mat4 gcV1;\nuniform vec3 gcC1;\nuniform mat4 gcVD1;\nuniform mat4 gcMV1;\nuniform mat3 gcNM1;\n'
           r'#define projectionMatrix (gl_ViewID_OVR==0u?projectionMatrix:gcP1)\n#define modelViewMatrix (gl_ViewID_OVR==0u?modelViewMatrix:gcMV1)\n'
           r'#define normalMatrix (gl_ViewID_OVR==0u?normalMatrix:gcNM1)\n#define viewMatrix (gl_ViewID_OVR==0u?viewMatrix:gcV1)\n#define cameraPosition (gl_ViewID_OVR==0u?cameraPosition:gcC1)\n')
    mvf = (r'#define GC_MULTIVIEW 1\nuniform mat4 gcV1;\nuniform vec3 gcC1;\nuniform mat4 gcVD1;\n'
           r'#define viewMatrix (gl_ViewID_OVR==0u?viewMatrix:gcV1)\n#define cameraPosition (gl_ViewID_OVR==0u?cameraPosition:gcC1)\n')
    add(r'"#define textureCubeGradEXT textureGrad"].join("\n")+"\n"+x);const v=_+g+a',
        r'"#define textureCubeGradEXT textureGrad"].join("\n")+"\n"+x);n.multiview&&n.isWebGL2&&!0!==n.isRawShaderMaterial&&(g+="' + mvv + r'",x+="' + mvf + r'");const v=_+g+a')
    # 1c. lights: eye 1 gets each light moved/rotated by D1 = V1 * inverse(V0)
    add(r'return irradiance;\n}\n#endif\n",lights_phong_fragment:',
        r'return irradiance;\n}\n#endif\n#ifdef GC_MULTIVIEW\n#if NUM_DIR_LIGHTS > 0\nDirectionalLight GCDL( DirectionalLight l ) { if ( gl_ViewID_OVR != 0u ) l.direction = mat3( gcVD1 ) * l.direction; return l; }\n#endif\n'
        r'#if NUM_POINT_LIGHTS > 0\nPointLight GCPL( PointLight l ) { if ( gl_ViewID_OVR != 0u ) l.position = ( gcVD1 * vec4( l.position, 1.0 ) ).xyz; return l; }\n#endif\n'
        r'#if NUM_HEMI_LIGHTS > 0\nHemisphereLight GCHL( HemisphereLight l ) { if ( gl_ViewID_OVR != 0u ) l.direction = mat3( gcVD1 ) * l.direction; return l; }\n#endif\n'
        r'#else\n#define GCDL( l ) l\n#define GCPL( l ) l\n#define GCHL( l ) l\n#endif\n",lights_phong_fragment:')
    for a in [r'getDirectionalDirectLightIrradiance( directionalLights[ i ], geometry, directLight );', r'directionalLight = directionalLights[ i ];']:
        add(a, a.replace('directionalLights[ i ]', 'GCDL( directionalLights[ i ] )'))
    for a in [r'getPointDirectLightIrradiance( pointLights[ i ], geometry, directLight );', r'pointLight = pointLights[ i ];']:
        add(a, a.replace('pointLights[ i ]', 'GCPL( pointLights[ i ] )'))
    for a in [r'vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );', r'vIndirectBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry );', r'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );']:
        add(a, a.replace('hemisphereLights[ i ]', 'GCHL( hemisphereLights[ i ] )'))
    # 1d. render loop: one draw per object with the left camera; eye 1's matrices for the shader
    add('if(n.isArrayCamera){const e=n.cameras;for(let n=0,i=e.length;n<i;n++){const i=e[n];a.layers.test(i.layers)&&(j.viewport(b.copy(i.viewport)),p.setupLightsView(i),Re(a,t,i,o,l,h))}}else Re(a,t,n,o,l,h)',
        'if(n.isArrayCamera){const e=n.cameras;if(2===e.length&&window.__gtXR&&window.__gtXR.mvActive){const c0=e[0],c1=e[1];a.layers.test(c0.layers)&&(m.__mvC1=c1,m.__mvD=(m.__mvD||new c0.matrixWorld.constructor).multiplyMatrices(c1.matrixWorldInverse,c0.matrixWorld),j.viewport(b.copy(c0.viewport)),p.setupLightsView(c0),Re(a,t,c0,o,l,h),m.__mvC1=null)}else for(let n=0,i=e.length;n<i;n++){const i=e[n];a.layers.test(i.layers)&&(j.viewport(b.copy(i.viewport)),p.setupLightsView(i),Re(a,t,i,o,l,h))}}else Re(a,t,n,o,l,h)')
    add('e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),e.isImmediateRenderObject',
        'e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),m.__mvC1&&((e.__mvR||(e.__mvR={mv:new e.modelViewMatrix.constructor,nm:new e.normalMatrix.constructor})).mv.multiplyMatrices(m.__mvC1.matrixWorldInverse,e.matrixWorld),e.__mvR.nm.getNormalMatrix(e.__mvR.mv)),e.isImmediateRenderObject')
    add('if(_.setValue(me,"projectionMatrix",e.projectionMatrix),',
        'if(_.setValue(me,"projectionMatrix",e.projectionMatrix),m.__mvC1&&(_.setValue(me,"gcP1",m.__mvC1.projectionMatrix),_.setValue(me,"gcV1",m.__mvC1.matrixWorldInverse),_.setValue(me,"gcC1",(m.__mvV||(m.__mvV=V.clone())).setFromMatrixPosition(m.__mvC1.matrixWorld)),_.setValue(me,"gcVD1",m.__mvD)),')
    add('_.setValue(me,"modelViewMatrix",i.modelViewMatrix),_.setValue(me,"normalMatrix",i.normalMatrix),_.setValue(me,"modelMatrix",i.matrixWorld),d}',
        '_.setValue(me,"modelViewMatrix",i.modelViewMatrix),_.setValue(me,"normalMatrix",i.normalMatrix),_.setValue(me,"modelMatrix",i.matrixWorld),m.__mvC1&&i.__mvR&&(_.setValue(me,"gcMV1",i.__mvR.mv),_.setValue(me,"gcNM1",i.__mvR.nm)),d}')
    # 2. the game: batch size leaves room for the per-eye uniforms; renderer wrap for the warm-up
    add('Math.floor((e-96)/5)', 'Math.floor((e-96-(window.__gtXR&&window.__gtXR.mvPlanFor&&window.__gtXR.mvPlanFor(t)?24:0))/5)')
    add('O=new THREE.WebGLRenderer({antialias:!0,powerPreference:"high-performance"})',
        'O=(function(r){try{window.__gtXR&&window.__gtXR.mvWrap&&window.__gtXR.mvWrap(r)}catch(e){}return r})(new THREE.WebGLRenderer({antialias:!0,powerPreference:"high-performance"}))')
    # 3. the layers shim
    add('function loader(s){var c=document.createElement("canvas")', MVJS + 'function loader(s){var c=document.createElement("canvas")')
    add('  if (msaa && W2) { try { samples = Math.min(4, g.getParameter(g.MAX_SAMPLES) || 0); } catch (e) { samples = 0; } }\n',
        '  if (msaa && W2) { try { samples = Math.min(4, g.getParameter(g.MAX_SAMPLES) || 0); } catch (e) { samples = 0; } }\n'
        '  var MV = !!(W2 && X.mvPlanFor && X.mvPlanFor(g)), mvx = MV ? g.getExtension("OVR_multiview2") : null, msx = MV && samples ? g.getExtension("OCULUS_multiview") : null, mvd = null, mvdW = 0, mvdH = 0, mvOk = false, mvOwn = false;\n'
        '  if (MV && samples && !msx) { if (window.__fakeXR && window.__fakeXR.multiview) samples = 0; else MV = false; }\n'
        '  X.mvActive = MV;\n')
    add('var o = { textureType: "texture", colorFormat', 'var o = { textureType: MV ? "texture-array" : "texture", colorFormat')
    add('    var vs = pose.views;\n', '    var vs = pose.views;\n    if (MV) return mvBegin(L, vs);\n')
    add('  S.getViewport = function (v) {',
        '  /* multiview: both eyes are slices of one texture array; one framebuffer with multiview attachments\n'
        '     (multisampled through OCULUS_multiview, which resolves on the tile: no blit). */\n'
        '  function mvBegin(L, vs) {\n'
        '    var dt = null;\n'
        '    for (var i = 0; i < vs.length; i++) {\n'
        '      var si = bd.getViewSubImage(L, vs[i]);\n'
        '      vp[i] = { eye: vs[i].eye, x: si.viewport.x, y: si.viewport.y, width: si.viewport.width, height: si.viewport.height };\n'
        '      if (i === 0) { tex = si.colorTexture; tw = si.textureWidth; th = si.textureHeight; dt = si.depthStencilTexture; }\n'
        '    }\n'
        '    vp.length = vs.length; S.w = tw; S.h = th;\n'
        '    var FB = g.FRAMEBUFFER, dep = samples ? null : dt;\n'
        '    if (!dep) {\n'
        '      if (!mvd || mvdW !== tw || mvdH !== th) { if (mvd) g.deleteTexture(mvd); mvd = g.createTexture(); g.bindTexture(g.TEXTURE_2D_ARRAY, mvd); g.texStorage3D(g.TEXTURE_2D_ARRAY, 1, g.DEPTH24_STENCIL8, tw, th, 2); g.bindTexture(g.TEXTURE_2D_ARRAY, null); mvdW = tw; mvdH = th; }\n'
        '      dep = mvd;\n'
        '    }\n'
        '    g.bindFramebuffer(FB, fb); mvOwn = dep === mvd;\n'
        '    if (samples) { msx.framebufferTextureMultisampleMultiviewOVR(FB, g.COLOR_ATTACHMENT0, tex, 0, samples, 0, 2); msx.framebufferTextureMultisampleMultiviewOVR(FB, g.DEPTH_STENCIL_ATTACHMENT, dep, 0, samples, 0, 2); }\n'
        '    else { mvx.framebufferTextureMultiviewOVR(FB, g.COLOR_ATTACHMENT0, tex, 0, 0, 2); mvx.framebufferTextureMultiviewOVR(FB, g.DEPTH_STENCIL_ATTACHMENT, dep, 0, 0, 2); }\n'
        '    if (!mvOk) {\n'
        '      var st = g.checkFramebufferStatus(FB);\n'
        '      if (st !== g.FRAMEBUFFER_COMPLETE) { __gtLog("multiview framebuffer incomplete (" + st + "); back to the classic path"); MV = false; X.mvActive = false; S.create(S.scale || 1); return false; }\n'
        '      mvOk = true; __gtLog("multiview live: " + tw + "x" + th + " per eye, msaa " + samples);\n'
        '    }\n'
        '    return true;\n'
        '  }\n'
        '  S.getViewport = function (v) {')
    add('    if (samples && tex) {\n', '    if (samples && tex && !MV) {\n')
    # P14 (GPU bandwidth, nothing drawn differently): on the headset's tiled GPU, a depth attachment that
    # is not invalidated is written back to memory at the end of every frame (both eyes, 4x MSAA resolved:
    # about 28 MB a frame). Nothing reads that depth: the compositor never sees it (the layer gets colour
    # only) and the next frame clears it. So after the frame's last draw the depth-stencil attachment is
    # invalidated, the standard Quest advice. Only our own depth buffer (the MSAA path): a depth texture the
    # layer itself provides may be used by the compositor. `__gtXR.keepDepth = true` switches it off.
    add('  S.end = function () {\n',
        '  S.end = function () {\n'
        '    if (MV && mvOk && mvOwn && tex && !X.keepDepth) { try { g.bindFramebuffer(g.FRAMEBUFFER, fb); g.invalidateFramebuffer(g.FRAMEBUFFER, [g.DEPTH_STENCIL_ATTACHMENT]); X.depthDiscards = (X.depthDiscards || 0) + 1; } catch (e) {} }\n')
    add('  var shim = null, fake = null;\n', '  var shim = null, fake = null;\n  try { s.addEventListener("end", function () { X.mvDone = true; X.mvActive = false; }); } catch (e) {}\n')
    # The eye buffer's size, once per layer (the layer's first frame): the Quest 3S's browser reports "Quest 3"
    # in its user agent (NOTES 82), so the size is how a log tells the two apart.
    add('    S.w = tw; S.h = th; vp.length = vs.length;\n',
        '    S.w = tw; S.h = th; vp.length = vs.length;\n'
        '    if (S.sized !== L) { S.sized = L; try { __gtLog("eye buffer " + tw + "x" + th + " at scale " + S.scale); } catch (e) {} }\n')
    add('__gtLog("projection layer live, scale " + sc + ", msaa " + shim.samples);', '__gtLog("projection layer live, scale " + sc + ", msaa " + shim.samples + ", multiview " + !!X.mvActive);')
    return E

MULTIVIEW = _multiview()   # part of the release since 3.15.34 (appended to GAME_FIXES below)

EDITS = [
    # 1. Head script: request the VR session immediately on the Quest Browser (the
    #    immersive activity accepts a page request without a press; it never sends
    #    sessiongranted for a fresh launch, see NOTES 33), park the session, and
    #    draw our own loading screen into it (title, progress bar) until the game
    #    takes it over. Also keeps the sessiongranted path for browsers that use it.
    (
        '<title>Greeblis Town</title>',
        '<title>GREEBLIS TOWN</title>' + '<script>/* APK immersive launch + in-VR loading screen (see tools/apply_entry_fix.py) */(function(){var X=window.__gtXR={granted:!1,pending:null,enter:null,taken:!1,ready:!1,step:0,total:39,label:"Loading"};var T0=Date.now();window.__gtLog=function(m){try{fetch("/log?m="+encodeURIComponent((Date.now()-T0)+"ms "+String(m).slice(0,700)),{keepalive:!0}).catch(function(){})}catch(e){}};var Q=/OculusBrowser|Quest/i.test(navigator.userAgent||"");function req(){try{return navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor","layers"]})}catch(e){return null}}function park(p){if(!p)return;var q=p.then(function(s){try{s.addEventListener("end",function(){X.pending===q&&(X.pending=null)})}catch(e){}try{loader(s)}catch(e){__gtLog("loader failed: "+(e&&e.stack||e))}try{s.addEventListener("end",function(){__gtLog("session ended"+(X.taken?" (after handover)":" (before handover)"))})}catch(e){}__gtLog("session parked, features="+(s.enabledFeatures?Array.prototype.join.call(s.enabledFeatures,","):"?"));if(X.layersMode(s)){X.installLayerStub();return X.facade(s)}return s},function(e){__gtLog("requestSession rejected: "+e);X.pending===q&&(X.pending=null)});X.pending=q}function ensure(){X.pending||X.taken||park(req())}if(Q&&navigator.xr)ensure();try{navigator.xr&&navigator.xr.addEventListener("sessiongranted",function(){X.granted=!0;if(X.taken)return;if(X.enter&&X.ready&&!X.pending){X.enter();return}ensure()})}catch(e){}var SL=[],sl0=performance.now(),slL="start";window.__gtY=function(l){X.step++;var n=performance.now();SL.push(slL+" "+Math.round(n-sl0));sl0=n;slL=l||slL;l&&(X.label=l);return new Promise(function(r){setTimeout(r,0)})};X.slices=SL;Object.defineProperty(X,"enter",{configurable:!0,get:function(){return X._enter},set:function(f){X._enter=f&&function(){try{SL.push(slL+" "+Math.round(performance.now()-sl0));__gtLog("boot slices ms: "+SL.join(", "))}catch(e){}return f.apply(this,arguments)}}});X.tex={map:{},pr:{},n:{},on:!0};function hsh(s){var h=5381;for(var i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(16)}window.__gtTexSub=function(w,h,fn){try{if(!X.tex.on||X.booted)return fn;var src=fn.toString();if(/fillText|strokeText/.test(src))return fn;var k=w+"x"+h+":"+hsh(src),i=(X.tex.n[k]=(X.tex.n[k]||0)+1)-1;if(X.tex.capture)return function(s,e,o){fn(s,e,o);try{X.tex.capture.push({k:k,i:i,w:w,h:h,c:s.canvas})}catch(e2){}};var L=X.tex.map[k],im=L&&L[i];if(im){X.tex.used=(X.tex.used||0)+1;return function(s){s.drawImage(im,0,0);try{var P=X.tex.pr[k]&&X.tex.pr[k][i];if(P)s.canvas.__gtPr=P}catch(e3){}}}}catch(e){}return fn};var loadAssets=function(){return new Promise(function(res){var fin=function(){res()};try{fetch("tex/manifest.json").then(function(r){return r.ok?r.json():null}).then(function(m){if(!m||!m.length)return fin();var left=m.length;m.forEach(function(e){fetch("tex/"+e.f).then(function(r){return r.ok?r.blob():null}).then(function(b){return b?createImageBitmap(b):null}).then(function(im){if(im){(X.tex.map[e.k]=X.tex.map[e.k]||[])[e.i]=im;e.pr&&((X.tex.pr[e.k]=X.tex.pr[e.k]||[])[e.i]=e.pr)}--left||fin()},function(){--left||fin()})})},fin).catch(fin)}catch(e){fin()}})};X.assets=loadAssets();window.__gtAssets=function(){return X.assets};' + SHIM + 'function loader(s){var c=document.createElement("canvas"),g=c.getContext("webgl",{xrCompatible:!0,antialias:!1});if(!g)return;var HL=X.layersMode(s),L=null,SH=null;if(!HL){L=new XRWebGLLayer(s,g);s.updateRenderState({baseLayer:L})}var ref=null,LY=null;X.stop=function(){try{if(LY&&!HL){s.updateRenderState({layers:[]});LY=null}}catch(e){}};function layers(r){if(!HL)return;var bd=new XRWebGLBinding(s,g),cube=bd.createCubeLayer({space:r,viewPixelWidth:64,viewPixelHeight:64,layout:"mono"}),quad=bd.createQuadLayer({space:r,viewPixelWidth:1024,viewPixelHeight:512,layout:"mono",width:1.3,height:.65,transform:new XRRigidTransform({x:0,y:-.3,z:-5})});s.updateRenderState({layers:[cube,quad]});LY={bd:bd,cube:cube,quad:quad,sky:null};X.mode="layers"}s.requestReferenceSpace("local").then(function(r){ref=r;try{layers(r)}catch(e){X.layersErr=String(e);__gtLog("loader layers failed: "+(e&&e.stack||e));LY=null}if(HL&&!LY)try{SH=X.projShim(s,g,!1);SH.setRef(r);SH.create(1);X.mode="projection-layer"}catch(e2){__gtLog("loader projection layer failed: "+(e2&&e2.stack||e2))}},function(e){__gtLog("loader reference space failed: "+e)});function sh(k,src){var h=g.createShader(k);g.shaderSource(h,src);g.compileShader(h);return h}var pr=g.createProgram();g.attachShader(pr,sh(g.VERTEX_SHADER,"attribute vec2 p;uniform mat4 P,V;varying vec2 t;void main(){t=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=P*V*vec4(p.x*.65,p.y*.325-.3,-5.,1.);}"));g.attachShader(pr,sh(g.FRAGMENT_SHADER,"precision mediump float;uniform sampler2D s;varying vec2 t;void main(){gl_FragColor=texture2D(s,t);}"));g.linkProgram(pr);var ap=g.getAttribLocation(pr,"p"),uP=g.getUniformLocation(pr,"P"),uV=g.getUniformLocation(pr,"V"),buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),g.STATIC_DRAW);var tc=document.createElement("canvas");tc.width=1024;tc.height=512;var x2=tc.getContext("2d"),tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);var drawn="";function paint(){var p=Math.min(.97,X.step/X.total),k=Math.round(p*100)+"|"+X.label+"|"+(X.err||"");if(k===drawn)return;drawn=k;x2.clearRect(0,0,1024,512);x2.fillStyle="rgba(20,30,50,0.55)";x2.beginPath();x2.roundRect?x2.roundRect(20,20,984,472,40):x2.rect(20,20,984,472);x2.fill();x2.fillStyle="#ffffff";x2.textAlign="center";x2.font="bold 96px sans-serif";x2.fillText("GREEBLIS TOWN",512,170);x2.font="46px sans-serif";x2.fillText(X.err?(X.label&&/Retry|Could/.test(X.label)?X.label:"Problem: "+X.err).slice(0,60):"Loading…",512,270);x2.fillStyle="rgba(255,255,255,0.25)";x2.fillRect(112,340,800,36);x2.fillStyle="#f4cc4a";x2.fillRect(112,340,800*p,36);if(!LY){g.bindTexture(g.TEXTURE_2D,tex);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,0);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,tc)}}var c0=14083823,cr=(c0>>16&255)/255,cg=(c0>>8&255)/255,cb=(c0&255)/255;function frame(t,f){if(X.taken||!X.pending)return;s.requestAnimationFrame(frame);X.loaderFrames=(X.loaderFrames||0)+1;if(LY){try{if(LY.cube.needsRedraw){if(!LY.sky){LY.sky=[];var top="rgb("+Math.round(cr*255)+","+Math.round(cg*255)+","+Math.round(cb*255)+")",hz="rgb("+Math.min(255,Math.round(cr*255)+34)+","+Math.min(255,Math.round(cg*255)+30)+","+Math.min(255,Math.round(cb*255)+24)+")",gd="rgb("+Math.round(cr*255*.52)+","+Math.round(cg*255*.6)+","+Math.round(cb*255*.5)+")";for(var fc=0;fc<6;fc++){var cv=document.createElement("canvas");cv.width=cv.height=64;var sc=cv.getContext("2d");if(fc===2){sc.fillStyle=top;sc.fillRect(0,0,64,64)}else if(fc===3){sc.fillStyle=gd;sc.fillRect(0,0,64,64)}else{var gr=sc.createLinearGradient(0,0,0,64);gr.addColorStop(0,top);gr.addColorStop(.47,hz);gr.addColorStop(.5,gd);gr.addColorStop(1,gd);sc.fillStyle=gr;sc.fillRect(0,0,64,64)}LY.sky.push(cv)}}var si=LY.bd.getSubImage(LY.cube,f);g.bindTexture(g.TEXTURE_CUBE_MAP,si.colorTexture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,0);for(var k=0;k<6;k++)g.texSubImage2D(g.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,0,0,g.RGBA,g.UNSIGNED_BYTE,LY.sky[k])}var before=drawn;paint();if(LY.quad.needsRedraw||before!==drawn){var qi=LY.bd.getSubImage(LY.quad,f);g.bindTexture(g.TEXTURE_2D,qi.colorTexture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,1);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);g.texSubImage2D(g.TEXTURE_2D,0,0,0,g.RGBA,g.UNSIGNED_BYTE,tc)}return}catch(e){X.layersErr=String(e);__gtLog("loader layers frame failed: "+(e&&e.stack||e));try{if(HL){SH=X.projShim(s,g,!1);SH.setRef(ref);SH.create(1);X.mode="projection-layer"}else{s.updateRenderState({layers:[]});s.updateRenderState({baseLayer:L});X.mode="projection"}}catch(e2){}LY=null}}try{if(HL&&(!SH||!SH.begin(f)))return;paint();g.bindFramebuffer(g.FRAMEBUFFER,HL?SH.fb:L.framebuffer);g.clearColor(cr,cg,cb,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);var pose=ref&&f.getViewerPose(ref);if(!pose)return;g.useProgram(pr);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);g.disable(g.DEPTH_TEST);g.bindBuffer(g.ARRAY_BUFFER,buf);g.enableVertexAttribArray(ap);g.vertexAttribPointer(ap,2,g.FLOAT,!1,0,0);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,tex);for(var i=0;i<pose.views.length;i++){var v=pose.views[i],vp=HL?SH.getViewport(v):L.getViewport(v);g.viewport(vp.x,vp.y,vp.width,vp.height);g.uniformMatrix4fv(uP,!1,v.projectionMatrix);g.uniformMatrix4fv(uV,!1,v.transform.inverse.matrix);g.drawArrays(g.TRIANGLE_STRIP,0,4)}if(HL)SH.end()}catch(e){X.drawErr=String(e)}}X.fail=function(e){var m=e&&(e.name||"")+(e.message?": "+e.message:"")||String(e);__gtLog("entry failed ("+(X.retries||0)+"): "+(e&&e.stack||m));X.err=m;X.taken=!1;drawn="";try{if(HL){LY?s.updateRenderState({layers:[LY.cube,LY.quad]}):SH&&SH.layer&&s.updateRenderState({layers:[SH.layer]})}else s.updateRenderState({baseLayer:L})}catch(e2){}s.requestAnimationFrame(frame);if((X.retries=(X.retries||0)+1)<=2)setTimeout(function(){if(!X.taken&&X.pending&&X.enter){X.label="Retrying…";drawn="";X.enter()}},2500);else{X.label="Could not start VR. Please close and reopen the app.";drawn=""}};s.requestAnimationFrame(frame)}})();</script>',
    ),
    # 2. Gate: expose the game's own "enter VR" routine to the head script.
    (
        'const t=()=>{o.presenting||(gcEB.ready&&je())};try{navigator.xr.addEventListener("sessiongranted",t)}catch(e){}',
        'const t=()=>{o.presenting||(gcEB.ready&&je())};try{navigator.xr.addEventListener("sessiongranted",t)}catch(e){}'
        'try{window.__gtXR&&(window.__gtXR.enter=t)}catch(e){}',
    ),
    # 3. World ready flag for the head script (the actual entry happens at the end
    #    of the boot, after shaders are compiled and the game loop is running).
    (
        'gcEB.ready=!0}()',
        'gcEB.ready=!0;try{window.__gtXR&&(window.__gtXR.ready=!0)}catch(e){}}()',
    ),
    # 4. Session request: reuse the parked session and tell the loader to stop.
    (
        'a=await navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]})',
        'a=await(window.__gtXR&&(window.__gtXR.taken=!0,window.__gtXR.stop&&window.__gtXR.stop(),window.__gtXR.pending)||navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]}))',
    ),
    # 5. Boot becomes async so the loading screen can draw between slices: the
    #    outer boot function and its world-build IIFE are awaited, errors still
    #    reach vo(); at the very end the game enters the parked session.
    (
        'try{window.__jgpBlocked?blockedGate():!function(){(function(){G.bubbleBlip',
        'try{window.__jgpBlocked?blockedGate():!async function(){await __gtAssets();await(async function(){G.bubbleBlip',
    ),
    (
        'Re.start()}()}catch(t){vo(t,"boot")}',
        'Re.start(),window.__gtXR&&(window.__gtXR.booted=!0,(window.__gtXR.pending||window.__gtXR.granted)&&window.__gtXR.enter&&window.__gtXR.enter())}().catch((t=>vo(t,"boot")))}catch(t){vo(t,"boot")}',
    ),
    # 6. Shader compile in 8 slices (it is ~40% of the boot), then the first draw.
    (
        'JGP.farDetail&&JGP.farDetail.warm(!0),O.compile(C,B),O.render(C,B)',
        'JGP.farDetail&&JGP.farDetail.warm(!0),' + 'await(async function(){const ms=[];C.traverse((o=>{(o.isMesh||o.isSprite||o.isLine||o.isPoints)&&o.visible&&ms.push(o)}));const n=Math.max(1,Math.ceil(ms.length/8));for(let i=0;i<ms.length;i+=n){ms.forEach(((o,k)=>{o.visible=k>=i&&k<i+n}));try{O.compile(C,B)}catch(e){}await __gtY("shaders")}ms.forEach((o=>{o.visible=!0}))})()' + ',O.compile(C,B),await __gtY("first draw"),O.render(C,B)',
    ),
    (
        'Oe.visible=!1),Bulb.warm(),Ze(),Re.start()',
        'Oe.visible=!1),await __gtY("warm-up"),Bulb.warm(),Ze(),Re.start()',
    ),
    # 9. Pre-rendered textures: the canvas painter consults the head script's
    #    table first (see tools/prerender_textures.js); painters that draw text
    #    are never substituted (fonts differ between machines).
    (
        'function b(e,o,a,n={}){const r=document.createElement("canvas");',
        'function b(e,o,a,n={}){a=window.__gtTexSub?window.__gtTexSub(e,o,a):a;const r=document.createElement("canvas");',
    ),
] + [(a, 'await __gtY(%r),' % l + a) for l, a in [
    # 7. Yield points before the heavy world-build steps (anchors are the first
    #    characters of each step; see tools/lib/boot_map.js for the map).
    ('garden', 'function(t,e){const o=new THREE.Group;o.position.set(0,0,0),'),
    ('kiosks', 'function(t,e){const o=new THREE.Group;o.userData.jgpKeep=!0,'),
    ('pond', 'function(t,e){const o=new THREE.Group;o.position.set(t,0,e),C.add(o),F'),
    ('clouds', 'function(){const t=x.world("#ffffff",{fog:!1}),e=[];for(let '),
    ('library', 'function(t,e){const o=new THREE.Group;o.position.set(t,0,e),o.rotation'),
    ('portal', 'at(),L.push((()=>{const e=me.active;for(const o of[le.list,c'),
    ('music', 'L.push(((t,e)=>{e=e||.016;const o=me.active&&bt.live,a=t,mus'),
    ('scenery', 'C.children.forEach((e=>{e!==At&&e.traverse((e=>{!e.isMesh||e'),
    ('scenery-batch', 'io(t)})(),At=function(){const e=new THREE.Group,o=t.player,a'),
    ('player', 'At=function(){const e=new THREE.Group,o=t.player,a=x.clay(o.'),
    ('pickups', 'le.build(),ce.build(),function(){It.all.forEach((t=>_e(t.gro'),
    ('batching', 'function(){It.all.forEach((t=>_e(t.group))),st.group&&_e(st.'),
    ('placing', 'B.position.set(At.position.x,1.7,At.position.z),B.lookAt(0,1'),
]] + [
    # 8. Yields inside the spawn loops (one creature per slice).
    (
        'for(const t in e){const o=e[t];It.spawn({id:t,kind:"companion"',
        'for(const t in e){await __gtY("companions");const o=e[t];It.spawn({id:t,kind:"companion"',
    ),
    (
        'for(const t in o){const e=o[t];It.spawn({id:t,kind:"npc"',
        'for(const t in o){await __gtY("townsfolk");const e=o[t];It.spawn({id:t,kind:"npc"',
    ),
    (
        'for(let e=0;e<t.creaturesRoaming;e++)Mo(r[e%r.length]);',
        'for(let e=0;e<t.creaturesRoaming;e++){await __gtY("creatures");Mo(r[e%r.length])}',
    ),
]

# ---------------------------------------------------------------------------
# Gameplay fixes (approved bug fixes; see tools/NOTES.md for the investigation).
# ---------------------------------------------------------------------------
GAME_FIXES = [
    # B24 (VRC.Quest.Input.4, focus-aware): while the system UI has focus the XR session is
    # "visible-blurred"; the game already keeps rendering and skips its update (no input), but
    # three.js stops updating controller poses, so the controller rays and hand meshes stayed
    # frozen in view. The renderer's controller groups (ray and grip, which carry the game's
    # beam and hand meshes) are hidden while blurred; on return they are shown again and
    # three.js resumes setting their visibility from the poses each frame.
    (
        'Oe.addEventListener("visibilitychange",(()=>{o.blurred=Oe&&"visible"!==Oe.visibilityState,o.blurred?Ho.capture():',
        'Oe.addEventListener("visibilitychange",(()=>{o.blurred=Oe&&"visible"!==Oe.visibilityState,[0,1].forEach((i=>{try{O.xr.getController(i).visible=O.xr.getControllerGrip(i).visible=!o.blurred}catch(e){}})),o.blurred?Ho.capture():',
    ),
    # B21 (author, "fix all instances of z-fighting listed"): the parapet band on the
    # Store, Bank and Fire Station fronts is a box as wide as the wall, so its side faces
    # lie in the wall's side planes and overlap them by 1 cm at the wall top (a shimmering
    # line along the roof edge), and its back face lies in the back wall's plane. The band
    # is now 2 cm wider (1 cm proud on each side) and its back is 2 cm proud; the front
    # edge stays where it was.
    (
        'B.box(bin,o2.col,0,h/2,-D/2,w,h,D).box("plain","#5a5a60",0,h+.15,-(D+.32)/2,w,.3,D-.32)',
        'B.box(bin,o2.col,0,h/2,-D/2,w,h,D).box("plain","#5a5a60",0,h+.15,-(D+.34)/2,w+.02,.3,D-.3)',
    ),
    (
        'B.box("stone",st,0,h/2,-D/2,w,h,D).box("plain","#5a5a60",0,h+.15,-(D+.32)/2,w,.3,D-.32)',
        'B.box("stone",st,0,h/2,-D/2,w,h,D).box("plain","#5a5a60",0,h+.15,-(D+.34)/2,w+.02,.3,D-.3)',
    ),
    (
        'B.box("brick",brick,0,h/2,-D/2,w,h,D).box("plain","#5a5a60",0,h+.15,-(D+.32)/2,w,.3,D-.32)',
        'B.box("brick",brick,0,h/2,-D/2,w,h,D).box("plain","#5a5a60",0,h+.15,-(D+.34)/2,w+.02,.3,D-.3)',
    ),
    # B22 (author): Mushroom's hat band (a six-sided torus tube) rested with its flat
    # underside exactly on the brim's top surface, a sliding contact seen from below the
    # brim. The band sits 3 mm lower, so its underside is inside the brim (3 cm thick there)
    # and the brim's surface crosses the tube at an angle. Nothing visible changes.
    (
        'R(T.torus(.375,.022,6,40),x.clay("#3a2414",{shininess:30}),hat,[0,.05,0],[Math.PI/2,0,0])',
        'R(T.torus(.375,.022,6,40),x.clay("#3a2414",{shininess:30}),hat,[0,.047,0],[Math.PI/2,0,0])',
    ),
    # B23 (author): the Robin's three tail feathers are flat boxes 22 mm wide on 20 mm
    # centres, so their top and bottom faces share planes in the 2 mm overlaps; the white
    # tips' undersides lay in the feathers' undersides. The middle feather is 1 mm thicker
    # (its faces half a millimetre proud of its neighbours') and the tips sit half a
    # millimetre higher, with their undersides inside the feathers.
    (
        'R(T.box(.022,.008,.24-.02*Math.abs(j)),j?back:dark,tail,[j*.02,0,-.11],[0,-.06*j,0]);j&&R(T.box(.022,.009,.03),white,tail,[j*.02+.0005*j,.0005,-.215],[0,-.06*j,0])',
        'R(T.box(.022,j?.008:.009,.24-.02*Math.abs(j)),j?back:dark,tail,[j*.02,0,-.11],[0,-.06*j,0]);j&&R(T.box(.022,.009,.03),white,tail,[j*.02+.0005*j,.001,-.215],[0,-.06*j,0])',
    ),
    # Mushroom stuck beside/behind his kiosk. The navigator's segment test
    # ignored a building entirely whenever BOTH ends of the segment lay inside
    # the building's clearance margin, so a route from a spot beside the kiosk
    # to the front waypoint (both within ~1 m of the walls) was reported clear
    # and he walked into the wall for good. The fix: when either end is within
    # the margin, test the segment against the real hull instead (and still
    # ignore the building when both ends are inside it, i.e. walking indoors).
    (
        'segBlocked(x0,z0,x1,z1,n){for(const B of this.buildings){if(this.inHull(B,x0,z0,n)&&this.inHull(B,x1,z1,n))continue;'
        'const[ax,az]=this.local(B,x0,z0),[bx,bz]=this.local(B,x1,z1),h=B.hull,dx=bx-ax,dz=bz-az;let t0=0,t1=1;'
        'const clip=(p,q)=>{if(Math.abs(p)<1e-9)return q>=0;const r=q/p;return p<0?r>t1?!1:(r>t0&&(t0=r),!0):r<t0?!1:(r<t1&&(t1=r),!0)};'
        'if(clip(-dx,ax-(h[0]-n))&&clip(dx,h[2]+n-ax)&&clip(-dz,az-(h[1]-n))&&clip(dz,h[3]+n-az)&&t0<=t1)return!0}return!1}',
        'segBlocked(x0,z0,x1,z1,n){for(const B of this.buildings){let m=n;if(this.inHull(B,x0,z0,n)||this.inHull(B,x1,z1,n)){if(this.inHull(B,x0,z0)&&this.inHull(B,x1,z1))continue;m=0}'
        'const[ax,az]=this.local(B,x0,z0),[bx,bz]=this.local(B,x1,z1),h=B.hull,dx=bx-ax,dz=bz-az;let t0=0,t1=1;'
        'const clip=(p,q)=>{if(Math.abs(p)<1e-9)return q>=0;const r=q/p;return p<0?r>t1?!1:(r>t0&&(t0=r),!0):r<t0?!1:(r<t1&&(t1=r),!0)};'
        'if(clip(-dx,ax-(h[0]-m))&&clip(dx,h[2]+m-ax)&&clip(-dz,az-(h[1]-m))&&clip(dz,h[3]+m-az)&&t0<=t1)return!0}return!1}',
    ),
    # Hennrick's campfire line was missing its subject.
    (
        'campfire:"Sometimes worry that doing these things will alter the timeline…"',
        'campfire:"Sometimes I worry that doing these things will alter the timeline…"',
    ),
    # B8: only the shopkeeper should pause while the Shop menu is open. holdsAll()
    # froze every NPC for any panel but the battle; now the shop panel is excluded
    # and Zollod (cutebex) is paused through the targeted branch instead.
    (
        'function holdsAll(){return jt.has("panel")&&!(_t.state&&"battle"===_t.state.kind)}',
        'function holdsAll(){return jt.has("panel")&&!(_t.state&&("battle"===_t.state.kind||"shop"===_t.state.kind))}',
    ),
    (
        'jt.has("panel")&&xe.lastTarget===e&&"campfire"!==(_t.state&&_t.state.kind)){e.moving=!1,e.gcWant=0,',
        'jt.has("panel")&&xe.lastTarget===e&&"campfire"!==(_t.state&&_t.state.kind)||jt.has("panel")&&_t.state&&"shop"===_t.state.kind&&e.def&&"ZOLLOD"===e.def.name){e.moving=!1,e.gcWant=0,',
    ),
    # B7: a failed VR request showed leftover wording for one frame and was then
    # overwritten by "Press A". Show a real message and hold it for 8 seconds.
    (
        'e&&/Security|NotSupported/.test(e.name)&&(mo("gateText").textContent="VR can\'t start in this preview.\\nOpen the inscription\'s own page.")',
        'e&&(mo("gateText").textContent="VR could not start ("+(e.name||"error")+").\\nClick or press A to try again.",mo("gateText").holdUntil=performance.now()+8e3)',
    ),
    (
        'if(gcEB.ready&&Ke.textContent!=="Press A to Continue.")Ke.textContent="Press A to Continue."',
        'if(gcEB.ready&&Ke.textContent!=="Press A to Continue."&&!(Ke.holdUntil>performance.now()))Ke.textContent="Press A to Continue."',
    ),
    # B1: when a posted NPC's straight walk to a waypoint outside any building would
    # cross a real wall, re-route at once instead of pinning against the wall for
    # a second until the stuck detector notices.
    (
        'if(t.vbk>=0&&dh>.3){const w=via[t.vbk],dx=w[0]-n.x,dz=w[1]-n.z,d=Math.hypot(dx,dz)||1,st=Math.min(d,1.4*wk*o);',
        'if(t.vbk>=0&&dh>.3){const w=via[t.vbk],dx=w[0]-n.x,dz=w[1]-n.z,d=Math.hypot(dx,dz)||1,st=Math.min(d,1.4*wk*o);'
        'if(!F.buildings.some((B=>F.inHull(B,n.x,n.z)||F.inHull(B,w[0],w[1])))&&F.segBlocked(n.x,n.z,w[0],w[1],0))t.gcWant=1,t.gcBlk=1.3;',
    ),
    # B4: the route smoother only checked grid cells, so a long straightened leg
    # could clip a building corner; also reject legs that cross a real hull.
    (
        'clear=(ax,az,bx,bz)=>{const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.3));',
        'clear=(ax,az,bx,bz)=>{if(F.segBlocked(ax,az,bx,bz,.3))return!1;const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.3));',
    ),
    # B12 pre-warm: the first pickup of a session created 14 textures and 57
    # geometries on the spot (sparkle pool, label textures, splat) and dropped
    # frames. Warm them during the sliced boot, out of sight (y = -60), so a
    # pickup never allocates on the GPU mid-game. Anchored on the entry edit's
    # warm-up slice (GAME_FIXES apply after EDITS).
    (
        'await __gtY("warm-up"),Bulb.warm(),Ze(),Re.start()',
        'await __gtY("warm-up"),Bulb.warm(),await __gtY("effects"),(function(){try{const y=-60;[["\u2665",M.pink],["\u2665","#e8a838"],["!",M.yellow],["!",M.pink],["?",M.teal],["\u2726",M.yellow],["\u2726","#62d6c8"],["\u266a",M.lime],["~",M.yellow],["\u273f",M.yellow],["\u273f",M.pink],["\u00b7",M.white]].forEach((([s2,c2])=>Ut.at(0,y,0,s2,c2)));Nt.sparkle(new c(0,y,0),14);Nt.splat(999,999,.5,"#ffffff")}catch(e){}})(),Ze(),Re.start()',
    ),
    # B2: the stuck-rescue teleport only fired out of view (4 stalls, >12 m away
    # and outside the view), so an NPC stalling in front of the player twitched
    # for as long as they watched. Keep that, and add a visible fallback after 8
    # stalls (~10 s): a sparkle burst where it stood and where it lands ("poof").
    ('if(t.gcStuckN>=4&&!function(t){const e=t.group.position,o=we.presenting&&we.headPos?we.headPos:At.position;if(Math.hypot(e.x-o.x,e.z-o.z)<12)return!0;B.updateMatrixWorld(),We.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),Fe.setFromProjectionMatrix(We);for(const t of[.3,1.2,2.4])if(Fe.containsPoint(new c(e.x,t,e.z)))return!0;return!1}(t))return t.group.position.set(r,t.group.position.y,s),t.gcNav=null,t.goHome=!1,t.gcNavHome=!1,void(t.gcStuckN=0);', 'const gcVis=function(t){const e=t.group.position,o=we.presenting&&we.headPos?we.headPos:At.position;if(Math.hypot(e.x-o.x,e.z-o.z)<12)return!0;B.updateMatrixWorld(),We.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),Fe.setFromProjectionMatrix(We);for(const t of[.3,1.2,2.4])if(Fe.containsPoint(new c(e.x,t,e.z)))return!0;return!1}(t);if(t.gcStuckN>=4&&!gcVis||t.gcStuckN>=8){if(gcVis)try{const q=t.group.position;Nt.sparkle(new c(q.x,q.y+.6,q.z),14),Nt.sparkle(new c(r,q.y+.6,s),14)}catch(e){}return t.group.position.set(r,t.group.position.y,s),t.gcNav=null,t.goHome=!1,t.gcNavHome=!1,void(t.gcStuckN=0)}'),
    # B4r: the last leg of a route (previous point -> exact target) was only
    # checked up to 1.2 m short of the target, and the final target leg not at
    # all, so a route could still clip a building corner right at its end. Check
    # the whole leg before dropping the last cell, and if the final leg is still
    # blocked, go round the corner with an L-shaped step.
    (
        'clear(qx,qz,qx+(x1-qx)*f,qz+(z1-qz)*f)&&out.pop()}',
        'clear(qx,qz,qx+(x1-qx)*f,qz+(z1-qz)*f)&&!F.segBlocked(qx,qz,x1,z1,.3)&&out.pop()}',
    ),
    (
        'return i0+NX*j0===a&&i0>=0&&i0<NX||out.unshift([cx(a),cz(a)]),out.push([x1,z1]),out}',
        'i0+NX*j0===a&&i0>=0&&i0<NX||out.unshift([cx(a),cz(a)]);{const L=out[out.length-1];if(L&&F.segBlocked(L[0],L[1],x1,z1,.3)){const A=[L[0],z1],Bq=[x1,L[1]];!F.segBlocked(L[0],L[1],A[0],A[1],.3)&&!F.segBlocked(A[0],A[1],x1,z1,.3)?out.push(A):!F.segBlocked(L[0],L[1],Bq[0],Bq[1],.3)&&!F.segBlocked(Bq[0],Bq[1],x1,z1,.3)&&out.push(Bq)}}return out.push([x1,z1]),out}',
    ),
    # B14: the corner behind the Shop is sealed. The Shop stands diagonally
    # across the south-west corner and its clearance margin meets both park
    # walls, so the triangle behind it (local z below the back wall) is free
    # ground that no route can reach: a grid island of ~28 cells. A route that
    # started or ended there found no path and fell back to a straight leg
    # through the Shop (world test: 4/20 random routes crossed the Shop hull by
    # up to 3.4 m). Treat the sealed corner as not free, so it is never a
    # roaming target, a route endpoint, or an open grid cell.
    (
        '&&!F.buildings.some((B=>F.inHull(B,x,z,.6+.5*r)))&&roamZones().solid.every(',
        '&&!F.buildings.some((B=>F.inHull(B,x,z,.6+.5*r)||"shop"===B.name&&F.local(B,x,z)[1]<B.hull[1]))&&roamZones().solid.every(',
    ),
    # B15: a failed VR entry must never end the session. In an immersive
    # launch the session IS the app: ending it exits to the OS. The original
    # ended it when three.js could not attach (3.15.11 crashed this way:
    # the browser forbids baseLayer on a session with the "layers" feature).
    # Now the error goes to the loading screen, which keeps drawing, and the
    # entry is retried; the session is ended only when not launched by the APK.
    (
        'catch(e){vo(e,"xr-enter");try{a&&!Oe&&a.end()}catch(e){}',
        'catch(e){vo(e,"xr-enter");try{window.__gtXR&&window.__gtXR.fail?window.__gtXR.fail(e):a&&!Oe&&a.end()}catch(e){}',
    ),
    # Page errors are reported to the loopback server (logcat "GreeblisServer:
    # page: ...") so a headset log explains itself.
    (
        'console.error(o);',
        'console.error(o);try{window.__gtLog&&window.__gtLog(o)}catch(_){}',
    ),
    # B16: the game was not fully loaded when the user was dropped in. Two
    # things still ran after the handover: buildUI() (the VR panels, their
    # canvases and textures, plus two controller rigs) inside the entry
    # routine, and 2.5 s later Ho.capture(), a pixel readback of every painted
    # canvas texture (the handover profile measured it at seconds), i.e. the
    # black bars seen right after entering. Both now run during the loading
    # screen: the UI before the shader slices (so its programs are compiled
    # with the rest) and the capture in small slices before the boot ends.
    (
        'function i(){for(const e of a())try{const o=e.image;t.has(o)||t.set(o,{pr:n(o,o.width,o.height)})}catch(e){}}',
        'function i(L){for(const e of L||a())try{const o=e.image;t.has(o)||t.set(o,{pr:n(o,o.width,o.height)})}catch(e){}}',
    ),
    (
        'Object.assign(o,{capture:i,restore:c})})();',
        'Object.assign(o,{capture:i,restore:c,captureAsync:async function(n){n=n||6;const L=a();for(let k=0;k<L.length;k+=n){i(L.slice(k,k+n));await new Promise((r=>setTimeout(r,0)))}}})})();',
    ),
    (
        'JGP.farDetail&&JGP.farDetail.warm(!0),await(async function(){const ms=[];C.traverse(',
        'JGP.farDetail&&JGP.farDetail.warm(!0);try{window.__gtBuildUI&&window.__gtBuildUI()}catch(e){vo(e,"ui-prewarm")}await(async function(){const ms=[];C.traverse(',
    ),
    (
        'Ze(),Re.start(),window.__gtXR&&(',
        'Ze(),await __gtY("textures"),await Ho.captureAsync(),Re.start(),window.__gtXR&&(',
    ),
    (
        'Ue(2500,(()=>Ho.capture())),',
        'Ue(2500,(()=>Ho.captureAsync(1))),',
    ),
    # buildUI lives in the VR module's scope, which the boot cannot see; the
    # module publishes it (the module runs before the boot's first slice ends).
    (
        'function buildUI(){if(F.built)return;',
        'window.__gtBuildUI=buildUI;function buildUI(){if(F.built)return;',
    ),
    # B17: the garden Event's props (Backpacka, jets, drops, ripples: 28 objects)
    # were built when the Event gathered, a one-time stall in play (46 ms
    # headless). Build them hidden during the loading screen, before the shader
    # slices, so their programs compile with the rest.
    (
        'preview:e=>{made||(made=make()),flags=flags||{},pose(e,.016);return made.root},',
        'prewarm:()=>{made||(made=make(),hideAll())},preview:e=>{made||(made=make()),flags=flags||{},pose(e,.016);return made.root},',
    ),
    (
        'try{window.__gtBuildUI&&window.__gtBuildUI()}catch(e){vo(e,"ui-prewarm")}',
        'try{window.__gtBuildUI&&window.__gtBuildUI()}catch(e){vo(e,"ui-prewarm")}try{window.__gtBP&&window.__gtBP.prewarm()}catch(e){vo(e,"event-prewarm")}',
    ),
    # BP (the Event module) is not visible from the boot's scope either; publish it.
    (
        '})();const VIGS={};',
        '})();window.__gtBP=BP;window.__gtGlowWarm=()=>Ut.warm();const VIGS={};',
    ),
    # Sharpness: render scale 1.2 / 1.1 at the top two quality levels, native
    # below; foveation only from level 3. The author compared 1.2 on the headset
    # ("looks better"); the governor stepped it down to 1.1 after 4 s and to 1.0
    # after a minute, which with flash-free layer swaps (xr_layers_shim.js) is
    # the intended behaviour: sharp when there is headroom, native under load.
    (
        'quality:[1,1,1,1,1],foveation:[0,.25,.5,.75,1],',
        'quality:[1.2,1.1,1,1,1],foveation:[0,0,0,.5,1],',
    ),
    # Gallery painting (author's request): Gooward's large painting at the
    # Gallery kiosk is painted in a worker at ART.s pixels per unit (1.5: a
    # 3072x1158 canvas for 6.9 x 2.6 m). The painter scales with its canvas,
    # so 2.0 gives 4096x1544 (each of the three panels 1365x1544) and the art
    # textures take the maximum anisotropy instead of the global 8.
    (
        'ART={w:2048,h:772,s:1.5}',
        'ART={w:2048,h:772,s:2}',
    ),
    (
        't.colorSpace=old.colorSpace,t.anisotropy=old.anisotropy,t.needsUpdate=!0,',
        't.colorSpace=old.colorSpace,t.anisotropy=Math.min(16,O.capabilities.getMaxAnisotropy()),t.needsUpdate=!0,',
    ),
    # Texture capture probes (loading time): Ho.capture samples up to 8 pixels
    # of every painted canvas (a GPU readback each, 0.8 s of the 8.2 s boot on
    # the headset) to remember probe points for the context-loss restore.
    # Pre-rendered textures carry their probe points in the manifest, computed
    # at build time by tools/prerender_textures.js; the capture uses them.
    (
        'function i(L){for(const e of L||a())try{const o=e.image;t.has(o)||t.set(o,{pr:n(o,o.width,o.height)})}catch(e){}}',
        'function i(L){for(const e of L||a())try{const o=e.image;t.has(o)||t.set(o,{pr:o.__gtPr||n(o,o.width,o.height)})}catch(e){}}',
    ),
    # Submission safety: start at the native render scale (level 2: 1.0, no
    # foveation, today's baseline) and let the governor step UP to 1.1 / 1.2
    # when frames stay under budget, instead of starting at 1.2 and dropping
    # frames for a second or two at every launch (what the Store's
    # performance check looks for).
    (
        'Ge={level:0,ema:1e3/e.targetHz,',
        'Ge={level:2,ema:1e3/e.targetHz,',
    ),
    # Loading time (NOTES 49): the blob-body mesher ray-marches 4941 rays per
    # character body, each stepping 2 cm from 2.6 m inward until it is inside
    # the field (up to 130 field evaluations per ray, each a sum over every
    # part), then bisects 14 times. The field is a distance bound, so the
    # march can step by the field value instead (sphere tracing, 80% of the
    # bound, 2 cm to 15 cm): the same first crossing, found in a few steps; the
    # bisection keeps the surface within 1e-5 of before. Measured: the five
    # heavy townsfolk, the creatures and the kiosks spent 60-75% of their boot
    # slices in this march on the headset's own clock.
    (
        'hit=(oo,d)=>{const D=new c0(...d).normalize();let t=TM;while(t>0&&field(oo[0]+D.x*t,oo[1]+D.y*t,oo[2]+D.z*t)>0)t-=.02;let lo=Math.max(0,t),hi=t+.02;',
        'hit=(oo,d)=>{const D=new c0(...d).normalize();let t=TM,st=.02,f=field(oo[0]+D.x*t,oo[1]+D.y*t,oo[2]+D.z*t);while(t>0&&f>0){st=Math.min(.15,Math.max(.02,.8*f));t-=st;f=field(oo[0]+D.x*t,oo[1]+D.y*t,oo[2]+D.z*t)}let lo=Math.max(0,t),hi=t+st;',
    ),
    (
        'hit=(o,d)=>{const D=new c0(...d).normalize();let t=2.4;while(t>0&&field(o[0]+D.x*t,o[1]+D.y*t,o[2]+D.z*t)>0)t-=.02;let lo=Math.max(0,t),hi=t+.02;',
        'hit=(o,d)=>{const D=new c0(...d).normalize();let t=2.4,st=.02,f=field(o[0]+D.x*t,o[1]+D.y*t,o[2]+D.z*t);while(t>0&&f>0){st=Math.min(.15,Math.max(.02,.8*f));t-=st;f=field(o[0]+D.x*t,o[1]+D.y*t,o[2]+D.z*t)}let lo=Math.max(0,t),hi=t+st;',
    ),
    # B20 (author): z-fighting where the metal and the glowing parts of
    # Hennrick's forearm cuffs overlap. The cuff is a cylinder of radius .36
    # (height .26, so its top cap is at y -.99) whose surface reaches z .41;
    # its three cyan lights are boxes .08 x .04 x .02 centred at z .40 and
    # y -1.07 / -1.01 / -.95. Two exact coincidences: the lights' front faces
    # lay on the cuff's surface, and the middle light's top face (y -.99) lay
    # in the plane of the cuff's top cap, a cyan-on-metal sliver seen from
    # above (tools/test_coincident.js finds it; 3.15.22 fixed only the first).
    # The lights now sit half inside the cuff (centre z .415: back face .405
    # inside the metal, front face .425 proud by 1.5 cm), 1 cm higher
    # (y -1.06 / -1.00 / -.94, so the cap plane passes through the middle
    # light's body instead of along a face), and the cuff is .37 so it clears
    # the forearm's noise-displaced skin (.34 + up to .018).
    (
        'R(T.cyl(.36,.36,.26,20),p,e,[.2*t,-1.12,.05]);for(let o=0;o<3;o++)R(T.box(.08,.04,.02),u,e,[.2*t,.06*o-1.07,.4]);',
        'R(T.cyl(.37,.37,.26,20),p,e,[.2*t,-1.12,.05]);for(let o=0;o<3;o++)R(T.box(.08,.04,.02),u,e,[.2*t,.06*o-1.06,.415]);',
    ),
    # B11: Nextessa (the pizza courier) pinned against the Ancient. Inside the
    # church she walked straight at the player; when the player stood on the far
    # side of the Ancient, the Ancient's solid part blocked the line and nothing
    # re-routed her (and the same straight line pinned her on the way out).
    # Add a detour helper: if the church-local segment crosses the Ancient's box
    # (plus her radius), walk around its front corners first. Used for the
    # approach and for the exit path. The corners sit 1 m outside the margin so
    # follow()'s 1 m arrival radius cannot swallow them; a courier already at her
    # own-side corner walks straight (no detour loop).
    (
        'mark=()=>{kx=i.x,kz=i.z,kt=u},planIn',
        'mark=()=>{kx=i.x,kz=i.z,kt=u},segRect=(ax,az,bx,bz,R)=>{let t0=0,t1=1;const dx=bx-ax,dz=bz-az,cl=(p,q)=>{if(0===p)return q>=0;const r=q/p;if(p<0){if(r>t1)return!1;r>t0&&(t0=r)}else{if(r<t0)return!1;r<t1&&(t1=r)}return!0};return cl(-dx,ax-R[0])&&cl(dx,R[2]-ax)&&cl(-dz,az-R[1])&&cl(dz,R[3]-az)},detour=(ax,az,bx,bz)=>{if(!cb||!JGP.slug||!JGP.slug.ent)return[];const mg=.8*rr+.25,[sx,sz]=F.local(cb,JGP.slug.ent.home.x,JGP.slug.ent.home.z),AB=cb.parts.find((R=>sx>R[0]&&sx<R[2]&&sz>R[1]&&sz<R[3]));if(!AB)return[];const[ax2,az2]=F.local(cb,ax,az),[bx2,bz2]=F.local(cb,bx,bz),X=[AB[0]-mg,AB[1]-mg,AB[2]+mg,AB[3]+mg],same=Math.sign(ax2||1)===Math.sign(bx2||1),endIn=bx2>X[0]&&bx2<X[2]&&bz2>X[1]&&bz2<X[3];if(same&&endIn||!segRect(ax2,az2,bx2,bz2,X))return[];const fz=X[3]+.6,cx=s2=>s2>0?X[2]+1:X[0]-1,c1=[cx(Math.sign(ax2||1)),fz],c2=[cx(Math.sign(bx2||1)),fz];if(same&&Math.hypot(ax2-c1[0],az2-c1[1])<1.2)return[];return(same?[c1]:[c1,c2]).map((([x,z])=>F.world(cb,x,z)))},planIn',
    ),
    (
        'planOut=()=>{const v=sv();wp=v.way.slice().reverse().concat([v.out]),wi=0,we=!0,kn=0,n.inside="church",n.wallNear=!1,mark()}',
        'planOut=()=>{const v=sv(),lw=v.way[v.way.length-1];wp=detour(i.x,i.z,lw[0],lw[1]).concat(v.way.slice().reverse(),[v.out]),wi=0,we=!0,kn=0,n.inside="church",n.wallNear=!1,mark()}',
    ),
    (
        'else{const t=l.x-i.x,c=l.z-i.z,h=Math.hypot(t,c);if(h>o.stopDist+.001&&!n.wallNear&&"playing"===jt.top){const t=Math.min(h-o.stopDist,o.speed*e),a=it(i,l,!1);',
        'else{const t=l.x-i.x,c=l.z-i.z,h=Math.hypot(t,c),dv=me0&&plr&&h>o.stopDist+.001&&"playing"===jt.top?detour(i.x,i.z,l.x,l.z):[];if(dv.length)wp=dv,wi=0,we=!1,kn=0,mark(),n.moving=!0,r="arriving";else if(h>o.stopDist+.001&&!n.wallNear&&"playing"===jt.top){const t=Math.min(h-o.stopDist,o.speed*e),a=it(i,l,!1);',
    ),
    # P1 (author, FPS work, 2026-10-27): the render-scale governor steps down after half a
    # second over budget instead of a full second (overFrames 72 -> 36 at 72 Hz). Nothing
    # changes while frame time is within budget.
    (
        'overFrames:72,',
        'overFrames:36,',
    ),
    # P2: the pickup glow's point light makes every lit material compile a second shader
    # variant; `Ut.warm()` pre-compiles them (light on, `O.compile`) but ran at the moment of
    # entering VR, right after the drop-in. It now also runs during the loading screen, with
    # the other pre-warms (through a helper published where `B` is the camera), so the entry
    # compiles nothing. Same visuals.
    (
        'try{window.__gtBuildUI&&window.__gtBuildUI()}catch(e){vo(e,"ui-prewarm")}try{window.__gtBP&&window.__gtBP.prewarm()}catch(e){vo(e,"event-prewarm")}',
        'try{window.__gtBuildUI&&window.__gtBuildUI()}catch(e){vo(e,"ui-prewarm")}try{window.__gtBP&&window.__gtBP.prewarm()}catch(e){vo(e,"event-prewarm")}try{window.__gtGlowWarm&&window.__gtGlowWarm()}catch(e){vo(e,"glow-prewarm")}',
    ),
    # P4: fully transparent objects (opacity 0: the daytime stars, the Event props waiting
    # at the campfire, finished fades) were still drawn every frame at zero opacity, pure
    # fill-rate cost on the headset. A sweep before each render marks a standard material
    # invisible while its opacity is 0 and visible again as soon as it rises; the list of
    # transparent materials is refreshed every 120 frames. Nothing visible changes.
    (
        'gcEB.ready=!0;',
        'gcEB.ready=!0;{let gbOpL=[],gbOpT=0;const gbOpPrev=C.onBeforeRender;C.onBeforeRender=function(){if(!(gbOpT++%120)){gbOpL=[];C.traverse((o=>{const m=o.material;m&&!Array.isArray(m)&&m.transparent&&!m.isShaderMaterial&&!m.isRawShaderMaterial&&gbOpL.push(m)}))}for(let i=0;i<gbOpL.length;i++){const m=gbOpL[i];m.visible=m.opacity>.002}return gbOpPrev?gbOpPrev.apply(this,arguments):void 0};}',
    ),
    # B25 (author, headset: Zollod walked into the side of his kiosk, jittering, before he
    # got in): a keeper walks home by routing to the last point of the kiosk's exit path,
    # local (2, 3.4), then follows the path in. That point is 0.95 m in front of the kiosk
    # hull, inside the router's blocked margin around buildings (the walker's radius plus
    # 0.35 m, up to 1.35 m), so the route ends short and the final straight leg crosses the
    # side wall when the keeper comes from the side; the stuck handling then takes seconds.
    # The exit path gets one more point, local (2, 4.4), outside the margin: the route ends
    # in the open in front of the kiosk and the path leads in along the front. The same
    # path is walked in reverse when a keeper leaves. `tools/test_npc_home.js` (Mushroom's
    # kiosk, same exit path) measures the side approaches.
    (
        'exit:name=>[[0,-1.75],[2.0,-1.75],[2.0,1.85],[2.0,3.4]].map(',
        'exit:name=>[[0,-1.75],[2.0,-1.75],[2.0,1.85],[2.0,3.4],[2.0,4.4]].map(',
    ),
    # B25 continued: the real causes of Zollod's bump, from `tools/test_npc_home.js` run on
    # him (cast type "cutebex"). (1) His body radius .9 (collision .72 m) does not fit the
    # kiosk's inner corridor between the stool and the side wall (parts 1.45 and 2.86, the
    # path at local x 2) or the gap between the stools (local x +-.75); every other keeper
    # is .8 and fits. Radius .8: the collision circle only, nothing visible. (2) A keeper
    # within 4 m of home, or already inside the kiosk hull, walked straight to home, which
    # from the customer side means into the desk; now a keeper in front of the desk line
    # (0.9 m ahead of home along the kiosk axis) takes the exit path in, unless the home is
    # raised (Mushroom hops onto his desk from the front, unchanged).
    (
        '["cutebex","ZOLLOD","born_zollod",{color:"#3cbe94",bodyR:.9,talkR:4.2,via:"kiosk:garden"},"kiosk:garden"]',
        '["cutebex","ZOLLOD","born_zollod",{color:"#3cbe94",bodyR:.8,talkR:4.2,via:"kiosk:garden"},"kiosk:garden"]',
    ),
    (
        'if(via&&via.length&&!t.visiting){const dh=Math.hypot(n.x-t.home.x,n.z-t.home.z);dh>4&&!(t.vbk>=0)&&!F.buildings.some((B=>F.inHull(B,n.x,n.z)&&F.inHull(B,t.home.x,t.home.z)))&&(t.vbk=via.length-1);',
        'if(via&&via.length&&!t.visiting){const dh=Math.hypot(n.x-t.home.x,n.z-t.home.z),fwX=t.home.x-via[0][0],fwZ=t.home.z-via[0][1],fwL=Math.hypot(fwX,fwZ)||1,inFront=!((a&&a.y)>.5)&&((n.x-t.home.x)*fwX+(n.z-t.home.z)*fwZ)/fwL>.9;(dh>4||inFront)&&!(t.vbk>=0)&&!(!inFront&&F.buildings.some((B=>F.inHull(B,n.x,n.z)&&F.inHull(B,t.home.x,t.home.z))))&&(t.vbk=via.length-1);',
    ),
    # P2 continued: `Ut.warm()` itself threw on this three.js build (`B.getWorldDirection` does
    # not exist here), silently at VR entry (its call is in a bare try) and loudly from the loading
    # screen, so the light-on shader variants were never pre-compiled and compiled on the first
    # pickup instead. The camera's forward direction is taken from its quaternion.
    (
        'B.getWorldPosition(p),B.getWorldDirection(d),p.addScaledVector(d,1.5)',
        'B.getWorldPosition(p),d.set(0,0,-1).applyQuaternion(B.quaternion),p.addScaledVector(d,1.5)',
    ),
    # B25 continued (global): a walker sent straight to a kiosk home (an interrupted visit, the
    # stuck handler, the Event's send-home) was routed to the open cell nearest the home point,
    # which for a home near the back wall is behind the kiosk, and the final straight leg then
    # went through the wall for good. Every route whose target is the walker's home now goes
    # to the last point of the home's entry path (`def.via`) and follows the path in, unless the
    # walker is already inside the same hull as the home. Mushroom's hop from the front is
    # unchanged (he is inside the hull by then).
    (
        'function Ve(e,o,a){const n=.85*(e.bodyR||.9)+.35,r=e.group.position,s=[];',
        'function Ve(e,o,a){const n=.85*(e.bodyR||.9)+.35,r=e.group.position,s=[];if(e.home&&o===e.home.x&&a===e.home.z&&e.def&&e.def.via&&e.def.via.length&&!F.buildings.some((B=>F.inHull(B,r.x,r.z)&&F.inHull(B,o,a)))){const v=e.def.via,w=v[v.length-1];return Ve(e,w[0],w[1]).concat(v.slice(0,-1).reverse().map((p=>[p[0],p[1]])),[[o,a]])}',
    ),
    # P5 (FPS work): a creature near the garden's stone ring fits its height to the stones by
    # transforming every sixth vertex of every mesh it has (`gfS`), every frame while it moves
    # and every fourth frame while it stands. During the Event several creatures move there
    # at once and this was the largest game-logic cost in the profile. Now every second frame
    # while moving and every eighth while standing: a one-frame lag in a smoothed height,
    # not visible at 72 Hz.
    (
        'if(e.moving||e.gfN%4==1||null==e.gfS){',
        'if(e.moving&&e.gfN%2==0||e.gfN%8==1||null==e.gfS){',
    ),
    # P6 (FPS work, the author: "creatures on screen"): the game patches every three.js
    # material constructor to default to DoubleSide, so the whole world (609k of 659k source
    # triangles) rendered without back-face culling, and on a tiled mobile GPU every back face
    # costs binning and rasterisation. Back faces of a closed, outward-wound mesh are never
    # seen, so before an object tree is batched, every mesh's geometry is classified once
    # (closed: every edge shared by exactly two triangles after merging coincident vertices;
    # outward: positive signed volume) and a material whose meshes are all closed and outward
    # is set to FrontSide; a material with any open or transparent user stays DoubleSide, and
    # one flipped earlier is flipped back if a later tree uses it on an open mesh. Pixel-identical
    # by construction; `tools/sides_check.js` renders the town with the flips on and off and
    # compares. Cost: one pass over each geometry at build time, cached on the geometry.
    (
        'function _e(t,e){if(!t||t.userData.gcEB||!function(){',
        'function gbClosedOutward(g){const P=g.attributes.position,I=g.index,n=I?I.count:P.count,tris=n/3|0;if(tris<4||tris>60000||!P.array)return!1;const N=P.count,qx=new Int32Array(N),qy=new Int32Array(N),qz=new Int32Array(N),keys=new Map(),id=new Int32Array(N);let nv=0;for(let i=0;i<N;i++){const x=Math.round(1e5*P.getX(i)),y=Math.round(1e5*P.getY(i)),z=Math.round(1e5*P.getZ(i));qx[i]=x,qy[i]=y,qz[i]=z;let h=(73856093*x^19349663*y^83492791*z)|0,v=keys.get(h);for(;v!==void 0&&(qx[v]!==x||qy[v]!==y||qz[v]!==z);)h=(h+1)|0,v=keys.get(h);v===void 0&&(v=i,keys.set(h,i),nv++),id[i]=v}const edges=new Map();let vol=0;for(let i=0;i+2<n;i+=3){const ia=I?I.getX(i):i,ib=I?I.getX(i+1):i+1,ic=I?I.getX(i+2):i+2,a=id[ia],b=id[ib],c=id[ic];if(a===b||b===c||a===c)continue;const k0=a<b?a*262144+b:b*262144+a,k1=b<c?b*262144+c:c*262144+b,k2=c<a?c*262144+a:a*262144+c;edges.set(k0,(edges.get(k0)||0)+1),edges.set(k1,(edges.get(k1)||0)+1),edges.set(k2,(edges.get(k2)||0)+1);const ax=P.getX(ia),ay=P.getY(ia),az=P.getZ(ia),bx=P.getX(ib),by=P.getY(ib),bz=P.getZ(ib),cx=P.getX(ic),cy=P.getY(ic),cz=P.getZ(ic);vol+=ax*(by*cz-bz*cy)-ay*(bx*cz-bz*cx)+az*(bx*cy-by*cx)}for(const v of edges.values())if(2!==v)return!1;return vol>0}function gbSides(root){if(!root||!root.traverse)return;const FS=THREE.FrontSide,DS=THREE.DoubleSide,users=new Map();root.traverse((o=>{if(!o.isMesh||o.userData.xrUI)return;const m=o.material;if(!m||Array.isArray(m)||m.side!==DS&&!m.__gbFS||m.transparent||m.isShaderMaterial||m.isRawShaderMaterial)return;const g=o.geometry;if(!g||!g.attributes||!g.attributes.position)return;let c=g.__gbClosed;void 0===c&&(c=g.__gbClosed=gbClosedOutward(g));let u=users.get(m);u||users.set(m,u={safe:0,open:0}),c?u.safe++:u.open++}));users.forEach(((u,m)=>{u.open||m.__gbOpen?(m.__gbOpen=!0,m.__gbFS&&(m.__gbFS=!1,m.side=DS,m.needsUpdate=!0)):m.__gbFS||(m.__gbFS=!0,m.side=FS,m.needsUpdate=!0)}))}window.__gbSides=gbSides;function _e(t,e){try{gbSides(t)}catch(err){}if(!t||t.userData.gcEB||!function(){',
    ),
    # P6 continued: the batch material clone carries the flag, so tools can tell P6's flips apart
    # from materials that were single-sided to begin with.
    (
        'const m=e.clone();m.userData={gcR:new Float32Array(16*t.length)}',
        'const m=e.clone();m.__gbFS=e.__gbFS,m.userData={gcR:new Float32Array(16*t.length)}',
    ),
    # P7 (diagnostics, the author cannot measure much right now): every ten seconds in VR the
    # game posts one line to logcat (`page: m=perf ...`): frame rate from the governor's
    # frame-time average, the governor level, draw calls and triangles of the last frame,
    # whether the planting Event is running, and where the player stands. A headset run
    # then documents its own frame rate: `adb logcat -s GreeblisServer | grep perf`.
    (
        'o.lastFrame=n,_e();F.ctrls.forEach(',
        'o.lastFrame=n,_e();try{n-(o.perfAt||0)>1e4&&(o.perfAt=n,window.__gtLog&&window.__gtLog("perf fps="+(1e3/Ge.ema).toFixed(1)+" level="+Ge.level+" calls="+O.info.render.calls+" tris="+O.info.render.triangles+(me&&me.active?" event":"")+" at="+Math.round(At.position.x)+","+Math.round(At.position.z)))}catch(e){}F.ctrls.forEach(',
    ),
    # P8 (draw calls; NOTES 59): a multi-material mesh costs one draw per geometry group, per eye.
    # The garden plots (one at load, thirteen more in the planting Event) are boxes whose five
    # sides share one material instance and whose top carries the soil texture: six draws each
    # where two do. Before each frame's culling pass, a multi-material mesh whose groups repeat
    # a material instance gets a copy of its geometry with the index reordered so each instance's
    # triangles are contiguous, one group per instance (same triangles, same attributes, opaque
    # only). The copy is cached per geometry and sharing pattern. Every frame the mesh's material
    # slots are compared by identity with the ones the copy was made for; any change (a slot
    # swapped, the geometry replaced or its index edited) puts the original geometry back before
    # the frame is drawn. Nothing visible changes; `window.__gtMM.set(false)` turns it off.
    (
        'gcEB.ready=!0;{let gbOpL=[]',
        'gcEB.ready=!0;{let mmL=[],mmT=0,mmOn=!0;const mmC=new Map,mmPrev=C.onBeforeRender,'
        'mmPat=o=>{const M=o.material;return o.geometry.groups.map(g=>M.indexOf(M[g.materialIndex])).join(",")},'
        'mmMake=(g,M)=>{if(!g.index||g.groups.length<2||Object.keys(g.morphAttributes).length)return null;const I=g.index.array,ord=[],seen=new Map;for(const gr of g.groups){const m=M[gr.materialIndex];if(!m||m.transparent)return null;let k=seen.get(m);void 0===k&&(k=ord.length,seen.set(m,k),ord.push({mi:gr.materialIndex,r:[]}));ord[k].r.push([gr.start,Math.min(gr.count,I.length-gr.start)])}if(ord.length===g.groups.length)return null;'
        'const out=new I.constructor(I.length);let q=0;const n=new THREE.BufferGeometry;for(const k in g.attributes)n.setAttribute(k,g.attributes[k]);for(const o of ord){const st=q;for(const[a,c]of o.r)out.set(I.subarray(a,a+c),q),q+=c;n.addGroup(st,q-st,o.mi)}n.setIndex(new THREE.BufferAttribute(out.slice(0,q),1));g.boundingSphere||g.computeBoundingSphere();g.boundingBox||g.computeBoundingBox();n.boundingSphere=g.boundingSphere.clone();n.boundingBox=g.boundingBox.clone();n.__mmOf=g;return n},'
        'mmBack=r=>{r.o.geometry===r.n&&(r.o.geometry=r.g),r.o.__mm=0};'
        'window.__gtMM={list:mmL,set(v){mmOn=!!v;if(!mmOn){mmL.forEach(mmBack);mmL.length=0}else mmT=0}};'
        'C.onBeforeRender=function(){if(mmOn){if(!(mmT++%120))C.traverse((o=>{if(!o.isMesh||o.isInstancedMesh||!Array.isArray(o.material)||o.__mm||!o.geometry||o.geometry.__mmOf)return;o.__mm=1;try{const g=o.geometry,k=g.uuid+"|"+mmPat(o);let n=mmC.get(k);void 0===n&&(n=mmMake(g,o.material),mmC.set(k,n));if(!n)return;o.geometry=n;mmL.push({o,g,n,M:o.material,s:o.material.slice(),v:g.index.version,gl:g.groups.length})}catch(e){}}));'
        'for(let i=mmL.length-1;i>=0;i--){const r=mmL[i],o=r.o;let ok=o.geometry===r.n&&o.material===r.M&&o.material.length===r.s.length&&r.g.index&&r.g.index.version===r.v&&r.g.groups.length===r.gl;if(ok)for(let j=0;j<r.s.length;j++)if(o.material[j]!==r.s[j]||r.s[j].transparent){ok=!1;break}ok||(mmBack(r),mmL.splice(i,1))}}'
        'return mmPrev?mmPrev.apply(this,arguments):void 0};}{let gbOpL=[]',
    ),
    # P9 (draw calls; NOTES 60): the batcher merged only parts whose materials agree on everything
    # but colour (the colour travels per part); two Phong parts with different shininess or
    # specular colour needed two batches. Each part now carries a fifth uniform row: its specular
    # colour, and its shininess in the colour row's spare slot, written exactly as three.js would
    # upload them (specular as is, shininess at least 1e-4) and read by the batch shader in place of
    # the material's own uniforms (a flat varying, so the value is the part's own, not
    # interpolated). Shininess and specular leave the grouping key. The part limit per batch is
    # recomputed for five rows (32 on a Quest). Whole scene: 327 batchable draws per eye -> 247.
    # Pixels identical batched against unbatched (`opt_identity.js`).
    ('gcR:new Float32Array(16*t.length)', 'gcR:new Float32Array(20*t.length)'),
    ('M=16*p.slot', 'M=20*p.slot'),
    ('e.fill(0,M,M+16)', 'e.fill(0,M,M+20)'),
    ('p.k=new Float64Array(15)', 'p.k=new Float64Array(19)'),
    ('Math.floor((e-96)/4)', 'Math.floor((e-96)/5)'),
    ('uniform vec4 gcR["+4*gcEB.N+"];', 'uniform vec4 gcR["+5*gcEB.N+"];\\nflat varying vec4 vGcSpec;'),
    ('int gcI=int(gcPart+.5)*4;vec4 gcA=gcR[gcI],gcB=gcR[gcI+1],gcC=gcR[gcI+2],gcD=gcR[gcI+3];',
     'int gcI=int(gcPart+.5)*5;vec4 gcA=gcR[gcI],gcB=gcR[gcI+1],gcC=gcR[gcI+2],gcD=gcR[gcI+3];vGcSpec=vec4(gcR[gcI+4].xyz,gcD.w);'),
    ('vec3 transformed=vec3(dot(gcA,vec4(position,1.)),dot(gcB,vec4(position,1.)),dot(gcC,vec4(position,1.)));")}',
     'vec3 transformed=vec3(dot(gcA,vec4(position,1.)),dot(gcB,vec4(position,1.)),dot(gcC,vec4(position,1.)));"),t.fragmentShader=t.fragmentShader.replace("#include <common>","#include <common>\\nflat varying vec4 vGcSpec;").replace("#include <lights_phong_fragment>","#include <lights_phong_fragment>\\nmaterial.specularColor=vGcSpec.rgb;material.specularShininess=vGcSpec.w;")}'),
    ('const o=t.material.color,cr=o?o.r:1,cg=o?o.g:1,cb=o?o.b:1;(mv||cr!==k[12]||cg!==k[13]||cb!==k[14])&&(ch=!0,',
     'const o=t.material.color,cr=o?o.r:1,cg=o?o.g:1,cb=o?o.b:1,sp=t.material.specular,sh=void 0===t.material.shininess?1:Math.max(t.material.shininess,1e-4),sr=sp?sp.r:0,sg=sp?sp.g:0,sb=sp?sp.b:0;(mv||cr!==k[12]||cg!==k[13]||cb!==k[14]||sh!==k[15]||sr!==k[16]||sg!==k[17]||sb!==k[18])&&(ch=!0,'),
    ('e[M+14]=k[14]=cb)', 'e[M+14]=k[14]=cb,e[M+15]=k[15]=sh,e[M+16]=k[16]=sr,e[M+17]=k[17]=sg,e[M+18]=k[18]=sb)'),
    ('e.specular?e.specular.getHex():"",e.shininess,', '"","",'),
    # P10 (vertex work; NOTES 62): many of the town's and the creatures' meshes are non-indexed
    # (three vertices per triangle, none shared), so the GPU runs the vertex shader three times per
    # triangle and cannot reuse a transformed vertex; a tiled GPU runs the position part again for
    # binning. The batcher now merges bit-identical vertices within each part while it builds a
    # batch (position, normal, colour and uv all equal, compared as raw bits; never across parts).
    # Same triangles in the same order, same values at every corner: nothing visible changes. The
    # game's own geometry is untouched (only the batch's copy is indexed), so code that edits a
    # mesh's vertices keeps the layout it expects. Whole scene: 829,776 vertex runs in batches ->
    # 207,969.
    ('p=[];let f=0,u=0;t.forEach(((t,e)=>{',
     'p=[];let f=0,u=0;const rU=new Uint32Array(r.buffer),sU=new Uint32Array(s.buffer),iU=new Uint32Array(i.buffer),lU=l?new Uint32Array(l.buffer):null;t.forEach(((t,e)=>{'),
    ('for(let t=0;t<n;t++){const o=f+t;r[3*o]=a.position.getX(t)',
     'const RM=new Uint32Array(n),HM=new Map;let U=0;for(let t=0;t<n;t++){const o=f+U;r[3*o]=a.position.getX(t)'),
    ('l&&(l[2*o]=a.uv.getX(t),l[2*o+1]=a.uv.getY(t)),c[o]=e}',
     'l&&(l[2*o]=a.uv.getX(t),l[2*o+1]=a.uv.getY(t)),c[o]=e;'
     'const q3=3*o,q2=2*o,hh=(rU[q3]^Math.imul(rU[q3+1],73856093)^Math.imul(rU[q3+2],19349663)^Math.imul(sU[q3],83492791)^Math.imul(sU[q3+1],668265263)^Math.imul(sU[q3+2],374761393)^Math.imul(iU[q3],2246822519)^Math.imul(iU[q3+1],3266489917)^Math.imul(iU[q3+2],668265261)^(l?Math.imul(lU[q2],2654435761)^Math.imul(lU[q2+1],40503):0))|0;'
     'let L=HM.get(hh),hit=-1;if(L)for(const w of L){const w3=3*w,w2=2*w;if(rU[w3]===rU[q3]&&rU[w3+1]===rU[q3+1]&&rU[w3+2]===rU[q3+2]&&sU[w3]===sU[q3]&&sU[w3+1]===sU[q3+1]&&sU[w3+2]===sU[q3+2]&&iU[w3]===iU[q3]&&iU[w3+1]===iU[q3+1]&&iU[w3+2]===iU[q3+2]&&(!l||lU[w2]===lU[q2]&&lU[w2+1]===lU[q2+1])){hit=w;break}}'
     'hit>=0?RM[t]=hit:(RM[t]=o,L?L.push(o):HM.set(hh,[o]),U++)}'),
    ('h[u++]=e+f,h[u++]=(M?a:o)+f,h[u++]=(M?o:a)+f}', 'h[u++]=RM[e],h[u++]=RM[M?a:o],h[u++]=RM[M?o:a]}'),
    ('t.layers.set(31),f+=n}', 't.layers.set(31),f+=U}'),
    ('d.setAttribute("position",new THREE.BufferAttribute(r,3)),d.setAttribute("normal",new THREE.BufferAttribute(s,3)),d.setAttribute("color",new THREE.BufferAttribute(i,3)),l&&d.setAttribute("uv",new THREE.BufferAttribute(l,2)),d.setAttribute("gcPart",new THREE.BufferAttribute(c,1)),d.setIndex(new THREE.BufferAttribute(h,1))',
     'd.setAttribute("position",new THREE.BufferAttribute(r.slice(0,3*f),3)),d.setAttribute("normal",new THREE.BufferAttribute(s.slice(0,3*f),3)),d.setAttribute("color",new THREE.BufferAttribute(i.slice(0,3*f),3)),l&&d.setAttribute("uv",new THREE.BufferAttribute(l.slice(0,2*f),2)),d.setAttribute("gcPart",new THREE.BufferAttribute(c.slice(0,f),1)),d.setIndex(new THREE.BufferAttribute(h,1))'),
    # P12 (vertex work; NOTES 63): the scenery merge (`io` over every static town mesh while loading)
    # builds each merged mesh non-indexed (it converts its inputs with toNonIndexed), so the kiosks,
    # roofs and the garden bed run the vertex shader three times per triangle. For the scenery
    # merge only, the merged geometry is now indexed where it is built: bit-identical vertices
    # (position, normal, colour, uv) share one index. Same triangles in the same order, same values
    # at every corner. Creature and pickup merges are left as they are (the creature ground-fit
    # scan samples every sixth vertex of a creature's arrays and must see the same samples). The
    # batcher's 4,000-vertex cap reads the merged mesh's original vertex count, so what is batched
    # does not change.
    ('function io(t){',
     'function gcIdx(u){const P=u.attributes.position,Nn=u.attributes.normal,Cc=u.attributes.color,Uv=u.attributes.uv,n=P.count,Pa=P.array,Na=Nn.array,Ca=Cc.array,Ua=Uv?Uv.array:null,pU=new Uint32Array(Pa.buffer,Pa.byteOffset,3*n),nU=new Uint32Array(Na.buffer,Na.byteOffset,3*n),cU=new Uint32Array(Ca.buffer,Ca.byteOffset,3*n),uU=Ua?new Uint32Array(Ua.buffer,Ua.byteOffset,2*n):null,RM=new Uint32Array(n),first=[],HM=new Map;'
     'for(let t=0;t<n;t++){const q3=3*t,q2=2*t,hh=(pU[q3]^Math.imul(pU[q3+1],73856093)^Math.imul(pU[q3+2],19349663)^Math.imul(nU[q3],83492791)^Math.imul(nU[q3+1],668265263)^Math.imul(nU[q3+2],374761393)^Math.imul(cU[q3],2246822519)^Math.imul(cU[q3+1],3266489917)^Math.imul(cU[q3+2],668265261)^(uU?Math.imul(uU[q2],2654435761)^Math.imul(uU[q2+1],40503):0))|0;let L=HM.get(hh),hit=-1;'
     'if(L)for(const w of L){const s=first[w],w3=3*s,w2=2*s;if(pU[w3]===pU[q3]&&pU[w3+1]===pU[q3+1]&&pU[w3+2]===pU[q3+2]&&nU[w3]===nU[q3]&&nU[w3+1]===nU[q3+1]&&nU[w3+2]===nU[q3+2]&&cU[w3]===cU[q3]&&cU[w3+1]===cU[q3+1]&&cU[w3+2]===cU[q3+2]&&(!uU||uU[w2]===uU[q2]&&uU[w2+1]===uU[q2+1])){hit=w;break}}'
     'hit>=0?RM[t]=hit:(RM[t]=first.length,L?L.push(first.length):HM.set(hh,[first.length]),first.push(t))}const m=first.length;if(m===n)return;'
     'const cp=(A,k)=>{const o=new Float32Array(k*m);for(let i=0;i<m;i++)for(let j=0;j<k;j++)o[k*i+j]=A[k*first[i]+j];return o};u.setAttribute("position",new THREE.BufferAttribute(cp(Pa,3),3)),u.setAttribute("normal",new THREE.BufferAttribute(cp(Na,3),3)),u.setAttribute("color",new THREE.BufferAttribute(cp(Ca,3),3)),Ua&&u.setAttribute("uv",new THREE.BufferAttribute(cp(Ua,2),2));u.setIndex(new THREE.BufferAttribute(m>65535?RM:Uint16Array.from(RM),1));u.userData.gcN=n}'
     'function io(t){'),
    ('p&&u.setAttribute("uv",new THREE.BufferAttribute(p,2)),u.computeBoundingSphere();', 'p&&u.setAttribute("uv",new THREE.BufferAttribute(p,2)),io.idx&&gcIdx(u),u.computeBoundingSphere();'),
    ("await __gtY('scenery-batch'),io(t)})()", "await __gtY('scenery-batch'),io.idx=1,io(t),io.idx=0})()"),
    # P12 continued: the building merge (`v`) and the kiosk bin merge (`mergeBin`) build the biggest
    # non-indexed meshes (kiosk bodies, roofs, the garden bed); their output is indexed the same way.
    # Nothing edits these geometries after they are built (the vertex-editing code in the game works
    # only on meshes marked keep, which never pass through these merges).
    ('i.computeBoundingSphere(),i}function dropUnder', 'gcIdx(i),i.computeBoundingSphere(),i}function dropUnder'),
    ('uvs&&out.setAttribute("uv",new THREE.BufferAttribute(uvs,2)),out.computeBoundingSphere(),out};const frame=', 'uvs&&out.setAttribute("uv",new THREE.BufferAttribute(uvs,2)),gcIdx(out),out.computeBoundingSphere(),out};const frame='),
    ('||e&&t.geometry.attributes.position.count>e)return;', '||e&&(t.geometry.userData.gcN||t.geometry.attributes.position.count)>e)return;'),
    # P13 (Event CPU; NOTES 64): while the tentacled creature dances (the planting Event), `bend`
    # recomputes every tentacle vertex each frame with three to five sines and cosines per vertex.
    # Those terms depend only on the vertex's distance along the tentacle, which the ten vertices of
    # a ring share (the tube is built ring by ring); they are now computed once per ring and reused
    # while the input is bit-identical, and the results are written straight into the arrays
    # (setXYZ does the same store). Same arithmetic on the same inputs: bit-identical output
    # (`test_bend_exact.js` runs both versions and compares the arrays).
    ('for(let i=0,j=0;i<P.count;i++,j+=3){let x0=p0[j],y0=p0[j+1],z0=p0[j+2],ny=n0[j+1],nz=n0[j+2];const sl=z0-.8;if(sl>0){const u=sl/L;x0+=amp*u*Math.sin(wph-6*u);if(lift){const q=Math.min(1,u/.25);y0+=lift*(q*q*(3-2*q)+.15*u*Math.sin(wph-5*u))}if(Rr){const a=kap*sl,c=Math.cos(a),sn=Math.sin(a),h=Rr-y0;y0=Rr-h*c,z0=.8+h*sn;const ny2=ny*c+nz*sn;nz=-ny*sn+nz*c,ny=ny2}}P.setXYZ(i,x0,y0,z0),N.setXYZ(i,n0[j],ny,nz)}',
     'const Pa=P.array,Na=N.array;let cz=NaN,dx=0,dy=0,c=1,sn=0;for(let i=0,j=0;i<P.count;i++,j+=3){let x0=p0[j],y0=p0[j+1],z0=p0[j+2],ny=n0[j+1],nz=n0[j+2];const sl=z0-.8;if(sl>0){if(z0!==cz){cz=z0;const u=sl/L;dx=amp*u*Math.sin(wph-6*u);if(lift){const q=Math.min(1,u/.25);dy=lift*(q*q*(3-2*q)+.15*u*Math.sin(wph-5*u))}if(Rr){const a=kap*sl;c=Math.cos(a),sn=Math.sin(a)}}x0+=dx;lift&&(y0+=dy);if(Rr){const h=Rr-y0;y0=Rr-h*c,z0=.8+h*sn;const ny2=ny*c+nz*sn;nz=-ny*sn+nz*c,ny=ny2}}Pa[j]=x0,Pa[j+1]=y0,Pa[j+2]=z0,Na[j]=n0[j],Na[j+1]=ny,Na[j+2]=nz}'),
    # L1 (the author: "I want the game file to be CC0 1.0"): a notice right after the charset tag.
    # The author's own work in the file is dedicated under CC0 1.0; the bundled three.js stays under
    # its MIT license, whose copyright and permission notice must travel with every copy (it had been
    # missing). Full texts: tools/LICENSE.md. A comment only: nothing the page does changes.
    ('<head><meta charset="UTF-8">',
     '<head><meta charset="UTF-8"><!-- Greeblis Town. To the extent possible under law, the author has waived all copyright and related or neighboring rights to Greeblis Town (its game code, art, text and sound in this file), dedicating them to the public domain under CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/ (full text in tools/LICENSE.md of the source repository). This file also includes three.js, which is not covered by that dedication: Copyright (c) 2010-2021 three.js authors, MIT License. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. -->'),
    # D1 (tool hardening; the author tests on a Quest 3S, the game must also run on a Quest 2): the perf
    # line names the headset model (from the user agent, e.g. dev=Quest_3S), so tools/perf_log.js can judge
    # each device separately.
    ('+" at="+Math.round(At.position.x)+","+Math.round(At.position.z)))}catch(e){}',
     r'+" at="+Math.round(At.position.x)+","+Math.round(At.position.z)+" dev="+(((navigator.userAgent||"").match(/Quest[^;)]*/)||["unknown"])[0].trim().replace(/\s+/g,"_"))))}catch(e){}'),
    # B27 (multiview_check, 2 runs in 7): the Gem that the Speech assembles from the three Artifacts
    # has a flat-shaded, transparent Phong material that the game creates the first time the Gem is
    # built, so no loading warm-up ever saw it and its shader compiled in the middle of the Speech (a
    # 50-1,000 ms stall on a headset). The Artifact module gains a `warm()` that builds the three Gem
    # pieces and one glue drop (the same cached geometry and materials the Speech uses), and the
    # effects warm-up adds them out of sight (y = -60), compiles the scene and takes them out again.
    # The Speech draws the Gem under Sparkakus's light bulb, whose point light changes the shader, so
    # the scene is compiled a second time with the bulb's light on (`Bulb.warm()`, as the warm-up
    # already does for everything else; 3.15.39, after the check caught the second variant).
    # Nothing is drawn differently; the Speech then reuses the compiled programs.
    ('return{build(){L.push(((t2,dt)=>(Bulb.update(dt||.016),asm&&asm.step(Math.min(dt||.016,.1)))))},assemble:assemble,model:model}})()',
     'return{build(){L.push(((t2,dt)=>(Bulb.update(dt||.016),asm&&asm.step(Math.min(dt||.016,.1)))))},assemble:assemble,model:model,warm(){const g=new THREE.Group;[0,1,2].forEach((k=>g.add(model(k))));R(T.sphere(.045,8,6),drop(),g,null,null,[1,1.5,1]);return g}}})()'),
    ('Nt.splat(999,999,.5,"#ffffff")}catch(e){}})(),Ze(),',
     'Nt.splat(999,999,.5,"#ffffff")}catch(e){}})(),(function(){try{const wg=ARTS.warm();wg.position.y=-60,C.add(wg),wg.updateMatrixWorld(!0),O.compile(C,B),Bulb.warm(),C.remove(wg)}catch(e){vo(e,"gem-prewarm")}})(),Ze(),'),
    # F-B31 (the author: "Lets push both experiments into the main build"; 3.15.43, NOTES 83): the flash experiments
    # become the release. 1. No layer swap: every quality level and the emergency step keep the native render scale
    # (1), so the governor only changes foveation, on the same layer; the Event's own scale steps (P16, P17: 2-3 fps,
    # and the 3S took the Quest 3's branch because its browser calls itself "Quest 3") and P18 (which ended an
    # emergency drop with the Event) go with them (the author: "Lets get rid of it and close out that option"). In town
    # the governor no longer renders above native scale (1.2, 1.1) when it has headroom.
    ('quality:[1.2,1.1,1,1,1],foveation:[0,0,0,.5,1],sosScale:.82,sosFrac:1.6,sosFrames:216,maxLayerRebuilds:30,',
     'quality:[1,1,1,1,1],foveation:[0,0,0,.5,1],sosScale:1,sosFrac:1.6,sosFrames:216,maxLayerRebuilds:0,'),
    # 2. No texture upload inside an XR frame (NOTES 80): during multiview play a texture marked for upload is held
    # back (three.js keeps drawing its old content for that frame) and uploaded in a task right after the frame is
    # submitted; for that one frame an object whose texture was never uploaded is skipped instead of drawn without
    # it. The VR panels (battle, dialogue, menu, wrist HUD) paint into the next of three canvases; a panel keeps its
    # last uploaded canvas and swaps to the new one once that is uploaded (the deferupload build's flicker on quick
    # presses, NOTES 81). Since F-B29/F-B30 no texture is made during play, so the log line for one made for the first
    # time should never appear.
    (
    'l.needsUpdate=!0,c.material.map=l,h.redraws++',
    'l.needsUpdate=!0,window.__gtXR&&window.__gtXR.deferMap&&window.__gtXR.deferMap(c.material,l)||(c.material.map=l),h.redraws++',
    ),
    # P19 (found by tools/warm_coverage.js; the author chose this fix): the number of point lights is part of every
    # lit shader's key, and the warm-up compiles the town with no point light, with the Portal's and with the
    # bulb's, but not with both. Both could be on together: the Portal glows from the pizza call until the courier
    # has gone back through (a minute or more) and Sparkakus's bulb lights the Speech, 16 m away; dozens of shaders
    # would then compile mid-Speech, a stall of seconds on a Quest. While the bulb is lit the Portal's light is held
    # off (its glowing doorway still shows; only its faint blue light on the surroundings goes for those seconds),
    # from both sides so no frame has both: the Portal's own update and the bulb's.
    ('A=new THREE.PointLight(3844351,0,11);A.visible=!1,Oe=A,', 'A=new THREE.PointLight(3844351,0,11);A.visible=!1,Oe=A,e.light=A,'),
    ('A.intensity=1.5*a*(.85+.15*Math.sin(5*t)),A.visible=A.intensity>0', 'A.intensity=1.5*a*(.85+.15*Math.sin(5*t)),A.visible=A.intensity>0&&!("undefined"!=typeof Bulb&&Bulb.level>0)'),
    ('a.intensity=3.5*s,a.visible=s>0', 'a.intensity=3.5*s,a.visible=s>0,s>0&&"undefined"!=typeof ot&&ot.light&&(ot.light.visible=!1)'),
    # P20 (draw calls in the Event; nothing drawn differently, NOTES 82): the pizza the Event lays out (eight stacks
    # of one to three boxes round the garden, and the pie Anomalee serves: its box, lid and eight slices of four
    # parts each) is built after the batcher ran, so every part was its own draw: 56 of the 388 draws of the
    # heaviest Event view (the headset's lowest readings, at (-21, -5)). Each stacked box (one mesh, the card
    # colour on five faces and the printed lid on the top) becomes two meshes, the five faces and the top, with
    # the same vertices and the same triangles in the order P8 already draws them; then both groups go through
    # the batcher as the garden's plants do. The pizza is also built once during the warm-up (out of sight, and
    # cleared before play), so its printed lid texture is made and uploaded while loading instead of the moment
    # the Event starts (the noswap run's flash at the Event start came with one new texture: this one), and its
    # batch shaders are compiled there. `__gtPZ.set(false)` puts the original boxes back for opt_identity.js.
    ('const PIZZA=(()=>{let stacks=null,pie=null;',
     'const PIZZA=(()=>{let stacks=null,pie=null;const pzS=[],pzOn={v:!0},pzSplit=(grp,M2)=>{const out=[];grp.children.slice().forEach((o=>{if(!o.isMesh||!Array.isArray(o.material)||o.material.length!==6)return;const g=o.geometry;V.pzSG||(V.pzSG=(()=>{const I=g.index.array,sd=[],tp=[];g.groups.forEach((q=>{const a=Array.from(I.subarray(q.start,q.start+q.count));(o.material[q.materialIndex]===M2.box[2]?tp:sd).push(...a)}));const mk=ix=>{const n=new THREE.BufferGeometry;for(const k in g.attributes)n.setAttribute(k,g.attributes[k]);return n.setIndex(ix),n.computeBoundingSphere(),n.computeBoundingBox(),n};return[mk(sd),mk(tp)]})());const a=new THREE.Mesh(V.pzSG[0],M2.plain),b2=new THREE.Mesh(V.pzSG[1],M2.box[2]);[a,b2].forEach((m=>{m.position.copy(o.position),m.quaternion.copy(o.quaternion),m.scale.copy(o.scale),m.renderOrder=o.renderOrder,m.visible=o.visible,grp.add(m)})),grp.remove(o),out.push({o:o,a:a,b:b2,p:grp})}));return out},pzBatch=(grp,M2)=>{pzS.push(...pzSplit(grp,M2));try{gcEB.ready&&_e(grp)}catch(e){}};window.__gtPZ={set(v){v=!!v;if(v===pzOn.v)return;pzOn.v=v;for(const r of pzS)v?(r.p.remove(r.o),r.a.visible=r.b.visible=!0):(r.a.visible=r.b.visible=!1,r.p.add(r.o))},warm(){show(),serve(0,0,0);const M2=V.pzM;M2&&M2.box[2].map&&O.initTexture&&O.initTexture(M2.box[2].map);return clear},count:()=>pzS.length,where:()=>pzS.map((r=>r.a)).concat(pie?[pie.g]:[]).map((o=>{const v=o.getWorldPosition(new THREE.Vector3);return[v.x,v.y,v.z]}))};'),
    ('C.add(stacks)}function serve(', 'C.add(stacks),pzBatch(stacks,M2)}function serve('),
    ('slices.push(sg)}pie={g:g,slices:slices,eaten:0,t:0}}', 'slices.push(sg)}pzBatch(g,M2);pie={g:g,slices:slices,eaten:0,t:0}}'),
    ('function clear(){stacks&&(C.remove(stacks),stacks=null);pie&&(C.remove(pie.g),pie=null)}',
     'function clear(){stacks&&(C.remove(stacks),stacks=null);pie&&(C.remove(pie.g),pie=null);pzS.length=0,pzOn.v=!0}'),
    ('vo(e,"gem-prewarm")}})(),', 'vo(e,"gem-prewarm")}})(),(function(){try{const done=window.__gtPZ.warm();O.compile(C,B),done()}catch(e){vo(e,"pizza-prewarm")}})(),'),
    # F-B29 (flashes; the author: "no emotes need to be random colors. It would be better to standardize them",
    # NOTES 82): an emote (the glyph that floats over a character) is a 64x64 canvas texture per glyph and colour,
    # made the first time that pair shows. Most callers pick the colour at random (seven for a chat or a dance
    # battle's hit, five for a new plant), so new textures were made and uploaded in the middle of play exactly
    # where the author saw flashes: dance battles, speaking to Nextessa, planting. Each glyph now has one colour
    # (the one it used most): heart pink, note lime, flower, "!", star and sparkle yellow, "?" teal, the rest
    # white. Every glyph's texture is made during the loading warm-up, so none is made during play.
    ('const Ut=(()=>{const t=[],e={};let wl=0;',
     'const Ut=(()=>{const t=[],e={};let wl=0,EMO=null;const emoCol=o=>(EMO||(EMO={"♥":M.pink,"♪":M.lime,"✿":M.yellow,"!":M.yellow,"?":M.teal,"✦":M.yellow,"★":M.yellow}))[o]||M.white;'),
    ('g=(o,a)=>{const n=o+a;', 'g=(o,a)=>{a=emoCol(o);const n=o+a;'),
    ('[["♥",M.pink],["♥","#e8a838"],["!",M.yellow],["!",M.pink],["?",M.teal],["✦",M.yellow],["✦","#62d6c8"],["♪",M.lime],["~",M.yellow],["✿",M.yellow],["✿",M.pink],["·",M.white]].forEach',
     '[["♥"],["!"],["?"],["✦"],["♪"],["~"],["✿"],["·"],["z"],["…"],["..."],["≈"],["★"]].forEach'),
    # F-B30 (flashes, NOTES 82): the other textures the game made during play, each the first time it was needed,
    # now made once during the loading warm-up and kept: the printed lid of the pizza Nextessa carries (made anew at
    # every phone call, the moment she comes through the Portal), Montgummery's screen faces (nine: idle, talking
    # twice, robot dance twice, shovel, rock, paper, scissors; each made the first time he showed it), and the
    # speech bubbles of the townsfolk's text chats (two new textures per chat, thrown away after it). A bubble's
    # texture now comes from a pool, one per speaker and bubble height, made at load and redrawn for each line: the
    # same canvas size and drawing, so the same pixels; redrawing a texture that exists is what the dialogue box
    # does all the time. The entity clean-up keeps textures marked to keep. Checked by tools/texture_census.js.
    ('const PIZZA=(()=>{let stacks=null,pie=null;const pzS=[]',
     'const PZ_CARRY=(t=>{t.fillStyle="#f3ece0",t.fillRect(0,0,256,256),t.save(),t.translate(128,104),t.fillStyle="#e2a64c",t.beginPath(),t.moveTo(0,50),t.lineTo(-54,-38),t.quadraticCurveTo(0,-62,54,-38),t.closePath(),t.fill(),t.fillStyle="#f4cc4a",t.beginPath(),t.moveTo(0,40),t.lineTo(-44,-30),t.quadraticCurveTo(0,-48,44,-30),t.closePath(),t.fill(),t.fillStyle="#c8352c",[[-14,-18],[16,-22],[0,8],[-22,-34],[24,-38]].forEach((([e,o])=>{t.beginPath(),t.arc(e,o,8,0,l),t.fill()})),t.restore(),t.fillStyle="#c8352c",t.font="bold 50px \'Trebuchet MS\', Arial, sans-serif",t.textAlign="center",t.textBaseline="middle",t.fillText("PIZZA",128,204)});window.__gtMirDraw=(t=>{const e=t.createLinearGradient(0,0,0,128);e.addColorStop(0,"#dfeef6"),e.addColorStop(1,"#b9d2e2"),t.fillStyle=e,t.fillRect(0,0,64,128)});window.__gtBbTex=(who,H,fn)=>{const P=window.__gtBb||(window.__gtBb={}),k=(who||0)+"|"+H;let t=P[k];if(!t)return t=P[k]=b(512,H,fn),t.gtKeep=!0,t;const c=t.image.getContext("2d");return c.setTransform(1,0,0,1,0,0),c.globalAlpha=1,c.clearRect(0,0,512,H),fn(c,512,H),t.needsUpdate=!0,t};const PIZZA=(()=>{let stacks=null,pie=null;const pzS=[]'),
    ('const a=b(256,256,(t=>{t.fillStyle="#f3ece0",t.fillRect(0,0,256,256),t.save(),t.translate(128,104),t.fillStyle="#e2a64c",t.beginPath(),t.moveTo(0,50),t.lineTo(-54,-38),t.quadraticCurveTo(0,-62,54,-38),t.closePath(),t.fill(),t.fillStyle="#f4cc4a",t.beginPath(),t.moveTo(0,40),t.lineTo(-44,-30),t.quadraticCurveTo(0,-48,44,-30),t.closePath(),t.fill(),t.fillStyle="#c8352c",[[-14,-18],[16,-22],[0,8],[-22,-34],[24,-38]].forEach((([e,o])=>{t.beginPath(),t.arc(e,o,8,0,l),t.fill()})),t.restore(),t.fillStyle="#c8352c",t.font="bold 50px \'Trebuchet MS\', Arial, sans-serif",t.textAlign="center",t.textBaseline="middle",t.fillText("PIZZA",128,204)}));return R(T.plane(.76,.76)', 'const a=V.pzCT||(V.pzCT=b(256,256,PZ_CARRY),V.pzCT.gtKeep=!0,V.pzCT);return R(T.plane(.76,.76)'),
    ('warm(){show(),serve(0,0,0);const M2=V.pzM;M2&&M2.box[2].map&&O.initTexture&&O.initTexture(M2.box[2].map);return clear}',
     'warm(){show(),serve(0,0,0);const M2=V.pzM,pre=[M2&&M2.box[2].map];V.pzCT||(V.pzCT=b(256,256,PZ_CARRY),V.pzCT.gtKeep=!0),pre.push(V.pzCT),pre.push(window.__gtMirT||(window.__gtMirT=b(64,128,window.__gtMirDraw))),window.__gtBbM||(window.__gtBbM=b(8,8,(()=>{})).image.getContext("2d"));for(const w of[0,1])for(let r=1;r<=6;r++)pre.push(window.__gtBbTex(w,66+42*r,(()=>{})));pre.push(...(window.__gtPreTex||[]));for(const t of pre)t&&O.initTexture&&O.initTexture(t);return clear}'),
    ('const o=b(64,128,(t=>{const e=t.createLinearGradient(0,0,0,128);e.addColorStop(0,"#dfeef6"),e.addColorStop(1,"#b9d2e2"),t.fillStyle=e,t.fillRect(0,0,64,128)}));', 'const o=window.__gtMirT||(window.__gtMirT=b(64,128,window.__gtMirDraw));'),
    ('zT={idle0:z};', 'zT={idle0:z};[["idle",1],["idle",2],["robot",0],["robot",1],["shovel",0],["rock",0],["paper",0],["scissors",0]].forEach((([m2,p2])=>{zT[m2+p2]=$b(512,512,(e=>zF(e,m2,p2)))})),Object.values(zT).forEach((t=>{t.gtKeep=!0})),(window.__gtPreTex=window.__gtPreTex||[]).push(...Object.values(zT));'),
    ('bubble=text=>{const words=text.split(" "),rows=[];let line="";const meas=b(8,8,(()=>{})).image.getContext("2d");',
     'bubble=(text,who)=>{const words=text.split(" "),rows=[];let line="";const meas=window.__gtBbM||(window.__gtBbM=b(8,8,(()=>{})).image.getContext("2d"));'),
    (',tex=b(512,H,(c=>{c.fillStyle="#fffdf6",', ',tex=window.__gtBbTex(who,H,(c=>{c.fillStyle="#fffdf6",'),
    ('c0.bubbles.push({who:who,t0:at,sp:bubble(line)})', 'c0.bubbles.push({who:who,t0:at,sp:bubble(line,who)})'),
    ('cur.bubbles.forEach((bb=>(C.remove(bb.sp),bb.sp.material.map.dispose(),bb.sp.material.dispose())))',
     'cur.bubbles.forEach((bb=>(C.remove(bb.sp),bb.sp.material.map.gtKeep||bb.sp.material.map.dispose(),bb.sp.material.dispose())))'),
    ('e.forEach((t=>t.dispose())),o.forEach((t=>t.dispose())),a.forEach((t=>t.dispose()))}', 'e.forEach((t=>t.dispose())),o.forEach((t=>t.dispose())),a.forEach((t=>t.gtKeep||t.dispose()))}'),
]
# Multiview (NOTES 65, 67): the experiment became the release in 3.15.34 (the author, after the headset
# run: "We're going to use the Multiview version as the main build").
GAME_FIXES += MULTIVIEW
# F-B31 part 2 (see the F-B31 block above): uploads between frames, in the multiview shim that MULTIVIEW inserts.
GAME_FIXES += [
    (
    'var ok = !!(shim && shim.begin(f)); try { cb(tm, f); } finally { if (ok) shim.end(); } }',
    'X.xrFrameOpen = true; var ok = !!(shim && shim.begin(f)); try { cb(tm, f); } finally { if (ok) shim.end(); X.xrFrameOpen = false; if (X.afterFrame) X.afterFrame(); } }',
    ),
    (
    'set: function (v) { d.set.call(this, v); if (v === true) dirty.add(this); } }); X.mvHook = true; }',
    'set: function (v) { if (v === true && X.mvActive && X.deferUp) { X.deferUp(this); return; } d.set.call(this, v); if (v === true) dirty.add(this); } }); X.mvHook = true;'
    ' var held = new Set(), fresh = new Set(), sched = false, logged = 0;'
    ' X.deferUp = function (t) { held.add(t); try { if (!r.properties.get(t).__webglTexture) fresh.add(t); } catch (e) {} if (!X.xrFrameOpen) X.afterFrame(); };'
    ' X.afterFrame = function () { if (!held.size || sched) return; sched = true; setTimeout(function () { sched = false; if (X.xrFrameOpen) { X.afterFrame(); return; }'
    ' var n = 0, sz = []; held.forEach(function (t) { try { d.set.call(t, true); if (t.image && !t.isVideoTexture) { r.initTexture(t); if (t.__swapTo) { t.__swapTo.map = t; t.__swapTo = null; } n++; if (sz.length < 6) sz.push((t.image.width || 0) + "x" + (t.image.height || 0) + (fresh.has(t) ? " new" : "")); } } catch (e) {} });'
    ' held.clear(); fresh.clear(); X.mvStats.between = (X.mvStats.between || 0) + n; if (sz.some(function (z) { return z.indexOf("new") >= 0; }) && logged++ < 300) __gtLog("uploaded " + n + " texture(s) between frames, one made for the first time: " + sz.join(", ")); }, 0); };'
    ' X.freshTex = fresh;'
    ' X.deferMap = function (m, t) { if (!held.has(t)) return false; t.__swapTo = m; return true; }; X.heldTex = held; }',
    ),
    (
    'if (pres && X.mvActive) {',
    'if (pres && X.mvActive) { var hid = null; if (X.freshTex && X.freshTex.size && arguments[0] && arguments[0].traverse) { hid = []; var FT = X.freshTex, MK = ["map", "alphaMap", "emissiveMap", "bumpMap", "normalMap", "specularMap", "lightMap", "aoMap"];'
    ' arguments[0].traverse(function (o) { if (!o.visible || !o.material) return; var ms = Array.isArray(o.material) ? o.material : [o.material]; for (var i = 0; i < ms.length; i++) for (var j = 0; j < MK.length; j++) if (ms[i][MK[j]] && FT.has(ms[i][MK[j]])) { o.visible = false; hid.push(o); return; } }); }',
    ),
    (
    '        X.mvInFrame = false;',
    '        X.mvInFrame = false; if (hid) for (var hi = 0; hi < hid.length; hi++) hid[hi].visible = true;',
    ),
]

for old, new in EDITS + ([] if entry_only else GAME_FIXES) + (EXPERIMENTS[experiment] if experiment else []):
    n = html.count(old)
    if n != 1:
        sys.exit(f"ERROR: anchor found {n} times (expected 1): {old[:80]!r}")
    html = html.replace(old, new)

if verify:
    current = dst.read_bytes() if dst.exists() else b""
    if current == html.encode("utf-8"):
        print(f"VERIFY OK: {dst} == {src} + {len(EDITS)} entry-fix edits + {len(GAME_FIXES)} gameplay fixes, nothing else")
        root_copy = root / "index.html"
        if dst == default_dst and not experiment and not entry_only:
            if root_copy.exists() and root_copy.read_bytes() == current:
                print(f"VERIFY OK: {root_copy} is the same file")
            else:
                sys.exit(f"VERIFY FAILED: {root_copy} is missing or differs from {dst} (run apply_entry_fix.py to refresh it)")
        sys.exit(0)
    sys.exit(f"VERIFY FAILED: {dst} is not the original plus the {len(EDITS)} entry-fix edits and {len(GAME_FIXES)} gameplay fixes")

dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(html, encoding="utf-8")
print(f"wrote {dst} ({len(html.encode('utf-8'))} bytes, {len(EDITS)} entry edits + {len(GAME_FIXES)} gameplay fixes)")
# The author keeps the one-file game at the repository root as well (index.html): the release asset is
# mirrored there whenever the default asset is written (experiments and temporary outputs are not).
if dst == default_dst and not experiment and not entry_only:
    root_copy = root / "index.html"
    root_copy.write_text(html, encoding="utf-8")
    print(f"wrote {root_copy} (the same file, kept at the repository root)")
