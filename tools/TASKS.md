# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T19 | S12 continued: shapes still uploaded the first time they are drawn during play (all between frames, held by the geometry hold, none inside a frame). Done in 4.0.14 (S21): Backpacka's rainbow and three water rings, the portal's open effect and panels (the warm-up now shows unseen materials and uploads what its draw misses). The Garden's 24-vertex box is covered by the same upload. The shop's item preview (194 + 97 vertices) is built while loading in 4.0.15 (S22). The Gem stand's ring is on the GPU before the Speech (a headless Speech on 4.0.14 uploads nothing: S16 and S21 cover it). Left: the Event's four 312-vertex shapes (the census of 4.0.11; a first Event on 4.0.14, 150 s at fast sim, holds nothing: the play census on 4.0.15 decides whether anything is left) | open | `play_census.js`; FIXES S11-S17, S21 |
| T28 | The second review's open findings (T27): done in 4.0.18: B83 (lights kept visible, intensity driven to 0), B84 (`instancing` in the shader hold's conditions; own materials for instanced batches), B86 (the courier's clock paused under every panel), the leftovers (L2). Left: B79 (instrument the frog's stall: position, home, dest, nav and the nearby circles at each trip), B85 (the emotes' glyph set pre-rendered, no eviction), B87, B88; the tools audit's remaining items (the `quest2` harness profile, `slice_profile.js`) | in progress | BUGS B79, B85, B87, B88 |
| T23 | Full code audit (the author: "perform a full audit of the game's code to catch any potential issues"; "this is the final version ... no leftovers from past games or past systems should be present"): five parallel reviews of the beautified game file (the entry script and layers shim, the three.js multiview patches, the engine side, the game logic, the leftovers from past systems) done 2026-11-02: 4 high/medium and 7 low defects fixed (S19, S20; B56-B70), the leftovers removed (L1; B71), five low findings kept open (B72-B76); still to do: the full tier on 4.0.14 with `GT_COVERAGE=1` and the dead-code census (`dead_code.js`) on its coverage (the 4.0.13 run died with the session's worker) | in progress (2026-11-02) | FIXES S19, S20, L1; `tools/.runs/full_4.0.14.log` |
| T24 | The test suite, documentation and tools fully built out to catch any remaining issue (the author): every element in GAME.md's index with a test (the Post Office's mail pile: `test_mailpile.js`, 4.0.15); every FIXES entry since 4.0.7 with a check (done so far); the report tools re-checked on the current build (7 of 11 ran clean; `fill_probe.js`, `event_cpu.js`, `occlusion_census.js` not yet re-run alone); the tool audit for obsolete or redundant files; `test_safeties.js`'s two frame-count checks made load-proof (B53: done 4.0.14) | open | `README.md`, `TEST_PLAN.md`, `TESTING.md` |
| T9 | The full pass after every build, with `--resume` (RULES.md 23) | ongoing; last finished for 3.15.54 (NOTES 96) | `TESTING.md` |
| T15 | Keep the docs and tools current with each change | ongoing | `README.md`, `TESTING.md` |

### Waiting on the author (headset test, Store upload)

Worked around until the author can do them (the author, 2026-10-31).

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T3 | Headset run of the latest build: 4.0.15 run on 2026-11-02 (log f57f19a2: no flashes, FPS passes, the dancers fine); next, 4.0.17 (the bigger HUD, the hands at entry, the second review's safeties) | open, author | `HEADSET_DIAG.md`, `RELEASE.md` sections 3 and 5 |
| T18 | Full pass on the final build (RULES.md 23), with `--resume`, and the Ordinals check on its compressed version (ordinals.com, ordiscan.com and Quest Browser) (the author: "Please treat this as the final build until I say otherwise"; "postpone the full pass until I can test in headset first") | the Ordinals check done on 4.0.9 (NOTES 100: all passed, both explorers' policies and the preview frame; the real Quest Browser on the headset is the author's); the full pass waiting on T3 | `TESTING.md`; the last finished full pass was 3.15.54 (NOTES 96) |
| T4 | Store upload: the final build to the Alpha channel, then the age group (13+) on its build page (T16's frame rate now holds in the headset, 2026-10-31) | open, author; after T3 and T18 | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T26 | The headset-confirmation backlog: confirmed by the author's 4.0.15 run (2026-11-02): F-B83 (no tiles at the edge of view), S18-S20 (no flashes), the FPS bar; still to confirm when convenient: A41 (the HUD on the watch, now bigger: A44), A42 (pizza boxes fade), A43 (the Ormstown parcel), P34 (no long frame at the Event's start: the log shows none) | open, author | VERSIONS.md 4.0.7-4.0.17 |
| T27 | Another full code review after this pass (the author, 2026-11-02): five reviews on 4.0.15 done 2026-11-02 (the entry script and layers shim, the three.js multiview patches, the engine side, the game logic, the leftovers): one high (B78), three medium (B80, B83, B84) and nine low findings; B78, B80, B81, B82 fixed in 4.0.17 (S24); the rest logged (B79, B83-B88) for T28; the leftovers found (a dead visit helper, write-only head-script fields, two diagnostic counters, stale doc wording) for 4.0.17 | done (2026-11-02) | FIXES S24; BUGS B78-B88 |

## Resume point (4.0.18, 2026-11-02)

- **Builds since the author's last headset run (4.0.15, 2026-11-02, log f57f19a2: no flashes, FPS passes, the dancers
  fine):** 4.0.17 the HUD 10 cm wide (A44), the hands and watch built while loading (S23), the second code review's
  safeties (S24: B78, B80-B82); 4.0.18 the point lights always visible (B83), `instancing` in the shader hold (B84),
  the courier's clock under panels (B86), leftovers (L2). PRs #47-#55 merged; PR #56 (4.0.15-4.0.18) open as a draft.
- **The author** tests when they can: the bigger HUD and the hands at entry are the next things to look at (T3).
- **Running or queued on the machine when this was written:** the full tier with coverage started on 4.0.17 and
  continued on the 4.0.18 asset after the build landed mid-run (`tools/.runs/full_4.0.17.log`; its one failure so far,
  the compressed check, is that mid-run swap: the check passes on 4.0.18), then the dead-code census, the play census
  and the content test alone (a queue script in `tools/.runs/`, session scratch). For a clean census, run `GT_COVERAGE=1 tools/run_tests.sh
  --standard` on the 4.0.18 asset and `node tools/dead_code.js tools/android/app/src/main/assets/index.html`.
- **Next:** T28's remaining items (B79 when a trip carries its state, B85, B87, B88), T19's last shape by the play
  census, T24's tool re-runs alone (`fill_probe.js`, `event_cpu.js`, `occlusion_census.js`); then the full pass on the
  last build (T18) once the author's headset run (T3) has happened.

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
| D26 | T25, B49 explained: every float the jitter test caught was a text scene's gesture (the hop, the bow); the test skips scenes (4.0.14) | 2026-11-02 |
| D25 | T22, the flashes' single-variable headset test (the `ovronly` and `nomultiview` experiment sessions): closed by the author without a run, "let's close out T22" (2026-11-02); the experiments stay buildable (`build_experiment.sh`) | 2026-11-02 |
| D24 | T21, Mama Gorbo's cap (F-B80) and the watch (F-B81): the author's look in the headset, "T21 passes" (2026-11-02) | 2026-11-02 |
| D23 | T20, the Event's start without a long frame (P34, 4.0.11); T8, the remaining test-plan rows (3.15.68); B50 and B51, both the tests (4.0.12, 4.0.13: `test_stands.js` passes on the built 4.0.13) | 2026-11-02 |
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
