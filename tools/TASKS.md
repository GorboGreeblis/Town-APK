# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T2 | Safe release build. 3.15.11 (root APK, PR #6; 3.15.7 is on main) = 3.15.7 + B4r, B2, effects pre-warm, cacheable page, pre-rendered textures, compositor-layer loading screen (B13): request at page start, sliced boot, own in-VR loading screen (NOTES 34). Needs the headset to confirm: no OS loading screen beyond a second or two, loading screen visible, then the game | awaiting headset confirmation | PR #6 |
| T3 | Headset test of the release build (direct-to-VR launch, play through, quit cleanly) | open, developer | `RELEASE.md` section 3 |
| T4 | Store upload: Alpha channel first, listing assets, questionnaires, privacy policy URL | open, developer | `RELEASE.md` section 5 |
| T5 | Input test extended: body collision, park bounds, controller pick + menu choice + dialogue (plus dead-zone, walking, snap turn, select/squeeze, hull) | done | `tools/test_input.js` |
| T6 | Progression test: gem trade, pizza timing (30 s portal delay) and shop pause all pass on 3.15.6; shop `shyFree` gate still untested | mostly done | `tools/test_progression.js` |
| T7 | World test: blossom/acorn regrow check | done (regrow at 12 s confirmed once the harness ran at real speed, see BUGS F4) | `tools/test_world.js` |
| T8 | Remaining test-plan items: roamers never inside hulls over minutes, NPC schedules (meet, visits, vignettes), greeting freeze, audio node leaks, quality governor, context loss, long soak | open | `tools/TEST_PLAN.md` |
| T9 | Full pass on the final build (`tools/run_tests.sh --full`) and record the results | open | only on the final build |
| T11 | Performance analysis of the APK build: wrapper overhead, renderer/XR settings as bundled (framebuffer scale, foveation, target Hz, adaptive quality), draw calls and per-frame CPU cost measured in the harness; report possible improvements before changing anything | in progress | this list, `NOTES.md` |
| T12 | Full performance testing pass: boot profile (`tools/boot_profile.js`: parse, texture painting, batching, shader compile, time to first XR frame), runtime probe (`tools/perf_probe.js`: draw calls, triangles, programs, per-frame update CPU, heap over time), long-session memory growth, and on-headset numbers (frame time, quality-governor level, dropped frames via the browser's WebXR stats / `adb shell dumpsys`); record results in `TEST_PLAN.md` and compare before/after any improvement | open | `tools/boot_profile.js`, `tools/perf_probe.js`, `TEST_PLAN.md` |
| T13 | Full graphical bug finding pass: per-frame brightness and frame-diff probe in the harness (one-frame white flashes, B12), z-fighting / sorting of transparent objects, label and sprite pop-in, fog and sky seams, batched-shader part errors (wrong transform or colour for a frame), finale scenery hide/show, night/day material transitions; screenshots of each scene from the test camera positions, compared before/after any change; then an on-headset checklist walk (shop kiosk at distance during pickups, garden ground during the Event with Backpacka and music) | open, priority for B12 | `tools/flash_probe.js` (to write), `TEST_PLAN.md` |
| T14 | Full stability pass (`tools/test_soak.js`; 10-minute soak on 3.15.8 passes; longer runs and on-headset items still open): long sessions (30-60 min headless with all systems running: visits, Event, battles, pizza, pickups in a loop) watching heap growth, texture/geometry/program counts, timer and audio-node counts, console errors; repeated Event and battle cycles; VR session end/restart cycles; on the headset: sleep/wake, guardian break, controller disconnect, long idle | open | `tools/perf_probe.js`, new soak script, `TEST_PLAN.md` |
| T15 | Continue building out tools and documentation: keep `README.md`, `BUILD.md`, `GAME.md`, `TEST_PLAN.md`, `PERF.md` and `NOTES.md` current with each change; extend the harness (fake XR layers support so the compositor-layer loading screen can be exercised headless, controller poses), add probes as new questions come up, and document every new tool in `README.md` | open, ongoing | `tools/` |
| T10 | Lore Bible: fill the open questions (the Ancient, Mama W, flint vs acorns, Field Office, sign names) | open, author | `tools/LORE.md` |

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

## Resume point (3.15.34: multiview is the release path)

- **3.15.33-3.15.34** (draft PR #16, branch `claude/gallant-fermi-pydail`): multiview draws both eyes
  in one pass (draw calls halved, per eye pixel-identical); the Quest 3S ran the town at 72 fps and
  the Event at 58-65. The flashes it showed are fixed by uploading textures before the frame
  (F-B26, awaiting the author's headset check). Quest 2 and the original Quest are not supported
  (manifest `quest3|quest3s`). Texture-array batching closed by the author (PERF.md 10).
- **Docs:** RENDERING.md (the frame, the rules and their tests), FIXES.md (generated by
  `gen_fixes_doc.py`, checked in the quick tier).
- **Open (author):** a headset run of 3.15.40 (the flashes, F-B26; the Event in OVR Metrics); the
  age-group self-certification (13+) in the dashboard. Done: B27 (3.15.39), Quest Pro dropped (3.15.35),
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
