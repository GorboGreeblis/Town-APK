#!/bin/sh
# Live headset log for one play session (macOS/Linux), for tools/perf_log.js (HEADSET_DIAG.md): the game's lines
# (GreeblisServer) and the headset runtime's (VrApi), from before the launch to the end. Press B on the right
# controller whenever you see a flash.   tools/capture_log.sh [out.txt]   (Ctrl+C when done)
OUT=${1:-greeblis-run-$(date +%Y%m%d-%H%M%S).txt}
adb logcat -c
echo "Capturing to $OUT. Launch the game and play; press B on the right controller when you see a flash. Ctrl+C to stop."
adb logcat -v threadtime -s GreeblisServer:I VrApi:I > "$OUT"
