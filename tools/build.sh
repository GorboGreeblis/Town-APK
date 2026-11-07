#!/bin/sh
# Rebuilds everything that ships from the game file alone (RULES.md 2), then checks it:
#   0. the game file is minified (RULES.md 19): minify_game.js, a no-op when it already is; when it changes the file,
#      minify_identity.js proves the minified file builds the same world as the edited one (else the build stops);
#   1. the copies: index.html at the root and the site's copy, tools/site/index.html (the copy the tests load and the
#      site serves; sync_game.py);
#   2. the pre-painted textures in tools/site/tex/ (prerender_textures.js; painting is seeded, FIXES R1, so an
#      unchanged game file paints the same files again);
#   3. the version: if what ships (the site's copy or tex/) differs from the last commit's, the game's version
#      (tools/game_version.txt) must go up (RULES.md 12): --bump raises it; without it the build stops and says so;
#   3b. the version the game shows (landing text, gate corner, VR loading box) stamped from tools/game_version.txt, the
#      copies synced again when that changed the game file (FIXES A18);
#   4. the rest of the site the Store APK opens (build_site.py: the web manifest, icons, Digital Asset Links) and its zip
#      (tools/.runs/site.zip): tools/site is the folder the author uploads to https://greeblistown.ar.io/. The Store
#      APK (tools/build_twa.sh, Meta's Bubblewrap) holds no game: no APK is built here;
#   5. the compressed version, index.compressed.html at the root (build_compressed.js; RULES.md 20);
#   6. the checks: sync_game.py --check, experiment.py --check, check_apk.sh (the root Store APK's rules),
#      test_standalone.js (the game runs alone; tex/ is what it paints) and test_compressed.js (the
#      compressed version works as an ordinal). --no-test skips the last two.
#
# --final builds the Store build (the author, 2026-11-06: "From the very last build: debug and logging features must
# be removed"): after step 0, final_build.js writes tools/final.html (the game file without its debug code, checked;
# 0b), and everything that ships is built from it instead of the game file: the copies (index.html at the root, the
# site's copy, index.compressed.html; sync_game.py --src) and the textures in tex/ (painted from it: its own
# minification may change a painter's source, which keys and seeds the texture). The version is stamped in the game
# file first (3b) and the final build written again from it, so the final build shows the right version. The checks
# compare against tools/final.html, and test_final.js plays it as shipped (no test hook). The final build is what is
# uploaded (RELEASE.md); the game file keeps its debug code, and a later build without --final ships it again. The
# usual Store build: tools/build.sh --bump --final
#
#   tools/build.sh [--bump] [--final] [--no-test]
#
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); BUMP=""; TEST=1; FINAL=""
for a in "$@"; do case $a in --bump) BUMP=1;; --final) FINAL=1;; --no-test) TEST="";; *) echo "usage: $0 [--bump] [--final] [--no-test]"; exit 2;; esac; done
# GAME: the game file; SHIP: what the copies and tex/ are built from (the game file, or the final build)
GAME="$ROOT/tools/uncompressed.html"; SHIP="$GAME"; [ -z "$FINAL" ] || SHIP="$ROOT/tools/final.html"
sync() { if [ -n "$FINAL" ]; then python3 -I "$ROOT/tools/sync_game.py" --src "$SHIP" "$@"; else python3 -I "$ROOT/tools/sync_game.py" "$@"; fi; }
final() {
  node "$ROOT/tools/final_build.js" "$GAME" --out "$SHIP" > "$ROOT/tools/.runs/final_build.log" 2>&1 || { tail -16 "$ROOT/tools/.runs/final_build.log"; echo "BUILD STOPPED: the final build's checks failed (log: tools/.runs/final_build.log)"; exit 1; }
  grep '^final_build:' "$ROOT/tools/.runs/final_build.log"; tail -1 "$ROOT/tools/.runs/final_build.log"
}
SITE="$ROOT/tools/site"; APK="$ROOT/GreeblisTown-release.apk"
[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] || export ANDROID_HOME=$(sed -n "s/^sdk.dir=//p" "$ROOT/tools/twa/local.properties" 2>/dev/null | head -1)

echo "== 0. minified game file"
# the game file as edited, kept so the minified result can be proved to build the same world (the author: "this
# minified version is tested against the original to ensure that no changes have been made to the game")
mkdir -p "$ROOT/tools/.runs"; cp "$ROOT/tools/uncompressed.html" "$ROOT/tools/.runs/before_minify.html"
node "$ROOT/tools/minify_game.js" | tail -1
if cmp -s "$ROOT/tools/uncompressed.html" "$ROOT/tools/.runs/before_minify.html"; then
  echo "minification changed nothing (the file was already fully minified)"
else
  if node "$ROOT/tools/minify_identity.js" "$ROOT/tools/.runs/before_minify.html" "$ROOT/tools/uncompressed.html" > "$ROOT/tools/.runs/minify_identity.log" 2>&1; then
    tail -2 "$ROOT/tools/.runs/minify_identity.log"
  else
    tail -8 "$ROOT/tools/.runs/minify_identity.log"; echo "BUILD STOPPED: the minified game file does not build the same world as the edited one"; exit 1
  fi
fi

if [ -n "$FINAL" ]; then
  echo "== 0b. the final build (the debug code taken out)"
  final
fi

echo "== 1. copies of the game file${FINAL:+ (the final build)}"
sync

echo "== 2. pre-painted textures"
node "$ROOT/tools/prerender_textures.js" "$SHIP" | tail -2

echo "== 3. version"
# the game's version is tools/game_version.txt (the Store APK has its own, tools/twa/twa-manifest.json: a game change is
# a new upload of the site, not a new APK). What ships is the game (the site's copy, its tex/), compared with the last
# commit's; a raised version goes one past the higher of the game's and the APK's, so no number names two things
VFILE="$ROOT/tools/game_version.txt"; name=$(head -1 "$VFILE"); headname=$(git -C "$ROOT" show HEAD:tools/game_version.txt 2>/dev/null | head -1)
changed=""
git -C "$ROOT" show HEAD:tools/site/index.html 2>/dev/null | cmp -s - "$SITE/index.html" || changed="the game"
git -C "$ROOT" diff --quiet HEAD -- tools/site/tex 2>/dev/null || changed="${changed:+$changed and }the textures"
if [ -n "$changed" ] && [ "$name" = "$headname" ]; then
  if [ -z "$BUMP" ]; then echo "what ships changed ($changed) but the version is still $name, as committed: run again with --bump"; exit 1; fi
  name=$(python3 -I - "$name" "$ROOT/tools/twa/twa-manifest.json" <<'PY'
import json, sys
key = lambda v: tuple(int(x) for x in v.split('.'))
top = max(sys.argv[1], json.load(open(sys.argv[2]))['appVersion'], key=key).split('.')
print('.'.join(top[:-1] + [str(int(top[-1]) + 1)]))
PY
)
  echo "$name" > "$VFILE"
  echo "version raised to $name; add its row to tools/VERSIONS.md"
elif [ -n "$changed" ]; then echo "what ships changed ($changed); version $name"
else echo "nothing that ships changed; version $name"; fi

echo "== 3b. version shown in the game"
# The non-Quest landing text, the Quest gate's corner (twice) and the VR loading box show the version: stamped here
# from tools/game_version.txt, so they always match the build; the copies are synced again when that changed the game file.
cp "$GAME" "$ROOT/tools/.runs/before_stamp.html"
python3 -I - "$ROOT/tools/uncompressed.html" "$name" <<'PY' || exit 1
import re, sys
p, v = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
t, n = re.subn(r'v\d+\.\d+(?:\.\d+)?(?=")', 'v' + v, s)
if n != 4: sys.exit('VERSION STAMP FAILED: expected the version in 4 places of the game file, found %d' % n)
if t != s: open(p, 'w', encoding='utf-8').write(t)
print('the game shows v' + v)
PY
# the final build is written again from the stamped game file, so it shows the same version
[ -z "$FINAL" ] || cmp -s "$GAME" "$ROOT/tools/.runs/before_stamp.html" || final
cmp -s "$SHIP" "$SITE/index.html" || sync

echo "== 4. the site the Store APK opens"
# Since 4.0.64 (B133) the Store APK is a Bubblewrap web app (tools/build_twa.sh) that opens the game hosted at
# https://greeblistown.ar.io/: no APK is built here. The site's folder is written from what ships (the author uploads it
# to ArDrive and points the ArNS name at it; then tools/check_final.sh compares the live game with the final build).
python3 -I "$ROOT/tools/build_site.py" | head -1

echo "== 5. compressed version"
node "$ROOT/tools/build_compressed.js" --src "$SHIP"

echo "== 6. checks"
check() { log="$ROOT/tools/.runs/build_check.log"; "$@" > "$log" 2>&1 || { tail -30 "$log"; echo "BUILD CHECK FAILED: $*"; exit 1; }; tail -1 "$log"; }
check sync --check
check python3 -I "$ROOT/tools/experiment.py" --check
check "$ROOT/tools/check_apk.sh" "$APK"
[ -z "$TEST" ] || check node "$ROOT/tools/test_standalone.js" "$SHIP"
# test_compressed.js given the page checks it as it is (sync_game.py --check above unpacked it against the final build)
[ -z "$TEST" ] || if [ -n "$FINAL" ]; then check node "$ROOT/tools/test_compressed.js" "$ROOT/index.compressed.html"; else check node "$ROOT/tools/test_compressed.js"; fi
[ -z "$TEST" ] || [ -z "$FINAL" ] || check node "$ROOT/tools/test_final.js" "$SHIP"
[ -z "$FINAL" ] || check "$ROOT/tools/check_final.sh" --offline
if [ -n "$FINAL" ]; then
  echo "BUILD DONE: $name, the final build (tools/final.html: no debug code) in index.html, index.compressed.html and the site folder (tools/site) to upload"
  echo "  (the copies are the final build, not the game file: sync_game.py --check fails by design; the pre-commit hook and tools/check_final.sh accept them; tools/build.sh without --final ships the game file again)"
else echo "BUILD DONE: $name"; fi
