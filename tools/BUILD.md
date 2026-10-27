# Greeblis Town, Meta Quest APK

Self-contained Android package of the Greeblis Town WebXR game (v3.15.x, see
`tools/VERSIONS.md`) for the
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

## Changes to the game: the entry script, the loading screen, and the gameplay fixes

`tools/apply_entry_fix.py` generates the bundled copy as the original plus a
fixed list of text edits, and `--verify` proves that equality byte for byte.
Two lists: `EDITS` (the VR entry and loading screen, outside the game's
logic) and `GAME_FIXES` (approved gameplay fixes, one entry per fix with its
reason; the list of what they fix is `tools/BUGS.md`, section Fixed).

What the entry script does on a Quest browser (NOTES 34, 41, 42):

1. requests the immersive session at page start with the `layers` feature
   and parks it (the browser never grants a session on its own for a fresh
   immersive launch);
2. draws the loading screen into compositor layers: a cube layer for the sky
   and a quad layer for the title and progress bar, 1.8 x 0.9 m at 4 m, which
   the browser re-renders every vsync with the current head pose whatever the
   page is doing, so turning the head during the boot never shows a stale frame;
3. slices the boot (`await __gtY(label)` before each heavy step, each character,
   and eight shader-compile chunks) and posts the slice timings to the loopback
   server at the handover (`page: m=... boot slices ms: ...` in logcat);
4. hands the session to the game through a facade (`tools/lib/xr_layers_shim.js`):
   the browser forbids `baseLayer` on a session with the `layers` feature, so
   the game renders through an `XRProjectionLayer` behind an object that shows
   three.js its usual base layer (an MSAA framebuffer resolved into the layer's
   eye texture each frame); layer swaps for the render-scale governor keep the
   old layer in front until the new one is drawn;
5. never ends the session on an entry failure: the error goes to the loading
   screen with two retries, and page errors go to logcat via `/log`;
6. uses the pre-rendered textures in `assets/tex/` (`tools/prerender_textures.js`,
   with each texture's probe points) instead of repainting them at boot;
   text-bearing textures are still painted on the headset.

The "Press A" screen still works unchanged when the game is opened in a 2D
browser window on a non-Quest browser.

Rule (RELEASE.md): any change to the entry script ships first as an
experiment APK for a headset run, never straight into the main build.

## Building

Requirements: JDK 17+, Android SDK with `platforms;android-34` and
`build-tools;34.0.0` (`ANDROID_HOME` set or `tools/android/local.properties` with
`sdk.dir=...`). Gradle 8.14 via the wrapper.

```sh
python3 tools/apply_entry_fix.py        # regenerate the asset from tools/uncompressed.html (also mirrored to index.html at the repo root)
git config core.hooksPath tools/git-hooks   # once per clone: refuses a commit whose root index.html is stale
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

- the asset equals the original plus the entry edits and the gameplay fixes;
- the loopback server serves the game byte-for-byte (JVM harness);
- the VR entry, the layers path, a layer swap, visibility changes, a WebGL context loss and the `local-floor` fallback in headless Chromium with a fake WebXR device;
- the compressed release build unpacks to the same content as the source;
- the APK passes the Meta store packaging checks (VRC.Quest.Packaging.1-6);
- the full tier adds the world, input, progression, visits, courier, return-home,
  parity and z-fight tests plus the loading, handover, hitch, scene-cost and
  sharpness reports (`tools/TEST_PLAN.md`).

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
