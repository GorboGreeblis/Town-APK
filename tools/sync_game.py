#!/usr/bin/env python3
"""Update every copy of the game file, or check that they all match it (RULES.md 24: all copies always updated).

Since 3.15.43 (NOTES 87) the game has one source: `tools/uncompressed.html`, with every fix made in it directly.
Three copies of it ship: `index.html` at the repository root (the one-file game),
`tools/android/app/src/main/assets/index.html` (the APK's) and `index.compressed.html` at the root (the compressed
version, a Bitcoin ordinal; RULES.md 20; built by `build_compressed.js`, which takes about 20 s). The game as it was
before any of this work is not kept in the repository (git history has it). The APK itself is rebuilt by
`tools/build.sh --bump`.

    python3 tools/sync_game.py           copy tools/uncompressed.html to both places and rebuild the compressed version
    python3 tools/sync_game.py --check   exit 1 unless both copies are byte-identical to it and the compressed version
                                         unpacks to it exactly (the quick tier's first stage)
"""
import sys, pathlib, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "tools" / "uncompressed.html"
copies = [root / "index.html", root / "tools" / "android" / "app" / "src" / "main" / "assets" / "index.html"]
builder = root / "tools" / "build_compressed.js"
data = src.read_bytes()
if "--check" in sys.argv[1:]:
    bad = [c for c in copies if not c.exists() or c.read_bytes() != data]
    for c in copies:
        print(("  FAIL  " if c in bad else "  ok    ") + f"{c.relative_to(root)} {'differs from' if c in bad else '=='} tools/uncompressed.html")
    comp = subprocess.run(["node", str(builder), "--check"], capture_output=True, text=True)
    print(("  ok    " if comp.returncode == 0 else "  FAIL  ") + "index.compressed.html " + ("unpacks to" if comp.returncode == 0 else "does not unpack to") + " tools/uncompressed.html")
    if bad or comp.returncode:
        sys.exit("SYNC CHECK FAILED: run python3 tools/sync_game.py after editing tools/uncompressed.html (never edit the copies)")
    print(f"SYNC CHECK PASSED: every copy is the game file ({len(data)} bytes)")
    sys.exit(0)
for c in copies:
    c.parent.mkdir(parents=True, exist_ok=True)
    c.write_bytes(data)
    print(f"wrote {c.relative_to(root)} ({len(data)} bytes)")
subprocess.run(["node", str(builder)], check=True)
