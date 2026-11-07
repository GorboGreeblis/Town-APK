# Greeblis Town, Meta Quest app

The Greeblis Town WebXR game (v4.0.x, see `tools/VERSIONS.md`) for the Meta Quest Store. Since 4.0.64 (B133) the game
is hosted at **https://greeblistown.ar.io/** (the author's ArDrive deployment, the ArNS name `greeblistown`), and the
Store APK is a Trusted Web Activity made by **Meta's Bubblewrap CLI** that opens it in the Quest Browser, immersive. The
Store takes no other kind of web app APK: its start URL must be https and its manifest must carry Bubblewrap's
`twa_generator` tag (the upload refused 4.0.63's self-contained APK for both; that APK and its project are gone).

```
GreeblisTown-release.apk   the Store APK (Bubblewrap; holds no game: it opens the site)
index.html                 the game file's copy (the final build)
index.compressed.html      the compressed version (a Bitcoin ordinal), built from it
                           (the root holds only these three and tools/; RULES.md 11)
tools/
  uncompressed.html        THE GAME FILE: the whole game, minified, every change made in it directly
  game_version.txt         the game's version (the one it shows); the APK's is in twa/twa-manifest.json
  site/                    THE SITE, the folder uploaded to https://greeblistown.ar.io/:
    index.html             the game as served (a copy, like the root's)
    tex/                   the pre-painted textures (prerender_textures.js)
    manifest.webmanifest, icon-192.png, icon-512.png, .well-known/assetlinks.json   (build_site.py)
  twa/                     the Store APK's Bubblewrap project: twa-manifest.json is its source (package, host,
                           version, launch mode, signing key); the rest is generated from it
    keystore/, keystore.properties   the release signing key and its passwords (never committed)
  build.sh                 rebuilds everything from the game file (minify, copies, tex/, version, version stamp, site,
                           compressed); --final: the same from the final build (no debug code), for the Store
  build_site.py            finishes tools/site (web manifest, icons, Digital Asset Links) and zips it
  build_twa.sh             builds and signs the Store APK with Bubblewrap, copies it to the root, checks it
  check_apk.sh / check_final.sh   the Store APK's rules / all three root versions are the final build
  minify_game.js           minifies the game file in place (RULES.md 19); --check
  build_compressed.js      builds index.compressed.html from the game file; --check
  sync_game.py             updates every copy: index.html (root), tools/site/index.html, index.compressed.html; --check
  experiment.py            diagnostic variants of a copy (measurement only, RULES.md 22)
  final_build.js           writes tools/final.html: the game without its debug code (GT_DEBUG), for the Store
  test_*.js, *.sh          test suite (see tools/README.md)
  RULES.md                 the author's rules: read before any change
  BUILD.md                 this file: how the app works, building, signing, testing
  RELEASE.md               what the author does: signing key, the site, headset test, store upload
  NOTES.md                 investigation notes, numbered
  TASKS.md / BUGS.md       open tasks and open bugs
  GAME.md / LORE.md / TEST_PLAN.md   game documentation, lore bible, test plan
  PERF.md / RENDERING.md / ...       see tools/README.md for every doc and tool
  store/icon-512.png       store icon derived from the game art
```

## How the app works

1. The Store APK (package `com.montgummery.greeblis`) is Bubblewrap's Trusted Web Activity for Meta Quest: its
   launcher sits in `com.oculus.intent.category.VR`, its start URL (`DEFAULT_URL`) is https://greeblistown.ar.io/, and
   `horizonos.pwa.APP_MODE` is `immersive`, so the Quest Browser opens the page in its immersive WebXR activity.
2. The browser verifies that the site and the APK belong together through Digital Asset Links: the site's
   `/.well-known/assetlinks.json` names the package and the SHA-256 of the release signing certificate, and the APK's
   asset statement names the site. If the check fails, the page opens with a browser bar instead (the sign to look
   for on the headset).
3. The game's entry script (see below) requests the VR session at page start, draws our own loading screen into it
   while the world builds, and hands the session to the game when it is ready. The page loads only from its own
   site: the game file and its pre-painted textures (`tex/`, optional: the game paints any that are missing). The
   game needs the internet to start; once loaded it makes no requests.
4. Meta's Bubblewrap template adds the hand-tracking permission and Meta's platform library (with 64-bit and 32-bit
   native code); `check_apk.sh` allows exactly that.

A change to the game is a new upload of the site (`tools/site`), not a new APK. A new APK is needed only for a new
APK version, host or launch setting (`tools/build_twa.sh`).

## Changes to the game: the entry script, the loading screen, and the gameplay fixes

Every change is made directly in the game file, `tools/uncompressed.html` (since 3.15.43, NOTES 87; before that a
build script applied a list of text edits to the author's original, which is no longer kept). `tools/FIXES.md` is the
changelog: each change with its reason and how it was proven (add an entry for every new one); `tools/BUGS.md`,
section Fixed, lists what they fix. The game file is minified (RULES.md 19, since 3.15.45): edit it in place in the
same style; `tools/build.sh --bump` minifies it again, copies it to `index.html` at the root and into the site, and
rebuilds the compressed version; the quick tier and the pre-commit hook refuse copies that differ, a game file that is
not fully minified, and a compressed version that does not unpack to it.

What the entry script does on a Quest browser (NOTES 34, 41, 42):

1. requests the immersive session at page start with the `layers` feature
   and parks it (the browser never grants a session on its own for a fresh
   immersive launch);
2. draws the loading screen into compositor layers: a cube layer for the sky
   and a quad layer for the title, the progress bar and the version (bottom right, A18), 1.3 x 0.65 m at 5 m (about 15 degrees, 3.15.21), which
   the browser re-renders every vsync with the current head pose whatever the
   page is doing, so turning the head during the boot never shows a stale frame;
3. slices the boot (`await __gtY(label)` before each heavy step, each character,
   and eight shader-compile chunks);
4. hands the session to the game through a facade (the layers shim in the head script):
   the browser forbids `baseLayer` on a session with the `layers` feature, so
   the game renders through an `XRProjectionLayer` behind an object that shows
   three.js its usual base layer (on the classic fallback an MSAA framebuffer resolved into the layer's
   eye texture each frame; on the multiview path, the release since 3.15.34, the game draws into the layer's
   texture array directly and nothing is resolved); the layer is never swapped (F-B31, since 3.15.43): native
   render scale, one fixed foveation (0) set at VR entry (F-B83, 4.0.13), and no quality levels (L1, 4.0.14);
   the loader's cube and quad layers leave the layer list but are kept, with the loader's context, for the whole
   session (B96, 4.0.34: B75's release reverted); a session's shim frees its framebuffers and depth buffers when
   the session ends, so entering VR again starts clean;
5. never ends the session on an entry failure: the error goes to the loading
   screen with two retries (the debug build's logging, the `/log` report, the black box and the native census, is
   taken out of the shipped final build: RULES.md 34);
6. uses the pre-rendered textures in `tex/` beside the page (`tools/prerender_textures.js`,
   with each texture's probe points) instead of repainting them at boot;
   text-bearing textures are still painted on the headset.

The "Press A" screen still works unchanged when the game is opened in a 2D
browser window on a non-Quest browser.

Rule (RULES.md 22, 2026-10-28): no A/B experiment builds; every change, the entry script's included, goes
straight into the main build and the author tests it after the PR is merged. (Until then entry-script changes
shipped first as experiment builds; 3.15.11 skipped that and crashed at launch, F-B15: test such changes headless
with `test_entry.js` before they go in.)

## Building

Requirements: Node 18+ and Python 3 for the game's build; for the Store APK also JDK 17+ and an Android SDK with
`build-tools;34.0.0` (`ANDROID_HOME` set, or `tools/twa/local.properties` with `sdk.dir=...`; git-ignored).

```sh
git config core.hooksPath tools/git-hooks   # once per clone: refuses a commit whose copies or root APK are stale
tools/build.sh --bump                   # after editing tools/uncompressed.html: everything, from the game file alone
tools/build.sh --bump --final           # the Store build: the same, but what ships is tools/final.html (no debug code)
tools/build_twa.sh --online             # only for a new Store APK (see below)
```

`tools/build.sh` minifies the game file (a no-op when it already is; when minifying changes it, `minify_identity.js`
proves the minified file builds exactly the same world as the edited one, object for object and bit for bit, or the
build stops), copies it to `index.html` (root) and `tools/site/index.html`, re-paints the pre-painted textures in
`tools/site/tex/`, raises the game's version (`tools/game_version.txt`) if what ships changed (`--bump`; without it the
build stops and says so; the new number is one past the higher of the game's and the APK's, so no number names two
things), stamps that version into the four places the game shows it (step 3b: the landing text, the gate's corner
twice, the VR loading box; it fails unless it finds exactly four) and syncs the copies again, finishes the site
(`build_site.py`: web manifest, icons, `assetlinks.json`; the zip to upload at `tools/.runs/site.zip`), builds the
compressed version `index.compressed.html` at the root, and checks the result (`sync_game.py --check`,
`experiment.py --check`, `check_apk.sh`, `test_standalone.js`, `test_compressed.js`; `--no-test` skips the last two).
Painting is seeded (FIXES R1), so an unchanged game file rebuilds the same `tex/`, byte for byte. Add the new
version's row to `tools/VERSIONS.md`. The steps by hand:

```sh
node tools/minify_game.js               # minify the game file in place (to a fixed point)
python3 tools/sync_game.py              # copy the game file to index.html (root) and tools/site/index.html
node tools/prerender_textures.js        # re-paint tools/site/tex/ (after a change to a texture painter)
# raise tools/game_version.txt if what ships changed (RULES.md 12)
# set the four "vX.Y.Z" strings in the game file to it, then run sync_game.py again (step 3b, A18)
python3 tools/build_site.py             # finish tools/site and zip it (tools/.runs/site.zip)
node tools/build_compressed.js          # rebuild index.compressed.html (RULES.md 20; the pre-commit hook refuses a stale one)
```

### The Store APK

`tools/build_twa.sh [--version-name X --version-code N] [--online]` runs Meta's Bubblewrap CLI
(`@meta-quest/bubblewrap-cli` 1.24.1, through npx) on `tools/twa/twa-manifest.json`: it generates the Android project,
applies Meta's packaging guide's one edit (`jcenter()` to `mavenCentral()`), builds and signs the APK with the release
key, copies it to the root as `GreeblisTown-release.apk` and runs `check_apk.sh` (`--online` also fetches the live
`assetlinks.json`). The version options raise the APK's version in `twa-manifest.json` first: every upload needs a
higher version code. Bubblewrap's own settings (`~/.bubblewrap/config.json`: this machine's JDK and SDK) are written
by the script.

### Signing

The Meta Quest Store requires every upload to be signed with the same key, forever, and the site's
`assetlinks.json` names that key's certificate. Create `tools/twa/keystore.properties` (git-ignored):

```
storePassword=...
keyPassword=...
```

and place the keystore at `tools/twa/keystore/greeblis-town-release.jks` (alias `greeblistown`; git-ignored).
`build_twa.sh` refuses to build without them. Back the keystore and its passwords up somewhere safe; losing them means
the store listing can never be updated.

## Testing

`tools/run_tests.sh` runs the suite in tiers (`--quick`, `--smoke`, the standard pass, `--full`; add `--resume` to
skip stages already passed after a machine restart). How to run and write tests: `tools/TESTING.md`; one row per
tool: `tools/README.md`; what each thing is tested by: `tools/TEST_PLAN.md`.

What each tier runs, stage by stage: `tools/TESTING.md` section 1. The full tier runs after every build (RULES.md
23), and its result goes into TEST_PLAN.md.

What cannot be tested here: the actual launch on a headset. Sideload and confirm that the app goes straight into VR
with no browser bar (the sign that the site's Digital Asset Links check passed):

```sh
adb install -r GreeblisTown-release.apk
adb logcat -s TwaLauncher TWALauncherActivity cr_OriginVerifier
```

For a play session's frame rate, capture the log live with `tools/capture_log.sh` (or `tools\capture_log.ps1` on
Windows); see `tools/HEADSET_DIAG.md`.

## Store submission checklist

- Package name `com.montgummery.greeblis` and the signing key must match any build previously uploaded to the app
  (ID 1441937125658740).
- Every upload needs a higher APK version code: `tools/build_twa.sh --version-name X --version-code N`.
- Upload `GreeblisTown-release.apk` (repository root) through the Meta Horizon Developer Dashboard
  (or `ovr-platform-util upload-quest-build`).
- `tools/check_apk.sh --online` checks the Store's web app rules (https start URL, Bubblewrap's `twa_generator`),
  the immersive launch, the manifest, signature, SDK-level, size and 64-bit checks from the VRC document, and the live
  Digital Asset Links file. `tools/check_final.sh` checks that the hosted game is the final build.
- The final build has a full tier pass recorded in `tools/TEST_PLAN.md` ("Latest results"; RULES.md 23), after the
  dead-code census and its removals (RULES.md 25), and only after the author's headset test of that candidate
  (RULES.md 32).
- The shipped game is the final build without the debug code (RULES.md 34: the log function and its `/log` report,
  its localStorage black box, the flight recorder, the light record, the native census, the frame-health counters,
  the performance log, every log call): **`tools/build.sh --bump --final`** builds it. After step 0,
  `final_build.js` writes `tools/final.html` from the game file and fails the build unless no debug code is left
  (0b); the copies (root `index.html`, `tools/site/index.html`, `index.compressed.html`), `tex/` (painted from the
  final build) and the compressed version are built from `final.html`; the version is stamped in the game file before
  the final build is written again (it shows the right version); the checks compare against `final.html` and add
  `test_final.js` (the final build played as shipped, no test hook). The game file keeps its debug code, so a later
  `tools/build.sh` (without `--final`) puts the game file back in the copies; until then the quick tier and the
  pre-commit hook check the copies as the game file's final build (`check_final.sh`), since `sync_game.py --check`
  fails on them by design.
- Upload `tools/site` (or `tools/.runs/site.zip`) to the site before the APK goes up (RELEASE.md), then
  `tools/check_final.sh` (online) confirms the hosted game.
