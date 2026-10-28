# Greeblis Town, basic game documentation

Everything below was read from the game code (`tools/uncompressed.html`,
v3.15). Where the code did not make something explicit it is left out rather
than guessed.

## What it is

A single-file WebXR game for Meta Quest built on three.js: a cartoon town
inhabited by "Greeblis" (characters such as Gorbo, Mama Gorbo, Gemtoe,
Etcher, Glyph, Anomalee, Avarice, Montgummery, King Dino, Sparkakus,
Nextessa and "the Ancient"). The player walks the town, talks to residents,
collects items, takes part in dance battles and a garden event, and finds
three Artifacts for the Ancient, which triggers a timed finale.

The file is about 1 MB, has no external dependencies and makes no network
requests: three.js, all textures (drawn on canvases at start-up), all audio
(synthesised with the Web Audio API) and all dialogue are inline.

## File layout

The HTML is 93 lines; a few of them are very long script blocks.

| Line(s) | Content |
| --- | --- |
| 1 | `<head>`: viewport, styles (ink `#0d0d1a` palette), the 2D gate (`#gate`, `#gateTitle`, `#gateText`, `#gateVer`) and hidden dialogue/panel containers. |
| 2 | Console de-duplication shim, then three.js (bundled, with `WebXRManager`). |
| 3 | Patches three.js Phong/Lambert/Basic materials to default to `DoubleSide`. |
| 4 | Canvas patches: 2D contexts default to `imageSmoothingEnabled=false`; `CanvasTexture` registry for pixel-art textures. |
| 5 | `fillText`/`strokeText` wrapper that shrinks text to fit the canvas ("room"). |
| 6 onwards | The game proper: `window.__jgpBlocked` (user-agent gate), the tuning object `t` (see below), audio engine `G`, world builders, characters, XR input, UI, boot. |
| 7-28 | Hand-drawn glyph/sign paths. |
| 29-90 | World construction: textures, props, buildings (`STORE`, `HOUSE`, `HOTEL`, `SCHOOL`, `COURTHOUSE`, `FIRE_STATION`, `GAS_STATION`, `GOOBURGER`, `WATER_TOWER`, `FIELD_OFFICE`, `NURSERY`, `BILLBOARD`), pebbles, grass, the park. |
| 90-93 | Characters, quests/dialogue, boot sequence, error handlers. |

## Tuning values worth knowing (object `t` at the top of line 6)

- World: `clearingR 36.5`, `parkHalf 37.6`, fog 70-300, far plane 310.
- Player: speed 4.5, body radius 0.6, spawn `[-36.3, -20]`.
- Interaction radii: talk 3.4, greet 3.2.
- XR: eye height 2.6, near 0.15, stick dead-zone 0.15, snap turn 30 degrees
  (`Math.PI/6`), pick range 16, UI distance 11.5, foveation and framebuffer
  scale per quality level, target 72 Hz with an adaptive quality controller
  (`targetHz`, `emaAlpha`, `overFrames`, `underFrames`).
- Pickups: 32 blossoms (regrow 12 s), 40 flint (regrow 12 s; called acorns in the code, flint in the game's own text and the Store).
- Finale: 180 s, NPC chatter every 3-7 s, `finaleLockMs` 600 s.
- Pizza: call delay 1.8 s, driver spawn radius 75, gives up after 100 s.
- Gravity 14.

## Boot and VR entry

1. All scripts run synchronously while the page parses; the world is built
   in one pass (several seconds on a Quest), then `gcEB.ready = true`.
2. The 2D gate shows "GREEBLIS TOWN / Loading..." then "Press A to
   Continue." A pointer/key/touch event, a controller button (polled through
   `navigator.getGamepads()` once the page has user activation) or the
   browser's `sessiongranted` event calls `je()`, which requests an
   `immersive-vr` session with optional `local-floor`/`bounded-floor`, hands
   it to three.js, builds the in-VR UI, creates the audio context and hides
   the gate.
3. Leaving VR (`Xe()`) restores the 2D camera and shows the gate again.
4. On non-Quest user agents the gate shows "This game is designed for Meta
   Quest" and nothing else runs.

The APK build adds a head script and three one-line hooks so the immersive
launch's grant is never dropped (see `apply_entry_fix.py`).

## Controls (WebXR)

- Left thumbstick: walk (dead-zone 0.15).
- Right thumbstick left/right: snap turn by 30 degrees.
- Trigger (`select`): interact / pick up / choose in menus; the pick cone and
  range are in `t.xr`.
- Grip (`squeeze`): secondary action; both also wake the audio engine.
- Controller button 4 (on either hand) and button 5 (right) are bound to
  UI actions (`J` and `ve` in the code).

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
- **The church is a secret room** (the author): the player walks into it through its wall; there is no door. The
  game's collision tests the player against each building's wall parts (where the church lets the player through)
  while everyone else meets the whole outline. Inside, only the Ancient's vignettes play. Tools that need the
  player's reachable area must test with the player's own position object (`occlusion_census.js` does).
- **Visits and vignettes.** Townsfolk visit each other (`visitPlan`); pairs standing near each other play one of
  90 two-line vignettes (speech bubbles, or Gree-mail tokens flying between them), the Ancient's 12 only inside
  the church. A vignette ends at once if a speaker becomes busy or the player talks to one of them; Sparkakus is
  busy whenever he walks to his shelves. `test_visits.js`, `test_content.js`.
- **The jazz drums.** King Dino's kit plays a swung pattern at 104 beats a minute (a bar of 2.31 s): 8 bars of
  brushes, then time, funk, trades and shout choruses of 8 bars each. Heard (on the dance floor, at the kit, or in
  a battle) it is scheduled on the audio clock 3 s ahead; within 45 m it runs on the game clock only, to move the
  drummer's sticks; 1.5 s after the player stops hearing it, it switches clocks and starts the bars again. It is
  silent while the horn plays. `test_jazz.js`.
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
