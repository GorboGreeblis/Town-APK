# Open bugs

Living list. Each entry: what, where, how to reproduce, status. Fixed bugs
move to the bottom. Longer investigations live in `../NOTES.md`.

## Open

| # | Bug | Where | Reproduce | Status |
| --- | --- | --- | --- | --- |
| B2 | Stuck-rescue teleport only fires when the NPC is off-screen and more than 12 m from the player, so a stall in view is never rescued | `De()` | pin an NPC in view | by design; worth a visible fallback |
| B6 | In-VR loading indicator: the world builds synchronously before the first frame, so only the OS splash shows (VRC.Quest.Performance.3) | boot | launch on headset | store-review risk; needs a game change |
| B9 | 3.15.2 on the headset: the launcher starts the Quest Browser's `WebXRCustomTabActivity` with `http://127.0.0.1:17777/`, the activity closes itself within ~300 ms every time, and the OS loading screen never clears. The browser logs no reason; the author's capture also contains no lines from our process. Most likely the immersive activity accepts only a verified HTTPS web-app origin, which a loopback origin cannot be. Hosting is ruled out, so the candidates are: Meta's 2D app mode (browser panel, then "Press A"), or finding a self-contained form the immersive activity accepts | `LauncherActivity` / Quest Browser | launch 3.15.2 | **cause found in the unfiltered log**: `cr_OriginVerifier: Verification failed for http://127.0.0.1:17777 as not https or localhost` then `WebXRCustomTabActivity: TWA verification was unsuccessful! Exiting`. Chromium accepts the host name `localhost` without HTTPS. Fix applied in 3.15.4: the server is addressed as `http://localhost:17777/` (and also listens on ::1). Headset log for 3.15.4: origin accepted, but the next step failed: `Digital Asset Links endpoint responded with code 404` → `TWA verification was unsuccessful`. 3.15.5 serves `/.well-known/assetlinks.json` (package + own signing-certificate fingerprint, built at runtime). Awaiting headset confirmation of 3.15.5 |

## Fixed

| # | Bug | Fix | Date |
| --- | --- | --- | --- |
| F-B11 | Nextessa (pizza courier) pinned in front of the Ancient when the player stood on the far side of it inside the church; she walked straight at the player and the Ancient's solid part blocked the line. Fix: a detour helper in the courier update; if the church-local line to the player (or to the exit waypoint) crosses the Ancient's box plus her radius, she walks around its front corners first. `tools/test_courier.js`: entry-only build pinned 94 s, fixed build delivers in 4 s and is back outside in 9 s | `GAME_FIXES` B11 (3 edits) | 2026-10-26 |
| F-B10 | (not a bug) Pizza courier "never spawns" in the harness: the portal setup sets `pizza.callDelayMs` to 30 s and the test only waited 30 s from the call. Test now waits 45 s | `tools/test_progression.js`, new `tools/test_courier.js` | 2026-10-26 |
| F-B8 | While the Shop menu is open every NPC pauses and faces the player; only Zollod (the shopkeeper) should | applied in 3.15.3 (GAME_FIXES / GameServer), awaiting test confirmation | 2026-10-26 |
| F-B7 | Gate text "VR can't start in this preview. Open the inscription's own page." is leftover wording (never visible for more than a frame) | applied in 3.15.3 (GAME_FIXES / GameServer), awaiting test confirmation | 2026-10-26 |
| F-B5 | Loopback server answers a path-less `GET` line as `/` instead of 400 | applied in 3.15.3 (GAME_FIXES / GameServer), awaiting test confirmation | 2026-10-26 |
| F-B4 | Some random routes cross a building hull corner slightly: e.g. a 40 m straight segment from (-34.6,-27.4) to (-25.9,11.4) cuts 0.39 m into t | applied in 3.15.3 (GAME_FIXES / GameServer), awaiting test confirmation | 2026-10-26 |
| F-B1 | Approaching his kiosk from beside or behind, Mushroom first walks straight at the front waypoint, stalls about a second against the wall, th | applied in 3.15.3 (GAME_FIXES / GameServer), awaiting test confirmation | 2026-10-26 |
| F1 | Immersive launch stuck on the OS loading screen: the game dropped the browser's `sessiongranted` grant unless the world was already built | VR-entry fix (4 edits, `apply_entry_fix.py`) | 2026-10-26 |
| F2 | Mushroom stuck beside/behind his kiosk: navigator ignored the building when both ends of a segment were inside its clearance margin | `F.segBlocked` tests the real hull near buildings (`GAME_FIXES`) | 2026-10-26 |
| F3 | Hennrick's campfire line missing its subject | text fix (`GAME_FIXES`) | 2026-10-26 |
| F5 | Release build 3.15.1 crashed at launch on the headset: `SuperNotCalledException` in `LauncherActivity.onCreate`. The loopback server failed to bind because the manifest did not declare `android.permission.INTERNET` (Android requires it for any socket, loopback included), and the error path returned before `super.onCreate()`. Both fixed; `check_apk.sh` now checks the permission | manifest + `LauncherActivity` (3.15.2, versionCode 3) | 2026-10-26 |
| F4 | (not a bug) Blossom/acorn regrow "failure" was the harness simulating at quarter speed; at real time both regrow at 12.0-12.1 s | harness fastSim | 2026-10-26 |
