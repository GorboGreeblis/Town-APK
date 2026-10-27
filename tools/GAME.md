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
