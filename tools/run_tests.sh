#!/bin/sh
# Greeblis Town test passes. Three tiers share the same scripts:
#
#   tools/run_tests.sh --smoke     spot check of every element, a few minutes
#   tools/run_tests.sh             standard pass (default), about an hour on a 4-core machine
#   tools/run_tests.sh --full      FULL pass: every scenario, long soak times.
#                                  Run only on the final build (30+ minutes).
#   tools/run_tests.sh --quick     static checks only, no browser (seconds)
#   ... --only=REGEX               (with any tier) run only the stages whose name matches (case-insensitive), with
#                                  that tier's settings, e.g. to re-run one failed stage as the tier runs it
#   ... --resume                   (with any tier) skip the stages that already passed on this same asset, APK,
#                                  harness and test script in an earlier run of the tier (tools/.runs/resume_<tier>.txt), e.g. after a
#                                  machine restart cut a pass short; failed and new stages run again
#
# Needs: python3, JDK 17+, node with playwright (browser tests), and
# ANDROID_HOME for the server harness and the APK checker.
# The whole pass lives in one function (called at the very end), so the shell reads this file completely before
# running anything: editing it while a pass runs can no longer change or garble the running pass.
main() {
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/tools/.runs"   # tools write their outputs here, whichever folder the pass is started from
# GT_ASSET overrides the asset the browser tests load (e.g. an experiment build; with GT_MULTIVIEW=1 the
# fake headset runs the multiview experiment without MSAA). The verify and APK stages always check the release.
ASSET="${GT_ASSET:-$ROOT/tools/android/app/src/main/assets/index.html}"
# Multiview is the headset's path since 3.15.34: the fake headset runs it (without MSAA) unless GT_MULTIVIEW=0.
GT_MULTIVIEW=${GT_MULTIVIEW-1}; [ "$GT_MULTIVIEW" = 0 ] && GT_MULTIVIEW=""; export GT_MULTIVIEW
APK="$ROOT/GreeblisTown-release.apk"; [ -f "$APK" ] || APK="$ROOT/tools/android/app/build/outputs/apk/release/app-release.apk"
TIER=standard; RESUME=""
ONLY=""
for a in "$@"; do case "$a" in --smoke) TIER=smoke;; --full) TIER=full;; --quick) TIER=quick;; --resume) RESUME=1;; --only=*) ONLY=${a#--only=};; esac; done
# The SDK for the server harness and the APK checker: ANDROID_HOME, else the one the Gradle build uses.
if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ -f "$ROOT/tools/android/local.properties" ]; then
  ANDROID_HOME=$(sed -n 's/^sdk\.dir=//p' "$ROOT/tools/android/local.properties"); export ANDROID_HOME; fi
# --resume: a stage counts as passed earlier only for the same files: the asset, the APK, the shared harness and fake
# headset, and every file its own command names (its test script); editing one test re-runs only that stage
STATE="$ROOT/tools/.runs/resume_$TIER.txt"
BASE=$( { cat "$ASSET"; [ -f "$APK" ] && cat "$APK"; cat "$ROOT"/tools/lib/*.js "$ROOT/tools/fakexr.js"; } 2>/dev/null | sha256sum | cut -c1-16)
key() { { echo "$BASE"; for f in "$@"; do [ -f "$f" ] && cat "$f"; done; } | sha256sum | cut -c1-16; }
[ -n "$RESUME" ] && { n=$(wc -l < "$STATE" 2>/dev/null); echo "resuming: ${n:-0} stage results kept in $STATE"; }

# Per-tier knobs: seconds of soak, NPC scenarios, world sampling window.
case $TIER in
  smoke)    PLAY_S=8;  NPC_S=25; NPC_N=4;  WORLD_S=15;;
  standard) PLAY_S=20; NPC_S=45; NPC_N=8;  WORLD_S=40;;
  full)     PLAY_S=120; NPC_S=60; NPC_N=0; WORLD_S=180;;   # NPC_N=0 means all scenarios
esac

SUMMARY=""; rc_all=0
done_before() { [ -n "$RESUME" ] && grep -qxF "$KEY	$1" "$STATE" 2>/dev/null; }   # needs KEY (set by run/report)
# --only: a stage whose name does not match is left out (not listed)
wanted() { [ -z "$ONLY" ] || printf '%s' "$1" | grep -qiE -- "$ONLY"; }
run() { name=$1; shift; wanted "$name" || return 0; KEY=$(key "$@")
  if done_before "$name"; then SUMMARY="$SUMMARY\n  PASS  $name (earlier run)"; return; fi
  echo; echo "=== $name ==="; t0=$(date +%s); "$@"; rc=$?; dt="$(( $(date +%s) - t0 )) s"
  if [ $rc -eq 0 ]; then SUMMARY="$SUMMARY\n  PASS  $name ($dt)"; printf '%s\t%s\n' "$KEY" "$name" >> "$STATE"; else SUMMARY="$SUMMARY\n  FAIL  $name (exit $rc, $dt)"; rc_all=1; fi; }
skip() { wanted "$1" || return 0; SUMMARY="$SUMMARY\n  SKIP  $1 ($2)"; }
# Report stages run a probe and keep its output in the log; they never fail the pass.
report() { name=$1; shift; wanted "report: $name" || return 0; KEY=$(key "$@")
  if done_before "report: $name"; then SUMMARY="$SUMMARY\n  INFO  $name (earlier run, see its log)"; return; fi
  echo; echo "=== report: $name ==="; "$@"; rc=$?
  if [ $rc -eq 0 ]; then SUMMARY="$SUMMARY\n  INFO  $name (see log)"; printf '%s\t%s\n' "$KEY" "report: $name" >> "$STATE"; else SUMMARY="$SUMMARY\n  INFO  $name (probe exit $rc)"; fi; }

echo "Greeblis Town test pass: $TIER${ONLY:+ (only stages matching /$ONLY/)}"; T_ALL=$(date +%s)
run "the shipped copies (index.html, the APK asset) are the game file tools/uncompressed.html (sync_game.py --check)" python3 -I "$ROOT/tools/sync_game.py" --check
run "loopback server harness" "$ROOT/tools/test_server.sh"
run "docs consistency (check_docs.py)" python3 -I "$ROOT/tools/check_docs.py"
run "dialogue spell-check" sh -c "python3 '$ROOT/tools/spellcheck_dialogue.py' '$ROOT/tools/uncompressed.html' >/dev/null"
run "tentacle bend is bit-identical to the original (P13)" node "$ROOT/tools/test_bend_exact.js" "$ASSET"
if [ -f "$APK" ]; then run "APK store-rules check" "$ROOT/tools/check_apk.sh" "$APK"; else skip "APK store-rules check" "no APK built"; fi

if [ "$TIER" != quick ]; then
  run "VR entry wiring (early/late/no grant)" node "$ROOT/tools/test_entry.js" "$ASSET" all
  run "runtime play (2D loop + fake VR session), ${PLAY_S}s" node "$ROOT/tools/test_play.js" "$ASSET" all "$PLAY_S"
  run "multiview: each eye matches the classic path, half the draw calls; no frame hazard or compile during play" node "$ROOT/tools/multiview_check.js" "$ASSET"
  run "uniform budget: every shader fits a Quest 3S's GPU limits (multiview and classic)" node "$ROOT/tools/uniform_budget.js" "$ASSET"
  run "warm-up coverage: every lit material has its shaders for every light state the game can reach (P19 frame check)" node "$ROOT/tools/warm_coverage.js" "$ASSET"
  run "texture census: no texture is made during play (emotes, faces, bubbles, pizza: the flash causes, F-B29/F-B30)" node "$ROOT/tools/texture_census.js" "$ASSET"
  run "quality governor: levels change foveation only, never the layer (F-B31); the Event locks the lowest level" env GT_DEVICE=quest3s node "$ROOT/tools/test_governor.js" "$ASSET"
  run "game content: gifts, talk order, shyness, bribe, outfits, battles, the Ancient, the robin, Event lines, Backpacka" node "$ROOT/tools/test_content.js" "$ASSET"
  run "greeting: walking townsfolk stop and face the player within 3.2 m for 12 s; Sparkakus greets from 6 m" node "$ROOT/tools/test_greet.js" "$ASSET"
  run "wrist HUD and haptics: what is held is shown and redrawn; Blossoms and new friends pulse the controllers" node "$ROOT/tools/test_hud.js" "$ASSET"
  run "roamers and townsfolk: never in a foreign building, a solid zone or the Garden, never outside the park, roamers keep moving" node "$ROOT/tools/test_roam.js" "$ASSET" $([ "$TIER" = full ] && echo --long)
  run "Mama Gorbo and Gooward's meetings: schedule, spots, goo arcs and hearts, called off by the Event" node "$ROOT/tools/test_meet.js" "$ASSET"
  run "jazz drums: on the beat on both clocks, on time for the drummer, look-ahead, silent far away and under the horn" node "$ROOT/tools/test_jazz.js" "$ASSET"
  run "audio: one context, nothing left playing after rounds of every sound, resumes on focus" node "$ROOT/tools/test_audio.js" "$ASSET"
  run "far detail and the batcher: one model at a time, swaps at 62/66 m; exact matrices in every batch, every frame" node "$ROOT/tools/test_lod.js" "$ASSET"
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
  if [ "$TIER" = full ]; then
    # Graphical and performance pass (T12/T13): z-fighting (planar and curved) fails the pass;
    # the probes report loading time, the handover, frame cost and texture sharpness for the record.
    run "z-fighting / flicker on environmental surfaces (jittered render)" node "$ROOT/tools/test_zfight.js" "$ASSET"
    run "z-fighting on curved surfaces (near-coincident geometry)" node "$ROOT/tools/test_coincident.js" "$ASSET"
    run "single-sided pass is pixel-identical (edges aside)" node "$ROOT/tools/sides_check.js" "$ASSET"
    run "optimisations render identical pixels (batcher, P8, P12) and save draws" node "$ROOT/tools/opt_identity.js" "$ASSET"
    run "the Ancient never shows from outside the church, so P21 may leave it out (2 m grid to 30 m)" node "$ROOT/tools/ancient_check.js" "$ASSET"
    run "performance report (script cost, shader compiles, scene load per situation)" node "$ROOT/tools/perf_report.js" "$ASSET"
    report "loading time (boot profile)" node "$ROOT/tools/boot_profile.js" "$ASSET"
    report "handover profile (frames after entering VR)" node "$ROOT/tools/entry_profile.js" "$ASSET"
    # Frame timings are only meaningful without the layers path (its MSAA resolve is software-rendered here),
    # so the hitch probe runs on the no-layers variant of the same asset.
    python3 -I "$ROOT/tools/experiment.py" nolayers "$ROOT/tools/uncompressed.html" "$ROOT/tools/.runs/hitch_nolayers.html" >/dev/null 2>&1 \
      && report "in-game hitches (pickups, dialogue, Event; no-layers variant)" node "$ROOT/tools/hitch_probe.js" "$ROOT/tools/.runs/hitch_nolayers.html" \
      || report "in-game hitches (pickups, dialogue, Event)" node "$ROOT/tools/hitch_probe.js" "$ASSET"
    report "scene cost (draw calls, triangles, materials)" node "$ROOT/tools/perf_probe.js" "$ASSET"
    report "Garden Event frame cost (90 s)" node "$ROOT/tools/event_probe.js" "$ASSET" 90
    report "render sharpness (scale, foveation, texture filtering)" node "$ROOT/tools/sharpness_probe.js" "$ASSET"
  else skip "graphical and performance pass (z-fight, profiles, sharpness)" "$TIER tier; run --full"; fi
else
  skip "browser tests" "--quick"
fi

echo; echo "=== SUMMARY ($TIER, $(( ($(date +%s) - T_ALL) / 60 )) min) ==="; printf "$SUMMARY\n"
[ $rc_all -eq 0 ] && echo "ALL TESTS PASSED" || echo "SOME TESTS FAILED"
exit $rc_all
}
main "$@"
