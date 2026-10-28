#!/usr/bin/env python3
"""Diagnostic builds: one experiment applied to a copy of the game file.

The game file (`tools/uncompressed.html`) is the game's only source since 3.15.43 (NOTES 87): every change is
made in it directly, and `tools/sync_game.py` copies it to `index.html` at the repository root and into the APK. An experiment is a variant for a
headset A/B test or a measurement, never part of the release: a list of exact text replacements applied to a
copy, each of which must match exactly once.

    python3 tools/experiment.py NAME [src] dst      default src: tools/uncompressed.html (the game file)
    python3 tools/experiment.py --list

`tools/build_experiment.sh NAME` builds an APK from one.
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
EXPERIMENTS = {
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
}

args = [a for a in sys.argv[1:]]
if not args or args[0] in ("-h", "--help"):
    print(__doc__); sys.exit(0)
if args[0] == "--list":
    print("\n".join(sorted(EXPERIMENTS))); sys.exit(0)
name = args.pop(0)
if name not in EXPERIMENTS:
    sys.exit(f"ERROR: no experiment {name!r}; known: {', '.join(sorted(EXPERIMENTS))}")
src = pathlib.Path(args[0]) if len(args) > 1 else root / "tools" / "uncompressed.html"
if not args:
    sys.exit("ERROR: give the output file (never the game file itself)")
dst = pathlib.Path(args[-1])
if dst.resolve() in ((root / "index.html").resolve(), (root / "tools" / "uncompressed.html").resolve()):
    sys.exit("ERROR: an experiment never writes the game file")
html = src.read_text(encoding="utf-8")
for old, new in EXPERIMENTS[name]:
    n = html.count(old)
    if n != 1:
        sys.exit(f"ERROR: {name}: anchor found {n} times (expected 1): {old[:80]!r}")
    html = html.replace(old, new)
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(html, encoding="utf-8")
print(f"wrote {dst} ({len(html.encode('utf-8'))} bytes, experiment {name}: {len(EXPERIMENTS[name])} edits on {src.name})")
