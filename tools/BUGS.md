# Open bugs

Living list. Each entry: what, where, how to reproduce, status. Fixed bugs
move to the bottom. Longer investigations live in `../NOTES.md`.

## Open

| # | Bug | Where | Reproduce | Status |
| --- | --- | --- | --- | --- |
| B1 | Approaching his kiosk from beside or behind, Mushroom first walks straight at the front waypoint, stalls about a second against the wall, then the stuck detector re-plans around it (the re-plan now works). Visits interrupted at any stage verified to end on the desk (`test_visits.js`) | `lo.post` direct approach within 4 m; post-visit `drop` navigates straight at the desk | `tools/test_npc_home.js` side/behind scenarios | cosmetic stall only |
| B2 | Stuck-rescue teleport only fires when the NPC is off-screen and more than 12 m from the player, so a stall in view is never rescued | `De()` | pin an NPC in view | by design; worth a visible fallback |
| B3 | Blossom/acorn did not regrow within 15 s of pickup in the harness although the timer is 12 s | `le.update` / `ce.update` | `tools/test_world.js` | likely a harness artifact: that run simulated at a quarter speed (12 s of game time took ~43 s); the regrow code relocates the item and clears `taken` when the game clock passes `regrowAt`. Re-verify in the smoke pass (real-time simulation) |
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
