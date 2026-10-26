#!/usr/bin/env python3
"""Produce the APK copy of the game from the untouched original.

Usage:  python3 tools/apply_entry_fix.py [src] [dst]
        python3 tools/apply_entry_fix.py --verify [src] [dst]
Default src: tools/uncompressed.html   Default dst: android/app/src/main/assets/index.html

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
args = [a for a in sys.argv[1:] if a != "--verify"]
verify = "--verify" in sys.argv[1:]
src = pathlib.Path(args[0]) if len(args) > 0 else root / "tools" / "uncompressed.html"
dst = pathlib.Path(args[1]) if len(args) > 1 else root / "android" / "app" / "src" / "main" / "assets" / "index.html"

html = src.read_text(encoding="utf-8")

EDITS = [
    # 1. Head script: catch the Quest Browser's WebXR grant before the 1 MB of game
    #    scripts parse, and request the session *inside* the grant handler (the only
    #    moment the browser allows a session without a controller press). The session
    #    is parked in window.__gtXR.pending until the game has finished building.
    (
        '<title>Greeblis Town</title>',
        '<title>Greeblis Town</title>'
        '<script>/* APK immersive launch: capture the WebXR grant early (see tools/apply_entry_fix.py) */'
        '(function(){var X=window.__gtXR={granted:!1,pending:null,enter:null};'
        'try{navigator.xr&&navigator.xr.addEventListener("sessiongranted",function(){X.granted=!0;'
        'if(X.enter){X.enter();return}'
        'try{var p=navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]});'
        'X.pending=p;p.then(function(s){try{s.addEventListener("end",function(){X.pending===p&&(X.pending=null)})}catch(e){}},'
        'function(){X.pending===p&&(X.pending=null)})}catch(e){X.pending=null}})}catch(e){}})();</script>'
    ),
    # 2. Gate: expose the game's own "enter VR" routine to the head script, and enter
    #    at once if the grant already arrived and the world is ready.
    (
        'const t=()=>{o.presenting||(gcEB.ready&&je())};try{navigator.xr.addEventListener("sessiongranted",t)}catch(e){}',
        'const t=()=>{o.presenting||(gcEB.ready&&je())};try{navigator.xr.addEventListener("sessiongranted",t)}catch(e){}'
        'try{window.__gtXR&&(window.__gtXR.enter=t,window.__gtXR.granted&&gcEB.ready&&t())}catch(e){}',
    ),
    # 3. World ready: if the grant arrived while the world was still building, enter now.
    (
        'gcEB.ready=!0}()',
        'gcEB.ready=!0;try{window.__gtXR&&window.__gtXR.granted&&window.__gtXR.enter&&window.__gtXR.enter()}catch(e){}}()',
    ),
    # 4. Session request: reuse the session parked by the head script when there is one.
    (
        'a=await navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]})',
        'a=await(window.__gtXR&&window.__gtXR.pending||navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor","bounded-floor"]}))',
    ),
]

for old, new in EDITS:
    n = html.count(old)
    if n != 1:
        sys.exit(f"ERROR: anchor found {n} times (expected 1): {old[:80]!r}")
    html = html.replace(old, new)

if verify:
    current = dst.read_bytes() if dst.exists() else b""
    if current == html.encode("utf-8"):
        print(f"VERIFY OK: {dst} == {src} + {len(EDITS)} entry-fix edits, nothing else")
        sys.exit(0)
    sys.exit(f"VERIFY FAILED: {dst} is not the original plus the {len(EDITS)} entry-fix edits")

dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(html, encoding="utf-8")
print(f"wrote {dst} ({len(html.encode('utf-8'))} bytes, {len(EDITS)} edits)")
