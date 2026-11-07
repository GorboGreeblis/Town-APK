# Headset diagnostics

How to capture and read a headset run with `adb` (all commands run on the PC with the headset on USB and developer
mode on). Since 4.0.64 (B133) the Store APK is Meta's Bubblewrap web app that opens the game hosted at
https://greeblistown.ar.io/, and the game shipped there is the final build, which writes no log lines of its own
(RULES.md 34). What a headset log holds now is the headset runtime's: the frame rate every second, the launch and the
browser's checks. (Until 4.0.63 the APK carried the game and a small server that also passed the debug build's own
lines, `GreeblisServer`, to the log; that APK is gone, and what those lines showed is recorded in FIXES.md, NOTES.md
and PERF.md. `perf_log.js` still reads such old logs.)

## 1. A live log of one session (start here)

Capture the log live, from before the launch to the end of the run (`tools\capture_log.ps1` on Windows,
`tools/capture_log.sh` elsewhere), then let the reader summarise it. By hand:

```
adb logcat -c
adb logcat -v threadtime -s VrApi > run.txt     # leave running while you play; Ctrl+C after
node tools/perf_log.js run.txt
```

Do not rely on `adb logcat -d` after a long session: it dumps the headset's ring buffer, which a session of ten minutes
overruns (the author's 3.15.46 log kept only its last 30 seconds). The runtime's `VrApi` line comes once a second
(`FPS=66/72,...,Stale=8`, with CPU and GPU use and free memory, `Free=`): `perf_log.js` prints the seconds under the
refresh rate, with GPU and CPU use and a verdict (CPU-bound when the app's GPU time is under 80% of the frame budget,
GPU-bound otherwise), and `fps_estimate.js` turns such a log into a frame-rate estimate for Quest 3 and Quest 3S (pass
`--device q3s` or `q3`: the log cannot tell the headsets apart; with no game lines it reads the game's process from its
first line to its last, leaves out the seconds the system menu drew, and cannot tell the Event from the town).
For the Store's frame-rate check (VRC.Quest.Performance.1), Meta's OVR Metrics Tool overlay shows the same frame rate
in the headset (RELEASE.md section 3).

## 2. The launch

```
adb logcat -c
adb logcat -v threadtime -s TwaLauncher TWALauncherActivity cr_OriginVerifier > launch.txt   # then launch; Ctrl+C after
```

The app must go straight into VR with no browser bar. A browser bar, or a `Verification failed` line, means the Quest
Browser could not match the site to the APK through Digital Asset Links: `tools/check_apk.sh --online` checks the
site's `/.well-known/assetlinks.json` (served with status 200, as JSON, with no redirect, naming the package and the
signing certificate) against the APK. Without the internet the page cannot load: the browser shows its own offline
page.

## 3. The page itself (errors, the console)

The hosted page can be inspected while it runs on the headset: with the headset on USB, open `chrome://inspect` in
Chrome on the PC, find the Quest Browser's page for greeblistown.ar.io and choose Inspect: the console shows the page's
errors. The game file with its debug code (`tools/uncompressed.html`, `GT_DEBUG`) logs more there when served from a
test site, but the shipped final build has none of it.

## 4. Confirming the headset-off run (B96: memory after the headset sleeps)

B96 (found on 4.0.32): after the headset slept 35 s the headset ran out of memory within seconds of the return and the
game froze head-locked; fixed in 4.0.34 and confirmed then on the headset. To check a build again: start the live
capture, launch, play 1 minute, take the headset off for 35 s or more, put it back on and play 2 minutes. What to look
for: the game drawing and answering after the return (no head-locked picture), and `Free=` in the `VrApi` lines about
where it was before (on 4.0.32 it fell from 2992 MB to 264 MB within 10 s of the return).

## 5. Confirming the pause: the system menu and the headset off (B115, B118, B121)

The browser gives no headset-worn signal, so since 4.0.61 the game resumes after input comes back only once the
headset itself has moved (more than 1.5 mm or 0.25 degrees). Open and close the system menu a few times (the first
time too): the game and its music stop each time and carry on (not start again) after. Take the headset off for 30 s
or more, pick a controller up and press its trigger while the headset lies still: the game must stay paused; put the
headset back on: it resumes. The Horn song must not play over itself after a pause (B124). Note anything that does not
come back cleanly in BUGS.md.
