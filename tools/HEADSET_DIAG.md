# Headset diagnostics

How to capture and read a headset run with `adb` (all commands run on the PC with the headset on USB and developer
mode on): a live log of a whole session (section 1, start here), the flash mark, the frame-rate and runtime lines,
and the launch investigation of B9 (sections 2-4, kept for the record; B9 was fixed in 3.15.4-3.15.7).

## 1. A live log of one session (start here)

Capture the log live, from before the launch to the end of the run (`tools\capture_log.ps1` on Windows,
`tools/capture_log.sh` elsewhere, do exactly what the commands below do and save UTF-8), and let the reader summarise it. **When you see a
flash, press B on the right controller** (no buzz: the game never vibrates a controller since 4.0.23, A50, RULES.md
26): the log gets "MARK flash seen" with the frame number,
and `perf_log.js` lists every mark with what the log shows in the 3 s before it (long frames over 28 ms, uploads,
shader compiles, GPU work inside a frame, frame gaps, near-empty frames, governor changes, shader and geometry holds,
the head-inside guard, stuck townsfolk, errors caught in frames). By hand:

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

### Confirming B96: the headset-off run (memory after the headset sleeps)

B96 (found on 4.0.32, the author's logs b42c9cfb and a7fc5e95): after the headset slept 35 s the headset ran out of
memory within seconds of the return and the game froze head-locked. 4.0.34 has the fix (the loader kept whole, the
old shim freed at a session's end); this run confirms it on the headset:

1. Start the live capture above (`capture_log.ps1` / `capture_log.sh`, or `adb logcat -c` then
   `adb logcat -v threadtime -s GreeblisServer VrApi > run.txt`), then launch the game.
2. Play for 1 minute.
3. Take the headset off and leave it off for 35 s or more, so the display sleeps.
4. Put it back on and play for 2 minutes.
5. Stop the capture and send the log (`node tools/perf_log.js run.txt` summarises it).

What to look for:
- **`Free=` holding** in the runtime's once-a-second `VrApi` lines: the headset's free memory after the return about
  where it was before (on 4.0.32 it fell from 2992 MB to 264 MB within 10 s of the return).
- **The census steady**: the `native census (...)` lines (at each `xr visibility` change, 5 s after the return and
  every 60 s) show the same live GL object counts before and after, and none ends in `(GROWTH)`.
- **`destroyed 0`** in every census line's `xr layers made: ...` part: no layer destroyed during the session.
- The game drawing and answering after the return (no head-locked picture). If it froze, launch once more and send
  that log too: its first lines, `unsent from the last run: ...`, are the frozen run's last lines.

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
page: m=perf fps=71.8 fov=0 calls=118 tris=201240 at=-36,-20
page: m=perf fps=41.2 fov=0 calls=131 tris=266812 event at=2,-3
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
page: m=... perf fps=71.8 fov=0 calls=118 tris=201240 at=-36,-20 dev=Quest_3S
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
  (`cave`), a vignette playing, the Event, the screen (`playing`, `dialogue`, `panel`), the courier's state, the Gem
  (`gem`) and the snap turns (`snap`, a count; since 3.15.60, so a flash can be matched with the turn before it).
- `xr visibility visible | visible-blurred | hidden`: the session's focus (the system menu, the headset taken off).
  A black screen after waking the headset, with `xr visibility visible` then `hidden` right after and no frames: the
  system's Guardian (boundary) dialog took focus (logcat: `GuardianDialogActivity`, `NO_LONGER_IMMERSIVE for
  com.oculus.browser`, then `ANCHOR_QUERY_FAILED, dialog` every second when it cannot relocalise the room after an idle).
  The game is alive underneath and resumes when focus returns; the Meta button or a boundary reset brings it back (B89;
  low light makes it likelier: the cameras switch to `lowLightHandsFlood` at the wake).
- After `MARK flash seen`, the flight recorder's last 10 s: `rec ... slow:` (frames over 20 ms, with their time before
  the mark), `rec changes:` (programs, textures, geometries and draw calls changing, the head inside a character),
  `rec events:` (focus changes in the last minute).
- Since 4.0.7 (S15): `rec xr frames: no head pose N, undrawn N, drawn twice N, held N, head position tracked|EMULATED`
  (the frames' health; since 4.0.13 also "drawn by the fallback N": frames the game did not draw and the entry script
  drew instead, S18), `rec near eyes (3 s)` (anything within 0.35 m of the eyes), and `rec light` (the drawn picture's
  brightness around the mark; since 4.0.13 opt-in only, off on the headset: it read the eye buffer every frame, S18).
- Since 4.0.13: the entry log's `foveation fixed at 0 (the layer reads 0)` and `fov=` in every perf line (F-B83).
- Since 4.0.25 (S31): `session requested again (re-entry), features=...` when VR is entered again after an exit
  (the second session on the projection layer like the first); `rec xr frames` adds `drawn by the fallback N` and,
  when non-zero, `begin failed`, `end failed`, `callback threw`; `[loop] ...` for a throw out of the game's frame
  loop; errors repeat at most five times per context, then `[context] N more errors` every 10 s; `rec frames (3 s)`'s
  `GL errors` counts only those within the 3 s, with the session total beside them.
- Since 4.0.23 (S29): `rec frames (3 s): N, late N (worst -X ms@-t s), calls median C, tris median Tk, under 70%: ...,
  same swapchain image twice: N, GL errors N (code@-t s ...)`: the layer path's health in the 3 s before the mark (on
  Quest Browser the swapchain count is every frame by nature, one texture object per layer, and since 4.0.28 the line
  says so). A
  flash of one flat colour (since 4.0.27 a muted green-grey outdoors and black in the Cave, S33; black everywhere
  before, S18; 4.0.24 alone left it uncleared) means the frame shown held no draw: a late frame (the GPU past the
  display time), a repeated swapchain image, or a GL error after the attach says where the draw was lost.
The device in the `perf` lines (`dev=Quest_3`) comes from the browser's user agent; the author's Quest 3S reports
itself as a Quest 3 there (log 1b7d04a9, 2026-11-03), so the per-device verdicts cannot tell the two apart.

Since 4.0.30 (S36) each mark also prints `rec timeline (k of n, ...)` lines: the last 150 frames, each
`frame:display step ms/callback ms/draw calls`, S where a snap turn fell, P a pickup, ! a skipped display slot. The
flash is usually a few tenths of a second to a second before the mark.

Since 4.0.29 (S35) each mark also prints `rec display (3 s): display slots skipped N (...) of a P ms period, layer
image changes N (...; now ...), view matrix faults N`. Slots skipped at the flash mean the headset showed an older
frame there; an image change or a matrix fault near it would point at the frame's setup; `layer image changed` and
`view projection jumped` lines can also appear on their own in play.

Since 4.0.34 (B96) the log has `native census (why): live GL objects ...; xr layers made: projection N, quad N, cube N,
destroyed N; three geometries N, textures N, programs N; since the last census: ...` on each `xr visibility` line, 5 s
after each return and every 60 s: the counts should hold steady; `(GROWTH)` at its end means GL objects piled up since
the last census (report it, with the lines around it). After a crash or a freeze, the next run's log begins with up to
150 lines `unsent from the last run: ...`: the last lines the dead run could not send. `the game's WebGL context was
lost` / `... restored` are logged too. `loader released` no longer appears (B75 reverted in 4.0.34).
Since 4.0.32 (S38) the stability safeties log when they act, each a bug behind it (send the log): `recovery: the scene
hold stayed on 60 s with no dialogue open: cleared`, `recovery: the Event's ending show stayed busy 60 s past its time:
ended` (and, since S20, `recovery: the Event kept failing for 30 frames: ended`), and an error tagged `eye-hide` (a
throw while hiding a character the head is inside, caught before the draw).
Snap turns are counted in the recorder's dumps (`snap`) and marked S in `rec timeline` (instant since 4.0.35; the
blink of 4.0.31-4.0.34 is gone). Since 4.0.35 each mark also logs `rec head guard (3 s): not shown`, or `the view
dimmed by the head guard (head near a wall), peak P, last -T s`: the head guard is the one full-view darkening left in
the game, so a dark flash with it shown means the head passed near a building part. A taken Blossom or Flint that was
still showing logs `recovery: a taken Blossom was still showing: hidden (B97) at X,Z` (B97).
Since 4.0.38 (B46, the flash during quick pickups) each mark also logs `rec pointing and pickups (3 s): now pointing
L:blossom R:-, fading N, pickups see-through on|off; ...`: per frame, what each hand's ray points at (L/R: `blossom`,
`flint`, `ui`, a character's or zone's id, `-` for nothing), how many pickups are fading out or in, whether the pickups'
materials are see-through (they are while any fades), and when a panel (menu, dialogue, shop panel, watch HUD) was
redrawn, each change with its time before the mark. 1.5 s after the mark comes `rec after the mark (T s): F frames,
calls MIN-MAX, head guard ...; ...`: the same changes plus slow frames and program, texture or geometry count changes
in the frames after the press (the author presses up to a second after seeing a flash). `rec near eyes` now looks at
sprites (the floating marks, the labels) and lines too, not only meshes and points.
`depth range change kept off the session in play (NEAR-FAR; S18)`: the camera's far plane changed after VR entry, and
the patched three.js kept the new depth range off the session (it sends it once per session). Expected twice per
Event: at its start (the far-object safeguard's far plane, `finaleFar`, 300 m) and at its end (back to 310 m).
Harmless; any other time, send the log.
Since 4.0.27 (S33) the log may also have: `multiview not decided yet: ...` (once, if the renderer asked before the session:
expected, the decision follows); `shader hold: the compile between frames failed for ...` or `geometry hold: the
upload between frames failed for ...` (not expected: the object was then drawn without the hold, report it);
`geometry warm-up: its draw into the layer's framebuffer raised N GL error kind(s), read off here` (at VR entry:
expected, harmless).
Since 3.15.59-3.15.63 the log also has:
- `geometry held for one frame: N object(s) uploaded between frames` (F-B51): new geometry held back a frame; expected
  now and then (Nextessa's visits, the Event's plants).
- `shader held for one frame: N object(s) compiled between frames` (S2): a shader the loading warm-up missed. Not a
  flash (it was compiled between frames), but a gap in the warm-up: send the log.
- `head inside N character(s): hidden for the frame` (S1; at most 20 lines a session).
- `[draw hook] ...` and other bracketed errors (`[entity:ID]`, `[world]`, `[render]`): an error the frame survived;
  each is a bug to report.
- `no progress: ID D m from its target for 5 s` (F-B55): a townsfolk the stuck detector moved on.
- `matrix walk: a still group moved, walked every frame from now (GROUP, NODE at X Y Z)` and `... a child added to a
  still group ...` (P32, 3.15.66): a group marked still at load turned out to move; harmless (it is walked again from
  then on), but the group should be marked to move (`userData.keep`): send the log.
- `recovery: ... kept failing; step N: ...` (S4, 3.15.68): a part of the frame failed every frame and was stepped
  down so the game keeps drawing; `recovery: ID put back home (...)` (S5): a townsperson that kept failing or lost its
  position was reset. Each is a bug behind it: send the log.
- `fade safety: ID pushed out of NAME as it comes back` (S3, 3.15.67): someone stood where a faded kiosk came back and
  was pushed out; at most 20 lines a session. Send the log with where it happened.
- The flight recorder's lines (D5): `frame gap N ms before frame F, heap A > B MB` (frames the headset did not get, over
  45 ms; a heap that drops in the gap is a garbage-collector pause), `frame F drew N calls (the frame before: M)` (an
  empty or half-drawn frame: the look of a full-screen flash), `frame F: the camera matrix is not finite`, and
  `frames over budget for N frames (...)` (the over-budget flag, once; `governor level L` until 4.0.13). The B mark's dump adds `rec gaps:`.
`node tools/perf_log.js run.txt` reads them all: the recorder under each mark, geometry uploads, focus changes, the
stretches when another process (the system shell) drew instead of the game, and `--trail` prints the event trail.
