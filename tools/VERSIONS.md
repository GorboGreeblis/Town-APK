# Build history

Every APK built from this repository, newest first, with what changed and what
the headset said. versionCode must only go up; the Store rejects a repeat.
Details live in `NOTES.md` (numbers in brackets) and `BUGS.md`.

| Version | versionCode | What changed | Headset |
| --- | --- | --- | --- |
| 3.15.22 | 22 | Hennrick's forearm cuff lights sunk into the cuff, cuff clears the skin (B20) [52] | pending |
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
