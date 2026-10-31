# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T3 | Headset run of the latest build (4.0.9; 4.0.7 run on 2026-10-31, log 5dc2b257, no flashes seen), log captured live (`capture_log.ps1` / `.sh`): the Event's frame rate from afar and from the back of the dance floor; Fortizmo in and out of her bar; the Mushroom on his desk and walking (not floating); Mama Gorbo, Gooward and Etcher in and around the Garden (no jitter); Mama Gorbo's goo by the pond; Gemtoe's tie from the side; the Cave's entrance and walkway; the mist (30 s in and out, close to the fence); the version in the loading box's corner; no flashes, B pressed right after any (D2): the mark now logs `rec light` (the drawn picture's brightness around it) and `rec xr frames` (S15), which tell whether a flash was drawn by the game; on 4.0.8/4.0.9 also the HUD on the watch (A41) and the pizza boxes fading at the Event's end (A42) | open, author | `HEADSET_DIAG.md`, `RELEASE.md` sections 3 and 5 |
| T4 | Store upload: the final build to the Alpha channel, then the age group (13+) on its build page (T16's frame rate now holds in the headset, 2026-10-31) | open, author; after T3 and T18 | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T18 | Full pass on the final build (RULES.md 23), with `--resume`, and the Ordinals check on its compressed version (ordinals.com, ordiscan.com and Quest Browser) (the author: "Please treat this as the final build until I say otherwise"; "postpone the full pass until I can test in headset first") | waiting on T3 | `TESTING.md`; the last finished full pass was 3.15.54 (NOTES 96) |
| T19 | S12 continued: the last shapes still uploaded the first time they are drawn during play (all between frames, held by the geometry hold, none inside a frame): the Speech's three bubble shapes (100, 76 and 148 vertices), Backpacka's water in the Event (165), the Event's mist panel (520), the church's inside on first entry (14 objects), the Event's pizza boxes' two draw batches (new each Event, by design); upload them while loading where they are fixed | open | `play_census.js`; FIXES S11-S14 |
| T20 | The Event's start costs one long frame (about 42 ms, every Event, headset logs 8d838908 and 5dc2b257): spread its set-up over several frames | open | the log's "long frame 42 ms event" at each "ev event false > true" |
| T21 | Mama Gorbo's cap (F-B80) and the watch (F-B81): the author's look in the headset | open, author | pictures in FIXES F-B80, F-B81 |
| T8 | Remaining test-plan rows | done 3.15.68 | The townsfolk's spreading (`ho`): every townsperson has an idle pattern, so it runs only while one walks home (`goHome`, set by the navigator `Be`, which also sets `wanderAt` 120 s on): it is the walk-home mover, tested by `test_stuck.js` and the gazebo probe (Gemtoe home in 11 s); its spread-out branch runs only if a walk home takes over 2 minutes (a fallback). S1's safeties: `test_safeties.js`. |
| T9 | The full pass after every build, with `--resume` (RULES.md 23) | ongoing; last finished for 3.15.54 (NOTES 96) | `TESTING.md` |
| T15 | Keep the docs and tools current with each change | ongoing | `README.md`, `TESTING.md` |

## Resume point (3.15.68: the final build's full pass)

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
- **3.15.65-3.15.67** (PRs #37, #38): the Event's CPU (F-B63, P31-P33: culling skips draw-nothing subtrees, the matrix
  walk skips still groups, the fade groups of RULES.md 26), the pond never faded (F-B64), the gazebo's walls solid
  (F-B65), the fade-in safety (S3), the Event's flowers taller and more colourful (A20, A22), the pond's ripples (A21).
  Tools: `event_cpu.js`, `event_sweep.js`, `test_stands.js`, `shots.js` presets `park`, `pond`, `stands`.
- **Next:** the stability pass and the bug-finding pass (the author's tasks), then the full pass on the latest build
  (`tools/.runs/full_<version>.log`; fix what it finds, a game fix is a new build and a new pass), then the Ordinals
  check (T18).
- **3.15.68**: the pond's stones flat (A23), fourteen clouds (A24), the recovery safeties (S4, S5) with
  `test_recover.js`, `test_safeties.js` (S1), `test_gazebo.js` (F-B65); P32 never marks a moving group.
- **4.0.0**: the clouds whitened (A25).
- **4.0.1**: the fade groups stay out until the Event ends (A26).
- **Open (author):** T3 (headset run of 4.0.1), T4.
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
| D22 | T16, the frame rate (top priority): the author, 2026-10-31: "The FPS now fully passes the bar, in headset" (4.0.7-4.0.9; PERF.md sections 13-14) | 2026-10-31 |
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
