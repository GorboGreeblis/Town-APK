#!/usr/bin/env python3
"""Copy the game file to where it ships, or check that the copies match.

Since 3.15.43 (NOTES 87) the game has one source: `tools/uncompressed.html`, with every fix made in it directly.
Two copies of it ship: `index.html` at the repository root (the one-file game) and
`tools/android/app/src/main/assets/index.html` (the APK's). The game as it was before any of this work is not kept
in the repository (git history has it).

    python3 tools/sync_game.py           copy tools/uncompressed.html to both places
    python3 tools/sync_game.py --check   exit 1 unless both are byte-identical to it (the quick tier's first stage)
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "tools" / "uncompressed.html"
copies = [root / "index.html", root / "tools" / "android" / "app" / "src" / "main" / "assets" / "index.html"]
data = src.read_bytes()
if "--check" in sys.argv[1:]:
    bad = [c for c in copies if not c.exists() or c.read_bytes() != data]
    for c in copies:
        print(("  FAIL  " if c in bad else "  ok    ") + f"{c.relative_to(root)} {'differs from' if c in bad else '=='} tools/uncompressed.html")
    if bad:
        sys.exit("SYNC CHECK FAILED: run python3 tools/sync_game.py after editing tools/uncompressed.html (never edit the copies)")
    print(f"SYNC CHECK PASSED: both copies are the game file ({len(data)} bytes)")
    sys.exit(0)
for c in copies:
    c.parent.mkdir(parents=True, exist_ok=True)
    c.write_bytes(data)
    print(f"wrote {c.relative_to(root)} ({len(data)} bytes)")
