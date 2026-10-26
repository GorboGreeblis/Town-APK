# Greeblis Town, Meta Quest APK

Self-contained Android package of the Greeblis Town WebXR game (v3.15) for the
Meta Quest Store. No web hosting is involved: the whole game ships inside the
APK and is served to the Quest Browser's immersive WebXR activity from a
loopback server inside the app.

```
android/                 Android Studio / Gradle project that produces the APK
  app/src/main/assets/index.html   the game (generated: original + VR-entry fix)
  app/src/main/java/.../GameServer.java      loopback HTTP server for the game
  app/src/main/java/.../LauncherActivity.java launches the Quest Browser immersive
tools/                   original game, release build, docs, test tools
  uncompressed.html      the untouched game source (final HTML version)
  index.compressed.html  the compressed HTML release build, for reference
  apply_entry_fix.py     generates the APK copy of the game from the original
  GAME.md                basic game documentation
  README.md              what each tool does and how to run the test suite
store/icon-512.png       store icon derived from the game art
NOTES.md                 observations and possible bugs, to discuss before acting
```

## How the APK works

1. `LauncherActivity` starts `GameServer`, a tiny HTTP server bound to
   `127.0.0.1` (port 17777, or the next free one). It serves one document, the
   bundled `index.html`, from memory. Nothing outside the headset can reach it.
2. The activity then launches the Meta Quest Browser through Meta's fork of
   `android-browser-helper` with `horizonos.pwa.APP_MODE = immersive`. That is
   the same mechanism Meta's own PWA packager uses: the browser opens
   `com.oculus.browser.WebXRCustomTabActivity` and fires the WebXR
   `sessiongranted` event instead of waiting for a button press.
3. The game's VR-entry fix (see below) accepts that grant and enters VR as
   soon as the world has finished building. The game makes no further network
   requests after the first load, so the server only matters for the first few
   seconds.

## The VR-entry fix (the only change to the game)

The original file dropped the browser's `sessiongranted` event unless the
world had already finished building, and then waited for a press on a 2D
"Press A to Continue" screen that an immersive launch never shows. Result:
the headset stayed on the OS loading screen while the game's opening sound
played.

`tools/apply_entry_fix.py` applies four small edits and nothing else:

1. a `<head>` script that listens for `sessiongranted` before the game scripts
   parse and requests the immersive session inside the grant handler,
   parking it until the game is ready;
2. the gate code hands its own "enter VR" routine to that script;
3. when the world finishes building, enter VR if a grant already arrived;
4. the session request reuses the parked session when there is one.

The "Press A" screen still works unchanged when the game is opened in a 2D
browser window. `python3 tools/apply_entry_fix.py --verify` proves the APK
copy equals the original plus exactly these edits.

## Building

Requirements: JDK 17+, Android SDK with `platforms;android-34` and
`build-tools;34.0.0` (`ANDROID_HOME` set or `android/local.properties` with
`sdk.dir=...`). Gradle 8.14 via the wrapper.

```sh
python3 tools/apply_entry_fix.py        # regenerate the asset from tools/uncompressed.html
cd android
./gradlew assembleRelease               # -> app/build/outputs/apk/release/app-release.apk
```

### Signing

The Meta Quest Store requires every upload to be signed with the same key,
forever. Create `android/keystore.properties` (git-ignored):

```
storeFile=keystore/greeblis-town-release.jks
storePassword=...
keyAlias=greeblistown
keyPassword=...
```

and place the keystore at `android/keystore/greeblis-town-release.jks`. With
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
  `android/app/build.gradle` to match before building.
- Bump `versionCode` in `android/app/build.gradle` for every upload.
- Upload `GreeblisTown-release.apk` (repository root) through the Meta Horizon Developer Dashboard
  (or `ovr-platform-util upload-quest-build`).
- `tools/check_apk.sh` reproduces the manifest, signature, SDK-level, size
  and 64-bit checks from the VRC document.
