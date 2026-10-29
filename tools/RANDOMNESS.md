# Randomness decisions for Greeblis Town (RULES.md 5)

The author's decision list (TASKS T17, 2026-10-29, 3.15.50). Every item waits for the author's call unless the
**Decided** section below says otherwise.

## Decided

| Item | The author | What was done |
| --- | --- | --- |
| c11, the unused emote and sparkle colour picks | "8. Let's remove this." | Removed in 3.15.51 (FIXES R4); every emote looks the same |
| d3, which way each flint lies | "9. Close out as intended." | Stays random, with the flint spawns; no change |
| The UFO's flight path (seeded, not random) | "The UFO's path is currently fine the way it is. Mark as intended." | Intended as it is (RULES.md 5); no change |
| d1 stars, d2 clouds, c1 blinks, c2 idle phases (Nextessa's too), c3 Anomalee's glitch timing (her shake stays random), c4 her jaw, c9 the Event ring's sway | "1 to 7: seed" | Seeded in 3.15.51 (FIXES R5): the same every launch, still varied |
| Everything recommended to stay random: c5 Sparkakus's tail mist, c6 Mama Gorbo's drops, c7 goo blobs and splats, c8 the pickups' bob and glint, c10 the typewriter tick's pitch, Anomalee's shake in c3, and the appendix's (c) items (goo on the player's view, sound pitch and noise variation, Backpacka's droplets and the finale's reactions, vignette confetti and token trails, the robin's return, the Gem's sparkles) | "whatever you recommended we keep random, keep random" | Stay random; no change |
 Positions are those of 3.15.49's game file; after an edit, `node tools/random_census.js` lists them again.

This list covers the 120 `Math.random` call sites found by `random_census.js` (`tools/.runs/random_census.json`;
counts are loading / 60 s in town / 60 s in the planting Event). Positions are the census's `line:col`. Line 7 is the
game and line 3 is three.js. `7:4658`, `7:4700` and `7:4739` are the game's shared helpers: range `h(a,b)`, integer
`p(a,b)` and pick `f(list)`. The census attributes each helper call to its caller, so those sites are listed below by
caller (`via 7:xxxxx`). "When" uses **L** for loading, **T** for town and **E** for the Event.

I read the code around every site.

**Count per category (census sites):**

| Category | Sites | Items |
| --- | --- | --- |
| (d) world layout fixed at load | 11 | 3 |
| (e) gameplay or timing outcomes | 0 | 0 (two unreached ones are in the appendix) |
| (c) cosmetic motion or effects | 51 | 11 |
| (b) already settled by the author's rule | 32 | 10 |
| (a) library internals | 26 | 2 |

**Two things to know before deciding:**

1. **The UFO's heading is not random today.** It does not use `Math.random`, so the census never saw it. It draws from
   the game's own seeded generator (`Ot`, seed `20250101`, defined near 7:311000). Building windows and trees also draw
   from that generator at load, and planted flowers draw from it during the Event. Nothing else draws from it in town,
   so the first UFO flight (600 s into the game) very likely takes the same heading on every launch. RULES.md 5 says
   the heading stays random. If the author wants that, the UFO has to stop using this generator. This is a question
   for the author, not something to change unasked. (Confirmed at runtime: the UFO's flight and the seeded painters
   share the one generator object.)
2. **Seven sites have no visible effect.** They pick a random colour for an emote or a sparkle. Since F-B29, the emote
   code ignores the colour it is given and colours by glyph (`Ut`: `U=(_,D)=>{D=N(_)…}`). See item c11.

---

## (d) World layout or content fixed at load that changes between launches

| # | What the player sees | Sites | When | Recommendation |
| --- | --- | --- | --- | --- |
| d1 | **The night sky's stars**: where the 700 stars sit in the sky, a new pattern each launch (they show as night falls) | 7:18177, 7:18213 | L (700 each) | **Seed.** It is pure decoration and gets a fixed sky. No launch looks different from now, only the same as every other launch. |
| d2 | **The clouds**: how many puffs each of the 7 clouds has, how big they are and how they sit (via 7:4700 at 725035; via 7:4658 at 725073, 725106, 725116), how far out each cloud circles, where it starts, how high it flies and how fast it drifts (via 7:4658 at 725159, 725188, 725199; 7:725175) | 7:4700, 7:4658 (×6 callers), 7:725175 | L (7 to 31 each) | **Seed.** The skyline becomes the same each launch and still varies from cloud to cloud. |
| d3 | **Which way each flint pickup faces** on the ground | 7:97249 | L (40) | **Keep random**, or seed only if the author wants zero `Math.random` at load. The flint *spawn spots* stay random by the author's word, so seeding the turn alone would not give a stable field. It goes with the spawn. |

## (e) Gameplay or timing outcomes

**No census site falls here.** The town's timed events (meetings, visits, vignettes, chatter) are all NPC
interactions, which the rule settles (b). The census did not run a dance battle, which has two random outcomes. The
appendix lists them; they belong in (e) and need the author's call.

## (c) Cosmetic motion or effects

| # | What the player sees | Sites | When | Recommendation |
| --- | --- | --- | --- | --- |
| c1 | **When the townsfolk blink.** Each of the 10 BORN townsfolk gets a random first-blink delay (1-5 s) at load (7:219331, one site per character: callers 229981, 237114, 243598, 250383, 256548, 268116, 274248, 281798, 296273, 305374). After that, the shared blinker waits a random 2.5-6.5 s between blinks (7:213996). Mama Gorbo blinks on her own random 2.5-6 s timer (7:305609, two callers). | 7:219331 (×10), 7:213996, 7:305609 (×2) | L 1 each; T 76 + 14; E 46 + 8 | **Seed.** The blinker already takes a seed (`D.blinker(seed)`), so it can get a fixed seed per character and its own generator for the gaps. Blinks stay irregular and look the same as now. |
| c2 | **Idle sway out of step.** Anomalee, Hennrick, Fortizmo and Montgummery each get a random phase at load, so their idle bobbing, swaying and (for Hennrick) glow pulse and blink don't move in lockstep. | 7:164599, 7:171505, 7:183034, 7:195843 | L (1 each) | **Seed** (or four fixed distinct numbers). No visible change. |
| c3 | **Anomalee's screen glitches.** Her screen shows static every 5-13 s: the first glitch comes 4-10 s after load (7:164642), each next one is timed by 7:165413, and the head shakes a little while it glitches (7:165555). | 7:164642, 7:165413, 7:165555 | L 1 + 28; T 6 + 122; E 4 + 129 | **Seed** the timing with her own generator. **Keep random** for the shake, which is only jitter. |
| c4 | **Anomalee's jaw chomps now and then**, on average about every 12 s (8 % chance per second) | 7:165242 | L 265; T 3386; E 1675 (one draw per frame) | **Seed** with her own generator (same look), or keep random. |
| c5 | **Sparkakus's tail mist**: where each of its 90 pink-to-cyan particles starts and how old it is at the start | 7:236624, 7:236665, 7:236702 (refill: T 2686, E 1463; first fill: L 90), 7:236754 (L 90) | L, T, E | **Keep random.** It is a particle effect, and a seed would not make what a player sees repeat. Seed it only if the goal is no `Math.random` at all. |
| c6 | **Mama Gorbo's falling drops**: which of her drips each drop falls from, the pause before the next drop and the size of its peach splat | 7:307338, 7:307382, 7:307419 | L 21; T 34; E 18 | **Keep random** (particle effect). |
| c7 | **Goo blobs and splats**, from the Mama Gorbo and Gooward meetings and goo flung at the player: each blob's flight time and sideways spread (via 7:4658 at 75073, 75118, 75161), its colour from the character's goo colours (via 7:4739 at 75172), its size (via 7:4658 at 74435), its wobble (7:74318), and the splat's size (via 7:4658 at 75645) and turn (7:74941, two callers; one load call is the warm-up) | 7:4658 (×5 callers), 7:4739, 7:74318, 7:74941 (×2) | L 1; T 12-34; E 18 | **Keep random** (particle effect). The colour pick is visible but is still only how the goo looks. |
| c8 | **Flint and Blossom bob and glint**, so the pickups don't pulse in unison | 7:97727 (flint), 7:95731 (Blossoms) | L (40, 32) | **Keep random.** It goes with the random spawns, as in d3. Seed it if the author prefers. |
| c9 | **The townsfolk's gentle shuffle around their places in the Event ring** before planting starts (a 0.35 m sway with a random phase each) | 7:107272 | E (11) | **Seed.** No visible change. |
| c10 | **The typewriter tick's pitch** as dialogue types out | 7:14815 | T (2) | **Keep random**: small sound variation. Making it fixed would be audible as a flatter tick. |
| c11 | **Emote and sparkle colours that are never shown.** Since F-B29 the code ignores these picks (it colours by glyph): sparkle bursts (via 75303), talk emotes (via 99057), the flower emote when townsfolk and Sparkakus plant (via 691812, 471835), the closing emotes of Event chats (via 110197, 110234) and the opening emote of a vignette (via 506832) | 7:4739 (×7 callers) | L 14; T 2; E 1-9 | **Make fixed** (drop the pick). Nothing on screen changes. |

## (b) Already settled by the author's rule: leave them

| What | Sites | When |
| --- | --- | --- |
| Where flint spawns | 7:94704, 7:94758 (caller 97155) | L |
| Where Blossoms spawn | 7:94704, 7:94758 (caller 95561) | L |
| Roaming spots: Gooward round the Gallery, Hennrick round the Portal, the three dancers on the floor, Mama Gorbo in the park | 7:711340, 7:711379; 7:710919, 7:710945; 7:712089, 7:712119; 7:712422, 7:712445 | T |
| How long a roamer waits before the next spot | 7:656577 | L, T |
| Fortizmo moving along the juice bar (wait 3-8 s, new spot) | 7:655257, 7:655343 | L, T |
| Sparkakus wandering his Library (first wait, spot, next wait) | 7:718308, 7:717882, 7:717918, 7:723283 | L, T |
| Mama Gorbo and Gooward meetings (first at 20-40 s, next 20-40 s later, approach spot, meeting spot) | 7:657660, 7:658684, 7:658904, 7:658945, 7:659361 | L, T |
| When the first visit happens (12-22 s) | 7:661652 | L |
| Vignettes: which pair's vignette plays, speech bubbles or Gree-mail tokens, the gap before the next | 7:513189, 7:513284, 7:513508 | T |
| Event chatter: who chats (via 7:4739 at 109659), the glyph each speaker shows at the end (via 7:4739 at 110180, 110217), the time to the next chat (via 7:4658 at 110254) | 7:4739 (×3 callers), 7:4658 | E |

## (a) Library internals, no effect on play or looks: leave them

| What | Sites | When |
| --- | --- | --- |
| three.js object IDs (UUIDs) for buffer geometries, 3D objects, materials, textures, shapes and interleaved buffers (callers 3:63134, 3:41029, 3:50110, 3:6834, 3:261912, 3:218105) | 3:1037, 3:1066, 3:1095, 3:1124 (24 caller/site pairs) | L, T, E |
| Audio white-noise buffers: the Event song's synth (`ee`) and King Dino's jazz drums | 7:82544, 7:676542 | L |

---

## Appendix: randomness in the code that the census run did not reach

These sites never ran in the census's 60 s town and 60 s Event, so they are not among the 120. Their positions are
approximate (≈), estimated from the nearest census site. Only the first two need a decision of the author's kind.

| What | ≈ Site | Category |
| --- | --- | --- |
| **Dance battle: the opponent's move** (rock, scissors or paper), which sets the counter the player must pick | via 7:4739 at ≈7:92830 | **(e)** |
| **Dance battle: BOW OUT works 70 % of the time** (otherwise "The beat won't let you go!") | ≈7:93294 | **(e)** |
| Generic townsfolk wandering and treks to waypoints | ≈7:64955-66573 | (b) |
| Visit planning (whether a visit happens, which pair, bubbles or tokens, next gap) | ≈7:671750-672502 | (b) |
| Spot in the clearing for a creature without a post (`Mo`/`g()`) | ≈7:5331, 7:5363 | probably (b); not sure which creature uses it |
| Goo landing on the player's view or screen (size, place, turn) and where Gooward's flung goo starts | ≈7:23577-24730, 7:25458 | (c) |
| Sound pitch variation (blorp, crackle, splash) and noise playback rate and offset in the song and drums | ≈7:15085-15235, 7:85631, 7:85833, 7:676662, 7:677208 | (c) |
| Event finale: Backpacka's drink and spray droplets, and the random "?" and emote reactions | ≈7:485835-488570 | (c) |
| Vignette confetti and Gree-mail token trails | ≈7:507492-507588, 7:509883 | (c) |
| The robin flies off and comes back after 10-18 s | ≈7:608287 | (c) |
| Gem award: sparkles drifting off it | ≈7:115597, 7:115624 | (c) |
| Nextessa's idle phase | ≈7:175242 | (c), like c2 |

The texture painters' calls (for example ≈7:44510, 7:162280, 7:168466) are already seeded, because `Math.random` is
swapped for a seeded generator while a texture is painted (≈7:5773). They need nothing.
