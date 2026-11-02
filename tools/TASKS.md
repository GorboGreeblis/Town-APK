# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T19 | S12 continued: shapes still uploaded the first time they are drawn during play (all between frames, held by the geometry hold, none inside a frame): the Event's flowers (312 vertices, 4 per Event), Backpacka's water ripple ring (165), the Event's mist panel (520), the portal's open effect (205 + two 4-vertex panels), the shop's item preview (194 + 97), the Gem's stand ring (148: built at load, dropped again before the Speech). The Gem's stand (S16) and the Ancient's body (S17) done. | open | `play_census.js` on 4.0.11; FIXES S11-S17 |
| T23 | Full code audit (the author: "perform a full audit of the game's code to catch any potential issues"; "this is the final version ... no leftovers from past games or past systems should be present"): five parallel reviews of the beautified game file (`tools/.runs/audit/`: the entry script and layers shim, the three.js multiview patches, the engine side, the game logic, the leftovers from past systems), the full tier on 4.0.13 with `GT_COVERAGE=1` and the dead-code census (`dead_code.js`) on its coverage, then every finding verified against the code, logged in BUGS.md and fixed through draft PRs (the author: "apply fixes to the main build and keep working around my lack of confirmation") | in progress (2026-11-02) | `tools/.runs/full_4.0.13.log`, `tools/.runs/coverage/` |
| T24 | The test suite, documentation and tools fully built out to catch any remaining issue (the author): every element in GAME.md's index with a test (the Post Office's mail pile has pictures only); every FIXES entry since 4.0.7 with a check (done so far); the report tools re-checked on the current build (7 of 11 ran clean; `fill_probe.js`, `event_cpu.js`, `occlusion_census.js` not yet re-run alone); the tool audit for obsolete or redundant files; `test_safeties.js`'s two frame-count checks made load-proof (B53) | open | `README.md`, `TEST_PLAN.md`, `TESTING.md` |
| T25 | B49, Gooward and Mama Gorbo 0.3-0.5 m off their drawn position outside the Event: `test_jitter.js` passed on 4.0.10 and failed twice before; since 4.0.12 the worst float carries whether the character was in a text scene or the meeting (their hop gestures lift the model on purpose); decide from the next failure whether it is the scenes (then the test excludes them) or a real float | open | BUGS B49 |
| T9 | The full pass after every build, with `--resume` (RULES.md 23) | ongoing; last finished for 3.15.54 (NOTES 96) | `TESTING.md` |
| T15 | Keep the docs and tools current with each change | ongoing | `README.md`, `TESTING.md` |

### Waiting on the author (headset test, Store upload)

Worked around until the author can do them (the author, 2026-10-31).

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T3 | Headset run of the latest build (4.0.13; the author cannot test now, 2026-11-02; fixes keep landing on the main build meanwhile): the dancers at the edge of view with the head pitched (B52) and `fov=0` in every perf line; flashes, with B pressed right after any (the mark logs the state trail and `rec xr frames`; a lost draw now shows black, not white); then the `ovronly` and `nomultiview` experiment APKs (T22); 4.0.7 run on 2026-10-31, log 5dc2b257, no flashes seen; log captured live (`capture_log.ps1` / `.sh`) | open, author | `HEADSET_DIAG.md`, `RELEASE.md` sections 3 and 5 |
| T21 | Mama Gorbo's cap (F-B80) and the watch (F-B81): the author's look in the headset | open, author | pictures in FIXES F-B80, F-B81 |
| T18 | Full pass on the final build (RULES.md 23), with `--resume`, and the Ordinals check on its compressed version (ordinals.com, ordiscan.com and Quest Browser) (the author: "Please treat this as the final build until I say otherwise"; "postpone the full pass until I can test in headset first") | the Ordinals check done on 4.0.9 (NOTES 100: all passed, both explorers' policies and the preview frame; the real Quest Browser on the headset is the author's); the full pass waiting on T3 | `TESTING.md`; the last finished full pass was 3.15.54 (NOTES 96) |
| T4 | Store upload: the final build to the Alpha channel, then the age group (13+) on its build page (T16's frame rate now holds in the headset, 2026-10-31) | open, author; after T3 and T18 | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T22 | The flashes' single-variable headset test (S18): the `ovronly` experiment APK (built on request with `tools/build_experiment.sh ovronly`: OVR_multiview2, no MSAA; the two test APKs are not kept on disk or in the repo, the author's note of 2026-11-02) installed over 4.0.13 for one session of normal play, then 4.0.13 back; if the flashes stop with it, the OCULUS_multiview path is the cause and the next build moves off it (a supersampled OVR path); if they go on, the `nomultiview` experiment APK (`GreeblisTown-exp-nomultiview.apk`: the classic two-pass path the author remembers as flash-free) is the next session's test | open, author | FIXES S18; `tools/build_experiment.sh ovronly`; RULES.md 22 (reinstall the release after) |
| T26 | The headset-confirmation backlog: changes landed on the main build without the author's headset run, to be confirmed in one session when the author can test again: F-B83 (foveation fixed at 0: no tiles at the edge of view), S18 (the flash safeties: any flash now black, not white?), F-B80/F-B81 (cap, watch), A41 (the HUD on the watch), A42 (pizza boxes fade), A43 (the Ormstown parcel), P34 (no long frame at the Event's start: no "long frame 42 ms event" at `ev event false > true`) | open, author | VERSIONS.md 4.0.7-4.0.13 |

## Resume point (4.0.13, 2026-11-02)

- **Builds since the author's last headset run (4.0.7, 2026-10-31):** 4.0.8 the HUD on the watch (A41); 4.0.9 the pizza
  boxes fade (A42); 4.0.10 the Ormstown parcel (A43), the head guard's shader at VR entry (F-B82); 4.0.11 the Event's
  start without a long frame (P34), the Gem's stand uploaded at load (S16); 4.0.12 the Ancient's body uploaded at load
  (S17); 4.0.13 foveation fixed at 0 (F-B83, B52) and the flash safeties (S18). PRs #47-#54 merged.
- **The author cannot test now** (2026-11-02): fixes keep landing on the main build through draft PRs; everything
  since 4.0.7 is listed for one confirming session (T26); the flash test plan is T22.
- **Running or queued on the machine:** the pitched per-eye comparisons (B52), then the full tier on 4.0.13 with
  coverage (`tools/.runs/full_4.0.13.log`), then the dead-code census; five code reviews in flight (T23).
- **Next:** verify and fix the audit's findings (T23), remove the leftovers it confirms, finish T19, T24, T25; then
  the full pass on the last build (T18) once the author's headset run (T3) has happened.

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
