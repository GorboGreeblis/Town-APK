# How a frame is drawn (3.15.45)

A map of the render path in the shipped build: what runs, in what order, which file owns it, and the rules
that keep it fast and flash-free, each with the test that enforces it. Details and history are in NOTES.md
(numbers in brackets), the change list in FIXES.md, the measurements in PERF.md.

## 1. The pieces

| Piece | Where | What it does |
| --- | --- | --- |
| Loopback server | `android/.../GameServer` | Serves the one-file game at `http://localhost:17777/` to the Quest Browser's immersive activity; idle after the first transfer. |
| Entry script | the head script at the top of the game file (FIXES.md, entry edits) | Requests the session early (`sessiongranted`), shows the loader in compositor layers, hands the session to the game when loading ends. Any change here ships first as an experiment APK (RELEASE.md 6). |
| Layers shim | in the head script of the game file [42, 47] | The game's three.js only knows `baseLayer`, which the `layers` feature forbids. The game gets a facade session whose `baseLayer` is a projection layer; every frame callback is wrapped in `begin(frame)` / `end()`. The layer is never swapped since 3.15.43 (F-B31; the swap code that kept the old layer in front until the new one was drawn is unused, `maxLayerRebuilds: 0`). |
| Multiview | in the head script, and the multiview edits to the bundled three.js in the game file [65, 67] | Both eyes in one pass into a texture-array projection layer. The release path since 3.15.34. |
| Batcher `gcEB` | the game, plus P8-P10, P12 | Merges opaque Phong/Lambert/Basic meshes into batches; per-part transform, colour, shininess and specular live in a uniform array read by a patched vertex shader. |
| Quality governor `Ge` | the game, plus P1 [47], F-B31 [83] | Frame-time average against the 72 Hz budget; five levels, all at the native render scale (`quality: [1, 1, 1, 1, 1]`), fixed foveation [0, 0, 0, .5, 1]. The planting Event locks the lowest level from its first frame [71]. Emergency (1.6x the budget): the lowest level's foveation, still at native scale (`sosScale: 1`). Since 3.15.43 (F-B31) only foveation changes, on the same layer; the Event's own scale steps and P18 (P16-P18) were removed. |

## 2. Boot to first frame

1. The page loads; the entry script asks for the session with the `layers` feature and draws the loader
   into a cube layer (sky) and a quad layer (panel). The compositor redraws them every vsync, so the
   loader stays smooth while the page is busy.
2. The game builds the world in slices (NOTES 45, 49). Textures come pre-rendered from `assets/tex/`
   (`prerender_textures.js`) rather than painted at boot.
3. The batcher merges the scenery. Parts per batch:
   `N = floor((MAX_VERTEX_UNIFORM_VECTORS - 96 - 24 if multiview) / 5)`. That is 27 on a Quest in
   multiview and 32 classic. 96 vectors are kept for three.js's own uniforms and 24 for the right eye's
   matrices; each part uses 5 rows.
4. Multiview is decided once, at the first GL use (`mvPlanFor`). It needs a layers session, WebGL 2 and
   `OVR_multiview2`, plus `OCULUS_multiview` when the context is antialiased (the headset's 4x MSAA). The
   boot log records the decision and a `gpu:` line with the real limits and the device.
5. **Warm-up.** Every shader variant the game will use (lights on and off, labels, sparkles, panels, the
   Event) is compiled now and its textures uploaded, rendering into a 4x4 two-layer multiview target
   (`mvScratchFor`), so entering VR compiles nothing (P2).
6. The game's first frame replaces the cube and quad layers with the projection layer (`projection layer
   live, scale ..., msaa 4` in the log).

## 3. One frame, in multiview

1. The browser calls the shim's wrapped frame callback; `begin(frame)` attaches this frame's eye texture
   array (one slice per eye) to the shim's framebuffer.
2. Game logic: NPCs, creatures, pickups, the governor. About 2-4 ms headless, roughly three times that on
   the headset (PERF.md 7).
3. `renderer.render` is wrapped by `mvWrap`:
   - **No upload inside the frame.** A texture marked `needsUpdate` during multiview play is held back: three.js
     draws its old content for this frame, and it is uploaded in a task right after the frame is submitted (an
     object whose texture was never uploaded is skipped for that one frame). The VR panels paint into the next of
     three canvases and swap once it is uploaded. Since 3.15.43 (F-B31, [80], [81]); 3.15.34's fix uploaded such
     textures before the frame's first draw [67]. Since F-B29/F-B30 no texture is made during play at all.
   - **Draw.** three.js draws each object once with the left camera. Multiview programs pick each eye's
     matrices by `gl_ViewID_OVR`. The left eye reads the uniforms three.js always uploads; the right eye
     reads its own model-view, normal, view and projection matrices, computed on the CPU exactly as
     three.js would for that eye. Lights for the right eye are moved in the shader.
   - **Watch.** While the frame draws (the `mvInFrame` flag), the following are counted as hazards:
     - any texture upload, mipmap build or copy;
     - a pixel read or blit;
     - a framebuffer bind other than the shim's own.

     Programs compiled during the frame are also counted and named.
4. `end()` has nothing to resolve in multiview: the MSAA resolves on the tile. It discards the depth buffer
   (P14: `invalidateFramebuffer`), so the tiled GPU does not write it back to memory; nothing reads it after
   the frame. The classic path blits its MSAA renderbuffer here.

The classic fallback (no `OCULUS_multiview`, an incomplete framebuffer, or the `nomultiview` experiment)
draws every object twice, once per eye, into an MSAA renderbuffer and blits at the end. It is pixel-identical
per eye and kept working by the tests below.

## 4. The rules, and what enforces them

| Rule | Why | Enforced by |
| --- | --- | --- |
| No texture upload, mipmap, copy, read, blit or foreign framebuffer bind while a multiview frame draws. | The GPU saves and reloads the half-drawn tile and the frame comes back washed out (the flashes, [67]). | `multiview_check.js` (pickups, dialogue, shop, battle, Speech, Event; fails on any). On the headset: `multiview: ... while a frame draws` lines. |
| No shader compiled during play. | A compile on a Quest stalls 50-1,000 ms. | `multiview_check.js`, `perf_report.js`, `test_content.js` (any program compiled during its play fails it). On the headset: `multiview: N shader program(s) compiled during play: names`. |
| Every lit material has its programs for every light state the game can reach, compiled at load; things built on first use (the Gem, Backpacka) are built and compiled out of sight during the warm-up. | Three.js puts the number of point lights into every lit shader's key, so a material first drawn under the Portal's light or the bulb needs its own variant (B27 was the Gem under the bulb [74]). | `warm_coverage.js` (standard tier): compiles the scene under each state and fails on a lit material that gets a new program. |
| At most one point light at a time: the Portal's blue light is held off while Sparkakus's bulb is lit (P19). | Both together would need a third set of programs for the whole town, which nothing warms; the lights are 16.3 m apart and the Portal's reaches 11 m, so nothing near the bulb was lit by the Portal [76]. | `warm_coverage.js` opens the Portal, lights the bulb and checks every rendered frame. |
| Each batched part's uniform slot holds exactly its object's world matrix, colour, shininess and specular (five vec4 in the release); a part dropped from its batch is zeroed. | A stale or shifted slot draws a part in the wrong place or colour for a frame. | `test_lod.js` (after every rendered frame of 20 s, every part). |
| The far-detail kiosk shows one model at a time: the full one within 62 m, the coarse one beyond 66 m, unchanged in between. | Two at once fight in depth; none leaves a hole; swapping inside the band flickers. | `test_lod.js` (walking out to 84 m and back). |
| The game's own multisampled depth is discarded after the frame's last draw, never during it (P14). | A tiled GPU would otherwise write it back to memory every frame (about 28 MB); during the frame it would discard the picture. | `multiview_check.js`: its hazard watch fails on a discard during a frame (every run); that the discard runs every frame is checked only with `GT_LAYER_DEPTH=0`, by hand (the passes run with the fake layer's own depth). |
| Every program fits the Quest's 256 vertex uniform vectors. | Headless allows 4096. On the headset an overflow fails to link and the batcher turns itself off. | `uniform_budget.js` (`GT_DEVICE`, multiview and classic). |
| Multiview and classic draw the same pixels per eye. | Multiview must not change the look. | `multiview_check.js` pixel compare (spawn, town centre, garden, Event). |
| A performance change that claims no visible change is pixel-identical. | The author's rule: as little visual change as possible. | `opt_identity.js` (on/off switches in the same frame, full tier), `sides_check.js` (P6), `test_bend_exact.js` (P13); `geom_compare.js` by hand when model builders change. |
| Creature geometry stays non-indexed. | The ground-fit scan samples every 6th vertex; indexing would move the creatures (P12 excludes them). | The `gcIdx` creature exclusion in P12; `geom_compare.js` by hand. |
| No texture is made during play. | A texture made mid-play is what the flashes came with (F-B29/F-B30, [82]). | `texture_census.js` (standard tier). |
| The projection layer is never swapped and the render scale stays native; the governor changes foveation only. | The author's rule (RULES.md 10, F-B31). | `test_governor.js` (standard tier). |
| The shipped copies are the game file. | One source: `tools/uncompressed.html`, edited directly. | `sync_game.py --check` (quick tier, pre-commit hook), `check_apk.sh`. |
| The game file is fully minified; the compressed version unpacks to it exactly. | The author's rules (RULES.md 19, 20). | `minify_game.js --check`, `build_compressed.js --check` (quick tier, pre-commit hook, `build.sh`); `test_compressed.js`. |

## 5. Where to change what

Everything is changed in one place, the game file `tools/uncompressed.html` (since 3.15.43, NOTES 87; minified since
3.15.45: edit it in place in the same style); then `tools/build.sh --bump` minifies it again, copies it to
`index.html` and the APK, re-paints `tex/`, raises the version, builds the APK and the compressed version and runs
the checks, and an entry in FIXES.md records the change, its ID (B, P, L, D, R), why, and how it was proven.

- **A game fix or a performance change**: edit the game file. If it claims no visible change, give it a switch and
  add it to `opt_identity.js`.
- **Anything in the head script, the loader or VR entry**: the head script at the top of the game file. Ship it
  first as an experiment: add a variant to `experiment.py` and build it with `build_experiment.sh NAME`.
- **The multiview shader macros or the per-eye matrices**: the multiview edits to the bundled three.js in the game
  file (search for `GC_MULTIVIEW`). Run `multiview_check.js` and `uniform_budget.js`.
- **A new texture that changes during play**: nothing to do, as long as it is marked with
  `texture.needsUpdate = true`. Direct `gl` uploads during a frame will fail `multiview_check.js`.

## 6. Reading a headset run

`adb logcat -d -s GreeblisServer > run.txt; node tools/perf_log.js run.txt` (HEADSET_DIAG.md). The lines that
describe the render path:

- `multiview planned (...)` or `multiview not used (...)`, then `gpu: ...`: the decision, the GPU's real
  limits and the device.
- `projection layer live, scale S, msaa M, multiview true|false`: the layer (scale 1 since 3.15.43). A
  `projection layer swapped to scale ...` line should never appear since then (F-B31: no swaps).
- `perf fps=... dev=...`: the frame rate by scene, with the governor level and where the player stood.
- `multiview: ...`: any hazard or compile during play. There should be none.

For a recording: `python3 -I tools/video_check.py capture.mp4 --ovr` lists flash frames and crops the OVR
Metrics overlay (FPS, CPU and GPU use, the app's GPU time per frame).
