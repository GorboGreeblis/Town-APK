#!/bin/sh
# Builds a diagnostic APK variant for a headset diagnosis or measurement only (RULES.md 22: never an A/B build of a
# change; same package and version as the release; install over it with `adb install -r`, and reinstall the release
# afterwards): one experiment from tools/experiment.py applied to a copy of the game file (tools/uncompressed.html),
# which is never changed. The APK's asset is put back and checked at the end.
#   tools/build_experiment.sh NAME        (python3 tools/experiment.py --list)
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); NAME=$1; [ -n "$NAME" ] || { echo "usage: $0 NAME   ($(python3 "$ROOT/tools/experiment.py" --list | tr '\n' ' '))"; exit 2; }
ASSET="$ROOT/tools/android/app/src/main/assets/index.html"; OUT="$ROOT/tools/.runs/GreeblisTown-exp-$NAME.apk"
trap 'python3 "$ROOT/tools/sync_game.py" >/dev/null' EXIT
python3 "$ROOT/tools/experiment.py" "$NAME" "$ROOT/tools/uncompressed.html" "$ASSET"
( cd "$ROOT/tools/android" && ./gradlew -q assembleRelease --offline 2>&1 | grep -v JAVA_TOOL_OPTIONS || ./gradlew -q assembleRelease 2>&1 | grep -v JAVA_TOOL_OPTIONS ) || true
cp "$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk" "$OUT"
python3 "$ROOT/tools/sync_game.py" >/dev/null; trap - EXIT
python3 "$ROOT/tools/sync_game.py" --check | tail -1
echo "experiment APK: $OUT"
