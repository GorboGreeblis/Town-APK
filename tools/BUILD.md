# Greeblis Town, Meta Quest APK

Self-contained Android package of the Greeblis Town WebXR game (v3.15) for the
Meta Quest Store. No web hosting is involved: the whole game ships inside the
APK and is served to the Quest Browser's immersive WebXR activity from a
loopback server inside the app.

```
GreeblisTown-release.apk   the final signed build (the only file at the root besides tools/)
tools/
  android/                 Android Studio / Gradle project that produces the APK
    app/src/main/assets/index.html             the game as bundled (generated, see below)
    app/src/main/java/.../GameServer.java      loopback HTTP server for the game
    app/src/main/java/.../LauncherActivity.java launches the Quest Browser immersive
  uncompressed.html        the original game, untouched (source of truth)
  apply_entry_fix.py       generates the bundled copy = original + the approved edits
  test_*.js, *.sh          test suite (see tools/README.md)
  BUILD.md                 this file: how the APK works, building, signing, testing
  RELEASE.md               what the author does: signing key, headset test, store upload
  NOTES.md                 investigation notes, numbered
  TASKS.md / BUGS.md       open tasks and open bugs
  GAME.md / LORE.md / TEST_PLAN.md   game documentation, lore bible, test plan
  store/icon-512.png       store icon derived from the game art
```

## How the APK works

1. `GreeblisApplication`/`LauncherActivity` start `GameServer`, a tiny HTTP
   server bound to the loopback interface (port 17777, or the next free one).
   It serves one document, the bundled `index.html`, from memory, plus the
   Digital Asset Links statement the browser needs to verify the app, and a
   `/log` endpoint the page can use for diagnostics. Nothing outside the
   headset can reach it. The page is addressed as `http://localhost:17777/`,
   the only non-HTTPS origin the browser's Trusted Web Activity check accepts.
2. The activity launches the Meta Quest Browser through Meta's fork of
   `android-browser-helper` with `horizonos.pwa.APP_MODE = immersive`, i.e.
   `com.oculus.browser.WebXRCustomTabActivity`.
3. The game's entry script (see below) requests the VR session at page start,
   draws our own loading screen into it while the world builds, and hands the
   session to the game when it is ready. The game makes no further network
   requests after the first load.

## Changes to the game: the VR-entry script, the sliced boot, and approved gameplay fixes

The original file waited for the browser's `sessiongranted` event (which this
browser does not send for a fresh immersive launch, see `NOTES.md` 33-34),
built the whole world in one 12 s synchronous call, and then waited for a
press on a 2D "Press A to Continue" screen that an immersive launch never
shows. Result: the headset stayed on the OS loading screen and the OS killed
the app after about 15 s without a frame.

`tools/apply_entry_fix.py` applies the entry edits (`EDITS`) and nothing else
to the game's logic:

1. a `<head>` script that, on a Quest browser, requests the immersive session
   immediately, parks it, and renders a loading screen into it (sky colour,
   "GREEBLIS TOWN", a progress bar) with its own small WebGL context; the
   `sessiongranted` listener is kept for browsers that use it;
2. the gate code hands its own "enter VR" routine to that script;
3. the boot becomes `async` and yields (`await __gtY(label)`) before each heavy
   world-build step, each creature spawn, and in eight shader-compile slices,
   so the loading screen keeps drawing and the OS always sees frames; the
   yield anchors come from a parse of the script (`tools/lib/boot_map.js`);
4. at the end of the boot the game enters the parked session through its own
   routine, and the loader stops;
5. the procedural textures are pre-rendered at build time into `assets/tex/`
   (`tools/prerender_textures.js`) and blitted at runtime instead of repainted;
   text-bearing textures are still painted on the headset.

The "Press A" screen still works unchanged when the game is opened in a 2D
browser window on a non-Quest browser.

The gameplay fixes approved after testing are applied by the same script
(`GAME_FIXES`, one entry per fix with its reason; the list is in `tools/BUGS.md`
under Fixed): navigation fixes around buildings (Mushroom's kiosk, the sealed
corner behind the Shop, the Ancient inside the church), the visible stuck
rescue, the shop-menu pause, the effects pre-warm, and Hennrick's campfire line. `python3 tools/apply_entry_fix.py --verify` proves the APK
copy equals the original plus exactly these edits.

## Building

Requirements: JDK 17+, Android SDK with `platforms;android-34` and
`build-tools;34.0.0` (`ANDROID_HOME` set or `tools/android/local.properties` with
`sdk.dir=...`). Gradle 8.14 via the wrapper.

```sh
python3 tools/apply_entry_fix.py        # regenerate the asset from tools/uncompressed.html
cd android
./gradlew assembleRelease               # -> app/build/outputs/apk/release/app-release.apk
```

### Signing

The Meta Quest Store requires every upload to be signed with the same key,
forever. Create `tools/android/keystore.properties` (git-ignored):

```
storeFile=keystore/greeblis-town-release.jks
storePassword=...
keyAlias=greeblistown
keyPassword=...
```

and place the keystore at `tools/android/keystore/greeblis-town-release.jks`. With
that file present `assembleRelease` produces a v1+v2 signed APK; without it
the release build is unsigned. Back the keystore up somewhere safe; losing it
means the store listing can never be updated.

## Testing

`tools/run_tests.sh` runs the whole suite (details in `tools/README.md`):

- the asset equals the original plus the four edits;
- the loopback server serves the game byte-for-byte (JVM harness);
- the VR-entry wiring in headless Chromium with a simulated grant;
- the compressed release build unpacks to the same content as the source;
- the APK passes the Meta store packaging checks (VRC.Quest.Packaging.1-6).

What cannot be tested here: the actual launch on a headset. Sideload and
confirm that the app goes straight into VR:

```sh
adb install -r GreeblisTown-release.apk
adb logcat -s GreeblisServer GreeblisLauncher TwaLauncher TWALauncherActivity
```

## Store submission checklist

- Package name `com.montgummery.greeblis` and the signing key must match
  any build previously uploaded to the app (ID 1441937125658740). If an
  earlier upload used a different package name, change `applicationId` in
  `tools/android/app/build.gradle` to match before building.
- Bump `versionCode` in `tools/android/app/build.gradle` for every upload.
- Upload `GreeblisTown-release.apk` (repository root) through the Meta Horizon Developer Dashboard
  (or `ovr-platform-util upload-quest-build`).
- `tools/check_apk.sh` reproduces the manifest, signature, SDK-level, size
  and 64-bit checks from the VRC document.
