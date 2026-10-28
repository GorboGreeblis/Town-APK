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
author's rules (tools/RULES.md). NOTES numbers point to tools/NOTES.md.

## Entry edits (9 blocks)

The head script and boot changes that launch the game straight into VR (RELEASE.md 6: any change here
ships first as an experiment APK).

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

## Gameplay, performance and other fixes (56 blocks)

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
to the plain projection-layer loader for A/B comparisons.

- **texcapture**: Texture capture: record every pre-renderable canvas painter's output during the boot (used by
tools/prerender_textures.js, never shipped).

- **nomultiview**: No multiview (NOTES 65, 67): the release draws both eyes in one pass (multiview, headset- confirmed
in 3.15.33's experiment); this variant plans it off, so the game takes the classic path (each eye
drawn separately) for A/B comparisons.

- **flashlog**: Flash diagnostics (3.15.41 on the author's Quest 3S: three bright, washed-out flashes, two partway
through the Event; NOTES 79). Plays exactly like the release; only the log changes: B on the right
controller (the one button the game leaves free) writes "MARK flash seen" (with a short buzz), so
each flash can be lined up with what happened then; the hazard watch also counts texture storage,
framebuffer attachments, renderbuffer storage, buffer uploads, flushes and syncs while a frame
draws, logs up to 300 with the frame number (not only the first 12), and every perf line carries the
totals; frames over 28 ms are logged; the old layer's destruction after a swap is logged (the release swaps no layers since F-B31).

- **nobatch**: Draw every mesh individually: no gcEB batches, no custom vertex shader.

- **noeffects**: No pickup effects: no sparkle particles, no floating labels, no HUD/label texture churn from
pickups.

Dropped in 3.15.43 (NOTES 87; the code they changed is gone): `native`, `nogovernor`, `directrequest`, `keepalive`.
