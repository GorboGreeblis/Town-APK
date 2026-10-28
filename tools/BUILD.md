# Greeblis Town, Meta Quest APK

Self-contained Android package of the Greeblis Town WebXR game (v3.15.x, see
`tools/VERSIONS.md`) for the
Meta Quest Store. No web hosting is involved: the whole game ships inside the
APK and is served to the Quest Browser's immersive WebXR activity from a
loopback server inside the app.

```
GreeblisTown-release.apk   the final signed build
index.html                 the game file's copy (the root holds only these two and tools/)
tools/
  android/                 Android Studio / Gradle project that produces the APK
    app/src/main/assets/index.html             the game as bundled (a copy of uncompressed.html)
    app/src/main/java/.../GameServer.java      loopback HTTP server for the game
    app/src/main/java/.../LauncherActivity.java launches the Quest Browser immersive
  uncompressed.html        THE GAME FILE: the whole game, minified, every change made in it directly
  index.compressed.html    the compressed version (a Bitcoin ordinal; never in the APK), built from it
  build.sh                 rebuilds everything from the game file (minify, copies, tex/, version, APK, compressed)
  sync_game.py             copies it to index.html (root) and the APK's asset; --check compares
  experiment.py            diagnostic variants of a copy, for headset A/B tests
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

Every change is made directly in the game file, `tools/uncompressed.html` (since 3.15.43, NOTES 87; before that a
build script applied a list of text edits to the author's original, which is no longer kept). `tools/FIXES.md` is the
changelog: each change with its reason and how it was proven (add an entry for every new one); `tools/BUGS.md`,
section Fixed, lists what they fix. The game file is minified (RULES.md 19, since 3.15.45): edit it in place in the
same style; `tools/build.sh --bump` minifies it again, copies it to `index.html` at the root and into the APK, and
rebuilds the compressed version; the quick tier and the pre-commit hook refuse copies that differ, a game file that is
not fully minified, and a compressed version that does not unpack to it.

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
4. hands the session to the game through a facade (the layers shim in the head script):
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
git config core.hooksPath tools/git-hooks   # once per clone: refuses a commit whose copies or root APK are stale
tools/build.sh --bump                   # after editing tools/uncompressed.html: everything, from the game file alone
```

`tools/build.sh` minifies the game file (a no-op when it already is), copies it to `index.html` (root) and the APK's
asset, re-paints the pre-painted textures in `assets/tex/`, raises the version by one if what ships changed
(`--bump`; without it the build stops and says so), builds the release APK, copies it to the root as
`GreeblisTown-release.apk`, builds the compressed version `tools/index.compressed.html` (never in the APK), and
checks the result (`sync_game.py --check`, `experiment.py --check`, `check_apk.sh`, `test_standalone.js`,
`test_compressed.js`; `--no-test` skips the last two). Painting is seeded (FIXES R1), so an unchanged game
file rebuilds the same `tex/` and the same APK, byte for byte. Add the new version's row to `tools/VERSIONS.md`.
The steps by hand:

```sh
node tools/minify_game.js               # minify the game file in place (to a fixed point)
python3 tools/sync_game.py              # copy the game file to index.html (root) and the APK's asset
node tools/prerender_textures.js        # re-paint assets/tex/ (after a change to a texture painter)
cd tools/android
./gradlew assembleRelease               # -> app/build/outputs/apk/release/app-release.apk (copy it to the root)
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

`tools/run_tests.sh` runs the suite in tiers (`--quick`, `--smoke`, the standard pass, `--full`; add `--resume` to
skip stages already passed after a machine restart). How to run and write tests: `tools/TESTING.md`; one row per
tool: `tools/README.md`; what each thing is tested by: `tools/TEST_PLAN.md`.

- **Every tier (`--quick` alone):** the asset equals the original plus the entry edits and the gameplay fixes;
  the loopback server serves the game byte-for-byte (JVM harness); FIXES.md is current; dialogue spelling; the
  tentacle bend is bit-identical; the APK passes the Meta store packaging checks (VRC.Quest.Packaging.1-6).
- **The standard pass** adds, in headless Chromium with a fake WebXR headset: VR entry (early, late, no grant),
  runtime play with the layers path, a layer swap, visibility and context loss; multiview (each eye matches the
  classic path, no mid-frame upload or compile); the Quest 3S uniform budget; warm-up coverage; the quality
  governor on a Quest 3S and a Quest 3; the game's content (gifts, talk, shyness, the bribe, outfits, battles, the
  Ancient, the robin, vignettes, the Event, Backpacka); greeting; the wrist HUD and haptics; roaming; the
  meetings; the jazz drums; audio; far detail and the batcher; world, input, progression, visits, the courier and
  the return-home scenarios.
- **The full pass** adds long soaks and every scenario, release parity, the z-fight and single-sided checks,
  optimisation identity, the performance report and the loading, handover, hitch, scene-cost, Event and sharpness
  reports. Run it on the final build.

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
