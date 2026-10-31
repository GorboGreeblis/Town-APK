#!/bin/sh
# Rebuilds everything that ships from the game file alone (RULES.md 2), then checks it:
#   0. the game file is minified (RULES.md 19): minify_game.js, a no-op when it already is; when it changes the file,
#      minify_identity.js proves the minified file builds the same world as the edited one (else the build stops);
#   1. the copies: index.html at the root and the APK's asset (sync_game.py);
#   2. the pre-painted textures in the APK's assets/tex/ (prerender_textures.js; painting is seeded, FIXES R1, so an
#      unchanged game file paints the same files again);
#   3. the version: if what ships (the asset or tex/) differs from what the root APK holds, the version must go up
#      (RULES.md 12): --bump raises versionCode by one and versionName's last number to match; without it the build
#      stops and says so;
#   3b. the version the game shows (landing text, gate corner, VR loading box) stamped from versionName, the copies
#      synced again when that changed the game file (FIXES A18);
#   4. the release APK (Gradle), copied to the root as GreeblisTown-release.apk;
#   5. the compressed version, index.compressed.html at the root (build_compressed.js; never in the APK, RULES.md 20);
#   6. the checks: sync_game.py --check, experiment.py --check, check_apk.sh (store rules, the root APK holds the
#      current game), test_standalone.js (the game runs alone; tex/ is what it paints) and test_compressed.js (the
#      compressed version works as an ordinal). --no-test skips the last two.
#
#   tools/build.sh [--bump] [--no-test]
#
# Signing uses tools/android/keystore.properties when present (BUILD.md); without it the APK is unsigned. Never commit
# the keystore.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); BUMP=""; TEST=1
for a in "$@"; do case $a in --bump) BUMP=1;; --no-test) TEST="";; *) echo "usage: $0 [--bump] [--no-test]"; exit 2;; esac; done
ASSETS="$ROOT/tools/android/app/src/main/assets"; GRADLE="$ROOT/tools/android/app/build.gradle"; APK="$ROOT/GreeblisTown-release.apk"
[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] || export ANDROID_HOME=$(sed -n "s/^sdk.dir=//p" "$ROOT/tools/android/local.properties" 2>/dev/null | head -1)

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

echo "== 1. copies of the game file"
python3 -I "$ROOT/tools/sync_game.py"

echo "== 2. pre-painted textures"
node "$ROOT/tools/prerender_textures.js" | tail -2

echo "== 3. version"
code=$(sed -n 's/^ *versionCode \([0-9]*\).*/\1/p' "$GRADLE"); name=$(sed -n 's/^ *versionName "\([^"]*\)".*/\1/p' "$GRADLE")
changed=""
if [ ! -f "$APK" ]; then changed="no root APK"
else
  unzip -p "$APK" assets/index.html | cmp -s - "$ASSETS/index.html" || changed="the game"
  tmp=$(mktemp -d); unzip -q "$APK" 'assets/tex/*' -d "$tmp" 2>/dev/null || true
  diff -rq "$tmp/assets/tex" "$ASSETS/tex" >/dev/null 2>&1 || changed="${changed:+$changed and }the textures"
  rm -rf "$tmp"
fi
apkcode=""; [ -f "$APK" ] && apkcode=$("$ANDROID_HOME"/build-tools/34.0.0/aapt2 dump badging "$APK" 2>/dev/null | sed -n "s/.*versionCode='\([0-9]*\)'.*/\1/p" | head -1)
if [ -n "$changed" ] && [ "$code" = "$apkcode" ]; then
  if [ -z "$BUMP" ]; then echo "what ships changed ($changed) but the version is still $name ($code), as in the root APK: run again with --bump"; exit 1; fi
  code=$((code + 1)); name="${name%.*}.$((${name##*.} + 1))"
  sed -i "s/^\( *versionCode \)[0-9]*/\1$code/; s/^\( *versionName \)\"[^\"]*\"/\1\"$name\"/" "$GRADLE"
  echo "version raised to $name ($code); add its row to tools/VERSIONS.md"
elif [ -n "$changed" ]; then echo "what ships changed ($changed); version $name ($code), the root APK has ${apkcode:-none}"
else echo "nothing that ships changed; version $name ($code)"; fi

echo "== 3b. version shown in the game"
# The non-Quest landing text, the Quest gate's corner (twice) and the VR loading box show the version: stamped here
# from versionName, so they always match the build; the copies are synced again when that changed the game file.
python3 -I - "$ROOT/tools/uncompressed.html" "$name" <<'PY' || exit 1
import re, sys
p, v = sys.argv[1], sys.argv[2]
s = open(p, encoding='utf-8').read()
t, n = re.subn(r'v\d+\.\d+(?:\.\d+)?(?=")', 'v' + v, s)
if n != 4: sys.exit('VERSION STAMP FAILED: expected the version in 4 places of the game file, found %d' % n)
if t != s: open(p, 'w', encoding='utf-8').write(t)
print('the game shows v' + v)
PY
cmp -s "$ROOT/tools/uncompressed.html" "$ASSETS/index.html" || python3 -I "$ROOT/tools/sync_game.py"

echo "== 4. release APK"
OUT="$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk"; LOG="$ROOT/tools/.runs/build_gradle.log"
mkdir -p "$ROOT/tools/.runs"; rm -f "$OUT"
( cd "$ROOT/tools/android" && ./gradlew -q assembleRelease ) > "$LOG" 2>&1 || { grep -v JAVA_TOOL_OPTIONS "$LOG" | tail -30; echo "BUILD FAILED: Gradle (log: $LOG)"; exit 1; }
cp "$OUT" "$APK"
echo "built $APK"

echo "== 5. compressed version"
node "$ROOT/tools/build_compressed.js"

echo "== 6. checks"
check() { log="$ROOT/tools/.runs/build_check.log"; "$@" > "$log" 2>&1 || { tail -30 "$log"; echo "BUILD CHECK FAILED: $*"; exit 1; }; tail -1 "$log"; }
check python3 -I "$ROOT/tools/sync_game.py" --check
check python3 -I "$ROOT/tools/experiment.py" --check
check "$ROOT/tools/check_apk.sh" "$APK"
[ -z "$TEST" ] || check node "$ROOT/tools/test_standalone.js"
[ -z "$TEST" ] || check node "$ROOT/tools/test_compressed.js"
echo "BUILD DONE: $name ($code)"
