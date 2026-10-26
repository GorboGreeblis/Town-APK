#!/bin/sh
# Greeblis Town APK: basic test suite. Runs every check in tools/ and prints a summary.
#
#   tools/run_tests.sh            # everything
#   tools/run_tests.sh --quick    # skip the slow headless-browser tests
#
# Needs: python3, JDK 17+, node with playwright (for browser tests), and
# ANDROID_HOME for the server harness and the APK checker.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
QUICK=0; [ "$1" = "--quick" ] && QUICK=1
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
SUMMARY=""
rc_all=0

run() { # run <name> <command...>
  name=$1; shift
  echo; echo "=== $name ==="
  "$@"; rc=$?
  if [ $rc -eq 0 ]; then SUMMARY="$SUMMARY\n  PASS  $name"; else SUMMARY="$SUMMARY\n  FAIL  $name (exit $rc)"; rc_all=1; fi
}
skip() { SUMMARY="$SUMMARY\n  SKIP  $1 ($2)"; }

run "entry fix: asset == original + 4 edits" python3 -I "$ROOT/tools/apply_entry_fix.py" --verify
run "loopback server harness"               "$ROOT/tools/test_server.sh"
if [ $QUICK -eq 0 ]; then
  run "VR entry (headless Chromium, all scenarios)" node "$ROOT/tools/test_entry.js" "$ROOT/android/app/src/main/assets/index.html" all
  run "release parity (compressed build unpacks to the source)" node "$ROOT/tools/test_parity.js"
  run "runtime play test (2D frame loop + polyfilled VR session)" node "$ROOT/tools/test_play.js" "$ROOT/android/app/src/main/assets/index.html" all 20
  run "NPC return-home reproduction (Mushroom)" node "$ROOT/tools/test_npc_home.js" "$ROOT/android/app/src/main/assets/index.html" drifter 45
else
  skip "VR entry (headless Chromium)" "--quick"; skip "release parity" "--quick"
  skip "runtime play test" "--quick"; skip "NPC return-home reproduction" "--quick"
fi
run "dialogue spell-check (informational unless it crashes)" sh -c "python3 '$ROOT/tools/spellcheck_dialogue.py' '$ROOT/tools/uncompressed.html' | tail -n +1 >/dev/null"
if [ -f "$APK" ]; then run "APK store-rules check" "$ROOT/tools/check_apk.sh" "$APK"; else skip "APK store-rules check" "no APK built"; fi

echo; echo "=== SUMMARY ==="; printf "$SUMMARY\n"
[ $rc_all -eq 0 ] && echo "ALL TESTS PASSED" || echo "SOME TESTS FAILED"
exit $rc_all
