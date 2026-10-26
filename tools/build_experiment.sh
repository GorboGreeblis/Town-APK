#!/bin/sh
# Builds a diagnostic APK variant for headset A/B tests (same package and version
# as the release; install over it with `adb install -r`, and reinstall the release
# afterwards). The release asset is restored and verified at the end.
#   tools/build_experiment.sh native|nolayers|nobatch|noeffects|nogovernor
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); NAME=$1; [ -n "$NAME" ] || { echo "usage: $0 native|nolayers|nobatch|noeffects|nogovernor"; exit 2; }
ASSET="$ROOT/tools/android/app/src/main/assets/index.html"; OUT="$ROOT/tools/.runs/GreeblisTown-exp-$NAME.apk"
cp "$ASSET" "$ASSET.release"
trap 'mv "$ASSET.release" "$ASSET"' EXIT
python3 "$ROOT/tools/apply_entry_fix.py" --experiment "$NAME" "$ROOT/tools/uncompressed.html" "$ASSET"
( cd "$ROOT/tools/android" && ./gradlew -q assembleRelease --offline 2>&1 | grep -v JAVA_TOOL_OPTIONS || ./gradlew -q assembleRelease 2>&1 | grep -v JAVA_TOOL_OPTIONS ) || true
cp "$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk" "$OUT"
mv "$ASSET.release" "$ASSET"; trap - EXIT
python3 "$ROOT/tools/apply_entry_fix.py" --verify
echo "experiment APK: $OUT"
