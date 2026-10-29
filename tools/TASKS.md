# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T16 | **Top priority** (RULES.md "Priorities"; the biggest blocker for the Store submission): the planting Event on the Quest 3S steadily above 60 fps. The 3.15.41 run tied it to draw calls (NOTES 79); the 3.15.47 log shows it CPU-bound (app GPU time 9.3 of 13.9 ms, NOTES 91); P23-P25 cut draws (3.15.47-3.15.50; P23 was the 4,000-vertex scenery cap, now 60,000); next CPU candidates `bend` (Etcher's tentacles) and `gFit` (the moving creatures' ground fit, NOTES 93); next readings from T3 | open, after the other open tasks | `PERF.md` sections 12-13 |
| T3 | Headset run of the latest build (3.15.52), log captured live (`capture_log.ps1` / `.sh`): the Event's frame rate, especially with Backpacka in view (P25) and from the ring back to the dance floor (P23, P24); no flashes, B pressed right after any (D2); the first seconds after entering VR (F-B36) and the Event's first start (F-B33); Backpacka solid at the pond (F-B37); the seeded sky and blinks (R5); quit cleanly. Earlier runs: 3.15.41 (NOTES 79-81), 3.15.46-3.15.47 (NOTES 90-91) | open, author | `HEADSET_DIAG.md`, `RELEASE.md` sections 3 and 5 |
| T4 | Store upload: the latest build (3.15.52) to the Alpha channel, then the age group (13+) on its build page, once T16's frame rate holds | open, author | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T18 | Full pass on 3.15.52 (RULES.md 23), with `--resume` | running | `TESTING.md`, `tools/.runs/full_3.15.52.log`. (Was: the standard pass on 3.15.45, done: `std_v45.log`, every stage but the texture census, F-B32) |
| T8 | Remaining test-plan rows: the dialogue layout test (`test_textfit.js`: a run on 3.15.52 was stopped unfinished after 30 minutes; shorten its wait per page, then add it to the standard tier), the townsfolk's spreading (`ho`; first check it ever runs, since every townsperson has an idle pattern) | in progress | `tools/TEST_PLAN.md` |
| T9 | The full pass after every build, with `--resume` (RULES.md 23; was "on the final build", superseded) | ongoing; 3.15.52 is T18; last finished for 3.15.41 (NOTES 77) | `TESTING.md` |
| T15 | Keep the docs and tools current with each change | ongoing | `README.md`, `TESTING.md` |

## Resume point (3.15.52: flashes, Event batching, the randomness decisions)

- **3.15.46-3.15.52** (PRs #23-#28): F-B32-F-B37 (no texture made or first uploaded in a frame, the Event's start,
  the mipmap switch in slices, Backpacka solid at the pond), P23-P25 (batching), D2 (the B mark, long frames),
  R3-R6, rules 22 and 23; tools: `event_start_check.js`, `test_backpacka.js`, `test_seeded.js`,
  `capture_log.ps1`/`.sh`, `pass_report.js`, the harness's frame-hazard watch, `perf_log.js` `VrApi` lines.
- **Running:** the full pass on 3.15.52 (T18).
- **Open (author):** T3 (headset run of 3.15.52), T4.
- **Then:** T16 (PERF.md 13).

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
