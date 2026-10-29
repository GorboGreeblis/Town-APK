# Headset diagnostics

How to capture and read a headset run with `adb` (all commands run on the PC with the headset on USB and developer
mode on): a live log of a whole session (section 1, start here), the flash mark, the frame-rate and runtime lines,
and the launch investigation of B9 (sections 2-4, kept for the record; B9 was fixed in 3.15.4-3.15.7).

## 1. A live log of one session (start here)

Capture the log live, from before the launch to the end of the run (`tools\capture_log.ps1` on Windows,
`tools/capture_log.sh` elsewhere, do exactly what the commands below do and save UTF-8), and let the reader summarise it. **When you see a
flash, press B on the right controller** (a short buzz confirms): the log gets "MARK flash seen" with the frame number,
and `perf_log.js` lists every mark with what the log shows in the 3 s before it (long frames over 28 ms, uploads,
shader compiles, GPU work inside a frame). By hand:

```
adb logcat -c
adb logcat -v threadtime -s GreeblisServer VrApi > run.txt     # leave running while you play; Ctrl+C after
node tools/perf_log.js run.txt
```

Do not rely on `adb logcat -d` after a long session: it dumps the headset's ring buffer, which a session of ten minutes
overruns (the author's 3.15.46 log kept only its last 30 seconds, and none of the game's `perf` lines). `VrApi` adds the
headset runtime's own line, once a second (`FPS=66/72,...,Stale=8`), which `perf_log.js` also reads.

It prints the frame rate by scene (town, the Event), the five lowest readings
with where the player stood, the governor levels seen, and a verdict against
the 72 fps target (the author's aim) and the Store's 60 fps floor, with the likely cause for each low reading (triangles or draw calls, whichever the readings follow); from the
runtime's `VrApi` lines, the seconds under the refresh rate per scene with GPU and CPU use and a verdict: CPU-bound
when the app's GPU time is under 80% of the frame budget, GPU-bound otherwise; then the flash marks, the long frames
(over 28 ms, at most two a second), and compiles and uploads during play.

## 2. Unfiltered log of one launch (launch problems only)

History (B9): the Quest Browser's immersive activity closed itself when our launcher handed it
`http://127.0.0.1:17777/`, and the browser's reason was not in the filtered logs; sections 2-4 pinned it down.

```sh
adb logcat -c
adb logcat -v threadtime > launch.txt      # leave running
# put the headset on, launch Greeblis Town from Unknown Sources, wait 15 s
# then Ctrl-C in the terminal
```

Send `launch.txt`. The earlier captures had no lines from our own process
and none from the browser's `cr_*` tags; the unfiltered log has both. Lines
to look for: `GreeblisServer`, `GreeblisLauncher`, `TwaLauncher`,
`cr_` (browser), `WebXRCustomTabActivity`.

## 3. Serve the game from the PC on the headset's loopback (no rebuilds)

This makes `http://127.0.0.1:17777/` on the headset come from a folder on
the PC, so launch variations can be tried without touching the APK.

```sh
cd <repo>/tools/android/app/src/main/assets
python3 -m http.server 8000           # leave running
adb reverse tcp:17777 tcp:8000        # headset:17777 -> PC:8000
```

Then try the immersive activity directly (no TWA session, plain intent):

```sh
adb shell am start -n com.oculus.browser/.WebXRCustomTabActivity -d http://127.0.0.1:17777/
```

Three outcomes tell us three different things:
- the game appears in VR: the activity accepts a plain http loopback page
  when launched this way, and the problem is in how the launcher launches it;
- it closes immediately: the activity rejects the origin or the scheme;
- an error dialog or a 2D window: note what it says.

Repeat with a known-good hosted WebXR page purely as a control (this is a
test, not a shipping plan):

```sh
adb shell am start -n com.oculus.browser/.WebXRCustomTabActivity -d https://immersive-web.github.io/webxr-samples/immersive-vr-session.html
```

If the control works and the loopback does not, the scheme/origin is the
rule. If neither works, the activity needs the Custom Tabs session that
only the launcher creates, and the log from section 2 is the key.

## What the logs have shown so far

| Build | Browser line | Meaning | Fix |
|---|---|---|---|
| 3.15.2/3.15.3 | `cr_OriginVerifier: Verification failed for http://127.0.0.1:17777 as not https or localhost` | numeric loopback is not a trusted origin | 3.15.4 addresses the game as `http://localhost:17777/` |
| 3.15.6 diag | `GreeblisServer: page: m=requestSession called ... activation=false` then `presentRequested`, `enterVR`, `requestSession OK`, frames | a page-initiated request is accepted without activation; the wait for `sessiongranted` was the bug | 3.15.7: request at page start + sliced boot + in-VR loading screen |
| 3.15.6 | `TWA verification was successful!`, page loads, ready sound, then `setListeningForSessionGranted(true), navSession.isNull? true` / `no navigation - no activation. Status -1`; OS gives up after 15 s without frames | the browser grants a session only with a navigation descriptor it never creates for a fresh immersive launch (NOTES 33) | variant `directrequest` was tested (since dropped from `experiment.py`); fixed in 3.15.7 by the page-start request (row above) |
| 3.15.4 | `digital_asset_links_handler.cc: Digital Asset Links endpoint responded with code 404` then `TWA verification was unsuccessful! Exiting the activity.` | the browser fetched `/.well-known/assetlinks.json` from the game's origin and the server had nothing there | 3.15.5 serves the asset-links statement (package name + the APK's own signing-certificate fingerprint) |

Lines to grep for in the next capture: `cr_WebXRCustomTabActivity`, `cr_OriginVerifier`, `digital_asset_links`, `cr_WebAppLaunchHandler`. A good launch should show no `TWA verification was unsuccessful` and the game's own `sessiongranted` path should take over.

## 4. Pull the browser package for offline analysis (optional)

```sh
adb shell pm path com.oculus.browser
adb pull <path printed above> oculus-browser.apk
```

`oculus-browser.apk` can be decompiled to read exactly what
`WebXRCustomTabActivity` checks before closing. It is large (hundreds of MB).

## Page diagnostics (3.15.12+)

The page posts its events to the loopback server, which logs them with tag
`GreeblisServer` as `page: m=<ms since page start> <text>`:
`session parked, features=...`, `loader failed: ...`, `entry failed (n): ...`,
`session ended (before|after handover)`, `requestSession rejected: ...`, and
every error the game's own handler sees (`[xr-enter] ...`, `[boot] ...`).
Capture with `adb logcat -s GreeblisServer GreeblisLauncher cr_VrShellDelegate cr_XRActivity`.
A launch that exits shows `exitWebVRPresent` in `cr_VrShellDelegate` right
after the page's last `page:` line, which names the cause.

## What to read at boot and handover

Since 3.15.43 (F-B31) the handover line is `projection layer live, scale 1, msaa 4, multiview true` and there are no
`swapped to scale` lines: the governor changes foveation only.

- `boot slices ms: ...`: the total from `start` to `textures` is the loading time.
  3.15.14 measured 8.2 s; the march change (NOTES 49) and the build-time probe
  points (the `textures` slice, 792 ms before) should bring it near 6 s. The five
  heavy `townsfolk` entries were 573/493/585/488 ms; expect roughly half.
- `entry failed`, `loader ... failed`, `[xr-enter]`, `[boot]`: must be absent.

## Frame-rate lines (3.15.27)

While presenting, the game posts one line every ten seconds:

```
page: m=perf fps=71.8 level=2 calls=118 tris=201240 at=-36,-20
page: m=perf fps=41.2 level=4 calls=131 tris=266812 event at=2,-3
```

`fps` is 1000 over the governor's frame-time average, `level` the governor's
quality level (since 3.15.43 every level is at native scale: 0-2 without, 3-4 with fixed foveation; until then 0-1 were supersampled),
`calls` and `tris` the last frame's draw calls and triangles (both eyes),
`event` while the planting Event runs, `at` the player's x,z. Read it with
`adb logcat -s GreeblisServer | grep perf`. A run through the town, a kiosk, a
dialogue and the Event gives the frame-rate picture the OVR Metrics Tool would,
with the scene named.

Capture and read it as in section 1.

## Multiview lines (an experiment until 3.15.34, the release path since)

```
page: m=... multiview planned (webgl2 true, layers true, OVR_multiview2 true, antialias true, OCULUS_multiview true)
page: m=... projection layer live, scale 1, msaa 4, multiview true
page: m=... multiview live: 1680x1760 per eye, msaa 4
```

`multiview not used (...)` lists which condition failed; `multiview framebuffer
incomplete (...)` means it fell back to the classic path at entry.

```
page: m=... gpu: Adreno (TM) 740; vertex_uniform_vectors=256 fragment_uniform_vectors=... ; device Quest 3S
page: m=... perf fps=71.8 level=2 calls=118 tris=201240 at=-36,-20 dev=Quest_3S
```

The `gpu:` line (3.15.34) gives the headset's real GPU limits: the test tools
assume Quest values (`tools/fakexr.js` S.DEVICES); if a limit differs, update
the profile and rerun `tools/uniform_budget.js`. `multiview: ... while a frame
draws` lines mean a frame hazard (the flash cause, NOTES 67): send the log.

Since 3.15.48 (D2): `MARK flash seen` (B on the right controller), `long frame N ms`, and a shader compiled during
play names the key fields that differ from the closest program of its kind. Since 3.15.49 (F-B36): `mipmaps on: N
textures re-uploaded between frames` about 3 s after entering VR. Send the log if a compile line appears.

Since 3.15.57 (D3, the author: "let's try to make the logs more verbose"):
- `geometry warm-up (STEP): A > B geometries on the GPU` while loading (four steps) and at `vr entry`: every geometry
  is uploaded before the first headset frame (F-B48).
- `frame N: K geometry buffer(s) made inside the XR frame`: something drawn for the first time inside a frame (a
  flash cause); there should be none. Send the log if one appears.
- `ev WHAT OLD > NEW (frame N)`: the event trail, sampled 12 times a second: Blossoms, Flint, Artifacts, the Cave
  (`cave`), a vignette playing, the Event, the screen (`playing`, `dialogue`, `panel`), the courier's state and the Gem
  (`gem`).
- `xr visibility visible | visible-blurred | hidden`: the session's focus (the system menu, the headset taken off).
- After `MARK flash seen`, the flight recorder's last 10 s: `rec ... slow:` (frames over 20 ms, with their time before
  the mark), `rec changes:` (programs, textures, geometries and draw calls changing, the head inside a character),
  `rec events:` (focus changes in the last minute).
`node tools/perf_log.js run.txt` reads them all: the recorder under each mark, geometry uploads, focus changes, the
stretches when another process (the system shell) drew instead of the game, and `--trail` prints the event trail.
