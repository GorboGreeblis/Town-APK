# How a frame is drawn (4.0.61)

A map of the render path in the shipped build: what runs, in what order, which file owns it, and the rules
that keep it fast and flash-free, each with the test that enforces it. Details and history are in NOTES.md
(numbers in brackets), the change list in FIXES.md, the measurements in PERF.md.

## 1. The pieces

| Piece | Where | What it does |
| --- | --- | --- |
| Loopback server | `android/.../GameServer` | Serves the one-file game at `http://localhost:17777/` to the Quest Browser's immersive activity; idle after the first transfer. |
| Entry script | the head script at the top of the game file (FIXES.md, entry edits) | Requests the session early (`sessiongranted`), shows the loader in compositor layers, hands the session to the game when loading ends. Changes go straight into the main build (RULES.md 22); test them with `test_entry.js` first. |
| Layers shim | in the head script of the game file [42, 47] | The game's three.js only knows `baseLayer`, which the `layers` feature forbids. The game gets a facade session whose `baseLayer` is a projection layer; every frame callback is wrapped in `begin(frame)` / `end()`. The layer is never swapped since 3.15.43 (F-B31; the swap branch that kept the old layer in front until the new one was drawn was removed in 4.0.14, L1). |
| Multiview | in the head script, and the multiview edits to the bundled three.js in the game file [65, 67] | Both eyes in one pass into a texture-array projection layer. The release path since 3.15.34. |
| Batcher `gcEB` | the game, plus P8-P10, P12, P20, P23-P25, P27, P29 | Merges opaque Phong/Lambert/Basic meshes into batches; per-part transform, colour, shininess and specular live in a uniform array read by a patched vertex shader. Scenery parts up to 60,000 vertices (P23, 3.15.47; 4,000 before); the creatures in one pass together (P24, 3.15.48); a model built after the batching step (Backpacka) is handed to the batcher when it is built (P25, 3.15.50). Culling skips subtrees that draw nothing (P31, 3.15.65); the matrix walk skips the still top-level groups, audited round-robin (P32, 3.15.66); a group the Event fades hides and shows with its batches woken (P33, 3.15.66). Since 4.0.47: the townsfolk wholly outside both eyes' views skip the matrix walk, culling and batch work (P34); the pass skips a part whose world-matrix version, material, shape, colour and visibility are as at its last full check, with a full check every 60 frames (P38); a moving part's matrix alone is written when its colour is unchanged (P43); a moving part's material and shape are checked every 4th frame (4.0.56) and still ("cold") batches every 8th, woken at once when their characters are shown or hidden (4.0.53-4.0.55); the characters' painted textures are layers of two texture arrays, so parts that differ only in their texture share a batch (P44, 4.0.52); near-identical materials are keyed alike, the characters' (P47) and the scenery's (4.0.55); batch shapes are kept by their contents and reused, with spares for a second Event at once (S42, B101). |
| Load-time merges | the game, P48-P51 (4.0.59-4.0.60) | After the batching step: each building's static painted panels with one material drawn from one sheet (P48, panel sheets), its see-through panes with one material merged (P49), Mama Gorbo's three CPU-reshaped goo tubes as one shape (P50). Older: the multi-material merger (`__gtMM`, at every load-time warm-up and every 120 frames) gives a mesh carrying several materials a copy with one draw group per distinct material. Each merged shape is handed to the Event fade groups that held its pieces (B122), and anything the game hides or shows in play (the shyness book) is kept out of the merges (B120). Switches `window.__gcAtlas`, `__gcGlass`, `__gcTubes` (false before load turns one off). |
| Far characters and details | the game, P45, P46 (4.0.53-4.0.59) | A character in view is posed (matrix walk, ground fit) every other frame from 10 m and every third from 20 m, half of them each frame, drawn at the pose of its last posed frame (P45; Fortizmo every frame while her horn is up, B114); its unbatched parts under 5 px across are hidden from 18 m (4.0.55, 25 m until 4.0.59). Unbatched static details under 5 px across at the headset's resolution are not drawn until they pass 5.5 px (P46, everywhere since 4.0.55). The author's relaxation of RULES.md 31 for the frame rate. |
| three.js patches | the bundled three.js in the game file, P36-P41 (4.0.48-4.0.51) | The opaque draws grouped by the program actually set (P36: the bundled version sorted by a field it never sets); UV transforms only when they change (P37); the lights' view directions and the second eye's offset once a draw list, normal matrices only where a shader reads them (P39); vertex layouts checked by a version, the lights' update flags set only on change, the shader hold's check kept while nothing it reads changes (P40); a shape's per-frame update check stamped on the shape (P41). Each has a `window.__gc...` switch (FIXES). |
| Frame governor `Ge` | the game, plus P1 [47], F-B31 [83], L1 | Frame-time average against the 72 Hz budget (the perf line's fps) and a frames-over-budget flag that only logs; fixed foveation one value, `t.xr.foveation` (0), set on the layer once at VR entry and never changed (F-B83, 4.0.13; before it the levels set 0, 0, 0, 0.5, 1 and full foveation stayed on after the first Event: B52). The five quality levels and their stepping were removed in 4.0.14 (L1): they changed nothing since F-B83. The planting Event's far-object safeguard (the far plane at `finaleFar`, the far scenery fades) keys on the Event alone [71]. Since 3.15.43 (F-B31) the layer is never swapped; the render scale is native. |

## 2. Boot to first frame

1. The page loads; the entry script asks for the session with the `layers` feature and draws the loader
   into a cube layer (sky) and a quad layer (panel: the title, the progress bar and the version in its bottom right,
   A18). The compositor redraws them every vsync, so the loader stays smooth while the page is busy.
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
   (`mvScratchFor`), so entering VR compiles nothing (P2). Every texture in the scene (hidden objects too) and
   every painted texture is uploaded here; the panels upload their canvases at the VR entry, outside any frame
   (F-B35); the gallery mural comes from `tex/` (F-B34) and the murals' placeholders are uploaded here, without
   mipmaps (F-B54). Every geometry, the batcher's parked sources included, is on the GPU before the first headset
   frame (F-B48).
6. The game's first frame replaces the cube and quad layers with the projection layer in the session's layer list
   (`projection layer live, scale ..., msaa 4` in the log). The loader's layers and its WebGL context are kept, not
   destroyed, for the whole session (B96, 4.0.34): B75 (4.0.27) destroyed them 10 s after the takeover, and after the
   headset slept the browser kept re-making their swapchains until the headset's memory ran out; that release is
   reverted for good (RULES.md "Decisions"). Every build requests the `layers` feature and draws through the
   projection layer; there is never a no-layers build (RULES.md 29).
7. Every texture gets mipmaps and 4x anisotropy while loading, uploaded once by the warm-up (F-B40; `mipmaps on: N
   textures set while loading` in the log). The sliced pass 2.6 s after VR entry (F-B36, 3.15.49) remains as a
   backstop and finds nothing; since 4.0.14 (S20) leaving VR keeps the mipmaps, so a second entry uploads nothing
   either.

## 3. One frame, in multiview

1. The browser calls the shim's wrapped frame callback; `begin(frame)` attaches this frame's eye texture
   array (one slice per eye) to the shim's framebuffer.
2. Game logic: NPCs, creatures, pickups, the governor. About 2-4 ms headless, roughly three times that on
   the headset (PERF.md 7); the headset's performance log measured the game's whole CPU a frame (logic and render)
   at a median of 8-10 ms in 4.0.50-4.0.52 (PERF.md 16). While the game is paused (the system menu, no input left, the
   window blurred, the headset off: GAME.md "Boot and VR entry") the logic is skipped and the frame is still drawn.
3. `renderer.render` is wrapped by `mvWrap`:
   - **No upload inside the frame.** A texture marked `needsUpdate` during multiview play is held back: three.js
     draws its old content for this frame, and it is uploaded in a task right after the frame is submitted (an
     object whose texture was never uploaded is skipped for that one frame). The VR panels paint into the next of
     three canvases and swap once it is uploaded. Since 3.15.43 (F-B31, [80], [81]); 3.15.34's fix uploaded such
     textures before the frame's first draw [67]. Since F-B29/F-B30 no texture is made during play at all.
   - **Holds.** Three guards back the warm-up up. An object whose geometry was never uploaded is held back for the
     frame and uploaded right after it (F-B51, `geometry held for one frame`); one whose first draw would compile a
     new shader program is held and its program compiled after the frame (S2, `shader held for one frame`); a
     character the player's head is inside is hidden for the frame (S1, `head inside N character(s)`), and a
     draw hook that throws is logged and skipped rather than ending the frame (S1, `[draw hook]`).
   - **The clear.** The frame's colour, depth and stencil are cleared each frame. The colour is a muted ground green
     outdoors (#6f8a78) and black in the Cave (S33, 4.0.27; black everywhere from S18 to 4.0.26, the sky's near-white
     before that): the sky sphere covers every pixel, and a lost draw would show a flat tone close to the scene's
     brightness. 4.0.24's no-clear (S30) was taken out in 4.0.25 (B90) and is closed for good. The layer's
     `end` flushes the context after the draw (S18), so the frame's commands are submitted before the hand-over.
   - **Draw.** three.js draws each object once with the left camera. Multiview programs pick each eye's
     matrices by `gl_ViewID_OVR`. The left eye reads the uniforms three.js always uploads; the right eye
     reads its own model-view, normal, view and projection matrices, computed on the CPU exactly as
     three.js would for that eye. Lights for the right eye are moved in the shader.
   - **Watch.** While the frame draws (the `mvInFrame` flag), the following are counted as hazards:
     - any texture upload, mipmap build or copy;
     - a pixel read or blit;
     - a framebuffer bind other than the shim's own.

     Programs compiled during the frame are also counted and named.
4. **The snap turn** is instant (one frame; RULES.md 27). 4.0.31-4.0.34 made it inside a five-frame blink on the head
   guard's sphere (S37); the author found it did not stop the flashes and asked for it out (4.0.35). The head guard
   (the view dimming to black as the head goes into a wall, B47) is the only darkening of the view left.
5. `end()` has nothing to resolve in multiview: the MSAA resolves on the tile. It discards the depth buffer
   (P14: `invalidateFramebuffer`), so the tiled GPU does not write it back to memory; nothing reads it after
   the frame. The classic path blits its MSAA renderbuffer here.

The classic fallback (no `OCULUS_multiview`, an incomplete framebuffer, or the `nomultiview` experiment)
draws every object twice, once per eye, into an MSAA renderbuffer and blits at the end. Textures changed since
the last frame are uploaded before the frame draws, as on multiview (F-B36). It is pixel-identical per eye and kept
working by the tests below.

## 4. The rules, and what enforces them

| Rule | Why | Enforced by |
| --- | --- | --- |
| No texture upload, mipmap, copy, read, blit or foreign framebuffer bind while a multiview frame draws. | The GPU saves and reloads the half-drawn tile and the frame comes back washed out (the flashes, [67]). | `multiview_check.js` (pickups, dialogue, shop, battle, Speech, Event; fails on any); the harness's frame-hazard watch in every test, on both paths (`run_tests.sh` fails the pass, NOTES 91); `event_start_check.js` around the Event's first start. On the headset: `multiview: ... while a frame draws` lines. |
| No shader compiled during play. | A compile on a Quest stalls 50-1,000 ms. | `multiview_check.js`, `perf_report.js`, `test_content.js` (any program compiled during its play fails it); `test_shaderhold.js` (a missed program is compiled between frames, S2). On the headset: `multiview: N shader program(s) compiled during play: names`. |
| Every lit material has its programs for every light state the game can reach, compiled at load; things built on first use (the Gem, Backpacka) are built and compiled out of sight during the warm-up. | Three.js puts the number of point lights into every lit shader's key, so a material first drawn under the Portal's light or the bulb needs its own variant (B27 was the Gem under the bulb [74]). | `warm_coverage.js` (standard tier): compiles the scene under each state and fails on a lit material that gets a new program. |
| At most one point light at a time: the Portal's blue light is held off while Sparkakus's bulb is lit (P19). | Both together would need a third set of programs for the whole town, which nothing warms; the lights are 16.3 m apart and the Portal's reaches 11 m, so nothing near the bulb was lit by the Portal [76]. | `warm_coverage.js` opens the Portal, lights the bulb and checks every rendered frame. |
| Each batched part's uniform slot holds exactly its object's world matrix, colour, shininess and specular (five vec4 in the release); a part dropped from its batch is zeroed. | A stale or shifted slot draws a part in the wrong place or colour for a frame. | `test_lod.js` (after every rendered frame of 20 s, every part). |
| Nothing new is uploaded inside a headset frame: new geometry and new programs are held for one frame (F-B48, F-B51, S2). | A first upload or compile inside a frame stalls it or washes it out (the flashes at Nextessa and the courier). | `test_firstdraw.js`, `test_shaderhold.js` (standard tier); the flight recorder on the headset. |
| No index buffer is bound outside three.js's own draw setup while a vertex array object is bound (the game's between-frame upload unbinds it first, F-B61). | In WebGL 2 the binding is stored in the bound vertex array object; three.js caches those per object and does not bind an index buffer again, so that object draws with the wrong indices (or not at all) from then on. | The WebGL error check at the end of every test (`lib/harness.js`; `GT_GLERR=1` names the call and object); `multiview_check.js` (no GL error, pixel match). |
| A texture disposed before VR is never uploaded again (it leaves the head script's pending sets on its `dispose` event, F-B62). | The pending set is uploaded before the first headset frame draws, so a disposed texture there is made again inside that frame. | `test_standalone.js` (fails on any frame hazard; the standalone mural is where it happened). |
| The far-detail kiosk shows one model at a time: the full one within 62 m, the coarse one beyond 66 m, unchanged in between. | Two at once fight in depth; none leaves a hole; swapping inside the band flickers. | `test_lod.js` (walking out to 84 m and back). |
| The game's own multisampled depth is discarded after the frame's last draw, never during it (P14). | A tiled GPU would otherwise write it back to memory every frame (about 28 MB); during the frame it would discard the picture. | `multiview_check.js`: its hazard watch fails on a discard during a frame (every run); that the discard runs every frame is checked only with `GT_LAYER_DEPTH=0`, by hand (the passes run with the fake layer's own depth). |
| Every program fits the Quest's 256 vertex uniform vectors. | Headless allows 4096. On the headset an overflow fails to link and the batcher turns itself off. | `uniform_budget.js` (`GT_DEVICE`, multiview and classic). |
| Multiview and classic draw the same pixels per eye. | Multiview must not change the look. | `multiview_check.js` pixel compare (spawn, town centre, garden, Event). |
| A performance change that claims no visible change is pixel-identical; since 4.0.48 every one is tested against the build before, the same frame with its switch off and on (RULES.md 31: a draw-order tie may change up to 4 px a view; the changes the author accepted, P45 and P47, carry their own allowance). | The author's rule: as little visual change as possible. | `pixel_ab.js` (both eyes, the town's slowest spots and the Event's), `render_ab.js` and `frame_parts.js` (the speed of both sides); `opt_identity.js` (on/off switches in the same frame, full tier), `sides_check.js` (P6), `test_bend_exact.js` (P13); `minify_identity.js BEFORE AFTER` by hand when model builders change (the whole built scene, bit for bit). |
| Every load-time merged shape fades with its building in the Event; nothing the game hides or shows in play is merged. | A merged panel kept solid while its building faded (B122); a taken book stayed drawn in its sheet (B120). | `test_merges.js`, `test_shybook.js` (standard tier). |
| A character skipped or posed at half rate is never seen out of date. | A skipped character in view, or a pose that sets matrices after the walk on a skipped frame, draws in the wrong place (B114: Fortizmo's arms). | `test_offview.js`, `test_far_pose.js` (standard tier). |
| Creature geometry stays non-indexed. | The ground-fit scan samples every 6th vertex; indexing would move the creatures (P12 excludes them). | P12 indexes only the scenery and building merges; `opt_identity.js` (P12 against the exact original layout); `minify_identity.js BEFORE AFTER` by hand. |
| No texture is made, or first uploaded, during play. | A texture made mid-play is what the flashes came with (F-B29/F-B30, [82]); one first uploaded when first drawn is uploaded inside that frame (F-B34, F-B35, [91]). | `texture_census.js` (standard tier); `event_start_check.js` fails if any scene texture is not uploaded at its current version (F-B36). |
| The projection layer is never swapped, never touched in play: native render scale, one fixed foveation set at VR entry. | The author's rule (RULES.md 10, F-B31); F-B83. | `test_governor.js` (standard tier). |
| The loader's layers and context stay whole for the session; each session's layer shim frees its framebuffers and depth buffers when that session ends (re-entry makes a new one). | Destroyed layers were re-made by the browser after the headset slept until the memory ran out; each re-entry leaked about 24 MB (B96). | `test_s33.js`, `test_b96.js` (never released, no layer destroyed, the native census steady through three hides and returns); `test_reentry.js` (live counts not higher after a re-entry). On the headset: `native census` lines with no `(GROWTH)`, `destroyed 0`. |
| The shipped copies are the game file. | One source: `tools/uncompressed.html`, edited directly. | `sync_game.py --check` (quick tier, pre-commit hook), `check_apk.sh`. |
| The game file is fully minified; the compressed version unpacks to it exactly. | The author's rules (RULES.md 19, 20). | `minify_game.js --check`, `build_compressed.js --check` (quick tier, pre-commit hook, `build.sh`); `test_compressed.js`. |

## 5. Where to change what

Everything is changed in one place, the game file `tools/uncompressed.html` (since 3.15.43, NOTES 87; minified since
3.15.45: edit it in place in the same style); then `tools/build.sh --bump` minifies it again, copies it to
`index.html` and the APK, re-paints `tex/`, raises the version, builds the APK and the compressed version and runs
the checks, and an entry in FIXES.md records the change, its ID (B, P, L, D, R, A, S), why, and how it was proven.

- **A game fix or a performance change**: edit the game file. Give a performance change a switch
  (`window.__gc...`) and check it off and on with `pixel_ab.js` (add it to its list; RULES.md 31) and its speed with
  `render_ab.js` or `frame_parts.js`; a change that claims no visible change can also go in `opt_identity.js`.
- **Anything in the head script, the loader or VR entry**: the head script at the top of the game file. It goes
  straight into the main build (RULES.md 22: no A/B experiment builds; this line used to say "ship it first as an
  experiment", superseded) and the author tests it after the merge, so prove it headless first: `test_entry.js`
  (early, late and no grant; it fails on the 3.15.11 feature list) and `test_play.js`. `experiment.py` variants
  are for diagnostics and measurement only.
- **The multiview shader macros or the per-eye matrices**: the multiview edits to the bundled three.js in the game
  file (search for `GC_MULTIVIEW`). Run `multiview_check.js` and `uniform_budget.js`.
- **A new texture that changes during play**: nothing to do, as long as it is marked with
  `texture.needsUpdate = true`. Direct `gl` uploads during a frame will fail `multiview_check.js`.

## 6. Reading a headset run

Capture live: `tools/capture_log.ps1` / `.sh`, or `adb logcat -c` then `adb logcat -v threadtime -s GreeblisServer
VrApi > run.txt` while playing; then `node tools/perf_log.js run.txt` (HEADSET_DIAG.md section 1; a debug build: the final build writes only the runtime's VrApi lines; `adb logcat -d`
afterwards keeps only the last minutes of a long session). The lines that describe the render path:

- `multiview planned (...)` or `multiview not used (...)`, then `gpu: ...`: the decision, the GPU's real
  limits and the device.
- `projection layer live, scale S, msaa M, multiview true|false`: the layer (scale 1 since 3.15.43). A
  `projection layer swapped to scale ...` line never appears since then (F-B31: no swaps; the swap branch itself was removed in 4.0.14, L1).
- `perf fps=... fov=... calls=... tris=... at=... dev=...`: the frame rate by scene, the layer's fixed foveation read back (0 since 4.0.13) and where the player stood (`level=` until 4.0.13: the quality levels, removed in 4.0.14).
- `multiview: ...`: any hazard or compile during play. There should be none. Since 3.15.48 (D2) a compile line
  names the key fields that differ from the closest program of its kind.
- `geometry held for one frame: ...` (F-B51), `shader held for one frame: ...` (S2) and `head inside N character(s)`
  (S1): the holds at work; `[draw hook] ...`, `[render] ...`: an error the frame survived (HEADSET_DIAG.md section 1
  has the full list).
- `MARK flash seen` (B on the right controller) and `long frame N ms` (over 28 ms, at most two a second; D2).
- `cpu ms a frame: ...; render by part: ...` every 10 s and `slow frame: cpu ...` (the performance log, debug builds
  since 4.0.49; the render by stage since 4.0.51): the game's CPU a frame, which the frame rate follows (PERF.md 16).
- At load: `panel sheets: N draws merged`, `glass merged: N draws` (P48, P49).
- `VrApi ... FPS=../72,...,Stale=..` (the headset runtime's line, once a second): `perf_log.js` turns it into a CPU-
  or GPU-bound verdict per scene from the app's GPU time.

For a recording: `python3 -I tools/video_check.py capture.mp4 --ovr` lists flash frames and crops the OVR
Metrics overlay (FPS, CPU and GPU use, the app's GPU time per frame).
