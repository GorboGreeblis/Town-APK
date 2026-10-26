# Open bugs

Living list. Each entry: what, where, how to reproduce, status. Fixed bugs
move to the bottom. Longer investigations live in `../NOTES.md`.

## Open

| # | Bug | Where | Reproduce | Status |
| --- | --- | --- | --- | --- |
| B1 | Approaching his kiosk from beside or behind, Mushroom first walks straight at the front waypoint, stalls about a second against the wall, then the stuck detector re-plans around it (the re-plan now works). Visits interrupted at any stage verified to end on the desk (`test_visits.js`) | `lo.post` direct approach within 4 m; post-visit `drop` navigates straight at the desk | `tools/test_npc_home.js` side/behind scenarios | cosmetic stall only |
| B2 | Stuck-rescue teleport only fires when the NPC is off-screen and more than 12 m from the player, so a stall in view is never rescued | `De()` | pin an NPC in view | by design; worth a visible fallback |
| B4 | Some random routes (2 of 20 in one run, 0 of 20 in another) cross a building hull corner slightly (`segBlocked` margin 0.2) | `JGP.route` smoothing | `tools/test_world.js` routes; the test now reports the building, depth and segment | low; collision keeps NPCs out physically; collect samples over the full pass |
| B5 | Loopback server answers a path-less `GET` line as `/` instead of 400 | `GameServer.handle` | `tools/test_server.sh` | harmless, documented |
| B6 | In-VR loading indicator: the world builds synchronously before the first frame, so only the OS splash shows (VRC.Quest.Performance.3) | boot | launch on headset | store-review risk; needs a game change |
| B8 | While the Shop menu is open every NPC pauses and faces the player; only Zollod (the shopkeeper) should | `holdsAll()` returns true for any open panel except the battle and is passed to every NPC's update as the "held" flag; Zollod's own pause is a separate targeted branch (`jt.has("panel") && xe.lastTarget === e`) | open the shop and watch the others | diagnosed. Proposed fix (two edits, awaiting approval): make `holdsAll()` also return false for the `shop` panel, and add `shop panel open && e.id === "cutebex"` to the targeted-pause branch so Zollod still stops and faces the player. Side effect to confirm: visits and vignettes would keep running while the shop is open (today they pause too) |
| B7 | Gate text "VR can't start in this preview. Open the inscription's own page." is leftover wording (never visible for more than a frame) | `je()` catch | force a session failure | cosmetic |

## Fixed

| # | Bug | Fix | Date |
| --- | --- | --- | --- |
| F1 | Immersive launch stuck on the OS loading screen: the game dropped the browser's `sessiongranted` grant unless the world was already built | VR-entry fix (4 edits, `apply_entry_fix.py`) | 2026-10-26 |
| F2 | Mushroom stuck beside/behind his kiosk: navigator ignored the building when both ends of a segment were inside its clearance margin | `F.segBlocked` tests the real hull near buildings (`GAME_FIXES`) | 2026-10-26 |
| F3 | Hennrick's campfire line missing its subject | text fix (`GAME_FIXES`) | 2026-10-26 |
| F4 | (not a bug) Blossom/acorn regrow "failure" was the harness simulating at quarter speed; at real time both regrow at 12.0-12.1 s | harness fastSim | 2026-10-26 |
