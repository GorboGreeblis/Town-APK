# tools/

The repository root holds only the final build, `GreeblisTown-release.apk`, and this folder. Everything else lives here: the Android project (`android/`), the untouched original game (`uncompressed.html`), the build and release guides (`BUILD.md`, `RELEASE.md`), notes, task and bug lists, game documentation, and the test suite described below.

| File | Purpose |
| --- | --- |
| `uncompressed.html` | The untouched final HTML version of the game. Source of truth. |
| `index.compressed.html` | The compressed HTML release build, kept for reference and parity checks. |
| `apply_entry_fix.py` | Generates `android/app/src/main/assets/index.html` (inside tools/) from `uncompressed.html` by applying the VR-entry edits (`EDITS`) and the approved gameplay fixes (`GAME_FIXES`: the Mushroom navigator fix, Hennrick's campfire line). `--verify` checks the asset equals the original plus exactly those edits. |
| `GAME.md` | Basic documentation of the game as found in the code. |
| `TASKS.md` / `BUGS.md` | Living lists of open tasks and open bugs (fixed items at the bottom). |
| `run_tests.sh` | The test passes. `--smoke`: a few-minute spot check that touches every game element. Default: the standard pass. `--full`: every scenario with long soak times, meant for the final build only. `--quick`: static checks, no browser. |
| `test_server.sh` | Compiles the APK's `GameServer` for a desktop JVM (`server_harness/` holds a stub `android.util.Log` and the `Harness` driver) and checks it serves the game byte-for-byte, plus HEAD/404/405/query handling and concurrency. `--serve` keeps it running at `http://127.0.0.1:17777/` so the game can be opened in a desktop browser exactly as the Quest Browser will see it. |
| `test_entry.js` | Headless Chromium (Playwright) test of the VR-entry fix with a fake `navigator.xr`: early grant, late grant, no grant. Run it against `uncompressed.html early` to see the original drop the grant. |
| `test_parity.js` | Unpacks the compressed release build in headless Chromium and checks it carries the same string and numeric literals as the uncompressed source. Writes details to `.parity/` (git-ignored). |
| `test_play.js` | Runs the game's real frame loop in headless Chromium: 2D boot, frames, errors, JS-heap growth, screenshot; then a simulated VR session using the fake WebXR device in `fakexr.js` driven by a `sessiongranted` event, checking the game enters the session, hides the gate, renders XR frames and returns to the gate on session end. Screenshots in `.runs/`. |
| `lib/harness.js` | Shared boot for behaviour tests: serves a temporary copy of the game with a debug hook, installs `fakexr.js`, fires the grant and waits for XR frames (the game only runs NPCs, pickups and input while presenting). |
| `test_world.js` | Routes never cross hulls and reach their target; no NPC inside a foreign building or outside the park over a sampling window; blossom/acorn pickup and regrow; the away watchdog returns a displaced NPC. |
| `test_input.js` | Fake controllers through `fakexr.js`: dead-zone, left-stick walking speed, right-stick snap turn (one step per deflection), trigger/grip events, player never inside a building hull. |
| `test_progression.js` | Drives the game's own entry points: every talk line through the dialogue box, a dance battle fought to the end (Artifact awarded), the shop (Flower Hat, seeds quest), the library finale with three Artifacts (Gem), the pizza courier, and with `--long` the full gardening event and the walk home afterwards. |
| `test_soak.js` | Stability soak: N minutes in the fake VR session with pickups, dialogue, shop, battle and pizza in a loop; samples heap and renderer counts every cycle and fails on errors or unbounded growth (`node tools/test_soak.js [file] [minutes]`). |
| `test_courier.js` | Orders a pizza with the player standing inside the church on the far side of the Ancient (`left` or `right`), starts Nextessa at the church door, and checks she delivers, never stands still for more than 8 s, and walks back out (B11). |
| `test_visits.js` | Forces visits with the Mushroom as host and as visitor, lets them complete or interrupts them at a chosen stage, and checks he ends back on his desk at height with his stand height restored. |
| `test_npc_home.js` | Reproduction harness for NPC return-home behaviour (default: Mushroom, id `drifter`). Injects a debug hook into a temporary copy of the game only, places the NPC and the player in 15 scenarios (inside/outside the kiosk, nav return, forced stuck re-plan, player blocking the doorway, far player so the teleport rescue is allowed), and reports whether he reaches the desk at height, with teleports, re-plans and 0.5 s traces in `.runs/npc_home_<id>.json`. |
| `spellcheck_dialogue.py` | Extracts prose strings from the game and reports words outside the dictionary and the game's own vocabulary; `--who HENNRICK` also lists one character's lines for proofreading. Needs `pip install pyspellchecker`. |
| `server_harness/` | Desktop-JVM stub for `android.util.Log` plus the `Harness` driver used by `test_server.sh` (includes malformed-request, oversized-line, slow-client and path-traversal cases). |
| `fakexr.js` | Minimal deterministic WebXR device (sessions, reference spaces, stereo views, frames, fake controllers, visibility, session end) installed into the page for the VR scenarios. No sensors or network. |
| `check_apk.sh` | Checks a built APK against VRC.Quest.Packaging.1-6 using `aapt2` and `apksigner`, plus the immersive launch wiring and that the bundled game matches the asset. |

## Running

```sh
export ANDROID_HOME=/path/to/android-sdk     # platforms/android-34, build-tools/34.0.0
tools/run_tests.sh --smoke                   # spot check, minutes
tools/run_tests.sh                           # standard pass
tools/run_tests.sh --full                    # final build only, long
tools/run_tests.sh --quick                   # static checks only
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
tools/check_apk.sh tools/android/app/build/outputs/apk/release/app-release.apk
```

Requirements: python3, JDK 17+, Node 18+ with `playwright` (and its Chromium)
installed, Android SDK for the server harness and APK checker.
