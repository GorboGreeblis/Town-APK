# Changes to the game: the changelog

Every change made to the author's original game, in order. Since 3.15.43 (NOTES 87) they are all in the game file
itself, `tools/uncompressed.html`, which is edited directly; add an entry here by hand for each new change (its ID,
what it does, why, who decided it, and how it was proven), newest at the end of its section. The entries up to
3.15.43 were generated from the comments of the build script that applied them as text edits to the original
(`apply_entry_fix.py`, now retired; the tool names below are as they were then).
Code names: since 3.15.45 the game file is minified (R2). Names at the top level of the game's script (`b`, `vo`, `F`,
`gcEB`, `holdsAll` and the like), property names and strings are as quoted; names local to a function were renamed,
so the entries before R2 quote the unminified file (`git show 21596f1:tools/uncompressed.html`).
IDs: numbers are the entry edits, B or F-B a bug fix (tools/BUGS.md; F-B is the ID BUGS.md gives it once fixed),
P a performance change (tools/PERF.md), L the license notice, D diagnostics, R a change made to meet one of the
author's rules (tools/RULES.md), A a change the author asked for (new content or behaviour), S a
safety (a guard that backs up the flash fixes: S1, S2). NOTES numbers point to tools/NOTES.md.

## Entry edits (9 blocks)

The head script and boot changes that launch the game straight into VR (RELEASE.md 6; since 2026-10-28 changes go
straight into the main build, RULES.md 22).

- **1** (1 edit): Head script: request the VR session immediately on the Quest Browser (the immersive activity
accepts a page request without a press; it never sends sessiongranted for a fresh launch, see NOTES
33), park the session, and draw our own loading screen into it (title, progress bar) until the game
takes it over. Also keeps the sessiongranted path for browsers that use it.

- **2** (1 edit): Gate: expose the game's own "enter VR" routine to the head script.

- **3** (1 edit): World ready flag for the head script (the actual entry happens at the end of the boot, after
shaders are compiled and the game loop is running).

- **4** (1 edit): Session request: reuse the parked session and tell the loader to stop.

- **5** (2 edits): Boot becomes async so the loading screen can draw between slices: the outer boot function and its
world-build IIFE are awaited, errors still reach vo(); at the very end the game enters the parked
session.

- **6** (2 edits): Shader compile in 8 slices (it is ~40% of the boot), then the first draw.

- **9** (1 edit): Pre-rendered textures: the canvas painter consults the head script's table first (see
tools/prerender_textures.js); painters that draw text are never substituted (fonts differ between
machines).

- **7** (13 edits): Yield points before the heavy world-build steps (anchors are the first characters of each step;
see tools/lib/boot_map.js for the map).

- **8** (3 edits): Yields inside the spawn loops (one creature per slice).

## Gameplay, performance and other fixes (120 blocks)

- **B24** (1 edit): (VRC.Quest.Input.4, focus-aware): while the system UI has focus the XR session is "visible-
blurred"; the game already keeps rendering and skips its update (no input), but three.js stops
updating controller poses, so the controller rays and hand meshes stayed frozen in view. The
renderer's controller groups (ray and grip, which carry the game's beam and hand meshes) are hidden
while blurred; on return they are shown again and three.js resumes setting their visibility from the
poses each frame.

- **B21** (3 edits): (author, "fix all instances of z-fighting listed"): the parapet band on the Store, Bank and Fire
Station fronts is a box as wide as the wall, so its side faces lie in the wall's side planes and
overlap them by 1 cm at the wall top (a shimmering line along the roof edge), and its back face lies
in the back wall's plane. The band is now 2 cm wider (1 cm proud on each side) and its back is 2 cm
proud; the front edge stays where it was.

- **B22** (1 edit): (author): Mushroom's hat band (a six-sided torus tube) rested with its flat underside exactly on
the brim's top surface, a sliding contact seen from below the brim. The band sits 3 mm lower, so its
underside is inside the brim (3 cm thick there) and the brim's surface crosses the tube at an angle.
Nothing visible changes.

- **B23** (1 edit): (author): the Robin's three tail feathers are flat boxes 22 mm wide on 20 mm centres, so their
top and bottom faces share planes in the 2 mm overlaps; the white tips' undersides lay in the
feathers' undersides. The middle feather is 1 mm thicker (its faces half a millimetre proud of its
neighbours') and the tips sit half a millimetre higher, with their undersides inside the feathers.

- (1 edit) Mushroom stuck beside/behind his kiosk. The navigator's segment test ignored a building entirely
whenever BOTH ends of the segment lay inside the building's clearance margin, so a route from a spot
beside the kiosk to the front waypoint (both within ~1 m of the walls) was reported clear and he
walked into the wall for good. The fix: when either end is within the margin, test the segment
against the real hull instead (and still ignore the building when both ends are inside it, i.e.
walking indoors).

- (1 edit) Hennrick's campfire line was missing its subject.

- **B8** (2 edits): only the shopkeeper should pause while the Shop menu is open. holdsAll() froze every NPC for any
panel but the battle; now the shop panel is excluded and Zollod (cutebex) is paused through the
targeted branch instead.

- **B7** (2 edits): a failed VR request showed leftover wording for one frame and was then overwritten by "Press A".
Show a real message and hold it for 8 seconds.

- **B1** (1 edit): when a posted NPC's straight walk to a waypoint outside any building would cross a real wall,
re-route at once instead of pinning against the wall for a second until the stuck detector notices.

- **B4** (1 edit): the route smoother only checked grid cells, so a long straightened leg could clip a building
corner; also reject legs that cross a real hull.

- **B12** (1 edit): pre-warm: the first pickup of a session created 14 textures and 57 geometries on the spot
(sparkle pool, label textures, splat) and dropped frames. Warm them during the sliced boot, out of
sight (y = -60), so a pickup never allocates on the GPU mid-game. Anchored on the entry edit's warm-
up slice (GAME_FIXES apply after EDITS).

- **B2** (1 edit): the stuck-rescue teleport only fired out of view (4 stalls, >12 m away and outside the view), so
an NPC stalling in front of the player twitched for as long as they watched. Keep that, and add a
visible fallback after 8 stalls (~10 s): a sparkle burst where it stood and where it lands ("poof").

- **B4r** (2 edits): the last leg of a route (previous point -> exact target) was only checked up to 1.2 m short of
the target, and the final target leg not at all, so a route could still clip a building corner right
at its end. Check the whole leg before dropping the last cell, and if the final leg is still
blocked, go round the corner with an L-shaped step.

- **B14** (1 edit): the corner behind the Shop is sealed. The Shop stands diagonally across the south-west corner
and its clearance margin meets both park walls, so the triangle behind it (local z below the back
wall) is free ground that no route can reach: a grid island of ~28 cells. A route that started or
ended there found no path and fell back to a straight leg through the Shop (world test: 4/20 random
routes crossed the Shop hull by up to 3.4 m). Treat the sealed corner as not free, so it is never a
roaming target, a route endpoint, or an open grid cell.

- **B15** (1 edit): a failed VR entry must never end the session. In an immersive launch the session IS the app:
ending it exits to the OS. The original ended it when three.js could not attach (3.15.11 crashed
this way: the browser forbids baseLayer on a session with the "layers" feature). Now the error goes
to the loading screen, which keeps drawing, and the entry is retried; the session is ended only when
not launched by the APK.

- (1 edit) Page errors are reported to the loopback server (logcat "GreeblisServer: page: ...") so a headset
log explains itself.

- **B16** (5 edits): the game was not fully loaded when the user was dropped in. Two things still ran after the
handover: buildUI() (the VR panels, their canvases and textures, plus two controller rigs) inside
the entry routine, and 2.5 s later Ho.capture(), a pixel readback of every painted canvas texture
(the handover profile measured it at seconds), i.e. the black bars seen right after entering. Both
now run during the loading screen: the UI before the shader slices (so its programs are compiled
with the rest) and the capture in small slices before the boot ends.

- (1 edit) buildUI lives in the VR module's scope, which the boot cannot see; the module publishes it (the
module runs before the boot's first slice ends).

- **B17** (2 edits): the garden Event's props (Backpacka, jets, drops, ripples: 28 objects) were built when the
Event gathered, a one-time stall in play (46 ms headless). Build them hidden during the loading
screen, before the shader slices, so their programs compile with the rest.

- (1 edit) BP (the Event module) is not visible from the boot's scope either; publish it.

- (1 edit) Sharpness: render scale 1.2 / 1.1 at the top two quality levels, native below; foveation only from
level 3. The author compared 1.2 on the headset ("looks better"); the governor stepped it down to
1.1 after 4 s and to 1.0 after a minute, which with flash-free layer swaps (xr_layers_shim.js) is
the intended behaviour: sharp when there is headroom, native under load.

- (2 edits) Gallery painting (author's request): Gooward's large painting at the Gallery kiosk is painted in a
worker at ART.s pixels per unit (1.5: a 3072x1158 canvas for 6.9 x 2.6 m). The painter scales with
its canvas, so 2.0 gives 4096x1544 (each of the three panels 1365x1544) and the art textures take
the maximum anisotropy instead of the global 8.

- (1 edit) Texture capture probes (loading time): Ho.capture samples up to 8 pixels of every painted canvas (a
GPU readback each, 0.8 s of the 8.2 s boot on the headset) to remember probe points for the context-
loss restore. Pre-rendered textures carry their probe points in the manifest, computed at build time
by tools/prerender_textures.js; the capture uses them.

- (1 edit) Submission safety: start at the native render scale (level 2: 1.0, no foveation, today's baseline)
and let the governor step UP to 1.1 / 1.2 when frames stay under budget, instead of starting at 1.2
and dropping frames for a second or two at every launch (what the Store's performance check looks
for).

- (2 edits) Loading time (NOTES 49): the blob-body mesher ray-marches 4941 rays per character body, each
stepping 2 cm from 2.6 m inward until it is inside the field (up to 130 field evaluations per ray,
each a sum over every part), then bisects 14 times. The field is a distance bound, so the march can
step by the field value instead (sphere tracing, 80% of the bound, 2 cm to 15 cm): the same first
crossing, found in a few steps; the bisection keeps the surface within 1e-5 of before. Measured: the
five heavy townsfolk, the creatures and the kiosks spent 60-75% of their boot slices in this march
on the headset's own clock.

- **B20** (1 edit): (author): z-fighting where the metal and the glowing parts of Hennrick's forearm cuffs overlap.
The cuff is a cylinder of radius .36 (height .26, so its top cap is at y -.99) whose surface reaches
z .41; its three cyan lights are boxes .08 x .04 x .02 centred at z .40 and y -1.07 / -1.01 / -.95.
Two exact coincidences: the lights' front faces lay on the cuff's surface, and the middle light's
top face (y -.99) lay in the plane of the cuff's top cap, a cyan-on-metal sliver seen from above
(tools/test_coincident.js finds it; 3.15.22 fixed only the first). The lights now sit half inside
the cuff (centre z .415: back face .405 inside the metal, front face .425 proud by 1.5 cm), 1 cm
higher (y -1.06 / -1.00 / -.94, so the cap plane passes through the middle light's body instead of
along a face), and the cuff is .37 so it clears the forearm's noise-displaced skin (.34 + up to
.018).

- **B11** (3 edits): Nextessa (the pizza courier) pinned against the Ancient. Inside the church she walked straight
at the player; when the player stood on the far side of the Ancient, the Ancient's solid part
blocked the line and nothing re-routed her (and the same straight line pinned her on the way out).
Add a detour helper: if the church-local segment crosses the Ancient's box (plus her radius), walk
around its front corners first. Used for the approach and for the exit path. The corners sit 1 m
outside the margin so follow()'s 1 m arrival radius cannot swallow them; a courier already at her
own-side corner walks straight (no detour loop).

- **P1** (1 edit): (author, FPS work, 2026-10-27): the render-scale governor steps down after half a second over
budget instead of a full second (overFrames 72 -> 36 at 72 Hz). Nothing changes while frame time is
within budget.

- **P2** (1 edit): the pickup glow's point light makes every lit material compile a second shader variant;
`Ut.warm()` pre-compiles them (light on, `O.compile`) but ran at the moment of entering VR, right
after the drop-in. It now also runs during the loading screen, with the other pre-warms (through a
helper published where `B` is the camera), so the entry compiles nothing. Same visuals.

- **P4** (1 edit): fully transparent objects (opacity 0: the daytime stars, the Event props waiting at the
campfire, finished fades) were still drawn every frame at zero opacity, pure fill-rate cost on the
headset. A sweep before each render marks a standard material invisible while its opacity is 0 and
visible again as soon as it rises; the list of transparent materials is refreshed every 120 frames.
Nothing visible changes.

- **B25** (1 edit): (author, headset: Zollod walked into the side of his kiosk, jittering, before he got in): a
keeper walks home by routing to the last point of the kiosk's exit path, local (2, 3.4), then
follows the path in. That point is 0.95 m in front of the kiosk hull, inside the router's blocked
margin around buildings (the walker's radius plus 0.35 m, up to 1.35 m), so the route ends short and
the final straight leg crosses the side wall when the keeper comes from the side; the stuck handling
then takes seconds. The exit path gets one more point, local (2, 4.4), outside the margin: the route
ends in the open in front of the kiosk and the path leads in along the front. The same path is
walked in reverse when a keeper leaves. `tools/test_npc_home.js` (Mushroom's kiosk, same exit path)
measures the side approaches.

- **B25** (2 edits): continued: the real causes of Zollod's bump, from `tools/test_npc_home.js` run on him (cast type
"cutebex"). (1) His body radius .9 (collision .72 m) does not fit the kiosk's inner corridor between
the stool and the side wall (parts 1.45 and 2.86, the path at local x 2) or the gap between the
stools (local x +-.75); every other keeper is .8 and fits. Radius .8: the collision circle only,
nothing visible. (2) A keeper within 4 m of home, or already inside the kiosk hull, walked straight
to home, which from the customer side means into the desk; now a keeper in front of the desk line
(0.9 m ahead of home along the kiosk axis) takes the exit path in, unless the home is raised
(Mushroom hops onto his desk from the front, unchanged).

- **P2** (1 edit): continued: `Ut.warm()` itself threw on this three.js build (`B.getWorldDirection` does not exist
here), silently at VR entry (its call is in a bare try) and loudly from the loading screen, so the
light-on shader variants were never pre-compiled and compiled on the first pickup instead. The
camera's forward direction is taken from its quaternion.

- **B25** (1 edit): continued (global): a walker sent straight to a kiosk home (an interrupted visit, the stuck
handler, the Event's send-home) was routed to the open cell nearest the home point, which for a home
near the back wall is behind the kiosk, and the final straight leg then went through the wall for
good. Every route whose target is the walker's home now goes to the last point of the home's entry
path (`def.via`) and follows the path in, unless the walker is already inside the same hull as the
home. Mushroom's hop from the front is unchanged (he is inside the hull by then).

- **P5** (1 edit): (FPS work): a creature near the garden's stone ring fits its height to the stones by transforming
every sixth vertex of every mesh it has (`gfS`), every frame while it moves and every fourth frame
while it stands. During the Event several creatures move there at once and this was the largest
game-logic cost in the profile. Now every second frame while moving and every eighth while standing:
a one-frame lag in a smoothed height, not visible at 72 Hz.

- **P6** (1 edit): (FPS work, the author: "creatures on screen"): the game patches every three.js material
constructor to default to DoubleSide, so the whole world (609k of 659k source triangles) rendered
without back-face culling, and on a tiled mobile GPU every back face costs binning and
rasterisation. Back faces of a closed, outward-wound mesh are never seen, so before an object tree
is batched, every mesh's geometry is classified once (closed: every edge shared by exactly two
triangles after merging coincident vertices; outward: positive signed volume) and a material whose
meshes are all closed and outward is set to FrontSide; a material with any open or transparent user
stays DoubleSide, and one flipped earlier is flipped back if a later tree uses it on an open mesh.
Pixel-identical by construction; `tools/sides_check.js` renders the town with the flips on and off
and compares. Cost: one pass over each geometry at build time, cached on the geometry.

- **P6** (1 edit): continued: the batch material clone carries the flag, so tools can tell P6's flips apart from
materials that were single-sided to begin with.

- **P7** (1 edit): (diagnostics, the author cannot measure much right now): every ten seconds in VR the game posts
one line to logcat (`page: m=perf ...`): frame rate from the governor's frame-time average, the
governor level, draw calls and triangles of the last frame, whether the planting Event is running,
and where the player stands. A headset run then documents its own frame rate: `adb logcat -s
GreeblisServer | grep perf`.

- **P8** (1 edit): (draw calls; NOTES 59): a multi-material mesh costs one draw per geometry group, per eye. The
garden plots (one at load, thirteen more in the planting Event) are boxes whose five sides share one
material instance and whose top carries the soil texture: six draws each where two do. Before each
frame's culling pass, a multi-material mesh whose groups repeat a material instance gets a copy of
its geometry with the index reordered so each instance's triangles are contiguous, one group per
instance (same triangles, same attributes, opaque only). The copy is cached per geometry and sharing
pattern. Every frame the mesh's material slots are compared by identity with the ones the copy was
made for; any change (a slot swapped, the geometry replaced or its index edited) puts the original
geometry back before the frame is drawn. Nothing visible changes; `window.__gtMM.set(false)` turns
it off.

- **P9** (11 edits): (draw calls; NOTES 60): the batcher merged only parts whose materials agree on everything but
colour (the colour travels per part); two Phong parts with different shininess or specular colour
needed two batches. Each part now carries a fifth uniform row: its specular colour, and its
shininess in the colour row's spare slot, written exactly as three.js would upload them (specular as
is, shininess at least 1e-4) and read by the batch shader in place of the material's own uniforms (a
flat varying, so the value is the part's own, not interpolated). Shininess and specular leave the
grouping key. The part limit per batch is recomputed for five rows (32 on a Quest). Whole scene: 327
batchable draws per eye -> 247. Pixels identical batched against unbatched (`opt_identity.js`).

- **P10** (6 edits): (vertex work; NOTES 62): many of the town's and the creatures' meshes are non-indexed (three
vertices per triangle, none shared), so the GPU runs the vertex shader three times per triangle and
cannot reuse a transformed vertex; a tiled GPU runs the position part again for binning. The batcher
now merges bit-identical vertices within each part while it builds a batch (position, normal, colour
and uv all equal, compared as raw bits; never across parts). Same triangles in the same order, same
values at every corner: nothing visible changes. The game's own geometry is untouched (only the
batch's copy is indexed), so code that edits a mesh's vertices keeps the layout it expects. Whole
scene: 829,776 vertex runs in batches -> 207,969.

- **P12** (3 edits): (vertex work; NOTES 63): the scenery merge (`io` over every static town mesh while loading)
builds each merged mesh non-indexed (it converts its inputs with toNonIndexed), so the kiosks, roofs
and the garden bed run the vertex shader three times per triangle. For the scenery merge only, the
merged geometry is now indexed where it is built: bit-identical vertices (position, normal, colour,
uv) share one index. Same triangles in the same order, same values at every corner. Creature and
pickup merges are left as they are (the creature ground-fit scan samples every sixth vertex of a
creature's arrays and must see the same samples). The batcher's 4,000-vertex cap reads the merged
mesh's original vertex count, so what is batched does not change.

- **P12** (3 edits): continued: the building merge (`v`) and the kiosk bin merge (`mergeBin`) build the biggest non-
indexed meshes (kiosk bodies, roofs, the garden bed); their output is indexed the same way. Nothing
edits these geometries after they are built (the vertex-editing code in the game works only on
meshes marked keep, which never pass through these merges).

- **P13** (1 edit): (Event CPU; NOTES 64): while the tentacled creature dances (the planting Event), `bend`
recomputes every tentacle vertex each frame with three to five sines and cosines per vertex. Those
terms depend only on the vertex's distance along the tentacle, which the ten vertices of a ring
share (the tube is built ring by ring); they are now computed once per ring and reused while the
input is bit-identical, and the results are written straight into the arrays (setXYZ does the same
store). Same arithmetic on the same inputs: bit-identical output (`test_bend_exact.js` runs both
versions and compares the arrays).

- **L1** (1 edit): (the author: "I want the game file to be CC0 1.0"): a notice right after the charset tag. The
author's own work in the file is dedicated under CC0 1.0; the bundled three.js stays under its MIT
license, whose copyright and permission notice must travel with every copy (it had been missing).
Full texts: tools/LICENSE.md. A comment only: nothing the page does changes.

- **D1** (1 edit): (tool hardening; the author tests on a Quest 3S, the game must also run on a Quest 2): the perf
line names the headset model (from the user agent, e.g. dev=Quest_3S), so tools/perf_log.js can
judge each device separately.

- **B27** (2 edits): (multiview_check, 2 runs in 7): the Gem that the Speech assembles from the three Artifacts has a
flat-shaded, transparent Phong material that the game creates the first time the Gem is built, so no
loading warm-up ever saw it and its shader compiled in the middle of the Speech (a 50-1,000 ms stall
on a headset). The Artifact module gains a `warm()` that builds the three Gem pieces and one glue
drop (the same cached geometry and materials the Speech uses), and the effects warm-up adds them out
of sight (y = -60), compiles the scene and takes them out again. The Speech draws the Gem under
Sparkakus's light bulb, whose point light changes the shader, so the scene is compiled a second time
with the bulb's light on (`Bulb.warm()`, as the warm-up already does for everything else; 3.15.39,
after the check caught the second variant). Nothing is drawn differently; the Speech then reuses the
compiled programs.

- (2 edits) F-B31 (the author: "Lets push both experiments into the main build"; 3.15.43, NOTES 83): the flash
experiments become the release. 1. No layer swap: every quality level and the emergency step keep
the native render scale (1), so the governor only changes foveation, on the same layer; the Event's
own scale steps (P16, P17: 2-3 fps, and the 3S took the Quest 3's branch because its browser calls
itself "Quest 3") and P18 (which ended an emergency drop with the Event) go with them (the author:
"Lets get rid of it and close out that option"). In town the governor no longer renders above native
scale (1.2, 1.1) when it has headroom. 2. No texture upload inside an XR frame (NOTES 80): during multiview play a texture marked for
upload is held back (three.js keeps drawing its old content for that frame) and uploaded in a task
right after the frame is submitted; for that one frame an object whose texture was never uploaded is
skipped instead of drawn without it. The VR panels (battle, dialogue, menu, wrist HUD) paint into
the next of three canvases; a panel keeps its last uploaded canvas and swaps to the new one once
that is uploaded (the deferupload build's flicker on quick presses, NOTES 81). Since F-B29/F-B30 no
texture is made during play, so the log line for one made for the first time should never appear.

- **P19** (3 edits): (found by tools/warm_coverage.js; the author chose this fix): the number of point lights is part
of every lit shader's key, and the warm-up compiles the town with no point light, with the Portal's
and with the bulb's, but not with both. Both could be on together: the Portal glows from the pizza
call until the courier has gone back through (a minute or more) and Sparkakus's bulb lights the
Speech, 16 m away; dozens of shaders would then compile mid-Speech, a stall of seconds on a Quest.
While the bulb is lit the Portal's light is held off (its glowing doorway still shows; only its
faint blue light on the surroundings goes for those seconds), from both sides so no frame has both:
the Portal's own update and the bulb's.

- **P20** (5 edits): (draw calls in the Event; nothing drawn differently, NOTES 82): the pizza the Event lays out
(eight stacks of one to three boxes round the garden, and the pie Anomalee serves: its box, lid and
eight slices of four parts each) is built after the batcher ran, so every part was its own draw: 56
of the 388 draws of the heaviest Event view (the headset's lowest readings, at (-21, -5)). Each
stacked box (one mesh, the card colour on five faces and the printed lid on the top) becomes two
meshes, the five faces and the top, with the same vertices and the same triangles in the order P8
already draws them; then both groups go through the batcher as the garden's plants do. The pizza is
also built once during the warm-up (out of sight, and cleared before play), so its printed lid
texture is made and uploaded while loading instead of the moment the Event starts (the noswap run's
flash at the Event start came with one new texture: this one), and its batch shaders are compiled
there. `__gtPZ.set(false)` puts the original boxes back for opt_identity.js.

- (3 edits) F-B29 (flashes; the author: "no emotes need to be random colors. It would be better to standardize
them", NOTES 82): an emote (the glyph that floats over a character) is a 64x64 canvas texture per
glyph and colour, made the first time that pair shows. Most callers pick the colour at random (seven
for a chat or a dance battle's hit, five for a new plant), so new textures were made and uploaded in
the middle of play exactly where the author saw flashes: dance battles, speaking to Nextessa,
planting. Each glyph now has one colour (the one it used most): heart pink, note lime, flower, "!",
star and sparkle yellow, "?" teal, the rest white. Every glyph's texture is made during the loading
warm-up, so none is made during play.

- (1 edit) F-B30 (flashes, NOTES 82): the other textures the game made during play, each the first time it was
needed, now made once during the loading warm-up and kept: the printed lid of the pizza Nextessa
carries (made anew at every phone call, the moment she comes through the Portal), Montgummery's
screen faces (nine: idle, talking twice, robot dance twice, shovel, rock, paper, scissors; each made
the first time he showed it), and the speech bubbles of the townsfolk's text chats (two new textures
per chat, thrown away after it). A bubble's texture now comes from a pool, one per speaker and
bubble height, made at load and redrawn for each line: the same canvas size and drawing, so the same
pixels; redrawing a texture that exists is what the dialogue box does all the time. The entity
clean-up keeps textures marked to keep. Checked by tools/texture_census.js.

- **P21** (1 edit): (draw calls; nothing drawn differently, NOTES 84): the Ancient (15 parts, 11.5k triangles) lives
in the church, which has no door and a closed interior; it was drawn whenever the church was in
view, from anywhere in the town. While a frame renders with the camera at least 0.5 m outside the
church (its collision outline) and the Ancient inside it, the Ancient's body is left out; it is put
back right after the render, so loading-time shader compiles, picking and everything else still see
it. Proof: from 17,045 views at least 0.5 m outside (a 1 m grid to 30 m, five eye heights 0.5-2.8 m,
aimed at it), rendered with and without it with only the church drawn, 3 views from about 30 m
showed one pixel (a seam between the interior walls), and none of those 3 with the whole town drawn.
The margin covers the camera's near plane and a frame of head movement. `__gtAnc.set(false)` turns
it off for opt_identity.js.

- **P22** (11 edits): (draw calls; the author asked for this prototype, NOTES 85): the author marked Gooward's
translucent parts for merging (`userData.mergeTr`: the 20 bubbles in his goo, the three crystals of
each wing) but nothing ever merged them, so each was its own draw (26 of the Event's heaviest view).
Parts with the mark that share a parent and a material become one mesh (their geometry placed by
their own transforms, which never change; the parent's animation moves them as before). Translucent
objects are drawn far to near, one by one; the merged mesh keeps that: before it is drawn it orders
its parts far to near from the camera by their origins, as three.js orders separate objects,
rewriting its index only when the order changes. What differs: the merged parts are ordered as one
block against other translucent objects (a bubble seen through a wing crystal). `__gtMT.set(false)`
restores the parts.

- **R1** (3.15.44; the author: the game must always be rebuildable from the game file, and "we should cut as much
randomness as possible", RULES.md 2 and 5; NOTES 88): painted textures are seeded. 25 of the game's texture painters
call `Math.random` (grain, speckles, bark, grass, stars and the like), so each launch painted them slightly
differently, and the pre-painted copies in the APK's `tex/` were one launch's dice rolls that no rebuild could
reproduce. Now the texture maker `b()` gives each painter call its own generator: `Math.random` is swapped, for that
call only, for a fixed sequence (Park-Miller, 16807 mod 2^31-1) seeded from the texture's size, the painter's own
source text and how many times that painter has run before. The same painter, called in the same order, paints the
same pixels on every launch and in every rebuild; editing a painter changes its seed, as it changes its `tex/` key.
Randomness everywhere else (spawns, wandering, chats, the UFO) is untouched. What differs: each texture's grain is a
different (fixed) roll than any one earlier launch's; its look, density and colours are unchanged. Proven by
`test_standalone.js`: all 132 textures in the rebuilt `tex/` match the game's own painting pixel for pixel.

- **R2** (3.15.45; the author: "please apply Minification to the current game file, as much as possible", full
minification, and "The uncompressed version of the game should be minified but not compressed", RULES.md 19; NOTES
89): the whole game file minified with terser (`tools/minify_game.js`): every script compressed in two safe passes
and its local names shortened, comments and the whitespace between the HTML's tags removed, repeated until a run
changes nothing. 1,117,373 to 1,054,617 characters (5.6%). Kept: the license notice (the author's CC0 dedication and
three.js's MIT notice), class names, the names the test harness and tools read in the game's scope, and functions
used once stay functions (`bend` is tested on its own). Proven by `minify_identity.js`: booted with randomness and the
clock fixed, the minified game builds the same world as 3.15.44, all 2,319 objects (transforms, geometry, materials,
textures) bit for bit; `test_bend_exact.js` still matches the original's 400 outputs. What differs: the painters'
seeded grain (FIXES R1 seeds from the painter's source text, which minification changes), so every textured surface
has a new fixed roll of the same grain; `tex/` was rebuilt. Local names in the game file are now the minifier's: the
code names quoted in the entries above are those of the unminified file (git history before 3.15.45).

- **R3** (3.15.46; the author: "the in-code License notice should not reference the repo or other files", RULES.md
21): the license comment at the top of the game file no longer ends its CC0 dedication with a pointer to the
repository's license file; it keeps the dedication with the license's public address and three.js's full MIT notice.
A comment only: nothing the page does changes.

- **F-B32** (3.15.46; flashes, the rule that no texture is made during play, RULES.md 9): the soft glow behind an item
tossed in a townsfolk text exchange (goo, a card, a tile, a coin) was painted the first time a vignette tossed one,
mid-play; F-B30 had missed it because only some exchanges toss items. Now it is painted while loading and handed to
the loading warm-up's upload list (`__gtPreTex`, marked to keep) like Montgummery's faces. Same canvas, same drawing:
nothing drawn differently. Found by the 3.15.45 standard pass (`texture_census.js`).

- **F-B33** (3.15.47; the author: "when the Event is activated for the first time, it's possible that some quick flash
happens at that moment"): a hitch at the moment the Event starts. Starting the Event clears the cached ground-fit
footprint of every participant, every stationary creature and the player and computes them all again in that one
frame; the expensive part, scanning each body part's vertices for its extreme points along a fixed set of directions, depends
only on the geometry, which has not changed. The scan is now cached per vertex buffer (and done again only if the
buffer's version changes) and done for every creature while loading; what depends on the pose at the start (the
parts' heights and the resting low point) is still computed at the start, as before. Headless, the Event's activation
took 434 ms, now 67 ms. Proof: at the Event start, all 702 cached parts of the 14 footprints equal a fresh scan bit for
bit, so every creature stands exactly as before. `event_start_check.js` (standard tier) also checks the Event's first
start for the known flash causes inside a frame (none were found: no texture, framebuffer or pixel work, no shader
compile, no layer swap).

- **P23** (3.15.47; T16, the Event's frame rate; the author: performance "still required to pass submission", "push
changes right to the main build"; NOTES 90): the batcher takes scenery parts up to 60,000 vertices instead of 4,000,
so the large garden and park meshes that share a material join batches. Headless, on the author's path from the ring
back to the dance floor (6 points, 8 headings, headset field of view, multiview): 144 -> 134 draws a view on average,
heaviest 402 -> 380, for 290k -> 318k triangles (+10%: a batch is drawn whole when any of its parts is in view). The
Event has followed draw calls on the headset (NOTES 79); the author's run of this build says whether the trade pays.
Batching draws the same triangles with the same materials (`opt_identity.js` proves batched against unbatched pixels).

- **F-B34** (3.15.48; flashes: the author saw them "before the Event and outside of Dance battles", "possibly related to
NPC vignettes or emotes, or random"; NOTES 91): Gooward's gallery mural (4096x1544, in three strips) is painted by a
background worker after the boot, which takes minutes; each strip then replaced its placeholder texture and was
uploaded (about 8 MB) the first time it was drawn, inside an XR frame, at a moment that varied from session to
session. Now the APK carries the mural's strips pre-painted in `tex/` (the mural painter seeds itself, so they are
exactly what the worker paints; keyed by the painter's source) and swaps them in while loading; without `tex/` (the
game file alone, the compressed version) the worker still paints them and each strip is uploaded the moment it
arrives, between frames. `prerender_textures.js` and `test_standalone.js` wait for the worker's strips.

- **F-B35** (3.15.48; flashes, RULES.md 9; NOTES 91): a texture's GPU storage was made the first time it was drawn, inside
that frame: the library's book covers, signs and labels first seen in play, the UI panels' second and third
canvases, and the Speech's glue-bottle label (painted the first time the Speech ran). Now the loading warm-up uploads
every texture in the scene (hidden objects included) and every texture the texture maker painted, the panels upload
their canvases when they are built (at the VR entry, outside any frame), and the glue label is made and uploaded by
the Gem's pre-warm. The same textures and pixels; only the upload moves to loading.

- **P24** (3.15.48; T16, the Event's frame rate; the author's 3.15.47 log: the Event is CPU-bound, the GPU at 9.3 of
13.9 ms; NOTES 91): the creatures are batched together instead of each with itself (one batching pass over all of
them). At the author's low spots (-24, -2) and (-25, 12), 8 headings each: heaviest views 296 -> 274 draws for +0.6%
triangles (the Event gathers the creatures together). Batching draws the same triangles with the same materials.

- **D2** (3.15.48; the author: "does the press B when flashes occur no longer work?"; NOTES 91): diagnostics in the
release log (they were only in the `flashlog` diagnostic build): B on the right controller writes "MARK flash seen"
with a short buzz; frames over 28 ms are logged (at most two a second); a shader compiled during play names the key
fields that differ from the closest program of its kind (the key was cut after 40 characters); XR frames are numbered
for the marks.

- **F-B36** (3.15.49; flashes and the first seconds in VR; found by the frame-hazard watch in `test_lod.js`; NOTES 92):
2.6 s after entering VR the game switches every texture to mipmaps and 4x anisotropy (sharper at a distance) and
marked all of them (195, a 2048x2048 one among them) to be uploaded again. On the headset's path (multiview) the
upload hook did all of them in one go between two frames: one long stall, every mipmap made at once. On the classic
path (the fallback) each one was uploaded the first time it came into view after that, inside the frame (172 still
waiting 9 s after entering VR in a headless run). Now the switch goes through the textures in slices of at most
0.6 million pixels, 40 ms apart, each texture uploaded right after its switch (19 slices, done in about 1 s; the log
says "mipmaps on: N textures re-uploaded between frames"). Also: the comfort vignette's texture is uploaded when it is
made (it had waited for the first move), and on the classic path the textures changed since the last frame (panel
text) are uploaded before the frame draws, as multiview already did. The same settings on every texture once done
(all 195 compared), so the same pixels.

- **P25** (3.15.50; T16; the author: "FPS dropped below 60 fps while Backpacka was present", "Please optimize his model for
performance"; NOTES 93): Backpacka was never batched. He is built hidden by his module's pre-warm, after the loading
step that batches everything in the scene, so his 96 parts were drawn one by one for his whole show. Now his builder
hands him to the batcher as the garden plants already were: 94 of 96 parts in 11 batches. About 83 fewer draws a frame
while he is in view on the headset (each eye path drew 169 fewer headless: 714 -> 545 at the author's low spot,
the Event's draws back to what they are before he arrives). Proof: the batcher on/off in the same frame, 28 views
orbiting him at seven moments of his show: at most 0.01% of pixels differ, none in areas (3.15.49 gives 0.008%: noise).
His geometry never changes while he plays (checked over his whole show), so a batch copy of it stays exact.

- **F-B37** (3.15.50; the author: "give Backpacka basic collision so that the user cannot move inside of her model",
"collision should not impact her drinking from the pond animations", "The lack of collision is only an issue while he
is drinking from the pond"): while he is down at the pond (his show's 16-40 s) the player is kept out of him by
circles that only the player's movement checks (`uo.pc`): one round his four feet, two along his body (scaled with
him, he swells as he drinks), one on each neck segment and his head. Each counts once its part comes below head
height (1.9 m) and grows as the part comes down, so a landing nudges the player aside instead of a jump. His pose comes
from his show's clock alone; the circles never move him or any townsperson. `test_backpacka.js` (standard tier).

- **R4** (3.15.51; the author, on the randomness decision list: "8. Let's remove this."; RANDOMNESS.md c11, RULES.md 5):
seven random colour picks that had no effect are gone: the sparkle burst's, the talk emote's, the two at the end of an
Event chat, a vignette's opening emote, the dance battle's winning note and the pickup's glyph. Since F-B29 an emote is
coloured by its glyph and the colour it was handed was dropped, so every emote looks exactly as before; the unused
colour list went with them. The same decision list closed two items as intended, with no change: flint pickups keep a
random facing ("9. Close out as intended") and the UFO's flight path stays as it is ("The UFO's path is currently fine
the way it is. Mark as intended.").

- **R5** (3.15.51; the author, on the recommended seeding list: "1 to 7: seed"; RANDOMNESS.md, RULES.md 5): seven kinds
of decoration and idle motion are now the same on every launch instead of new each time, still varied within a launch:
the 700 night-sky stars, the 7 clouds (puffs, sizes, orbits, heights, drift speeds), when each townsperson blinks
(first blink and the gaps after it, Mama Gorbo's own timer too), the idle sway phases of Anomalee, Hennrick,
Fortizmo, Montgummery and Nextessa, when Anomalee's screen glitches (the shake during a glitch stays random), her
jaw's chomps, and the townsfolk's sway in the Event ring. Each draws from its own named stream (`gcRnd(name)`: a
Park-Miller generator like the UFO's, seeded from the name), so nothing else that happens can shift it. Checked:
two launches build the same stars and clouds; the census drops from 120 `Math.random` sites to 81, the rest being the
ones that stay random.

- **R6** (3.15.52; the author: "a random 80% chance of working makes sense for the Bow Out button"; RANDOMNESS.md,
RULES.md 5): in a dance battle (Glyph, Etcher, Montgummery) the player's BOW OUT now works 80% of the time instead of
70%; otherwise, as before, "The beat won't let you go!" and the battle goes on. The dancers' moves stay random (the
author: "For the Dancer's moves: what they pick should always be random").

- **F-B38** (3.15.53; the author: "When I interact with Shy Zollod, after previously speaking to another NPC, I very
quickly see an interact menu with 3 options flash on screen before his normal 2 option menu appears"; "The same issue
occurs with other NPCs after you've given your last Blossom"; BUGS B40): the XR interaction menu is one panel whose
picture is painted into the next of its three canvases; on the headset's multiview path the new picture reaches the
panel only after the frame (F-B31). The menu was made visible the moment it opened, so for a frame it showed the last
menu it had drawn, already resized for the new one. Now opening a menu holds it hidden until its own picture is on the
panel (on the classic path that is the same frame, on multiview the next one); hover changes on an open menu are
unaffected. `test_menu.js` (new, standard tier) reproduces the author's case on the multiview path: 3.15.52 showed the
previous picture for one frame in both cases, the fix none (two runs).

- **F-B39** (3.15.53; the author: "another must fix issue, Mushroom was observed getting stuck again", "he started getting
stuck before I moved there"; then "add a small ramp for him on the side of his desk. Instead of jumping, it'll be funny
for him to move up a small ramp to climb it", "push Mushroom's desk all the way to the right and then add the ramp on
the left side", "he should be on top of the desk"; BUGS B41): Mushroom no longer hops onto his desk. The Sheriff
kiosk's counter now runs from the right wall (kiosk-local x 2.86) to x -1.09 and a wooden ramp (#c8a070, 0.91 m wide,
2.55 m long with five cleats and a landing at desk height) climbs from the ground in front of the kiosk to its left
end; the stools moved with it. His height comes from the surface under him (`gcRY`: ramp, desk top 1.545 m or ground,
at most 4 m/s; never more than 0.25 m up in one go unless within 1 m of home, so he cannot rise through the counter).
Collision: the ramp is passable on its centre line and the counter only above 1 m, and the space behind the counter is
sealed. Every way home goes by the ramp: the post pattern, goHome, the routes (`Ve`) and the stuck re-plan (`De`) take
his via whenever he is below the desk top. If he is ever below the desk top inside the back of the kiosk for 2 s
(not reachable on foot), he is put back on his desk with a sparkle. Shown to the author in pictures before the build.
`test_npc_home.js` (17 starts, frame anchored on the kiosk: all home), a 15-start sweep (all home, never inside the
desk), `test_visits.js` (all six scenarios, host and visitor).

- **F-B40** (3.15.53; the author: "1 quick full screen flash was observed while moving around", "I only saw 1 quick
flash at the start of my run this time"; the 3.15.52 log with the B mark at 11.8 s; BUGS B42): the mipmaps that F-B36
spread over slices in the first seconds in VR (11.0-11.95 s in the log) are now made while loading: every texture gets
its mipmaps before the first frame (182 of 182 headless), the slices find nothing left to do, and no texture is
uploaded again during play. The loading warm-ups that upload textures (pizza, plants) run after it.

- **F-B41** (3.15.53; the author's 3.15.52 log, BUGS B39): two shader programs the log showed compiled during play
are now made while loading. The controller rays' line material (compiled at VR entry, a 92 ms frame): a hidden copy of
the ray is compiled with the rest of the scene; `test_menu.js` draws the rays and checks no program is made. The
Event's plants (a Lambert program with a map, compiled the instant the Event started on the headset, not reproduced
headless): a full set of plants is built below the ground and compiled while loading, then removed.

- **A1** (3.15.53; the author: "can we please add a short delay for snap turning, if the user attempts to snap turn too
quickly after previously snap turning? For comfort, performance, and stability"): a snap turn within 0.3 s of the
previous one is ignored (`snapGap`); as before, the stick must come back to centre between turns. `test_input.js`.

- **A2** (3.15.53; the author: "New additional non-Event Talk line for Gemtoe"): Gemtoe's talk lines gain "I’m selling
digital plots out here in the Greeblis-verse!" (LORE.md).

- **A3** (3.15.53; the author: "slightly increase the frequency of visitors to the Ancient while the user is inside the
Cave (the inside of the church). Rates should return to normal after the user exits the Cave"): while the player is in
the Cave, 1 try in 10 of the visit scheduler considers only the Ancient's visits (the other tries are as before: the
Ancient's visits may be picked on 32% of tries in the Cave, 12.5% outside). Whether the player is in the Cave is now
checked at each try; it was a flag refreshed only while some vignette played, so the Cave rate could start late and
stay on after the player left. Measured with the clock run 4 times fast, 48 game minutes each (with F-B42): 0.23
visits to the Ancient a game minute outside the Cave, 0.23 in it without the new tries, 0.29 with them (about 27% more:
one every 3.4 game minutes instead of 4.4). `test_cave.js` (standard tier; forces the scheduler's draw; fails on
3.15.52).

- **F-B42** (3.15.53; found while measuring A3; NOTES 94): visits could stall for long stretches early in the game. The
scheduler picked Sparkakus as a visitor before the player had the Gem or the Stone, which the visit plan refuses; his
pairs score best because he never visits, so the same refused pick came back every 4 s. He is now left out of the pick
until then, as Shy Zollod already was before the book.

- **A4** (3.15.54; the author, on a 45 m fog shown in pictures: "too aggressive", "the fog seems to cover the church
which is also still reachable"; then "Would it be possible to apply [it] only to the fence and to have it fade in
(while hidden objects fade out)? I'd want an actual effect that appears like fog moving in and not just a filter
applied", "trees inside the fence and the church inside the fence should not be hidden by fog"; pictures shown, then
"Push these changes directly to the main build"): during the Event a bank of mist rolls in from far out and settles
just outside the town fence (the rectangle x -37.6..37.6, z -37.6..49.6; the player's reachable area ends inside it).
Four bands 1.5, 5, 10 and 16 m outside the fence, 22-34 m tall, drift sideways at different speeds (two samples of
one soft-blob texture each); dense at the ground, thinning upwards. It comes in over 6 s from 1.6 times the fence's
size, and rolls back out over 6 s when the Event ends; its colour is the scene's fog colour. Everything inside the
fence is untouched. Made while loading: the texture is painted from its own seeded stream (`gcRnd("mist")`) and
uploaded, and its one shader program (`gcMist`) is compiled with the scene. 4 draws while it shows, none otherwise.
The scene's regular fog is unchanged.

- **A5** (3.15.54; the author: "For the clouds and anything else hidden during the Event: everything hidden must fade
out at the start of the Event and then fade in at the end of the Event. Nothing should ever appear to pop out or pop
in"; "Blossoms and Flint should fade out at the start of the Event and then fade in at the end", "Pickups should also
fade out for the Event. Not shrink out"): what the Event hides now fades. The clouds (and anything else the Event's
safeguard hides: objects beyond 26 m of the centre, smaller than 60 m) fade their opacity to 0 over 2.5 s and only
then hide, and at the end show at 0 and fade back in; an object that shares a material with something still visible
is left visible rather than faded. Every Blossom and Flint (before: only those within 12 m of the centre, which popped)
fades out over 2.5 s through a per-instance opacity that now covers all of their instanced parts, and back in at the
end; while any is fading their materials are drawn as transparent. Goo splats and blobs are left alone: they last a
second or two and fade on their own.

- **A6** (3.15.54; the author: "Please also add logic that prevents the UFO from appearing during the Event", "The UFO
leaving by its normal exit path is what's intended"): as before no UFO starts during the Event; one already flying
when it starts no longer vanishes on the spot but goes straight into its exit path from where it is (it climbs away
and is switched off far out, about 250 m).

- **A7** (3.15.54; the author: "Have Backpacka fly into the fog before popping out at the end of the Event, instead of
having his pop out in the sky", "It's ok to extend Backpacka's outro"): his way out ends low and deep in the mist,
at (-62, 5, 72), past the fence's north-west corner, instead of 40 m up in open sky; his outro is 4 s longer (him
show 84 -> 88 s). He crosses the fence about 9 m up at his show's 82 s, is hidden by the mist within a second or so,
and is switched off at 88 s inside it. Pictures shown to the author.

- **F-B43** (3.15.54; the author: "If the user starts a subsequent Event: let's have the Garden Flowers shrink out at
the start of the Event and then grow back in as normal during the Event. This change will fix the issue of creatures
clipping into the flowers during their planting in subsequent Events"): flowers are planted in the first Event only;
in a later one the townsfolk planted into the grown flowers. Now, when a later Event starts, the garden's flowers
shrink away over 1.2 s and grow back the usual way once Backpacka waters them (or after the Event, if it ends first).

- **P26** (3.15.54; the author: "Im assuming that hiding pickups will at least improve FPS a little"): the pickups
are drawn as instances (one draw per part for all of them); a hidden pickup was a zero-scale instance, still drawn.
When no pickup is showing, each instanced draw is now switched off, so the Event draws none of them.

- **R7** (3.15.54; the author: "Please also move the Compressed game file into root", "Rule: keep all copies of the game
file updated at all times"; RULES.md 11, 20, 24): the compressed version is `index.compressed.html` at the repository
root (moved from `tools/`). `sync_game.py` now updates every copy after an edit: `index.html`, the APK's asset, and the
compressed version (rebuilt); `--check` checks all three.

- **F-B44** (3.15.55; found by the 3.15.54 full pass, frame-hazard watch in `texture_census.js`; NOTES 96): two
shader programs were compiled inside XR frames during the Event in the census's sequence (shop, battle, Nextessa's
pizza, the Speech, then the Event): a Lambert material with a map at the garden's centre, its key differing from the
warmed one only in `numPointLights` (0 -> 1). Loading compiles the scene once with the portal's light on and once
with the Bulb's, but before the Event's plants and pizza are built for their warm-ups, so those were never compiled
lit. The pizza warm-up (plants still in the scene) now also compiles with the portal light, with portal and Bulb
lights together, and with the Bulb's alone (3.15.55). That was not enough: the census on 3.15.55 still compiled two
programs whose keys equalled ones made by those warm-ups, because three.js deletes a program as soon as no material
uses it, and every material went back to its unlit program when the light went off. Since 3.15.56 each program first
made in those lit warm-ups is pinned (one extra use count) so it stays in the cache for the moment the light is on in
play. The census's Speech had been cut short by its real-time limit (the Speech takes 18 game s, about 110 s of
headless real time), leaving the Bulb lit into the Event; it now gets 900 s.

- **F-B44, completed** (3.15.57; the author's 3.15.56 headset log, c8e2109f): the Event still compiled two Lambert
programs at its start on the headset (`numPointLights` 1 -> 0). Pinning only the programs the lit warm-ups made let
three.js release the unlit programs those materials had before. Every program in the cache is now pinned at the pizza
warm-up as well, so none is released while loading.

- **F-B45** (3.15.57; the author: "If Nextessa arrives during the Gem animation, she'll continue to walk against the
player, and she will jitter in position when the user moves. She should pause ... after coming through the Portal if
the Gem animation is ongoing"): while the Gem assembles (`Bulb.hold`) and she is through the Portal, Nextessa stands
where she is and turns to face the player; she walks up and hands over the pizza once the Speech is over.
`test_courier_gem.js` (on 3.15.56: moved 11.3 m, walking in 45 of 157 samples; now 0 m, never walking).

- **F-B46** (3.15.57; the author: "After returning from a visit: Mushroom left again but [he] appeared to jump into his
desk and then was pulled to the side of his kiosk. He should never fall inside of his desk. Can we give the desk solid
collision and make it wider? Also he should never be jumping now that he has the ramp"): when he set out on a visit,
the visitor's desk-hop animation (meant for townsfolk who stand on a raised spot) lowered him straight through the
desk to the ground; the host's hop already skipped him, the visitor's did not. Now neither does: he walks down the
ramp. His height follower (`gcRY`) no longer lets him rise more than 0.25 m or drop more than 0.3 m in one step
anywhere (the 1 m allowance by his home is gone): such a step is not taken, so the desk and the ramp's sides are solid
and he never steps off an edge; and at ground level the desk's front is 0.35 m deeper (wider) for him. Probe
(`mvisit`, back-to-back visits): on 3.15.56 4 jumps and 175 frames inside the desk in 6 visits; now none in 6 visits,
none in 4 with the player standing in front of the desk, none in 4 with the player at the ramp's foot.

- **A9** (3.15.57; the author: "The fog moves in and moves out too quickly. Let's extend the Event and give the fog
more time", "The fog is too bright to be comfortably looked at for users in VR", "if the user approaches the fence, the
fog effect appears to recede from the fence. This should never happen when the user moves closer to the fog, for any
object"; pictures shown): the mist bank rolls in and out over 15 s (was 6 s) and the Event's planting lasts 190 s (was
180 s); the bank is drawn at 80% of the fog colour (a soft grey). The bank was translucent, so what stood beyond it (the
lamp posts by the church, hills, houses) came clear as the player walked up to it. Now everything with fog is also
misted by where it stands, not by the viewer's distance: three.js's fog chunks carry the world position, and a surface
0-3 m beyond the fence (below the bank's top, 18-30 m) blends into the mist's colour as the mist rolls in
(`fogDensity` carries its strength, 0 outside the Event, so the town is unchanged then). Walking up to the fence shows
only the fence, a metre of ground and the mist (pictures by the church at 30, 20, 12, 7, 4 and 1 m).
`test_event_fade.js` checks the 15 s timing and that the scene's mist follows the bank and is 0 after the Event.

- **A10** (3.15.57; the author: "Please give Gemtoe a neck tie. no shirt, just a tie"; pictures shown, then "a little
too high", lowered): a tie on her bib, a knot under the bill and a pointed blade following the chest, in her gems'
purple with gold stripes (a canvas texture painted while loading).

- **F-B47** (3.15.57; the author: "examine the houses in the outside ring: On the sides of the houses, where the wall
meets the triangle of the roof, a slight flicker", "it's this area on all houses"; then "one more full pass looking for
any flickering"): two flat pieces in one plane that meet edge to edge are drawn as one surface only if the shared
edge has the same corners on both; the houses' gable triangles (a fan from a corner at the middle of their base) met
their walls' top edges at T-junctions, and the background showed through as a dotted line that sparkled. And the
triangles were narrower than their roofs, leaving a tapering sliver of dark roof underside. Every gable is now as
wide as its roof (its sloped edges on the roof), reaches 4 cm down over its wall and stands 1 cm proud of it (no gap
and no shared plane) on all five house builders and the church. The same seam test found and fixed: the church's
plinth (front and back blocks butted 1.6 cm lower against the side blocks; now 2 cm into them, faces 1 cm back), its
belfry and window arches (the cut-out reached the frame's bottom edge; it now starts 3 cm up), Gooward's mural (its
canvas in the plane of its frame, edge to edge; now 1 cm behind it and 4 cm taller, tucked behind the frame), the
juice bar's counter lip (ends flush with the counter top's; now 5 mm longer and 2 cm into it) and Mushroom's ramp
landing (top flush with the desk top, side flush with its front; now 1 cm lower and shorter). `test_seams.js` (new,
full tier) finds such T-junctions and checks each by rendering whether it can be seen from where the player can stand.

- **F-B48** (3.15.57; the author's flashes after leaving the Cave and right after loading on picking up a pickup, logs
2bd67b97 and 8e76b4aa): nothing the game watched for (shaders, textures, GPU work inside a frame) happened; but
three.js uploads a geometry's buffers the first time it is drawn, and loading drew only what the start view showed,
so walking to the first pickup uploaded 47 buffers inside headset frames, the Cave's inside about 240, the first goo
Gooward threw 8 (texture uploads inside the frame were the earlier flashes' cause, F-B26, F-B31). Every geometry in the
scene, hidden ones too, is now drawn once with a plain material into a 1x1 corner while loading (after the first
draw, with the Gem's pieces and the Event's pizza in place, at the end) and at VR entry (the controller rays), with
every render layer on, so the batcher's parked sources are uploaded too (3.15.58: the clouds' pieces, drawn on their
own when they fade at the Event's start, uploaded 4 buffers in its first frame): 204 -> 1207 geometries on the GPU
before the first headset frame. Gooward's goo blob and the goo splat on the view are
made while loading. The test harness's frame-hazard watch now also fails any buffer made inside a headset frame,
in every test.

- **F-B49** (3.15.57; the author: "The pizza box that Anomalee is eating from, in the center of the Garden during the
Event, is missing the Pizza logo from its lid", "ensure that Anomalee has a pizza in their pizza box during the Event
(Only when Pizza (snacks) has been completed)"): her box is an open one built apart from the others, its lid in plain
cardboard; the lid now carries the logo on its outside (3.15.57 put it on the inside face; the author: "The pizza logo
should be on the outside side of the lid"; 3.15.58 changed the lid's faces, but the box splitter (P20) replaces any
six-material box with its own split geometry, so the logo stayed inside; since 3.15.59 the logo is a panel of its own on the
lid's outer face). She ate a slice every 5 s, so the box was empty 40 s in; she
now eats one every 22 s and leaves the last two, so there is pizza in it for the whole Event. Without Snacks she plants
like everyone else and there is no box (as before; `test_anomalee.js` checks both).

- **F-B50** (3.15.58; found when a boot error skipped the pizza warm-up): the pizza box Nextessa carries painted its lid
with `PZ_CARRY`, a name the minifier had not kept (R2), so building the box threw unless the lid texture had already
been made by the pizza warm-up (it always was, so it never showed). It now names the painter itself.

- **D3** (3.15.57; the author: "let's try to make the logs more verbose so that we can track down these issues"): a
flight recorder in the headset log. Every frame keeps its time, draw calls, programs, textures, geometries and whether
the head is inside a character (the last 720 frames); pressing B (the flash mark) writes the slow frames, every change
of those counts and the head-inside moments of the last 10 s, with their times before the mark. An event trail logs,
with frame numbers, every change of Blossoms, Flint, Artifacts, the Cave, a vignette, the Event, the screen (playing,
dialogue, panel), the courier and the Gem; the XR session's focus changes (the system menu) are logged too; and any
geometry buffer made inside a headset frame is logged with its frame.

- **F-B51** (3.15.59; the author's full run on 3.15.58, log 7204dc64: one flash, B pressed 1.6 s after Nextessa's second
visit came into view): the loading warm-up (F-B48) puts every geometry that exists while loading on the GPU, but some
are made during play: Nextessa and her pizza box on every visit (4 new geometries a visit), the Event's plants (each
batched as it grows: a new 8,000-25,000-vertex batch), vignette and trade props, the Gem's parts. The log showed 26
headset frames making buffers (16 the frame before the mark). three.js now asks the game before it lists an object
to draw: inside a headset frame, an object whose geometry (vertices or indices) was never uploaded is held back for
that one frame and uploaded in a task right after the frame (as F-B31 does for textures); it appears one frame
(11-14 ms) later. Each geometry is held at most once. Headless, on the headset's path: Nextessa's visit and the
Event's first two minutes made 19 and 11 buffers inside frames on 3.15.58, none now (`test_firstdraw.js`, new,
standard tier). The log now says when something was held ("geometry held for one frame").

- **F-B52** (3.15.59; the author: "Major Bug: Mushroom was observed being stuck on his desk during the Event. He was
jittering and above the ramp part of his desk"): at the Event's start everyone walks straight to their spot; the
start skipped Mushroom's way down (his ramp) because it looked for a building holding both him and the ramp's top,
and his kiosk is not one; walking straight off the desk's side over the ramp, the step down was too big, so he was
held at the edge (jittering) or, before 3.15.59's step rule, dropped off the side. Now: he takes his ramp whenever
he starts on it (above ground); each ramp point is reached before the next (15 cm, not 70 cm, which cut the corner
onto the desk's edge); the Event no longer pulls his height down to the ground (his ramp sets it); when a step is
refused he slides along the kiosk instead of stopping, and one already off the surface may settle. The kiosk's
collision lets him walk the whole width of the widened ramp (it only allowed 30 cm either side of its centre).
`test_mushroom_event.js` (new, standard tier): down the ramp's middle, his height always the kiosk's surface, never
still, at his spot, home on his desk after.

- **A11** (3.15.59; the author: "let's increase the delay for snap turning slightly, to prevent possible issues"):
snap turns at least 0.4 s apart (0.3 s since A1). `test_input.js` reads the gap from the game.

- **A12** (3.15.59; the author: "The color of the fog now looks too dark to the eye"): the mist is 90% of the fog
colour (80% since A9), on the bank beyond the fence and on everything it covers.

- **A13** (3.15.59; the author: "make the ramp up to Mushroom's desk wide enough to fill that side of the kiosk"): the
ramp, its landing and slats run from the desk to the kiosk's side wall (1.77 m, was 0.91 m); his route runs down its
middle; the walkable surface and the solid part follow it.

- **P27** (3.15.60; the author: "The FPS still dropped below 60 fps when I moved to the back of the dance floor and
watched everyone during the Event. It is only slightly below 60 fps so let's try whatever little fixes we can"; their
run on 3.15.58: 56-59 fps for 12 s at (-33, -7), the runtime's CPU frame 12-14 ms of 13.9, the GPU 71% busy): each
plant the Event grows was handed to the batcher, which merged its two models (near and far, one shown at a time) into
a new one-plant batch of 8,000-25,000 vertices inside the frame: a full copy and vertex dedupe, a new geometry to
upload and two more parts in the batcher's pass every frame after, for no fewer draws (one plant, one draw either
way). The plants are now drawn as their own meshes: the same draws, no merge, nothing new to upload (the models are
shared per kind and made while loading, F-B41). Nothing on screen there is small enough to skip unseen: every one
of the 265 draws in the heaviest view spans two headset pixels or more (measured).

- **D4** (3.15.60; the author saw a flash after snap turning on 3.15.58, unmarked: "The B press was before that
flash"): the event trail also counts the snap turns (`ev snap N > N+1 (frame F)`), so a flash can be matched with the
turn before it. In that run's log every first draw inside a headset frame after the mark (the menu panel, the Event's
start and plants, vignettes) is one F-B51 now holds to between frames.

- **F-B53** (3.15.60; the author: "Mama Gorbo walking through scenery by the gallery", seen once; was B45, caught once in
`test_roam.js` at (25.2-25.9, 13-14.6)): the two meet near Gooward, who roams within 12 m of his gallery. When they are
more than 16 m apart she first walks over to a spot beside him; that spot was checked where it ends, but the walk
followed the building router only, which steers round buildings and collision circles, not the scenery's clearance
(the gallery's 6.2 m circle, the easels in front of it). From across the park her line could run between the easels.
Every other roam and meeting walk already checks its path (`roamWalk`); the walk-over now does too, and when the
straight line is not clear she follows the park grid's path round the scenery (`JGP.route`, as the courier does).
`test_meet_walk.js` (new, standard tier): her straight line to him through the gallery's circle, three layouts; on
3.15.59 two of them walked her through it, at the same spots; none now, and every meeting still happens.

- **F-B54** (3.15.62; was B44, "Tiny placeholder textures uploading mid-frame": the author asked to reproduce it or
close it; three standalone runs were clean and it was closed in 3.15.60, then the frame-hazard watch caught it again in
`test_cave.js` while the machine was loaded, in the normal served mode): the gallery mural stands in three 4x2 plain
textures until its painted strips arrive, then swaps them in and disposes of them. The mipmap switch after VR entry
(F-B36) marks every texture to upload again with mipmaps, a slice at a time between frames; a placeholder marked just
as its strip replaced it was left needing an upload, made when it was next drawn: inside a frame (a 4x2 upload and a
mipmap build). The placeholders are now uploaded while loading and never get mipmaps (they are one flat colour), so
the switch leaves them alone. Timing-dependent: not reproduced solo on either file (three runs each); the mechanism
is closed rather than the symptom.

- **P28** (3.15.60; the same request; the author: "Tiny visual changes are ok to reach 60 fps. Never below 60 fps is the
goal"): the frame's biggest CPU item in that view is three.js's matrix walk (every object's world matrix recomputed
every frame: the scene itself is set to update, so every child is forced), then the batcher's per-part pass over the
creatures. Characters more than 20 m from the player (not greeting, not in a dialogue) now pose and update their
matrices every other frame, half of them on even frames and half on odd ones; their movement still runs every frame,
and the skipped frame's time is carried into the next pose so nothing slows down. Far away they move at 36 poses a
second instead of 72. `test_jazz.js`, `test_meet.js`, `test_greet.js` and the Event tests pass. **Removed in 3.15.62**
(F-B56): the skipped frames left the Mushroom's pose (his inner body lifted to his desk height) applied while he was
far, so he floated above his desk and while walking.

- **A15** (3.15.60; the author: "Compressed should also work in Quest Browser. But also be able to work on ordiscan.com
or ordinals.com as an ordinal", "In browsers other than Quest: the game should inform the user that this game is
designed for Quest Browser and the file should be opened there"): outside the Quest Browser both the game file and the
compressed page now say "This game is designed for the Meta Quest Browser. Please open this file in the Quest Browser
on your Meta Quest headset." An explorer shows an HTML inscription in a sandboxed frame (ord's `/preview/<id>`:
scripts only, no storage, VR not allowed) as well as on its own page (`/content/<id>`, where it plays): in such a frame
the game still unpacks and boots, and when VR is refused it says "VR can't start inside this preview. Open this
inscription's full page in the Quest Browser to play." (it said "VR could not start (SecurityError). Click or press A
to try again.", which can never work there). The game keeps nothing in storage, so the frame's missing storage changes
nothing. `test_compressed.js` (the Ordinals check) adds the sandboxed frame.

- **A14** (3.15.60; the author: "Please add additional mushrooms to the roof of the Sheriff's kiosk"): five small
clusters (12 mushrooms) on the two slopes of the red tin roof, in the kiosk's own mushroom style, mostly tan, gold
and brown against the red; batched with the kiosk.

- **F-B55** (3.15.62; the author: "Fortizmo was also observed getting stuck while trying to move into the bar area",
"We'll need to fix Fortizmo's pathing", "ensure that the issue that caused Fortizmo to get stuck does not occur with
other NPCs as well"): four townsfolk have a doorway route home (Fortizmo's bar, the Mushroom's ramp, Gemtoe's gazebo,
Zollod's kiosk). The route planner, the stuck detector and the post walk added it whenever a townsfolk headed "home";
during a visit "home" is the visit's waypoint, outside. Setting out to visit Gooward, Fortizmo was routed back in
through her doorway, and with her home outside she collides with the whole bar as one block, so she pushed against
the counter until the visit timed out (30-130 s in headless runs of 3.15.60). The doorway route is now used only for
the townsfolk's real home inside (`gcViaIn`: inside the building of the route's inner end, on the Mushroom's desk, or
by Gemtoe's gazebo). The stuck detector also missed it (she jiggled, which counts as moving): a townsfolk that wants
to move and gets no 0.3 m closer to its target in 5 s is now treated as stuck (re-planned, then placed at its target
as before) and the log says "no progress". `test_stuck.js` (new, standard tier): 12 game minutes of play with visits
to and from the four forced every 30 s: on 3.15.60 Fortizmo stalled twice at the counter; none now. The bar's opening
is also wider (A17).

- **F-B56** (3.15.62; the author: "I just launched the game and Mushroom is floating high above his desk", "he is
floating as he moves to visit someone"): P28 removed (see P28). His inner body is back at its own height (0.046 m).

- **F-B57** (3.15.62; the author: "Mama Gorbo and Gooward jittered as they moved into position, in the Garden, to start
planting. They should be slightly above the ground and never appear to jitter", Etcher "had minor jitter when moving
over the rocks around the Garden", then "can we try just making the ground level? Flatten the ground of the Garden and
lower the ring of rocks into the ground", "make the superfluous Garden rocks and inner rings into ground textures"):
the Garden's six raised furrow rings, 48 stepping stones and ring of 72 rocks were objects the townsfolk climbed (the
height follower lifted each one over them, a few cm up and down every step). They are now painted on one overlay
over the soil (2048 px, painted while loading, seeded so it never changes), and the Garden is flat ground for
everyone (0.02 m): the follower's rock code is gone. The Event's flowers are planted at 0.015 m (were 0.05: 1.5-3 cm
above the flat soil), so every stem stands in the ground. Pictures before and after from above, standing and at
ground level. In the Event at headset field of view (`draw_calls.js --event`, 12 views): 113 to 111 draws and 321k to
311k triangles a frame on average, 173 to 165 draws and 452k to 414k triangles looking at the Garden from afar, and
about 120 fewer parts in the batcher's pass. The author, 2026-10-30: "regardless of anything else we will be keeping the flat version".

- **F-B58** (3.15.62; the author: "The goo around Mama Gorbo causes z-fighting while she is standing next to the pond.
This things should be on different layers"): her goo puddle sat at 0.030 m, the pond's grass rim's height, and her
three goo drops at 0.045-0.069 m (the pond's soil is at 0.070 m). The puddle and drops now follow the topmost ground
surface under them (sampled 5 times a second at her centre and 1.5 m round, eased): 1.5 cm above it, the drops 1.2
cm apart above that (on the park 0.030 m, on the pond's grass and soil 0.085 m; the pond's water at 0.113 m still
covers their edge).

- **F-B59** (3.15.62; the author: "Gemtoe's tie appears to be floating when she is viewed from the side", then "can the
feathers that poke through the tie be flattened ... Only those feathers and no others"): the tie hung 0.5 rad forward
from its knot, its tip about 0.25 m in front of her chest fur. It now hangs at 0.32 rad, along the fur's front, and the
chest feathers rooted within the tie's width lie flat against her (their random shapes and colours unchanged; every
other feather as it was). Pictures front, side and three-quarter. Gemtoe floats a little on purpose (the author).

- **F-B60** (3.15.62; the author: "flatten the ground in the area that NPCs stand and move in in the Cave. The rest of the
Cave should remain as is", "ensure that the entrance to the secret room (the Cave) is flat as well", "I noticed NPCs
feet slightly in the floor of the Cave", "Can we not lower the floor of the Cave instead?"): the Cave room (floor,
walls, pebbles, the Ancient) is 4.5 cm lower, its floor 5 mm above the town ground, so the entrance is level and
visitors' feet meet the floor (were up to 2.4 cm into it). Raised pebbles and rocks within 1.45 m of the visitors'
walkway (the entrance to the spot before the Ancient) are left out; every other one is as it was.

- **A16** (3.15.62; the author: "Fog still moves in too fast and moves out too fast"): the mist bank takes 30 s to roll in
and out (was 15 s).

- **A17** (3.15.62; the author: "let's make the opening to Fortizmo's bar wider"): the gap in her counter is 2.2 m (was
1.4 m).

- **P29** (3.15.62; the author's 54 fps watching the Event from afar): the batcher's per-batch pass (matrices,
visibility, colours; 1.8 ms a frame headless) skips batches that have not changed for 2 s ("cold") on three frames
of four; any change seen marks a batch hot again.

- **D5** (3.15.62; the author: "work on hardening our tools to capture issues like the recent ones"): the flight recorder
logs frame gaps over 45 ms with the heap before and after (a collector pause), frames that draw under a quarter of the
frame before (an empty or half-drawn frame), a camera matrix that is not finite, and every quality governor level
change; the B mark's dump lists the gaps. `perf_log.js` reads them; `alloc_probe.js` gains `--after-events`,
`--vignettes` and `--cave` (the author asked whether vignettes and the Cave cause collector pauses: no; 3 KB/s and
1.2%, and 7 KB/s and 1.0% of main-thread time, as in normal play); `test_jitter.js` (new) measures the drawn
position's frame-to-frame jitter and any model float.

- **S1** (3.15.62; the author: "Are there any kind of global safeties we can add to prevent screen flashes in general?"):
two safeties for any cause. A character the player's head is inside (its body radius, below its height) is hidden for
that frame, so its inside never fills the view (logged "head inside ... hidden for the frame"). A per-object draw
hook that throws no longer stops the frame (three.js drew nothing after it, leaving a half-drawn frame): the error is
logged once per object and the frame is drawn to the end.

- **S2** (3.15.63; S1's third safety): every shader is compiled while loading (`warm_coverage.js`), but as a safety for
one missed, an object whose first draw would compile a new shader program inside a headset frame is held back for that
frame and its program compiled right after it (as new geometry is, F-B51); it appears one frame later. Only a new
program holds an object: a new material that shares an existing program (the usual case) is drawn at once. The log
says "shader held for one frame". `test_shaderhold.js` (new, standard tier): two never-used material kinds added in
front of the player in VR; 3.15.60 compiles 4 shaders inside a frame, none now.

- **P30** (3.15.63; the author's 54 fps watching the Event from afar): the height follower samples the ground under a
townsfolk (19 lookups) again only once it has moved 5 cm since the last sample (it did on every frame it moved at all:
about 285 lookups a frame with the Event's walkers).

- **R8** (3.15.63; the author: "analyze the game file for any remaining dead code ... Dead code can be removed before the
final build ... the game must be fully tested after its removal"): `dead_code.js` over 33 recorded sessions (every
standard test plus played sessions in VR and in the browser): in the game script 180 functions never ran (81.5 KB,
10.9%), almost all of it paths the sessions cannot reach but a player can: the mural painter (73 KB; index.html and
the ordinal paint it where the APK loads it pre-painted), leaving VR, a lost GL context, a shader that fails to link
(the batcher's fallback), errors, the browser gate, the B mark's dump, the roam escape, mirrored parts in a merge, the
optimisation switches `opt_identity.js` uses, and the test hooks the harness serves. One was unreferenced anywhere and is
removed (`JGP.plantShow`, superseded by the Event's own planting). In three.js 404 functions never ran (52 KB): render
targets, cube and depth textures, other materials' uniforms; the headset's layers and multiview paths reach some of
them, which headless coverage cannot vouch for, so three.js is left as it is.

- **A18** (3.15.63; the author: "For the landing screen on non-Meta Quest browsers, please be sure to update the version
number to the latest. And also add the version number somewhere on the VR loading screen as well, ideally in the box
with the title and loading bar, I like the bottom right corner of that box"): the landing text and the gate's corner
said "v3.15"; they now show the build's full version, and the VR loading box shows it in its bottom right corner
(small, light grey). `build.sh` stamps the version from `versionName` into all four places (step 3b; it fails if it
does not find exactly four) and syncs the copies again when that changed the game file, so they always match the
build.

- **A19** (3.15.63; the author: "The issue with the fog disappearing from the top of the fence as I approach is still
occurring during the Event", "check if the mist on the fence issue also occurs with the roof of the church"): the
mist's first wall stands 1.5 m beyond the fence and faded to nothing over its bottom 1.8 m (to meet the ground
softly); the ground beyond the fence reached the mist's colour only 3 m out. From afar the view just over the fence
top meets the wall high up (mist); close to the fence it meets the wall's clear foot and the grass just past the fence,
so the mist over the fence thinned as the player came near (low eye heights and close approaches most). The wall now
fades over its bottom 0.45 m and the ground is fully in the mist's colour from 1.5 m beyond the fence (where the wall
stands), so its foot meets ground of its own colour. Pictures at 16, 6, 2.5 and 1 m from the fence, level and looking
up, before and after; headless the thinning was not visible at a 1.7 m eye height. The church roof shows no such
thing: close to the church the view over its roof meets the sky above the mist bank, as with any low bank.

- **F-B61** (3.15.64; found by the full pass on 3.15.63, `multiview_check.js`: "no GL error" failed with error 1282 at
every view, and multiview no longer matched the classic path at the town centre): F-B51's between-frame geometry upload
(`gcObjUpdate`) uploaded a new geometry's index buffer with a plain `bindBuffer(ELEMENT_ARRAY_BUFFER)`. In WebGL 2 that
binding is stored in whichever vertex array object is bound, and three.js leaves the last one drawn bound after a frame;
it caches each object's vertex array object and does not bind its index buffer again. So the last object drawn before a
held upload kept another geometry's index buffer for good, and every later draw of it failed (INVALID_OPERATION: its
indices ran past the 108-index buffer it was now given). Found with the new `GT_GLERR=1` harness mode: Sparkakus's
light-bulb beam (the Speech; drawn last, at draw order 6) stopped drawing after the Gem's pieces were uploaded between
frames. On the headset any object could be hit the same way: drawn with the wrong triangles or not at all. The upload
now unbinds the vertex array object first (three.js's own `bindingStates.reset()`), so it can change no object's
binding. Since 3.15.59 (F-B51). Headless: `multiview_check.js` passes again (no GL error; every view bit-identical
between multiview and the classic path); every test now also fails the pass on any WebGL error (`lib/harness.js`).

- **F-B62** (3.15.64; found by the full pass on 3.15.63, the frame-hazard watch in `test_standalone.js`): run on its own
(the root `index.html`, the compressed version as an ordinal), the game paints the gallery mural in a worker; each
finished piece replaces its placeholder (F-B54), which is disposed. The head script keeps every texture marked for an
upload before VR in a set, and uploads that set before the first headset frame draws; the disposed placeholders were
still in it, so three 4x2 textures (with mipmaps) were made again, inside a headset frame, and never drawn. A texture
now leaves the head script's pending sets when it is disposed (its `dispose` event). Since 3.15.60 (F-B54); the APK was
not affected (its mural comes from `tex/`). Headless: `test_standalone.js` (now failing on any frame hazard itself)
passes with none.

- **F-B63** (3.15.65; found by the full pass on 3.15.64, `opt_identity.js`: Backpacka 22 s into his show drew differently
batched and unbatched, 7.6% of the view): P29 lets a batch unchanged for 2 s be checked on one frame in four, so an
object that starts moving after standing still was drawn up to three frames late (a small hitch at the start of a
movement). A batched object now points at its batch, and three.js wakes the batch whenever it recomputes that object's
world matrix (`updateMatrixWorld`, `updateWorldMatrix`): a quiet batch is skipped only while none of its parts has moved.
`opt_identity.js` (batcher) passes again; with P29's skip off it passed too (the cause confirmed). Since 3.15.62.

- **P31** (3.15.65; the author: "further performance optimization during the Event is the highest priority"): three.js's
culling walk (`projectObject`) visits every one of the scene's 2,460 nodes each frame, though 1,482 of them sit in
subtrees that draw nothing on their own (batched parts and plain groups). Once a second (the batcher's 60-frame tick,
before culling) the game marks those subtrees with the current round's number and culling returns at a marked node; a
layer change anywhere (a part leaving or joining a batch) or a child added under a marked subtree starts a new round, so
the marks are never stale (only the saving waits for the next tick). Lights, sprites, lines, points and LODs always count
as drawing. Pixel-identical: `opt_identity.js` (switch P31), 40 town and 96 Event views, the same draws and triangles.
Culling 1.37 -> 1.26 ms a frame headless at the author's low spot (`event_cpu.js`).

- **F-B64** (3.15.66; found while building P33): the Event's safeguard fader (since 3.15.54, the far scenery fading out
while the Event plays) also faded the pond: its groups sit outside the 26 m the fader keeps, and the pond is one of the
things that must never fade (the author: "The Pond and Garden must always be unhidden"). The fader now keeps every
group within 6 m of the pond too. `test_stands.js` checks the pond is never hidden and never in a faded group.

- **P32** (3.15.66; the Event's CPU, PERF.md 15): three.js walks every node's matrix each frame (2,577 nodes at the
author's low spot), though most of the town never moves. At load every top-level group without a moving part
(`userData.keep`) is marked still and the walk returns at it; a round-robin audit checks 150 of its nodes a frame and, if
one has moved, the group is walked every frame from then on (logged: "matrix walk: a still group moved ...", naming the
group and node); a child added under a still group unmarks it at once. `test_lod.js` (exact far-model swaps) and
`opt_identity.js` pass. 3.15.68: a group with a node the game moves every frame (the clouds, the robin, the bandstand: 20
groups) is never marked; until then the audit unmarked them within five frames of loading, so the log line now means a
real surprise (`.runs/frz_names.js`: none unmarked over a run).

- **P33** (3.15.66; the author: "What if we temporally hide kiosks during the Event? It shouldn't impact gameplay too
much to have them fade out and fade in as well"; "Trees and the bird can also be hidden"; "we can hide things as long
as we give them time to fade out and then give them time to fade in"; "We don't want to do it too quickly"; "count the
Gazebo as a kiosk as well. In all regards"; "let's add all trees to the same group for fading out and in"; "The Robin
should always fade out and in with her tree"): once the Event's mist is past 15%, the fade groups (RULES.md 26) fade out
over 10 s and come back after the Event: each kiosk (every building but the church) and the gazebo on its own, and every
tree with the robin as one. Every part of a group fades at the same time (its materials' opacity, then hidden), and its
batches are woken when it hides or shows. A kiosk waits while its owner is within 6 m of home, and any group comes back
in 2 s when the player walks within 14 m of it. The gazebo and the trees were merged into the world's meshes: at load
they are carved back out (their triangles, found as connected pieces near each one, moved into groups of their own; the
trees only in a trunk's brown or a crown's green, so the fence and the robin's perch stay). The tree builder records
every tree it places (69: the park's three and the town's 66), so a new tree joins the group by itself. Never in a
group: the church and Cave, the Ancient, Somlet, the pond and anything in the Garden. `test_stands.js` (standard tier).

- **A20** (3.15.66; the author: "Let's make the Event flowers a little taller"): the flowers the townsfolk plant in the
Event are 15% taller, the same width (their model's scale 3.2 -> 3.68 upward). Pictures before and after (`shots.js
--preset garden`).

- **A21** (3.15.66; the author: "Add some basic water animations to the Pond"): ripples spread across the pond's water
from three spots in turn (thin pale rings growing to the water's edge and fading, about 6 s each), and the pale rings
painted on the water drift round slowly (the texture's own rotation: nothing painted or uploaded during play). The
ripples are children of the water, so they bob and tilt with it, and are drawn only within 26 m. Pictures before and
after (`shots.js --preset pond`).

- **F-B65** (3.15.67; the author: "Does the Gazebo have correct collision matching its model in general?"; "The doorway to
the Gazebo should be open and collision free for anyone to enter and exit"; "It's just the walls of the Gazebo that need
consistent collision"): the gazebo's posts and railings were only circles in the route planner's list, which the
player's collision never reads, so the player walked through its walls (and a townsperson pushed off its route could
too). Its seven railed sides are now walls from post to post (0.24 m thick, the posts at their ends), checked by the
game's own `F.resolve` for the player and every townsperson alike; the eighth side, its doorway, is open to anyone.
Gemtoe can be talked to from anywhere round it (her talk range 3.8 -> 4.6 m: the walls hold the player up to 4.0 m
from her). Proven: walking at the gazebo from eight sides stops at the railing on seven and walks in through the
doorway; Gemtoe's route home touches no wall and she is home in 11 s (`test_gazebo.js`, standard tier since 3.15.68); `test_roam.js` fails anyone standing in a railing.

- **S3** (3.15.67; the author: "What happens if NPCs or the player are standing in the areas where kiosks or other
objects fade back in? The user or NPCs should probably be push out of these areas and prevented from getting stuck.
Let's add safeties for this"): the fades (P33) are drawn only: every kiosk's collision stays on while it is hidden (the
player and the townsfolk are pushed out of its walls every frame as always), so no one can walk into one, and a group
comes back as the player nears it (14 m). As a safety for anyone placed without walking (a scripted spot, a spawn),
every frame a group fades back in, the player and every townsperson within 16 m of it are pushed out of its kiosk's
walls by the game's own collision (owners and anyone whose home or visit is inside left where they are) and off the
gazebo's railings; each push is logged ("fade safety: ... pushed out of ... as it comes back"). `test_stands.js` puts a
townsperson inside a hidden kiosk and checks they are outside it once it is back.

- **A22** (3.15.67; the author: "Can we make the Event flowers a little more colorful as well?"): the Event's flowers'
petals and blooms are 40% more saturated and the palest (the mallow's and the milkweed's near-white) take a visible
tint; stems, leaves, whites and greys as they were (`gcViv`, in their vertex colours at load). Pictures before and
after (`shots.js --preset garden` with close views).

- **A23** (3.15.68; the author: "These rocks around the Pond: Can we do the same as the rocks around the Garden? And just
make them into flat textures on the ground?"): the pond's 20 stones (dodecahedra on its bank) are painted flat instead,
as the Garden's were (F-B57): one ring lying on the soil bank and the grass rim (1024 px, painted while loading and
seeded, so it never changes), each stone where it stood, its size, turn and grey, with a soft shadow, a lit top, faint
facets and speckles; the water's edge covers their inner part as it did the stones'. The stones' draws from the seeded
stream are kept in the same order, so nothing built after them changes. Pictures before and after (7 m, 3 m, from
above, at the bank).

- **A24** (3.15.68; the author: "Add more clouds to the sky. Event fade out and fade in must also apply to these"):
fourteen clouds instead of seven, built the same way (three to five white puffs circling 40-95 m out, 50-72 m up); the
first seven are as they were (drawn first from the same seeded stream), the new seven differ from them and from each
other. The Event's far-scenery fader fades every one of them out at the start and back at the end, as it did the
seven. `test_event_fade.js` now checks every cloud (none shows while the mist is full, all back in full after each
Event, none pops); `test_seeded.js` checks the 14 are the same on every launch. Pictures before and after (the sky in
four directions).

- **S4** (3.15.68; the stability pass, the author: "For stability: We want the game to be able to recover from any
major issue"): the batcher's pass runs inside the render each frame (and with it P31's marks and P32's audit); an error
there that came every frame would have lost every frame, leaving a frozen view. It is now caught, and a part of the
frame that keeps failing (the batcher's pass or the render, three times within 3 s) is stepped down: first the
still-group and draw-nothing marks off (P32, P31), then batching off with every object drawn on its own (slower, but
everything shows). Each step is logged ("recovery: ... kept failing; step N: ..."). `test_recover.js` breaks a batch
in a running game: stepped down twice within 0.2 s, frames keep drawing (72 draws a frame), no further errors.

- **S5** (3.15.68; the stability pass): a townsperson whose update fails 30 times in a row (each error is already caught
and logged) or whose position is no longer a number is reset: its errand cleared and put back home, logged
("recovery: ID put back home (...)"), so it can never stay frozen or vanish. `test_recover.js`: a townsperson made to
fail every frame is reset and walks on without errors; one whose position was made not a number is home within a
second (the game's own guard got there first; S5 stands behind it).

- **A25** (4.0.0; the author: "Please whiten the clouds"): seen from below the clouds were olive green (their white
took the green of the hemisphere light's ground colour). They now have a soft glow of their own, tinted against that
green (`#9e8cb8` over a `#b3b3b3` base), so they read white with a light grey underside; the glow follows the night
tint (`gcNight`: full by day, 15% at night), so they do not shine in the dark. Pictures before and after (the sky in
four directions).

- **A26** (4.0.1; the author: "Just keep everything faded out until things fade back in. I don't care if there is
invisible collision"): P33's fade groups no longer come back when the player comes within 14 m (a rule Claude had
added, not asked for; with the trees one group, nearing any of the park's three big trees brought all 69 back). A
kiosk still waits for its owner to leave home before it fades out, but once out it stays out until the Event ends,
even if the owner walks home; everything then fades back over 10 s. Collision stays on throughout (invisible walls
while hidden, by the author's word), and S3 still pushes anyone standing in a group out as it comes back.
`test_stands.js`: walking up to a hidden kiosk leaves it hidden; after the Event nothing fades out again on its way
back; a townsperson put in a hidden kiosk is outside it once it is back.

- **F-B66** (4.0.2; the author: "I think I just saw Mushroom teleport through the side of his desk instead of moving down
his ramp", "let's make sure the issue with Mushroom never occurs with anyone else"): leaving for a visit, a
townsperson's `home` is moved to the foot of their way out (Mushroom's: the foot of his ramp, outside the kiosk). The
collision then no longer counted him as the kiosk's owner, treated its whole hull as solid with him inside it, and
pushed him out by the nearest side: 2.4 m through the side wall in one step, with the player at the ramp's foot. Now
ownership is by the home a townsperson started with (kept at load) as well as the current one, so an owner leaving is
still an owner; and anyone pushed out of a hull goes out by the side they came from (their previous position), never
by the nearest. Proven: a trap on Mushroom's position records no step over 0.5 m in four departures with the player at
the ramp's foot (it had recorded the 2.4 m jump); `test_owner_exit.js` (standard tier, new) sends every townsperson living in a kiosk
(Mushroom, Fortizmo) and Gemtoe from home on a visit with the player in their way: no jump, all on their way within 60 s.

- **F-B67** (4.0.2; the author: "The fog / mist on the top of the fence issue is still occurring as the user approaches
it ... check how the fence is rendered from a distance and how it is rendered up close"): from afar the fence's top
was hidden by the fog (it rises with distance from the player); up close the fog thinned and the first mist wall stood
1.5 m beyond the fence, so the fence's top came out of the mist with a pale strip of sky-coloured fog behind it. The
mist's fog now reaches full strength 0.25 m past the fence line (was 1.5 m), the first mist wall stands 0.3 m beyond
it (was 1.5 m) and starts at its foot. Pictures from 4 m and 1 m on all four sides at two eye heights (`shots.js
--preset mist`): no pale gap, the fence's top in the mist as from afar.

- **F-B68** (4.0.2; the author: "Sparkakus is now being culled out with his kiosk! the only thing that's visible is his
tail effect", "Sparkakus really should be the same as all other NPCs"): Sparkakus is built inside the Library's group
(not a townsperson entity), so P33 faded and hid him with it. Every character is now kept out of the fade groups: a
group holding one is split into its parts around it (Sparkakus marked as a character; lights are never faded either,
so the portal's light cannot change the shaders' light count), and a batch is faded only when all its parts are in the
group. `test_stands.js`: no character (every townsperson and Sparkakus) is in a faded group, and Sparkakus is shown
while the Event dances.

- **S6** (4.0.2; the author's log a5afcdd5: "A full screen flash occurred after starting a 2nd Event. Seemingly as the
flowers shrank"; "Could shrinking flowers and shrinking pickups cause flashes in general?"): the log shows no shader,
texture or geometry change at the flash (2.3 s after the second Event's start), with the player standing among the
Garden's flowers. A shrinking (or growing) plant's leaves and petals sweep through the space around it, and one passing
through the eyes fills the view with a single colour for a frame or two: a flash. S1 already hid a character whose
body held the player's head; now every Garden plant and every pickup (blossoms, mushrooms) within 2.5 m whose bounds
hold the head (15 cm margin) is left out of that frame's drawing, the same way. `test_safeties.js`: a plant placed
round the head is not drawn while the head is in it.

- **A27** (4.0.2; the author: "The Phone Booth and the Portal should both be treated as kiosks. They both should fade
out and then fade back in for the Event, like all other kiosks"): both are fade groups of their own (RULES.md 26), out
over 10 s once the mist is up and back after the Event; the portal's light stays (lights never fade).
`test_stands.js` checks both are in the faded set.

- **A28** (4.0.2; the author: "Please add more actual flowers to each of the individual Flower plants in the Garden. By
flowers: I mean flowers of that type of Flower"): each kind has more open blooms of its own kind, on short side stalks
from its upper stem (never within 7.5 cm of another head): the thistle 5 more purple heads, the mayweed 8 more daisies,
the chicory 4 more blue flowers, the milkweed two more pink umbels on side stems (28 and 26 florets), the mallow three
more flowers (the ends of both side branches and near the top). Built while loading, as before. Pictures before and
after (`shots.js --preset garden`, the five kinds side by side).

- **A29** (4.0.2; the author: "can we randomize the flower colors for every Event? Each plant should have its own
randomized color for all flowers on that plant, this randomized color should change for every Event and every subsequent
Event"): every Garden plant has a flower colour of its own, drawn at random (any hue but the leaves' greens, saturation
62-92%, lightness 50-64%) when it is planted, and drawn again at each later Event's start once the plant has shrunk away
(never while it shows). Each kind's petal colours are marked on its geometry while loading (a per-vertex weight: the
part's brightness against the kind's main petal colour, so veins stay darker and pale parts paler); the plant's own
material (one per plant, all sharing the one shader program compiled while loading: nothing compiles or uploads during
play) gives the marked vertices the plant's colour. Stems, leaves, buds, the mayweed's yellow centres and the thistle's
seed heads keep theirs. `test_flower_tint.js` (standard tier, new): two Events; each plant its own material and colour,
every colour changed for the second Event, only while shrunk away; no shader compiled inside a frame.

- **F-B69** (4.0.2; the author: "Gemtoe's tie is still floating. This can easily be observed from the sides"): measured
from the back of the tie straight into the body, the tie stood 13-17 cm in front of the chest along its whole length.
It now starts at the neck (0.52 -> 0.32 forward in the body's frame), tilts a little more (0.32 -> 0.33 rad) and curves to follow the
chest (its blade bent forward in the middle, 0.84 x s(1 - s)): 0.6-1.4 cm from knot to tip. Pictures from the side,
three-quarter and front (`shots.js --preset gemtoe`).

- **F-B70** (4.0.2; found while measuring F-B69): P31's wrapper on `Layers` methods called methods the bundled three.js
does not have (`enableAll`, `disableAll`), so calling either threw. The game never calls them; the wrapper now wraps
only the methods that exist.

- **F-B72** (4.0.4; the author: "If the user starts the Event without having completed 'Seeds', kiosks should NOT fade
out. This causes multiple issues for NPCs who stay in their kiosk areas. This goes for all kiosks: Portal, Phone Booth,
etc."; "Only the tree in the park should NOT fade out during the 'no Seeds' Event"): in an Event started without Seeds
(`bt.seeds`, set from the Seeds reward as the Event starts) no kiosk fades (the six stands, the gazebo, the phone booth,
the portal), nor the park's tree with the robin; only the town's trees outside the fence fade. To allow this the trees
are carved into two groups while loading: the park's tree (inside the fence) with the robin, and the town's trees. In
an Event with Seeds both fade together, as before. The Event's far-scenery fader (everything over 26 m from the middle
not marked to stay) was also hiding the carved gazebo and the park's tree in every Event, beside their fade groups;
they are now marked to stay, so only their fade groups move them. `test_noseeds.js` (standard tier, new).

- **A31** (4.0.4; the author: "Please remove the tree, that is in the park, behind the Sheriff's kiosk / Post Office
kiosk"): the big park tree at (31, -33.5) is gone (and its spot in the route planner's list). The park's one big tree
is now the robin's, beside the church.

- **A32** (4.0.4; the author: "Please remove the particle effect coming from Sparkakus' tail"): Sparkakus' 90 glowing
specks (pink turning cyan, rising from his tail) are no longer added or updated.

- **F-B73** (4.0.4; the author's video: "The fence issue is still occurring"; "I want the fence issue ... fixed for sure
this time"): the fence is drawn in two forms: up close its real rails and pickets (fading out between 18 and 28 m; they
write depth), and further off one flat panel with the pickets drawn on it (fading in; it writes no depth). The Event's
mist walls stand just beyond the fence and were drawn after both (render order 5): behind the near form they were held
back by its depth, but over the far panel they painted freely, so beyond about 20 m the pickets and rails vanished into
the mist while the solid posts stayed, and walking up brought the real pickets back ("the mist on top of the fence
vanishes as the player approaches"; A19 and F-B67 had worked on the mist itself). The mist walls stand behind everything
in the park, so they are now drawn first of all see-through things (render order 5 -> -3; only the sun's glow and the
stars, at -9, come before them): both fence forms, and anything else see-through in the park, are drawn over the mist.
(Drawing only the far panel after the mist, tried first, left the 18-28 m stretch pale: the half-faded near pickets
were blended with the sky before the mist was drawn.) Pictures in the Event from 25, 15 and 8 m, at an angle, from 30 m
to the north and 35 m to a corner, before and after.

- **F-B74** (4.0.4; the author: "When viewed against the fog / mist: The user cannot see Backpacka's water jets ...
Please also check the water dripping from his mouth"): the jets and the water drops (the drip from his mouth and the
splashes) write no depth and were drawn before the mist walls, which painted over them wherever a wall stood behind;
the rainbow too. With the mist walls drawn first (F-B73) all three are drawn over the mist. `test_bp_water.js` (standard tier,
new; the author: "Have the water effects of Backpacka been fully tested against the fog / mist?"; "he also has water drip
out of his mouth"): the mist full, his show set to five moments (drinking and lifting off at the pond and flying to the
Garden, the drip from his mouth; spraying the Garden, the jets, drops and rainbow), each seen from eye-height viewpoints
with a mist wall straight behind the water, drawn with and without the water and the mist: against the mist the water
shows at least 85% of what it shows without it, and stands out from it.

- **A33** (4.0.4; the author: "Please remove the animation and glowing from the Pond. Please add a basic water texture in
the place of animation and glowing instead"): the pond's water no longer pulses, bobs, tilts or turns, its three ripple
rings are gone (A21 removed), and the pale rim gradient that made it glow is replaced: a plain water texture painted once
while loading from its own seeded stream (deep teal in the middle, lighter at the rim, 150 short wave streaks, a few
small glints), low shine. Nothing changes on it during play.

- **F-B75** (4.0.4; the author: "The far sides of the Pond change shape when the user approaches it"): the stones painted
round the pond lie 4 mm above its soil and were drawn with a slope-scaled depth offset (`polygonOffsetFactor` -2). Seen
across the pond at a low angle that offset grows large, so the stone ring was drawn over the water's far edge and the
pond looked a different shape until the player came close. The ring now uses a constant offset only (factor 0, units
-2), enough for its 4 mm.

- **S7** (4.0.4; the author's log 6155900f, two full-screen flashes; "I want the flashes issue fixed for the next
build"; "It is possible that there is a pattern around pickups and flashes"): no GPU work happens inside a frame around
pickups (`.runs/pickup_haz.js`: 24 pickups in headset-shaped frames, the wrist HUD redrawn for each, their regrow: no
texture upload, buffer or shader compile in any frame), so the remaining pickup-to-screen paths are made safe. (1) The
wrist HUD (a dark 15 cm panel that shows only when it faces the eyes) redrew the moment it came into view after a
change, its new texture swapping in as the player raised the wrist to look; now a change waits 0.5 s (the author: "What
if we add a slight delay before the HUD updates") and is drawn whether or not the HUD shows, so its texture is uploaded
between frames before it is looked at. (2) The Garden's plants fade out, dithered, wherever a fragment is within
0.3-0.5 m of the eye (a leaf can no longer fill the view), in place of S6's hiding the whole plant. (3) The flight
recorder keeps the head's path and, on a flash mark, lists every object that came within 0.35 m of the eyes in the last
3 s ("rec near eyes"), and logs the wrist HUD showing, hiding and redrawing ("ev hud", "ev hudDraw"). The author's
second log (b3255baf, seven marks, on 4.0.3) again shows no texture, shader or geometry change in any frame.

- **S8** (4.0.4; the author: "I've been able to repro the flash many times while moving and picking up pickups while
watching Mama Gorbo and Gooward doing their pairing vignette"; "Flashes are happening when he and Mama Gorbo are having
a vignette while the user watches and moves around"): when the two meet they throw goo at each other, four throws of
three blobs (spheres up to 0.2 m across), each arcing up to about 1.7 m above where it was thrown, so the blobs cross
2.6-2.9 m up, the height of the player's eyes, with up to half a metre of random drift sideways. Watching close by and
moving about, a blob could cross the eyes from the side, filling the view with goo colour for a frame or two, gone
before it could be seen for what it was. Measured on 4.0.3 with the player among them: blobs drawn as close as 0.37 m
to the eyes (88 frames). Now a goo blob is hidden once within 0.7 m of the eyes (it flies on and lands as before;
logged "goo blob hidden near the eyes", up to 20 a session, so a headset log shows it). `test_goo_eye.js` (standard
tier, new): their meeting with the player walking among them: blobs seen in flight, none drawn within 0.7 m of the
eyes, no GPU work in any frame. Gooward's goo at the face when given a Blossom (designed, with goo splats on the view)
is kept: its blobs are hidden the same way before they reach the face.

- **S9** (4.0.4; the author: "What about the text vignettes? I notice it with text vignettes while moving around, is
there something there that's being rebuilt every time?"): in a text scene each line's speech bubble is redrawn (a
pooled canvas texture repainted and uploaded between frames, and a new sprite each line; nothing compiled or uploaded
inside a frame, by the frame-hazard watch). The bubble itself was the hazard: a camera-facing panel 4.4 m wide and up
to 2.7 m tall, mostly cream white, 1.1 m above the speaker's head, fading in over 0.25 s. As close as the speaker's body
lets the player come it spanned 70.6 degrees of the view (about 70% of it), wider still from nearer, so a line
starting near the player, or walking past a speaker, whited out most of the view. Now a bubble is scaled with its
distance so it never spans more than about 50 degrees (full size beyond 4.7 m), and fades out within 1.2 m of the
eyes. `test_bubble_eye.js` (standard tier, new): Mama Gorbo and Gooward's text scene with the player walking up to and
past the speaker: no bubble over 55 degrees (70.6 on 4.0.3, 50.7 now), none within 1.2 m, no GPU work in a frame.

- **F-B76** (4.0.4; the author: "Mushroom's hat slightly clips into his head"): his cap's top lay above the inner part
of the hat's brim (by up to 4 cm under it, 2 mm through its top beside the crown). The hat is raised 5 cm (0.60 ->
0.65 on his head): the brim's underside clears the cap by 7-10 mm from the crown to its edge, the crown's foot still
inside the brim. Pictures before and after (side, front, close).

- **A35** (4.0.4; the author: "Hide the HUD. Add a watch to the Left hand model. On the watch face, write 'press Y to
open'. Have the HUD only appear when the user presses Y while looking at the watch. And then have it close when the user
looks away from the watch or presses Y again"): the inventory HUD (which showed whenever its panel faced the eyes) is
hidden until asked for. The left hand wears a watch on its wrist: a dark strap round the wrist, a small case, and a 4
by 3.4 cm face reading "PRESS / Y / TO OPEN" (painted once when the panels are built and uploaded then; nothing is made
during play). Looking at the watch (its face within 0.8 m, turned toward the eyes, within about 35 degrees of the
view's centre) and pressing Y opens the HUD above the hand as before; Y again closes it, and so does looking away from
the watch for a third of a second. Y pressed with the HUD closed and the watch not looked at still brings the open
panel or dialogue back in front. `test_watch.js` (standard tier, new; `fakexr.js` can now hold the left controller at a
given pose): the watch on the left hand only; the HUD hidden by default and on Y without looking; opened by Y while
looking, closed by Y and by looking away; no GPU work in a frame.

- **F-B77** (4.0.4; the author: "during a text vignette between the Ancient and Mama Gorbo: The Ancient's text box was
partly unreadable because it was clipping into Mama Gorbo's body ... test all other text vignettes"): a bubble was
centred 1.1 m above its speaker's nominal height, but bubbles are up to 2.7 m tall, so a bubble's lower edge could sit
below a taller partner's head (or a character's real top, above its nominal height), and a body standing in front of
it hid part of it. Now each bubble's lower edge stays at least 0.3 m above the higher of the two speakers' real tops
(measured once from their models), never lower than before, and bubbles are drawn over everything (so a body before
one never hides it). `test_bubble_clear.js` (standard tier, new): all 101 pairs with a text scene played with the second
beside the first: on 4.0.3 two cut into a character (Hennrick and Zollod's over Gooward by 0.10 m, Gemtoe and
Hennrick's over Gemtoe by 0.29 m), now none; every bubble drawn over everything. (Sparkakus's scenes end before a
bubble shows, tied to his library; the same on 4.0.3.)

- **A34** (4.0.4; the author: "Please remove the comfort vignette altogether"; "I feel like this comfort vignettes is a
leftover that doesn't really work anyway"): the darkening ring drawn in front of the eyes while the left stick moved
the player is no longer added to the camera or shown. It was a 1.76 m panel 0.32 m before the eyes, clear out to 45%
of its radius; each eye sees about +-50 degrees, which reaches only about 43% of it, so only the corners of the view
ever darkened (at most about 15%), while a full-view see-through layer was drawn every frame the player moved. (The
"ev vignette" lines in the headset logs are the townsfolk's scenes, VIGS, not this ring.)

- **S6, revised** (4.0.4; the author: "Flowers in the Garden disappear when the user walks into them. This should not
occur"): a Garden plant holding the player's head is drawn as usual; S6 now hides only pickups holding the head.

- **A36** (4.0.4; the author: "Please add a yellow baseball cap with the teal 'Mistergummery's' M logo on to Mama
Gorbo's head"; then "Mama Gorbo's hat looks much much too small" and "it is clipping into her eye disk, this is a bug, it
should never do that"): a yellow cap (a half-ellipsoid crown, a half-disc brim, a button on top) with a teal M (two
arches, dark teal under light teal, painted once while loading) on the crown's front. Her big porthole eye covers the
upper front of her head up to about 2.65 m, so a cap of this size cannot sit level without cutting into it: it is worn
pushed back, 1.75 times the first cap's size (crown 1.75 m across), set 0.3 m back and tilted 23 degrees, its brim
showing above the eye. Set level at this size (the pictures the author saw) it cut 3.5 cm into the eye disk
(measured); now 8.4 cm clear.
`test_cap.js` (standard tier, new; the game hands the cap and both eye groups to tests): every point of both eye disks
at least 3 cm clear of the crown and brim, the cap's rim on her head. Pictures: `shots.js --preset mama` (new; front,
side, three-quarter, back, above, and from a standing player's eyes).

- **A37** (4.0.4; the author: "Please add another tree to the right of the tree with the Robin on it"): a second big
park tree at (-24.5, 34.5), 1.15 times the base size, to the right of the robin's tree seen from the Garden. It is part
of the park's fade group (renamed "the park's trees and birds"), so it stays in an Event without Seeds (F-B72).

- **A38** (4.0.4; the author's photos of a cardinal: "Please create another bird model based on this bird. And then add
it to a branch on the new tree. It should have the same behavior as the other bird"): a male cardinal on a branch of
the new tree, facing into the park. Built by the robin's own builder (the same body, wings, tail and head shapes, the
same idle breathing, head turns, tail flicks and wing settles, a few seconds out of step with the robin), with a
cardinal's colours and shapes: red all over (darker red-brown back, wings and tail), a tall swept-back crest, a black
mask and bib round a thick orange-red beak, no eye rings and no white tail tips. Picking it ("Cardinal") makes it fly
off and come back, as the robin does; it fades with the park's trees (RULES.md 26). `test_content.js`: the cardinal is
named, on the new tree and flies off when picked. Pictures: `shots.js --preset birds` (new).

- **S10** (4.0.4; the author: "They did happen around the time that I picked up pickups"; "Would the new watch HUD also
not be a part of the fix for this?"): with A35 the HUD is hidden until opened, but it was still redrawn after every
pickup, and each redraw uploads its 256-pixel panel to the GPU. Now the HUD is redrawn only while it is open: walking
about and picking things up uploads nothing. Opened with a change waiting, it is redrawn at once and stays hidden until
the new picture is in place, so it is never shown out of date. Each pickup is now an event in the flight recorder's
trail ("pick blossom", "pick flint"), so a log shows how long before a flash the last pickup came. `test_watch.js`:
pickups while closed redraw nothing; opening redraws once and never shows an old picture.

- **S17** (4.0.12; T19, S12 continued; found by the play census on 4.0.11, 26 buffers made during play, all between
frames): the Ancient's own body (15 shapes, the largest 3,243 vertices) was uploaded the first time the player came near
the church. The geometry warm-up draws every object once while loading, but the Ancient's draw wrapper hides his body
whenever the camera is outside the church (so he is never seen through its walls), and it did so during the warm-up's
draw too. The warm-up now switches that hiding off for its own draw. It also renews the renderer's "draws nothing" marks
first (a subtree of meshes parked in a draw batch is marked so and skipped, so the warm-up could miss parked sources).
All 15 are now on the GPU before the first frame.

- **P34** (4.0.11; T20: every Event's start cost one long frame, about 42 ms, in the author's headset logs 8d838908 and
5dc2b257): the press on "Yes" ran the whole start in that frame, 44 ms of it headless: the ring where the townsfolk
stand to watch (a search over radii with every character's footprint cells, 19 ms) and every character's foot points
(the lowest points of each mesh, read from up to 3,000 vertices a mesh, 21 ms). The ring depends only on who takes part
and the singer's fixed angle, so it is worked out while loading and remembered (by the participants in order: an
Event with the same townsfolk reuses it; any other set is worked out then, as before); the foot points depend only on
each mesh's shape, so they are read while loading (the cache they were already kept in), and the pose-dependent part
still runs at the start, as before. The start now takes 18 ms headless (3 ms of it Mama Gorbo's goo, whose shape
changes). A first try spread the footprints over the following frames instead; it was dropped, since it would read
them in a walking pose, not the standing one.

- **S16** (4.0.11; T19, S12 continued): the Gem's stand (the cylinder, its collar, the ring and the orange top Sparkakus
assembles it on, the census's "the Speech") was built and uploaded the first time the Gem was assembled; the stand's
shapes are now made and uploaded with the Gem's pieces while loading, and its ring is one shared shape (it was a new
geometry each time).

- **A43** (4.0.10; the author: "Add an additional package to the mail pile behind the Post Office kiosk. This package
should have a 'To Ormstown' label"): a fifth parcel, in the others' style and size, on the back of the pile (between
the stacks, clear of them so the whole label shows), addressed "To Ormstown". Its label is painted while loading like the
others' (and pre-painted in `tex/` by the build). Pictures before and after, and close on the label.

- **F-B82** (4.0.10; B47: "a shader program compiled between frames near Fortizmo's bar", seen in long headless runs
of `test_vig_flash.js`, a different text scene each time): it was the head guard, the black sphere on the camera that
dims the view as the head goes into a wall. The test moved the player next to each scene's speakers, sometimes with
the head at a wall, and the guard's shader was compiled the first time it showed. The camera, and so the guard, joins
the scene only at VR entry, so the loading warm-up never reached it. Its shader is now compiled at VR entry, with the
controller rays'. Never inside a frame before either (the shader hold, S2), so not a flash. `test_safeties.js` puts the
head at a wall: the guard shows and nothing is compiled.

- **A42** (4.0.9; the author: "Please ensure that pizza boxes on the ground fade out at the end of the Event. Pizza
boxes currently pop out instead"): the Event's pizza boxes (the stacks round the ring of watchers and Anomalee's open
box) were removed the frame the Event ended. They now fade out over 1.6 s first. They draw with their own copies of the
box materials, made while loading, so nothing else fades with them (Nextessa's box, the boxes elsewhere), and their
see-through form is compiled while loading (no shader compiled during the fade); their draw batches fade with them.
A new Event during the fade finishes it at once. `test_pizza_fade.js` (standard tier, new).
  Also (S15 follow-up): the geometry hold's log measured each held object's distance from the camera's position inside
  the player's rig, not its world position, so on the headset every distance read as the distance from the town's
  centre (log 5dc2b257: "2 objects ... r22.23m at 1.1m" at each Event's start, which are these pizza boxes' two draw
  batches appearing, 17 m out, not something at the eyes); it now measures from the eyes and names a held draw batch
  and how many objects it holds.

- **A41** (4.0.8; the author: "Move the HUD to be placed on top of the watch face when opened. Ensure that the HUD
has a solid background to be fully readable. The user should be able to read it like looking at their watch after it's
opened"): opened, the HUD now lies on the watch face itself, in the face's plane 4 mm above it, centred over it, 8 cm
wide (it was a 15 cm panel held above the controller grip), reading the same way as the face's own text (upright seen
from the wrist side); its panel is fully opaque (it was 85%). Pictures from the face, both sides and both ends of the
hand. `test_watch.js` checks where it lies, its size and its opacity.

- **S15** (4.0.7; the author's log 8d838908: three flashes marked, one 2.4 s after leaving the Cave as a text scene
started, one 2.6 s after leaving the Cave during an Event, one 2.0 s after starting an Event; "nothing came close to my
face when the flashes occurred ... ever"; "if the log is not capturing the information you need, please update the
logging methods so that it does"; "put in place safeties to prevent further flashes"; "tears should also not be
occurring in any visible way"): at none of the three marks did the record see anything it watched (no shader, texture
or geometry change, no GPU work inside a frame, no frame gap, nothing near the eyes); the headset's own counters (stale
frames, tears) are as high elsewhere in the run as at the marks. So the record could not tell whether the flash was in
the picture the game drew or added after it, by the headset. Added:
  - **Light record**: every frame the GPU copies an 8x8 average of the left eye's picture, as the game drew it, into a
    ring of the last 512 frames (about 7 s), with no readback during play (a per-frame pixel read cost most of the frame
    rate headless and would stall the headset). The mark reads it back (asynchronously) and logs `rec light`: the
    brightness in 1/8 s steps over the last 5 s, the biggest one-frame change, and every one-frame spike or dip (with
    the frame number). A spike there means the game drew the flash; none means it came after the game.
  - **XR frame health**: a frame with no head pose is no longer drawn (it drew into the last frame's picture, which the
    headset may still be showing) and is logged, as is lost and regained tracking, a frame the game did not draw and
    one drawn twice; the mark sums them (`rec xr frames`).
  - The mark's trail now carries every state change (Cave, scenes, Event, screens, snap turns) and the record logs head
    jumps over 30 cm, turns over 20 degrees in a frame and sky or fog jumps; the geometry hold names what it held (the
    object, its colour, its size and its distance from the eyes); a failing mark dump logs its error instead of
    ending silently (it had: `THREE.Sphere` is not in the bundled three.js).
  - The mark itself no longer stalls a frame: its near-eyes scan (60-80 ms on the headset) runs in 3 ms slices
    between frames, and its light readback is asynchronous.
  - A text scene's confetti and thrown tokens are not drawn within 35 cm of the eyes (a cheap guard; the author has
    never seen anything near their face, so it is not the cause).
  Tears: the headset's compositor counts them (25 in this run, none at the marks); the game cannot switch them off, but
  stalls and missed frames make them likelier, and the mark's stall (up to 79 ms) is gone. `test_flashlog.js`
  (standard tier, new) checks the lot, both render paths.

- **F-B80** (4.0.7; the author: "Mama Gorbo's hat is too imbedded in her head. Around the brim: you can see that her
head clips through the hat"): measured against her real head (19,669 vertices of her body, drips and goo tube, not the
shape function they were built from), 605 vertices came through the crown (up to 6.4 cm) and 62 through the brim. A
search over the cap's height, size, crown height, tilt and depth for no vertex through it with both eye disks at least
3 cm clear chose: 10 cm higher, 5 cm further back, 1.9x wide with a crown 1.5x taller, tilted back 0.5 rad. No head
vertex comes through, the eyes are 20 cm clear and the rim sits on her head (at most 8.6 cm off it, at the back of her
egg-shaped head). `test_cap.js` now measures all of this against the real head.

- **F-B81** (4.0.7; the author: "The new watch face clips too much into the hand model"): the watch sat 2 mm into the
back of the hand at the cuff; its case is now thinner and shorter (33 x 7 x 29 mm) and set 2 mm up and 3 cm toward
the fingers, the face on top of it; pictures from the face, the fingers' side, the cuff's side and both low sides show
it clear of the hand and the cuff and still readable. `test_watch.js` passes.

- **A40** (4.0.7; the author: "Please flip the Cardinal to be facing the opposite direction (towards the Robin)"): the
Cardinal is turned round on its branch (its beak toward the Robin: 0.94 in line, was -0.94). `test_content.js` checks
it, before either bird flies.

- **S14** (4.0.6; S11 continued; found by `test_vig_flash.js`, which now lists every geometry drawn for the first time
during its hour of play): the Gree-mail tokens the townsfolk send each other in their scenes (Hennrick's cube, King
Dino's crown, Fortizmo's note, Mama Gorbo's goo, the cards, tiles, gems, letters and the rest) share one geometry per
shape, but each shape was uploaded the first time anyone sent that token, during play (about 20 uploads in an hour,
between frames). Every token is now built once while loading, drawn by the geometry warm-up and put away.
  Also: the Garden plants' warm-up compiled their programs but never uploaded their shapes, so each plant's full and
  low-detail shapes (two of them 15,400 and 18,500 vertices) were uploaded when first drawn in the Event (the play
  census, which now names each first-drawn shape's owner and place). They are now uploaded while loading too.

- **F-B79** (4.0.5; found by `test_owner_exit.js`, repeatable): with the player standing on the first point of Gemtoe's
way out of the gazebo, her stuck rescue (a townsperson blocked eight times while seen, four while unseen, is moved to
its target with a sparkle) moved her straight onto that point, which is where the player stood: a 1.55 m jump into the
player. The rescue now never moves a townsperson to a spot within its body plus 0.6 m of the player; it keeps waiting
(and tries again) until the player moves. Not a regression: 4.0.2 does the same (a 1.58 m jump after 36 s of game time,
measured); its earlier passes ran on a loaded machine, where less game time passed in the test's 60 s and the rescue
never came.

- **S13** (4.0.5; found re-checking `test_recover.js`): when the recovery safety turns the draw batcher off (S4 step 2),
it hands every batched object back to be drawn on its own from each batch's list of members; a batch whose list was
damaged (the test's injected fault) left its members on the batcher's hidden layer, drawn by nothing. The step now
also sweeps the scene and returns anything still on that layer. (`test_recover.js`'s draws-per-frame check now allows
for multiview, which draws both eyes in one call: 35 there, 70 on the classic path.)

- **F-B78** (4.0.5; found by `test_bubble_clear.js` on 4.0.4): a speech bubble cleared the two speakers' heads but not
a third townsperson standing under it; with Mama Gorbo's taller cap (A36) Fortizmo and Zollod's bubble cut 8 cm into
her. A bubble now rises above every townsperson within its span (2.2 m plus their body), not only the speakers.
`test_vig_flash.js` now counts only bubbles the renderer drew in a frame (one out of view is not drawn, and a bubble is
sized as it is drawn), and retries a scene whose speaker is busy for a moment.

- **S12** (4.0.5; S11 continued, the author: "let's try to clean things up to be less likely to cause these sorts of
issues in the future"): Nextessa was built on every pizza order (her model made, merged and batched, then her pizza box
made) and thrown away when she left, so each visit made and uploaded new geometry and disposed it again (the play
census: 40 buffers made and 26 deleted in a busy session, most of them hers). Now she and her box are made and uploaded
while loading; an order brings the same Nextessa and the same box back, her leaving puts them away (nothing disposed),
and the delivered box is kept for the next order. She is not drawn through the draw batcher (one character, a few draws
while she visits), so no batch is built or dropped for her. `test_courier.js` (standard tier, new): two orders, each
delivered; the second brings the same model and box; no GL buffer deleted during either visit and none made inside a
frame (three small ones, two quads and a 205-vertex piece, are uploaded between frames by the geometry hold on her
first draw). Also: a few batches of load-time warm-up objects (the Event's pizza boxes round the Garden) were dropped
by the batcher in the first minute of play, once their objects had left the scene; they are now dropped at the end of
loading.
  Also: the draw batcher dropped a batch whose objects had left the scene (after 10 checks) by disposing its geometry
  and material inside the frame being drawn (the play census: 21 buffers deleted inside headset frames during text
  exchanges). The disposal now happens just after the frame.

- **A39** (4.0.4; the author: "Please limit Gooward's goo barrage (after giving a Blossom) by making Gooward
non-interactable until the goo barrage is over"): a Blossom given to Gooward starts his barrage (eight volleys over
2.7 s, each splatting on the view 0.95 s after it is thrown, the last at about 3.65 s). For 4 s from the gift he is left
out of the interaction scan: no prompt shows for him and the buttons do nothing, so a second Blossom (or a talk) cannot
start another barrage over the first. `test_content.js`: with the player beside him throughout, he is never the target
until the barrage is over, then is again.

- **S11** (4.0.4; the author: "Did you fully check that text vignettes could not cause any flashes"; "Even if we can't
find the direct cause of the flashes: let's try to clean things up to be less likely to cause these sorts of issues in
the future, In general"): a clean-up pass on GPU work during play.
  - Text scenes: each line's bubble took a new sprite and material, all let go when the scene ended (a material let go
    can take its shader with it, to be compiled again the next time). Bubbles now come from a pool of eight made while
    loading and go back to it; nothing is made or let go during a scene. The bubble's picture is still painted for each
    line into a canvas made while loading, and uploaded between headset frames (F-B31), never inside one.
  - `test_vig_flash.js` (standard tier, new, on the headset's render path): every pair with a text scene played in VR
    while the player walks round the speakers: no GPU work inside a headset frame, no shader made, no texture or
    geometry left behind, no bubble over 55 degrees of the view or within 1.2 m of the eyes.
  - `play_census.js` (report, new): the texture census's busy session (pickups, the shop, everyone spoken to, a dance
    battle, Nextessa, text exchanges, the Speech, the Event) with every GL buffer, program and texture made or deleted
    during play listed by the game code that asked, and every geometry first drawn or disposed by its object. On the
    build before this pass: no program, texture or canvas made during play; 40 buffers made and 26 deleted (Nextessa's
    visit, the Speech and the Event).

- **A30** (4.0.3; the author: "Move the Robin to the tree next to the Church. And then remove the tree that the Robin is
on now"): the robin and her branch now sit on the big park tree beside the church (-16, 37), facing into the park;
her old tree (-17, -34, by the shop) is gone, with its spot in the route planner's list and in the fade group's
points. The robin still fades with the trees (RULES.md 26). The park's three big trees drew nothing from the seeded
stream, so nothing else changes. Pictures: the robin on her new branch, the church with its tree, the old spot.

- **F-B71** (4.0.3; the author: "The blue portal effect is no longer appearing after I order a pizza"): a fade group
holding something that never fades (the portal's light; Sparkakus in the Library) is split into its parts round it
(F-B68), and the set-up then judged every material in those parts shared with something outside the group (it compared
against the group's top object, no longer in the group), so it gave each part a copy. The portal's update fades in the
original materials of its effect while the effect drew with the copies, left at 0: the effect never showed. A material
is now copied only when a mesh outside the group's own parts uses it (the shop 23 -> 19 faded materials, the gazebo
10 -> 5, the portal 6 -> 2), and the portal's effect, whose showing the game controls, is never in its fade group (like
its light). `test_stands.js`: the portal's effect reaches its full opacity when it opens (0.93; 4.0.2: 0).

## Multiview (release path since 3.15.34)

Edits for the multiview experiment, in order. Three groups:
    1. three.js: a `multiview` program parameter (part of the program key and of the
       needs-a-new-program check); multiview programs get the extension, `num_views = 2`, and
       macros that pick each eye's projection, view, model-view and normal matrices and camera
       position (eye 0 reads the uniforms three.js always uploads; eye 1 reads gc*1 uniforms
       computed on the CPU exactly as three.js computes them for that eye); lights are rotated
       or moved into eye 1's view in the shader; the render loop draws each object once with
       the left camera when the multiview layer is live.
    2. The game: the batcher reserves vertex uniforms for the extra per-eye matrices; the renderer
       is wrapped so the loading warm-up renders into a multiview target.
    3. The layers shim: texture-array projection layer, multiview attachments, no resolve blit.

## Experiments (never in the release; `tools/experiment.py`, `tools/build_experiment.sh NAME`)

- **nolayers**: No layers: the release requests the WebXR "layers" feature (compositor layers for the loading
screen, projection layer for the game, NOTES 42, confirmed on the headset). This variant goes back
to the plain projection-layer loader, to measure or diagnose.

- **texcapture**: Texture capture: record every pre-renderable canvas painter's output during the boot (used by
tools/prerender_textures.js, never shipped).

- **nomultiview**: No multiview (NOTES 65, 67): the release draws both eyes in one pass (multiview, headset- confirmed
in 3.15.33's experiment); this variant plans it off, so the game takes the classic path (each eye
drawn separately), to measure or diagnose.

- **flashlog** (removed 2026-10-29 with the tools cleanup: its B mark has been in the release since D2, 3.15.48, and its
swap log has had nothing to log since F-B31; in git history only).

- **nobatch**: Draw every mesh individually: no gcEB batches, no custom vertex shader.

- **noeffects**: No pickup effects: no sparkle particles, no floating labels, no HUD/label texture churn from
pickups.

Dropped in 3.15.43 (NOTES 87; the code they changed is gone): `native`, `nogovernor`, `directrequest`, `keepalive`.
