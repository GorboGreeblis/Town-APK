# VRC check: GREEBLIS TOWN against the Meta Horizon Store requirements (first written for 3.15.25; kept current, 4.0.0)

Cross-checked on 2026-10-27 against an independent, CC0 test guide the author supplied ("Meta Quest Virtual Reality Checks (VRCs)", v1.0, 2026-10-27, 80 test cases; not affiliated with Meta). It lists the same 80 checks as this file; the rows below follow its wording where it is more specific (Packaging.4: a declared network security configuration, asserted by `check_apk.sh`; Performance.4: the boss-battle exception).

The final part of the test pass (the author, 2026-10-27: "check the build against all
relevant VRCs to ensure that it will pass submission"; the goal is a first-try pass).
The list is Meta's current one (80 active checks; retired: Performance.2,
Functional.8, Functional.11, Input.6), read from
https://developers.meta.com/horizon/resources/publish-quest-req/ and the per-check
pages on 2026-10-27. Required checks are marked R, recommended ones +.

Verdicts: **PASS** (evidence in this repository or a headset run), **HEADSET**
(passes by design, needs the author's headset confirmation with the exact step
given; all are on the RELEASE.md section 3 list), **AUTHOR** (Store metadata the
author fills in; what to check is given), **N/A** (does not apply).

## What the build is

An immersive PWA packaged with Meta's `androidbrowserhelper` (the same packaging
Meta's own PWA tooling produces): a launcher activity starts the Quest Browser's
immersive activity on `http://localhost:17777/`, served by a loopback server inside
the app. Pure Java plus the bundled game; no native code, no network use, no data
stored on the headset (the game has no save: no localStorage, IndexedDB or cookies;
`tools/store/privacy.html` says so).

## Packaging

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Packaging.1 manifest meets release requirements | R | PASS | `tools/check_apk.sh`: MAIN intent with `com.oculus.intent.category.VR`, `com.oculus.supportedDevices` = quest3, quest3s (Quest 2 dropped in 3.15.34, Quest Pro in 3.15.35, the author's decisions), `android.hardware.vr.headtracking` required, touchscreen not required, `debuggable` false, `allowBackup` false, landscape; Meta's upload check runs the same test on upload |
| Packaging.2 signed with APK Signature Scheme v2 | R | PASS | `check_apk.sh` verifies v2 with apksigner; the certificate is the one every upload must keep (RELEASE.md section 1) |
| Packaging.3 no unsupported Android features | R | PASS | only `android.hardware.vr.headtracking` (required) and `android.hardware.screen.landscape` (implied); no camera, telephony, location, Bluetooth |
| Packaging.4 supported SDK versions | R | PASS | minSdk 29, targetSdk 32, compileSdk 34 (`tools/android/app/build.gradle`), inside Meta's 29-34 / 32-34 ranges |
| Packaging.5 APK under 1 GB | R | PASS | 26.1 MB (4.0.0; 15.3 MB in 3.15.45, before the pre-painted gallery mural of 3.15.48), no OBB |
| Packaging.6 64-bit binaries | R | PASS | no native libraries at all (pure Java plus HTML); nothing 32-bit to reject |

## Performance

| Check | Status | Verdict | Evidence and what to confirm |
| --- | --- | --- | --- |
| Performance.1 runs at the supported refresh rate, at least 60 fps outside loading | R | HEADSET | The browser runs the session at the headset's rate (the game asks for 72 Hz and takes what the browser gives). Multiview draws both eyes in one pass (3.15.34); the quality governor adds fixed foveation before frame time exceeds budget, always at the native render scale (NOTES 44, 45; since 3.15.43 it changes foveation only, F-B31); the planting Event starts at the lowest level and stays there (the Event's own scale steps, P16-P17, were removed in 3.15.43). No shader compiles during play (`warm_coverage.js`, `multiview_check.js`, `test_content.js`; P19 removed the last light state that would; headless. The author's 3.15.47 log showed two, one at the Event's start: BUGS.md B39, fixed and confirmed by a later headset log; since 3.15.63 a program that would still be compiled inside a headset frame is held back for that frame and compiled after it, S2, `test_shaderhold.js`). Measured on a Quest 3S with 3.15.47: town median 71.8 fps, the Event median 63.3 and 56.4 at worst, CPU-bound (NOTES 91); P24 and P25 since. The author's 3.15.60 run: 54 fps at the lowest, watching the Event from afar (TASKS T16; P29 and the removal of P28 since; PERF.md 14 has the estimate for 3.15.63). Earlier, 3.15.33-3.15.34: town 72 fps, the Event 58-65. Headless numbers do not transfer. **Confirm with the OVR Metrics Tool** (RELEASE.md section 3, step 7): a 10-minute play session with the overlay on, FPS at or above 60 outside the loading screen, the Event included. If it dips in a place, say where |
| Performance.3 head-tracked graphics or a VR loading indicator within 4 s of launch | R | HEADSET | The VR session is requested at page start and the loading screen is drawn by the compositor (a cube layer sky with a horizon and a head-locked quad with the title, the progress bar and, since 3.15.63, the version in its bottom right) about a second after the page starts; the author saw the title and bar "well under 10 s" with no black bars. Between the icon press and the page start the OS shows its own loading screen. **Confirm the count**: from pressing the icon to seeing the title panel, under 4 s (RELEASE.md step 7). If it is over, the OS splash still counts as a VR loading indicator in Meta's PWA packaging, but write the measured number in the submission notes |
| Performance.4 render scale at least 85% | + | PASS | native scale (100%) at all times since 3.15.43 (F-B31): every quality level and the emergency step keep scale 1 and change foveation only, and the projection layer is never swapped (`tools/test_governor.js`, `tools/sharpness_probe.js`). Until 3.15.42 the Event's own steps (0.9, 0.82: P16-P18) relied on the check's boss-battle exception |

## Functional

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Functional.1 no crashes, freezes or long unresponsive states | R | PASS | author's full headset run on 3.15.19 (no new issues); 10-minute soak headless with bounded heap and object counts (TEST_PLAN); launch stable since 3.15.12; every page error is posted to logcat (`page: ...`) and the standard tier fails on any |
| Functional.2 single-player app pauses when Horizon OS asks | R | PASS | the session's `visibilitychange` sets `blurred`: the game loop skips its update (no movement, no NPC time, no input) and only renders; the author's full run includes the system-menu pause and resume step with sound back (RELEASE.md section 3, the paragraph after step 6). The VRC's own test (Quick Settings, Enter Passthrough) is the same path |
| Functional.3 never leaves the user stuck | R | PASS | world routes 20/20 with the sealed corner behind the Shop opened (B14); NPC stuck rescue (B2); the player cannot be enclosed (hull tests in the standard tier); the system menu always exits |
| Functional.4 does not lose user data | R | N/A | the game stores nothing (no save, by design; the privacy policy states it), so there is nothing to lose. Say so in the submission notes |
| Functional.5 responds to positional and orientation tracking | R | PASS | `local-floor` reference space (fallback `local` with a floor offset, tested in the `vr-nofloor` scenario); 6DoF head tracking through the projection layer; the author's runs |
| Functional.6 only Meta Quest headsets and controllers shown | R | AUTHOR | the game draws its own stylised hands/rays, no headset imagery; check the Store screenshots and trailer show no other platform's hardware |
| Functional.7 tells the user when required connectivity is missing | + | N/A | no connectivity used; the loopback server is on the headset |
| Functional.9 Local tracking space lets the user reset forward orientation | R | HEADSET | the session uses `local-floor` / `local`, for which the browser applies the system recentre (long-press the Meta button). **Confirm**: turn 180 degrees, long-press the Meta button, the town faces you again (RELEASE.md step 7) |
| Functional.10 no head-locked menus | + | PASS | the in-VR UI is world-placed (kiosks, panels in front of the player at a distance); the only head-locked element is the loading panel, allowed as a loading indicator |
| Functional.12 fully functional for multiple entitled users on one headset | R | PASS | no per-user state at all; the browser keeps a profile per headset user anyway |
| Functional.13 defaults to the user's language | + | N/A | English only (allowed; the Store listing says so) |
| Functional.14 passthrough loading and MR Home launch | R | N/A | not passthrough-capable |

## Security

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Security.1 entitlement check within 10 s | + | N/A | recommended only; a browser-packaged app has no Platform SDK. Meta's own PWA packaging ships without it |
| Security.2 minimum permissions, none unsupported | R | PASS | `android.permission.INTERNET` only (needed for the loopback server); `check_apk.sh` fails on any other |

## Tracking

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Tracking.1 play-mode metadata (the author chose Sitting and Standing) | R | HEADSET | everything is reached by pointing and the trigger (pickups, kiosks, dialogue choices) and by stick locomotion with snap turn: nothing needs reaching to the ground, standing up or turning beyond 90 degrees while seated, and nothing needs more than a 2 m square while standing. **Confirm** one pass of each (RELEASE.md step 7): seated on a chair, then standing in place |
| Tracking.2 input-mode metadata | R | AUTHOR | select **Controllers** only in the dashboard (the game does not support hand tracking; see Input.7) |

## Input

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Input.1 menus open with the menu button | + | N/A | the game has no pause menu of its own; the system menu is the menu. Recommended only |
| Input.2 grip for pickup, not trigger | + | NOTE | pickups use the trigger (point and select) and the grip is a second accept; recommended only, left as the author designed the game |
| Input.3 hands and controllers match real position | + | PASS | the rays and hand meshes are attached to the controller grip and ray spaces (three.js `getController`/`getControllerGrip`) |
| Input.4 focus-aware | R | PASS | B24 (3.15.25): while the session is `visible-blurred` the game keeps rendering, ignores input (the update is skipped) and hides its controller rays and hand meshes, then shows them again; `tools/test_play.js` vr scenario checks all three. **Confirm** in the headset: open the Universal Menu, the town keeps rendering behind it with no hands or rays; close it, they are back |
| Input.5 hand-tracked hands render correctly | + | N/A | hand tracking not supported |
| Input.7 switching between controllers and hand tracking | R | N/A | applies to apps that support hand tracking; this one requests no `hand-tracking` feature, so the browser never gives it hands. **Confirm** nothing breaks: with Auto Enable Hands on, put the controllers down and pick them up; the game waits and continues (`inputsourceschange` handler) |
| Input.8 system gesture reserved | R | N/A | hand tracking not supported |

## Assets (Store listing, the author's)

| Check | Status | Verdict | What to check in the dashboard |
| --- | --- | --- | --- |
| Asset.1 logo with a transparent background | R | AUTHOR | the logo PNG has a transparent background (`tools/store/icon-512.png` is the app icon; the Store logo is a separate upload) |
| Asset.2 cover art: clear branding, no taglines or banners | R | AUTHOR | the cover shows the name and art only |
| Asset.3 no text in the top or bottom 20% of the cover | + | AUTHOR | |
| Asset.4 hero art centres the branding | + | AUTHOR | |
| Asset.5 screenshots are from the app, with no added logos, text or icons | R | AUTHOR | the current screenshots are in-game captures |
| Asset.6 no other platform's headsets, controllers or logos | R | AUTHOR | |
| Asset.7 trailer 2 minutes or shorter | R | AUTHOR | if a trailer is uploaded |
| Asset.8 artwork text at least 24 pt | + | AUTHOR | |
| Asset.9 Immersive Image Layers transparent | R | N/A | none uploaded |
| Asset.10 Quest Pro feature capture text | + | N/A | |

## Ads, Streaming, Content

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Ads.1-7 | R | N/A | no ads |
| Streaming.1-4 | R/+ | N/A | nothing streamed; the loopback server is on the headset and serves the app's own files only |
| Content.1 content guidelines | R | PASS | a family-friendly town game, IARC rating completed by the author |
| Content.2 metadata matches in-app content | R | AUTHOR | the Store copy describes the town, the townsfolk, flint and the Event as they are in the game (the copy review of 2026-10-26); names in the listing are the in-game names |
| Content.3-4 user-generated content | R/+ | N/A | none |

## Privacy

| Check | Status | Verdict | Evidence |
| --- | --- | --- | --- |
| Privacy.1 policy URL managed by the team | R | PASS | https://greeblistown.neocities.org/ (the author's page; source `tools/store/privacy.html`): public, HTTPS with a trusted certificate (checked 2026-10-27), not on another VR distribution platform |
| Privacy.2 what data is collected | R | PASS | "does not collect, request, store, share, or transmit any personal information or user data"; nothing saved on the headset either |
| Privacy.3 how data is used | R | PASS | none collected, stated |
| Privacy.4 how to request deletion | R | PASS | live since 2026-10-27 (checked: https://greeblistown.neocities.org/ shows section 8 "Data deletion requests" and "Last Updated: October 27, 2026"): nothing to delete, email with the subject "Data deletion request", a reply within 30 days, uninstalling removes everything; source `tools/store/privacy.html` |
| Privacy.5 data protection checks | R | AUTHOR | the dashboard's Data Use questionnaire: no data collected, no third-party SDKs |

## Publishing

| Check | Status | Verdict | What to check |
| --- | --- | --- | --- |
| Publishing.1 website URL valid | R | PASS | the neocities page resolves |
| Publishing.2-3 support and ToS links, if present | R | AUTHOR | leave empty or point at a valid page |
| Publishing.4-7 name, descriptions, keywords meet the guidelines | R | AUTHOR | "GREEBLIS TOWN" everywhere; the copy reviewed on 2026-10-26 |
| Publishing.8 Meta brand use | R | AUTHOR | no Meta or Quest branding in the copy beyond the platform name |

## Accessibility (all recommended)

Playable without audio (dialogue is text), text is large and world-placed, feedback is
visual and audible, snap turn allows looking around without turning the body
(Accessibility.7), stick locomotion plus snap turn. No brightness or colour-blind
options and no one-handed mode: recommendations, not required.

## The four headset confirmations that decide a first-try pass

1. **Frame rate** (Performance.1): OVR Metrics Tool overlay, 10 minutes of play, FPS at or above 60 outside loading.
2. **Time to the loading panel** (Performance.3): icon press to title panel, under 4 s; write the number down either way.
3. **Universal Menu** (Input.4, Functional.2): town keeps rendering with no hands or rays while the menu is up; everything resumes after.
4. **Recentre** (Functional.9): turn around, long-press the Meta button, the town faces you.

Plus the dashboard items marked AUTHOR. (The privacy page upload, Privacy.4, is done: live since 2026-10-27.)
