# Performance analysis of the APK build (T11)

Started as an analysis (sections 1-6); sections 6-10 record the changes that
were applied, each listed in FIXES.md. The render path itself is described in
RENDERING.md. Numbers from the headless harness (software GL) are marked as such: draw calls, triangle counts, program counts
and JS time are meaningful there, GPU time is not. Headset numbers are still to
be collected (T12).

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

See `BUGS.md` B12 and `NOTES.md` item 32 for the flash investigation. The
hitch probe (`tools/hitch_probe.js`) reports what each action creates on the
GPU (programs, textures, geometries) and the frame-time spike around it
(software GL; spikes are relative):

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
`tools/event_probe.js` (what the Event adds to the frame, every 2 s) and
`tools/event_profile.js` (main-thread profile before and during the Event).
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
view. The 63 ms script frame at the Event's start is the setup frame (B17).

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
