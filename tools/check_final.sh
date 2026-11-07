#!/bin/sh
# Confirms that all three versions of the game at the repository root are the final (Store) build of the current game
# file, with the debug and logging code taken out (RULES.md 34; the author: "All 3 versions of the game in root need to
# be confirmed to be the latest version of the game (final version with debug removed)"):
#   1. tools/final.html is made again from tools/uncompressed.html (final_build.js, its own checks included) into a
#      temporary file; the root index.html, the site's copy (tools/site/index.html, the copy the tests load and the
#      folder uploaded) and the game the Store APK opens are each byte for byte that file, and index.compressed.html
#      unpacks to it exactly. The Store APK is a Bubblewrap web app that opens the hosted site
#      (https://greeblistown.ar.io/): its index.html is fetched and compared (--offline skips the fetch);
#   2. index.html holds no debug or logging marker (GT_DEBUG, __gtLog, /log, __gtFR, __dbg, localStorage: the same list
#      final_build.js refuses; the others are the same file);
#   3. the game shows the version in tools/game_version.txt (the game's version), and the root APK's
#      versionName and versionCode are tools/twa/twa-manifest.json's (the Store APK's version).
#
#   tools/check_final.sh [--offline]    (--offline: the hosted site not fetched)
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"; OFFLINE=""; [ "${1:-}" = --offline ] && OFFLINE=1
APK=GreeblisTown-release.apk; ASSET=tools/site/index.html
[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] || export ANDROID_HOME=$(sed -n "s/^sdk.dir=//p" tools/twa/local.properties 2>/dev/null | head -1)
fail() { echo "  FAIL  $*"; echo "FINAL CHECK FAILED"; exit 1; }
ok() { echo "  ok    $*"; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
node tools/final_build.js tools/uncompressed.html --out "$TMP/final.html" > "$TMP/fb.log" 2>&1 || { tail -5 "$TMP/fb.log"; fail "final_build.js on the game file"; }
ok "the final build made again from tools/uncompressed.html ($(wc -c < "$TMP/final.html") bytes)"
# the game the Store APK opens: the APK is a Bubblewrap web app that loads the hosted site (B133)
url=$("$ANDROID_HOME"/build-tools/34.0.0/aapt2 dump resources "$APK" 2>/dev/null | grep -A1 'string/launchUrl$' | tail -1 | sed -n 's/.*() "\(.*\)"$/\1/p')
case $url in https://*) ok "$APK opens $url";; *) fail "$APK does not open an https site ($url)";; esac
if [ -z "$OFFLINE" ]; then
  curl -sS --max-time 120 -o "$TMP/site.html" "${url}index.html" 2>/dev/null || curl -sS --max-time 120 -o "$TMP/site.html" "$url" || fail "could not fetch $url"
fi
for f in index.html "$ASSET" ${OFFLINE:-"$TMP/site.html"}; do
  n=$f; [ "$f" = "$TMP/site.html" ] && n="the hosted game ($url)"
  cmp -s "$f" "$TMP/final.html" && ok "$n is the final build" || fail "$n is not the final build of the current game file"
done
[ -z "$OFFLINE" ] || echo "  note  the hosted site not fetched (--offline)"
node tools/build_compressed.js --check --src "$TMP/final.html" > /dev/null 2>&1 && ok "index.compressed.html unpacks to the final build" || fail "index.compressed.html does not unpack to the final build"
for m in GT_DEBUG __gtLog '"/log' '/log?' __gtFR __dbg localStorage; do
  if grep -qF -- "$m" index.html; then fail "index.html holds the debug marker $m"; fi
done
ok "no debug or logging marker in index.html (the hosted game and index.compressed.html are the same file)"
name=$(head -1 tools/game_version.txt)
c=$(grep -o "v$name\"" index.html | wc -l); [ "$c" -ge 4 ] && ok "the game shows v$name ($c places)" || fail "index.html does not show v$name"
tw=$(python3 -I -c "import json;m=json.load(open('tools/twa/twa-manifest.json'));print(m['appVersion'],m['appVersionCode'])")
b=$("$ANDROID_HOME"/build-tools/34.0.0/aapt2 dump badging "$APK" 2>/dev/null | head -1)
echo "$b" | grep -q "versionName='${tw% *}'" && echo "$b" | grep -q "versionCode='${tw#* }'" && ok "$APK is ${tw% *} (${tw#* }), as tools/twa/twa-manifest.json" || fail "$APK is not tools/twa's ${tw% *} (${tw#* }): $b"
echo "FINAL CHECK PASSED: the game $name (debug and logging removed) in index.html, index.compressed.html and the hosted site the Store APK ${tw% *} opens"
