#!/bin/sh
# Compiles the APK's GameServer against android.jar (with a desktop stub for
# android.util.Log) and runs the Harness against the bundled game.
#
#   tools/test_server.sh            # run the checks
#   tools/test_server.sh --serve    # keep serving at http://127.0.0.1:17777/
#
# Needs: JDK 17+, ANDROID_HOME pointing at an SDK with platforms/android-34.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
# Fall back to the SDK the Gradle project uses (tools/android/local.properties).
[ -n "$SDK" ] || SDK=$(sed -n "s/^sdk.dir=//p" "$(dirname "$0")/android/local.properties" 2>/dev/null | head -1)
[ -n "$SDK" ] || SDK=$HOME/Android/Sdk
AJAR=$(ls "$SDK"/platforms/android-3[4-9]/android.jar 2>/dev/null | tail -1)
[ -f "$AJAR" ] || { echo "android.jar not found under $SDK/platforms (set ANDROID_HOME)"; exit 2; }
OUT=${TMPDIR:-/tmp}/greeblis-server-harness
rm -rf "$OUT" && mkdir -p "$OUT"
javac -nowarn -d "$OUT" -cp "$AJAR" \
  "$ROOT/tools/android/app/src/main/java/com/montgummery/greeblis/GameServer.java" \
  "$ROOT/tools/server_harness/android/util/Log.java" \
  "$ROOT/tools/server_harness/com/montgummery/greeblis/Harness.java"
exec java -cp "$OUT:$AJAR" com.montgummery.greeblis.Harness \
  "$ROOT/tools/android/app/src/main/assets/index.html" "${1:---check}"
