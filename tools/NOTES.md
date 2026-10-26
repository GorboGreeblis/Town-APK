# Notes for discussion

Observations made while packaging. Nothing here has been acted on beyond the
VR-entry fix; each item is for discussion first.

## Must be confirmed on a headset

1. **Immersive launch from a loopback origin.** Meta's immersive app mode was
   designed for hosted PWAs whose Digital Asset Links the browser can verify.
   A `http://127.0.0.1` origin cannot publish `assetlinks.json`. The browser
   helper's "quality enforcement" crash on failed verification is neutralised
   in `LauncherActivity`, but whether the Quest Browser still fires
   `sessiongranted` for an unverified origin is only provable on a device.
   If it does not, the fallback is the 2D app mode (`horizonos.pwa.APP_MODE =
   2D`, `com.oculus.intent.category.2D`), where the player clicks the panel.
2. **Grant timing.** The fix requests the session inside the grant handler and
   parks it until the world is built (about 30 s under software rendering
   here, much less on a Quest). During that time the headset shows the
   browser's empty XR view rather than the OS splash. Check that this looks
   acceptable.
3. **Package name and key.** If a build was ever uploaded to app
   1441937125658740 before, its package name and signing key are locked in.
   The APK here uses `com.montgummery.greeblis` and a fresh key.

## Possible store-review flags

4. **VRC.Quest.Performance.3, in-VR loading indicator.** The world is built
   synchronously on the main thread before the first VR frame, so the only
   thing shown is the OS three-dot splash, which the VRC says does not count
   if loading exceeds a few seconds. Fixing this would require making the
   game's boot asynchronous (a game change).
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

