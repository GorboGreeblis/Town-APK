# Greeblis Town, basic game documentation

Everything below was read from the game code (`tools/uncompressed.html`,
4.0.34). Where the code did not make something explicit it is left out rather
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

## The three forms it ships in

- **The APK** (`GreeblisTown-release.apk`): the game file plus its pre-painted textures (`tex/`, the same pixels the
  game paints itself, loaded instead of painted for a faster start), served by the APK's local server.
- **`index.html`** at the root: the game file alone, for long-term archiving (the author). It launches on its own in a
  Quest browser and is fully playable: every texture painted by the game, every sound synthesised, nothing fetched
  (`test_standalone.js` on every build: the textures match `tex/` pixel for pixel).
- **`index.compressed.html`** at the root: the same file packed for a Bitcoin ordinal (the author: "if I decide to go
  that route again"). It unpacks to `index.html` byte for byte and runs under the content policy ordinals.com serves
  inscriptions with (`test_compressed.js` on every build).

Browsers other than the Quest's are told the game is designed for the Meta Quest Browser and to open the file there
(the user-agent gate, RULES.md 18). In an explorer's sandboxed preview frame, where VR is not allowed, the game says to
open the inscription's full page in the Quest Browser (A15).

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
  (`Math.PI/6`), pick range 16, UI distance 11.5, fixed foveation 0 (one value, set at VR entry, never changed: F-B83),
  the framebuffer scale native (1), target 72 Hz with a frame-time average (`targetHz`, `emaAlpha`) and a
  frames-over-budget flag that only logs (`sosFrac`, `sosFrames`); the quality levels are gone (L1, 4.0.14).
- Pickups: 32 blossoms (regrow 12 s), 40 flint (regrow 12 s; called acorns in the code, flint in the game's own text and the Store).
  No pickup spot lies inside a building, a kiosk's area (the phone booth, the portal) or within 4.1 m of the Gazebo's
  centre (B95, 4.0.33; a Blossom had been seen on the Gazebo's inner edge). `test_world.js`.
- Finale: 190 s of planting (180 s until 3.15.57, A9), NPC chatter every 3-7 s, the far plane at `finaleFar` (300) for the Event's far-object safeguard.
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
3. Leaving VR (the session's end handler) stops a snap turn's blink, clears the pending timers, turns the Event's
   far-object safeguard off, hides the in-VR panels, dialogue, menu and HUD, restores the 2D camera, resets the
   game clock (`Re.resetClock`), wakes the audio and shows the gate again. Its clean-up is guarded: a throw part way still
   ends presenting, so VR can always be entered again (S38).
   **Entering again** (S31): the gate's own entry (A, a click) requests a second session through the entry script,
   with the `layers` feature like the first (`session requested again (re-entry)` in the log); it runs on a new
   projection layer through the frame wrapper, with multiview again, and uploads nothing new (the mipmaps are kept,
   S20). The first session's layer shim frees its framebuffers and depth buffers when that session ends (B96, 4.0.34;
   each re-entry leaked about 24 MB before). `test_reentry.js`.
   **Blurred and hidden** (Horizon OS's menus, the headset taken off): while the session is `visible-blurred` the
   game keeps rendering but skips its update (no movement, no NPC time, no input) and hides the controllers; while
   it is `hidden` the browser sends no frames. Back to `visible`, frames resume where they stopped and a suspended
   audio context is resumed. Each change is logged (`xr visibility ...`) with the native census (Safeties below).
   `test_play.js`, `test_input.js`, `test_audio.js`, `test_b96.js`.
4. On non-Quest user agents the gate shows "This game is designed for the Meta Quest Browser. Please open this
   file in the Quest Browser on your Meta Quest headset." with the version below it, and nothing else runs (A15,
   A18).
5. The version is shown in three places: under the landing text, in the gate's corner (`#gateVer`) and in the VR
   loading box's bottom right corner. `build.sh` stamps it from `versionName` on every build (step 3b, A18).

The head script and the boot changes that launch straight into VR are part of
the game file itself since 3.15.43 (FIXES.md, entry edits: 9 blocks).

## Controls (WebXR)

- Left thumbstick: walk (dead-zone 0.15).
- Right thumbstick left/right: snap turn by 30 degrees; the stick returns to centre between turns, and a turn within
  0.4 s of the last is ignored (A1; 0.3 s before 3.15.59, A11). Since 4.0.31 each turn is made inside a short blink:
  the view dims to black and back over five frames (about 70 ms), the turn on a fully dark frame (S37; RULES.md 27).
- Trigger (`select`): interact / pick up / choose in menus; the pick cone and
  range are in `t.xr`.
- Grip (`squeeze`): secondary action; both also wake the audio engine.
- Controller button 4 (on either hand) and button 5 (right) are bound to
  UI actions (gamepad button indices 4 and 5 in the per-frame input loop).
- Left Y (button 5 on the left): the inventory HUD (A35). The left hand wears a watch whose face reads "PRESS Y TO
  OPEN"; Y while looking at the watch (its face within 0.8 m, turned toward the eyes, within about 35 degrees of the
  view's centre) opens the HUD; Y again, or looking away for a third of a second, closes it. With the HUD closed and
  the watch not looked at, Y brings the open panel or dialogue back in front, as before.

## Town life (what runs on its own)

Read from the code and checked by the tests named; numbers are game seconds and metres.

- **Who is who in the code.** Every townsperson is an entity in `It.all` with a post (`def.at`) and an idle
  pattern. Kind `npc` for the townsfolk, `companion` for Gooward (`gorbo`), `creature` only for Zollod
  (`cutebex`). Hennrick's id is `gratelet`, Mushroom's `drifter`, Fortizmo's `frog`, Anomalee's `blinker`.
- **Roamers.** Gooward (around the Gallery), Hennrick (around the Portal), Mama Gorbo (the park) and the three
  dancers Etcher, Glyph and Montgummery (on the dance floor) pick a new spot every few seconds with
  `JGP.roamFree`: outside every building, the Garden (15 m from the middle) and the solid zones (scenery, pools,
  the phone, the stump), inside the park, apart from each other. The others keep to their posts, some of which sit
  beside scenery by design (Fortizmo's; her bar's opening is 2.2 m, A17). `test_roam.js`.
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
- **Visits and vignettes.** Townsfolk visit each other (`JGP.visits`); pairs standing near each other play one of
  90 two-line vignettes (speech bubbles, or Gree-mail tokens flying between them), the Ancient's 12 only inside
  the church. A new visit is tried every 4 s once due (22-32 s after the last); the pick favours the pairs that have
  visited least. The Ancient's visits may be picked on 12.5% of tries, 32% while the player is in the Cave, where
  1 try in 10 also considers only the Ancient's visits (A3); the Cave is checked at each try. Sparkakus is only
  picked as a visitor once the player has the Gem or the Stone (F-B42). Mushroom reaches his desk by its ramp
  (F-B39) and leaves it the same way, never hopping; no step of his rises or drops more than 0.3 m, so the desk is
  solid to him (F-B46). `test_mushroom_desk.js`. A vignette ends at once if a speaker becomes busy or the player talks to one of them; Sparkakus is
  busy whenever he walks to his shelves. `test_visits.js`, `test_content.js`.
- **The jazz drums.** King Dino's kit plays a swung pattern at 104 beats a minute (a bar of 2.31 s): 8 bars of
  brushes, then time, funk, trades and shout choruses of 8 bars each. Heard (on the dance floor, at the kit, or in
  a battle) it is scheduled on the audio clock 3 s ahead; within 45 m it runs on the game clock only, to move the
  drummer's sticks; 1.5 s after the player stops hearing it, it switches clocks and starts the bars again. It is
  silent while the horn plays. `test_jazz.js`.
- **Dance battles.** Glyph, Etcher and Montgummery: rock, scissors or paper each round, the dancer's move picked at
  random and shown before the player picks; stamina 10; BOW OUT works at random 80% of the time (otherwise "The
  beat won't let you go!"; 70% until 3.15.52, FIXES R6). `test_progression.js`, `test_content.js`.
- **Nextessa and the Gem.** While the Gem assembles in the Speech, Nextessa (through the Portal with the pizza) stands
  and faces the player; she delivers once the Speech is over (F-B45). `test_courier_gem.js`.
- **Anomalee in the Event.** Without Snacks she plants like everyone else; with them she sets her own open pizza box
  beside her (the logo on its lid) and eats a slice every 22 s instead of planting, leaving the last two (F-B49).
  `test_anomalee.js`.
- **The Event's pizza boxes** (with Snacks): the ring of stacked boxes fades in over 1.6 s as the Event starts, and
  Anomalee's open box fades in as she sets it down (A51); both fade out over 1.6 s at the Event's end (A42). Each fades
  with its own copies of the box materials, so one never fades the other; a ring is batched once its fade-in is over.
  `test_pizza_fade.js`.
- **Backpacka at the pond.** While he drinks (his show's 16-40 s) the player cannot walk into him: player-only
  circles round his feet, body, neck and head (F-B37). `test_backpacka.js`.
- **Doorway homes.** Four townsfolk have a doorway route home: Fortizmo's bar, the Mushroom's ramp, Gemtoe's gazebo
  and Zollod's kiosk. The route is used only when they go to their real home inside, never for a visit's waypoint
  outside (F-B55).
- **Stuck.** A townsfolk that wants to move and gets no 0.3 m closer to its target in 5 s is stuck: it is re-planned,
  then placed at its target (as the older stuck rule does). The log says "no progress" (F-B55). `test_stuck.js`.
- **Ground.** The Garden is flat (0.02 m): its furrow rings, 48 stepping stones and ring of 72 rocks are painted on
  one seeded overlay over the soil (F-B57; the author: "regardless of anything else we will be keeping the flat
  version"); the Event's flowers are planted at 0.015 m. The Cave room is 4.5 cm lower than it was, its floor 5 mm
  above the town ground, so its entrance is level; no raised pebble or rock lies within 1.45 m of the visitors'
  walkway (F-B60). Mama Gorbo's goo follows the topmost ground under her, 1.5 cm above it (F-B58). Characters are
  lifted onto raised ground (a kiosk's floor, the pond's edge) by a height follower that samples the ground again
  once they have moved 5 cm (P30). Gemtoe floats a little on purpose (the author).
- **The Event's start and end (3.15.54, 3.15.57).** A mist bank rolls in over 30 s (15 s until 3.15.62, A16) and settles just outside
  the town fence (A4, A9), in a soft grey (90% of the fog colour); everything beyond the fence is misted by where it stands, so
  walking up to the fence never clears it (A9); the ground is in the mist's colour from 1.5 m beyond the fence, where
  the mist's first wall stands, so the mist over the fence does not thin as the player comes near (A19); the planting lasts 190 s; the clouds and every Blossom and Flint fade out over 2.5 s (A5); a UFO in flight leaves by its exit path and
  none starts (A6). At the end Backpacka flies off into the mist (his show is 88 s, A7), the mist rolls back out over
  30 s and everything fades back in. In a second or later Event the garden's flowers shrink away at the start and grow back
  when watered (F-B43). Nothing is shown or hidden at once. `test_event_fade.js`.
- **The Event's fade groups (3.15.66, P33; RULES.md 30).** Once the mist is past 15%, each kiosk (every building but the
  church) and the gazebo fade out over 10 s, each on its own and only once its owner has left home (6 m), and every
  tree with the robin as one group; all of a group's parts fade together. Once out, a group stays out until the Event
  ends, however near the player comes (A26), and all come back after it over 10 s. The church and Cave, the Ancient, Somlet, the pond (F-B64: the
  far-scenery fader no longer touches it) and the Garden never fade. Fading is drawn only: collision stays on, and as a
  group comes back anyone standing in it is pushed out (S3). `test_stands.js`.
- **The Ancient** (A52, 4.0.33): its body (core, mantle, head and eye stalks) is 15% larger than before about its
  ground point, in the build and in its idle breathing; its solid radius is 1.0 m and its meeting radius 1.6 m, so
  visitors stand 1.9 m plus their own radius from its axis, clear of the Cave walkway's 1.45 m half-width. Its skin and
  bump textures are painted at 1024 x 256 (512 x 128 before), pre-painted into `tex/` like every texture.
- **The gazebo (3.15.67, F-B65).** Its seven railed sides are solid walls for everyone; its doorway is open to anyone.
  Gemtoe can be talked to from all round it (talk range 4.6 m).
- **The Event's flowers** are 15% taller (A20) and more colourful (A22); **the pond's water** ripples (A21).
- **Seeded decoration.** The stars, the clouds, blinks, idle phases, Anomalee's glitch timing and jaw and the Event
  ring's sway are the same on every launch (R5); what stays random is in RULES.md 5 and RANDOMNESS.md.
  `test_seeded.js`.
- **Far detail.** The kiosk with fine parts has a coarse model: the full one within 62 m of the camera, the coarse
  one beyond 66 m, whichever it had in between. `test_lod.js`.
- **Sound.** One audio context, made on VR entry; every note is an oscillator and a gain that disconnect
  themselves when the note ends. A suspended context (headset off, app in the background) resumes when the
  page is shown, visible or focused again, and on pointer or key input. `test_audio.js`.

## Safeties (what keeps a frame whole)

- **Nothing new uploaded or compiled inside a headset frame.** Textures are made while loading (RULES.md 9) and their
  uploads are done between frames (F-B31); an object whose geometry was never uploaded (F-B51) or whose first draw
  would compile a new shader program (S2) is held back for that frame and done right after it, so it appears a
  frame later. `test_firstdraw.js`, `test_shaderhold.js`.
- **The head inside a character.** A character the player's head is inside is hidden for that frame, so its inside
  never fills the view (S1).
- **A failing draw hook.** A per-object draw hook that throws is logged once and the frame is drawn to the end (S1).
- **A frame the game did not draw is drawn anyway** (S18). The entry script counts the game's draws per headset frame;
  a frame begun on the projection layer with none is drawn by the entry script itself before the frame ends, so the
  compositor never shows a swapchain image the game left untouched.
- **A soft tone behind the sky** (S18, S33). The renderer clears to a muted ground green outdoors (#6f8a78) and to
  black in the Cave, never to the sky's near-white horizon colour; the sky sphere covers every pixel, so nothing
  visible changes, and a frame whose draw is ever lost shows a flat tone close to the scene's own brightness.
  (Black everywhere from 4.0.13 to 4.0.26; 4.0.24 left the colour uncleared, S30, taken out in 4.0.25, B90.)
- **Nothing touches the session after VR entry** (F-B83, S18): one fixed foveation set at entry, the projection layer
  never swapped, the session's depth range sent once (the Event's far-object safeguard does change the camera's far
  plane, 310 to `finaleFar` 300 m and back, but the bundled three.js is patched to send the depth range once per
  session: a later change is kept off the session and logged, `depth range change kept off the session in play`), the
  eye buffer never read during play (the light record is opt-in), and a flush at the end of every frame. The loader's
  layers and context stay whole for the whole session (B75's release reverted in 4.0.34, B96; RULES.md "Decisions").
- **The stability safeties** (S38, 4.0.32; `test_s38.js`), each a guard that changes nothing in normal play: the
  player's stick value is cleared at the start of each update, so an update that fails early never keeps walking the
  player; a throw while hiding a character the head is inside is caught before the draw, and the frame draws as
  usual; a non-number movement step is skipped (the player stays put rather than being sent to the spawn point); a
  VR exit whose clean-up throws still ends presenting.
- **The 60 s limits** (S38): the Gem scene's hold (`Bulb.hold`, which refuses every interaction until the Speech's
  dialogue clears it; about 16 s in play) is cleared if it stays on 60 game seconds with no dialogue open; the Event
  waits for Backpacka's ending show at most 60 s past its own time, then ends. Both are logged as `recovery: ...`.
  An Event that fails for 30 frames running is ended (S20).
- **The native census** (B96, 4.0.34): the entry script counts the live GL objects of every context (textures,
  buffers, framebuffers, renderbuffers, programs, vertex arrays: create minus delete, plain JS counters, no GL call)
  and the XR layers made and destroyed, and logs them (`native census (why): ...`) on every XR visibility change, 5 s
  after each return and every 60 s, with the change since the last census and `(GROWTH)` past +16 textures, +2
  framebuffers, +2 renderbuffers or +64 buffers. `test_b96.js`.
- **The log's black box** (B96): once the APK's log server has answered, a log line whose sending fails is kept, the
  last 150, in `localStorage` under the key `gtBB`, and sent at the next boot marked `unsent from the last run:`, then
  cleared. That key holds unsent log lines and nothing else. With no log server ever answering (the standalone and
  ordinal copies) nothing is kept. `test_b96.js`.

## Every element of the game, where it is described and what tests it

The index of the game's elements (the author: "Fully build out the documentation to cover all game elements"). The
story, characters and looks are in `LORE.md` (section named); the fixes in `FIXES.md`; tests in `README.md`.

| Element | What it is | Described in | Tested by |
| --- | --- | --- | --- |
| The park and the town | A cartoon town round Greeblis Park, inside a picket fence; the mist beyond it in the Event | LORE "The world", "Environment design and style" | `test_world.js`, `test_seams.js`, `test_zfight.js`, `test_coincident.js`; `shots.js --preset park` |
| The Garden and the Summoning Pillar | The park's centre; the Pillar ("Use the Summoning Pillar") starts the Event with the Summoning Stone | LORE "The world", "Events" | `test_content.js` (zones), `test_noseeds.js`, `test_stands.js` |
| The kiosks | Post Office, Sheriff's kiosk, Garden Supplies, Gooward's Gallery, Juice Bar, First Bank (with Gemtoe's Gazebo); the Phone Booth and the Portal count as kiosks | LORE "The world" | `test_npc_home.js`, `test_owner_exit.js`, `test_gazebo.js`, `test_stands.js` |
| The Post Office's mail pile | Behind the kiosk: letters, sacks and five parcels ("To Montreal", "To Cobourg", "To Bangkok", "To Ormstown", one blank) | LORE "The world"; FIXES A43 | `test_mailpile.js`; `shots.js` free views |
| The church and the Cave | The Ancient's home; the Cave's walkway and visit spot; visitors come to the Ancient | LORE "The Ancient" | `test_cave.js`, `test_visits.js`; `shots.js --preset cave` |
| The Library | Sparkakus's kiosk, its books (OVERCOMING SHYNESS), the Speech | LORE "The Library's books" | `test_content.js`, `test_progression.js` |
| The pond | A flat water texture, its stones on the ground | LORE "Environment design and style"; FIXES A33 | `shots.js --preset pond` |
| The Portal and the TELEPHONE | Pizza is ordered by phone through the Portal, once the Sheriff takes a Blossom | LORE "The world" | `test_progression.js`, `test_courier.js` |
| The park's trees and birds | The robin and the cardinal (facing the robin) on the two big trees; picked, they fly off | LORE "The robin", "The cardinal" | `test_content.js`; `shots.js --preset birds` |
| The billboard and the WANTED posters | King Dino's jazz billboard; the alien and GLOOPERNAUGHT posters | LORE "The world" | `test_textfit.js` (painted text), pictures |
| The townsfolk | Hennrick, Mushroom, Anomalee, King Dino, Gooward, Zollod, Somlet, Fortizmo, Etcher, Gemtoe, Glyph, Montgummery, Mama Gorbo, Sparkakus, the Ancient | LORE "Cast", "Character by character" | `test_roam.js`, `test_stuck.js`, `test_jitter.js`, `test_greet.js`, `test_cap.js` (Mama Gorbo's cap) |
| Nextessa | The pizza courier from the far future: arrives, waits for the Gem, delivers | LORE "Nextessa" | `test_courier.js`, `test_courier_gem.js` |
| Backpacka | The flying creature of the Event: drinks from the pond, waters the Garden, flies into the mist | LORE "Backpacka" | `test_backpacka.js`, `test_bp_water.js` |
| Pickups | 32 Blossoms and 40 flint in the park, regrowing in 12 s; never inside a building, a kiosk or the Gazebo (B95) | LORE "Currency, items and rewards"; GAME "Tuning values" | `test_world.js` |
| Rewards and items | Artifacts (dance-battle wins), the Gem, the Summoning Stone, Seeds, Snacks, the shyness book, outfits | LORE "Currency, items and rewards", "Quests and their lines" | `test_progression.js`, `test_courier_gem.js` |
| Talking and gifts | Menus (`Talk to ...`, `Give a blossom`), dialogue pages, greetings | LORE "Quests and their lines", "Gifts and gardening lines" | `test_progression.js`, `test_menu.js`, `test_textfit.js`, `test_greet.js` |
| Dance battles | Etcher, Glyph and Montgummery; rock, scissors, paper; King Dino on drums | LORE "Events" | `test_content.js`, `test_progression.js` |
| Text scenes and token scenes | Two townsfolk meet: speech bubbles, or thrown tokens (one choreography ends in a confetti burst) | LORE "Vignettes" | `test_vig_flash.js`, `test_bubble_clear.js`, `test_bubble_eye.js` |
| Mama Gorbo and Gooward's meeting | Hearts and a goo barrage; Gooward not interactable during it | LORE "Events"; FIXES A39 | `test_meet.js`, `test_meet_walk.js`, `test_goo_eye.js` |
| King Dino's jazz | The jazz session | LORE "Events" | `test_jazz.js` |
| The Speech | Sparkakus assembles the Gem from the three Artifacts | LORE "The Ancient", "Events" | `test_courier_gem.js`, `test_progression.js` |
| The Event (planting) | Started at the Pillar: the town gathers in a ring, the mist rolls in, kiosks and trees fade, flowers are planted and grow, Backpacka waters them, pizza boxes are out (with Snacks) and fade at the end | LORE "Events"; GAME "Town life" | `test_stands.js`, `test_event_fade.js`, `test_flower_tint.js`, `test_pizza_fade.js`, `test_noseeds.js`, `test_mushroom_event.js`, `test_anomalee.js` |
| The player | Walk, snap turn, the pick ray, the menus; the left-hand watch whose HUD opens on its face (Y while looking at it) | GAME "Controls"; FIXES A35, A41 | `test_input.js`, `test_menu.js`, `test_watch.js`, `test_hud.js` |
| View safeties | The head guard (the view dims at a wall), the head inside a character, held uploads and shader compiles, eye guards (goo, bubbles, confetti) | GAME "Safeties"; FIXES S1-S15, F-B82 | `test_safeties.js`, `test_shaderhold.js`, `test_firstdraw.js`, `test_goo_eye.js`, `test_bubble_eye.js` |
| The flash record | The B mark logs the last seconds: state changes, GPU work, the drawn picture's brightness, XR frame health | FIXES D2, S15; `HEADSET_DIAG.md` | `test_flashlog.js` |
| Sound | Every sound synthesised; positional hearing radii | GAME "Content hooks" | `test_audio.js` |
| Frame rate and quality | The governor (a frame-time average and an over-budget flag that only logs; no quality levels since 4.0.14; the render scale is native and foveation fixed at 0), the Event's far-object safeguard (keyed on the Event alone), multiview, batching | `PERF.md`, `RENDERING.md` | `test_governor.js`, `test_lod.js`; report tools in `README.md` |
| Stability | Recovery from faults, the stability safeties and 60 s limits, leaving and entering VR, memory after the headset sleeps (the native census, the black box), long play | GAME "Safeties", "Boot and VR entry"; FIXES S3-S5, S13, S31, S38, B96 | `test_recover.js`, `test_s38.js`, `test_reentry.js`, `test_b96.js`, `test_soak.js` |
| The three forms | The APK, `index.html` (archive), `index.compressed.html` (ordinal) | GAME "The three forms it ships in"; NOTES 100 | `test_entry.js`, `test_standalone.js`, `test_compressed.js` |

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
- No save system: no game state is stored. The only storage use is the log's black box: unsent log lines in
  `localStorage` under `gtBB` (B96, Safeties above); no `sessionStorage` or IndexedDB.

Names: "the Event" is the planting event (GARDEN EVENT, `me` in the code, labelled
"finale" there); "the Speech" is Sparkakus's library finale (`speech` in the code).
