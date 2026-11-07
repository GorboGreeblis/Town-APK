# Release guide: what you need to do

Everything in this file is on your side: keys, the site, headset testing, and the Meta
Quest Store upload. Since 4.0.64 (B133) the game is hosted at https://greeblistown.ar.io/ (your ArDrive deployment and
ArNS name) and the Store APK is Meta's Bubblewrap web app that opens it (`tools/BUILD.md`, "How the app works"). The build and test automation is already in the repo
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
   - `tools/twa/keystore/greeblis-town-release.jks`
   - `tools/twa/keystore.properties` (`storePassword=...` and `keyPassword=...`)
   Both paths are git-ignored. `tools/build_twa.sh` refuses to build without them. The site's
   `/.well-known/assetlinks.json` names this key's certificate: a different key would also need a new site file.
3. Not needed now that the key is decided, kept for reference: to create a
   different key you would have to do it **before** the first store upload:
   ```sh
   keytool -genkeypair -keystore greeblis-town-release.jks -alias greeblistown \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -dname "CN=Greeblis Town, O=Montgummery Games"
   ```
   then put the passwords in `tools/twa/keystore.properties` (`storePassword=...`, `keyPassword=...`).

## 2. Package name check (before the first upload)

The APK's package name is `com.montgummery.greeblis`. Open the Meta
Horizon Developer Dashboard, pick the Greeblis Town app (ID 1441937125658740),
and look at **Distribution → Builds**:

- No builds listed: nothing to do.
- A build is listed: its package name and signing key are locked in. Use the
  same package name (`packageId` in `tools/twa/twa-manifest.json`, then
  `tools/build_twa.sh`) and the same key. If that key is lost, the only way forward is a
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
   - It goes straight into VR with no 2D browser panel, **no browser address bar**, and no stuck loading
     screen. A browser bar means the site's Digital Asset Links check failed (the site's
     `/.well-known/assetlinks.json` and the APK's key must match: `tools/check_apk.sh --online`). This is the
     one thing that cannot be verified without a headset.
   - The headset needs the internet to start the game (it loads from the site).
   - The town looks and sounds exactly as in the HTML version.
   - Pressing the Meta button and choosing Quit returns to the home
     environment with no leftover browser window.
   - Relaunching works.
6. Useful log while it starts:
   ```sh
   adb logcat -s TwaLauncher TWALauncherActivity cr_OriginVerifier
   ```
   You should see the launch open https://greeblistown.ar.io/ in immersive mode, and no
   `Verification failed` line. The shipped final build writes no game lines (RULES.md 34). For a play session's
   frame rate, capture live with `tools/capture_log.ps1` (Windows) or `tools/capture_log.sh` (macOS, Linux) from
   before the launch to the end; `adb logcat -d` afterwards keeps only the last minutes
   (`tools/HEADSET_DIAG.md` section 1).

If it opens a flat browser panel instead of VR, tell me: the fallback is
Meta's 2D app mode (`horizonOSAppMode` in `tools/twa/twa-manifest.json`), where the player clicks the panel
once to enter VR.

Before the upload, one more headset pass against what the Store's reviewers do:
press the system button in the town (the system menu pauses the app and its music,
the first time too: B115, B118), wait ten seconds, resume, and confirm the game
continues with sound; take the headset off (the game and its music pause), pick a
controller up and press its trigger with the headset still off (the game must stay
paused: B121), then put the headset back on (it resumes); leave the Guardian
boundary and come back (`tools/HEADSET_DIAG.md`, "Confirming the pause"). Note anything that
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
     button: the town keeps rendering behind the menu with no hands or rays, does
     not react to the sticks and its music stops; close the menu: hands and rays are
     back and the game and its music resume. Then Quick Settings, Enter Passthrough, and back: everything paused,
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
     CPU- or GPU-bound verdict per scene from the runtime's `VrApi` lines, and since
     4.0.49 the game's own CPU a frame (the performance log). The game is CPU-bound;
     the runs since 4.0.46 are in `tools/PERF.md` section 16.
     (This item asked for two OVR Metrics readings after the author's 38 fps in the
     Event, before multiview; superseded.)
   The updated privacy page (`tools/store/privacy.html`, section 8 on deletion
   requests), updated 2026-11-07 for the hosted game (section 3: the files load from the site on Arweave;
   section 4: the gateway), is live at **https://privacypolicy_greeblistown.ar.io/** (the author's ArDrive upload,
   an ArNS undername; checked 2026-11-07: byte for byte `tools/store/privacy.html`). Put that URL in the Developer
   Dashboard's privacy policy field (it was https://greeblistown.neocities.org/). VRC.Quest.Privacy.4: done.

## 4. Rebuilding yourself (only if something changes)

1. Install Node 18+ and Python 3 (the game's build), and for a new Store APK a JDK 17 or newer and the Android SDK
   command-line tools with `build-tools;34.0.0`.
2. Point the APK build at the SDK: `export ANDROID_HOME=/path/to/sdk` or create `tools/twa/local.properties` with
   `sdk.dir=/path/to/sdk`.
3. Put the signing files in place (section 1).
4. Build and check, from the game file alone:
   ```sh
   tools/build.sh --bump                     # minify, copies, tex/, version +1 if what ships changed, the site, compressed version, checks
   ```
   (`tools/BUILD.md` lists the steps it runs.) The game's version is `tools/game_version.txt`; add the version's row
   to `tools/VERSIONS.md`.
5. `tools/run_tests.sh --full --resume` after every build (RULES.md 23; Node and Playwright needed; "`--full`
   before an upload" is superseded); the result is recorded in `tools/TEST_PLAN.md` before the work moves on. For the
   final build candidate the final pass waits for your headset test of it (RULES.md 32).
6. The shipped game is the final build without the debug code (RULES.md 34): build it with
   ```sh
   tools/build.sh --bump --final             # as step 4, but everything that ships is tools/final.html: no debug code
   ```
   `final_build.js` writes `tools/final.html` (the log function and its `/log` report, the localStorage black box,
   the flight recorder, the light record, the census and frame-health counters, the performance log and every log
   call taken out; it fails unless none is left) and `tex/`, the site's copy and the root copies are built from it;
   `test_final.js` plays it as shipped. The builds you test keep the debug code; after the upload, `tools/build.sh`
   puts the game file back in the copies (the pre-commit hook expects it).
7. **Upload the site**: `tools/site` is the whole folder (`tools/.runs/site.zip` the same, zipped). In ArDrive, upload
   it to the site's drive folder (replacing the files), create the folder's manifest again, and point the ArNS name
   `greeblistown` at the new manifest. Then `tools/check_final.sh` fetches https://greeblistown.ar.io/ and confirms the
   hosted game is the final build, and `tools/check_apk.sh --online` that `assetlinks.json` is still served. A change to
   the game needs only this: the APK does not change.
8. **A new Store APK** (a higher version for the Store, or a changed host or launch setting):
   ```sh
   tools/build_twa.sh --version-name 4.0.65 --version-code 134 --online
   ```
   Meta's Bubblewrap builds and signs it, copies it to the root as `GreeblisTown-release.apk` and checks it.

## 5. Upload to the Meta Quest Store

**Upload candidate: the Store APK 4.0.64 (versionCode 133), 2026-11-07**, the root `GreeblisTown-release.apk`,
opening the final build of the game, 4.0.63, at https://greeblistown.ar.io/ (B133: the Store refused 4.0.63's
self-contained APK; the game is unchanged). Its headset check comes first (section 3: straight into VR, no browser
bar). What is in the game, build by build: `tools/VERSIONS.md`; its full pass (RULES.md 23) is recorded in
`tools/TEST_PLAN.md` (Latest results). The Alpha channel is only you and invited testers, so uploading there first
and running that same build from the store is a fair way to do the headset pass.

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

Quest 3 and Quest 3S, selected in the Developer Dashboard (Meta's Bubblewrap APK
carries no device list of its own; 4.0.63's self-contained APK had `quest3|quest3s`). The original Quest and
the Quest 2 are not supported (the author, 3.15.34), nor the Quest Pro (the
author, 3.15.35: its XR2+ GPU is close to a Quest 2's, under half a 3S's,
and the Event already runs 58-65 fps on a 3S). The same two headsets are
selected in the Developer Dashboard (done by the author, 2026-10-27).

## 6. Every later update

The rules for every update are in `tools/RULES.md`: changes go straight into the main build and the author tests
after the merge (22; the experiment-first rule 15 is retired); every change is made in the game file and followed by
a rebuild and a version bump before it is committed, so the root `index.html`, the site folder and the compressed
version are always the latest build (1, 11, 12; `tools/build.sh --bump`); creature models are fixed with care and without changing their look (7); each
build gets the full test pass (23). The build stamps the version into the landing page, the gate and the VR loading box
(`build.sh` step 3b), so nothing else needs updating by hand.

The VR-entry script (the head script at the top of the game file; FIXES.md, entry edits) is the one path proven on
the headset: test entry changes headless first (`test_entry.js`; 3.15.11 crashed at launch, `tools/BUGS.md`
F-B15). Capture a headset test live (`tools/capture_log.ps1` / `.sh`); to see the page's own errors, open the
hosted page in the Quest Browser with the headset on USB and use Chrome's remote debugging (`chrome://inspect`). A creature fix touches
only the offending surfaces (B20 sank the cuff lights by millimetres); anything the author would notice is put to
them first, with the candidate list from `tools/test_coincident.js`. The pre-commit hook in `tools/git-hooks/`
(`git config core.hooksPath tools/git-hooks`, once per clone) refuses a commit whose copies, root APK or compressed
version are stale, or whose game file is not fully minified.

A game change: rebuild, upload the site, `tools/check_final.sh`. A new APK: same key, same package name, higher
version code (`tools/build_twa.sh`), `tools/check_apk.sh --online`, upload to Alpha, test, promote.
