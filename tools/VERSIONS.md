# Build history

Every APK built from this repository, newest first, with what changed and what
the headset said. versionCode must only go up; the Store rejects a repeat.
Details live in `NOTES.md` (numbers in brackets) and `BUGS.md`.

| Version | versionCode | What changed | Headset |
| --- | --- | --- | --- |
| 3.15.32 | 32 | P13: the tentacled creature's dance bend computes each tentacle ring's trigonometry once (the ten vertices of a ring share it) and writes the arrays directly: bit-identical output over 400 cases (`test_bend_exact.js`, now in the standard tier), 39 -> 14 us per tentacle headless. `opt_identity.js` joins the full tier | pending |
| 3.15.31 | 31 | P12: the scenery, building and kiosk merges build indexed geometry (bit-identical vertices shared; creature and pickup merges untouched): 197 geometries, vertex runs of the meshes drawn as themselves 1,062,441 -> 576,758 over the whole scene; batching unchanged (the cap reads the original count). Identical pixels (`opt_identity.js`, P12 switched against the exact original layout); sides check, both z-fight tests, no compiles during play | pending |
| 3.15.30 | 30 | P10: the batcher merges bit-identical vertices within each part when it builds a batch (the game's own geometry untouched): batch vertices 499,058 -> 215,258 with the same triangles; loading unchanged (batching slice 446 -> 438 ms). Pixels identical batched against unbatched (`opt_identity.js`, real pixels); sides check passes; no shader compiles during play | pending |
| 3.15.29 | 29 | P9: batch parts carry their own shininess and specular colour (a fifth uniform row, read by the batch shader through a flat varying), so Phong parts that differ only in those share a batch: whole scene 327 batchable draws per eye -> 247; batched town views 5,166 -> 4,580 draws over 40 views. Pixels identical batched against unbatched (`opt_identity.js`); sides check passes; no shader compiles during play | pending |
| 3.15.28 | 28 | P8: a multi-material mesh whose geometry groups repeat a material instance draws one group per instance (the garden plots: two draws each instead of six, per eye; the planting Event's thirteen plots save up to 56 draws per eye). Same triangles, pixels identical (`opt_identity.js`) | pending |
| 3.15.27 | 27 | Frame-rate line in logcat every ten seconds while presenting (`page: m=perf fps=... level=... calls=... tris=... [event] at=x,z`), so a headset run documents its own frame rate (P7, HEADSET_DIAG.md); performance report (`perf_report.js`, pass/fail in the full tier, baseline) and headset log reader (`perf_log.js`); game unchanged otherwise | standard tier passed (`.runs/std_v27.log`, 186 PASS); perf report passed |
| 3.15.26 | 26 | Performance and Zollod. P1 governor steps down after half a second over budget; P2 the pickup glow's light-on shader variants really pre-compile now (the pre-warm threw on this three.js build and its call swallowed it: first pickup 78 ms -> 10 ms headless, battle panel 1,154 ms -> 17 ms); P4 fully transparent objects are skipped (daytime stars, waiting Event props, the day sky at night); P5 the creature ground-fit scan throttled; P6 back-face culling for closed meshes (the game had set every material double-sided; 297k of 659k source triangles now single-sided, pixel-identical by `sides_check.js`). B25 Zollod walked into his kiosk: entry path point outside the router's margin, keepers in front of the desk take the entry path, every home-bound route goes through the entry path, Zollod's collision circle as the other keepers'. Nothing visible changes [56] | pending |
| 3.15.25 | 25 | Focus-aware (VRC.Quest.Input.4): controller rays and hand meshes hidden while the XR session is blurred by the system UI, shown again on return (B24); VRC check written up in `VRC.md` | pending |
| 3.15.24 | 24 | The author asked for every listed z-fighting instance fixed: Store/Bank/Fire Station parapet bands 1 cm proud of the walls (B21), Mushroom's hat band sunk 3 mm into the brim (B22), the Robin's tail feathers and white tips offset by half a millimetre (B23). The other seven were contacts the headset cannot show (undersides at ground level, solids resting back to back, faces buried inside a roof or wall); both z-fight tests now classify those as hidden instead of reporting them [54] | pending |
| 3.15.23 | 23 | B20 completed: the cuff lights also moved 1 cm up so the middle light's top face no longer lies in the plane of the cuff's top cap (found by the new curved z-fighting test) [53]; root `index.html` mirror | pending |
| 3.15.22 | 22 | Hennrick's forearm cuff lights sunk into the cuff, cuff clears the skin (B20, first half) [52] | superseded by 3.15.23 before a headset run |
| 3.15.21 | 21 | Loading panel 1.3 x 0.65 m at 5 m (about 15 degrees) with a horizon in the loading sky [51]; the 3.15.20 page-start asset download | pending |
| 3.15.20 | (not released) | Texture assets start downloading at page start (overlaps the script parse). Entry-script change: parked until a headset run [50] | not run |
| **3.15.19** | **20** | Sphere-traced blob-body march: characters build about twice as fast, geometry identical [49]; native-start render-scale governor; build-time texture probe points (no capture readback) [45] | **Author's full run: passes, no new issues. Upload candidate.** |
| 3.15.18 | 19 | Native-start governor, probe points, hitch probe on the no-layers variant (never posted; superseded the same evening) | not run |
| 3.15.17 | 18 | 3.15.16 with the school mural back to its original rendering (author's call) [48] | not run separately |
| 3.15.16 | 17 | Gallery painting at 2.0 px/unit with anisotropy 16; flash-free projection-layer swaps [47]; adaptive render scale 1.2/1.1/1.0; mural at 2x (reverted in 3.15.17) | not run separately |
| 3.15.15 | 16 | Loading panel 1.8 x 0.9 m at 4 m (about 25 degrees) after "still much too close" [46] | not run separately |
| 3.15.14 | 15 | Event props pre-built during loading (B17); boot slice timings posted to logcat [45]; graphical pass tools (z-fight, sharpness) [44] | Author: no black bars, no loading issues; panel too close. 8.2 s on-device loading breakdown [46] |
| 3.15.13 | 14 | Layers loading screen promoted into the release (compositor cube + quad layers, projection-layer shim for the game) [42][43]; panel 2.6 m at 3.6 m; app label GREEBLIS TOWN; game fully loaded before drop-in (B16) | Layers experiment: "no black bars or loading-in perf issues"; sharp experiment: looks better, one black frame on a scale step (B18) |
| 3.15.12 | 13 | B14 sealed corner behind the Shop; no `layers` feature; entry never ends the session on failure (B15) [41]; page diagnostics to logcat | Author: "works enough to get into VR", black bars on loading remain |
| 3.15.11 | 12 | Compositor-layer loading screen, first attempt | Exited 6-8 s after launch every time: `baseLayer` forbidden with the `layers` feature [41] |
| 3.15.10 | 11 | Loading bar total matches the slice count; boot profile serves /tex/ | Author: entered the game; white flash on pickups gone (B12) |
| 3.15.9 | 10 | Pre-rendered textures [38]; effects pre-warm and cacheable page [37]; B2 visible stuck rescue [36]; B4r corner clip [35] | not run separately |
| 3.15.8 | 9 | B4r route final-leg corner clip | not run separately |
| 3.15.7 | 8 | VR session requested at page start, in-VR loading screen, sliced boot [34] | Author: into the game, but no visuals before the drop-in (projection loader not yet drawing) |
| 3.15.6 | 7 | Digital Asset Links served; B11 courier detour around the Ancient [31] | TWA verified, game booted, no VR: the browser never grants a session on a fresh immersive launch [33] |
| 3.15.5 | 6 | `/.well-known/assetlinks.json` served (fingerprint of the signing certificate) [30] | not run separately |
| 3.15.4 | 5 | Game addressed as `http://localhost` (the browser rejects `127.0.0.1`) [29] | Origin accepted, asset links 404 [30] |
| 3.15.3 | 4 | Approved fixes: shop pause (B8), gate text (B7), early re-route at walls (B1), route corner clipping (B4), server 400 (B5) | not run separately |
| 3.15.2 | 3 | Launch crash fixed: `INTERNET` permission, `super.onCreate` always called [27] | Immersive activity closed on the loopback URL [28] |
| 3.15.1 | 2 | First signed release build at the repository root | Crash at launch [27] |

Experiment APKs (`tools/build_experiment.sh NAME`, same package and version as
the release, never uploaded): `layers` (became the release in 3.15.13),
`sharp` (retired; its setting became the adaptive scale), `nolayers` and
`native` (A/B reversals), `directrequest`, `keepalive`, `nobatch`,
`noeffects`, `nogovernor` (diagnostics during the launch and flash work).
