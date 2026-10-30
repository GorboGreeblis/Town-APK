# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T16 | **Top priority** (RULES.md "Priorities"; the biggest blocker for the Store submission; the author: "Never below 60 fps is the goal", "Tiny visual changes are ok to reach 60 fps", and it must hold on the Quest 3 as well as the 3S): the planting Event steadily above 60 fps. The author's 3.15.58 run read 56-59 fps at (-33, -7) (CPU 12-14 ms of 13.9); on 3.15.60 the lowest, watching the Event from afar, was 54 fps. Since: P26, P27, P29, P30, F-B57 (PERF.md section 14; P28 tried and removed, F-B56). Next: the author's reading on 3.15.63; then, if needed, the Quest 3's render scale and the matrix walk | open | `PERF.md` sections 13-14 |
| T3 | Headset run of the latest build (3.15.64), log captured live (`capture_log.ps1` / `.sh`): the Event's frame rate from afar and from the back of the dance floor; Fortizmo in and out of her bar; the Mushroom on his desk and walking (not floating); Mama Gorbo, Gooward and Etcher in and around the Garden (no jitter); Mama Gorbo's goo by the pond; Gemtoe's tie from the side; the Cave's entrance and walkway; the mist (30 s in and out, close to the fence); the version in the loading box's corner; no flashes, B pressed right after any (D2) | open, author (planned for 2026-10-31) | `HEADSET_DIAG.md`, `RELEASE.md` sections 3 and 5 |
| T4 | Store upload: the final build to the Alpha channel, then the age group (13+) on its build page, once T16's frame rate holds | open, author | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T18 | Full pass on the final build (RULES.md 23), with `--resume`, and the Ordinals check on its compressed version (the author: "Please treat this as the final build until I say otherwise") | next | `TESTING.md`; the last finished full pass was 3.15.54 (NOTES 96) |
| T8 | Remaining test-plan rows: the townsfolk's spreading (`ho`; first check it ever runs, since every townsperson has an idle pattern); a test for S1's head-inside guard and draw-hook safety | open | `tools/TEST_PLAN.md`. Done: the dialogue layout test (3.15.63, full tier, about a minute: 296 lines, 337 pages, all fit) |
| T9 | The full pass after every build, with `--resume` (RULES.md 23) | ongoing; last finished for 3.15.54 (NOTES 96) | `TESTING.md` |
| T15 | Keep the docs and tools current with each change | ongoing | `README.md`, `TESTING.md` |

## Resume point (3.15.64: the final build's full pass)

- **3.15.53-3.15.63** (PRs #29-#36): the mist bank and the Event's fades (A4-A9, A16, A19), Backpacka into the mist
  (A7), the Mushroom's ramp (F-B39, F-B52), flashes (F-B48, F-B51, F-B54; safeties S1, S2), Fortizmo's pathing for
  every doorway townsfolk (F-B55), the flat Garden (F-B57), the Cave floor (F-B60), Mama Gorbo's goo (F-B58),
  Gemtoe's tie (F-B59), the version on the loading box (A18), P26-P30, the dead-code census (R8); tools:
  `test_stuck.js`, `test_jitter.js`, `test_shaderhold.js`, `shots.js`, the harness's `renderEvery` and
  `fastSim: 'matrices'`, a quick `test_textfit.js` (NOTES 99).
- **3.15.64**: the full pass on 3.15.63 found two bugs and was stopped for a new build: F-B61 (a held geometry upload
  left the last object drawn with another geometry's index buffer: WebGL error 1282 every frame; Sparkakus's bulb beam)
  and F-B62 (standalone: the mural's disposed placeholders re-uploaded inside the first headset frame). Tools: every
  test now fails the pass on a WebGL error (`GT_GLERR=1` names the call and object), `test_standalone.js` fails on
  frame hazards, `run_tests.sh` prints each stage's result as it ends (`grep '^--- '`).
- **Next:** the full pass on 3.15.64 (`tools/.runs/full_3.15.64.log`; fix what it finds, a game fix is a new build and
  a new pass), then the Ordinals check (T18).
- **Open (author):** T3 (headset run of 3.15.64), T4.
- **Then:** T16 from the author's reading.

## Done

| # | Task | Date |
| --- | --- | --- |
| D1 | Diagnose the APK loading hang and apply the VR-entry fix | 2026-10-26 |
| D2 | Self-contained Android project, signed APK, store-rules checker | 2026-10-26 |
| D3 | Test tooling: server harness, entry test, parity, play test, fake WebXR device, world/input/progression/NPC tests, tiered runner | 2026-10-26 |
| D4 | Game documentation, test plan, first-pass Lore Bible, release guide | 2026-10-26 |
| D5 | Mushroom root cause found and fixed (navigator wall test); Hennrick line fixed | 2026-10-26 |
| D6 | Mushroom fix confirmed: 17/17 return-home scenarios pass at real-time simulation | 2026-10-26 |
| D7 | Visit system verified: host/visitor visits complete and interrupted (out, meet, back) all end with Mushroom on his desk at height | 2026-10-26 |
| D8 | Multiview as the release path, flash fix (F-B26), Quest 2 and the original Quest dropped (3.15.33-3.15.34) | 2026-10-27 |
| D9 | Event performance: P14, P16-P18 (3.15.36-3.15.40; P16-P18 removed in 3.15.43); B27 (3.15.35, 3.15.39); closed by the author, reopened as T16 | 2026-10-27 |
| D10 | Content, governor, HUD, greeting and warm-up coverage tests; P19 (3.15.41); standard and full tiers pass | 2026-10-28 |
| D11 | Former T2 (safe release build), T5-T7, T11-T14 (performance and stability passes, the graphical pass, the soak): done across 3.15.11-3.15.41, recorded in TEST_PLAN.md and PERF.md | 2026-10-28 |
| D12 | The flashes after the 3.15.41 headset run: textures made during play (F-B29, F-B30, `texture_census.js`) and the Event's pizza batched (P20) (3.15.42) | 2026-10-28 |
| D13 | No layer swaps and no uploads inside a frame (F-B31), the Event scale removed (P16-P18), P21, P22, the occlusion census (nothing to remove); one game file edited directly (3.15.43) | 2026-10-28 |
| D14 | The game rebuildable from the game file: painted textures seeded (R1), `test_standalone.js`, `build.sh`; `RULES.md` (3.15.44) | 2026-10-28 |
| D15 | The game file minified (R2, `minify_identity.js`); the compressed version as a Bitcoin ordinal (`build_compressed.js`, `test_compressed.js`) (3.15.45) | 2026-10-28 |
| D16 | Lore Bible open questions answered by the author (2026-10-28): Mama W, the Field Office, the poster and book names, the eras (Hennrick far past, Nextessa far future), the Consortium (Maltoe and Mushroom), the Ancient (not the Originator), Backpacka (unknown), the mayor (Montgummery, near future); two left open on purpose | 2026-10-28 (`tools/LORE.md`) |
| D17 | Randomness decision list (`RANDOMNESS.md`, former T17): all decided. Removed the no-effect colour picks (R4); seeded the stars, clouds, blinks, idle phases, Anomalee's glitch timing and jaw, the Event ring's sway (R5); BOW OUT 80% (R6); everything else stays random or as it is (flint facing, the UFO's path, particles, sound pitch, the dancers' moves) (3.15.51-3.15.52) | 2026-10-29 |
| D18 | Flashes and the Event after the 3.15.46 and 3.15.47 runs: F-B32-F-B37, P23-P25, D2, the frame-hazard watch in every test (3.15.46-3.15.50) | 2026-10-29 |
| D19 | 3.15.53-3.15.60: the mist bank and the Event's fades, Backpacka into the mist, the Mushroom's ramp, flashes (F-B48, F-B51), seams (F-B47), the randomness decisions applied; PRs #29-#33 | 2026-10-30 |
| D20 | 3.15.62-3.15.63: Fortizmo's pathing (F-B55), the Mushroom floating (F-B56), the flat Garden (F-B57), the goo (F-B58), Gemtoe's tie (F-B59), the Cave floor (F-B60), the mist over the fence (A19), the version on the loading box (A18), flash safeties (S1, S2), P29-P30, the dead-code census (R8); PRs #34-#35 | 2026-10-30 |
| D21 | Tools pass before the final full pass: the quick dialogue layout test, `renderEvery` and `fastSim: 'matrices'`, `shots.js`, `perf_log.js`'s new lines, the docs check of the tier list (PR #36). (D numbers here are tasks; FIXES.md's D entries are diagnostics, a separate numbering.) | 2026-10-30 |
