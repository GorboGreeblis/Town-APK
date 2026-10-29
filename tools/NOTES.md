# Notes for discussion

The working notes, numbered: every investigation, measurement and decision, with the reasoning (other docs cite
them as "NOTES n"). The first entries were written while packaging, for discussion, when nothing had been acted on
beyond the VR-entry fix.

## Index

1. Immersive launch from a loopback origin
2. Grant timing
3. Package name and key
4. VRC.Quest.Performance.3, in-VR loading indicator
5. VRC.Quest.Packaging.6, 64-bit
6. VRC.Quest.Functional, pause / exit
7. Leftover message text
8. User-agent gate
9. "Press A" needs prior activation
10. No persistent save
11. Compressed release build
12. three.js warning
13. The compressed release is a re-minified build of the same source
14. Android lint
15. Loopback server leniency
16. Hennrick grammar
17. Hennrick and the field office
18. Spelling
19. Simulated VR session works end to end
20. NPCs only simulate while presenting
21. Software rendering is slow
22. Reproduced in the harness
23. Root cause
24. Why it is rare and why it looks like the safety net
25. Fix (applied by `tools/apply_entry_fix.py`, GAME_FIXES):
26. Visit paths verified after the fix
27. Headset launch crash (3.15.1) and fix
28. 3.15.2: immersive activity closes on the loopback URL
29. B9 resolved by the unfiltered log
30. **3.15.4 passed the origin check and hit the next one: Digital Asset
31. B11: the pizza courier and the Ancient
32. **B12, subtle white flashes on objects (author's repro: pick something up
33. 3.15.6 on the headset: verification passes, the game boots, no VR
34. 3.15.7: the launch fix and our own loading screen
35. B4r, the last corner clip in random routes
36. B2, a visible fallback for stuck NPCs
37. Pre-warm of the pickup effects, and a cacheable page
38. Pre-rendered textures (using the APK's space)
39. B13, the loading screen must keep up with the head
40. The sealed corner behind the Shop (B14, 3.15.12)
41. 3.15.11 crash: the `layers` feature forbids `baseLayer` (B15)
42. **B13 fix design: compositor layers for the loader, a projection layer for
43. Layers path confirmed on the headset; 3.15.13
44. Graphical pass tools (T13)
45. Boot slice timings (3.15.14)
46. **On-device loading breakdown (3.15.14, author's log), 8.2 s from page
47. Layer swaps and the adaptive render scale (3.15.16)
48. Sharper Gallery painting (3.15.16/17)
49. Loading: the blob-body march (3.15.19)
50. 3.15.19 confirmed on the headset (author's full run, no new issues)
51. Loading panel, third size, and a horizon (3.15.21)
52. B20, Hennrick's cuffs (3.15.22)
53. Curved z-fighting: a geometric test, the batcher's parked sources, B20 completed (3.15.23)
54. The listed z-fighting instances: three fixed, seven that cannot be seen (3.15.24)
55. The VRC check and the focus-aware fix (3.15.25)
56. Performance pass and Zollod's kiosk (3.15.26)
57. The frame-rate log line and what was not done (3.15.27)
58. Hardening the performance tools (3.15.27)
59. Draw calls (3.15.28)
60. Shininess and specular per batch part (3.15.29)
61. A blind spot in the identity check, found and closed
62. The visibility census and indexed batches (3.15.30)
63. Indexed scenery, and what the GPU side is not (3.15.31)
64. The tentacle bend (3.15.32)
65. Multiview, as an experiment (built on 3.15.33)
66. The play test's 2D window measured the boot
67. The multiview flashes (3.15.34)
68. Devices and tool hardening (3.15.34)
69. The Gem's shader, and where vertex work stands (3.15.35)
70. What is left that changes nothing on screen (3.15.36)
71. The governor already meets the Event at its lowest level
72. The Event's adaptive render scale (P16, 3.15.37)
73. The Quest 3 and a second step (P17, 3.15.38); the Event performance work closed
74. B27's second variant, and checks that cannot be lucky (3.15.39)
75. The emergency drop ends with the Event (P18, 3.15.40)
76. One light at a time (P19, 3.15.41)
77. The performance report's baseline, and machine speed (3.15.41)
78. Five more of the test plan's open rows (3.15.41)
79. The 3.15.41 headset run on the Quest 3S: the flashes are back, and the Event is limited by draw calls
80. The noswap run: the flashes come with new textures
81. The deferupload run, and the panels' three canvases
82. Flashes and textures made during play; the Event's pizza (done in 3.15.42)
83. The flash experiments become the release; the Event scale goes (done in 3.15.43)
84. The Ancient left out from outside the church (P21)
85. Gooward's translucent parts merged (P22)
86. The occlusion census's first full run: nothing to remove
87. One game file, edited directly (3.15.43)
88. The game is rebuildable from the game file alone; painted textures seeded (3.15.44)
89. The game file minified; the compressed version is back, as a Bitcoin ordinal (3.15.45)
90. The author's 3.15.46 run; the Event's first start (F-B33); the stepped-back Event view (3.15.47)
91. The author's 3.15.47 run: flashes and the CPU-bound Event (3.15.48)
92. The mipmap switch after entering VR (F-B36, 3.15.49)
93. Backpacka: the frame-rate drop, her collision, and two side findings (3.15.50)

## Must be confirmed on a headset

1. **Immersive launch from a loopback origin.** Meta's immersive app mode was
   designed for hosted PWAs whose Digital Asset Links the browser can verify.
   A `http://127.0.0.1` origin cannot publish `assetlinks.json`. The browser
   helper's "quality enforcement" crash on failed verification is neutralised
   in `LauncherActivity`, but whether the Quest Browser still fires
   `sessiongranted` for an unverified origin is only provable on a device.
   If it does not, the fallback is the 2D app mode (`horizonos.pwa.APP_MODE =
   2D`, `com.oculus.intent.category.2D`), where the player clicks the panel.
   **Resolved** (3.15.4-3.15.7): the server is addressed as `localhost` and
   serves the asset links (F-B9), and the page requests the session itself at
   page start, which the immersive activity accepts without a grant (NOTES 34).
2. **Grant timing.** The fix requests the session inside the grant handler and
   parks it until the world is built (about 30 s under software rendering
   here, much less on a Quest). During that time the headset shows the
   browser's empty XR view rather than the OS splash. Check that this looks
   acceptable.
   **Resolved** (3.15.7, F-B6): the session is entered at page start and the
   game's own loading screen is drawn while the boot runs (NOTES 34).
3. **Package name and key.** If a build was ever uploaded to app
   1441937125658740 before, its package name and signing key are locked in.
   The APK here uses `com.montgummery.greeblis` and a fresh key.

## Possible store-review flags

4. **VRC.Quest.Performance.3, in-VR loading indicator.** The world is built
   synchronously on the main thread before the first VR frame, so the only
   thing shown is the OS three-dot splash, which the VRC says does not count
   if loading exceeds a few seconds. Fixing this would require making the
   game's boot asynchronous (a game change).
   **Resolved** (3.15.7, F-B6): the boot is sliced and our own loading screen
   (title, progress bar) is drawn in VR while it runs (NOTES 34).
5. **VRC.Quest.Packaging.6, 64-bit.** The APK has no native code at all, so
   `aapt2` reports no `native-code` line rather than `arm64-v8a`. Meta's own
   PWA packages have the same shape, but a reviewer reading the rule
   literally might query it.
6. **VRC.Quest.Functional, pause / exit.** When the player presses the Meta
   button, the browser handles the system menu. Exiting the game ends the
   WebXR session; the Quest Browser then asks the launcher to
   `finishAndRemoveTask`, which `LauncherActivity` honours. Worth a manual
   check that no stray 2D browser panel remains.

## Things noticed in the game code (not changed)

7. **Leftover message text.** When a session request fails with a security or
   not-supported error, the gate shows "VR can't start in this preview. Open
   the inscription's own page." The frame loop overwrites it with "Press A to
   Continue." within one frame, so players never see it, but the wording is
   from another distribution context.
   **Resolved** (3.15.3, F-B7): the text is no longer in the game file.
8. **User-agent gate.** The game refuses to run unless the user agent matches
   `/OculusBrowser|Quest/`. The APK always runs in the Quest Browser so this
   holds, but a future browser UA change would block the game with the
   "designed for Meta Quest" screen.
9. **"Press A" needs prior activation.** In the 2D fallback the controller
   poll only fires after `navigator.userActivation.isActive`, i.e. after a
   click on the panel. Pressing A on a fresh page does nothing until then.
10. **No persistent save.** The game uses no `localStorage`, `sessionStorage`
    or IndexedDB; every launch starts fresh. Noted because the loopback port
    strategy was chosen to keep the origin stable in case that changes.
11. **Compressed release build.** `tools/index.compressed.html` unpacks the
    game asynchronously (with a "LOADING nn%" counter) and then
    `document.write`s it. In that build an immersive grant arriving during
    unpacking would be lost before any game script runs, so the compressed
    file is not suitable for the APK even with the entry fix. The APK uses
    the uncompressed source, as agreed.
    **Resolved** (3.15.43): that compressed build was removed (NOTES 87). The
    compressed version made since 3.15.45 is a Bitcoin ordinal only and never
    in the APK (RULES.md 20, NOTES 89).
12. **three.js warning.** The bundled three.js can log "Depth Texture with cube
    render targets is not supported"; it is a library message, not a game
    error, and did not appear in the headless runs.

## Release build vs. source (parity)

13. **The compressed release is a re-minified build of the same source.**
    `tools/test_parity.js` unpacks `index.compressed.html` and compares it
    with `uncompressed.html`. They are not byte-identical: the release has
    renamed locals, joined string pieces (`"* "+"Ancient Gem collected!"+" *"`
    becomes one literal), quoted object keys, folded constants (`ART.h`
    becomes `772` inside the texture-worker source) and drops `1.0`/`2.0`
    style zeros. Every player-visible string literal matches once those
    joins are accounted for. The APK is built from the uncompressed source,
    so it is "on par" with the release in content, but anyone wanting a
    byte-identical guarantee would need the original minifier pipeline.
    **Resolved** (3.15.43): `test_parity.js` and that compressed build were
    retired (NOTES 87); the shipped files are copies of the game file
    (`sync_game.py --check`), and the compressed version unpacks to it byte for
    byte (`build_compressed.js --check`, NOTES 89).

## From general testing (round 2)

14. **Android lint** (`gradle lintRelease`) reports 11 warnings, none
    affecting the Quest build: launcher icon fills its square (cosmetic),
    redundant activity label, fixed landscape orientation (intended for a VR
    launcher), `allowBackup` deprecation note, `compileSdk 35` available, the
    splash bitmap sits in the density-less `drawable/` folder (fine for a
    single image), and one "Fatal" `ExpiredTargetSdkVersion` that is a Google
    Play rule (target 33+). Meta's VRC wants 32-34 for immersive apps and
    Meta's own PWA template uses 32, so targetSdk stays 32. Raising it to 34
    would silence lint and is low risk for this app; discuss.
15. **Loopback server leniency.** A request line with no path (`GET` alone)
    is served as `/` instead of answered 400. Harmless (only the Quest
    Browser talks to it), noted for completeness; the harness documents the
    behaviour rather than failing on it.

## Content review (round 2)

16. **Hennrick grammar.** His campfire line reads "Sometimes worry that doing
    these things will alter the timeline…" and is missing its subject
    ("Sometimes I worry…"). Entity id `gratelet`, field `campfire`.
    **Fixed** (approved): applied by `tools/apply_entry_fix.py`, GAME_FIXES.
17. **Hennrick and the field office.** The only line of his that touches the
    subject is "These joints were built for fieldwork, not a desk." The line
    "See anything glowing in the sky, you report it to this office." belongs
    to the Sheriff (Mushroom, id `drifter`). The Field Office building itself
    carries no text. If a specific line is wrong, point at it and it goes on
    this list.
18. **Spelling.** `tools/spellcheck_dialogue.py` finds no misspellings in the
    421 prose strings. Everything it flags is a name or deliberate sound
    (Goomp, Backpacka, Appterix, Cobourg) or font/engine text.

## Runtime testing (round 2 results)

19. **Simulated VR session works end to end.** With the fake WebXR device
    (`tools/fakexr.js`) the game accepts the grant, three.js takes the
    session, the gate hides ("Entering VR..."), stereo frames render, and on
    session end the 2D gate returns, all with zero page errors. This is the
    closest thing to a headset run available here; it does not exercise real
    sensors, controllers or the Quest Browser.
20. **NPCs only simulate while presenting.** In 2D (gate) mode no NPC moves
    and the player cannot pick anything up, which is by design (the 2D gate
    is only a holding screen). All behaviour tests therefore run inside the
    fake session.
21. **Software rendering is slow.** Stereo frames run at roughly 3 fps under
    SwiftShader even with the framebuffer clamped to 320 px, so behaviour
    scenarios run with large frame deltas (about 0.35 s). Results are valid
    for logic, not for timing precision or frame-rate claims.

## Mushroom stuck: root cause and fix (round 2)

22. **Reproduced in the harness** (`tools/test_npc_home.js`, fake VR
    session): placed 6 m behind his kiosk, Mushroom walked straight at the
    front waypoint, pinned himself against the back wall, the stuck detector
    fired and re-planned, and the re-plan sent him straight through the wall
    again, forever. The off-screen teleport never fires while the player is
    within 12 m or looking at him. Several other "failures" in the first run
    were only the software renderer slowing the simulation (fixed in the
    harness by skipping draw calls).
23. **Root cause.** `F.segBlocked`, the navigator's wall test, skipped a
    building entirely when both ends of a segment were inside the building's
    clearance margin (about 1 m for Mushroom). Beside or behind his kiosk,
    both his position and the front waypoint are inside that margin, so the
    kiosk was invisible to the router and the "path" went through the wall.
    The same test also marked any segment that merely ended inside the margin
    as blocked, so the waypoint was unreachable by the proper route and the
    router fell back to the straight line.
24. **Why it is rare and why it looks like the safety net.** He only leaves
    the desk for visits and the garden event; walking back along the front
    is fine. The trap needs an interrupted visit or a return that starts
    beside or behind the kiosk (the post-visit `drop` path navigates straight
    at the desk). Then the safety net is what the player sees failing.
25. **Fix (applied by `tools/apply_entry_fix.py`, GAME_FIXES):** when either
    end of a segment is within a building's margin, test against the real
    hull instead of the enlarged one, and still ignore the building when both
    ends are inside it (walking indoors). Routes now go around the kiosk to
    the front waypoints, then the normal hop onto the desk follows. One
    function changed, no behaviour change away from buildings.

26. **Visit paths verified after the fix.** `tools/test_visits.js` forced
    visits with Mushroom as host (Hennrick calls on the Sheriff) and as
    visitor (to Anomalee), complete and interrupted while walking out, at the
    meeting and on the way back. In every case he ended on his desk at full
    height with his stand height restored, so the visit system's hop-down /
    hop-up bookkeeping is sound; the earlier "moved home but never jumped"
    sighting is consistent with the wall-pinning case (fixed).

27. **Headset launch crash (3.15.1) and fix.** The author's logcat shows
    `SuperNotCalledException: LauncherActivity did not call through to
    super.onCreate()` three times in a row at 03:47 on 10-26, each right after
    the launcher process started: the app never showed anything. Cause: the
    loopback server could not bind because the manifest lacked
    `android.permission.INTERNET` (needed for any socket on Android), and the
    launcher's error path finished the activity without calling
    `super.onCreate()`, which Android treats as a crash. 3.15.2 declares the
    permission, always calls `super.onCreate()`, and skips the browser launch
    when the server is down (showing a toast instead). The same log also holds
    two `StackOverflowError` crashes from 10-24 in the earlier
    `com.greeblis.greeblistown` package (a previous packaging attempt), which
    are unrelated to this project.

28. **3.15.2: immersive activity closes on the loopback URL.** The second
    headset log shows the fixed launcher doing its job (`START ... dat=
    http://127.0.0.1:17777/ cmp=com.oculus.browser/.WebXRCustomTabActivity`),
    then a CLOSE transition for that activity about 300 ms later and the whole
    task finishing; this repeats on every launch, leaving the OS loading
    screen up. No browser-side reason is logged, and the capture holds no
    lines from our own process (pid 13084), so the server and launcher logs
    are missing; an unfiltered `adb logcat -v threadtime` would show them.
    Working hypothesis: the immersive custom-tab activity requires a verified
    HTTPS origin. Since hosting is ruled out, the 2D app mode (browser panel
    plus the game's own "Press A") is the fallback under test, and the
    build now has a `-PappMode=2D` switch.

29. **B9 resolved by the unfiltered log.** The browser prints
    `cr_OriginVerifier: Verification failed for http://127.0.0.1:17777 as not
    https or localhost`, then `cr_WebXRCustomTabActivity: TWA verification was
    unsuccessful! Exiting the activity.` Chromium's Trusted Web Activity
    verifier has a development exception for the host name `localhost`
    (no HTTPS needed) but not for the numeric loopback address. 3.15.4
    addresses the game as `http://localhost:17777/`; the server also listens
    on `::1` in case `localhost` resolves to IPv6 first. No hosting, no
    browser window: the immersive activity should now verify and go straight
    to `sessiongranted`.

30. **3.15.4 passed the origin check and hit the next one: Digital Asset
    Links.** With `http://localhost:17777/` the browser no longer rejects the
    origin, but Trusted Web Activity verification has a second step: it fetches
    `/.well-known/assetlinks.json` from the origin and requires a statement that
    names the launching package and its signing certificate. Our server
    answered 404 for anything but the game, so the log shows
    `digital_asset_links_handler.cc: Digital Asset Links endpoint responded
    with code 404` followed by `TWA verification was unsuccessful! Exiting the
    activity.` 3.15.5 serves that file from the loopback server. The statement
    is built at runtime from the installed package's own signing certificate
    (`PackageManager.GET_SIGNING_CERTIFICATES`, SHA-256, colon-separated upper
    case as keytool and Chromium print it), so it stays correct whichever key
    signed the build. The JVM harness checks the path, content type, relation,
    package name and fingerprint format (`tools/test_server.sh`). This is the
    same mechanism a hosted PWA uses; the only difference is that the "host"
    is the APK itself, so the no-hosting rule still holds.

31. **B11: the pizza courier and the Ancient.** Inside the church the courier
    follows two fixed waypoints (both on the +x side of the nave) and then
    walks straight at the player. The Ancient is registered as a solid part of
    the church (`[-.95,-13.65,.95,-9.55]` in church-local coordinates), so a
    player standing on the -x side put the Ancient on that straight line and
    the wall resolver pinned her there until the 100 s give-up (the exit path
    had the same problem in reverse). The fix adds `detour()` to the courier:
    a Liang-Barsky segment test against the Ancient's box grown by her radius;
    when the line crosses it she first walks to the front corner on her side
    and then the corner on the player's side (corners 1 m outside the margin,
    because `follow()` consumes a waypoint within 1 m and a closer corner made
    her loop in place, which the first attempt did). Used for the approach and
    prepended to the exit waypoints. Verified with `tools/test_courier.js`
    against `--entry-only` (bug reproduced: still for 94 s) and the fixed asset
    (delivers in 4 s, outside again at 9 s).

32. **B12, subtle white flashes on objects (author's repro: pick something up
    while looking at the kiosk behind Zollod from a distance; also the garden
    ground during the Event; other kiosks and objects too).** What the code
    rules in and out so far:
    - Not a whole-view effect: the flash is on objects, never across the
      screen, so the base-layer rebuild by the quality governor and the
      comfort vignette quad are out as the primary cause.
    - The draw batcher (`gcEB`) is consistent within a frame: three.js calls
      `scene.onBeforeRender` before it builds the render list, so slot
      updates and the layer toggles that move a part between "drawn by the
      batch" and "drawn by itself" land in the same frame. A zeroed slot
      collapses a part to a point (no pixels), so stale slots would show as a
      pop, not as white.
    - Live candidates, in order: (1) GPU work first done during the pickup
      frame: new sparkle meshes (white Phong, unique materials) and the 64x64
      label textures; on Quest a long frame is shown re-projected and a
      bright object can read as a flash; (2) a one-frame lighting difference
      when a part toggles between the batch shader (normals from the slot's
      adjugate matrix) and its own mesh (three.js normal matrix); (3) the
      per-frame HUD canvas re-upload on count changes; (4) a driver-level
      issue with the dynamically indexed `vec4 gcR[128]` uniform array in the
      batch vertex shader (Adreno), which the headless probe cannot see.
    - Tools: `tools/flash_probe.js` (per-frame read-back: near-white pixel
      count and frame-to-frame jumps while still, facing the garden kiosk
      from 22 m during pickups, and the garden during the Event),
      `tools/hitch_probe.js` (new programs/textures per action), and three
      headset A/B variants from `tools/build_experiment.sh`: `nobatch`,
      `noeffects`, `nogovernor`. Whichever variant makes the flash disappear
      names the cause.
    - Result of the brightness probe on 3.15.6 (software GL, 1280x720 read-back
      of every rendered frame): no anomalous frame during three blossom and two
      acorn pickups while facing the garden kiosk from 22 m (near-white pixel
      count 6-12 per frame throughout, frame-to-frame jumps under 10 pixels),
      and none during 20 s of the Event looking at the garden. The hitch probe
      in the same build shows the first pickup of a session uploading 14
      textures and 57 geometries on the spot. So the flash is not in the
      scene's colours as computed by the game; it is either Adreno-specific
      (dynamically indexed uniform arrays in the batch vertex shader, or
      texture/buffer uploads racing the previous frame) or timing-dependent.
      Headless cannot decide that; the A/B variants on the headset can.

33. **3.15.6 on the headset: verification passes, the game boots, no VR.**
    The launch log shows `TWA verification was successful!`, the page load
    (12 s, the synchronous world build) and the ready sound, then
    `cr_VrShellDelegate: setListeningForSessionGranted(true), navSession.isNull?
    true` / `no navigation - no activation. Status -1`, and 15 s after the
    launch the OS gives up on an immersive app that never submitted a frame
    (`FocusPlaceholderActivity`, focus lost, activity destroyed).
    Read from the Quest Browser's own code (APK from the author, dex
    disassembled with `dexdump`): `VrShellDelegate.setListeningForSessionGranted`
    grants the session only if a `WebVRNavigationDescriptor` exists with status
    1-4. That descriptor is created in exactly two places: the delegate's tab
    observer (`onDidStartNavigationInPrimaryMainFrame`), which is attached only
    by `enterVRHelper`, i.e. once the delegate is already in VR; and the panel
    browser's deep-link handler. A fresh immersive launch of a verified app
    creates neither, so our early listener registration is received correctly
    and there is nothing to grant. The second entry path, `presentRequested`
    (the page calling `requestSession` itself), explicitly accepts Trusted Web
    Activity tabs (`TWAUtils.isTWA`) and enters VR through the already-started
    `WebXRCustomTabActivity`. Whether that path needs user activation in the
    immersive activity is decided in the native library, not readable here.
    Variant `directrequest` (built, sent to the author) requests the session
    right after boot and logs the refusal reason to the console; the next
    logcat answers it. The 2D-mode test (`CustomTabActivity`) gave
    `NotSupportedError` then `SecurityError` on A presses: the plain custom tab
    has no XR device, so that test says nothing about the immersive activity.

34. **3.15.7: the launch fix and our own loading screen.** The `directrequest`
    diagnostic proved the mechanism (author's log, 09:46): the page called
    `requestSession` with no user activation and the immersive activity accepted
    it (`presentRequested` -> `enterVR` -> "requestSession OK", first frames
    0.3 s later). So the browser never needed a grant; 3.15.6 only waited for a
    `sessiongranted` that this browser does not send for a fresh launch. Two
    problems remained: the request was only made after the 12 s synchronous
    world build, and the OS kills an immersive app that submits no frame for
    about 15 s (the earlier builds died exactly there), and the user stared at
    the OS loading screen the whole time.
    What 3.15.7 does (all in `apply_entry_fix.py` EDITS, the game's code is
    unchanged apart from the inserted yields):
    - The head script requests the session at page start on a Quest UA, parks
      it, and draws our own loading screen into it with raw WebGL: sky-colour
      background, "GREEBLIS TOWN", "Loading…" and a progress bar, world-locked
      2.2 m ahead in the `local` space. The grant listener stays for browsers
      that use it.
    - The boot is made async and sliced: the outer boot function and its
      world-build IIFE are `async`, and `await __gtY(label)` yields are
      inserted before each heavy step (garden, kiosks, pond, clouds, library,
      portal, music, scenery, player, each companion/townsfolk/creature spawn,
      pickups, batching, placing), the shader compile runs in 8 slices
      (visibility-chunked `O.compile`), then first draw and warm-up. Anchors
      come from a real parse of the script (`tools/lib/boot_map.js`, acorn), so
      every yield sits at the top level of an async function.
    - At the very end of the boot (after `Re.start()`) the game enters the
      parked session through its own `je()`; the loader stops when `je` takes
      the session (`__gtXR.taken`). Errors in the async boot still reach `vo()`.
    Headless: play test passes (2D and fake VR), entry wiring test rewritten
    for the new design (one request at page start, parked session reused, no
    extra request on grant or click). B6 (in-VR loading indicator) is covered
    by this. Pending: the author's headset run of 3.15.7.

35. **B4r, the last corner clip in random routes.** The grid router's smoother
    already rejected legs that cross a hull (B4), but two spots were unchecked:
    before dropping the last grid cell it only tested the leg up to 1.2 m short
    of the exact target, and the final leg to the target was appended without
    any test. Both crossings reported by the world test were exactly that final
    leg (a cell centre to a target beside the shop). 3.15.8 checks the whole leg
    before dropping the cell and, if the final leg is still blocked, inserts an
    L-shaped step round the corner. World test: 20/20 random pairs clean.

36. **B2, a visible fallback for stuck NPCs.** The stuck detector `De()` re-plans
    after ~1.2 s without progress and, after four stalls, teleports the NPC to
    its target, but only when the player is more than 12 m away and the NPC is
    outside the view, so a stall in view went on for as long as the player
    watched. At the author's request the hidden teleport stays as it is and a
    second threshold is added: after eight stalls (about ten seconds) the NPC is
    moved even in view, with a sparkle burst from the game's own particle pool
    where it stood and where it lands, so it reads as a deliberate "poof"
    rather than a glitch. Everything else (re-planning, the B1/B4/B11 route
    fixes) still runs first, so this only ever fires on a case those did not
    cover. Test: `test_world.js` forces eight stalls on a visible NPC and checks
    it lands on its target without errors.

37. **Pre-warm of the pickup effects, and a cacheable page.** Two fixes applied
    ahead of the final test pass at the author's request.
    - *Effects pre-warm (B12 candidate 2, `GAME_FIXES`).* The hitch probe showed
      the first pickup of a session creating 14 textures and 57 geometries on
      the spot. The sliced boot now has an "effects" slice that creates them
      out of sight (y = -60): every label text/colour pair the game uses
      (hearts, "!", "?", sparkles, notes, "~", blossoms, dots), a 14-particle
      sparkle burst and a splat, so a pickup never allocates on the GPU
      mid-game. Whether this is the whole of the white flash is for the
      headset A/B to say.
    - *Cacheable page (wrapper).* `GameServer` now sends a strong ETag
      (SHA-256 of the document) with `Cache-Control: no-cache` and answers
      `If-None-Match` with 304, instead of `no-store`. Chromium can then keep
      the document and its compiled-script cache between launches and still
      never serve a stale build (the ETag changes with every build). The JVM
      harness checks ETag, no-cache, 304 and a stale-ETag miss.

38. **Pre-rendered textures (using the APK's space).** The game paints its
    textures procedurally with 50 canvas painters at boot (14% of the boot CPU
    in the profile), a legacy of the on-chain size limit. The APK has no such
    limit, so `tools/prerender_textures.js` boots a capture variant once,
    records every painter's output and writes PNGs plus a manifest to
    `assets/tex/` (105 textures, 8.5 MB). At runtime the head script fetches
    them from the loopback server during the loading screen (`__gtAssets`,
    awaited at the start of the sliced boot) and the painter `b()` blits the
    decoded bitmap instead of repainting. Matching is by canvas size, a hash of
    the painter's source and the call ordinal, and only during the boot;
    painters that draw text are never substituted, because fonts differ
    between the build machine and the headset and the game must look the
    same as before. If the files are missing (hosted copy, old server) the
    painters simply run as before. Headless check: 105 loaded, 104 used, no
    errors. The server and the harness serve `/tex/*`; the APK grew from 3 to
    about 12 MB.

39. **B13, the loading screen must keep up with the head.** The author saw black
    bars when turning the head during loading. The loader drew its panel as a
    normal WebXR projection layer, so it could only submit a frame between boot
    slices, and the longest slices (kiosk builders, the library, a shader-compile
    chunk) block the main thread for hundreds of milliseconds; the compositor
    then re-projects the last frame and rotation exposes its edges. Finer
    slicing cannot fix that (single builder functions are that long), so
    3.15.11 moves the loading screen to the compositor: with the `layers`
    feature, `XRWebGLBinding` provides a cube layer (64x64 sky-colour faces, all
    around) and a quad layer (the 1024x512 title/progress panel, 2.2 x 1.1 m,
    2.2 m ahead in `local` space). Their textures are filled from the page
    (once for the cube, on progress changes for the quad, both inside the
    session's rAF via `getSubImage`), and the browser re-renders the layers
    every vsync with current head tracking whether or not the page is busy,
    so there are no stale frames and the OS keeps receiving frames. When the
    game takes the session, `__gtXR.stop()` clears the layers and three.js
    sets its own base layer. If the binding or a layer call fails, the loader
    falls back to the previous projection drawing. The headless fake XR has no
    layers, so the harness exercises the fallback; the layers path needs the
    headset.

40. The sealed corner behind the Shop (B14, 3.15.12). The final full tier on
    3.15.11 failed world routes 16/20 with four random routes through the Shop
    hull (up to 3.4 m deep), all starting from grid cells in the south-west
    corner. A grid-connectivity probe (flood fill over `JGP.route.grids`)
    showed why: the Shop stands diagonally across that corner and its
    clearance margin reaches both park walls, so the triangle behind it is an
    island of 28 free cells at the walking margin (45 at the finest), with no
    connection to the rest of the park in any boot. The router's A* then finds
    no path, falls back to the nearest reachable cell and appends the target,
    i.e. a straight leg through the building; the L-shaped corner step of B4r
    cannot help because both legs are blocked too. The three earlier 20/20 runs
    had simply not sampled the corner (the test draws 40 random free points).
    Fix: `roamFree` rejects points whose Shop-local z lies below the back wall,
    so the corner is never a roaming target, a route endpoint, or an open grid
    cell. The probe shows one component at the finest margin afterwards; the
    remaining tiny islands at the walking margin (6 cells near the post kiosk,
    1 near the gallery) are reachable at finer margins and the final leg into
    them is tree-free, so they were left alone.

41. **3.15.11 crash: the `layers` feature forbids `baseLayer` (B15).** The
    author's headset log for 3.15.11 showed three identical launches: the page
    requests the session at page start, `presentRequested` / `enterVR` two
    seconds later, then 6-8 s after that `exitWebVRPresent`, `shutdownVR`,
    `terminate!`, and the launcher's `browser requested finishAndRemoveTask`.
    Nothing killed the app from outside: the page's own session ended, and
    the immersive activity finishes with it. The browser does not log page
    errors, but its native library carries the rule as a string:
    `Can't use baseLayer with layers feature requested` (also `Can't set both
    baseLayer and layers`, `All layers in render state must be unique`, `The
    'layers' feature was not enabled for this XRSession.`, `Session is not
    configured correctly: no layer is set`). With `layers` among the granted
    features every `updateRenderState({baseLayer})` throws: first in our
    loader (hence no loading screen at all on 3.15.11), then in three.js's
    `setSession` at boot end; the game's entry routine caught that and ended
    the session, i.e. exited the app. The 6-8 s is the boot time on the Quest
    with pre-rendered textures.

    Consequences: (a) 3.15.12 does not request `layers`; the projection
    loader of 3.15.10 is back. (b) The entry routine no longer ends an
    APK-launched session on failure: the loading screen comes back with the
    error text, entry is retried twice, and the worst case is a readable
    screen the user leaves with the system button. (c) The page posts its
    events and errors to the loopback server's `/log` endpoint, logged as
    `GreeblisServer: page: m=<ms> <text>` (HEADSET_DIAG.md). (d) `tools/fakexr.js`
    enforces the rules above, so the headless entry test fails on a `layers`
    session the way the headset does. (e) The real fix for B13 (black bars)
    must render the game itself through an `XRProjectionLayer`: three.js's
    base-layer path shimmed with a framebuffer whose colour/depth attachments
    come from `getViewSubImage` each frame, plus the quality governor's layer
    rebuilds (`scaleFactor` instead of a new `XRWebGLLayer`). New rendering
    code only a headset can verify, so it ships as an experiment APK first.

42. **B13 fix design: compositor layers for the loader, a projection layer for
    the game (`tools/lib/xr_layers_shim.js`).** With the `layers` feature the
    browser forbids `baseLayer` (41), and this three.js build only knows
    `baseLayer`. The shim keeps three.js unchanged: in layers mode the session
    the game receives is a facade (a `Proxy` over the real session) whose
    `updateRenderState({baseLayer})` creates an `XRProjectionLayer` instead
    (scale from the layer's `framebufferScaleFactor`, so the quality governor's
    0.82 rebuilds still work), whose `renderState.baseLayer` is the stub layer
    three.js constructed (its `framebuffer` is the shim's MSAA framebuffer, its
    `getViewport` the eye viewport from `getViewSubImage`, `fixedFoveation`
    forwarded to the projection layer), and whose `requestAnimationFrame`
    wraps every callback with `begin(frame)` (attach this frame's eye texture)
    and `end()` (resolve the 4x MSAA renderbuffer into it with
    `blitFramebuffer`, as three.js's own projection-layer path does). The
    global `XRWebGLLayer` is replaced by a stub in that mode so no unused
    swapchains are allocated. The loader draws into a cube layer (sky) and a
    quad layer (panel), which the compositor re-renders every vsync with the
    current head pose whatever the page is doing; if those fail it falls back
    to its own projection layer through the same shim. `tools/fakexr.js`
    emulates `XRWebGLBinding` and the three layer kinds (real GL textures,
    nothing composited), so the whole path runs headless: on the "layers"
    experiment asset the entry test passes and the play test renders 1045 XR
    frames in 20 s with "projection layer live, scale 1, msaa 4" in the page
    log. What only the headset can show: that the compositor accepts the
    layers (cube/quad/projection), the handover (cube+quad replaced by the
    projection layer on the game's first frame), and the picture quality of
    the MSAA resolve. Ships as `tools/.runs/GreeblisTown-exp-layers.apk`
    (`tools/build_experiment.sh layers`); the release asset carries the same
    code dormant (it never requests `layers`).

43. **Layers path confirmed on the headset; 3.15.13.** The author's log for the
    experiment APK: `session parked, features=local,viewer,bounded-floor,layers,
    webxr,local-floor` at 0.7 s, `projection layer live, scale 1, msaa 4` at
    9.0 s (boot about 8 s), then the town; verdict "no black bars or loading
    in perf issues". The only complaint was the panel at 2.2 m (2.2 m wide,
    about 53 degrees of view): now 3.6 m away, 2.6 x 1.3 m (about 40 degrees),
    0.15 m below the eye line, in both the quad layer and the projection
    fallback. The `layers` feature is now in the release feature list; the
    `nolayers` experiment flips it back for A/B comparisons. Also in 3.15.13:
    B16 (game fully loaded before drop-in) and the app label "GREEBLIS TOWN"
    (the Store listing name is typed in the dashboard separately).

44. **Graphical pass tools (T13).** `tools/test_zfight.js` finds coplanar
    overlaps statically (plane-bucketed triangles, 2D overlap test, batched
    parts resolved through the batcher's `gcPart` attribute) and confirms them
    by rendering: the two surfaces alone on a private layer, twice, with a 1 mm
    camera shift; pixels that flip are a depth fight, edge aliasing of the rest
    of the scene cannot count. On 3.15.13 nothing flickers; the one pair the
    first version flagged was a 4 cm corner where the church's side wall meets
    its roof slab, and it was edge aliasing. `tools/sharpness_probe.js` reads
    what decides crispness (render scale per level, foveation, MSAA, texture
    filtering); the game renders at native scale at every level with 4x MSAA
    and anisotropy 8 on its textures, so the remaining lever is supersampling:
    the `sharp` experiment (scale 1.2 / 1.1 at the top two levels) is for a
    headset comparison, with the governor stepping down under load. B17 builds
    the Event's props during the loading screen (`BP.prewarm`), which halves
    the Event-start frame in the hitch probe.

45. **Boot slice timings (3.15.14).** The entry script now posts the duration of
    every loading slice at the handover (`page: m=... boot slices ms: ...`), so
    a headset log gives the on-device loading breakdown. Headless (SwiftShader,
    so GPU-bound slices are inflated): textures (the B16 canvas capture, a
    1x1 readback per painted texture) 8.5-9.9 s, placing 0.9-3.2 s, player
    1.1-1.3 s, first draw 0.7-0.9 s, effects 0.2-0.8 s, the townsfolk about
    2.5 s together, shaders 8 x 15-30 ms (the chunked compile is cheap here;
    it is the expensive one on the Quest's driver). The capture's cost on the
    Quest is unknown until the first log with these lines: if it is a large
    share of the 8 s, the options are a CPU-side probe for the pre-rendered
    textures (sample the decoded PNG instead of the GPU canvas) or dropping
    the up-front capture and relying on the hide-time capture (context loss
    without a hide event is the only case it covers).

46. **On-device loading breakdown (3.15.14, author's log), 8.2 s from page
    start to the projection layer:** start 541, kiosks 684, player 1223,
    companions 111, townsfolk 104+97+88+44+61+573+493+585+44+111+488 (2.7 s),
    creatures 519, pickups 99, batching 145, placing 614, shaders 8 slices
    64+16+15+16+16+17+18+16 (0.18 s), first draw 847, effects 17, textures
    (the canvas capture) 792, the rest under 60 ms each. So the Quest's time
    is JavaScript world-building (procedural models for the player, five
    heavy townsfolk at about 0.5 s each, creatures, kiosks), not shader
    compilation. Cutting it means building models faster or building fewer
    before the handover (deferred builds for NPCs that start far away), which
    is content-risky; recorded as the T12 lead. The texture capture at 0.8 s
    is the one cheap cut if it is ever needed. Panel: the author found the
    3.6 m / 2.6 m panel (about 40 degrees) still "much too close"; it is a
    size problem, not a distance one: 3.15.15 uses 1.8 x 0.9 m at 4 m (about
    25 degrees), 0.2 m below the eye line.

47. **Layer swaps and the adaptive render scale (3.15.16).** The author's log
    for the `sharp` experiment: `projection layer live, scale 1.2` at 8.6 s,
    `scale 1.1` at 12.5 s, `scale 1` at 56.7 s, and "one quick black flash
    after loading in": each swap put a fresh, undrawn projection layer in
    front for a frame. The shim now inserts the new layer BEHIND the old one
    (layers composite in array order), renders into it, and drops the old one
    after the second frame (`projection layer swapped to scale ...` in the
    log). The author also found the sharper picture better, so the release
    adopts quality levels [1.2, 1.1, 1, 1, 1] with foveation [0, 0, 0, .5, 1]:
    sharp when there is headroom, today's native look under load, and the
    governor's existing hysteresis (1 s over budget to step down, 4 s under to
    step up, 30 rebuilds per session at most) paces the swaps. The sharp
    experiment is retired (author's call); the `native` variant reverts to 1.0
    everywhere for A/B tests. The play test exercises a swap in layers mode.

48. **Sharper Gallery painting (3.15.16/17).** Gooward's large painting at
    the Gallery kiosk is a triptych painted in a worker by `paintGallery`,
    which scales with its canvas (`ART.s` pixels per unit): 1.5 gave a
    3072x1158 canvas (1024x1158 per panel for 2.3 x 2.6 m); now 2.0,
    4096x1544 (1365x1544 per panel), and the art textures take anisotropy 16
    instead of the global 8. Headless the worker finishes before the boot
    ends; checked by a headless screenshot (`tools/.runs/gallery.png`). The
    school mural was briefly given the same treatment (2x into its own
    texture) and reverted at the author's request: it was fine as it was.

49. **Loading: the blob-body march (3.15.19).** `tools/slice_profile.js`
    (CPU samples attributed to the boot slices, clock-aligned through
    `Performance.getMetrics`) put 60-75% of the five heavy townsfolk, the
    creatures and the kiosks in `sdE`/`field`: `blobBody` builds a character
    body by ray-marching 4941 rays (80 x 60 sphere grid) from 2.6 m inward in
    2 cm steps until the smooth-min ellipsoid field turns negative (up to 130
    field evaluations per ray, each summing every part), then bisecting 14
    times and taking a 6-sample gradient. The field is a distance bound (iq's
    ellipsoid bound under a smooth min, which only shrinks it), so the march
    now steps by 80% of the field value, clamped to 2-15 cm: the same first
    crossing in a few steps, the same bisection after it. `tools/geom_compare.js`
    boots the asset before and after and compares every character's vertices:
    identical to within 1.8e-6 m. Headless, the heavy townsfolk slices went
    from 604/416/521/453 ms to 273/220/264/227 ms, creatures 402 to 197,
    kiosks 657 to 507; on the headset that is about 1.5 s of the 8.2 s. The
    second mesher (`BORN.kingdino`, start 2.4 m) got the same change.
    Remaining per-body cost is the 14-step bisection and the gradient (20
    field evaluations per ray) and the vertex colouring (`hard`).

50. **3.15.19 confirmed on the headset (author's full run, no new issues).** It
    is the upload candidate: the root `GreeblisTown-release.apk` is that build
    (versionCode 20). The Event ran without the white flash (B12 closed), the
    25-degree panel, the native-start governor and the sharper Gallery painting
    all passed. A 3.15.20 that starts the texture download at page start
    (overlapping the script parse, about 0.1 s headless) is parked: it touches
    the entry script, and the rule is that such changes get a headset run
    before they ship; it goes into the next build after the Store upload.

51. **Loading panel, third size, and a horizon (3.15.21).** The author found
    the 25-degree panel at 4 m still too close on 3.15.19. With a flat-colour
    sky there is nothing to anchor distance, so the panel is sized by its
    angular size alone; 3.15.21 makes it 1.3 x 0.65 m at 5 m (about 15
    degrees), 0.3 m below the eye line, and gives the cube-layer sky a horizon:
    side faces graded from the sky colour to a lighter band at eye level and a
    darker ground below, the top face sky, the bottom face ground. The
    page-start asset download of 3.15.20 rides in the same build (risk judged
    negligible: same promise, same failure paths, only earlier). The play test
    gained three checks: the `local-floor` fallback (`vr-nofloor` scenario),
    session hidden/visible (frames resume), and a WebGL context loss, which
    showed B19.

52. **B20, Hennrick's cuffs (3.15.22).** "Metal and the glowing part
    overlapping": in `__R["hennrick"]` each forearm has a metal cuff
    (`T.cyl(.36,.36,.26)` at z .05, surface at z .41) with three cyan lights
    (`T.box(.08,.04,.02)` at z .40): the lights' front faces coincide with the
    cuff's surface along the tangent line, which flickers at Quest depth
    precision. The lights now sit half inside the cuff (centre z .415) and the
    cuff is .37 (the forearm skin is an ellipsoid of z-radius .34 with up to
    .018 of noise displacement, so .36 was within a few millimetres of it).
    The three cyan strips on the upper arm were checked and left alone. A
    jittered-render probe for one character turned out not to isolate the
    cuffs: the arm parts are merged, so the metal and glow meshes are not
    separate objects; the fix rests on the geometry.

53. **Curved z-fighting: a geometric test, the batcher's parked sources, B20
    completed (3.15.23).** The author asked for any remaining z-fighting to be
    caught. Two facts shaped the tool. First, the headless renderer cannot show
    it: SwiftShader's depth precision is finer than the Quest's, so the pre-fix
    cuff (a flat face tangent to a cylinder) does not flicker here under any
    camera or near-plane jitter (`zfight_sweep.js`, 568 views, found nothing).
    Second, the planar test had been reading the batch meshes' vertices as
    world positions, but the batcher stores each part in its own local space
    and places it with per-part uniforms in the vertex shader (`gcR`); the
    merged source meshes stay in the scene, parked on layer 31 with live
    matrices (the raycaster uses them). Both tests now take the parked sources
    as the world geometry and skip the batch meshes, and isolate on layer 30
    (31 belongs to the batcher). `tools/test_coincident.js` is geometric: every
    drawn triangle up to 0.6 m goes into a 5 cm hash; pairs from different
    surfaces with different looks and normals within 15 degrees are sampled
    2 mm apart for points within 0.5 mm of the other's plane and inside it
    (1 mm from its edges, so tiles meeting at an edge do not count). Counting
    again at a fifth of the tolerance separates the cases by how the region
    grows: coplanar faces 1x, a flat face tangent to a round one about 2.2x,
    two surfaces crossing at an angle about 5x; only the first two fail. The
    whole town is 640k triangles and 115k sampled pairs, about 7 minutes.
    Every material in the character models is DoubleSide, so a face shows
    both ways and the facing rule rarely excludes anything. On 3.15.22 the
    test still found a depth fight on Hennrick's cuffs: the middle light's top
    face (y -.99) lay exactly in the plane of the cuff's top cap, a cyan sliver
    in the metal seen from above, the likelier reading of the author's "metal
    and the glowing part overlapping" than the tangent front face 3.15.22
    fixed. 3.15.23 moves the lights 1 cm up. Six other depth fights remain and
    are the author's call (pictures in `tools/.runs/coinc/`, keys in
    `tools/zfight_baseline.json`): Anomalee's two screens on their panels, a
    brown patch on Mushroom's stem, the two-tone top of the pedestal at the
    town centre (2.64 m up), and two twig ends inside one tree's blossom
    cluster (2.9 m up). 37 crossings (strips through skin, caps through
    bodies) are listed, not failed.

54. **The listed z-fighting instances: three fixed, seven that cannot be seen
    (3.15.24).** The author asked for all ten candidates fixed. Reading the
    triangles behind each one (`--dump` in both tests) sorted them into two
    kinds. Three are real and are fixed by millimetre nudges that change
    nothing visible: the parapet band on the Store, Bank and Fire Station
    fronts shared the wall planes and overlapped them by 1 cm (B21; the
    "perimeter wall against the hills" was the Fire Station's back wall seen
    from outside the town); Mushroom's hat band rested flat on the brim (B22);
    the Robin's tail feathers overlapped in one plane and the white tips sat in
    the feathers' undersides (B23). The other seven are contacts the headset
    cannot show: the juice stand pair was the undersides of a floor slab and a
    plank at y 0, seen only from below the ground; the two church pairs were
    wall tops buried inside the roof slab and a wall end buried inside the end
    wall; the pedestal pair was a cone base resting on a cylinder cap, each
    hidden behind the other's body (the test paired them only because the
    materials are DoubleSide); Anomalee's two screens are thin boxes glued to
    their panels, whose back faces coincide with the panel but are hidden
    behind the screens' own front faces. Both tests now classify these as
    hidden instead of reporting them: faces pointing down at ground level,
    two closed solids touching back to back (closedness from the edge count,
    since geometry types are not preserved), and contacts buried 2 mm or more
    inside a third box (boxes recognised by their 8 corners and 12 triangles).
    The baseline of accepted fights is empty again.

55. **The VRC check and the focus-aware fix (3.15.25).** The author asked for
    the build checked against all relevant VRCs as the last part of the test
    pass, with a first-try pass as the goal. `tools/VRC.md` maps all 80 active
    checks (Meta's list read on 2026-10-27) to evidence, a headset step, a
    dashboard item or N/A. Two gaps came out of it. VRC.Quest.Input.4 wants
    hands and controllers hidden while the system UI has focus: the game
    already kept rendering and ignored input in the `visible-blurred` state,
    but three.js stops updating controller poses then, so the rays and hand
    meshes stayed frozen in view; B24 hides them on blur. VRC.Quest.Privacy.4
    wants the policy to say how deletion is requested even when nothing is
    collected: `tools/store/privacy.html` has the section, the author uploads
    it. What cannot be shown from here is on the headset list in RELEASE.md
    step 7: the frame rate as the reviewers measure it (OVR Metrics Tool, 60
    fps outside loading), the seconds from the icon to the loading panel (the
    4-second rule), the Universal Menu behaviour, and the recentre. The
    loopback-server packaging is not covered by any VRC; the submission notes
    should say in a sentence that the app is self-contained and uses no
    network, in case a reviewer asks.

56. **Performance pass and Zollod's kiosk (3.15.26).** The author measured
    the Event (the planting event, GARDEN EVENT; not Sparkakus's Speech) at 38 fps on the headset and asked for as much as can be done
    without further testing, with the rule that nothing visible changes.
    Headless facts: the Event adds almost no draw calls or triangles (the
    `event_probe.js` counts barely move), the game logic with rendering
    stubbed is 0.7 ms a frame in the town and 1.8-2.1 ms in the Event's second
    half (`bend`, the per-vertex tentacle sway; the creature ground-fit scan;
    `updateMatrixWorld` over 1,800 objects), roughly three times that on a
    Quest, and the one profiled collapse (90% in `uniform3fv`) was a GPU sync
    during the pillar and the night transition, the Event's fill-heavy
    moment. Done: P1 governor reacts in half a second; P2 the pickup glow's
    light-on shader variants are compiled during loading: the game's own
    pre-warm threw on this three.js build (`getWorldDirection` missing) and
    its call swallowed the error, so the variants compiled on the first
    pickup (78 ms) and the battle panel's program on the first battle
    (1,154 ms headless); both are gone (10 and 17 ms). P4 a sweep before
    each render hides standard materials at opacity 0 (daytime stars, Event
    props waiting at the campfire, the day sky at night), pure fill-rate
    savings. P5 the ground-fit scan runs every second frame while a creature
    moves and every eighth while it stands. Not done, because each would
    change the look: fewer lights (the Event turns the point light on and the
    scene to night, which doubles the lit shaders' cost), Lambert instead of
    Phong on the garden flora, foveation at the start level, lower render
    scale; and freezing static scenery's matrices, because the game animates
    parts of buildings and the safe set cannot be told from the code. The
    90 Hz idea is closed: it adds GPU load. Still to measure on the headset:
    FPS in the garden before the Event (geometry) against during it (the
    light, the night, the pillar), and the OVR Metrics GPU and CPU
    utilisation during the Event; those decide between a content change the
    author must approve and more logic trimming.

    **P6, the single-sided pass.** The author's hunch that creatures cost the
    most led to the biggest finding: the game patches every three.js material
    constructor to default to DoubleSide, so the whole world (609k of 659k
    source triangles) rendered without back-face culling, and each creature is
    12k to 23k triangles, about as much as the town itself. On a tiled mobile
    GPU every back face costs binning and rasterisation. Before an object tree
    is batched, each geometry is classified once (closed: every edge shared by
    two triangles after merging coincident vertices; outward: positive signed
    volume) and a material whose meshes are all closed, outward and opaque is
    set to FrontSide (297k triangles, 341 materials; a material with any open
    user stays double-sided, and one flipped earlier is flipped back if a
    later tree uses it on an open mesh). The batch material clones carry the
    flag. `tools/sides_check.js` renders 184 views with the flips on and off in
    the same frame: differences are one-pixel silhouette outlines (a grazing
    triangle culled on one side only), no areas. Draw calls are unchanged
    (120). Expected on the headset: roughly half the vertex and binning work of
    everything closed, which is most of what is near the player.

57. **The frame-rate log line and what was not done (3.15.27).** With the
    author unable to test for a while, the game now measures itself: every
    ten seconds in VR it posts `perf fps= level= calls= tris= [event] at=`
    to logcat through the loopback server (HEADSET_DIAG.md), so one run through
    the town, a kiosk, a dialogue and the planting Event gives the frame-rate
    picture with the scene named. PERF.md section 6 records the levers
    investigated after 3.15.26 and why they were not pulled: per-part culling
    inside batches (47% of submitted batched triangles are off-screen when
    facing the town, but a tiled GPU already rejects them in binning), freezing
    static matrices (not safe from the code), and the look-changing ones
    (precision, Lambert, lights, foveation, scale) that wait for the author.
    Creature LOD beyond 20-25 m is the one invisible lever left for vertex
    cost, proposed.

58. **Hardening the performance tools (3.15.27).** The author asked for the
    performance tools to capture issues and their causes. `perf_report.js`
    (PERF.md section 7) runs the game's situations in one booted session
    (town, walking, among the creatures, dialogue, shop, battle, the Speech,
    the Event in three phases) and fails on a shader compile during play, a
    script p99 over 12 ms (16 in the Event), a script frame over 120 ms, or a
    rise against `perf_baseline.json`; each verdict carries the top script
    functions with source excerpts as the cause, and the scene's load (calls,
    triangles, transparent objects, lights, creatures in range) sits beside
    it. Building it showed the software GL compiling its own pipelines mid-run
    (a dialogue advance blocked a GL call for 7 s; the Event for 20 s), which
    had been polluting every headless frame-time figure; the report stubs the
    draw calls by default and times the GL calls separately, so script cost is
    now measured clean. `perf_log.js` turns a headset logcat with the 3.15.27
    `perf` lines into frame rate by scene with a 60 fps verdict and the likely
    cause. First result: no compiles anywhere, script 2-4 ms headless in every
    situation (`updateMatrixWorld` the largest item), the town centre and the
    garden at 300-390 draw calls and 500k triangles both eyes against 66 calls
    and 160k at the spawn.

59. **Draw calls (3.15.28).** `draw_calls.js` showed where the frame's draws
    go: at the town centre about 145 per eye, in the planting Event about 195.
    Every draw happens twice (one per eye; this three.js has no multiview).
    The garden plots were multi-material boxes, five sides sharing one material
    instance and a textured top, so six draws each where two do; thirteen
    appear in the Event. P8 reorders such a mesh's index so each material
    instance's triangles are contiguous, one group per instance, checked every
    frame against the slots it was made for. `opt_identity.js` renders the same
    views with P8 on and off in the same frame: identical pixels, 1,400 fewer
    draws over 92 Event views. The same tool checks the batcher itself
    (identical pixels; 11,283 draws unbatched against 5,166 batched over 40 town
    views). Next: shininess and specular per batch part (P9), which lets
    batches that differ only in those merge (327 to 247 batchable draws per eye
    over the whole scene).

60. **Shininess and specular per batch part (3.15.29).** The batcher merged
    only parts whose materials agreed on everything but colour, which travels
    per part in the fourth uniform row. Phong parts that differed in shininess
    or specular colour therefore needed separate batches, and the town has many
    such pairs. P9 adds a fifth row per part (specular colour) and uses the
    fourth row's spare slot for shininess, written exactly as three.js uploads
    them, and the batch shader reads them through a flat varying in place of
    the material's uniforms. Measured: the whole scene's batchable draws drop
    from 327 to 247 per eye; over 40 town views the batched frame draws 4,580
    times against 5,166. `opt_identity.js` renders every view batched and
    unbatched in the same frame: identical pixels. The part limit per batch is
    recomputed for five rows (still 32 on a Quest's 256 vertex uniform vectors).

61. **A blind spot in the identity check, found and closed.** Rendering from a
    VR session (fake XR) left three.js's XR framebuffer bound, so a tool asking
    for the canvas read black pixels. Two black images compare as identical:
    `opt_identity.js`'s first Event-phase result for P8 and its first batched
    against unbatched result for P9 had compared nothing. Found while building
    the visibility census, which saw every mesh as never visible. Both tools now
    clear the XR framebuffer override before rendering (the game's frame loop
    binds it again on the next XR frame) and refuse blank or uniform images.
    Re-run with real pixels: P8 and the batcher with P9 inside it render
    identical pixels at load and 25 s into the planting Event. The earlier P8
    load-phase result (desktop session) had been valid. The other pixel tools
    boot desktop sessions, except `flash_probe.js`, which reads the XR frame on
    purpose.

62. **The visibility census and indexed batches (3.15.30).**
    `visibility_census.js` renders the town in ID colours from 103 standable
    positions, three eye heights, six directions each, and counts every opaque
    mesh's pixels. Only 7 meshes (0.4% of opaque triangles) are never visible,
    so the town wastes almost nothing behind walls or underground. The finding
    was density instead: several meshes carry thousands of triangles for a few
    pixels of screen. Many meshes are also non-indexed, three vertices per
    triangle with none shared, so the GPU cannot reuse a transformed vertex.
    P10 indexes the batch copies (bit-identical vertices merged within a part):
    batch vertices 499,058 -> 215,258 for the same triangles, identical pixels,
    no loading cost. The unbatched big meshes (ground, kiosks, roofs; about
    1.8 million vertex runs over the whole scene, half of them shareable) keep
    their layout because game code may edit their vertices; see PERF.md 8.

63. **Indexed scenery, and what the GPU side is not (3.15.31).** The biggest
    meshes (kiosk bodies, roofs, the garden bed) come from three merge steps
    in the game (`io` over static scenery, `v` for buildings, `mergeBin` for
    the kiosks), all of which convert their inputs to non-indexed geometry.
    P12 indexes their output where it is built: bit-identical vertices share
    one index, same triangles in the same order. The creature merge is left as
    it is, because the ground-fit scan samples every sixth vertex of a
    creature's arrays and must keep seeing the same samples. Vertex runs of the
    meshes drawn as themselves: 1,062,441 -> 576,758 over the whole scene. The
    batcher's 4,000-vertex cap reads each mesh's original count, so batching is
    unchanged. A first attempt (big meshes as batches of one) was reverted:
    PERF.md 8.

    Three new probes ruled out other GPU causes. `fill_probe.js`: transparent
    layers average 0.04 per pixel (worst view 0.2), so fill is not the
    problem. `overdraw_probe.js`: 1.82 opaque fragments shaded per covered
    pixel in the game's order, and front to back would save only 5% (big
    batches and the ground span many depths), so the sort stays. The Event's
    two point lights (cut-off 11 and 12 m) stay off through its 90 s headless,
    so lighting is not the Event's cost. `alloc_probe.js`: 7-35 KB/s allocated,
    garbage collector 2-3% of main-thread time, so no collector pauses.
    `visibility_census.js`: 0.4% of opaque triangles are never visible.

64. **The tentacle bend (3.15.32).** While the tentacled creature dances (it
    does in the planting Event), `bend` recomputed all six tentacles every
    frame with three to five sines and cosines per vertex; late in the Event
    it was a tenth of the game's script time. The terms depend only on a
    vertex's distance along the tentacle, which the ten vertices of a ring
    share, so P13 computes them once per ring and reuses them while the input
    is bit-identical. `test_bend_exact.js` runs the original function and the
    patched one on 400 generated tentacles (ring order, shuffled order, before
    the bend starts, zero curl, zero lift) and compares every output word:
    identical. 39 -> 14 microseconds per tentacle headless. Creature code, so
    the test sits in the standard tier.

65. **Multiview, as an experiment (built on 3.15.33).** Every draw was issued
    twice, once per eye, and in the Event about 300 draws per frame each pass
    through three.js and the browser's GPU process. Multiview draws both eyes
    in one pass. The bundled three.js (r128 or close) has no multiview, so the
    experiment adds it:
    - a texture-array projection layer, one slice per eye, attached with
      `OVR_multiview2` (and `OCULUS_multiview` for the headset's 4x MSAA, which
      resolves on the tile, so the per-frame resolve blit goes too);
    - a `multiview` program parameter: such programs get the extension,
      `num_views = 2` and macros that pick each eye's matrices; the left eye
      reads the uniforms three.js always uploads, the right eye reads its own
      model-view, normal, view and projection matrices, computed on the CPU
      exactly as three.js computes them for that eye; lights for the right eye
      are moved or rotated in the shader (rounding only);
    - the render loop draws each object once with the left camera;
    - the loading warm-up compiles and uploads the multiview programs (renders
      go into a tiny multiview target while loading), so VR entry compiles
      nothing; renders with XR switched off keep the ordinary programs;
    - the batcher reserves vertex uniforms for the extra matrices (a Quest may
      allow only 256 vectors);
    - the decision is made once at boot (layers session, WebGL 2, the
      extensions); an incomplete framebuffer logs and falls back to the
      classic path.
    `multiview_check.js` renders the same frame both ways in one step and
    compares each eye: spawn, town centre, garden and the Event are
    bit-identical apart from a handful of right-eye pixels differing by 2 in
    channel sum, and draw calls are exactly halved (Event 244 -> 122, town
    centre 264 -> 132). The standard tier on the experiment in multiview mode
    passed apart from a 2D-mode check that failed the same way on the release
    (see 66). Headless has `OVR_multiview2` but not `OCULUS_multiview`, so the
    MSAA variant is the one thing only the headset can show.

66. **The play test's 2D window measured the boot.** After the session moved
    to a slower container, `test_play.js`'s 2D mode counted 15-35 frames in
    20 s for the release and the experiment alike. It started timing when the
    gate text left "Loading...", which happens before the shader warm-up; on
    this machine the warm-up took about 28 s. The test now waits for the game
    loop to start (as the harness does): 119 fps for both builds.

67. **The multiview flashes (3.15.34).** The 3.15.33 experiment ran at 72 fps
    in town and 58-65 in the Event on the author's Quest 3S, but showed
    full-screen flashes on pickups, on menu hovers and now and then otherwise.
    The author's video (`video_check.py` finds them) shows one-frame
    washed-out pictures, not black or broken ones. Cause: three.js uploads a
    changed texture the first time it is drawn, in the middle of the frame;
    in Chrome a canvas upload goes through the GPU process with its own
    framebuffer, and switching framebuffers in the middle of a multisampled
    multiview frame (rendered straight into the headset's image, resolved on
    the tile) makes the GPU save and reload the half-drawn frame, which came
    back brighter. The classic path rendered into ordinary buffers and
    copied at the end, so it never showed this. Fix: every texture marked
    dirty is uploaded before the frame starts drawing (the hook sits on
    three.js's `Texture.needsUpdate`, reached through `CanvasTexture` because
    the bundle exports no `Texture`). The game now counts any texture
    upload, mipmap build, pixel read, blit or framebuffer switch while a
    multiview frame draws and logs the first twelve; `multiview_check.js`
    fails on any (pickups, dialogue, shop, battle, the Speech, the Event):
    211 uploads moved before the frame, none during. The pre-pass uploads a
    few small textures the classic path would not (repainted while unseen):
    a few MB over a session.

68. **Devices and tool hardening (3.15.34).** The author tests on a Quest 3S;
    the Quest 2 (and the original Quest) are not supported (manifest
    `questpro|quest3|quest3s`, asserted by `check_apk.sh`). Headless Chromium
    reports far higher GPU limits than a Quest (4096 vertex uniform vectors
    against 256), which would hide a shader that cannot link on the headset;
    the fake headset now takes a device profile (`GT_DEVICE`: user agent and
    GPU limits) and `uniform_budget.js` counts every compiled program against
    it, in multiview and the classic fallback: worst vertex shader 191 of 256
    (multiview, batch parts 27 per batch) and 197 (classic). The game logs
    its real limits and GPU name at boot (`gpu: ...`), which confirms or
    corrects the profile. Also: `GT_HEADSET_FOV=1` (Quest-shaped eyes: the
    Event draws 260-330 per frame facing the garden, as the headset logged),
    `draw_calls.js --at` (the headset's logged positions), `video_check.py`
    (flash frames and the OVR Metrics overlay from a recording), and
    `perf_log.js` per-device verdicts.

69. **The Gem's shader, and where vertex work stands (3.15.35).** The clean
    standard tier on 3.15.34 failed one check: a shader program compiled
    during play (B27), in some runs only. The game now logs any such program
    with its key, and `multiview_check.js` diffs the key against the warmed
    programs and names the material: a Phong program identical to a warmed
    one except `flatShading`, compiled in 2 of 7 runs. It belongs to the Gem
    the Speech assembles from the three Artifacts, whose material the game
    creates the first time the Gem is built; the check waited a fixed 8 s in
    the Speech and only sometimes reached it. Fix: the Artifact module builds
    the Gem pieces and a glue drop during the effects warm-up, out of sight,
    the scene is compiled and they are removed. The check now waits until
    the Gem is in the scene. Also measured, with the new
    `tools/vertex_census.js`: in the Event at headset field of view the drawn
    creature meshes are all but three indexed already (1,703 duplicate
    vertices in all), batches and scenery none; indexing creatures, the last
    vertex lever left without a visible change, would save nothing. Draw
    order is already by program, then material, then depth (three.js's
    opaque sort), so grouping draws by shader would change nothing either.

70. **What is left that changes nothing on screen (3.15.36).** With the
    Event most likely GPU-bound on the headset (the script time measured
    here, scaled, is 8-11 ms against the 13.9 ms budget), the per-pixel work
    was checked for waste. Lights: a hemisphere light and two directional
    lights all the time; both point lights are hidden, not left on at zero,
    so no shader pays for them. Vertices: see 69. What was found: the
    headset path renders into the game's own multisampled depth buffer
    (`OCULUS_multiview` resolves on the tile), and nothing told the driver
    that depth was finished, so a tiled GPU writes the whole resolved depth
    buffer back to memory every frame (2 x 1832 x 1920 x 4 bytes, about
    28 MB; 1.7 GB/s at 60 fps). P14 invalidates the depth-stencil
    attachment after the frame's last draw (outside the frame: the hazard
    watch now counts invalidations, which mid-frame would discard the
    picture). Headless with `GT_LAYER_DEPTH=0` (the game's own depth buffer,
    as on the headset) it runs every frame and every multiview pixel
    comparison still matches. The CPU side: `tools/matrix_trace.js` shows
    2,692 objects in the Event scene, about 1,400 of them (the dancing
    creatures) changing every frame, 41% in subtrees that never change; the
    scene root recomposes its identity matrix every frame and so forces
    every world matrix to be recomputed. Turning that off (P15) leaves all
    2.36 million checked world matrices bit-identical, but saves nothing:
    alternated every 60 frames in one session (`matrix_trace.js --ab`), the
    update took 2.107 ms with it and 2.094 ms without (mean). The walk over
    the objects is the cost, not the multiplies it skips (as with the matrix
    cache in 61). Not applied. Texture uploads were checked as well: once the
    town has been seen, the Event uploads a handful of 64x64 labels in ten
    seconds (0.002 MB a frame); nothing is re-uploaded unchanged.

71. **The governor already meets the Event at its lowest level.** Proposed
    and approved as a change (go straight to the Event's level instead of
    stepping down over seconds), then found in the code: the XR update calls
    `Fe(me.active)` the frame the planting Event starts, which sets the
    lowest quality level at once (`Ae(quality.length-1)`: scale 1, full
    foveation), locks the governor there for ten minutes (`finaleLockMs`)
    and hides far scenery; the headset log showed level 4 throughout the
    Event. The step-by-step climb (36 frames over budget, 2 s between steps)
    applies only to ordinary play. Nothing to change.

72. **The Event's adaptive render scale (P16, 3.15.37).** Everything that
    leaves the picture identical had been done (70, 71), and the author's
    requirement is to stay steadily above 60 fps. Of the options put to the
    author (an adaptive scale in the Event, coarser distant creatures,
    anisotropy 16 to 8, waiting for the OVR reading) the author chose the
    first. The governor's only step below its lowest level was the emergency
    0.82 scale at 1.6 times the frame budget (about 45 fps), which the
    Event's 58 fps never reaches. Now, in the Event and at the lowest level,
    a smoothed frame rate under 62 fps for 216 frames drops the scale to 0.9
    for the rest of the Event (19% fewer pixels; the picture is a little
    softer), and the Event's end restores the level's own scale, unless the
    emergency drop fired meanwhile, which by the game's rule stays for the
    session. `tools/test_governor.js` slows frames on purpose (a busy loop)
    and checks: no trigger in town, the trigger in the Event with a layer
    swap and multiview still live, the end of it. Estimate on the author's
    Quest 3S, from the 3.15.33 run (58-65 fps at the lowest level): about
    64-70 fps once engaged, if three quarters of the Event's GPU time scales
    with pixels; the first three seconds of the Event stay as before.

73. **The Quest 3 and a second step (P17, 3.15.38); the Event performance
    work closed.** A Quest 3 renders noticeably more pixels per eye than a 3S,
    and the author cannot test on one. Two refinements of P16, the author's
    choice: (1) on a Quest 3 (user agent "Quest 3", not "Quest 3S") the Event
    starts at the 0.9 scale at once; the governor's level change picks the
    Event scale itself, so the drop and the scale come in one layer swap (two
    swaps in a row could show the second, undrawn layer: the shim composites
    a new layer behind the old one for two frames); (2) on any headset, still
    under 60 fps for 216 frames at 0.9, the scale steps to 0.82 (the game's
    emergency scale, which otherwise waits for about 45 fps). Both end with
    the Event. Testing, as exhaustive as headless allows: `test_governor.js`
    plays two Events per session. The first starts from level 0 (the
    governor stepped up for real to a 1.2 layer, as in town on a headset)
    with the budget raised so the emergency drop cannot fire, and checks the
    town (no trigger), the drop to the lowest level, the Quest 3 start at
    0.9 in one swap or the 3S's single swap to 1, 0.9 under 62 fps, 0.82
    under 60, frames and multiview throughout, the return to 1 at the end.
    The second starts at the lowest level (the Quest 3's other branch) with
    the normal budget, where the emergency drop fires too and correctly
    stays. Run for the Quest 3S and the Quest 3, multiview and classic: all
    pass. The headless frames are slowed on purpose, so the steps are proven;
    the frame rates themselves are estimates until a headset runs it. The
    harness now reaches the governor in its test copies (it lives in another
    scope than the debug hook).

74. **B27's second variant, and checks that cannot be lucky (3.15.39).** The
    3.15.38 standard tier failed `multiview_check.js` again on a flat-shaded
    Phong program compiled during the Speech. The Speech draws the Gem under
    Sparkakus's light bulb, whose point light is part of the shader key; the
    3.15.35 warm-up compiled the Gem only with the town's lights, so the
    check passed or failed depending on whether the bulb was lit when the
    Gem first drew. The warm-up now also runs `Bulb.warm()` with the Gem in
    the scene. To stop relying on timing, `multiview_check.js` now builds the
    Gem pieces at load and compiles them both ways, counting only programs
    the Gem's own materials use (a whole-scene compile also visits hidden
    controller rays and labels): 3.15.38 fails it (one flat Phong program,
    with the bulb), 3.15.39 passes. `test_content.js` fails on any program
    compiled during its play, which covers far more of the game (gifts,
    outfits, battles, the robin, vignette tokens, the Event, Backpacka): none.
    Also from writing the content test: there are 90 two-line vignettes
    between townsfolk (not 78) plus the Ancient's 12; a dancer's gift line
    "Let's dance!" starts their battle when it closes; the battle module
    clears its state if a second battle opens over the first, which a player
    cannot do (no menu while a panel is open) but a test can.

75. **The emergency drop ends with the Event (P18, 3.15.40).** Cross-checking
    VRC.Quest.Performance.4 (recommended: render scale at least 85% for the
    majority of the experience; "individual, non-consecutive sequences such
    as boss battles may drop below 85% ... but must return above 85% after")
    against the governor: P16 and P17 end with the Event, but the game's own
    emergency drop (0.82 after three seconds at 1.6 times the frame budget,
    about 45 fps) stayed for the rest of the session. The author chose to
    end it with the Event too: when it fires during the Event it is marked
    and cleared at the Event's end, and the level's own scale comes back.
    Fired in ordinary play it stays, as the game always had it (and the
    Event scale then stays out of the Event). `test_governor.js` covers all
    three: the drop held off, fired during the Event (cleared at the end),
    and fired in town (stays).

76. **One light at a time (P19, 3.15.41).** `warm_coverage.js` builds what
    the game creates on first use (the Gem pieces and the glue drop,
    Backpacka), then compiles the whole scene under each point-light state
    and lists every material that gets a program it did not have. Three.js
    puts the number of point lights into every lit shader's key, and the
    game has two: the Portal's blue light (on from the pizza call until the
    courier is back) and Sparkakus's bulb (during the Speech). With none,
    one or the other, every lit material on show is warmed at load (B27
    covered the Gem under the bulb). With both, the town's lit materials
    needed a third set of programs that nothing compiles: a player who
    calls for pizza and reaches the Speech before the courier is back would
    pay a compile stall on many materials at once, in the Speech. The
    author chose to hold the Portal's light off while the bulb is lit
    rather than warm a third set (more load time and memory for a rare
    case). The lights are 16.3 m apart and the Portal's reaches 11 m, so
    nothing near the bulb was lit by the Portal; the Portal's glow,
    particles and mesh are unchanged. The check now runs both lights only
    on builds without P19 and, on builds with it, opens the Portal, lights
    the bulb and counts every rendered frame: 3.15.40 fails, 3.15.41
    passes. Also new: `test_greet.js` for the townsfolk's greeting (stop
    and face the player within 3.2 m, go on after 12 s, greet again only
    after the player has been 6 m away; Sparkakus's "!" from 6 m).

77. **The performance report's baseline, and machine speed (3.15.41).** The
    full tier on 3.15.41 failed `perf_report.js` in every situation by about
    the same factor: script p50 4-8 ms against a baseline of 2.1-2.8 ms. The
    baseline had been written on 3.15.27 (before multiview) on a faster
    machine, and kept raw milliseconds. On one machine, run back to back,
    3.15.40 and 3.15.41 matched within its noise (p50 6.0-7.9 and 5.8-8.0
    ms; no shader compiled during play in either), so the build changed
    nothing; the container also restarted three times during the tier and
    its speed varied from run to run (the new workload, 4.1 to 5.7 ms). The
    report now times a fixed in-page workload (matrix maths and small
    objects, like the game's script) before and after the situations; the
    baseline keeps that time (the faster of the two, since a load spike only slows it; written from the 3.15.41 run, 5.0 ms) and
    every run scales the baseline's times by the ratio, and the absolute
    limits (p99 12 / 16 ms, max 120 ms) by the ratio to the machine they
    were set on (about 2.0 ms, estimated from the 3.15.27 baseline), never
    below their own values. Checked: 3.15.41 passes against it. The old baseline is kept in
    `tools/.runs/perf_baseline_v27.json`.

78. **Five more of the test plan's open rows (3.15.41).** Roaming, the Mama
    Gorbo and Gooward meetings, the jazz drums' timing, audio leaks, and far
    detail with the batcher now have tests in the standard tier. They found
    no game fault; what they taught about the game: kind "creature" is only
    Zollod (the others are townsfolk with posts, and the roamers are Gooward,
    Hennrick, Mama Gorbo and the three dancers); solid zones are the
    clearance roamers keep when they pick a spot, while some posts sit beside
    scenery by design (Fortizmo's); the release's batcher writes five vec4 a
    part (its shininess and specular, from our fix list) where the original
    wrote four; the drums switch clocks 1.5 s after the player stops hearing
    them, and a switch starts the bars again; Sparkakus's periodic walk to
    his shelves makes him busy, which ends a vignette (the content test now
    waits for free speakers and holds him, as the game does for a visit);
    and `me.active` (the Event) is a read-only getter, so a test starts the
    real Event to see what it stops.

79. **The 3.15.41 headset run on the Quest 3S: the flashes are back, and
    the Event is limited by draw calls.** The author's log (saved by
    PowerShell as UTF-16, which `perf_log.js` now reads) and reports:
    - **The Quest 3S calls itself "Quest 3".** Its browser's user agent says
      "Quest 3" (the perf lines read `dev=Quest_3`; the system log names the
      headset `panther`, the 3S). So P17's Quest 3 branch (start the Event at
      0.9) ran on the 3S: the user agent cannot tell the two apart.
    - **The Event, at scale 0.9: 55-61 fps; after 216 frames under 60 the
      step to 0.82: 58-65.** 17% fewer pixels bought 2-3 fps, so the Event is
      not limited by pixels (the estimates in PERF.md 11 assumed it was, and
      were wrong). The frame rate follows the draw calls (correlation -0.80;
      triangles -0.57): about 315-340 draws give 55-61 fps, 200-220 give
      62-67. The levers are fewer draws and less work per frame.
    - **Flashes: bright and washed out**, like F-B26: three in the first run
      (one walking about, two partway through the Event), on a second launch
      (better frame rate throughout) one when the Summoning Pillar started the
      Event and one while planting. The log kept only the last 110 s (logcat's
      ring buffer), with no hazard or compile lines but two layer swaps.
    - **Two suspects.** (1) Render-scale layer swaps: the Event's start swaps
      to 0.9 on the 3S, the 0.82 step swaps again, the governor's levels swap
      in town. (2) Uploads the hazard watch did not count: headless, the
      Event's start uploads new geometry (`bufferData`) while a multiview
      frame draws, and planting adds new objects; the watch counted only
      texture calls and logged only its first 12 hazards per session.
    - **Experiments**: `flashlog` (plays like the release; B on the right
      controller, the one free button, writes "MARK flash seen"; the watch
      also counts texture storage, framebuffer attachments, renderbuffer
      storage, buffer uploads, flushes and syncs, logs up to 300 with frame
      numbers and puts its totals in the perf line; long frames and the old
      layer's destruction are logged) and `noswap` (the same, and the layer
      is never rebuilt: every scale stays 1, only foveation changes). Both
      checked headless: no page errors, the marks logged, no swap in noswap.
      Capture the whole session live: `adb logcat -c`, then
      `adb logcat -s GreeblisServer > run.txt` while playing.

80. **The noswap run: the flashes come with new textures.** In the
    `noswap` build (no layer swaps at all) the author marked two flashes in
    the Event and saw more during dance battles and talking to Nextessa.
    Around the first mark the perf lines show no swap, no long frame and no
    hazard at all while a frame drew; the only thing that happened was one
    new texture, uploaded before the frame by the F-B26 fix (`pre` 1129 to
    1130, `tex` 219 to 220). Around the second, five new textures (and 21
    geometry uploads during frames). Battles open a new panel texture;
    Nextessa's visit makes new canvases (her pizza box's lid). Dialogue text,
    which redraws an existing canvas every few letters, does not flash. So the
    swaps are not the cause, and uploading a texture before the frame draws is
    not enough on the headset: the upload is still inside the XR frame, after
    the headset's image is bound. The `deferupload` experiment keeps every
    texture upload out of the XR frame: during multiview play a texture
    marked for upload is held back (its old content drawn for that frame) and
    uploaded in a separate task right after the frame is submitted; an object
    whose texture has never been uploaded is skipped for that one frame (a new
    label shows about 14 ms later). Headless: no page errors, textures
    uploaded between frames, none inside a frame; every multiview pixel
    comparison still matches. The two checks of `multiview_check.js` that
    fail on it are the experiment's own (no pre-frame uploads any more; the
    widened watch counts geometry uploads), to be updated if it is promoted.

81. **The deferupload run, and the panels' three canvases.** The author's
    deferupload run still showed flashes (one marked in the log's window,
    1.7 s after the Event's layer swap to 0.82, the old layer destroyed
    0.1 s after it), and a new glitch: in dance battles and the interact
    menu, quick presses and hovers made the window flash between states.
    The second was the experiment's own: every VR panel (battle, dialogue,
    menu, wrist HUD) paints into the next of three canvases and swaps it in
    at once; with the upload held back a frame, the swapped-in canvas still
    held what it showed two redraws earlier. Fixed in the experiment: a
    panel keeps its last uploaded canvas and swaps to the new one once that
    is uploaded; a headless probe drives bursts of three redraws per frame
    on the battle panel and the menu and checks the generation on screen
    never goes back (0 of 173 frames; the newest shows at the end). The two
    flash causes now each have one run behind them: new textures uploaded
    inside a frame (noswap run) and layer swaps (this run). The `deferswap`
    experiment has both changes (no upload inside a frame, no swap) and an
    upload log that no longer runs out (the wrist HUD's routine uploads used
    up its 300 lines early). Frame rate: this Event drew 408-445 calls at
    52-58 fps, more than earlier runs, still following the draw calls.

82. **Flashes and textures made during play; the Event's pizza (in progress).** The author placed the flashes
    precisely: when Nextessa emoted after being spoken to, in dance battles, while planting, at the Summoning
    Pillar. Each of those makes a texture on the spot. An emote is a 64x64 canvas per glyph and colour, made the
    first time the pair shows, and most callers picked the colour at random (seven for a chat or a battle hit,
    five for a new plant). The Event's start makes the pizza's printed lid; Nextessa's arrival makes the lid of
    the pizza she carries (anew at every call); Montgummery's screen makes each face the first time he shows it;
    every text chat between townsfolk makes two speech-bubble textures and throws them away; the shop's mirror
    makes its gradient the first time it opens. Redrawing a texture that already exists (the dialogue box does it
    all the time) was never seen to flash, so a texture made and allocated mid-play is the lead. The author:
    "no emotes need to be random colors. It would be better to standardize them." F-B29 gives each glyph one
    colour and makes every glyph's texture while loading; F-B30 makes the rest while loading and keeps them (the
    bubbles come from a pool, one per speaker and height, redrawn per line). `texture_census.js` plays those
    situations and fails on any canvas or GL texture made during play. The same textures cost hitches as well
    (a canvas drawn and a texture of up to 1 MB uploaded in one frame), not the Event's steady frame rate, which
    follows the draw calls.

    P20: the Event's pizza (eight stacks of boxes round the garden and the pie of 8 slices) is built after the
    batcher ran, so each part was a draw: 56 of the heaviest Event view's 378. The stacked boxes are split into
    their card faces and printed top (same vertices, same triangles in P8's order) and both groups are batched as
    the plants are; 378 -> 324 draws in that view, and `opt_identity.js` shows identical pixels over 92 Event
    views (1,108 fewer draws). Raising the batcher's part limit from 27 to 33 (the uniform budget has room) was
    measured and dropped: 382 -> 377 draws, and some views draw more triangles. Also: the perf log now records
    the eye buffer's size once per layer, since the Quest 3S's browser reports "Quest 3" in its user agent.

83. **The flash experiments become the release; the Event scale goes (3.15.43, in progress).** The author: "Lets get
    rid of it and close out that option" (the Event's own render scale, P16/P17, and with it P18) and "Lets push both
    experiments into the main build" (deferupload and deferswap). F-B31: no layer swap at all (every quality level and
    the emergency step at the native scale; the governor changes foveation only, on the same layer) and no texture
    upload inside an XR frame (uploads in a task after each frame; an object whose texture was never uploaded skipped
    for that frame; panels keep their uploaded canvas until the next is uploaded). The deferupload/deferswap/noswap
    experiments are retired; flashlog stays for diagnosis. Estimated effect in the heaviest Event view against the
    author's last run (52-58 fps at about 440 draws, scale 0.82): P20 +3 to +5 fps (about 0.024 ms a draw from the
    headset runs: about 350 draws at 61 fps, 440 at 54), back to scale 1 -2 to -3 fps (the 0.82 step bought 2-3), the
    texture and upload changes about 0 on average but no more one-frame spikes: net about +1 to +2 fps there, +3 to +5
    where the pizza is in view. The Ancient behind the church walls: from 17,045 views at least 0.5 m outside the
    church (1 m grid to 30 m, five eye heights, only the church drawn), 3 views from about 30 m show one pixel of it.

84. **The Ancient left out from outside the church (P21).** The heaviest Event view drew the Ancient's 15 parts (11.5k
    triangles) through the church's walls: the church has no door and its interior is closed, and frustum culling
    cannot know that. P21 leaves its body out of a render when the camera is at least 0.5 m outside the church's
    collision outline and the Ancient inside it, and puts it back right after the render, so the loading-time shader
    compiles (which skip hidden objects, including the compile with Sparkakus's bulb on), picking and the tests still
    see it. Proof (`ancient_check.js`): 17,045 views from that far outside (1 m grid to 30 m, eye heights 0.5-2.8 m,
    aimed at it), rendered with and without the Ancient and only the church drawn; 3 views from about 30 m showed one
    pixel (a seam between the interior walls), none of them with the whole town drawn. The full tier runs it on a
    2 m grid. Also measured for the Event: the batcher refuses scenery parts over 4,000 vertices, so nine large garden
    meshes that share one material draw on their own; raising the limit to 60,000 saves 13 draws in the heaviest
    view for 16k more triangles (2.6%) (the views comparison follows).

85. **Gooward's translucent parts merged (P22, prototype for the author).** In the heaviest Event view Gooward drew 30
    times, 26 of them translucent: the 20 bubbles in his goo (3.6-8.6 cm, opacity .55; seen from every side, up to
    about 4,900 pixels at 2 m, so they cannot simply go) and his two wings' three crystals each (.78). The author had
    marked all 26 `mergeTr`, but nothing merged them. P22 merges marked parts that share a parent and a material into
    one mesh that orders its parts far to near before each draw, as three.js orders separate translucent objects (this
    three.js draws double-sided translucent objects in one pass, so the order is the whole difference): 26 draws ->
    3. Other creatures' separate draws are mostly large textured parts; their small details (Etcher's marks, Mama
    Gorbo's pins, Anomalee's cards, about 10 draws) would still show at Event distances (0.2 m at 15 m is about 15
    pixels on a Quest 3S), so hiding them by distance is not proposed. A test harness lesson: a check that waits
    between renders must bind the canvas again before each one, since the XR frame loop binds its own framebuffer
    meanwhile; the first runs of the bubble check and of `ancient_check.js` compared stale images.

86. **The occlusion census's first full run: nothing to remove.** Both states, 741 minutes. Of 653 judged objects, 40
    were never seen from any reachable point at any eye height, in the town or the Event, and all 40 were the UFO
    (the saucer, its 18 lights, the gold portholes, the green pilot and his antennae): the game keeps it hidden and
    flies it over the park every 10 minutes from the 10th (about 15 s each; held off during the Event and at least
    60 s after it), and the census ran neither long enough nor at the right moment to see it. A hidden object costs
    nothing to draw, so it was a false positive. The census let batched parts through its "shown now" filter whatever
    the groups above them; it now judges only what is shown. With the UFO out, every remaining object in both states
    is seen from somewhere the player can stand, so the census leaves nothing to remove.

87. **One game file, edited directly (3.15.43).** The author: "I want all edits applied to the game file itself. Not
    applied after. Please edit the actual file", "this also means adding all changes to the actual uncompressed
    file", and neither the original nor the compressed build needs keeping. Until now the build kept the author's
    original untouched (`tools/uncompressed.html`) and generated the shipped game from it with `apply_entry_fix.py`
    (167 exact text edits, `--verify` proving the result). Now `tools/uncompressed.html` is the game with every edit
    in it (byte-identical to 3.15.43), and every change is made in it directly; `sync_game.py` copies it to
    `index.html` at the root and into the APK, and `--check` (quick tier, pre-commit hook) refuses copies that differ.
    Removed: `apply_entry_fix.py`, `gen_fixes_doc.py`, the shim sources and boot map in `tools/lib/` (their code
    lives in the game file), the compressed build `index.compressed.html` and its `test_parity.js`; the original is
    in git history only. FIXES.md keeps the record of the 167 edits and is the changelog from here on, by hand.
    The diagnostic variants moved to `experiment.py` (applied to a copy, never to the game file); four that no
    longer applied (`native`, `nogovernor`, `directrequest`, `keepalive`: the settings and entry code they targeted
    are gone) were dropped. `test_bend_exact.js` keeps P13's guarantee without the original: its 400 outputs from
    the original are recorded as SHA-256 fingerprints (`test_bend_golden.json`).
88. **The game is rebuildable from the game file alone; painted textures seeded (3.15.44, FIXES R1).** The author:
    the game "can run fully without any outside things", "the game itself can be rebuilt from the index.html file",
    "as a rule this should always be possible", and "we should cut as much randomness as possible" (Flint and
    Blossom spawns, where NPCs wander, NPCs' interactions and chats, and the UFO's heading stay random; the rest is
    the author's call). All now in RULES.md, the new single list of the author's rules ("Please be sure to always
    note all rules in the documentation"). What was found: the game file needs nothing beside it. It loads no
    fonts, libraries or files from the web, and its two optional requests (`tex/manifest.json`, the APK's
    pre-painted textures, and `/log`, the APK server's log) fall back silently: without `tex/` it paints every
    texture itself. But `tex/` was not rebuildable: 25 painters call `Math.random`, so a rebuild painted different
    grain than the shipped copies. Fix (R1): the texture maker seeds `Math.random` per painter call (size, painter
    source, call count), so every painted texture is the same on every launch; `tex/` was rebuilt
    (`prerender_textures.js`, 132 textures, 11.70 MB). New `test_standalone.js` (every tier but quick) serves the game
    file alone, checks the requests (only the optional extras, nothing from another host), plays (boot, VR, walking,
    dialogue, the Event) with every texture painted by the game, and compares all 132 `tex/` textures with the
    game's own painting: 132 identical (the comparison decodes both sides from PNG: a canvas read directly rounds
    semi-transparent pixels differently from a decoded PNG, which showed as 64 values in the atlas until both went
    the same way). An incident along the way: an edit the author had rejected (keeping only non-random painters in
    `tex/`) had already reached `experiment.py` and `prerender_textures.js`; it was found (72 textures instead of
    132), reported to the author and reverted before anything was committed.
89. **The game file minified; the compressed version is back, as a Bitcoin ordinal (3.15.45, FIXES R2).** The
    author asked for the game file minified "as much as possible" (full, names renamed too, chosen over a lighter
    pass after the numbers: at most 6% smaller, about 23 KB inside the APK, under 1% faster to load), then for a
    "Bitcoin ordinal compressed version of the game" in `tools/`, "always always updated with the others", "fully
    functional as a Bitcoin ordinal, as the previous compressed version was", never used by the APK, made by the
    previous compressed version's method; and set the rule: the uncompressed version minified but not compressed,
    the compressed one both (RULES.md 19, 20). What was done:
    - **Minification** (`minify_game.js`): terser, two compress passes, local names mangled, repeated to a fixed
      point (three runs; `--check` fails when another run would change the file). Reserved names: the harness's
      `HOOK_NAMES` and tagged declarations plus `bend`, `park`, `W`, so every test reaches the game as before.
      `reduce_funcs` off so `bend` (used once) is not inlined into its caller (447 bytes). Class names kept.
      1,117,373 to 1,054,617 characters. The text anchors of `experiment.py` were rewritten for the minified code
      (new `--check`, quick tier) and `test_bend_exact.js` now finds `bend` by brace matching.
    - **Identity** (`minify_identity.js`): both versions booted with Math.random a fixed sequence, Date.now frozen
      and the painters' seeds taken from size and call count only, and the whole scene recorded at the world-ready
      point. A first run differed (2,318 vs 2,319 objects): the old version found its pre-painted `tex/` (keyed by
      painter source) and the minified one did not; booted without `tex/` (standalone mode) both build the same
      2,319 objects bit for bit, and the original against itself is identical too (the check is sound).
    - **The compressed version** (`build_compressed.js`, `tools/index.compressed.html`): the previous one (removed in
      3.15.43, in git history) was a context-mixing compressor: a page saying LOADING, the coded game as text in a
      `<script type="b">` (7-bit groups; 0, 13 and "<" escaped into characters from 128 up), and a loader that
      decodes it with sixteen hashed order-n contexts, a match model, three mixers and two adaptive probability maps
      driving a binary arithmetic decoder, counting LOADING nn%, then `document.write`s the game; outside a Quest
      browser it shows "designed for Meta Quest". Only the decoder was in the repository. Its page is kept as
      `tools/lib/compressed_loader.html` (four placeholders), and the encoder is the decoder's own text with the
      arithmetic coder turned around (the bit read from the game, settled bytes written, the low bound flushed), so
      they cannot disagree; every build is unpacked again and compared byte for byte. 1,054,835 bytes to 230,845
      coded, a 269,925-byte page (the previous one was 256,872 for a 1,000,979-byte game); an inscription must stay
      under about 390,000. `test_compressed.js` serves it alone with the content policy ordinals.com serves
      inscriptions with: it counts LOADING, unpacks (67 s headless), boots, enters VR, draws frames, fetches nothing
      from elsewhere, no page errors; a desktop browser gets the Quest note.
    - **Wired in**: `build.sh` minifies first and builds the compressed version after the APK; quick tier and the
      pre-commit hook check both; `test_compressed.js` joins every tier but quick.
90. **The author's 3.15.46 run; the Event's first start (F-B33); the stepped-back Event view (3.15.47).** The author:
    the full-screen flashes look fixed; "when the Event is activated for the first time, it's possible that some quick
    flash happens at that moment"; performance is better but drops below 60 fps "when moving from the ring backwards
    to the dance floor" (to have the garden, the dancers and the Event in view); performance is still required to
    pass submission. **The log** (PowerShell, UTF-16) held only the last 30 s of the session and one game line: `adb
    logcat -d` dumps a ring buffer a ten-minute session overruns. The headset runtime's own lines survived (`VrApi
    FPS=`, once a second): the browser process ran 64-73 fps in its last 30 s, 12 s under 72, none under 60.
    `perf_log.js` now reads those lines too, and HEADSET_DIAG.md says to capture live (`adb logcat -c`, then
    `adb logcat -v threadtime -s GreeblisServer VrApi > run.txt` while playing). **The Event's first start**
    (`event_start_check.js`, new, standard tier): no texture, framebuffer or pixel work and no shader compile inside a
    frame, no layer swap; foveation goes to full in one step (the Event's lock, F-B31); and the start's frame was
    the longest around it, 434 ms headless. Profiled: the Event's start clears and recomputes every participant's
    ground-fit footprint, scanning every body part's vertices in that frame (`addFood`). F-B33 caches the scans per
    vertex buffer and does them while loading: the activation 434 -> 67 ms headless, every footprint bit-identical
    (702 parts against fresh scans at the start). **The stepped-back view**: the dance floor is the strip at x = -27
    (z -3 to 22: Etcher, Glyph, Montgummery); the ring is the Event's participants round the garden centre (within
    8 m). Along the path (6 points, 8 headings, headset field of view, multiview): 240-402 draws and 510-650k
    triangles facing the garden; the heaviest (-25, 12) facing 270 degrees, 402 draws. Of the unbatched draws the
    largest set is the garden/park group's big meshes that share one material but exceed the batcher's 4,000-vertex
    cap (`draw_calls.js` labels them "lone signature" because it prints the indexed vertex count; the batcher reads
    the original count, `gcN`). Cap 60,000: 144 -> 134 draws a view on average, heaviest 402 -> 380, for 290k -> 318k
    triangles (+10%). The author: "no A/B experiments: push changes right to the main build" (RULES.md 22): applied
    as P23 in 3.15.47; the author's run says whether fewer draws for more triangles pays. **CPU in that view** (headless, per frame of 24.8 ms): three.js render 20 ms inclusive
    (uniform uploads 4 ms, mostly the software GPU's per-call cost: each batch draw uploads its own part rows, already
    sized to its parts, because batches share a program), the scene's matrix walk 2.6-3.4 ms, the batcher's pass
    2.2 ms, culling 1.8 ms. Tried and reverted: memoising the batcher's per-part visibility walk per frame (parents
    shared by many parts) made the pass slower, 2.12 -> 2.45 ms (new properties on thousands of three.js objects).
91. **The author's 3.15.47 run: flashes and the CPU-bound Event (3.15.48).** The author: "multiple screen flashes, maybe
    emote / vignette related", "before the Event and outside of Dance battles", "or random"; the frame rate under 60
    "while Backpacka was present"; B was pressed after the flashes but did nothing (the mark was only ever in the
    `flashlog` diagnostic build, retired with rule 22). **The live log** (`run.txt`, captured as HEADSET_DIAG.md now
    says) read with `perf_log.js`: town median 71.8, the Event median 63.3 and 56.4 at worst, all four readings under
    60 at (-24, -2), the south end of the dance floor, 330-370 draws; and the runtime's lines there: app GPU time
    9.3 ms of a 13.9 ms frame, GPU busy 62%, the GPU clock not raised, so the Event is CPU-bound (draw submission and
    script); two shader compiles during play, one the instant the Event started (key cut off in the log; the
    compile line now names the differing fields, D2). **The flashes**: `texture_census.js` (classic path) showed
    textures first uploaded when first drawn, inside the frame: the library's book covers, a sign, labels, the panels'
    spare canvases, and three 1365x1544 image bitmaps at about 6 minutes: Gooward's gallery mural, painted by a worker
    after the boot and swapped in strip by strip. That fits "random, before the Event, outside battles". F-B34
    pre-paints the mural into `tex/`; F-B35 uploads every texture while loading. **Performance**: with the GPU idle
    enough, triangles cost little: P24 batches the creatures together (296 -> 274 draws at the author's spot, +0.6%
    triangles). **Tools** (the author: "hardening and improving our tools to better capture flashes and performance
    drops"): the harness watches every test for GPU work inside XR frames (texture uploads and copies, mipmaps, pixel
    reads, renderbuffer storage, shader compiles), on both render paths, and `run_tests.sh` fails the pass on any;
    the census also plays the Speech and the Event to its end (Backpacka's show); `perf_log.js` lists the flash marks
    with what the log shows in the 3 s before each, the long frames, and a CPU- or GPU-bound verdict per scene from the
    runtime's lines; `capture_log.ps1` / `capture_log.sh` capture a whole session live as UTF-8.

92. **The mipmap switch after entering VR (F-B36, 3.15.49).** The frame-hazard watch (NOTES 91) failed `test_lod.js`:
    136 texture uploads and mipmap builds inside XR frames as the player was moved around a kiosk. Not the far-detail
    swap: right after loading every texture is on the GPU, but 2.6 s after the VR entry the game turns on mipmaps and
    anisotropy for every texture (`De(!0)`) and marks them all to upload again. On the classic path each then uploads
    when it is next drawn, so in the middle of a frame wherever the player first looks (172 of 195 still waiting 9 s
    after the entry); on multiview the upload hook (F-B31) holds them and uploads all of them after one frame, a single
    long stall with every mipmap built at once. Fix: slices of at most 0.6 Mpx, 40 ms apart, each texture uploaded
    right after its switch. The same final settings on all 195 textures (compared old against new), so the same
    pixels. The same probe found the comfort vignette's texture never uploaded until the first move (uploaded when made
    now) and, on the classic path, panel text uploaded mid-draw (now before the frame draws, as on multiview). Tools:
    `event_start_check.js` now also fails if any texture in the scene is not on the GPU at its current version; the
    harness's watch counts an explicit upload before three.js starts drawing as the frame's start, not as drawing.

93. **Backpacka: the frame-rate drop, her collision, and two side findings (3.15.50).** The author: "FPS dropped below 60
    fps while Backpacka was present". A 5-second timeline of the Event at the author's low spot (-24, -2), heading 225,
    headset field of view, draws stubbed so script time carries over: about 52 s into the Event the draws rose from 545
    to 714 (classic path, both eyes) and stayed until the end, with only 1% more triangles. The new draws were 95 of
    Backpacka's 96 parts: she is built hidden by her module's pre-warm, after the loading step that batches the scene,
    so the batcher never saw her (P25: 714 -> 545, her views about 93 draws fewer each). Her script cost is small: what
    rises in the same window is `bend` (Etcher's six tentacles, deformed for the rock, scissors and paper moves while the
    townsfolk dance) and `gFit` (the ground fit of moving creatures, a vertex scan every other frame while they move):
    the next CPU candidates. Collision (F-B37): her low parts while down are her four legs round (31.3, -2.75) and her
    neck and head into the pond at about (29.7-30.8, -2.7); her body hangs at about 3 m. Side findings: the UFO's heading
    comes from the game's seeded generator (confirmed at runtime), not random as RULES.md 5 says (RANDOMNESS.md, the
    author's call); `opt_identity.js`'s batcher check fails on 3.15.49 and 3.15.50 alike at the multi-material mesh at
    (-26.8, -26.8), heading 90: 0.021-0.027% of pixels, scattered, none in areas, just over its 0.02% line (open).

94. **The author's 3.15.52 run, and the fixes for 3.15.53.** The log (`greeblis-run-1`, multiview): the B mark at
    11.8 s fell inside the mipmap slices of the first seconds in VR (11.0-11.95 s), so every texture now gets its mipmaps
    while loading (F-B40: 182 of 182 headless, none uploaded during play). Two shader programs were compiled during
    play: the controller rays' line material at VR entry (a 92 ms frame; "no program of its kind"; reproduced headless
    by drawing the rays, which headless controllers never show) and a Lambert program with a map the instant the Event
    started (the key differs from the closest at fields 8, `map`, and 38, `vertexUvs`; not reproduced headless). Both
    are now warmed while loading (F-B41). The Event ran at a median of 66 fps, at least 59.8; a town dip to 55.8 at
    (10, 1); the app is CPU-bound (GPU 7.3 ms of 13.9). A 45 m Event view distance (fog beyond) would cut the heaviest
    view from 275 to about 203 draws (-26%; 40 m -31%, 50 m -17%), a visible change for the author to choose.
    Mushroom (F-B39): his stuck spot was on the ground at the outer end of the counter, where the hop onto the desk
    started; the author's ramp replaces the hop. Visits: the scheduler picked Sparkakus as a visitor before the player
    had the Gem or the Stone, which the visit plan then refused; his pairs score best (he never visits), so the same
    refused pick came back every 4 s and visits stalled (one headless run: 13 visits in 47 game minutes against about
    75). Since 3.15.53 he is left out of the pick until then, as Shy Zollod already was before the book (F-B42). The
    Cave flag the scheduler read was refreshed only while a vignette played; it is now checked at each try (A3). With
    the clock run 4 times fast (an init script scaling `performance.now`), 48 game minutes each: 0.23 visits to the
    Ancient a game minute outside the Cave and 0.23 in it before A3 (the 32% chance changes little, as the pick favours
    whoever has visited least), 0.29 with A3's 1-in-10 tries (11 of 13 such tries made a visit).

95. **The Event's frame rate, 3.15.53 against 3.15.54 (the mist bank and the fades).** `perf_report.js`, twice on each
    build, one after the other (draw calls stubbed, so script time carries to a headset; GL time is upload cost only).
    Event script p50, 3.15.53 / 3.15.54: start 5.5-5.6 / 5.2-5.6 ms, middle 5.6-6.0 / 5.5-6.2 ms, late 6.3-6.7 /
    6.7-6.7 ms: the same within run-to-run noise (about +-0.4 ms). Draw calls: start 250-254 / 254-260 (the mist's 4
    draws, while the pickups are still fading), middle and late 252-272 / 246-270 (the pickups' instanced draws off,
    P26, the mist on). Visible see-through objects: 52-56 / 35-40 (the pickups' glints). No shader program compiled
    during play in either. Estimate for the headset, from the author's 3.15.52 log (the Event at a median 66 fps,
    lowest 59.8; CPU-bound, the GPU at 7.3 ms of a 13.9 ms frame) and the headset's measured cost per draw
    (0.014-0.024 ms): 3.15.53 and 3.15.54 both about 66 fps median and about 60 at the lowest (within 1 fps of each
    other). The mist adds blended fill on the GPU (four bands across the horizon in each eye; estimated well under
    1 ms on a Quest 3S), which stays inside the GPU's headroom while the frame is CPU-bound. The mist cannot remove
    what it hides: no object lies wholly outside the fence (the batcher merges the scenery across it), and splitting
    those batches would add draws outside the Event. The CPU candidates for a real gain remain `gFit` and Etcher's
    `bend` (NOTES 93). Side finding: `perf_report.js`'s triangle baseline (3.15.41) fails every situation on both
    builds, because since P23/P24 large batches are drawn whole (more triangles, fewer draws, on purpose); it is
    rewritten from 3.15.54 (`--update-baseline`).

96. **The 3.15.54 full pass (`tools/.runs/full_3.15.54.log`, 216 min) and what it found.** It ran while diagnostic runs
    of mine loaded the machine (load average up to 19 on 4 cores), and seven stages failed. Alone, the roaming test
    and the long progression test pass (Mama Gorbo's walk through a scenery zone by the gallery, B45, and three
    townsfolk not home 100 s after the Event did not recur). Test fixes: `test_greet.js` waits for frames as well as
    game time (Sparkakus's second greeting was missed when a game second passed in a few frames); the census waits
    for a playing text exchange to end before the next (all were refused with "one already playing") and now says
    why one is refused and names every shader program made during play with its step and key difference;
    `ancient_check.js` looks only from where the player can stand (inside the fence; its views from beyond it, z over
    49.6, showed a pixel through the church by chance) and lists single-pixel seams in the church's walls (under 1%
    of the Ancient's width in its zoomed 128-pixel view; which views show one changes with the Ancient's pose)
    instead of failing on them. The batcher check's 0.021-0.025% is B38. The performance report's one failure was
    a p99 spike in the dialogue situation under that load. Real: two Lambert programs compiled during the Event in
    the census's sequence, `numPointLights` 0 -> 1 (F-B44, fixed in 3.15.55); not reproduced by starting the Event
    with the pizza portal open, so the light was the Bulb's or both. Standalone only: three 4x2 placeholder textures
    by the gallery uploaded in frames when their painting finished after VR entry (B44, open; not in the APK).

97. **The author's 3.15.56 logs and the flashes (F-B48).** Log c8e2109f (a full session): median 72 fps, never under
    60 (Event median 67.9, minimum 60.4; town 71.8), CPU-bound (GPU 7.4-8.0 ms of 13.9); two Lambert compiles at the
    Event's starts (`numPointLights` 1 -> 0), from 3.15.56's pinning of only the new lit programs, which let the unlit
    ones go (fixed: every program pinned). Logs 2bd67b97 (a flash after leaving the Cave with Etcher, both outside)
    and 8e76b4aa (a flash right after loading, on a pickup): nothing logged near either mark (no compile, no texture,
    no GPU call inside a frame), but the runtime's lines show hitches of 3-6 missed frames 2-4 s before each mark, and
    2bd67b97 a 28 s stretch out of the foreground (the system menu) a minute before. Headless replays with every GL
    call counted per frame: walking from the spawn to the first Blossom made 47 buffers inside XR frames, the Cave's
    inside about 240, Gooward's first goo 8: three.js uploads a geometry on its first draw, and the loading warm-up
    drew only the start view (`O.render(C,B)` from the spawn). The earlier flashes were texture uploads inside the
    frame (F-B26, F-B31); this is the same class, unwatched until now. Every geometry is now drawn once with a plain
    material into a 1x1 scissor while loading (hidden objects shown for it) and at VR entry: 204 -> 453 on the GPU.
    The harness's frame-hazard watch now counts `createBuffer`; the menu test found the goo blob and the goo splat on
    the view (made on first use) and the controller rays (made at entry). A stall of 2.7-2.9 s headless when a visitor
    walks into the church was the GPU process (the main thread idle in the profile), not seen on the headset (28-35 ms
    long frames at most there). The flight recorder (D3) dumps the last 10 s on the next mark.

98. **Seams (F-B47).** The author's flicker on the ring houses (a crop of the blue house's gable edge) was neither a
    depth fight (`test_zfight.js`, `test_coincident.js` and a sub-millimetre jitter render all clean) nor texture
    aliasing, but T-junctions: the gable triangle is a fan from the middle of its base, so its base edge (two edges
    meeting at that vertex) and the wall's top edge are rasterised from different end points, and pinholes along the
    line show what is behind; a zoomed render showed the dotted line. The triangles were also narrower than their
    roofs (up to 38 cm below the roof plane at the eaves), leaving a tapering sliver of roof underside. `test_seams.js`
    finds same-plane edge contacts with different end points (19 visible after filtering: surfaces facing the player
    area, not covered by a third triangle across the line, and a magenta marker 3 mm off the seam seen from at least
    one standing point in a 6 m grid or the Cave); the fix in each case overlaps the pieces by a centimetre or two
    with one face set back 1 cm, so there is neither a gap nor a shared plane. Detail-sized contacts (letters, small
    trim, every contact under 5 cm) are listed, not failed. The remaining jitter flips in a 24-view sweep were edges
    and fine high-contrast detail (Gooward up close, the gallery floor's paint), not seams or depth fights.
