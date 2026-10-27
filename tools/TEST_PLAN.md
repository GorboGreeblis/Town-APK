# Greeblis Town test plan

What has to work for the game to be "fully tested", grouped by system as found
in the code (`tools/uncompressed.html`), with how each item can be tested and
what currently covers it. "Headless" means the real game running in headless
Chromium under the tools in this folder, driven through a debug hook that is
injected only into a temporary test copy. "Headset" means only a Quest can
confirm it.

Legend for the Coverage column: **done** (automated and passing), **partial**,
**todo** (automatable, not yet written), **headset** (manual, on device).

## Test passes

Three tiers run the same scripts with different scope (`tools/run_tests.sh`):

- **Smoke** (`--smoke`): a few minutes; touches every element once (short
  soak, first NPC scenarios, short sampling). For every build.
- **Standard** (default): the everyday pass.
- **Full** (`--full`): every scenario, long soak and sampling windows, plus
  the release parity check. Meant for the final build only.
- **Quick** (`--quick`): the static checks only (asset verify, server harness,
  spell-check, the bend test, the APK check, FIXES.md up to date). Seconds.

Browser stages run multiview by default (`GT_MULTIVIEW=1`, the release path);
`GT_MULTIVIEW=0` runs the classic fallback.

## 1. Packaging and launch (APK)

| Item | How | Coverage |
| --- | --- | --- |
| APK manifest, SDK levels, signature, size, features (VRC.Quest.Packaging.1-6) | `check_apk.sh` | done |
| Bundled game byte-identical to the generated asset; asset = original + 4 entry edits | `check_apk.sh`, `apply_entry_fix.py --verify` | done |
| Loopback server: serves the document, HEAD/404/405, query ignored, concurrency, malformed input, slow client, traversal | `test_server.sh` | done |
| Launcher starts the server and opens the Quest Browser immersive activity; browser fires `sessiongranted`; app closes on `finishAndRemoveTask` | sideload | headset |
| Android lint | `gradle lintRelease` | done (warnings recorded) |

## 2. Boot and VR entry

| Item | How | Coverage |
| --- | --- | --- |
| World builds without errors; gate shows "Press A" when ready | `test_entry.js`, `test_play.js 2d` | done |
| Early `sessiongranted` is captured, session requested inside the handler and parked; reused when ready; no duplicate request | `test_entry.js early` | done |
| Late grant and no-grant (click) paths | `test_entry.js late/none` | done |
| Entering a real session: three.js takes the session, gate hides, XR frames render, in-VR UI builds, audio context created | `test_play.js vr` (fake device) | partial (harness being finished) |
| Leaving VR: session end restores 2D camera, gate returns, audio wakes | `test_play.js vr` | partial |
| Reference space fallback `local-floor` → `local` with `floorOffset` | `test_play.js` scenario `vr-nofloor` (`fakexr.supportLocalFloor=false`) | done (standard tier) |
| Visibility/blur handling in session (`visibilitychange`, `Ho.capture/restore`) | `test_play.js` vr scenario: hidden then visible, frames resume | done |
| WebGL context loss and restore (`Ho`) | `test_play.js` vr scenario: `WEBGL_lose_context` lose/restore | reported: frames do not resume headless (B19, closed as will-not-fix: no headset reproduction, visibility path resumes) |
| Real headset: direct-to-VR launch, floor height, comfort settings | sideload | headset |

## 3. Input and locomotion (`we`, `t.xr`)

| Item | How | Coverage |
| --- | --- | --- |
| Left stick walk with dead-zone, speed, collision with buildings (`F.solid`) and bodies (`uo`), park bounds | `test_input.js` | partial (bodies, bounds todo) |
| Right stick snap turn 30°, no repeat while held | `test_input.js` | done |
| Trigger/grip (`select`/`squeeze`): pick ray, pick range/cone, menu choice, UI buttons 4/5 | `test_input.js` (events only) | partial |
| Controller mapping on real hardware (hand assignment, haptics) | sideload | headset |

## 4. World and collision

| Item | How | Coverage |
| --- | --- | --- |
| Building hulls/parts keep player and NPCs out; workers may enter their own kiosk and stand on their home part | `test_npc_home.js` (NPC side); player side | partial |
| Zones (`E`: still/portal/scenery/pool/phone/stump) and roam grids (`JGP.roamFree`, `JGP.route` A*) produce walkable routes between any two open cells | `test_world.js` | done |
| Far-detail LOD swaps at 62/66 m without popping errors; instanced batching (`gcEB`) keeps matrices valid | headless: move the camera and count visible meshes; check no NaN matrices | todo |

## 5. NPC behaviour

| Item | How | Coverage |
| --- | --- | --- |
| Posted NPCs return to their post via waypoints; Mushroom hops onto the desk (`lo.post`) | `test_npc_home.js` (15 placements) | done (results in NOTES.md) |
| Stuck detection and rescue (`De`: re-plan via waypoints, off-screen teleport after 4 stalls) | `test_npc_home.js` forced-stuck and far-player scenarios | done |
| Away watchdog (`sendHome` after 4 s idle / 20 s moving away from home ground) | `test_world.js` | partial |
| Roamers (gorbo, gratelet, p_mamagorbo) pick free spots, never inside hulls or zones | headless: run 2-3 min, sample positions each frame | todo |
| Wander/trek for creatures (`ho`), personal space, spreading | same | todo |
| Mama+Gorbo meeting schedule (`meetAt`), visits (`visitPlan`), vignettes (`VIGS`) fire and release NPCs (`busy` cleared) | `test_visits.js` (visits incl. interruptions); meeting/vignettes todo | partial |
| Greeting/freeze near the player (`greetR`, `proximityFreezeS`), gaze | headless: move player next to each NPC | todo |

## 6. Dialogue and UI

| Item | How | Coverage |
| --- | --- | --- |
| Every talk line, gift line, campfire line renders without overflow and has no spelling errors | `spellcheck_dialogue.py`; text-fit shim exists in code | partial (spelling done; layout todo) |
| Talk flow: `Talk to`, cycling lines, `|` page breaks, typewriter speed | `test_progression.js` (every line shown) | partial |
| Panels (`_t`): shop, campfire/garden event, battle; buttons CLOSE/DONE/LEAVE | `test_progression.js` | partial |
| HUD counts (blossoms, acorns, artifacts) update | headless | todo |

## 7. Economy and progression (`Kt`)

| Item | How | Coverage |
| --- | --- | --- |
| Blossom/acorn pickup, regrow timers (12 s), counts | `test_world.js` | partial (regrow check under review) |
| Shop at Garden Supplies: prices, `owned`, `equip`, `shyBook`, `shyFree` gates | `test_progression.js` | partial |
| Give a blossom → gift lines and `met`/`talkState` | headless | todo |
| Dance battles (Dbt): rock/paper/scissors, stamina, bow-out, first win awards an Artifact, `danceWins` | `test_progression.js` | done |
| Garden event (`bt`): summoning pillar, gather timer `GATHER_S`, seeds/snacks/stone rewards, NPCs sent home afterwards (`fe`) within 90 s | `test_progression.js --long` | done (full tier) |
| Pizza courier (`ue`): call, spawn 30 s later at 75 m, arrival, give-up after 100 s | `test_progression.js` | partial |
| Long session stability: heap, programs, entity count over N minutes with all systems exercised (GPU counters are stubbed in the harness) | `test_soak.js` | Soak 10 min on 3.15.8: PASS, heap 119 -> 118 MB, programs 114 -> 114, 13 entities, no errors |
| Pizza courier inside the church: detour around the Ancient to a player on the far side, deliver, walk back out (B11) | `test_courier.js` | yes |
| Library finale: three Artifacts → Sparkakus awards the Gem | `test_progression.js` | done |
| Backpacka sequence (`BP`) and jazz (`JAZZ`) timings | headless | todo |

## 8. Audio

| Item | How | Coverage |
| --- | --- | --- |
| Audio context created on VR entry, `latencyHint balanced` on Quest, wake on select/squeeze and visibility | headless with fake AudioContext counting nodes | todo |
| No node leaks over a long run (`G.note` oscillators stopped) | same | todo |
| Spatial hearing radii (`hearR`) | headset | headset |

## 9. Performance and stability

| Item | How | Coverage |
| --- | --- | --- |
| Frame loop alive, no errors, flat JS heap over 20 s in 2D | `test_play.js 2d` | done |
| Same over 10+ minutes, including events (garden, finale) | `test_play.js` long run | todo |
| Quality governor (`Ge`): levels change framebuffer scale/foveation when over/under budget, lock after finale | headless: fake frame times | todo |
| 72 Hz on Quest 3/3S (VRC.Quest.Performance; the original Quest and Quest 2 are not supported since 3.15.34, the Quest Pro since 3.15.35), loading indicator rule | headset; `perf_log.js` per-device verdicts against 72 and 60 | headset (3.15.33 on a Quest 3S: town 72, the Event 58-65) |
| Console error de-dup shim, `vo` error reporting counts | `test_play.js` | done |

## 10a. Graphical and performance pass (full tier)

| What | How | Status |
| --- | --- | --- |
| Loading time: boot slices, where the time goes, with pre-rendered textures | `tools/boot_profile.js` (report stage) | 3.15.13: about 8 s on the headset (author's log: projection layer live at 9.0 s after page start) |
| Handover: nothing heavy after the user is dropped in | `tools/entry_profile.js` (report stage); B16 moved the UI build and the texture capture into the loading phase | 3.15.13: no long gap after the grant |
| In-game hitches: first pickup, label, dialogue, battle panel, Event start | `tools/hitch_probe.js` (report stage): worst frame, new programs/textures/geometries/objects per scenario | 3.15.13: no new shader programs anywhere; Event start 26 ms headless after B17 (was 46) |
| Scene cost: draw calls, triangles, materials, transparent meshes | `tools/perf_probe.js` (report stage) | recorded in `PERF.md` |
| Performance per situation with the cause named: script frame time (p50/p99/max), top functions, shader compiles, uploads, draw calls, triangles, transparent objects, lights, creatures in range; the Event in three phases | `tools/perf_report.js` (pass/fail stage, baseline in `tools/perf_baseline.json`) | 3.15.27: see PERF.md section 7 |
| Headset frame rate by scene from the game's own log line | `tools/perf_log.js` on an `adb logcat -s GreeblisServer` capture | needs the author's 3.15.27 run |
| Render sharpness: render scale per quality level, foveation, pixel ratio, MSAA, texture mipmaps/anisotropy | `tools/sharpness_probe.js` (report stage) | 3.15.16: adaptive scale 1.2 / 1.1 / 1.0 (author: the sharp build looks better; 1.2 alone was stepped down within 4 s on the headset), 4x MSAA through the projection layer, textures mipmapped with anisotropy 8; layer swaps flash-free (the play test checks the swap) |
| Flicker / z-fighting on environmental objects | `tools/test_zfight.js` (fails the pass): every planar triangle bucketed by world plane; coplanar overlaps between different surfaces are rendered twice from 3 m with a 1 mm camera shift, the two surfaces alone on a private layer, and pixels that flip mean a depth fight | 3.15.13: 19 coplanar overlaps, 5 handled by offset/order, 8 same-look (invisible), 6 different-look, none flicker (max 0.31% edge pixels) |
| Single-sided pass (P6) changes nothing visible | `tools/sides_check.js` (fails the pass on any area difference): 184 views, flips on and off in one frame, difference mask | 3.15.26: 138 of 184 views differ on one-pixel silhouette outlines only, none in an area |
| Z-fighting on curved surfaces (a flat part tangent to or in the plane of a round one, which the planar test cannot see and the headless renderer does not show) | `tools/test_coincident.js` (fails the pass on new depth fights): the drawn triangles (batcher's parked sources) in a 5 cm hash; nearly parallel pairs of different looks sampled for points within 0.5 mm; the growth of that region at a fifth of the tolerance separates coplanar/tangent contacts (fail) from crossings (listed); accepted fights in `tools/zfight_baseline.json`; contacts the headset cannot show (undersides at ground level, closed solids resting back to back, contacts buried inside a third box) are listed as hidden | 3.15.24: the ten candidates of 3.15.23 resolved: B21 (parapet bands), B22 (Mushroom's hat band), B23 (Robin's tail) fixed, the other seven shown to be hidden contacts; baseline empty, both tests pass with 0 new depth fights |
| Multiview draws the same pixels per eye as the classic path, half the draw calls | `tools/multiview_check.js` (standard tier, fails the pass): spawn, town centre, garden, the Event | 3.15.34: identical apart from rounding on a few right-eye pixels; calls exactly halved |
| No texture upload, copy, pixel read, blit or foreign framebuffer bind while a multiview frame draws (the flash rule, F-B26), and no shader compiled during play | `tools/multiview_check.js` hazard sequence: pickups, dialogue, shop, battle, the Speech, the Event; names any program compiled | 3.15.34: 211 uploads moved before the frame, none during; one intermittent compile (B27, open) |
| Every compiled program fits a Quest's uniform and sampler limits | `tools/uniform_budget.js` (standard tier; `GT_DEVICE`, default quest3s), multiview and classic | 3.15.34: worst vertex shader 191 of 256 (multiview), 197 (classic) |
| Performance changes that claim no visible change | `tools/opt_identity.js` (full tier, switches on and off in one frame), `tools/test_bend_exact.js` (standard tier, P13) | 3.15.32: identical |
| Headset recording: flash frames, OVR Metrics overlay | `tools/video_check.py` (report, run by hand on the author's video) | 3.15.33 video: the flashes found; 3.15.34 awaits a recording |

## 10b. Store submission (VRC)

| What | How | Status |
| --- | --- | --- |
| Every active Meta Horizon Store VRC (80 checks, 2026-10-27 list) mapped to evidence, a headset step, a dashboard item, or N/A | `tools/VRC.md`; packaging checks in `tools/check_apk.sh`; focus-aware checks in `tools/test_input.js` (controllers hidden while blurred) and `tools/test_play.js` (rendering continues, game blurred) | 3.15.25: all packaging, security and functional checks pass by evidence; 4 headset confirmations listed in RELEASE.md step 7 (frame rate, time to the loading panel, Universal Menu, recentre) plus play modes and controllers down/up; one action for the author (privacy page section 8, deletion requests) |

## 10. Release parity

| Item | How | Coverage |
| --- | --- | --- |
| Compressed release build carries the same content as the APK source | `test_parity.js` | done |

## Latest results (3.15.10/3.15.11 asset, headless harness)

**Standard tier on 3.15.34** (`tools/.runs/std_v34c.log`, multiview): 218 PASS lines; one FAIL, B27 (one shader program compiled during the pickups/dialogue/shop sequence of `multiview_check.js`; a standalone run had none). Every other multiview check passes: per-eye pixel match, draw calls halved, no frame hazard (207 uploads moved before the frame), uniform budget in both modes.

**3.15.33**: smoke tier passes (`tools/.runs/smoke_v33.log`). **Multiview experiment** (`GT_MULTIVIEW=1 GT_ASSET=tools/.runs/multiview.html tools/run_tests.sh`, `tools/.runs/std_mv.log`): every stage passes except the 2D frame-loop check, which failed identically on the release (the test timed the boot; fixed in `test_play.js`, NOTES 66; both builds pass it now). `multiview_check.js`: both eyes match the classic path, draw calls halved.

**Standard tier on 3.15.32** (`tools/.runs/std_v32.log`): all stages pass (188 PASS lines, no FAIL) with P8-P13 in, including the new bend exactness test. Per optimisation, `opt_identity.js` (identical pixels), the sides check, both z-fight tests and the perf report's compile check passed (VERSIONS.md).

**Standard tier on 3.15.27** (`tools/.runs/std_v27.log`): all stages pass (186 PASS lines, no FAIL) with P7 in. The new performance report passes on it (PERF.md section 7; baseline written from the run).

**Standard tier on 3.15.26** (`tools/.runs/std_v26.log`): all stages pass (186 PASS lines, no FAIL) with the performance pass (P1, P2, P4, P5, P6) and B25 in; planar and curved z-fight tests pass (0 new; 155 batch meshes now, the single-sided split adds a few), and `sides_check.js` passes (140 of 184 views differ on one-pixel silhouette outlines only, worst area 0.012%). **Zollod's return-home scenarios on 3.15.26** (`tools/test_npc_home.js ... cutebex`, the test now spawns him): all 17 pass with no teleports; behind the kiosk 24.5 s with a teleport before -> 7.7 s, inside the back 23.7 s -> 8.3 s, interrupted visit from behind 25.1 s -> 4.2 s; Mushroom's 17 scenarios still pass (behind the kiosk 3 m now walks round by the entry path, 20.6 s, no stuck). **Standard tier on 3.15.25** (`tools/.runs/std_v25.log`): all stages pass (186 PASS lines, no FAIL), including the two new focus-aware checks (controllers hidden while the session is blurred and shown after, in the input stage; rendering continues and the game is blurred, in the play stage). **Standard tier on 3.15.24** (`tools/.runs/std_v24.log`): all stages pass (184 PASS lines, no FAIL). **Z-fighting on 3.15.24**: planar test 3 coplanar overlaps, all hidden (two church wall tops buried in the roof and end wall, the juice stand's undersides at ground level), 0 new; curved test 161 near pairs, 0 new depth fights, 7 hidden resting contacts, 20 crossings; the parapet bands (B21), Mushroom's hat band (B22) and the Robin's tail (B23) no longer appear; baseline empty. **Standard tier on 3.15.23** (`tools/.runs/std_v23.log`): all stages pass (184 PASS lines, no FAIL). **Planar z-fighting on 3.15.23** (`tools/test_zfight.js`, now reading the batcher's sources and failing on any new different-looking coplanar overlap): 17 overlap pairs, 5 handled, 3 to 4 different-looking depending on the boot (the juice stand's floor plank, two church slabs, the perimeter wall against the hills), all accepted in the baseline for the author's call; passes. **Curved z-fighting on 3.15.23** (`tools/test_coincident.js`, `tools/.runs/coinc_v23.log`): 640k triangles, 115k sampled pairs, 0 new depth fights, 4 of the 6 accepted ones present in this boot (the rest depend on the characters' pose), 23 crossings, 13 same-look; the pre-fix asset reports Hennrick's cuff as a depth fight and 3.15.23 does not. **Standard tier on 3.15.22** (`tools/.runs/std_v22.log`): one test-side failure only (the blank-frame screenshot check in the `vr-nofloor` scenario, now skipped in layers mode like the `vr` scenario). **Standard tier on 3.15.21** (`tools/.runs/std_v21.log`): all stages pass, including the new `vr-nofloor` scenario and the hidden/visible check; the context-loss check reports B19 as known. **Standard tier on 3.15.20** (`tools/.runs/std_v20.log`): every stage passes except the play stage's blank-frame screenshot check, which in layers mode sees a canvas that is blank by design (the game draws into the projection layer; the XR-frames check covers rendering); the check is now skipped in layers mode and the play test passes standalone. **Full tier on 3.15.19** (`tools/.runs/full_v19.log`): **all stages pass**, including the play stage's layer-swap check and the z-fight test; report stages: handover clean (one 284 ms first-frame gap headless), hitch probe on the no-layers variant worst frames 6-37 ms (Event start 37 ms, pickups 26 ms), scene cost and sharpness recorded. 3.15.19 adds the native-start governor, build-time texture probe points and the sphere-traced blob march (characters build about twice as fast, geometry identical per `geom_compare.js`). **Soak on 3.15.19** (`tools/test_soak.js`, 10 minutes, `tools/.runs/soak_v19.log`): no errors, heap 115 to 123 MB after the 2-minute mark, textures 121, geometries 287, programs 114 and entities 13 all bounded; SOAK TEST PASSED.

**Full tier on 3.15.17** (`tools/.runs/full_v17.log`): every stage passes (entry verify, server harness incl. /log, spell-check, APK check, VR entry, world incl. B2 and 20/20 routes, input, progression incl. the Event, visits all, courier, return-home all, release parity, z-fight: nothing flickers) except one check in the play stage: the new layer-swap check timed out waiting 400 ms for frames while the tier loaded the machine (frames 0); the same check passes standalone (24 frames) and now waits for frames instead of a fixed time. Report stages recorded: handover clean (one 235 ms first-frame gap headless), hitch probe moved to the no-layers variant for meaningful timings.

Standard tier on the 3.15.13 asset (layers loading screen, B16, name): **all stages pass**. Z-fight test, sharpness probe and hitch probe added and run on it (see 10a).

3.15.13 (layers loading screen, B16, name): entry test 3/3 scenarios and play test (2D + fake VR, projection layer live, 1045 XR frames/20 s) pass on the final asset; standard tier on the final asset recorded below when done. Headset (author): experiment build with the same entry path, no black bars, no drop-in stall.

Full tier on 3.15.11: all stages pass except world routes, 16/20 (four random routes through the Shop, all starting in the sealed corner behind it; the earlier 20/20 runs had simply not sampled that corner). Fixed as B14 in 3.15.12; world test 20/20 in four runs since. Standard tier on the 3.15.12 asset (B14, before the B15 entry change): all stages pass. 3.15.12 then dropped the `layers` feature and hardened the entry (B15, see BUGS.md); entry test passes on the final asset (3/3 scenarios) and the 3.15.11 feature list fails it; standard tier on the final asset recorded below.

Full tier on 3.15.10 (all fixes, pre-rendered textures): **all stages pass** (entry fix verify, server harness incl. ETag/304, spell-check, APK check, VR entry wiring, runtime 120 s, world incl. B2 rescue and 20/20 routes, input 12/12, progression incl. garden event, visits all, courier, return-home all 17, release parity). 3.15.11 differs only in the head-script loader (compositor layers); play and entry tests pass on it; full tier running.

### Earlier (3.15.7/3.15.8)

Standard tier on 3.15.7: all stages pass except the world routes check (2/20 random routes clipped the shop corner at their final leg), fixed as B4r in 3.15.8 (world test 20/20 afterwards). Entry test rewritten for the page-start request and the in-VR loading screen; play test passes in 2D and fake VR.

### Earlier (3.15.6)

| Test | Result |
| --- | --- |
| entry fix verify, server harness (incl. asset links), APK check, VR entry wiring, runtime play, input | PASS (smoke tier) |
| progression: talk, battle, shop pause, shop, library, trade, pizza | PASS (all 14 checks) |
| world: 20/20 routes, hulls, bounds, pickups + regrow, watchdog (Fortizmo home in 63 s) | PASS |
| courier/Ancient (B11), left and right | PASS; entry-only build reproduces the bug |
| Mushroom return-home 17/17, visits 6/6 | PASS |
| full tier (`run_tests.sh --full`) on 3.15.6: entry, server, spell-check, APK check, VR entry, runtime 120 s, input, progression incl. garden event, visits (all), courier, return-home (all), release parity | PASS except world: 2/20 random routes clipped the shop corner by 0.3 m / 0.02 m (B4 residual, cosmetic) |

