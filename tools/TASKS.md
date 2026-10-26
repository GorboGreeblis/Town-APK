# Open tasks

Living list. Done items move to the bottom with the date. Bugs live in
`BUGS.md`; investigation notes in `../NOTES.md`.

## Open

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| T2 | Safe release build. main holds 3.15.2, which stalls on the loading screen (B9). B9's cause is found and fixed in 3.15.4 (serve as http://localhost); once the headset confirms a direct VR launch, PR #4 lands the safe build on main | awaiting headset confirmation | PR #4 |
| T3 | Headset test of the release build (direct-to-VR launch, play through, quit cleanly) | open, developer | `RELEASE.md` section 3 |
| T4 | Store upload: Alpha channel first, listing assets, questionnaires, privacy policy URL | open, developer | `RELEASE.md` section 5 |
| T5 | Extend the input test: body collision, park bounds, pick ray and menu choice through fake controllers (dead-zone, walking, snap turn, select/squeeze, hull collision already pass) | open | `tools/test_input.js` |
| T6 | Progression test: verify the gem-trade entry point, pizza arrival timing, shop `shyFree` gate | open | `tools/test_progression.js` |
| T7 | World test: blossom/acorn regrow check (currently fails at 15 s; find the real regrow condition) | open | `tools/test_world.js` |
| T8 | Remaining test-plan items: roamers never inside hulls over minutes, NPC schedules (meet, visits, vignettes), greeting freeze, audio node leaks, quality governor, context loss, long soak | open | `tools/TEST_PLAN.md` |
| T9 | Full pass on the final build (`tools/run_tests.sh --full`) and record the results | open | only on the final build |
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
