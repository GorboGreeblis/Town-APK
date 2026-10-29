# Greeblis Town, basic game documentation

Everything below was read from the game code (`tools/uncompressed.html`,
v3.15). Where the code did not make something explicit it is left out rather
than guessed. Since 3.15.45 the file is minified (FIXES R2): top-level names
(`t`, `G`, `It`, `JGP`, `gcEB` and the like) are as quoted, but names local to a
function were renamed, so routines are described by what they do.

## What it is

A single-file WebXR game for Meta Quest built on three.js: a cartoon town
inhabited by "Greeblis" (characters such as Gorbo, Mama Gorbo, Gemtoe,
Etcher, Glyph, Anomalee, Avarice, Montgummery, King Dino, Sparkakus,
Nextessa and "the Ancient"). The player walks the town, talks to residents,
collects items, takes part in dance battles and a garden event, and finds
three Artifacts for the Ancient, which triggers a timed finale.

The file is about 1 MB and has no external dependencies: three.js, all
textures (drawn on canvases at start-up), all audio (synthesised with the Web
Audio API) and all dialogue are inline. It loads nothing from the web. It makes
two optional local requests, both falling back silently: `tex/manifest.json`
(the APK's pre-painted textures, used instead of painting when present) and
`/log` (the APK server's log) (NOTES 88).

## File layout

The HTML is 8 lines since the minification (3.15.45; it was 93 before); most of them are very long script blocks.

| Line | Content |
| --- | --- |
| 1 | `<head>`: the license notice (CC0 and three.js's MIT notice), viewport, styles (ink `#0d0d1a` palette), the head script (requests the VR session at page start and draws the loading screen, `window.__gtXR`; FIXES.md entry edits), the 2D gate (`#gate`, `#gateTitle`, `#gateText`, `#gateVer`) and hidden dialogue/panel containers. |
| 2 | Console de-duplication shim. |
| 3 | three.js (bundled, with its WebXR manager). |
| 4 | Patches three.js Phong/Lambert/Basic materials to default to `DoubleSide`. |
| 5 | Canvas patches: 2D contexts default to `imageSmoothingEnabled=false`; `CanvasTexture` registry for pixel-art textures. |
| 6 | `fillText`/`strokeText` wrapper that shrinks text to fit the canvas ("room"). |
| 7 | The game proper, in this order: `window.__jgpBlocked` (user-agent gate), the tuning object `t` (see below), audio engine `G`, hand-drawn glyph/sign paths, world construction (textures, props, the buildings, pebbles, grass, the park), characters, XR input, UI, quests/dialogue, boot sequence, error handlers. |
| 8 | `</body></html>` |

## Tuning values worth knowing (object `t` at the top of line 7)

- World: `clearingR 36.5`, `parkHalf 37.6`, fog 70-300, far plane 310.
- Player: speed 4.5, body radius 0.6, spawn `[-36.3, -20]`.
- Interaction radii: talk 3.4, greet 3.2.
- XR: eye height 2.6, near 0.15, stick dead-zone 0.15, snap turn 30 degrees
  (`Math.PI/6`), pick range 16, UI distance 11.5, foveation per quality level
  (the framebuffer scale is native, 1, at every level and in the emergency
  step: `quality`, `sosScale`; F-B31), target 72 Hz with an adaptive quality controller
  (`targetHz`, `emaAlpha`, `overFrames`, `underFrames`).
- Pickups: 32 blossoms (regrow 12 s), 40 flint (regrow 12 s; called acorns in the code, flint in the game's own text and the Store).
- Finale: 180 s, NPC chatter every 3-7 s, `finaleLockMs` 600 s.
- Pizza: call delay 1.8 s, driver spawn radius 75, gives up after 100 s.
- Gravity 14.

## Boot and VR entry

1. In the Quest Browser the head script requests the VR session at page
   start, parks it and draws its own loading screen into it. The boot is
   sliced: the world build yields between steps (`__gtY("textures")`,
   `"shaders"` and so on) so the loading screen keeps drawing; then
   `gcEB.ready = true`, and at the very end the game takes over the parked
   session (FIXES.md, entry edits 1-8).
2. Without a parked session (the browser path), the 2D gate shows
   "GREEBLIS TOWN / Loading..." then "Press A to Continue." A
   pointer/key/touch event, a controller button (polled through
   `navigator.getGamepads()` once the page has user activation) or the
   browser's `sessiongranted` event calls the game's enter-VR routine (the
   async function that shows "Entering VR..."), which requests an
   `immersive-vr` session with optional `local-floor`/`bounded-floor`, hands
   it to three.js, builds the in-VR UI, creates the audio context and hides
   the gate.
3. Leaving VR (the session's end handler) restores the 2D camera and shows the gate again.
4. On non-Quest user agents the gate shows "This game is designed for Meta
   Quest" and nothing else runs.

The head script and the boot changes that launch straight into VR are part of
the game file itself since 3.15.43 (FIXES.md, entry edits: 9 blocks).

## Controls (WebXR)

- Left thumbstick: walk (dead-zone 0.15).
- Right thumbstick left/right: snap turn by 30 degrees; the stick returns to centre between turns, and a turn within
  0.3 s of the last is ignored (A1).
- Trigger (`select`): interact / pick up / choose in menus; the pick cone and
  range are in `t.xr`.
- Grip (`squeeze`): secondary action; both also wake the audio engine.
- Controller button 4 (on either hand) and button 5 (right) are bound to
  UI actions (gamepad button indices 4 and 5 in the per-frame input loop).

## Town life (what runs on its own)

Read from the code and checked by the tests named; numbers are game seconds and metres.

- **Who is who in the code.** Every townsperson is an entity in `It.all` with a post (`def.at`) and an idle
  pattern. Kind `npc` for the townsfolk, `companion` for Gooward (`gorbo`), `creature` only for Zollod
  (`cutebex`). Hennrick's id is `gratelet`, Mushroom's `drifter`, Fortizmo's `frog`, Anomalee's `blinker`.
- **Roamers.** Gooward (around the Gallery), Hennrick (around the Portal), Mama Gorbo (the park) and the three
  dancers Etcher, Glyph and Montgummery (on the dance floor) pick a new spot every few seconds with
  `JGP.roamFree`: outside every building, the Garden (15 m from the middle) and the solid zones (scenery, pools,
  the phone, the stump), inside the park, apart from each other. The others keep to their posts, some of which sit
  beside scenery by design (Fortizmo's). `test_roam.js`.
- **Greeting.** A walking townsperson the player comes within 3.2 m of stops and turns to face them; after 12 s
  they go on even if the player stays, and stop again only after the player has been more than 6 m away.
  Sparkakus greets with a "!" from 6 m. `test_greet.js`.
- **Mama Gorbo and Gooward meet** 20-40 s into the game and 20-40 s after each meeting: they walk to two spots
  2.8 m apart, face each other and take turns, a goo arc with a "blorp" and a pink heart, eight beats 0.6-0.9 s
  apart; then back to roaming. A meeting is called off (and tried 40 s later) if either is busy, visiting, in a
  vignette, or the Event is on. `test_meet.js`.
- **The church is a secret room** (the author): the player walks into it through its wall, where the wall is marked with Xs; there is no door. The
  game's collision tests the player against each building's wall parts (where the church lets the player through)
  while everyone else meets the whole outline. Inside, only the Ancient's vignettes play. Tools that need the
  player's reachable area must test with the player's own position object (`occlusion_census.js` does).
- **Visits and vignettes.** Townsfolk visit each other (`visitPlan`); pairs standing near each other play one of
  90 two-line vignettes (speech bubbles, or Gree-mail tokens flying between them), the Ancient's 12 only inside
  the church. A new visit is tried every 4 s once due (22-32 s after the last); the pick favours the pairs that have
  visited least. The Ancient's visits may be picked on 12.5% of tries, 32% while the player is in the Cave, where
  1 try in 10 also considers only the Ancient's visits (A3); the Cave is checked at each try. Sparkakus is only
  picked as a visitor once the player has the Gem or the Stone (F-B42). Mushroom reaches his desk by its ramp
  (F-B39). A vignette ends at once if a speaker becomes busy or the player talks to one of them; Sparkakus is
  busy whenever he walks to his shelves. `test_visits.js`, `test_content.js`.
- **The jazz drums.** King Dino's kit plays a swung pattern at 104 beats a minute (a bar of 2.31 s): 8 bars of
  brushes, then time, funk, trades and shout choruses of 8 bars each. Heard (on the dance floor, at the kit, or in
  a battle) it is scheduled on the audio clock 3 s ahead; within 45 m it runs on the game clock only, to move the
  drummer's sticks; 1.5 s after the player stops hearing it, it switches clocks and starts the bars again. It is
  silent while the horn plays. `test_jazz.js`.
- **Dance battles.** Glyph, Etcher and Montgummery: rock, scissors or paper each round, the dancer's move picked at
  random and shown before the player picks; stamina 10; BOW OUT works at random 80% of the time (otherwise "The
  beat won't let you go!"; 70% until 3.15.52, FIXES R6). `test_progression.js`, `test_content.js`.
- **Backpacka at the pond.** While she drinks (her show's 16-40 s) the player cannot walk into her: player-only
  circles round her feet, body, neck and head (F-B37). `test_backpacka.js`.
- **The Event's start and end (3.15.54).** A mist bank rolls in over 6 s and settles just outside the town fence
  (A4); the clouds and every Blossom and Flint fade out over 2.5 s (A5); a UFO in flight leaves by its exit path and
  none starts (A6). At the end Backpacka flies off into the mist (her show is 88 s, A7), the mist rolls back out and
  everything fades back in. In a second or later Event the garden's flowers shrink away at the start and grow back
  when watered (F-B43). Nothing is shown or hidden at once. `test_event_fade.js`.
- **Seeded decoration.** The stars, the clouds, blinks, idle phases, Anomalee's glitch timing and jaw and the Event
  ring's sway are the same on every launch (R5); what stays random is in RULES.md 5 and RANDOMNESS.md.
  `test_seeded.js`.
- **Far detail.** The kiosk with fine parts has a coarse model: the full one within 62 m of the camera, the coarse
  one beyond 66 m, whichever it had in between. `test_lod.js`.
- **Sound.** One audio context, made on VR entry; every note is an oscillator and a gain that disconnect
  themselves when the note ends. A suspended context (headset off, app in the background) resumes when the
  page is shown, visible or focused again, and on pointer or key input. `test_audio.js`.

## Content hooks seen in the code

- Dialogue trees keyed `p_etcher`, `p_gemtoe`, `p_glyph`, `p_mamagorbo`, with
  intro / progress / finale lines; the Ancient asks for three Artifacts.
- Panels: `DANCE BATTLE: ETCHER / GLYPH / MONTGUMMERY`, `GARDEN EVENT`,
  `GARDEN SUPPLIES`; menu labels `Talk to ...`, `Give a blossom`, `Shop at
  Garden Supplies`, `Call for pizza`, `Rock out!`, `Do the splits like
  scissors!`, `Go horizontal like paper!`, `Yes/No`, `DONE`, `CLOSE`, `LEAVE`.
- Collectibles: blossoms, flint, "Ancient Gem collected!".
- Audio: everything is synthesised (`G.note(freq, dur, wave, gain, delay)`
  with sine/square/sawtooth/triangle), with helpers like `G.bubbleBlip`,
  `G.toot`; the audio context uses `latencyHint: "balanced"` on Quest.
- No save system: no `localStorage`, `sessionStorage` or IndexedDB use.

Names: "the Event" is the planting event (GARDEN EVENT, `me` in the code, labelled
"finale" there); "the Speech" is Sparkakus's library finale (`speech` in the code).
