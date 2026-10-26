# tools/

| File | Purpose |
| --- | --- |
| `uncompressed.html` | The untouched final HTML version of the game. Source of truth. |
| `index.compressed.html` | The compressed HTML release build, kept for reference and parity checks. |
| `apply_entry_fix.py` | Generates `android/app/src/main/assets/index.html` from `uncompressed.html` by applying the four VR-entry edits. `--verify` checks the asset equals the original plus exactly those edits. |
| `GAME.md` | Basic documentation of the game as found in the code. |
| `run_tests.sh` | The test suite: runs everything below and prints a summary. `--quick` skips the browser tests. |
| `test_server.sh` | Compiles the APK's `GameServer` for a desktop JVM (`server_harness/` holds a stub `android.util.Log` and the `Harness` driver) and checks it serves the game byte-for-byte, plus HEAD/404/405/query handling and concurrency. `--serve` keeps it running at `http://127.0.0.1:17777/` so the game can be opened in a desktop browser exactly as the Quest Browser will see it. |
| `test_entry.js` | Headless Chromium (Playwright) test of the VR-entry fix with a fake `navigator.xr`: early grant, late grant, no grant. Run it against `uncompressed.html early` to see the original drop the grant. |
| `test_parity.js` | Unpacks the compressed release build in headless Chromium and checks it carries the same string and numeric literals as the uncompressed source. Writes details to `.parity/` (git-ignored). |
| `test_play.js` | Runs the game's real frame loop in headless Chromium: 2D boot, frames, errors, JS-heap growth, screenshot; then a simulated VR session using the vendored WebXR polyfill (`vendor/webxr-polyfill.js`, Cardboard device) driven by a `sessiongranted` event, checking the game enters the session, hides the gate, renders XR frames and returns to the gate on session end. Screenshots in `.runs/`. |
| `test_npc_home.js` | Reproduction harness for NPC return-home behaviour (default: Mushroom, id `drifter`). Injects a debug hook into a temporary copy of the game only, places the NPC and the player in 15 scenarios (inside/outside the kiosk, nav return, forced stuck re-plan, player blocking the doorway, far player so the teleport rescue is allowed), and reports whether he reaches the desk at height, with teleports, re-plans and 0.5 s traces in `.runs/npc_home_<id>.json`. |
| `spellcheck_dialogue.py` | Extracts prose strings from the game and reports words outside the dictionary and the game's own vocabulary; `--who HENNRICK` also lists one character's lines for proofreading. Needs `pip install pyspellchecker`. |
| `server_harness/` | Desktop-JVM stub for `android.util.Log` plus the `Harness` driver used by `test_server.sh` (includes malformed-request, oversized-line, slow-client and path-traversal cases). |
| `vendor/` | Third-party test dependency: `webxr-polyfill` 2.0.3 (Apache-2.0), used only by `test_play.js`. |
| `check_apk.sh` | Checks a built APK against VRC.Quest.Packaging.1-6 using `aapt2` and `apksigner`, plus the immersive launch wiring and that the bundled game matches the asset. |

## Running

```sh
export ANDROID_HOME=/path/to/android-sdk     # platforms/android-34, build-tools/34.0.0
tools/run_tests.sh                           # full suite (browser tests take a few minutes)
tools/run_tests.sh --quick                   # no browser tests
```

Individual tools:

```sh
python3 tools/apply_entry_fix.py             # regenerate the asset
python3 tools/apply_entry_fix.py --verify
tools/test_server.sh                         # or: tools/test_server.sh --serve
node tools/test_entry.js                     # patched asset, all scenarios
node tools/test_entry.js tools/uncompressed.html early
node tools/test_parity.js
node tools/test_play.js                      # 2d and vr scenarios, 20 s each
node tools/test_npc_home.js                  # Mushroom return-home scenarios
python3 tools/spellcheck_dialogue.py --who HENNRICK
tools/check_apk.sh android/app/build/outputs/apk/release/app-release.apk
```

Requirements: python3, JDK 17+, Node 18+ with `playwright` (and its Chromium)
installed, Android SDK for the server harness and APK checker.
