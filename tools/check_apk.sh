#!/bin/sh
# Checks the Store APK against the Meta Horizon Store's rules for a web app (PWA) APK (B133, 4.0.64): since 4.0.64 the
# APK is a Trusted Web Activity made by Meta's Bubblewrap CLI (tools/twa, tools/build_twa.sh) that opens the game hosted
# at an HTTPS site (https://greeblistown.ar.io/, tools/build_site.py); the Store's upload refuses one whose start URL is
# not https or whose manifest lacks Bubblewrap's twa_generator tag. Checked:
#   - the upload's own two rules: DEFAULT_URL is an https URL; twa_generator is bubblewrap-cli;
#   - immersive launch: horizonos.pwa.APP_MODE immersive, the launcher in com.oculus.intent.category.VR;
#   - VRC.Quest.Packaging.1-6: the package, signed with APK Signature Scheme v2, no phone-only features required,
#     min SDK 23+ and target SDK 32 (Quest runs apps targeting 32 or lower), under 1 GB, 64-bit code where there is native
#     code; Security.2: the permissions are Bubblewrap's own (hand tracking) and nothing else;
#   - Digital Asset Links: the APK's signing certificate is the one in the site's /.well-known/assetlinks.json and the
#     APK's asset statement names the site (with --online, the live file is fetched and compared).
#
#   tools/check_apk.sh [path/to/app.apk] [--online]
#
# Needs: ANDROID_HOME with build-tools/34.0.0 (aapt2, apksigner). Exit 1 on any FAIL.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
APK=$ROOT/GreeblisTown-release.apk; ONLINE=""
for a in "$@"; do case $a in --online) ONLINE=1;; *) APK=$a;; esac; done
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
[ -n "$SDK" ] || SDK=$(sed -n "s/^sdk.dir=//p" "$ROOT/tools/twa/local.properties" 2>/dev/null | head -1)
BT=$(ls -d "$SDK"/build-tools/34.* 2>/dev/null | tail -1)
[ -x "$BT/aapt2" ] || { echo "aapt2 not found under $SDK/build-tools (set ANDROID_HOME)"; exit 2; }
[ -f "$APK" ] || { echo "APK not found: $APK"; exit 2; }

fail=0
ok()   { printf '  PASS  %s\n' "$1"; }
bad()  { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }
note() { printf '  NOTE  %s\n' "$1"; }
check() { if [ "$2" = 1 ]; then ok "$1"; else bad "$1"; fi; }

BADGING=$("$BT/aapt2" dump badging "$APK" 2>/dev/null)
XML=$("$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK" 2>/dev/null)
RES=$("$BT/aapt2" dump resources "$APK" 2>/dev/null)
# a manifest meta-data value: literal, or the string resource it points to
meta() { v=$(printf '%s\n' "$XML" | grep -A2 "name(0x01010003)=\"$1\"" | sed -n 's/.*value(0x01010024)="\([^"]*\)".*/\1/p' | head -1)
  if [ -z "$v" ]; then r=$(printf '%s\n' "$XML" | grep -A2 "name(0x01010003)=\"$1\"" | sed -n 's/.*value(0x01010024)=@\(0x[0-9a-f]*\).*/\1/p' | head -1)
    [ -n "$r" ] && v=$(printf '%s\n' "$RES" | grep -A1 "resource $r " | tail -1 | sed -n 's/.*() "\(.*\)"$/\1/p'); fi; printf '%s' "$v"; }
str() { printf '%s\n' "$RES" | grep -A1 "string/$1\$" | tail -1 | sed -n 's/.*() "\(.*\)"$/\1/p'; }

echo "APK: $APK"
printf '%s\n' "$BADGING" | grep -o "package: name='[^']*' versionCode='[^']*' versionName='[^']*'"
echo
echo "Store upload: a Bubblewrap-made PWA with an https start URL (B133)"
url=$(meta android.support.customtabs.trusted.DEFAULT_URL)
check "DEFAULT_URL uses https ($url)" "$(case $url in https://*) echo 1;; esac)"
gen=$(meta twa_generator)
check "twa_generator present and bubblewrap-cli ($gen)" "$([ "$gen" = bubblewrap-cli ] && echo 1)"
echo
echo "Immersive launch"
mode=$(meta horizonos.pwa.APP_MODE)
check "horizonos.pwa.APP_MODE = immersive ($mode)" "$([ "$mode" = immersive ] && echo 1)"
ab=$(printf '%s\n' "$XML" | grep -o 'allowBackup(0x01010280)=[a-z]*' | head -1 | sed 's/.*=//')
check "android:allowBackup false (the author, 2026-11-07; is $ab)" "$([ "$ab" = false ] && echo 1)"
check "launcher in com.oculus.intent.category.VR" "$(printf '%s\n' "$XML" | grep -q 'com.oculus.intent.category.VR' && echo 1)"
echo
echo "VRC.Quest.Packaging.1-6, Security.2"
pkg=$(printf '%s\n' "$BADGING" | sed -n "s/^package: name='\([^']*\)'.*/\1/p")
check "package com.montgummery.greeblis ($pkg)" "$([ "$pkg" = com.montgummery.greeblis ] && echo 1)"
check "APK Signature Scheme v2 verified" "$("$BT/apksigner" verify -v "$APK" 2>/dev/null | grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' && echo 1)"
min=$(printf '%s\n' "$BADGING" | sed -n "s/^sdkVersion:'\([0-9]*\)'/\1/p"); tgt=$(printf '%s\n' "$BADGING" | sed -n "s/^targetSdkVersion:'\([0-9]*\)'/\1/p")
check "minSdkVersion 23 or more (is $min)" "$([ "${min:-0}" -ge 23 ] && echo 1)"
check "targetSdkVersion 32 (Quest runs apps targeting 32 or lower; is $tgt)" "$([ "${tgt:-0}" = 32 ] && echo 1)"
check "touchscreen not required" "$(printf '%s\n' "$BADGING" | grep -q "uses-feature: name='android.hardware.touchscreen'" || echo 1)"
check "no phone-only features required (bluetooth, camera, telephony)" "$(printf '%s\n' "$BADGING" | grep -qE "uses-feature: name='android.hardware.(bluetooth|camera|telephony)" || echo 1)"
size=$(wc -c < "$APK"); check "under 1 GB ($((size / 1024)) KB)" "$([ "$size" -lt 1073741824 ] && echo 1)"
nat=$(printf '%s\n' "$BADGING" | sed -n "s/^native-code: //p")
check "64-bit code where there is native code (${nat:-none})" "$([ -z "$nat" ] || printf '%s' "$nat" | grep -q arm64-v8a && echo 1)"
perms=$(printf '%s\n' "$BADGING" | sed -n "s/^uses-permission: name='\([^']*\)'.*/\1/p" | tr '\n' ' ')
extra=$(printf '%s\n' $perms | grep -vxE 'com.oculus.permission.HAND_TRACKING|android.permission.INTERNET|android.permission.POST_NOTIFICATIONS' | tr '\n' ' ')
check "permissions only Bubblewrap's own (${perms:-none})" "$([ -z "$extra" ] && echo 1)"
echo
echo "Digital Asset Links"
fp=$("$BT/apksigner" verify --print-certs "$APK" 2>/dev/null | sed -n 's/.*certificate SHA-256 digest: //p' | head -1 | tr a-f A-F | sed 's/../&:/g; s/:$//')
stmt=$(str assetStatements); host=$(printf '%s' "$url" | sed -n 's|^https://\([^/]*\).*|\1|p')
check "the APK's asset statement names the site (https://$host)" "$(printf '%s' "$stmt" | grep -q "\"site\": \"https://$host\"" && echo 1)"
site=$ROOT/tools/site/.well-known/assetlinks.json
if [ -f "$site" ]; then check "the site folder's assetlinks.json (tools/site) names this signing certificate ($fp)" "$(grep -q "$fp" "$site" && echo 1)"; fi
if [ -n "$ONLINE" ]; then
  live=$(curl -sS --max-time 60 -w '\n%{http_code} %{content_type} %{num_redirects}' "https://$host/.well-known/assetlinks.json" 2>/dev/null)
  meta_line=$(printf '%s\n' "$live" | tail -1)
  check "live https://$host/.well-known/assetlinks.json: 200, JSON, no redirect ($meta_line)" "$(printf '%s' "$meta_line" | grep -qE '^200 application/json[^ ]* 0$' && echo 1)"
  check "live assetlinks.json names this package and certificate" "$(printf '%s\n' "$live" | grep -q com.montgummery.greeblis && printf '%s\n' "$live" | grep -q "$fp" && echo 1)"
else note "the live site not fetched (--online checks https://$host/.well-known/assetlinks.json)"; fi
echo
[ "$fail" = 0 ] && echo "APK CHECK PASSED" || { echo "APK CHECK FAILED ($fail)"; exit 1; }
