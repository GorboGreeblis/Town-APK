#!/usr/bin/env python3
"""Produce the APK copy of the game from the untouched original.

Usage:  python3 tools/apply_entry_fix.py [src] [dst]
        python3 tools/apply_entry_fix.py --experiment nobatch|noeffects|nogovernor [src] dst   (diagnostic variant)
        python3 tools/apply_entry_fix.py --entry-only [src] dst   (VR-entry edits only, no gameplay fixes)
        python3 tools/apply_entry_fix.py --verify [src] [dst]
Default src: tools/uncompressed.html   Default dst: tools/android/app/src/main/assets/index.html

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
dst = pathlib.Path(args[1]) if len(args) > 1 else root / "tools" / "android" / "app" / "src" / "main" / "assets" / "index.html"

html = src.read_text(encoding="utf-8")

SHIM = (root / "tools" / "lib" / "xr_layers_shim.js").read_text(encoding="utf-8")

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
        '})();window.__gtBP=BP;const VIGS={};',
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
    # whose surface reaches z .41; its three cyan lights are boxes centred at
    # z .40 with depth .02, so their front faces lie exactly on the cuff's
    # surface. The lights now sit half inside the cuff (centre z .415: back
    # face .405 inside the metal, front face .425 proud by 1.5 cm) and the cuff
    # is .37 so it clears the forearm's noise-displaced skin (.34 + up to .018).
    (
        'R(T.cyl(.36,.36,.26,20),p,e,[.2*t,-1.12,.05]);for(let o=0;o<3;o++)R(T.box(.08,.04,.02),u,e,[.2*t,.06*o-1.07,.4]);',
        'R(T.cyl(.37,.37,.26,20),p,e,[.2*t,-1.12,.05]);for(let o=0;o<3;o++)R(T.box(.08,.04,.02),u,e,[.2*t,.06*o-1.07,.415]);',
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
        sys.exit(0)
    sys.exit(f"VERIFY FAILED: {dst} is not the original plus the {len(EDITS)} entry-fix edits and {len(GAME_FIXES)} gameplay fixes")

dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(html, encoding="utf-8")
print(f"wrote {dst} ({len(html.encode('utf-8'))} bytes, {len(EDITS)} entry edits + {len(GAME_FIXES)} gameplay fixes)")
