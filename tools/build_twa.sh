#!/bin/sh
# Builds the Store APK (B133, 4.0.64): a Trusted Web Activity made by Meta's Bubblewrap CLI that opens the game hosted
# at https://greeblistown.ar.io/ in the Quest Browser, immersive (the Store refuses any other kind of web app APK: its
# start URL must be https and its manifest must carry Bubblewrap's twa_generator tag). The project is tools/twa: its
# twa-manifest.json is the source (package, host, version, signing key); Bubblewrap generates the Android project
# from it, builds it and signs it with the release key (tools/twa/keystore, never committed). The result is copied
# to the root as GreeblisTown-release.apk and checked (check_apk.sh, with --online the live site too).
#
#   tools/build_twa.sh [--version-name 4.0.64 --version-code 133] [--online]
#
# The game itself is not in the APK: it is the site (tools/build_site.py writes it; the author uploads it). A new APK
# is needed only for a new version number, host or launch setting, not for a change to the game (re-upload the site).
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); TWA=$ROOT/tools/twa; VN=""; VC=""; ONLINE=""
while [ $# -gt 0 ]; do case $1 in --version-name) VN=$2; shift;; --version-code) VC=$2; shift;; --online) ONLINE=--online;; *) echo "usage: $0 [--version-name X --version-code N] [--online]"; exit 2;; esac; shift; done
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$(sed -n 's/^sdk.dir=//p' "$ROOT/tools/twa/local.properties" 2>/dev/null | head -1)}}
JDK=$(dirname "$(dirname "$(readlink -f "$(command -v javac || command -v java)")")")
BW="npx --yes @meta-quest/bubblewrap-cli@1.24.1"
# Bubblewrap's own settings: this machine's JDK and SDK (it checks the SDK has tools/ or bin/: point tools/ at the
# command-line tools), so it never offers to download its own
mkdir -p "$HOME/.bubblewrap"; printf '{"jdkPath":"%s","androidSdkPath":"%s"}\n' "$JDK" "$SDK" > "$HOME/.bubblewrap/config.json"
[ -e "$SDK/tools" ] || [ -e "$SDK/bin" ] || ln -s "$SDK/cmdline-tools/latest" "$SDK/tools"
if [ -n "$VN$VC" ]; then
  python3 -I - "$TWA/twa-manifest.json" "$VN" "$VC" <<'PY'
import json, sys
p, vn, vc = sys.argv[1:4]; m = json.load(open(p))
if vn: m['appVersion'] = vn
if vc: m['appVersionCode'] = int(vc)
open(p, 'w').write(json.dumps(m, indent=2) + '\n'); print('twa-manifest:', m['appVersion'], m['appVersionCode'])
PY
fi
cd "$TWA"
echo "== Bubblewrap: generate the project from twa-manifest.json"
$BW update --skipVersionUpgrade | tail -2
# Meta's packaging guide: replace jcenter() (gone) with mavenCentral(); the target SDK stays 32 (Bubblewrap's Quest default)
sed -i 's/jcenter()/mavenCentral()/' build.gradle
echo "== Bubblewrap: build and sign"
P=$ROOT/tools/twa/keystore.properties
[ -f "$P" ] || { echo "the release keystore's properties are missing ($P): the APK must be signed with the release key"; exit 1; }
export BUBBLEWRAP_KEYSTORE_PASSWORD="$(sed -n 's/^storePassword=//p' "$P")" BUBBLEWRAP_KEY_PASSWORD="$(sed -n 's/^keyPassword=//p' "$P")"
LOG=$ROOT/tools/.runs/bubblewrap_build.log; n=0
# Maven Central answers 429 (too many requests) now and then: a few tries, waiting longer each time
until $BW build --skipPwaValidation > "$LOG" 2>&1; do
  n=$((n + 1)); grep -qE 'status code 429|Connection reset|timed out' "$LOG" && [ $n -lt 4 ] || { grep -v JAVA_TOOL_OPTIONS "$LOG" | tail -20; echo "BUILD FAILED: Bubblewrap ($LOG)"; exit 1; }
  echo "  a download was refused or cut off; again in $((20 * n)) s"; sleep $((20 * n))
done
cp app-release-signed.apk "$ROOT/GreeblisTown-release.apk"
echo "built $ROOT/GreeblisTown-release.apk"
"$ROOT/tools/check_apk.sh" "$ROOT/GreeblisTown-release.apk" $ONLINE | tail -3
