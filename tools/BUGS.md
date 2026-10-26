# Open bugs

Living list. Each entry: what, where, how to reproduce, status. Fixed bugs
move to the bottom. Longer investigations live in `../NOTES.md`.

## Open

| # | Bug | Where | Reproduce | Status |
| --- | --- | --- | --- | --- |
| B1 | After an interrupted visit the host/visitor is sent straight at his desk by the navigator; with the wall fix he now goes around, but the straight-line post-visit `drop` path still stalls for ~1 s against the wall before the stuck detector re-plans | `drop()` in the visit system; `lo.post` direct approach within 4 m | `tools/test_npc_home.js` scenarios "interrupted visit" | mitigated by the fix; cosmetic stall remains |
| B2 | Stuck-rescue teleport only fires when the NPC is off-screen and more than 12 m from the player, so a stall in view is never rescued | `De()` | pin an NPC in view | by design; worth a visible fallback |
| B3 | Blossom/acorn did not regrow within 15 s of pickup in the harness although the timer is 12 s | `le.update` / `ce.update` | `tools/test_world.js` | needs investigation (may need the player to look away or be farther) |
| B4 | One of 20 random routes crossed a building hull corner slightly (`segBlocked` margin 0.2) | `JGP.route` smoothing | `tools/test_world.js` routes | low; collision keeps NPCs out physically |
| B5 | Loopback server answers a path-less `GET` line as `/` instead of 400 | `GameServer.handle` | `tools/test_server.sh` | harmless, documented |
| B6 | In-VR loading indicator: the world builds synchronously before the first frame, so only the OS splash shows (VRC.Quest.Performance.3) | boot | launch on headset | store-review risk; needs a game change |
| B7 | Gate text "VR can't start in this preview. Open the inscription's own page." is leftover wording (never visible for more than a frame) | `je()` catch | force a session failure | cosmetic |

## Fixed

| # | Bug | Fix | Date |
| --- | --- | --- | --- |
| F1 | Immersive launch stuck on the OS loading screen: the game dropped the browser's `sessiongranted` grant unless the world was already built | VR-entry fix (4 edits, `apply_entry_fix.py`) | 2026-10-26 |
| F2 | Mushroom stuck beside/behind his kiosk: navigator ignored the building when both ends of a segment were inside its clearance margin | `F.segBlocked` tests the real hull near buildings (`GAME_FIXES`) | 2026-10-26 |
| F3 | Hennrick's campfire line missing its subject | text fix (`GAME_FIXES`) | 2026-10-26 |
