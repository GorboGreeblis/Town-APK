#!/bin/sh
# Checks an APK against the Meta Quest store packaging rules (VRC.Quest.Packaging.1-6)
# and confirms the bundled game is byte-identical to tools/android/app/src/main/assets/index.html.
#
#   tools/check_apk.sh [path/to/app.apk]
#
# Needs: ANDROID_HOME with build-tools/34.0.0 (aapt2, apksigner). Exit 1 on any FAIL.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
APK=${1:-$ROOT/GreeblisTown-release.apk}; [ -f "$APK" ] || APK=$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
# Fall back to the SDK the Gradle project uses (tools/android/local.properties).
[ -n "$SDK" ] || SDK=$(sed -n "s/^sdk.dir=//p" "$(dirname "$0")/android/local.properties" 2>/dev/null | head -1)
[ -n "$SDK" ] || SDK=$HOME/Android/Sdk
BT=$(ls -d "$SDK"/build-tools/3[4-9].* 2>/dev/null | tail -1)
[ -x "$BT/aapt2" ] || { echo "aapt2 not found under $SDK/build-tools (set ANDROID_HOME)"; exit 2; }
[ -f "$APK" ] || { echo "APK not found: $APK"; exit 2; }

fail=0
ok()   { printf '  PASS  %s\n' "$1"; }
bad()  { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }
note() { printf '  NOTE  %s\n' "$1"; }
check() { if [ "$2" = 1 ]; then ok "$1"; else bad "$1"; fi; }

BADGING=$("$BT/aapt2" dump badging "$APK" 2>/dev/null)
XMLTREE=$("$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK" 2>/dev/null)
echo "APK: $APK"
printf '%s\n' "$BADGING" | grep -o "package: name='[^']*' versionCode='[^']*' versionName='[^']*'"
echo
echo "VRC.Quest.Packaging.1 (manifest)"
pkg=$(printf '%s\n' "$BADGING" | sed -n "s/^package: name='\([^']*\)'.*/\1/p")
check "package name set ($pkg)" "$([ -n "$pkg" ] && echo 1 || echo 0)"
check "android.hardware.vr.headtracking required, version 1" "$(printf '%s\n' "$XMLTREE" | awk '/E: uses-feature/{f=0} /android.hardware.vr.headtracking/{f=1} f&&/android:required.*(0xffffffff|=true)/{r=1} f&&/android:version.*(=1$|0x1$)/{v=1} END{print (r&&v)?1:0}')"
check "installLocation auto" "$(printf '%s\n' "$BADGING" | grep -q "install-location:'auto'" && echo 1 || echo 0)"
check "not debuggable" "$(printf '%s\n' "$BADGING" | grep -q 'application-debuggable' && echo 0 || echo 1)"
label=$(printf '%s\n' "$BADGING" | sed -n "s/^application-label:'\([^']*\)'.*/\1/p" | head -1)
check "application label present ($label)" "$([ -n "$label" ] && echo 1 || echo 0)"
check "launcher activity excludeFromRecents=true" "$(printf '%s\n' "$XMLTREE" | awk '/E: activity/{f=0} /android:name.*LauncherActivity/{f=1} f&&/excludeFromRecents.*(0xffffffff|=true)/{x=1} END{print x?1:0}')"
check "MAIN + LAUNCHER + com.oculus.intent.category.VR" "$(printf '%s\n' "$XMLTREE" | grep -q 'com.oculus.intent.category.VR' && printf '%s\n' "$BADGING" | grep -q 'launchable-activity' && echo 1 || echo 0)"
check "com.oculus.supportedDevices meta-data" "$(printf '%s\n' "$XMLTREE" | grep -q 'com.oculus.supportedDevices' && echo 1 || echo 0)"
# The exact device list (the author's decision in 3.15.34: Quest 3, 3S and Pro; Quest 2 not supported).
check "supported devices are exactly questpro|quest3|quest3s" "$(printf '%s\n' "$XMLTREE" | grep -A2 'com.oculus.supportedDevices' | grep -q '"questpro|quest3|quest3s"' && echo 1 || echo 0)"
check "no other VR platform names in manifest" "$(printf '%s\n' "$XMLTREE" | grep -qi 'steamvr\|openvr\|pico\|vive\|daydream\|cardboard' && echo 0 || echo 1)"
echo
echo "VRC.Quest.Packaging.2 (signature)"
SIG=$("$BT/apksigner" verify --verbose "$APK" 2>&1 | grep -v JAVA_TOOL)
check "APK Signature Scheme v2 verified" "$(echo "$SIG" | grep -q 'Verified using v2 scheme (APK Signature Scheme v2): true' && echo 1 || echo 0)"
echo
echo "VRC.Quest.Packaging.3 (features)"
check "touchscreen not required" "$(printf '%s\n' "$BADGING" | grep -q "uses-feature-not-required: name='android.hardware.touchscreen'" && echo 1 || echo 0)"
check "no phone-only features (bluetooth, camera, telephony, gms)" "$(printf '%s\n' "$BADGING" | grep '^uses-feature:' | grep -qi 'bluetooth\|camera\|telephony\|nfc\|location' && echo 0 || echo 1)"
echo
echo "VRC.Quest.Packaging.4 (SDK levels, network security config)"
min=$(printf '%s\n' "$BADGING" | grep -oE "^(minS|s)dkVersion:'[0-9]*'" | tr -dc 0-9); tgt=$(printf '%s\n' "$BADGING" | grep -o "^targetSdkVersion:'[0-9]*'" | tr -dc 0-9)
check "minSdkVersion 29-34 (is $min)" "$([ "$min" -ge 29 ] && [ "$min" -le 34 ] && echo 1 || echo 0)"
check "targetSdkVersion 32-34 for immersive (is $tgt)" "$([ "$tgt" -ge 32 ] && [ "$tgt" -le 34 ] && echo 1 || echo 0)"
check "networkSecurityConfig declared" "$(printf '%s\n' "$XMLTREE" | grep -q 'networkSecurityConfig' && echo 1 || echo 0)"
echo
echo "VRC.Quest.Packaging.5 (size)"
size=$(wc -c < "$APK")
check "base.apk under 1 GB ($((size/1024)) KB)" "$([ "$size" -lt 1073741824 ] && echo 1 || echo 0)"
echo
echo "VRC.Quest.Packaging.6 (64-bit)"
if printf '%s\n' "$BADGING" | grep -q 'native-code'; then
  check "arm64-v8a present, armeabi-v7a absent" "$(printf '%s\n' "$BADGING" | grep native-code | grep -q "arm64-v8a" && ! printf '%s\n' "$BADGING" | grep native-code | grep -q "armeabi-v7a" && echo 1 || echo 0)"
else
  note "no native code at all (pure Java + bundled HTML, same as Meta's own PWA packages)"
fi
echo
echo "Runtime requirements"
check "android.permission.INTERNET declared (loopback server needs it)" "$(printf '%s\n' "$BADGING" | grep -q "uses-permission: name='android.permission.INTERNET'" && echo 1 || echo 0)"
echo
echo "Immersive launch wiring"
check "horizonos.pwa.APP_MODE = immersive" "$(printf '%s\n' "$XMLTREE" | awk '/horizonos.pwa.APP_MODE/{f=1} f&&/immersive/{x=1} END{print x?1:0}')"
check "DEFAULT_URL uses http://localhost (the browser rejects 127.0.0.1 as unverified)" "$(printf '%s\n' "$XMLTREE" | awk '/customtabs.trusted.DEFAULT_URL/{f=1} f&&/http:\/\/localhost/{x=1} END{print x?1:0}')"
echo
echo "Bundled game"
SRC="$ROOT/tools/android/app/src/main/assets/index.html"
if unzip -p "$APK" assets/index.html 2>/dev/null | cmp -s - "$SRC"; then ok "assets/index.html byte-identical to $SRC"; else bad "assets/index.html differs from $SRC"; fi
ROOTCOPY="$ROOT/index.html"
if [ -f "$ROOTCOPY" ] && unzip -p "$APK" assets/index.html 2>/dev/null | cmp -s - "$ROOTCOPY"; then ok "index.html at the repository root is the same game file"; else bad "index.html at the repository root is missing or differs from the APK's game (run tools/apply_entry_fix.py)"; fi
echo
if [ "$fail" = 0 ]; then echo "APK CHECK PASSED"; else echo "APK CHECK FAILED ($fail)"; fi
exit $([ "$fail" = 0 ] && echo 0 || echo 1)
