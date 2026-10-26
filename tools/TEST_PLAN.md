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
| Reference space fallback `local-floor` → `local` with `floorOffset` | `fakexr.js` with `supportLocalFloor=false` | todo |
| Visibility/blur handling in session (`visibilitychange`, `Ho.capture/restore`) | `fakexr.js` `setVisibility` | todo |
| WebGL context loss and restore (`Ho`) | headless: `WEBGL_lose_context` extension | todo |
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
| Long session stability: heap, textures, geometries, programs, entity count over N minutes with all systems exercised | `test_soak.js` | script ready, first run pending |
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
| 72 Hz on Quest 2/3 (VRC.Quest.Performance), loading indicator rule | headset | headset |
| Console error de-dup shim, `vo` error reporting counts | `test_play.js` | done |

## 10. Release parity

| Item | How | Coverage |
| --- | --- | --- |
| Compressed release build carries the same content as the APK source | `test_parity.js` | done |

## Latest results (3.15.7/3.15.8 asset, headless harness)

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

