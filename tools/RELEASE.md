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
   You should see `Serving <n> bytes on http://127.0.0.1:17777/` (n is the size of
   `tools/android/app/src/main/assets/index.html`) and
   `Setting Oculus Browser launch mode to immersive`.
   Multiview (the release path since 3.15.34), with `adb logcat -s GreeblisServer` open: at boot the log says
   `multiview planned (... OCULUS_multiview true ...)`, and at entry `projection layer live, ..., multiview true`
   and `multiview live: WxH per eye, msaa 4`. `multiview not used` or `framebuffer incomplete` means the headset
   fell back to the classic path; send the log. Both eyes must look right: depth, lighting and the 3D effect (look
   at a lamp, a creature close up, the garden), no flicker in one eye, smooth edges (MSAA).
   For a play session, capture live with `tools/capture_log.ps1` (Windows) or `tools/capture_log.sh` (macOS,
   Linux) from before the launch to the end; `adb logcat -d` afterwards keeps only the last minutes
   (`tools/HEADSET_DIAG.md` section 1).

If it opens a flat browser panel instead of VR, tell me: the fallback is
Meta's 2D app mode (one manifest change), where the player clicks the panel
once to enter VR.

Before the upload, one more headset pass against what the Store's reviewers do:
press the system button in the town (the system menu pauses the app), wait ten
seconds, resume, and confirm the game continues with sound; take the headset off
and put it back on; leave the Guardian boundary and come back. Note anything that
does not come back cleanly in `tools/BUGS.md`.

7. The VRC confirmations (`tools/VRC.md` has the full check; these are the ones
   only a headset can answer, written the way Meta's reviewers test them):
   - **Frame rate** (VRC.Quest.Performance.1): install the OVR Metrics Tool from the
     Meta Quest Developer Hub, turn its overlay on, play for 10 minutes through the
     town, a kiosk, a dialogue and the Event, and read the FPS graph: at or above 60
     everywhere outside the loading screen. Write the lowest value you saw and where.
   - **Time to the loading panel** (Performance.3): from pressing the icon to seeing
     the title panel; count the seconds. Under 4 s is the requirement; write the
     number down either way (the OS splash before the page starts also counts as a
     VR loading indicator, and the number goes into the submission notes).
   - **Universal Menu** (Input.4, Functional.2): with the game running, press the Meta
     button: the town keeps rendering behind the menu with no hands or rays and does
     not react to the sticks; close the menu: hands and rays are back and the game
     resumes. Then Quick Settings, Enter Passthrough, and back: everything paused,
     everything resumes.
   - **Recentre** (Functional.9): turn your body 180 degrees, long-press the Meta
     button; the town faces you again.
   - **Play modes** (Tracking.1): one pass seated on a chair (nothing needs standing
     up, reaching to the ground or turning past 90 degrees: pickups, kiosks and
     dialogue are all point-and-select), one pass standing in place.
   - **Controllers down and up** (Input.7, for the note that hands are not
     supported): with Auto Enable Hands on, put the controllers down for ten seconds
     and pick them up; the game waits and continues.
   - **The Event's frame rate**: the live log answers this now: `perf_log.js` gives a
     CPU- or GPU-bound verdict per scene from the runtime's `VrApi` lines. The 3.15.47
     log: CPU-bound (app GPU time 9.3 of a 13.9 ms frame, GPU 62% busy; NOTES 91), so
     the work is fewer draws and less script per frame (`tools/PERF.md` section 13).
     (This item asked for two OVR Metrics readings after the author's 38 fps in the
     Event, before multiview; superseded.)
   The updated privacy page (`tools/store/privacy.html`, section 8 on deletion
   requests) is live at https://greeblistown.neocities.org/ since 2026-10-27
   (VRC.Quest.Privacy.4: done).

## 4. Rebuilding yourself (only if something changes)

1. Install a JDK 17 or newer, and the Android SDK command-line tools (or
   Android Studio). Install `platforms;android-34`, `build-tools;34.0.0` and
   `platform-tools`.
2. Point the build at the SDK: `export ANDROID_HOME=/path/to/sdk` or create
   `tools/android/local.properties` with `sdk.dir=/path/to/sdk`.
3. Put the signing files in place (section 1).
4. Build and check, from the game file alone:
   ```sh
   tools/build.sh --bump                     # minify, copies, tex/, version +1 if what ships changed, APK at the root, compressed version, checks
   ```
   (`tools/BUILD.md` lists the steps it runs.) Every store upload needs a higher `versionCode`; `--bump` raises it
   and `versionName` together. Add the version's row to `tools/VERSIONS.md`.
5. `tools/run_tests.sh --full --resume` after every build (RULES.md 23; Node and Playwright needed; "`--full`
   before an upload" is superseded); the result is recorded in `tools/TEST_PLAN.md` before the work moves on.

## 5. Upload to the Meta Quest Store

**Upload candidate: 3.15.52 (versionCode 52)**, the root `GreeblisTown-release.apk`
(always the latest build). New since 3.15.41 (VERSIONS.md has each build): no texture is made during play (F-B29,
F-B30, 3.15.42), the Event's pizza batched (P20); native render scale and no layer swaps (F-B31), the Event scale
removed, the Ancient left out from outside the church (P21), Gooward's translucent parts merged (P22, 3.15.43);
painted textures seeded so the build is rebuildable from the game file (R1, 3.15.44); the game file minified, the same world bit for bit (R2, 3.15.45). Since then: no texture made
or first uploaded during play (F-B32, F-B34, F-B35), the Event's start without its hitch (F-B33), the mipmap switch
in slices (F-B36), Backpacka solid at the pond (F-B37); batching (P23 scenery cap 60,000 vertices, P24 creatures
together, P25 Backpacka); the B flash mark and long-frame logging (D2); the author's randomness decisions (R4-R6).
`build.sh`'s checks (`test_standalone.js`, `test_compressed.js` among them) pass on it; its full pass (RULES.md 23)
is recorded in `tools/TEST_PLAN.md` (Latest results). Its headset pass, logged live (`tools/capture_log.ps1` /
`.sh`, HEADSET_DIAG.md section 1): the Event's frame rate, with Backpacka in view and from the ring back to the
dance floor; B pressed right after any flash; the first seconds after entering VR and the Event's first start;
walking into Backpacka at the pond; the emote colours and Gooward look right; then `node tools/perf_log.js run.txt`. The Alpha
channel is only you and invited testers, so uploading there first and running that same build
from the store is a fair way to do that pass.

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
   devices (Quest 3 and Quest 3S only, section 5c; done), pricing, and a privacy
   policy URL (required even for apps that collect no data).
   **Age group self-certification** is a separate, mandatory step (Developer
   Dashboard): an app cannot be published without it. Declaring a mixed
   audience (under 13 and 13+) requires the app to call Meta's Get Age Category
   API, and users under 10 must be kept out; a browser-packaged game has no
   access to that API, so declare **teens and adults (13+)** unless you want to
   take on the youth requirements. The privacy policy's children's section stays
   true either way (nothing is collected from anyone).
   Where: there is no separate form. After a build is uploaded (Alpha is fine),
   My Apps -> the app -> the App Product Detail Page section -> the link to the
   build -> the "Age Group Self-Certification" notice -> choose Teens and Adults
   (13+) -> Confirm age group (Meta: developers.meta.com/horizon/resources/age-groups,
   2026-04-02). Still open: no build has been uploaded yet (2026-10-27). The
   age-rating questionnaire (IARC) is done. Comfort rating: Moderate
   (stick locomotion and snap turn).
   Meta's list of the checks most often failed at review: Asset.2 (cover art
   branding), Asset.5 (screenshots captured on Quest, unedited), Functional.2
   (pause), Functional.7, Security.1, Security.2, Performance.1, Input.7. The
   ones that apply here are covered in `VRC.md`; give Asset.2 and Asset.5 extra
   care (source: the CC0 VRC guide the author supplied, section 10).
5. Submit for review. If the reviewer raises any of the items in `tools/NOTES.md`
   (loading indicator, 64-bit wording), send me the exact text and we decide
   the fix together.

## 5b. License

The game file is dedicated under CC0 1.0 (the author's work); the bundled
three.js stays under MIT, and its notice travels with the file (comment at the
top of `index.html`). Full texts: `tools/LICENSE.md`. The author's name is not
in either.

## 5c. Supported devices

Quest 3 and Quest 3S (manifest `com.oculus.supportedDevices` =
`quest3|quest3s`; `tools/check_apk.sh` asserts it). The original Quest and
the Quest 2 are not supported (the author, 3.15.34), nor the Quest Pro (the
author, 3.15.35: its XR2+ GPU is close to a Quest 2's, under half a 3S's,
and the Event already runs 58-65 fps on a 3S). The same two headsets are
selected in the Developer Dashboard (done by the author, 2026-10-27).

## 6. Every later update

The rules for every update are in `tools/RULES.md`: changes go straight into the main build and the author tests
after the merge (22; the experiment-first rule 15 is retired); every change is made in the game file and followed by
a rebuild and a version bump before it is committed, so the root `index.html` and APK are always the latest build
(1, 11, 12; `tools/build.sh --bump`); creature models are fixed with care and without changing their look (7); each
build gets the full test pass (23).

The VR-entry script (the head script at the top of the game file; FIXES.md, entry edits) is the one path proven on
the headset: test entry changes headless first (`test_entry.js`; 3.15.11 crashed at launch, `tools/BUGS.md`
F-B15). Capture a headset test live (`tools/capture_log.ps1` / `.sh`); `adb logcat -s GreeblisServer
GreeblisLauncher cr_VrShellDelegate` shows the page's own events and errors (`page: ...`). A creature fix touches
only the offending surfaces (B20 sank the cuff lights by millimetres); anything the author would notice is put to
them first, with the candidate list from `tools/test_coincident.js`. The pre-commit hook in `tools/git-hooks/`
(`git config core.hooksPath tools/git-hooks`, once per clone) refuses a commit whose copies, root APK or compressed
version are stale, or whose game file is not fully minified.

Same key, same package name, higher `versionCode`, rebuild, run
`tools/check_apk.sh`, upload to Alpha, test, promote.
