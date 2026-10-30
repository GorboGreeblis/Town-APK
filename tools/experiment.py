#!/usr/bin/env python3
"""Diagnostic builds: one experiment applied to a copy of the game file.

The game file (`tools/uncompressed.html`) is the game's only source since 3.15.43 (NOTES 87): every change is
made in it directly, and `tools/sync_game.py` copies it to `index.html` at the repository root and into the APK. An experiment is a variant for diagnosis
or measurement only (RULES.md 22: a change is never tried as an A/B build, it goes straight into the main build),
never part of the release: a list of exact text replacements applied to a copy, each of which must match exactly
once.

    python3 tools/experiment.py NAME [src] dst      default src: tools/uncompressed.html (the game file)
    python3 tools/experiment.py --list
    python3 tools/experiment.py --check [src]   every experiment's anchors match the game file once (quick tier)

`tools/build_experiment.sh NAME` builds an APK from one.
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
EXPERIMENTS = {
    # The anchors are text of the minified game file (local names as the minifier gave them, NOTES 89): after an
    # edit to the game file, `python3 tools/experiment.py --check` (quick tier) shows any that no longer match.
    # No layers: the release requests the WebXR "layers" feature (compositor
    # layers for the loading screen, projection layer for the game, NOTES 42,
    # confirmed on the headset). This variant goes back to the plain
    # projection-layer loader, to measure or diagnose what the layers path costs.
    "nolayers": [(
        'optionalFeatures:["local-floor","bounded-floor","layers"]})}catch(e){return null}}function park(',
        'optionalFeatures:["local-floor","bounded-floor"]})}catch(e){return null}}function park(',
    )],
    # Texture capture: record every pre-renderable canvas painter's output during
    # the boot (used by tools/prerender_textures.js, never shipped).
    "texcapture": [(".tex={map:{},pr:{},n:{},on:!0},", ".tex={map:{},pr:{},n:{},on:!0,capture:[]},")],
    # No multiview (NOTES 65, 67): the release draws both eyes in one pass (multiview, headset-
    # confirmed in 3.15.33's experiment); this variant plans it off, so the game takes the classic
    # path (each eye drawn separately), to measure or diagnose the multiview path against it.
    "nomultiview": [('n=!(!f||l&&!c&&!s),a="webgl2 "+i', 'n=!1,a="experiment nomultiview; webgl2 "+i')],
    # Draw every mesh individually: no gcEB batches, no custom vertex shader.
    "nobatch": [("const gcEB={list:[],mats:new WeakMap,geos:new WeakMap,root:null,N:32,f:0,tmp:[]};",
                 "const gcEB={list:[],mats:new WeakMap,geos:new WeakMap,root:null,N:32,f:0,tmp:[],off:!0};")],
    # No pickup effects: no sparkle particles, no floating labels, no HUD/label texture churn from pickups.
    "noeffects": [("gcEB.ready=!0,", "gcEB.ready=!0,Nt.sparkle=()=>{},Ut.at=()=>{},Ut.above=()=>{},")],
}

args = [a for a in sys.argv[1:]]
if not args or args[0] in ("-h", "--help"):
    print(__doc__); sys.exit(0)
if args[0] == "--list":
    print("\n".join(sorted(EXPERIMENTS))); sys.exit(0)
if args[0] == "--check":
    html = (pathlib.Path(args[1]) if len(args) > 1 else root / "tools" / "uncompressed.html").read_text(encoding="utf-8")
    bad = [(k, old) for k, edits in sorted(EXPERIMENTS.items()) for old, _ in edits if html.count(old) != 1]
    for k, old in bad:
        print(f"  FAIL  {k}: anchor found {html.count(old)} times (expected 1): {old[:90]!r}")
    if bad:
        sys.exit(f"EXPERIMENT CHECK FAILED: {len(bad)} anchors no longer match the game file (update them in tools/experiment.py)")
    print(f"EXPERIMENT CHECK PASSED: all {len(EXPERIMENTS)} experiments apply to the game file")
    sys.exit(0)
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
