# Headset diagnostics for the immersive launch (bug B9)

The Quest Browser's immersive activity closes itself when our launcher hands
it `http://127.0.0.1:17777/`. The browser's reason is not in the captured
logs, so these experiments pin it down. All commands run on the PC with the
headset on USB and developer mode on.

## 1. Unfiltered log of one launch (most useful)

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

## 2. Serve the game from the PC on the headset's loopback (no rebuilds)

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
only the launcher creates, and the log from step 1 is the key.

## What the logs have shown so far

| Build | Browser line | Meaning | Fix |
|---|---|---|---|
| 3.15.2/3.15.3 | `cr_OriginVerifier: Verification failed for http://127.0.0.1:17777 as not https or localhost` | numeric loopback is not a trusted origin | 3.15.4 addresses the game as `http://localhost:17777/` |
| 3.15.6 diag | `GreeblisServer: page: m=requestSession called ... activation=false` then `presentRequested`, `enterVR`, `requestSession OK`, frames | a page-initiated request is accepted without activation; the wait for `sessiongranted` was the bug | 3.15.7: request at page start + sliced boot + in-VR loading screen |
| 3.15.6 | `TWA verification was successful!`, page loads, ready sound, then `setListeningForSessionGranted(true), navSession.isNull? true` / `no navigation - no activation. Status -1`; OS gives up after 15 s without frames | the browser grants a session only with a navigation descriptor it never creates for a fresh immersive launch (NOTES 33) | variant `directrequest` under test |
| 3.15.4 | `digital_asset_links_handler.cc: Digital Asset Links endpoint responded with code 404` then `TWA verification was unsuccessful! Exiting the activity.` | the browser fetched `/.well-known/assetlinks.json` from the game's origin and the server had nothing there | 3.15.5 serves the asset-links statement (package name + the APK's own signing-certificate fingerprint) |

Lines to grep for in the next capture: `cr_WebXRCustomTabActivity`, `cr_OriginVerifier`, `digital_asset_links`, `cr_WebAppLaunchHandler`. A good launch should show no `TWA verification was unsuccessful` and the game's own `sessiongranted` path should take over.

## 3. Pull the browser package for offline analysis (optional)

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

## Layers experiment (B13)

`tools/.runs/GreeblisTown-exp-layers.apk` (same package/version as the release;
`adb install -r`, and reinstall the release afterwards). Expected `page:` lines:
`session parked, features=...,layers`, then at the handover `projection layer
live, scale <q>, msaa 4`. Trouble lines: `loader layers failed`, `loader
projection layer failed`, `loader layers frame failed`, `entry failed (n)`.
What to watch: no black bars while turning the head during loading (the panel
should stay put in the world), a clean switch into the town, and the picture
quality in the town compared with 3.15.12.

## What to read in a 3.15.19 log

- `boot slices ms: ...`: the total from `start` to `textures` is the loading time.
  3.15.14 measured 8.2 s; the march change (NOTES 49) and the build-time probe
  points (the `textures` slice, 792 ms before) should bring it near 6 s. The five
  heavy `townsfolk` entries were 573/493/585/488 ms; expect roughly half.
- `projection layer live, scale 1, msaa 4` at the handover (native start), then
  `projection layer swapped to scale 1.1` and `... 1.2` a few seconds apart while
  frames stay under budget; a later `swapped to scale 1.1` or `1` means the
  governor stepped down under load (normal in the garden Event). No black frame
  should accompany any of these.
- `entry failed`, `loader ... failed`, `[xr-enter]`, `[boot]`: must be absent.

## Frame-rate lines (3.15.27)

While presenting, the game posts one line every ten seconds:

```
page: m=perf fps=71.8 level=2 calls=118 tris=201240 at=-36,-20
page: m=perf fps=41.2 level=4 calls=131 tris=266812 event at=2,-3
```

`fps` is 1000 over the governor's frame-time average, `level` the governor's
quality level (0-1 supersampled, 2 native, 3-4 native with fixed foveation),
`calls` and `tris` the last frame's draw calls and triangles (both eyes),
`event` while the planting Event runs, `at` the player's x,z. Read it with
`adb logcat -s GreeblisServer | grep perf`. A run through the town, a kiosk, a
dialogue and the Event gives the frame-rate picture the OVR Metrics Tool would,
with the scene named.

Save the whole log and let the reader summarise it:

```
adb logcat -d -s GreeblisServer > run.txt
node tools/perf_log.js run.txt
```

It prints the frame rate by scene (town, the Event), the five lowest readings
with where the player stood, the governor levels seen, and a verdict against
the 72 fps target (the author's aim) and the Store's 60 fps floor, with the likely cause for each low reading (triangles,
draw calls, or GPU-bound with the governor at its floor).
