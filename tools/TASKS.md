# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T2 | Safe release build. 3.15.7 (root APK, PR #5): request at page start, sliced boot, own in-VR loading screen (NOTES 34). Needs the headset to confirm: no OS loading screen beyond a second or two, loading screen visible, then the game | awaiting headset confirmation of 3.15.7 | PR #5 |
| T3 | Headset test of the release build (direct-to-VR launch, play through, quit cleanly) | open, developer | `RELEASE.md` section 3 |
| T4 | Store upload: Alpha channel first, listing assets, questionnaires, privacy policy URL | open, developer | `RELEASE.md` section 5 |
| T5 | Extend the input test: body collision, park bounds, pick ray and menu choice through fake controllers (dead-zone, walking, snap turn, select/squeeze, hull collision already pass) | open | `tools/test_input.js` |
| T6 | Progression test: gem trade, pizza timing (30 s portal delay) and shop pause all pass on 3.15.6; shop `shyFree` gate still untested | mostly done | `tools/test_progression.js` |
| T7 | World test: blossom/acorn regrow check | done (regrow at 12 s confirmed once the harness ran at real speed, see BUGS F4) | `tools/test_world.js` |
| T8 | Remaining test-plan items: roamers never inside hulls over minutes, NPC schedules (meet, visits, vignettes), greeting freeze, audio node leaks, quality governor, context loss, long soak | open | `tools/TEST_PLAN.md` |
| T9 | Full pass on the final build (`tools/run_tests.sh --full`) and record the results | open | only on the final build |
| T11 | Performance analysis of the APK build: wrapper overhead, renderer/XR settings as bundled (framebuffer scale, foveation, target Hz, adaptive quality), draw calls and per-frame CPU cost measured in the harness; report possible improvements before changing anything | in progress | this list, `NOTES.md` |
| T12 | Full performance testing pass: boot profile (`tools/boot_profile.js`: parse, texture painting, batching, shader compile, time to first XR frame), runtime probe (`tools/perf_probe.js`: draw calls, triangles, programs, per-frame update CPU, heap over time), long-session memory growth, and on-headset numbers (frame time, quality-governor level, dropped frames via the browser's WebXR stats / `adb shell dumpsys`); record results in `TEST_PLAN.md` and compare before/after any improvement | open | `tools/boot_profile.js`, `tools/perf_probe.js`, `TEST_PLAN.md` |
| T13 | Full graphical bug finding pass: per-frame brightness and frame-diff probe in the harness (one-frame white flashes, B12), z-fighting / sorting of transparent objects, label and sprite pop-in, fog and sky seams, batched-shader part errors (wrong transform or colour for a frame), finale scenery hide/show, night/day material transitions; screenshots of each scene from the test camera positions, compared before/after any change; then an on-headset checklist walk (shop kiosk at distance during pickups, garden ground during the Event with Backpacka and music) | open, priority for B12 | `tools/flash_probe.js` (to write), `TEST_PLAN.md` |
| T14 | Full stability pass (`tools/test_soak.js` written, first 10-minute run pending): long sessions (30-60 min headless with all systems running: visits, Event, battles, pizza, pickups in a loop) watching heap growth, texture/geometry/program counts, timer and audio-node counts, console errors; repeated Event and battle cycles; VR session end/restart cycles; on the headset: sleep/wake, guardian break, controller disconnect, long idle | open | `tools/perf_probe.js`, new soak script, `TEST_PLAN.md` |
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
