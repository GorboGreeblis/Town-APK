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
    ("Sometimes I worry…"). Entity id `gratelet`, field `campfire`. Not
    changed; one-word fix when approved.
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
