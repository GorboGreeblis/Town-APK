#!/bin/sh
# Rebuilds everything that ships from the game file alone (RULES.md 2), then checks it:
#   1. the copies: index.html at the root and the APK's asset (sync_game.py);
#   2. the pre-painted textures in the APK's assets/tex/ (prerender_textures.js; painting is seeded, FIXES R1, so an
#      unchanged game file paints the same files again);
#   3. the version: if what ships (the asset or tex/) differs from what the root APK holds, the version must go up
#      (RULES.md 12): --bump raises versionCode by one and versionName's last number to match; without it the build
#      stops and says so;
#   4. the release APK (Gradle), copied to the root as GreeblisTown-release.apk;
#   5. the checks: sync_game.py --check, check_apk.sh (store rules, the root APK holds the current game) and
#      test_standalone.js (the game runs alone; tex/ is what it paints). --no-test skips the last one.
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

echo "== 4. release APK"
OUT="$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk"; LOG="$ROOT/tools/.runs/build_gradle.log"
mkdir -p "$ROOT/tools/.runs"; rm -f "$OUT"
( cd "$ROOT/tools/android" && ./gradlew -q assembleRelease ) > "$LOG" 2>&1 || { grep -v JAVA_TOOL_OPTIONS "$LOG" | tail -30; echo "BUILD FAILED: Gradle (log: $LOG)"; exit 1; }
cp "$OUT" "$APK"
echo "built $APK"

echo "== 5. checks"
check() { log="$ROOT/tools/.runs/build_check.log"; "$@" > "$log" 2>&1 || { tail -30 "$log"; echo "BUILD CHECK FAILED: $*"; exit 1; }; tail -1 "$log"; }
check python3 -I "$ROOT/tools/sync_game.py" --check
check "$ROOT/tools/check_apk.sh" "$APK"
[ -z "$TEST" ] || check node "$ROOT/tools/test_standalone.js"
echo "BUILD DONE: $name ($code)"
