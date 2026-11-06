#!/bin/sh
# Confirms that all three versions of the game at the repository root are the final (Store) build of the current game
# file, with the debug and logging code taken out (RULES.md 34; the author: "All 3 versions of the game in root need to
# be confirmed to be the latest version of the game (final version with debug removed)"):
#   1. tools/final.html is made again from tools/uncompressed.html (final_build.js, its own checks included) into a
#      temporary file; the root index.html, the APK's asset and GreeblisTown-release.apk's assets/index.html are each
#      byte for byte that file, and index.compressed.html unpacks to it exactly;
#   2. none of the three holds a debug or logging marker (GT_DEBUG, __gtLog, /log, __gtFR, __dbg, localStorage,
#      readPixels outside three.js's own: the same list final_build.js refuses);
#   3. the version each shows is versionName in build.gradle, and the APK's versionName and versionCode are build.gradle's;
#   4. the APK was built as the final build (BuildConfig.PAGE_LOG false: the /log endpoint and its page logging are
#      compiled out of its code).
#
#   tools/check_final.sh
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
GRADLE=tools/android/app/build.gradle; APK=GreeblisTown-release.apk; ASSET=tools/android/app/src/main/assets/index.html
[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] || export ANDROID_HOME=$(sed -n "s/^sdk.dir=//p" tools/android/local.properties 2>/dev/null | head -1)
fail() { echo "  FAIL  $*"; echo "FINAL CHECK FAILED"; exit 1; }
ok() { echo "  ok    $*"; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
node tools/final_build.js tools/uncompressed.html --out "$TMP/final.html" > "$TMP/fb.log" 2>&1 || { tail -5 "$TMP/fb.log"; fail "final_build.js on the game file"; }
ok "the final build made again from tools/uncompressed.html ($(wc -c < "$TMP/final.html") bytes)"
unzip -p "$APK" assets/index.html > "$TMP/apk.html" 2>/dev/null || fail "$APK has no assets/index.html"
for f in index.html "$ASSET" "$TMP/apk.html"; do
  n=$f; [ "$f" = "$TMP/apk.html" ] && n="$APK (assets/index.html)"
  cmp -s "$f" "$TMP/final.html" && ok "$n is the final build" || fail "$n is not the final build of the current game file"
done
node tools/build_compressed.js --check --src "$TMP/final.html" > /dev/null 2>&1 && ok "index.compressed.html unpacks to the final build" || fail "index.compressed.html does not unpack to the final build"
for f in index.html "$TMP/apk.html"; do
  n=$f; [ "$f" = "$TMP/apk.html" ] && n="$APK"
  for m in GT_DEBUG __gtLog '"/log' '/log?' __gtFR __dbg localStorage; do
    if grep -qF -- "$m" "$f"; then fail "$n holds the debug marker $m"; fi
  done
done
ok "no debug or logging marker in index.html or the APK (and index.compressed.html unpacks to the same file)"
name=$(sed -n 's/^ *versionName "\([^"]*\)".*/\1/p' "$GRADLE"); code=$(sed -n 's/^ *versionCode \([0-9]*\).*/\1/p' "$GRADLE")
c=$(grep -o "v$name\"" index.html | wc -l); [ "$c" -ge 4 ] && ok "index.html shows v$name ($c places)" || fail "index.html does not show v$name"
b=$("$ANDROID_HOME"/build-tools/34.0.0/aapt2 dump badging "$APK" 2>/dev/null | head -1)
echo "$b" | grep -q "versionCode='$code'" && echo "$b" | grep -q "versionName='$name'" && ok "$APK is $name ($code)" || fail "$APK is not $name ($code): $b"
unzip -p "$APK" 'classes*.dex' > "$TMP/dex" 2>/dev/null || true
# the endpoint's block logs "page: " lines; with BuildConfig.PAGE_LOG false (a constant) the compiler drops the block
# and its text, so the text is in a debug APK's code and not in the final one's
if [ -s "$TMP/dex" ] && ! grep -qaF "page: " "$TMP/dex"; then ok "the APK's /log endpoint is compiled out (no page-log code in it)"
else fail "the APK still has the /log endpoint's page logging (not built with tools/build.sh --final)"; fi
echo "FINAL CHECK PASSED: all three versions at the root are the final build $name ($code), debug and logging removed"
