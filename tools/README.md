# tools/

The repository root holds only the final build, `GreeblisTown-release.apk` (always the latest build, the author's rule; `check_apk.sh` and the pre-commit hook check that it contains the current asset), the one-file game as bundled in it (`index.html`, the author's request: the whole game lives in one HTML file, and that file is kept at the root as well as inside the Android project; `apply_entry_fix.py` writes both and `--verify` and `check_apk.sh` check they match), and this folder. Everything else lives here: the Android project (`android/`), the untouched original game (`uncompressed.html`), the build and release guides (`BUILD.md`, `RELEASE.md`), notes, task and bug lists, game documentation, and the test suite described below.

| File | Purpose |
| --- | --- |
| `uncompressed.html` | The untouched final HTML version of the game. Source of truth. |
| `index.compressed.html` | The compressed HTML release build, kept for reference and parity checks. |
| `apply_entry_fix.py` | Generates `android/app/src/main/assets/index.html` (inside tools/, mirrored to `index.html` at the repository root) from `uncompressed.html` by applying the VR-entry edits (`EDITS`) and the approved gameplay fixes (`GAME_FIXES`: the Mushroom navigator fix, Hennrick's campfire line). `--verify` checks the asset equals the original plus exactly those edits. |
| `GAME.md` | Basic documentation of the game as found in the code. |
| `VRC.md` | The build checked against every Meta Horizon Store VRC: evidence per check, the headset confirmations that remain, the dashboard items for the author. |
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
| `prerender_textures.js` | Captures the game's procedural canvas textures once (headless boot of a capture variant) into `android/app/src/main/assets/tex/` with a manifest; the shipped game blits them instead of repainting. Re-run after any change to `uncompressed.html` or the fix list. |
| `test_soak.js` | Stability soak: N minutes in the fake VR session with pickups, dialogue, shop, battle and pizza in a loop; samples heap and renderer counts every cycle and fails on errors or unbounded growth (`node tools/test_soak.js [file] [minutes]`). |
| `test_courier.js` | Orders a pizza with the player standing inside the church on the far side of the Ancient (`left` or `right`), starts Nextessa at the church door, and checks she delivers, never stands still for more than 8 s, and walks back out (B11). |
| `test_visits.js` | Forces visits with the Mushroom as host and as visitor, lets them complete or interrupts them at a chosen stage, and checks he ends back on his desk at height with his stand height restored. |
| `test_npc_home.js` | Reproduction harness for NPC return-home behaviour (default: Mushroom, id `drifter`). Injects a debug hook into a temporary copy of the game only, places the NPC and the player in 15 scenarios (inside/outside the kiosk, nav return, forced stuck re-plan, player blocking the doorway, far player so the teleport rescue is allowed), and reports whether he reaches the desk at height, with teleports, re-plans and 0.5 s traces in `.runs/npc_home_<id>.json`. |
| `spellcheck_dialogue.py` | Extracts prose strings from the game and reports words outside the dictionary and the game's own vocabulary; `--who HENNRICK` also lists one character's lines for proofreading. Needs `pip install pyspellchecker`. |
| `test_zfight.js` | Graphical pass: every planar triangle of the built world (the batcher's merged sources in place of its batch meshes; undersides at ground level and overlaps buried inside a third box are listed as hidden) bucketed by its world plane (batched parts resolved through the batcher's `gcPart` attribute); coplanar overlaps between different surfaces are confirmed by rendering the two surfaces alone twice with a 1 mm camera shift and counting flipped pixels. Fails the full pass on a real depth fight; lists the stable and same-look overlaps for the record. |
| `git-hooks/pre-commit` | Git hook (`git config core.hooksPath tools/git-hooks`): when the bundled game, its root copy, the root APK, the generator, the original or the Gradle file is staged, runs `apply_entry_fix.py --verify` and checks that the root APK contains the current asset; refuses the commit if the root `index.html` or the root APK is stale. |
| `test_coincident.js` | Graphical pass, the curved complement of `test_zfight.js`: every triangle of the drawn world (the batcher's merged sources in place of its batch meshes) up to 0.6 m across goes into a 5 cm spatial hash; pairs from different surfaces with different looks and nearly parallel normals are sampled 2 mm apart for points within 0.5 mm of the other's plane and inside it. The growth of that region at a fifth of the tolerance tells a coplanar or tangent contact (a depth fight, fails the pass) from two surfaces crossing at an angle (listed). Contacts the headset cannot show are listed as hidden: undersides at ground level, two closed solids resting back to back (closedness from the edge count), and contacts buried inside a third box. Found the second half of B20. `--save` writes a context view and close-up per pair with the near points in red to `.runs/coinc/`; `--dump NAME` prints the triangles at a named spot. Geometric, because the headless renderer's depth precision is finer than the Quest's and such bands do not flicker here. |
| `zfight_sweep.js` | Optional report: renders a grid of town views and a close orbit of every character three times (0.1 mm and 1 mm camera shifts) and flags views whose flips do not grow with the shift. Slow (about 20 minutes) and it did not catch B20 headless, for the reason above; kept for gross fights only, not part of the tiers. |
| `sides_check.js` | Graphical pass: renders 184 views (town grid and every character) with the single-sided pass (P6) on and off in the same frame and counts differing pixels; silhouette edges differ by one pixel (rasterisation), any area difference fails. |
| `event_probe.js` | Report: what the Garden Event adds to the frame, sampled every 2 s for 90 s (draw calls, triangles, points, visible meshes, transparent objects, lights, heaviest objects). |
| `event_profile.js` | Report: main-thread CPU profile before and during the Event (functions by self time, JS ms per XR frame). |
| `sharpness_probe.js` | Report: render scale per quality level, fixed foveation, pixel ratio, MSAA samples, and every texture's size, mipmaps and anisotropy (what decides crispness on the headset). |
| `entry_profile.js` | Report: the main thread across the VR handover (long gaps between renders, CPU attribution of the first 600 ms and the whole window), to prove nothing heavy runs after the user is dropped in (B16). |
| `hitch_probe.js` | Report: worst frame and the shader programs, textures, geometries and scene objects created by the first pickup, a new label, a dialogue, the battle panel and the Event start. |
| `perf_report.js` | **Performance report (full tier, pass/fail).** Boots once into VR and runs the game's situations in sequence (town standing, walking, among the creatures, dialogue, shop panel, battle panel, the Speech, the planting Event in three 30 s phases). Per situation: frame time split into script and GL (draw calls stubbed by default so the software GL's own pipeline compiles do not hide the game's cost; `--draw` rasterises), the top script functions by self time with a source excerpt (the cause), new shader programs / textures / geometries / objects, draw calls, triangles, visible transparent objects, lights, creatures within 25 m, heap. Fails on a shader compile during play, script p99 over 12 ms (16 in the Event), a script frame over 120 ms, or a 30% rise against `perf_baseline.json` (`--update-baseline`). `--only <regex>`, `--no-profile`, `--json out`. |
| `perf_log.js` | Headset log reader: `adb logcat -d -s GreeblisServer > run.txt; node tools/perf_log.js run.txt` summarises the game's own `perf fps=...` lines (3.15.27+) by scene (town, the Event): min/median, the five lowest readings with the player's position, governor levels, and verdicts against the 72 fps target and the 60 fps floor with the likely cause (triangles, draw calls, GPU-bound at the governor's floor). |
| `draw_calls.js` | Report: what one frame draws at the spawn, the town centre and (`--event`) in the planting Event: draws by class (batch, creature, pickup, other), batches by material signature, and every unbatched draw with the reason the batcher left it out (over 4,000 vertices, transparent, multi-material, lone signature in its group, switched-off batch part...). `--detail` lists each one with its owner and materials. |
| `opt_identity.js` | **Optimisation identity check (pass/fail).** Every performance change that claims no visible change publishes an on/off switch; this renders a town grid and orbits of the affected meshes with the switch on and off in the same frame, fails on any pixel difference beyond rasterisation noise, and counts the draw calls and triangles each state costs. Also checks the batcher as a whole (merged parts against their own meshes) and P12 (indexed scenery against the exact original layout). Renders to the canvas in VR sessions and refuses blank images. Runs at load and 25 s into the planting Event. |
| `test_bend_exact.js` | **P13 exactness test (standard tier).** Runs the tentacle bend from the original game and from the asset on 400 generated tentacles and compares every output word. |
| `visibility_census.js` | Report: draws every opaque mesh in an ID colour from a grid of standable positions (three eye heights, six directions) and counts its pixels: meshes never visible (geometry drawn for nothing) and meshes by triangles per largest on-screen size (level-of-detail candidates). |
| `fill_probe.js` | Report: transparent layers shaded per pixel (opaque drawn to depth, transparent meshes with an additive counter), the worst views, and the meshes responsible; at load and in the planting Event. |
| `overdraw_probe.js` | Report: opaque fragments shaded per covered pixel in the order the game really draws (recorded, then replayed with a counter), against front-to-back order. |
| `alloc_probe.js` | Report: bytes allocated per second by function (sampling heap profiler) and the garbage collector's share of main-thread time, standing, walking and in the Event. |
| `slice_profile.js` | Report: CPU profile of the boot attributed to the boot slices (hot functions per slice, clock-aligned), the tool that found the blob-body march (NOTES 49). |
| `geom_compare.js` | Boots two assets and compares every character's mesh vertices; proves a change to the model builders does not change the models. |
| `flash_probe.js` | Report: screenshots consecutive frames around a pickup and reports per-frame brightness jumps (the white-flash investigation, B12; no headless reproduction, kept for the record). |
| `boot_profile.js`, `perf_probe.js` | Reports: CPU profile of the sliced boot (loading time), and scene cost (draw calls, triangles, materials). |
| `lib/xr_layers_shim.js` | The WebXR Layers mode of the entry script (embedded by `apply_entry_fix.py`): compositor layers for the loading screen, a projection layer behind a session facade for the game (NOTES 42). |
| `build_experiment.sh NAME` | Builds an A/B variant APK (`sharp`, `nolayers`, `nobatch`, `noeffects`, `nogovernor`) into `.runs/`, same package and version as the release. |
| `VERSIONS.md` | Build history: every version, what changed, what the headset said. |
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
node tools/test_zfight.js                    # coplanar overlaps / z-fighting in the built world
node tools/test_coincident.js --save         # near-coincident curved surfaces (z-fighting), pictures in .runs/coinc/
node tools/slice_profile.js --top 6          # CPU time per boot slice (loading-time work)
node tools/geom_compare.js a.html b.html     # prove two assets build the same character meshes
node tools/test_play.js <asset> vr-nofloor   # the local-floor fallback scenario
node tools/sharpness_probe.js                # render scale, foveation, texture filtering report
node tools/entry_profile.js                  # what runs across the VR handover
node tools/test_npc_home.js                  # Mushroom return-home scenarios
python3 tools/spellcheck_dialogue.py --who HENNRICK
tools/check_apk.sh tools/android/app/build/outputs/apk/release/app-release.apk
```

Requirements: python3, JDK 17+, Node 18+ with `playwright` (and its Chromium)
installed, Android SDK for the server harness and APK checker.
