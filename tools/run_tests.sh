#!/bin/sh
# Greeblis Town test passes. Three tiers share the same scripts:
#
#   tools/run_tests.sh --smoke     spot check of every element, a few minutes
#   tools/run_tests.sh             standard pass (default), ~10-15 minutes
#   tools/run_tests.sh --full      FULL pass: every scenario, long soak times.
#                                  Run only on the final build (30+ minutes).
#   tools/run_tests.sh --quick     static checks only, no browser (seconds)
#
# Needs: python3, JDK 17+, node with playwright (browser tests), and
# ANDROID_HOME for the server harness and the APK checker.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ASSET="$ROOT/tools/android/app/src/main/assets/index.html"
APK="$ROOT/GreeblisTown-release.apk"; [ -f "$APK" ] || APK="$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk"
TIER=standard
case "$1" in --smoke) TIER=smoke;; --full) TIER=full;; --quick) TIER=quick;; esac

# Per-tier knobs: seconds of soak, NPC scenarios, world sampling window.
case $TIER in
  smoke)    PLAY_S=8;  NPC_S=25; NPC_N=4;  WORLD_S=15;;
  standard) PLAY_S=20; NPC_S=45; NPC_N=8;  WORLD_S=40;;
  full)     PLAY_S=120; NPC_S=60; NPC_N=0; WORLD_S=180;;   # NPC_N=0 means all scenarios
esac

SUMMARY=""; rc_all=0
run() { name=$1; shift; echo; echo "=== $name ==="; "$@"; rc=$?
  if [ $rc -eq 0 ]; then SUMMARY="$SUMMARY\n  PASS  $name"; else SUMMARY="$SUMMARY\n  FAIL  $name (exit $rc)"; rc_all=1; fi; }
skip() { SUMMARY="$SUMMARY\n  SKIP  $1 ($2)"; }

echo "Greeblis Town test pass: $TIER"
run "entry fix: asset == original + 4 edits" python3 -I "$ROOT/tools/apply_entry_fix.py" --verify
run "loopback server harness" "$ROOT/tools/test_server.sh"
run "dialogue spell-check" sh -c "python3 '$ROOT/tools/spellcheck_dialogue.py' '$ROOT/tools/uncompressed.html' >/dev/null"
if [ -f "$APK" ]; then run "APK store-rules check" "$ROOT/tools/check_apk.sh" "$APK"; else skip "APK store-rules check" "no APK built"; fi

if [ "$TIER" != quick ]; then
  run "VR entry wiring (early/late/no grant)" node "$ROOT/tools/test_entry.js" "$ASSET" all
  run "runtime play (2D loop + fake VR session), ${PLAY_S}s" node "$ROOT/tools/test_play.js" "$ASSET" all "$PLAY_S"
  run "world: routes, hulls, pickups, watchdog (${WORLD_S}s)" node "$ROOT/tools/test_world.js" "$ASSET" "$WORLD_S"
  run "input and locomotion (fake controllers)" node "$ROOT/tools/test_input.js" "$ASSET"
  if [ "$TIER" = full ]; then run "progression incl. gardening event (--long)" node "$ROOT/tools/test_progression.js" "$ASSET" --long;
  else run "progression (talk, battle, shop, library, pizza)" node "$ROOT/tools/test_progression.js" "$ASSET"; fi
  case $TIER in
    smoke)    run "visits (Mushroom host, interrupted while out)" node "$ROOT/tools/test_visits.js" "$ASSET" 120 host-drop-out;;
    standard) run "visits (Mushroom host complete + interrupted at meet)" node "$ROOT/tools/test_visits.js" "$ASSET" 240 host-complete,host-drop-meet;;
    full)     run "visits (all scenarios)" node "$ROOT/tools/test_visits.js" "$ASSET" 300 all;;
  esac
  case "$TIER" in
    smoke) ;;
    *)     run "courier: Nextessa reaches a player behind the Ancient and leaves (B11)" node "$ROOT/tools/test_courier.js" "$ASSET" left;;
  esac
  if [ "$NPC_N" = 0 ]; then run "NPC return-home (Mushroom), all scenarios" node "$ROOT/tools/test_npc_home.js" "$ASSET" drifter "$NPC_S";
  else run "NPC return-home (Mushroom), first $NPC_N scenarios" node "$ROOT/tools/test_npc_home.js" "$ASSET" drifter "$NPC_S" "$NPC_N"; fi
  if [ "$TIER" = full ]; then run "release parity (compressed build vs source)" node "$ROOT/tools/test_parity.js"; else skip "release parity" "$TIER tier; run --full"; fi
else
  skip "browser tests" "--quick"
fi

echo; echo "=== SUMMARY ($TIER) ==="; printf "$SUMMARY\n"
[ $rc_all -eq 0 ] && echo "ALL TESTS PASSED" || echo "SOME TESTS FAILED"
exit $rc_all
