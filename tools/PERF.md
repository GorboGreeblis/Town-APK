# Performance analysis of the APK build

Started as an analysis (sections 1-6); sections 6-13 record the changes that
were applied, each listed in FIXES.md (section 15 is the latest: 3.15.65 on, P31-P33; section 14 3.15.53-3.15.63). The render path itself is described in
RENDERING.md. Numbers from the headless harness (software GL) are marked as such: draw calls, triangle counts, program counts
and JS time are meaningful there, GPU time is not. Headset measurements: the author's 3.15.33-3.15.34 run on a
Quest 3S (section 10) and the 3.15.41, noswap and deferupload runs (section 13, NOTES 79-81), which showed the frame rate
follows draw calls, not pixels, and the 3.15.46 and 3.15.47 runs (NOTES 90-91), whose runtime lines show the Event
CPU-bound (app GPU time 9.3 of a 13.9 ms frame). The author's 3.15.58 run on a Quest 3S read 56-59 fps for 12 s at (-33, -7) in the Event (the runtime's CPU frame 12-14 ms of
13.9, the GPU 71% busy), and on 3.15.60 the lowest reading watching the Event from afar was 54 fps; the changes in
section 14 are estimates until the author's next run.

**Performance is now the top priority** (RULES.md "Priorities", the author: "once all other tasks are completed,
performance should be our focus"; the biggest blocker for the Store submission): the planting Event on a Quest 3S,
steadily above 60 fps (TASKS.md T16).

Code names in the tables below (`Ge`, `gcEB`, `Qe`, `Ae`, `bend`) are those of the build measured. Since 3.15.45 the game
file is minified (FIXES R2): top-level names such as `Ge`, `gcEB`, `Qe` (the batcher's per-part placement) and `bend`
survive, but three.js's internals were renamed (its projectObject, `Ae` below, is now `Pt`, and three.js has its own
`Qe`), so a profile of the current build names some functions differently.

## 1. What the APK adds on top of the game

The APK is a launcher: an Android activity starts a loopback HTTP server, hands
`http://localhost:17777/` to the Quest Browser's immersive activity, and gets
out of the way. Cost on the game: none at runtime (the server idles on a daemon
thread after the one 1 MB transfer), a few hundred milliseconds at launch for
the activity hand-off. Two wrapper-side items are worth doing:

| Item | Effect | Risk |
| --- | --- | --- |
| Serve the page cacheable (`ETag` + `Cache-Control: no-cache`, answer `304`) instead of `no-store` | Chromium keeps its compiled-code cache for the inline scripts between launches, so the second launch onward skips most of the parse/compile of ~1 MB of JS | none to gameplay; the ETag changes with every build so a new APK is never served stale |
| Keep the splash image until the first XR frame (already the case through the TWA splash) | hides the synchronous world build | none |

## 2. The game as bundled (3.15.6), static read

The game already carries its own performance design, written for the Quest:

- **Adaptive quality governor** (`Ge`): frame-time EMA against a 72 Hz budget;
  five levels that only raise fixed foveation (0 → 1) while keeping the
  framebuffer scale at 1.0; an emergency 0.82 scale after 3 s over 1.6x
  budget; lowest level locked and far scenery hidden during the finale.
  *(Since 3.15.43, F-B31: native scale at every level and in the emergency
  step; the governor changes foveation only, on the same layer.)*
- **Draw batching** (`gcEB`): opaque Phong/Lambert/Basic meshes are merged
  into batches of up to 32 parts with per-part transform and colour in a
  uniform array, driven by a patched vertex shader. Result below: ~36 draw
  calls per eye for ~1,600 visible meshes.
- Shadows hard-disabled; fog 70–300 m; camera far 310 m; `antialias: true`
  on the XR layer; pixel ratio capped at 2 (irrelevant in XR).
- Gallery art painted in a Web Worker; sparkle/splat/label objects pooled.

## 3. Runtime, headless harness (fake VR session, both eyes)

| Metric | Value |
| --- | --- |
| Draw calls per frame (both eyes) | 72 |
| Triangles per frame (both eyes) | 210,840 |
| Shader programs | 106 |
| GPU textures / geometries | 109 / 287 |
| Scene: meshes / visible / materials | 1,765 / 1,588 / 755 |
| Transparent meshes (not batchable) | 154 |
| Largest single geometry | 173,892 vertices (a batch) |
| Game logic per frame, render stubbed (server CPU) | p50 1.5 ms, p90 2.0 ms, p99 3.3 ms, max 7 ms |
| JS heap after boot | ~113 MB |

Reading: the CPU side is light (a Quest 2 core is roughly 3–4x slower than
this server, so ~5–6 ms of a 13.9 ms budget, plus three.js submission). The
frame cost on the headset is therefore GPU-bound: fill rate (transparent
objects, 154 of them, and the full-screen passes), ~105k triangles per eye,
and 106 programs is a lot of state. The governor's foveation levels address
exactly the fill-rate part, which is consistent with the author's experience
that it holds 72 Hz in normal play and strains only in the Event.

## 4. Boot

The world is built in one synchronous call before the first frame: geometry
generation, 50 canvas-painted textures (up to 768x2048), batching, then shader
compilation for ~106 programs and a warm-up render. This is the part that the
APK's extra space can remove: see section 6.

Boot profile (`tools/boot_profile.js`, headless, software GL, CPU sampling on,
so absolute times are inflated; the split is what matters):

| Phase | Inclusive time | Share of sampled boot |
| --- | --- | --- |
| Shader compile and first draws (renderer compile/render) | 14.3 s | 41% |
| Script parse/compile (V8 "(program)") | 9.7 s | 28% |
| Canvas texture painting (50 painters) | 4.7 s | 14% |
| Garbage collection | 0.4 s | 1% |
| Geometry merge | 0.4 s | 1% |
| Draw batching | 0.2 s | 1% |
| World ready / first XR frame | 10.4 s / 34.6 s | |

On the headset the GPU driver compiles the 106 programs far faster than
software GL, but the order stays: shader compilation, script compile, texture
painting. The browser keeps a shader cache across launches (so the second
launch is faster), while `no-store` currently prevents the script code cache
(section 1).

## 5. Demanding moments (pickups, the Event)

See `BUGS.md` F-B12 and `NOTES.md` item 32 for the flash investigation. The
hitch probe (retired; `tools/perf_report.js` now reports the new programs and
textures per situation) recorded what each action created on the GPU
(programs, textures, geometries) and the frame-time spike around it (software
GL; spikes are relative):

| Action | New programs | New textures | New geometries | Worst frame vs baseline |
| --- | --- | --- | --- | --- |
| First blossom pickup of the session | 0 | 14 | 57 | 78 ms (all 9 frames over 2x); 3.15.26: 10.5 ms, 0 new programs (P2) |
| Acorn pickup, later pickups, new label text | 0 | 0 | 0 | none |
| Dialogue box open | 0 | 0 | 0 | 20 ms vs 15 |
| Battle panel open | 1 | 1 | 1 | 1,154 ms vs 12 (shader compile); 3.15.26: 16.8 ms, 0 new programs (P2) |
| Garden Event start | 0 | 0 | 0 | 44 ms vs 10 (3 frames over 2x) |
| During the Event | | | | p50 9.3 ms, p99 20.7 ms |

So the first pickup of a session uploads 14 textures and 57 geometries on the
spot (sparkle and splat pools, labels), opening the battle panel compiles a
shader program during play, and the Event start has a few long frames. On the
headset each of those is a dropped frame shown re-projected. Pre-warming them
at boot (section 6, item 2) removes all three.

## 6. Improvements possible now that size is not a limit

Ordered by payoff over risk. None change gameplay; all are "little fixes" in
the author's sense except the last two, which change how assets are built.

1. **Cacheable page** (section 1). Faster second launch. Wrapper only. *Done in 3.15.9 (ETag + no-cache + 304).*
2. **Pre-warm everything that first appears mid-game**: every label text and
   colour, the sparkle/splat/particle materials, the Event props, the battle
   and shop panels, so no shader compiles or texture uploads happen during
   play. Game edit, small, same visuals. Candidate fix for B12. *Pickup effects (labels, sparkles, splat) done in 3.15.9; battle/shop panels and Event props still compile on first use.*
3. *(Done in 3.15.9, see NOTES 38.)* **Pre-rendered textures shipped as PNG/WebP** instead of painting 50
   canvases at boot (the gallery, posters, signs, skins). Cuts boot CPU and
   the canvas memory; needs a build step that runs the painters once (the
   harness can do it) and a loader. Medium change.
4. **Pre-merged geometry shipped as binary buffers**: the batcher's output
   is deterministic, so the merged batches can be stored and loaded instead of
   rebuilt. Largest boot win; bigger change, must keep the per-part slot
   mapping.
5. **Fewer programs**: 106 programs come from material variants (flat vs
   smooth, map vs none, fog on/off, vertex colours). Normalising a few
   variants would cut compile time at boot and state changes per frame.
6. **Frame rate** (closed by the author, 2026-10-28: not pursued, it adds GPU load): the game requests 72 Hz. Quest 2/3 support 90 Hz; with the
   CPU side this light, 90 Hz is plausible in normal play if the GPU keeps
   up, but it raises GPU load by 25% and must be measured on the headset
   first (T12). Not recommended before the flash issue is understood.

## 6b. Performance pass of 3.15.26 (NOTES 56)

"The Event" below is the planting event (GARDEN EVENT), not Sparkakus's Speech.

Done without visible change: P1 governor step-down after 36 over-budget
frames (was 72); P2 light-on shader variants compiled during loading (the
game's pre-warm had been throwing silently); P4 opacity-0 materials skipped
before each render; P5 creature ground-fit scan throttled; P6 back-face culling
for closed, outward, opaque meshes (the game had every material double-sided;
297k of 659k source triangles now single-sided, checked pixel-identical by
`tools/sides_check.js`). Tools:
`tools/event_probe.js` (what the Event adds to the frame, every 2 s); the
main-thread profile of the Event, with source excerpts, is in `tools/perf_report.js`.
Game logic with rendering stubbed: town 0.7 ms a frame, Event second half
1.8-2.1 ms (p99 4.7 ms) headless. Levers left that change the look, for the
author to decide after the headset readings: the Event's point light and
night lighting (the lit shaders' cost doubles while they are on), Lambert on
the garden flora, foveation at the start level, lower render scale.

Investigated after 3.15.26 and not done, with the reason:

- **Per-part culling inside batches.** Measured: when facing the town, 40-47% of
  the triangles in batches that pass whole-batch culling belong to parts outside
  the view (`cullgain` probe, 36 views). Collapsing those parts would save
  nothing on a tiled GPU: its binning pass already rejects off-screen triangles
  after a position-only vertex pass, which collapsed triangles cost too. Only
  fewer submitted vertices (per-part draw ranges, which undoes the batching)
  would help.
- **Freezing static scenery's matrices** (`matrixAutoUpdate = false`, about a
  third of the game logic's frame time goes to `updateMatrixWorld` over 1,800
  objects). Not safe from the code alone: parts of buildings animate and a
  frozen one would stop.
- **mediump fragment precision, Lambert for Phong, fewer lights, foveation at
  the start level, lower render scale**: each changes the look; the author
  decides after the headset readings.
- **Creature LOD** (a coarser blob march beyond 20-25 m): the one lever left
  for vertex cost that would be hard to notice; doubles the character build
  time unless built after the drop-in. Proposed, not built.
- **3.15.27 adds the frame-rate log line** so the next headset run measures
  itself (HEADSET_DIAG.md).

## 7. The performance report (3.15.27, NOTES 58)

`tools/perf_report.js` is the pass/fail performance stage of the full tier. It
boots once into VR and runs the game's situations in sequence, measuring each
the same way, and names the cause when a line is crossed:

- **Frame time split into script and GL.** The software GL here (SwiftShader)
  compiles its own pipelines on first use and blocks a GL call for seconds when
  it does (7 s after a dialogue advance, 20 s in the Event in one run), which
  is this machine, not the game. So the draw calls are stubbed by default: all
  other GL calls run (uniform and texture uploads), the renderer's counters are
  kept, nothing is rasterised. Script time then carries to a headset (about
  three times slower there); `--draw` rasterises for real when the GPU-side
  shape is wanted.
- **The cause.** The CDP profiler's top script functions by self time with a
  source excerpt, so a spike has a name (`updateMatrixWorld`, `Qe` the
  batcher's per-part placement, `Ae` three.js's projectObject, `bend` the
  Event's tentacles).
- **What the renderer created on the spot**: new shader programs (a compile
  is a 50-1,000 ms hitch on a headset, so any during play fails), textures,
  geometries, scene objects.
- **The scene's load**: draw calls, triangles (both eyes), visible transparent
  objects, lights, creatures within 25 m of the player, heap.
- **Lines**: shader compile during play; script p99 over 12 ms (16 in the
  Event); a script frame over 120 ms; 40% rise in p50 or p99 or 15% in
  triangles against `tools/perf_baseline.json` (written with
  `--update-baseline` on a known-good build). Triangles over 320k, transparent
  objects over 120 and draw calls over 200 are noted as GPU and CPU risks.

Result on 3.15.27 (headless, draws stubbed, baseline written from this run):

| Situation | script p50 / p99 / max ms | calls | tris (both eyes) | transp | creatures < 25 m | top script cost |
| --- | --- | --- | --- | --- | --- | --- |
| town, standing (spawn) | 2.1 / 3.5 / 7.3 | 66 | 160k | 89 | 2 | updateMatrixWorld 16%, Qe 16%, Ae 9% |
| town, walking | 2.1 / 6.6 / 13.1 | 64 | 123k | 89 | 0 | Qe 18%, updateMatrixWorld 17%, Ae 11% |
| town, among the creatures (centre) | 2.2 / 3.6 / 4.1 | 304 | 498k | 87 | 3 | Qe 17%, updateMatrixWorld 15%, Ae 11% |
| dialogue open | 2.2 / 5.5 / 7.2 | 280 | 473k | 88 | 3 | updateMatrixWorld 17%, Ae 14%, Qe 12% |
| shop panel | 2.6 / 5.8 / 14.9 | 378 | 485k | 92 | 2 | updateMatrixWorld 15%, Qe 9%, Ae 8% |
| battle panel | 2.3 / 5.5 / 14.7 | 302 | 498k | 89 | 1 | updateMatrixWorld 13%, Qe 10%, Ae 9% |
| the Speech | 2.2 / 4.1 / 7.1 | 302 | 433k | 98 | 1 | updateMatrixWorld 16%, Qe 12%, Ae 7% |
| the Event, 0-30 s | 2.6 / 7.4 / 63 | 370 | 532k | 75 | 11 | updateMatrixWorld 18%, Qe 9%, Ae 6% |
| the Event, 30-60 s | 2.8 / 6.5 / 10.3 | 388 | 506k | 75 | 11 | updateMatrixWorld 18%, Qe 9%, Ae 6% |
| the Event, 60-90 s | 3.6 / 6.7 / 12.5 | 384 | 506k | 78 | 11 | updateMatrixWorld 16%, bend 10%, Qe 7% |

What it says: no shader compiles during play anywhere (P2 holds); script cost
is 2-4 ms headless everywhere, so on a headset roughly 6-12 ms of the 13.9 ms
(72 Hz) frame, with `updateMatrixWorld` over the scene's 1,800 objects the
single largest item in every situation; the GPU-side load is the difference
between the spawn (66 calls, 160k triangles) and the town centre or the garden
(300-390 calls, 500k triangles both eyes, eleven creatures in range during the
Event). The author's 38 fps reading in the Event is consistent with GPU-bound
there: the Event adds the point light and night lighting on top of the heaviest
view. The 63 ms script frame at the Event's start is the setup frame (B17). *(Superseded: the 3.15.47 runtime
lines show the Event CPU-bound, section 13.)*

`tools/perf_log.js` reads the headset's own `perf` lines (HEADSET_DIAG.md) into
the same picture: frame rate by scene, the lowest readings with where the
player stood, the governor levels, a verdict against 60 fps with the likely
cause (triangles, draw calls, GPU-bound at the governor's floor).

## 8. Draw calls and the matrix update (3.15.28-3.15.29, NOTES 59-61)

Target: 72 fps (the headset's refresh rate, the author's aim); the Store's floor
is 60. `perf_log.js` reports both.

- **P8** (3.15.28): multi-material meshes draw one group per material instance;
  the garden plots go from six draws to two. Event frame 390 -> 340 draws (both
  eyes).
- **P9** (3.15.29): shininess and specular per batch part; whole scene 327 ->
  247 batchable draws per eye.
- **Matrix cache (not done).** An exact skip of `updateMatrix` and the world
  multiply for unchanged objects (position, rotation, scale, local and world
  matrices compared, a stamp on recomputed parents): bit-identical to three.js
  after 8 s of play, but 0.61 ms per scene update against 0.27 ms for three.js
  itself over 2,576 objects. V8 composes and multiplies faster than the
  comparisons; the cost is the walk, not the arithmetic.
- **P10** (3.15.30): batch geometry indexed (bit-identical vertices merged within
  a part): batch vertices 499,058 -> 215,258, same triangles, identical pixels.
- **Big meshes as batches of one (tried, reverted).** Routing the big
  non-indexed meshes (over the 4,000-vertex cap) through the batcher alone
  would index them too: 761k vertex runs -> 406k over the whole scene. Three
  costs: edge pixels changed (0.02%, single pixels where the garden plot meets
  the bed: the batch shader's transform path rounds depth differently), the
  spawn view submitted 56k more triangles (a 68,686-triangle mesh its own
  bounding sphere had culled was drawn), and the batching slice grew from 438
  to 738 ms. Not worth it; indexing those meshes needs to happen where they
  are built, with the game's code that edits them checked first.
- **P12** (3.15.31): indexed scenery, building and kiosk merges: 197
  geometries, vertex runs of meshes drawn as themselves 1,062,441 -> 576,758.
- **Ruled out, with numbers** (NOTES 63): transparent fill (0.04 layers per
  pixel), opaque overdraw (1.82, front-to-back saves 5%), the Event's point
  lights (off through the Event), garbage collection (2-3%), hidden geometry
  (0.4%).
- **Left, all of which change the look (the author's call):** level of detail
  for dense meshes (several creature and kiosk parts carry 9,000-40,000
  triangles for under 1,000 pixels at the census's resolution), anisotropy 16
  -> 8 on the large textures, fixed foveation from the start level, render
  scale. Multiview rendering (one draw for both eyes) would halve every draw
  call but needs a newer three.js or shader patches and an entry-script
  change, so it would ship first as an experiment APK.

## 9. Multiview experiment (NOTES 65)

Both eyes in one pass. Headless, same frames both ways: each eye matches the
classic path (bit-identical apart from rounding on a few right-eye pixels) and
draw calls halve: spawn 68 -> 34, town centre 264 -> 132, garden 320 -> 160,
the Event 244 -> 122. On the headset it removes half the draw submission (three.js
and the browser's GPU process) and, with MSAA, the per-frame resolve blit. It
does not reduce pixel shading. Ships as an experiment APK first (RELEASE.md 6);
the headset run decides whether it goes into the release.

## 10. The Event on the headset (3.15.33-3.15.34 headset run, NOTES 65-68)

Quest 3S, multiview live with 4x MSAA: town 72 fps at native scale (GPU
42-54% busy, CPU 41-52%, app GPU time 4.9-7.6 ms, from the author's OVR
Metrics video); the Event 58-65 fps with the governor at level 4 (full
foveation), 320-380 draws per frame. Headless with Quest-shaped eyes
(`GT_HEADSET_FOV=1`) at the logged positions reproduces it: 260-330 draws
and 440-580k triangles facing the garden, 66-147 facing away. In the heavy
views about 90 draws are creature parts and batches (eleven creatures in
the garden), the rest batches and one-off parts of the town and the Event's
plants.

The lever weighed next was texture identity: one-off parts mostly differ only in
which texture they use. Texture arrays (equal-sized textures stacked, the
part's slice in the spare per-part slot) would let them share draws,
identically. Whole-scene estimate in the Event, multiview draws: creatures
114 -> 86 and the town 126 -> 59, but only together with batching across
groups (the culling trade-off of P11); in a heavy view perhaps 15-20% of
the draws. **Closed by the author (2026-10-27), not built.** The risks that
decided it, most serious first: batching across groups loses per-group
culling (the reverted big-mesh attempt submitted 56k more triangles at the
spawn); each array's mipmaps are built by the headset's driver, so distant
textures could look slightly different, which the headless pixel test cannot
prove either way; repainted canvases (labels, HUD, emotes, panels) would
have to stay out, or each repaint becomes a copy that could land mid-frame
(the flash bug again); parts drawn through the batch transform round depth
differently (0.02% seam pixels in that attempt); texture memory doubles
until the originals are freed; new batch shader variants and runtime slot
swaps in the riskiest part of the renderer; and a payoff of 15-20% of the
draws in heavy Event views only if the Event is limited by draw submission.

## 11. After the headset run: 3.15.35-3.15.41 (NOTES 69-77)

Everything that leaves the picture identical had been done by 3.15.36; the author's requirement for the Event is
to stay steadily above 60 fps, aiming higher, and the author chose each change below.

| Change | Build | What it does | Visible? |
| --- | --- | --- | --- |
| B27 | 3.15.35, 3.15.39 | The Gem the Speech assembles is built and compiled during the warm-up, with and without the bulb's light, so its shader no longer compiles mid-Speech (a 50-1,000 ms stall). | No |
| P14 | 3.15.36 | The game's own multisampled depth buffer is discarded after the frame's last draw, so a tiled GPU stops writing about 28 MB of resolved depth back to memory every frame. | No |
| P16 (removed 3.15.43) | 3.15.37 | In the Event at the lowest quality level, under 62 fps for three seconds, the render scale drops to 0.9 until the Event ends. | Slightly softer, Event only |
| P17 (removed 3.15.43) | 3.15.38 | A Quest 3 starts the Event at 0.9 in one layer swap; under 60 fps at 0.9 the scale steps to 0.82; both end with the Event. | Slightly softer, Event only |
| P18 (removed 3.15.43) | 3.15.40 | The game's emergency drop (0.82 at about 45 fps), if it fires during the Event, ends with the Event, so the scale returns above 85% after it (VRC.Quest.Performance.4). | No |
| P19 | 3.15.41 | The Portal's blue light is held off while Sparkakus's bulb is lit, so no frame has two point lights (which would compile a third set of shaders for the whole town). | No (the lights are 16.3 m apart) |

Measured and not applied: skipping the scene root's per-frame matrix recompose (P15) leaves every world matrix
bit-identical but saves nothing (2.107 against 2.094 ms, alternated in one session; the walk over the objects is
the cost); indexing the creature meshes saves nothing (all but three drawn creature meshes are indexed already);
grouping draws by shader changes nothing (three.js already sorts opaque draws by program, material, then depth).
Texture arrays were closed by the author (section 10).

*P16-P18 were removed in 3.15.43 with every other render-scale change (the author: "close out that option"; F-B31,
section 13).*

**Estimates for the Event (superseded, NOTES 79):** the 3.15.41 run measured 55-61 fps at 0.9 and 58-65 at 0.82 on
the Quest 3S, so 17% fewer pixels bought 2-3 fps: the Event is limited by draw calls, and the pixel assumption below
was wrong. As estimated then (from the 3.15.33 run on the Quest 3S, 58-65 fps at
the lowest level, assuming three quarters of the Event's GPU time scales with pixels): Quest 3S, the first three
seconds about 58-65 fps, then 67-72 at 0.9; Quest 3, about 56-62 at 0.9, then 64-71 at 0.82. Reading a headset run:
RENDERING.md section 6, `perf_log.js` on the logcat.

**The performance report on a different machine** (NOTES 77). The 3.15.41 full tier first failed `perf_report.js`
in every situation by the same factor: its baseline came from 3.15.27, before multiview, on a faster machine, in
raw milliseconds. On one machine, back to back, 3.15.40 and 3.15.41 match within its noise:

| Situation | 3.15.40 script p50 / p99 ms | 3.15.41 script p50 / p99 ms |
| --- | --- | --- |
| town, standing | 6.0 / 15.4 | 5.8 / 21.8 |
| town, walking | 6.4 / 17.7 | 5.8 / 11.8 |
| town, among creatures | 6.1 / 10.5 | 7.1 / 14.9 |
| dialogue open | 6.5 / 14.6 | 6.2 / 14.8 |
| shop panel | 7.5 / 13.8 | 6.8 / 13.4 |
| battle panel | 7.5 / 15.3 | 6.1 / 11.6 |
| the Speech | 6.9 / 15.2 | 6.6 / 16.7 |
| the Event, 0-30 s | 6.7 / 15.3 | 6.8 / 14.9 |
| the Event, 30-60 s | 6.4 / 13.3 | 6.6 / 13.4 |
| the Event, 60-90 s | 7.9 / 17.2 | 8.0 / 16.2 |

No shader compiled during play in either. The report now scales its limits by machine speed (TESTING.md section
3), with a baseline written from 3.15.41, and 3.15.41 passes it.

## 12. The Event's pizza and textures made during play (NOTES 82)

The heaviest Event view the headset logged (at (-21, -5), 52-58 fps, 435-445 draws) reproduces headless at headset
field of view facing 225 degrees: 378-388 draws, 629k triangles (`draw_calls.js --event --at "-21,-5" --yaws 8`).
Of those, 56 were the Event's pizza: eight stacks of boxes round the garden and the pie (box, lid and eight slices of
four parts), built after the batcher ran, each part its own draw. P20 splits each stacked box into its card faces and
printed top and batches both groups: 378 -> 324 draws in that view (run-to-run, the batches drawn vary 75-108 with
where the creatures stand), with identical pixels (`opt_identity.js`: 92 Event views, 1,108 fewer draws).

| Tried | Result |
| --- | --- |
| P20: the pizza batched | 378 -> 324 draws in the heaviest view; identical pixels. Kept |
| The batcher's part limit 27 -> 33 (the uniform budget leaves 65 rows) | 382 -> 377 draws; some views more triangles (bigger batches cull worse). Dropped |
| Batching across neighbouring buildings (cells of 8, 12, 16 m) | 337 -> 332 at best: the scenery is already merged in a few big groups; half of all batches (68 of 136) are the creatures'. Dropped |
| One set of batches for all the creatures (each is now batched only with itself) | Heaviest Event view 334 -> 307 draws; but over 5 points x 8 headings: town 147 -> 145 draws for 264k -> 311k triangles (+18%), the Event 152 -> 146 for 294k -> 321k (+9%), since a batch spanning the town is drawn whenever one of its creatures is. Measured, not applied then; applied as P24 in 3.15.48 once the 3.15.47 log showed the GPU has room (section 13) |

What is left in that view (before P21 and P22, section 13): about 100 batches, 90 creature parts (Gooward alone 30, 26 of them translucent), 36
one-off parts of the garden's central group (each with its own texture, the closed texture-array question), and the
church, Mama Gorbo, Glyph, Mushroom and Anomalee parts. *(Since: P23 took the large garden meshes, P24 the
creatures, P25 Backpacka; section 13.)*

Textures made during play (F-B29, F-B30) cost a hitch each (a canvas drawn and up to 1 MB uploaded in one frame) as
well as being the flash lead; since 3.15.42 none is made (`texture_census.js`).

## 13. The headset's verdict, and 3.15.43-3.15.52 (NOTES 79-93)

**What the headset runs said** (Quest 3S, whose browser reports "Quest 3"). 3.15.41 (NOTES 79): the Event 55-61 fps
at scale 0.9, 58-65 after the step to 0.82. The frame rate follows the draw calls (correlation -0.80; triangles
-0.57): about 315-340 draws give 55-61 fps, 200-220 give 62-67. The deferupload run (NOTES 81): 408-445 draws at 52-58
fps in the heaviest Event view. So the levers are fewer draws and less work per frame, not fewer pixels.

| Change | Build | What it does | Visible? |
| --- | --- | --- | --- |
| F-B31 | 3.15.43 | No layer swap: native render scale at every quality level and in the emergency step; the governor changes foveation only, on the same layer (and no longer renders above native, 1.2 and 1.1, in town). The Event's own scale (P16-P18) removed. No texture upload inside an XR frame (uploads in a task after each frame). | No flashes from swaps or uploads; native sharpness in the Event |
| P21 | 3.15.43 | The Ancient (15 parts, 11.5k triangles) is left out of renders while the camera is at least 0.5 m outside the church. Proof: 17,045 views from outside, 3 from about 30 m showed one pixel with only the church drawn, none with the town (`ancient_check.js`). | No |
| P22 | 3.15.43 | Gooward's 26 translucent parts marked `mergeTr` (20 goo bubbles, two wings' crystals) merged per parent and material, ordered far to near before each draw: 26 draws to 3 (his 30 to 7). | No (the author: "he looks unchanged visually") |
| R2 | 3.15.45 | The game file minified. The same world object for object, bit for bit (`minify_identity.js`): no effect on draws or frame time; under 1% faster to load. | No |

Estimated effect against the author's last Event reading (52-58 fps at about 440 draws, scale 0.82; NOTES 83): P20
+3 to +5 fps (about 0.024 ms a draw), back to scale 1 -2 to -3, the upload changes about 0 on average but no more
one-frame spikes: net about +1 to +2 fps in the heaviest view, +3 to +5 where the pizza is in view. P21 and P22,
not in that estimate, save further draws in that view (the Ancient, 15 parts no longer drawn from outside, their draw count not measured on its own; Gooward, 23 fewer draws). The author's 3.15.45 headset run measures it (`perf_log.js`, RENDERING.md 6).

**Measured, nothing to remove.** The occlusion census (`occlusion_census.js`, both states, NOTES 86): of 653 judged
objects the only ones never seen from where the player can stand were the UFO's 40 parts, which the game keeps hidden
between flights (a hidden object costs nothing). Every other object is seen from somewhere. Small creature details
(Etcher's marks, Mama Gorbo's pins, Anomalee's cards, about 10 draws) would still show at Event distances (NOTES 85).

**The scenery cap** (NOTES 84, 90): the batcher refused scenery parts over 4,000 vertices, so nine large garden
meshes that share one material drew on their own; raising the cap to 60,000 saved 13 draws in the heaviest Event view
for 16k more triangles (+2.6%). Once an open lever; applied as P23 in 3.15.47 after the comparison over many views
(below).

**3.15.47 (NOTES 90).** The author's 3.15.46 run: below 60 fps when moving from the ring back to the dance floor
(x = -27). Headless along that path: 240-402 draws, 510-650k triangles facing the garden. P23 raises the batcher's
scenery cap to 60,000 vertices: 144 -> 134 draws a view, heaviest 402 -> 380, +10% triangles. F-B33 removes the
Event-start hitch (434 -> 67 ms headless). CPU per frame there, headless: three.js render 20 of 24.8 ms (its uniform
uploads mostly the software GPU's cost), matrix walk 2.6-3.4 ms, the batcher's pass 2.2 ms, culling 1.8 ms; a
memoised visibility walk in the batcher's pass was slower (2.12 -> 2.45 ms) and reverted.

**The 3.15.47 run: the Event is CPU-bound (NOTES 91).** Live log: town median 71.8 fps, the Event median 63.3 and
56.4 at worst, all four readings under 60 at (-24, -2), the south end of the dance floor, 330-370 draws. The
runtime's lines there: app GPU time 9.3 ms of a 13.9 ms frame, GPU 62% busy, the GPU clock not raised. So the Event is
limited by draw submission and script on the CPU; triangles cost little while the GPU has room.

| Change | Build | What it does | Visible? |
| --- | --- | --- | --- |
| P23 | 3.15.47 | The batcher's scenery cap 4,000 -> 60,000 vertices: on the ring-to-dance-floor path 144 -> 134 draws a view, heaviest 402 -> 380, +10% triangles. | No |
| F-B33 | 3.15.47 | The Event's start no longer rescans every creature's vertices: 434 -> 67 ms headless. | No |
| P24 | 3.15.48 | The creatures batched together (one pass over all of them): heaviest views at the author's low spots 296 -> 274 draws, +0.6% triangles. | No |
| F-B36 | 3.15.49 | The mipmap switch 2.6 s after entering VR in slices of at most 0.6 Mpx, 40 ms apart, instead of one stall. | No |
| P25 | 3.15.50 | Backpacka batched when built (he was built after the batching step): 714 -> 545 draws headless at the author's low spot while he is in view, about 83 fewer a frame on the headset. | No (at most 0.01% of pixels, none in areas) |

**Next CPU candidates** (NOTES 93; see section 14 for what was done since): the matrix walk (the largest CPU item
watching the Event from afar; P28 tried skipping far characters' poses on alternate frames and was removed: any fix must
apply every pose every frame), `bend` (Etcher's six tentacles, deformed for every move while the townsfolk
dance) and `gFit` (the ground fit of moving creatures, a vertex scan every other frame while they move).

## 14. 3.15.53-3.15.63: the Event from afar (the author's 56-59 fps on 3.15.58, 54 fps on 3.15.60)

| Change | Build | What it did | Visible |
| --- | --- | --- | --- |
| P26 | 3.15.54 | The pickups' instanced draws switched off while no pickup shows (the Event draws none of them). | No |
| P27 | 3.15.60 | The Event's plants drawn as their own meshes, not merged into a new batch inside the frame (8,000-25,000 vertices copied and uploaded each time a plant grew). | No |
| P28 | 3.15.60, **removed 3.15.62** | Far characters (over 20 m) posed every other frame. It left the Mushroom's raised pose applied on skipped frames, so he floated (F-B56). | Removed |
| P29 | 3.15.62 | The batcher's per-batch pass (matrices, visibility, colours; 1.8 ms a frame headless: scenery 0.9 ms over 790 parts, creatures 0.89 ms over 515) skips batches unchanged for 2 s on three frames of four. | No |
| F-B57 | 3.15.62 | The Garden flat, its rings, stepping stones and rock ring painted on one overlay: in the Event at headset field of view (`draw_calls.js --event`, 12 views) 113 -> 111 draws and 321k -> 311k triangles on average, 173 -> 165 draws and 452k -> 414k triangles looking at the Garden from afar, about 120 fewer parts in the batcher's pass, and the height follower's rock scan gone. | Yes (the author's request; kept) |
| P30 | 3.15.63 | The height follower samples the ground (19 lookups) again only after a walker has moved 5 cm (was every frame it moved: about 285 lookups a frame with the Event's walkers). | No |

Estimated together on the headset (headless script time scaled about three times): 1.5-3.5 ms a frame saved in the
worst view, against the 1.8 ms the 54 fps reading was short of 60 (16.7 ms); P28's removal gives back perhaps 0.5-1 ms
of its saving. To be confirmed by the author's next run. Collector pauses are not a factor: vignettes allocate 3 KB/s
(1.2% of main-thread time in the collector) and going in and out of the Cave 7 KB/s (1.0%), as in normal play (D5,
`alloc_probe.js --vignettes --cave`). For the Quest 3 (the same chip, about 30% more display pixels) the lever left
is its render scale: drawing the 3S's pixel count there (about 0.88) would match the GPU load measured on the 3S.

## 15. 3.15.65 on: the Event's CPU, measured (the author: "We need to keep the game at a 60 fps minimum", on the Quest 3 too)

`event_cpu.js` at the author's low spot (-33, -7) facing the Event (248 draws), headless: three.js's render is about 75%
of the main thread's busy time, of which drawing the list (`Ct`: per draw, program and uniform setup, about 31 us a draw
headless) is about 50%; the matrix walk about 16% (2,577 nodes a frame; the ground fit `kt` forces 11 creature subtrees,
885 nodes); culling about 10%; the batcher's pass about 9%; the game's update about 7.5%. No single hot spot is left
inside the per-draw path, so the draw count is the lever: at the heaviest view 265 objects are drawn, nearly all 25 m or
more away (scenery batches 88, creature parts 68, other textured 69, other plain 40).

| Change | Build | What it does | Visible |
| --- | --- | --- | --- |
| P31 | 3.15.65 | Culling skips subtrees that draw nothing (1,482 of 2,460 nodes): 1.37 -> 1.26 ms headless. | No (pixel-identical) |
| P32 | 3.15.66 | The matrix walk returns at the town's still top-level groups (audited 150 nodes a frame; a group that moves is walked every frame from then on). | No |
| P33 | 3.15.66 | The fade groups (each kiosk and the gazebo; every tree with the robin) fade out over 10 s once the Event's mist is up and back after it (RULES.md 26). | Yes, by the author's design |

Tried and dropped: batching scenery across groups by 16 m cells (265 -> 258 draws: the one-off draws have textures of
their own); hiding objects under a few pixels across (18 draws at the heaviest view, and they would pop).

`event_sweep.js` (29 views from 10 to 40 m in 8 directions, facing the Garden): 214 draws on average, 280 at the
heaviest (the south-west corner). With the park's six stands (not the church), its three big trees and the robin hidden
(the author's proposal): 174 on average (-19%), 216 at the heaviest (-23%); the saving grows with distance (7-48 draws a
view at 10 m, 36-64 at 40 m). Next: fade them out and back during the Event (P33), and the matrix walk's still groups
(P32).

**4.0.0 against 3.15.65** (quiet machine, multiview, headset field of view; the Event with the mist full):

| Measure | 3.15.65 | 4.0.0 |
| --- | --- | --- |
| `event_sweep.js`, 29 views from 10 to 40 m | 216 draws, 11.0 ms render | 186 draws (-14%), 9.4 ms (-15%) |
| `event_cpu.js` at the south-west corner (-28.3, -28.3), the heaviest | 258 draws, 16.0 ms busy a frame | 202 draws (-22%), 14.2 ms |
| `event_cpu.js` at the author's low spot (-33, -7), a light view (three runs each) | 39 draws, 9.5-10.1 ms busy | 38-39 draws, 10.5-11.2 ms |
| `.runs/frame_parts.js` at the low spot: three.js's render / the batcher's pass a frame | 5.36 / 1.36 ms | 5.32 / 1.47 ms |

The light view's difference is the batcher's pass over eight more batches (131: the seven new clouds, the carved trees
and gazebo; 0.11 ms) and the fade groups' update (0.02 ms); the profiler's busy figure moved more than that between
runs. The heaviest views keep most of their draws when the player stands within 14 m of a park tree (every tree
returns with it: one group) or a kiosk.

Estimate for the headset (from the author's 3.15.58 reading, CPU 12-14 ms of the 13.9 ms frame at the low spot, scaled
by the measured savings; the GPU cannot be measured headless): everyday play 72 fps on both; the Event's typical views
72 on the Quest 3S and 68-72 on the Quest 3; its heaviest view 65-72 on the 3S and 62-70 on the Quest 3 (the same chip,
about 30% more pixels). None under 60 expected; a headset run (TASKS T3) confirms.

**4.0.1** (A26: the fade groups stay out until the Event ends, nothing comes back as the player nears it; measured
after a container restart, so compare the draws, which do not depend on the machine): `event_sweep.js` 169 draws a
view on average (186 in 4.0.0, 216 in 3.15.65), the heaviest view 214 (276, 277); `event_cpu.js` at the south-west
corner 188 draws (202, 258), at the low spot 31 (38, 39). The near rule had been bringing the corners' kiosks and the
trees back, and the west kiosks at the low spot. Estimate: everyday play 72 fps on both; the Event's typical views 72
on the Quest 3S and 70-72 on the Quest 3; its heaviest views 70-72 on the 3S and 66-72 on the Quest 3.
