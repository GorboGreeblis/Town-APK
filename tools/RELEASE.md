# Release guide: what you need to do

Everything in this file is on your side: keys, headset testing, and the Meta
Quest Store upload. The build and test automation is already in the repo
(`tools/BUILD.md`, `tools/README.md`).

## 1. Signing key (do this first, keep it forever)

You were sent two files in the chat:

- `greeblis-town-release.jks` (the keystore)
- `keystore.properties` (its passwords and alias)

The Meta Quest Store locks the signing key on the first upload. Every later
update of the app must be signed with the same key, or the store rejects it.

**Decision: this generated key is the release key.** Identify it by its
certificate: `CN=Greeblis Town, O=Montgummery Games`, SHA-256 fingerprint
`A9:07:5E:05:25:F8:C0:48:71:77:0A:DB:2B:2E:7D:A8:62:15:40:C8:83:88:42:D4:B8:17:7A:21:8F:EF:8A:E1`.
The only durable copies are the ones downloaded from the chat; the build
environment that created it no longer exists. Check a keystore with:
```sh
keytool -list -v -keystore greeblis-town-release.jks | grep -A1 "Owner"
```

1. Store both files somewhere safe and private (password manager, encrypted
   drive). They are deliberately not in git.
2. For rebuilding, place them in the project:
   - `tools/android/keystore/greeblis-town-release.jks`
   - `tools/android/keystore.properties`
   Both paths are git-ignored. With them present, `assembleRelease` produces a
   signed APK; without them it produces an unsigned one that the store will
   not accept.
3. Not needed now that the key is decided, kept for reference: to create a
   different key you would have to do it **before** the first store upload:
   ```sh
   keytool -genkeypair -keystore greeblis-town-release.jks -alias greeblistown \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -dname "CN=Greeblis Town, O=Montgummery Games"
   ```
   then put the passwords in `tools/android/keystore.properties`:
   ```
   storeFile=keystore/greeblis-town-release.jks
   storePassword=YOUR_PASSWORD
   keyAlias=greeblistown
   keyPassword=YOUR_PASSWORD
   ```

## 2. Package name check (before the first upload)

The APK's package name is `com.montgummery.greeblis`. Open the Meta
Horizon Developer Dashboard, pick the Greeblis Town app (ID 1441937125658740),
and look at **Distribution → Builds**:

- No builds listed: nothing to do.
- A build is listed: its package name and signing key are locked in. Use the
  same package name (edit `applicationId` in `tools/android/app/build.gradle`,
  rebuild) and the same key. If that key is lost, the only way forward is a
  new store app.

## 3. Test on the headset

1. Developer mode: in the Meta Horizon phone app go to **Devices → your
   headset → Headset settings → Developer Mode** and turn it on. This needs a
   verified developer account (the dashboard asks for a phone number or
   payment method once).
2. Install Android platform-tools (contains `adb`) on your computer:
   <https://developer.android.com/tools/releases/platform-tools>.
3. Plug the headset into the computer with USB, put it on, and accept the two
   prompts (USB debugging, file access). Then:
   ```sh
   adb devices                      # the headset should show as "device"
   adb install -r GreeblisTown-release.apk
   ```
4. Launch it: in the headset Library choose the **Unknown Sources** filter (or
   the Apps list) and open **Greeblis Town**.
5. What to check, in this order:
   - It goes straight into VR with no 2D browser panel and no stuck loading
     screen. (This is the one thing that could not be verified without a
     headset; see `tools/NOTES.md` item 1.)
   - The town looks and sounds exactly as in the HTML version.
   - Pressing the Meta button and choosing Quit returns to the home
     environment with no leftover browser window.
   - Relaunching works.
6. Useful log while it starts:
   ```sh
   adb logcat -s GreeblisServer GreeblisLauncher TwaLauncher TWALauncherActivity
   ```
   You should see `Serving 1063827 bytes on http://127.0.0.1:17777/` and
   `Setting Oculus Browser launch mode to immersive`.

If it opens a flat browser panel instead of VR, tell me: the fallback is
Meta's 2D app mode (one manifest change), where the player clicks the panel
once to enter VR.

Before the upload, one more headset pass against what the Store's reviewers do:
press the system button in the town (the system menu pauses the app), wait ten
seconds, resume, and confirm the game continues with sound; take the headset off
and put it back on; leave the Guardian boundary and come back. Note anything that
does not come back cleanly in `tools/BUGS.md`.

## 4. Rebuilding yourself (only if something changes)

1. Install a JDK 17 or newer, and the Android SDK command-line tools (or
   Android Studio). Install `platforms;android-34`, `build-tools;34.0.0` and
   `platform-tools`.
2. Point the build at the SDK: `export ANDROID_HOME=/path/to/sdk` or create
   `tools/android/local.properties` with `sdk.dir=/path/to/sdk`.
3. Put the signing files in place (section 1).
4. Bump `versionCode` in `tools/android/app/build.gradle` (every store upload needs
   a higher number) and `versionName` if the game version changed.
5. Build and check:
   ```sh
   python3 tools/apply_entry_fix.py          # regenerate the game asset
   cd tools/android && ./gradlew assembleRelease && cd ..
   tools/check_apk.sh                        # store packaging rules
   ```
   The APK is at `tools/android/app/build/outputs/apk/release/app-release.apk`.
   `tools/run_tests.sh` runs the full suite if Node and Playwright are
   installed.

## 5. Upload to the Meta Quest Store

**Upload candidate: 3.15.19 (versionCode 20)**, the root `GreeblisTown-release.apk`,
confirmed by the author's full headset run on 2026-10-27 with no new issues, full
test tier and 10-minute soak green.

The app label inside the APK is "GREEBLIS TOWN" (headset library and menus); type the
same spelling as the listing name in the developer dashboard.

1. Dashboard → the app → **Distribution → Builds** → upload the APK to a
   release channel. Use **Alpha** first (you and invited testers only), then
   promote the same build to the store channel when it is approved.
   Command-line alternative with `ovr-platform-util`:
   ```sh
   ovr-platform-util upload-quest-build --app-id 1441937125658740 \
     --app-secret YOUR_APP_SECRET --apk GreeblisTown-release.apk \
     --channel ALPHA
   ```
   (The app secret is under the app's **API** page. Keep it private.)
2. Watch the **Test Status** column on the Builds page: Meta runs automatic
   manifest and SDK checks within minutes of upload.
3. Fill in the store listing. The dashboard states the exact pixel sizes it
   wants; the common slots and the art you already have:
   - icon 512x512: `tools/store/icon-512.png` (from your square logo)
   - square cover 1440x1440: your square logo image
   - landscape cover (2560x1440 in the dashboard): your wide town image, which
     will need upscaling or re-exporting from the source art
   - portrait cover (1008x1440): your tall image
   - hero banner (3000x900): your wide banner image, same note
   - at least five screenshots at the dashboard's size, taken in the headset
     (`adb shell screencap` or the headset's capture button)
4. Complete the required questionnaires: age rating (IARC), content and
   comfort rating, Data Use Checkup (this app collects nothing), supported
   devices (Quest 2, Quest Pro, Quest 3, Quest 3S), pricing, and a privacy
   policy URL (required even for apps that collect no data).
5. Submit for review. If the reviewer raises any of the items in `tools/NOTES.md`
   (loading indicator, 64-bit wording), send me the exact text and we decide
   the fix together.

## 6. Every later update

Rule for the VR-entry script (`EDITS` in `tools/apply_entry_fix.py`): it is
the one path proven on the headset. Any change to how the session is
requested, parked, drawn into, or handed to the game goes out first as an
experiment APK (`tools/build_experiment.sh NAME`) for a headset test, and
only then into the main build. 3.15.11 skipped this and crashed at launch
(`tools/BUGS.md` F-B15). Keep logcat open during a headset test:
`adb logcat -s GreeblisServer GreeblisLauncher cr_VrShellDelegate` shows the
page's own events and errors (`page: ...`).

Same key, same package name, higher `versionCode`, rebuild, run
`tools/check_apk.sh`, upload to Alpha, test, promote.
