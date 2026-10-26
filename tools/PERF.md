# Performance analysis of the APK build (T11)

Analysis only; nothing here is applied. Numbers from the headless harness
(software GL) are marked as such: draw calls, triangle counts, program counts
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
| First blossom pickup of the session | 0 | 14 | 57 | 78 ms (all 9 frames over 2x) |
| Acorn pickup, later pickups, new label text | 0 | 0 | 0 | none |
| Dialogue box open | 0 | 0 | 0 | 20 ms vs 15 |
| Battle panel open | 1 | 1 | 1 | 1,154 ms vs 12 (shader compile) |
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
3. **Pre-rendered textures shipped as PNG/WebP** instead of painting 50
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
6. **Frame rate**: the game requests 72 Hz. Quest 2/3 support 90 Hz; with the
   CPU side this light, 90 Hz is plausible in normal play if the GPU keeps
   up, but it raises GPU load by 25% and must be measured on the headset
   first (T12). Not recommended before the flash issue is understood.
