# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T16 | **Top priority** (RULES.md "Priorities"; the biggest blocker for the Store submission): the planting Event on the Quest 3S steadily above 60 fps. The 3.15.41 run tied it to draw calls (NOTES 79); the 3.15.47 log shows it CPU-bound (app GPU time 9.3 of 13.9 ms, NOTES 91); P23-P25 cut draws (3.15.47-3.15.50; P23 was the 4,000-vertex scenery cap, now 60,000); next CPU candidates `bend` (Etcher's tentacles) and `gFit` (the moving creatures' ground fit, NOTES 93); next readings from T3 | open, after the other open tasks | `PERF.md` sections 12-13 |
| T3 | Headset run of the latest build (3.15.52), log captured live (`capture_log.ps1` / `.sh`): the Event's frame rate, especially with Backpacka in view (P25) and from the ring back to the dance floor (P23, P24); no flashes, B pressed right after any (D2); the first seconds after entering VR (F-B36) and the Event's first start (F-B33); Backpacka solid at the pond (F-B37); the seeded sky and blinks (R5); quit cleanly. Earlier runs: 3.15.41 (NOTES 79-81), 3.15.46-3.15.47 (NOTES 90-91) | open, author | `HEADSET_DIAG.md`, `RELEASE.md` sections 3 and 5 |
| T4 | Store upload: the latest build (3.15.52) to the Alpha channel, then the age group (13+) on its build page, once T16's frame rate holds | open, author | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T18 | Full pass on 3.15.52 (RULES.md 23), with `--resume`; then re-run docs consistency (it failed on timing: the pass started a minute before README listed RANDOMNESS.md) and add `test_seeded.js` (joined after the pass started) | running | `TESTING.md`, `tools/.runs/full_3.15.52.log`. (Was: the standard pass on 3.15.45, done: `std_v45.log`, every stage but the texture census, F-B32) |
| T8 | Remaining test-plan rows: the dialogue layout test (`test_textfit.js`, written, to run and add to the tier), a 10-minute play rerun on the latest build (`test_soak.js`; last recorded in TEST_PLAN.md on 3.15.19), the townsfolk's spreading (`ho`; first check it ever runs, since every townsperson has an idle pattern) | in progress | `tools/TEST_PLAN.md` |
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

## Earlier resume point (3.15.45: one game file, rebuildable, minified)

- **3.15.42** (PR #20): no texture made during play (F-B29, F-B30; `texture_census.js`), the Event's pizza batched
  (P20). **3.15.43** (PR #21): no layer swaps and no uploads inside a frame (F-B31), the Event scale removed
  (P16-P18), the Ancient left out from outside the church (P21), Gooward's translucent parts merged (P22); the game
  file `tools/uncompressed.html` is edited directly (NOTES 87). **3.15.44** (PR #22): painted textures seeded (R1),
  `RULES.md`, `build.sh`, `test_standalone.js`. **3.15.45** (branch `claude/gallant-fermi-pydail`): the game file
  minified (R2); the compressed version back as a Bitcoin ordinal, `tools/index.compressed.html` (never in the APK).
- The standard pass on 3.15.45 finished (TEST_PLAN.md): every stage but the texture census (F-B32, 3.15.46).

## Earlier resume point (3.15.41: release; tests for the town's life)

- **Release 3.15.41** (root APK, versionCode 41, merged with PR #18): P19 holds the Portal's light off while the
  bulb is lit (F-B28, found by `warm_coverage.js`). Standard and full tiers pass (TEST_PLAN.md); the performance
  report is calibrated to machine speed (NOTES 77, TESTING.md 3).
- **PR #19** (merged): five tests join the standard tier: roaming, the Mama Gorbo and Gooward meetings, the jazz
  drums' timing, audio leaks, far detail and the batcher (NOTES 78). `run_tests.sh --resume` survives machine
  restarts. `TESTING.md` is the how-to for running and writing tests.
- **Event performance: closed** (the author, "let's close out 3"): P16-P18; estimates in PERF.md 11 until the
  author's next headset run. *(Since: the 3.15.41 run showed the Event limited by draw calls (NOTES 79), P16-P18 were
  removed in 3.15.43, and performance is now the top priority, T16.)*
- **Open (author):** T3, T4, T10.

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

## Earlier resume point (3.15.34: multiview is the release path)

- **3.15.33-3.15.34** (draft PR #16, branch `claude/gallant-fermi-pydail`): multiview draws both eyes
  in one pass (draw calls halved, per eye pixel-identical); the Quest 3S ran the town at 72 fps and
  the Event at 58-65. The flashes it showed are fixed by uploading textures before the frame
  (F-B26, awaiting the author's headset check). Quest 2 and the original Quest are not supported
  (manifest `quest3|quest3s`). Texture-array batching closed by the author (PERF.md 10).
- **Docs:** RENDERING.md (the frame, the rules and their tests), FIXES.md (the changelog of the game file).
- **Open (author):** upload 3.15.40 to the Alpha channel, then confirm the age group (13+) on its build
  page (RELEASE.md 4); a headset run of 3.15.40 (the flashes, F-B26; the Event in OVR Metrics). Done: the
  IARC age rating, B27 (3.15.39), Quest Pro dropped (3.15.35),
  the privacy page with its deletion section live, Quest 3 and 3S selected in the dashboard.

## Earlier resume point (3.15.32 built: draw calls and vertex work, nothing visible changed)

- **3.15.28-3.15.32** (P8 merged with PR #14; P9-P13 on branch `claude/gallant-fermi-pydail`, draft
  PR #15): Event frame about 390 -> 300 draws (both eyes), batch vertices -57%, scenery vertex runs
  -46%, tentacle bend 2.8x faster; every change pixel- or bit-identical (NOTES 59-64, PERF.md 8).
  Standard tier passed on 3.15.32. Probes ruled out fill, overdraw, the Event's lights, GC and hidden
  geometry as the remaining cost.
- **Next needs the author:** a headset run with `perf_log.js` (or OVR Metrics in the Event) to say
  CPU-bound or GPU-bound; then the look-changing levers in PERF.md 8 (LOD for dense meshes,
  anisotropy, start-level foveation, render scale) or the multiview experiment.

## Earlier resume point (3.15.27 built, frame-rate line and the performance report)

- **3.15.27** (branch `claude/gallant-fermi-pydail`, draft PR): the frame-rate log
  line (P7), `perf_report.js` as a pass/fail stage of the full tier with
  `perf_baseline.json`, `perf_log.js` for the headset's log (NOTES 57, 58; PERF.md
  section 7). Standard tier passed; the perf report passed.
- Next: the author's headset run with 3.15.27, then `node tools/perf_log.js run.txt`
  on the logcat; RELEASE.md step 7 items unchanged.

## Earlier resume point (3.15.26 built, performance pass and Zollod)

- **3.15.19 passes the author's full headset run, no new issues.** Upload candidate
  until a later build is confirmed; RELEASE.md section 5.
- **3.15.27** (root APK, versionCode 27, draft PR): 3.15.26 plus P7, a frame-rate line
  every ten seconds in logcat while presenting (HEADSET_DIAG.md), so the author's next
  run measures itself. PERF.md lists what was investigated after 3.15.26 and why not done.
- **3.15.26** (pushed to main): 3.15.25 plus the performance
  pass (P1 governor, P2 light-on shaders pre-compiled, P4 opacity-0 objects skipped,
  P5 ground-fit scan throttled; NOTES 56, PERF.md section 6) and B25 (Zollod's kiosk:
  four shared-walker fixes, his scenarios all clean). Nothing visible changed (the
  author's rule). Standard tier result in TEST_PLAN.md.
- **The author's next headset run decides the Event**: FPS in the garden before the
  Event and the OVR Metrics GPU/CPU utilisation during it (RELEASE.md step 7). The
  levers left all change the look and need the author's yes: the Event's point light
  and night lighting, Lambert flora, foveation at the start level, lower render scale.
- Carried over: VRC confirmations (RELEASE.md step 7), the privacy page upload,
  Hennrick's cuffs, the loading panel, the Store fronts, Mushroom's hat, the Robin.
- Remaining: T4 store upload (author); T10 lore (author); T15 tools/docs upkeep.
