#!/bin/sh
# Live headset log for one play session (macOS/Linux), for tools/perf_log.js (HEADSET_DIAG.md section 1): the headset
# runtime's VrApi lines (the frame rate, CPU and GPU use and free memory every second), from before the launch to the
# end, so nothing is lost to the headset's ring buffer. The shipped game writes no lines of its own (RULES.md 34).
#   tools/capture_log.sh [out.txt]   (Ctrl+C when done)
OUT=${1:-greeblis-run-$(date +%Y%m%d-%H%M%S).txt}
adb logcat -c
echo "Capturing to $OUT. Launch the game and play. Ctrl+C to stop."
adb logcat -v threadtime -s VrApi:I > "$OUT"
