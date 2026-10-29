# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T16 | **Top priority** (RULES.md "Priorities"; the biggest blocker for the Store submission): the planting Event on the Quest 3S steadily above 60 fps. It is limited by draw calls (NOTES 79); next readings from T3; open lever: the batcher's 4,000-vertex scenery cap | open, after the other open tasks | `PERF.md` sections 12-13 |
| T3 | Headset run of the latest build (3.15.46): no flashes in a dance battle, speaking to Nextessa, planting or at the Summoning Pillar (F-B29-F-B31), the Event's frame rate in the log (`perf_log.js`), the emote colours, Gooward (P22), the Speech after a pizza call (P19's case), quit cleanly. The 3.15.41 run is done (NOTES 79-81) | open, author | `RELEASE.md` sections 3 and 5, `RENDERING.md` section 6 |
| T4 | Store upload: 3.15.46 to the Alpha channel, then the age group (13+) on its build page | open, author | `RELEASE.md` section 5; the listing, IARC rating, privacy page and supported devices are done |
| T17 | Randomness decision list: `random_census.js` run on 3.15.49 (120 call sites); the list is `RANDOMNESS.md`: 3 world-layout items to seed (stars, clouds, flint facing), 11 cosmetic, 10 settled by the rule, 2 library; two dance-battle outcomes not reached by the census; the UFO's heading is not random today (seeded generator) | decided: c11 removed (R4); d1, d2, c1-c4, c9 seeded (R5); d3 and the UFO intended as they are; open: the two dance-battle outcomes, and the author's word on the items recommended to stay random | `RULES.md` 5, `RANDOMNESS.md` |
| T18 | Standard pass on 3.15.45 | running | `TESTING.md`; the quick tier and `test_standalone.js` pass (RELEASE.md 5) |
| T8 | Remaining test-plan rows: the dialogue layout test (`test_textfit.js`, written, to run and add to the tier), a 10-minute play rerun on the latest build (`test_soak.js`; last recorded in TEST_PLAN.md on 3.15.19), the townsfolk's spreading (`ho`; first check it ever runs, since every townsperson has an idle pattern) | in progress | `tools/TEST_PLAN.md` |
| T9 | Full pass on the final build, with `--resume` | last done for 3.15.41 (NOTES 77); due for 3.15.45 after T18, before an upload | `TESTING.md` |
| T15 | Keep the docs and tools current with each change | ongoing | `README.md`, `TESTING.md` |

## Resume point (3.15.45: one game file, rebuildable, minified)

- **3.15.42** (PR #20): no texture made during play (F-B29, F-B30; `texture_census.js`), the Event's pizza batched
  (P20). **3.15.43** (PR #21): no layer swaps and no uploads inside a frame (F-B31), the Event scale removed
  (P16-P18), the Ancient left out from outside the church (P21), Gooward's translucent parts merged (P22); the game
  file `tools/uncompressed.html` is edited directly (NOTES 87). **3.15.44** (PR #22): painted textures seeded (R1),
  `RULES.md`, `build.sh`, `test_standalone.js`. **3.15.45** (branch `claude/gallant-fermi-pydail`): the game file
  minified (R2); the compressed version back as a Bitcoin ordinal, `tools/index.compressed.html` (never in the APK).
- **Running:** the standard pass on 3.15.45 (T18).
- **Open (author):** T3 (headset run of 3.15.46), T4, T17's decisions.
- **Then:** T16, Event performance on the Quest 3S (PERF.md 13).

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
| D16 | Lore Bible open questions answered by the author (2026-10-28): Mama W, the Field Office, the poster and book names, the eras (Hennrick far past, Nextessa far future), the Consortium (Maltoe and Mushroom), the Ancient (not the Originator), Backpacka (unknown), the mayor (Montgummery, near future); two left open on purpose | `tools/LORE.md` |
| D15 | The game file minified (R2, `minify_identity.js`); the compressed version as a Bitcoin ordinal (`build_compressed.js`, `test_compressed.js`) (3.15.45) | 2026-10-28 |

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
