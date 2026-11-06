# The author's rules

Every standing rule the author has set for this project, in one place. Read it before any change; when the author
sets a new rule, add it here (with the date and the author's words) in the same change. Other docs may repeat a rule
where it applies; this file is the list. Numbers in brackets are NOTES.md entries.

## The game file

1. **One game file, edited directly** (2026-10-28: "I want all edits applied to the game file itself. Not applied
   after. Please edit the actual file"; "this also means adding all changes to the actual uncompressed file") [87].
   The game is `tools/uncompressed.html`. Every change is made in it. Never edit `index.html` or the APK's asset:
   they are copies, written by `python3 tools/sync_game.py` and checked by `sync_game.py --check` (quick tier,
   pre-commit hook). The file is minified (rule 19): edit it in place, keep new code in the same style, and run
   `tools/build.sh --bump`, which minifies again. Names the tests and tools read in the game's scope are never
   renamed (`RESERVED` in `minify_game.js`); a tool that needs another one adds it there first.
2. **The game must always be rebuildable from the game file alone** (2026-10-28: "I want to ensure that the game
   itself can be rebuilt from the index.html file"; "as a rule this should always be possible"). It runs fully with
   nothing beside it (no files, no server, nothing from the web), and everything shipped with it is derived from it:
   the copies (`sync_game.py`) and the pre-painted textures in the APK's `assets/tex/`
   (`node tools/prerender_textures.js`, after any change to a texture painter). `tools/build.sh` rebuilds all of it
   from the game file in one command. `test_standalone.js` (every tier but quick, and one of `build.sh`'s closing checks)
   proves both: it runs the game file alone and checks every pre-painted texture is exactly what the game
   paints [88].
3. **No original kept** (2026-10-28: "we don't need to save the original anywhere in the repo") [87]. Git history
   has it. (The compressed build, dropped the same day, came back as rule 20.)
4. **Every change is recorded** in `tools/FIXES.md` (the changelog: what, why, who decided, how it was proven), with
   longer investigations in NOTES.md and bugs in BUGS.md.
5. **Randomness: cut it where it is not part of play** (2026-10-28: "we should cut as much randomness as possible").
   These stay random, by the author's word: where Flint and Blossoms spawn ("should still spawn randomly"), where
   NPCs wander, NPCs' interactions with each other and which chats play ("should still appear random"), and
   which way each flint lies (2026-10-29: "Close out as intended"). The UFO's flight path is as intended
   the way it is (2026-10-29: "The UFO's path is currently fine the way it is. Mark as intended": it draws from the
   game's seeded generator, so its first flight is likely the same on every launch; this rule listed the UFO's heading as random until then). Seeded, the same on every
   launch (2026-10-29: "1 to 7: seed", FIXES R5): the stars, the clouds, blinks, idle sway phases, Anomalee's glitch
   timing and jaw, the Event ring's sway. Random by the author's word too (2026-10-29: "whatever you recommended we
   keep random, keep random"): particles and splats, the pickups' bob and glint, sound pitch variation, Anomalee's
   glitch shake, the robin's return, the Gem's sparkles, and the dancers' moves in a battle (2026-10-29: "For the Dancer's moves: what they pick should
   always be random") (RANDOMNESS.md). The dance
   battle's BOW OUT works at random 80% of the time (2026-10-29: "a random 80% chance of working makes sense for the
   Bow Out button"; it was 70%). Painted textures are seeded (the same on every launch, FIXES R1 [88]). Any other randomness is the author's
   call ("other instances of randomness are questionable"): list it and ask before changing it.

## How the game looks

6. **As little visual change as possible** for every change (the author, throughout). A performance change that
   claims no visible change must prove identical pixels (`opt_identity.js`, or a dedicated proof); anything visible
   is put to the author first, with pictures.
7. **Creature designs are final** (2026-10-27). Fix a model with care and without changing its look; anything the
   author would notice is their call (RELEASE.md 6; the looks: LORE.md "Creature design and style").
8. **Emotes have one colour per glyph** (2026-10-28, F-B29, approved): heart pink, note lime, flower, `!`, star and
   sparkle yellow, `?` teal, the rest white.
9. **No texture is made during play** (2026-10-28, F-B29/F-B30): everything is made while loading
   (`texture_census.js`).
10. **No render-scale changes** (2026-10-28: the Event's resolution drop removed, "close out that option"; both flash
    experiments in the release): the projection layer is never swapped; the quality governor changed foveation only
    (F-B31) [83]; since 4.0.13 the foveation is one fixed value set at VR entry (F-B83), and since 4.0.14 the
    governor has no quality levels (L1).

30. **The Event's fade groups** (numbered 26 until 2026-11-04, when that number was found given twice; references to "RULES.md 26" about the fade groups in FIXES.md, VERSIONS.md, LORE.md and RELEASE.md mean this rule) (2026-10-30; P33, F-B64; `window.__gcSt` in the game, `test_stands.js`). During the
    Event, once the mist is up, these fade out slowly and back after it (2026-10-30: "we can hide things as long as we
    give them time to fade out and then give them time to fade in"; "We don't want to do it too quickly": at least 9 s
    out; since 4.0.62 one after another, 3 s apart, each still over 10 s: "we can increase the time it takes for the
    Event to start and end. Have things happen more spaced out", 2026-11-06). Each group fades as one, every part at the same time and never in parts ("all parts of Kiosks [and] other
    fading structures, fade out and fade in at the same time, and not in parts"). The grouping stands for future work
    ("Please note this grouping of all kiosks and all trees for future work"):
    - **All kiosks**: every building but the church (the post office, the Sheriff's kiosk, Garden Supplies, the gallery,
      the shop, the juice bar), **the Gazebo**, which counts as a kiosk "in all regards", and **the Phone Booth** and
      **the Portal** (2026-10-30: "The Phone Booth and the Portal should both be treated as kiosks"; A27). Each kiosk is
      its own item;
      it waits while its owner is within 6 m of home before it fades out. Once out, nothing comes back until the Event
      ends, however near the player comes (2026-10-30: "Just keep everything faded out until things fade back in. I
      don't care if there is invisible collision"; the earlier come-back-when-near rule was Claude's, not asked for).
    - **Seeds** (2026-10-31: "If the user starts the Event without having completed 'Seeds', kiosks should NOT fade
      out"; "Only the tree in the park should NOT fade out during the 'no Seeds' Event"): in an Event without Seeds no
      kiosk fades and neither does the park's tree with the robin; only the town's trees outside the fence fade (F-B72).
    - **All trees**: every tree the tree builder places (the park's one, the robin's, and the town's outside the fence), carved
      out of the world's merged meshes ("let's add all trees to the same group for fading out and in"; since 4.0.4 two
      items, the park's tree with the robin and the town's trees, that fade together in an Event with Seeds),
      with **the Robin**, who always fades out and in with her tree ("The Robin should always fade out and in with her
      tree"). A new tree made by the builder joins the group by itself (`window.__gcTreeAt`).
    - **Never fade**: the church and Cave, the Ancient, Somlet, the Pond, and anything in the Garden itself ("The
      Church / Cave and Ancient can never fade out. Neither can Somlet or the Pond, or anything in the Garden itself";
      "if we hide the Post Office, we must never hide Somlet"). None of these may be in a fading group or share a
      faded material; `test_stands.js` checks both and that they stay shown.
    - **Characters never fade**: no townsperson, and not Sparkakus, built inside the Library ("Sparkakus really should
      be the same as all other NPCs"; F-B68), is ever part of a fading group; a group holding one is split round
      them. Lights never fade either (the shaders' light count must not change during play), nor anything whose
      showing the game itself switches (the portal's blue effect; F-B71).
    Fading is drawn only: collision stays on while a group is hidden, and as it comes back anyone standing in it is
    pushed out (FIXES S3). The gazebo's walls (its seven railed sides) are solid for everyone and its doorway is open to
    anyone (2026-10-30: "The doorway to the Gazebo should be open and collision free for anyone to enter and exit";
    "It's just the walls of the Gazebo that need consistent collision"; F-B65).

## Builds and the repository

11. **The repository root holds only** `GreeblisTown-release.apk`, `index.html`, `index.compressed.html` and `tools/`
    (2026-10-27; the compressed version moved to the root 2026-10-29: "Please also move the Compressed game file into
    root").
12. **The APK and `index.html` at the root are always the latest build** (2026-10-27; restated 2026-10-28: "The .apk
    and index.html file in root must always be the latest build"). Every change to the game is followed by a rebuild
    and a version bump (`versionCode` only goes up) before it is committed (`tools/build.sh --bump`). Enforced:
    `sync_game.py --check` (quick tier, pre-commit hook) fails if `index.html` differs from the game file; the
    pre-commit hook and `check_apk.sh` fail if the root APK does not hold the current game; `test_standalone.js`
    fails if its pre-painted textures are stale. The version shows on the landing page for other browsers and in the
    bottom right of the VR loading box (2026-10-30, A18); `build.sh` step 3b stamps it there (4 places) on every
    build.
13. **Never commit the signing keystore.**
14. **Commit often**; living documentation lives in `tools/`.
15. **(Superseded by rule 22, 2026-10-28.) Changes to the entry script, the layers shim or the multiview path shipped first as an experiment APK**
    (build_experiment.sh (retired in 4.0.63)) for a headset test, then into the main build (RELEASE.md 6; 3.15.11 skipped
    this and crashed at launch, F-B15).
16. **Note all rules in the documentation** (2026-10-28: "Please be sure to always note all rules in the
    documentation, for further work"): this file.

## Names and devices

17. **Names**: "the Event" is the planting event; "the Speech" is Sparkakus's library finale. Fortizmo is she and
    Backpacka is he (the author, 2026-10-30); LORE.md has every character's.
18. **Devices**: the author tests on a Quest 3S (its browser reports itself as "Quest 3"). Quest 2, Quest Pro and
    the original Quest are not supported (manifest `quest3|quest3s`).

## The two versions of the game

19. **The uncompressed version is minified but not compressed; the compressed version is both** (2026-10-28: "please
    apply Minification to the current game file, as much as possible", full minification with names renamed; "The
    uncompressed version of the game should be minified but not compressed. And the compressed version of the game
    should be both minified and compressed. This is a rule.") [89]. The game file, `index.html` and the APK hold the
    minified game; `node tools/minify_game.js --check` (quick tier, pre-commit hook, `build.sh`) fails if minifying
    it again would change it. `minify_identity.js` proved the minified game builds the same world as before, object
    for object, bit for bit.
20. **The compressed version lives at the repository root (in `tools/` until 2026-10-29), works as a Bitcoin ordinal, and is always
    updated with the others; the APK never uses it** (2026-10-28: "create a Bitcoin ordinal compressed version of the
    game and store it in the tools folder. This build must always always be updated with the others", "The Compressed
    version should always be the latest version of the game", "must be fully
    functional as a Bitcoin ordinal, as the previous compressed version was", "The .apk should never use the
    compressed version of the game file. The tools folder should contain both a compressed version and an
    uncompressed version of the game file", "Look to the previous compressed game file for methods of compression")
    [89]. `index.compressed.html` (root), built by `build_compressed.js` (in `build.sh` and `sync_game.py`) with the previous compressed
    version's method. Checked: it unpacks to the game file exactly (`build_compressed.js --check`: quick tier,
    pre-commit hook) and works as an inscription would (`test_compressed.js`: alone, under the ordinal content
    policy, unpacks, boots, enters VR; under 390,000 bytes). Its readable loader page carries no license notice (2026-10-28: "The License notice is not
    needed in the compressed ordinal version"); the notices are inside its payload.

21. **The license notice in the game file stands alone** (2026-10-28: "the in-code License notice should not
    reference the repo or other files"): the CC0 dedication (with the license's public address) and three.js's MIT
    notice, with no pointer to this repository or any file in it. `tools/LICENSE.md` covers the repository.

22. **No A/B experiment builds: changes go straight into the main build; the author tests after the PR is merged**
    (2026-10-28: "no A/B experiments: push changes right to the main build", "I'll test after we merge the next PR", "no more experiment-first rule"). Rule 15 is retired.
    Each change still comes with its proof (identical pixels or the measured trade-off) and its record in FIXES.md.
    `experiment.py` stays for diagnostics and measurement only.

23. **Every build is treated as the final build, until the author says otherwise** (2026-10-29: "until I say
    otherwise: treat this as if it were the final build and do a full test pass"). After each build the full tier runs
    (`tools/run_tests.sh --full`, about 3.5 hours; `--resume` after a container restart), and its result is reported and
    recorded in TEST_PLAN.md before the work moves on. Restated 2026-10-30 with the version: "let's bump this build to
    v4.0.0"; "Once this work is done: please treat this as if it were the final build" (4.0.0, versionCode 69;
    `build.sh --bump` continues from it). Restated 2026-11-03 for 4.0.25: "Until I say otherwise: treat this as if it were the
    final build" (the final-build process: the clean full tier with coverage, no build during it, then the dead-code
    census, the play census and the report tools, results recorded before the work moves on). The builds tested keep
    their debug code; the upload is the same build without it (rule 34, `tools/build.sh --bump --final`).

24. **Every copy of the game file is kept updated at all times** (2026-10-29: "keep all copies of the game file
    updated at all times"): `index.html` and the APK's asset (byte copies), `index.compressed.html` (the compressed
    version) and the APK at the root. `sync_game.py` writes all three copies after every edit of the game file
    (the compressed one is rebuilt, about 20 s) and `--check` checks all three; the APK follows with
    `tools/build.sh --bump` before any commit (rule 12; the pre-commit hook refuses a stale one).
25. **Dead code comes out before the final build, with a full test pass after** (2026-10-30: "Dead code can be
    removed before the final build ... the game must be fully tested after its removal"): the census
    found one unused function (`plantShow`, removed in 3.15.63, FIXES R8); the full tier runs on the final build.

26. **No controller vibration anywhere in the game** (2026-11-03: "Please remove controller vibration from the game
    altogether"; "I don't want to use controller vibration in any part of the game"): no haptic pulse on a pickup,
    a meeting, a menu press or the flash mark; the pulse helpers are gone (A50, 4.0.23) and `test_hud.js` checks that
    no haptic actuator is ever called.

27. **No comfort vignette on the player's view, ever** (2026-11-03: "I never want a comfort vignette applied to the
    user's view, for any reason"; the ring went in 4.0.4, A34): no darkening, fade, ring or tunnel on a snap turn, a
    stick move, a teleport or anything else; snap turns only rotate the rig. (Relaxed for a snap-turn blink in 4.0.31,
    S37; restored in 4.0.35, the author: "The black screen between snap turns did not fix the issue ... let's have
    snap turns work without the black screen inbetween".)

28. **Nothing touches the GL context inside a headset frame but the frame's own draw** (2026-11-03, the author's
    stability ask): no upload, compile, readback, framebuffer switch or query inside a frame; the holds (F-B31, F-B51,
    S2), the opt-in light record (S18) and the sampled error read of S29 (one every 60 frames, at the frame's start)
    are the standing exceptions, and anything new waits for the gap between frames.

29. **Never a no-layers build** (2026-11-03: "Please note as a Rule that we will never use a no layers build"; "It has
    serious issues and we're not taking this route"): every build, release or experiment, requests the WebXR
    `layers` feature and renders through the projection layer; no build drops it for the plain WebXR layer (the
    removed `nolayers` experiment, FIXES S36, log 4d0d3716).
31. **Performance work never costs visual quality** (2026-11-05: "Please apply 1 to 8 but not at the expense of
    quality. We need to remain on par with the pre-optimization build, for visual quality. Anything that impacts visual
    quality is not an option. As a rule. We already cut enough visually. Now we need to work around what is left").
    The reference is 4.0.46, the build before the optimization pass: every saving must draw the same picture (checked
    pixel for pixel, `pixel_ab.js`, frame for frame where it can be), and the final build is tested against 4.0.46
    (the full tier on both, pictures and a scripted session compared). A saving that changes the picture is not
    built; one that changes how motion looks (posing less often) counts as changing it.
    **The one allowance** (2026-11-05: "Alter the Rule so that instances like this are acceptable"): a change in the
    order opaque things are drawn may decide differently which of two surfaces at exactly the same depth wins a
    pixel (the same surfaces, a tie that already shimmers as the head moves in 4.0.46). That is acceptable when it
    touches only isolated pixels: `pixel_ab.js` allows a switch marked as a draw-order change at most 4 differing
    pixels a view (both eyes, at its 320 x 180 a eye); anything more, or any other kind of difference, still fails.
    **Relaxed** (2026-11-05: "let's do what we can but with the goal of changing as little of the visuals as possible.
    all changes must be tested against a previous build, before and after"): a saving may now change the picture,
    as little as it can; one that changes nothing is always preferred. Every change is tested against the build
    before it: the same frame with the change off and on (`pixel_ab.js`, both eyes), pictures of both builds at the
    same fixed views put side by side for the author, and the speed of both builds measured. What a change does to
    the picture is stated with it. The closed options (Decisions below: more draws merged into the batch path, the
    Event's headroom by fading scenery, posing less often) stay closed.
    **Relaxed for the Event's frame rate** (2026-11-06: "Please fully investigate ways to improve the FPS during the
    Event. I'm open to minor losses in visual quality"; then, of the options put to the author, "1: far characters
    every 2nd frame, 4: hide tiny far details, 5: merge more character parts"): three options reopened, each built to
    change as little as it can and tested against the build before (the pixel count, pictures of both builds, the
    speed): characters beyond 20 m posed and fitted every other frame (their motion at 36 Hz); during the Event,
    unbatched details under 2-3 pixels hidden, with a margin against flicker; near-identical character materials
    keyed alike so more character parts share batches. The rest of the closed options stay closed.
32. **The final pass waits for the author's headset test of the final build candidate** (2026-11-05: "Do not continue
    the final pass after that until I've tested the final build candidate in headset. This is a rule going
    forward"). When a build is put forward as the final build candidate, the work stops there: the final pass (the
    full tier on the final build, the comparison against 4.0.46 under rule 31, and the closing code audit) does not
    start until the author has tested that candidate on the headset and reported back. What the headset shows comes
    first; whatever it turns up is fixed in a new candidate, which waits for its own headset test.
33. **Nothing that could fail Store review** (2026-11-05: "Anything that could fail Store review is ruled out"; "As a
    rule"). No change, performance or otherwise, that a Meta Store review could fail the game for: no tricks around the
    platform's own controls (raising the CPU's clock level by keeping cores busy with work that does nothing, for one;
    the headset picks its clock levels from the CPU's utilization, and the game's work is on one thread, so it mostly
    runs at the lowest level, 1382 MHz), nothing that wastes battery or heat on purpose, nothing against the VRC
    requirements. When in doubt, it is put to the author first.
34. **The Store build carries no debug or logging code** (2026-11-05: "Please fence off logging / debug tools so that
    they can be removed from the final build"; 2026-11-06: "From the very last build: debug and logging features must
    be removed"). Every debug or logging feature in the game file is fenced by the debug switch
    (`<script>var GT_DEBUG=!0;</script>`, the page's first script: `GT_DEBUG&&...`, `if(GT_DEBUG)...`, or a guarded
    log call `window.__gtLog&&window.__gtLog(...)`), so the builds the author tests keep all of it, unchanged, and
    `tools/final_build.js` drops it: the log function and its report to the APK's `/log`, its localStorage black box,
    the flight recorder, the light record, the native census, the frame-health counters, the display timeline, the
    multiview statistics and the performance log. `final_build.js` fails unless none is left, and the upload is built
    with `tools/build.sh --bump --final` (the APK's `/log` endpoint compiled out too; `test_final.js` plays it as
    shipped). Code that only feeds a log or a record (a counter, a timer, a description) is fenced with it; the
    functional code around it (the layer shim, multiview, the holds, the pauses, the sound hold) stays as it is.
    `console.error` for a real error (the error reporter's first five of a kind) and three.js's own warnings stay, as
    `Log.e` does on the Android side.

## Priorities

- **Never below 60 fps on a Quest 3S and a Quest 3** (2026-10-30: "Never below 60 fps is the goal"; the 60 fps floor on
  battery is a blocker, 2026-11-05; "Any FPS under 60 fps is still considered a bug", 2026-11-06); PERF.md 14, 16.
  Since 2026-11-05 with as little visual change as possible (rule 31 and its relaxations; the earlier "Tiny visual
  changes are ok to reach 60 fps" no longer holds).
- **No full-screen flashes, ever** (the author, throughout): every flash found is a must-fix; the safeties S1 and S2
  (FIXES) back the fixes up. Any dark or bright frame is a flash (the snap turn's blink, the one deliberate dark frame
  of 4.0.31-4.0.34, is gone). The rare unexplained flash of B46 is lived with since 2026-11-06 (Decisions below).
- **Performance is the biggest blocker for the Store submission** (2026-10-28: "once all other tasks are completed,
  performance should be our focus"): after the open tasks, work goes to the frame rate (the Event on a Quest 3S).

## Decisions that close an option

- Flashes (B46): the author, 2026-11-06, after two clean marks in the 4.0.54 run: "No, let's live with the flash. Maybe we
  will never fix it. Could just be related to the Browser." The light record stays off (no test build turns it on).
- Tiny far details (P46) in the town too (2026-11-06, first "No, only the below 60 FPS issues are a problem", then, the
  4.0.54 run having shown the town under 60 at its busiest views: "Since the FPS drops that low in town too: Let's apply
  '2' there as well"): from 4.0.55 P46 runs everywhere, its list rebuilt when an Event starts or ends.
- The 4.0.55 options (2026-11-06, after the 4.0.54 run: "I'm open to more minor visual differences to get the FPS up";
  "Let's apply all options"; "FPS is the biggest blocker we have"): far characters' small parts hidden, characters
  posed every other frame nearer and every third frame far off, P46 at a larger size, the scenery's near-identical
  materials keyed alike, still batches checked less often. 4.0.56-4.0.59 moved the same settings further for the
  readings still under 60 ("Any FPS under 60 fps is still considered a bug"): posed every other frame from 10 m, every
  third from 20 m, small parts hidden from 18 m, P46 at 5 px (FIXES 4.0.55-4.0.59).
- P47 (near-identical character materials keyed alike) is back on (2026-11-06, after the author's 4.0.53 run with it on:
  "P47 was acceptable when I tested. Let's bring it back"): its picture change, up to about 40 px a view at the check's size,
  is accepted.
- Texture arrays for batching: closed (2026-10-27, PERF.md 10); reopened 2026-11-05 ("Please apply 1 to 8") on rule 31's terms only: each texture keeps its own pixels, mipmaps and filtering, the picture unchanged.
- The Event's own render scale (P16, P17) and P18: removed (2026-10-28) [83].
- The experiment-first rule (15): retired (2026-10-28, rule 22).
- The randomness decision list: closed (2026-10-29, RANDOMNESS.md; FIXES R4-R6).
- The Garden stays flat (2026-10-30: "regardless of anything else we will be keeping the flat version"; F-B57).
- P28, far characters posed every other frame: removed (2026-10-30, F-B56); reopened in another form as P45 (4.0.53,
  rule 31's Event relaxation, the 4.0.55 options above).
- Hiding a lost frame's draw: of the four options put to the author on 2026-11-03 (no colour clear; MSAA 2 on the
  layer; the classic two-eye path; skipping a late frame), only the first goes ahead (4.0.24, S30): "let's close out
  options 2, 3, and 4"; "I don't want to try option 3 at any point" (the classic two-eye path stays closed for good);
  "2 and 4 may introduce other problems".
- Option 1 (no colour clear, S30, 4.0.24): taken out in 4.0.25 (2026-11-03, "The next build should not have the no clear
  addition"); the colour is cleared each frame (S18: black; since 4.0.27 a muted green outdoors and black in the Cave, S33). Closed for good (2026-11-03, "Let's remove the no-clear
  option. The risk is too high. We can close this option out as well"): no build tries it again.
- The plain WebXR layer (the `nolayers` experiment, no projection layer, no multiview): closed (2026-11-03, "Close out
  the no layers build. It has serious issues and we're not taking this route"); the experiment is removed, and
  rule 29 makes it standing: no build drops the `layers` feature.
- Releasing the loader (its layers destroyed, its context lost) during a session: reverted for good (B96, 4.0.34): it
  left the browser re-making the destroyed layers' swapchains after the headset slept until the memory ran out. The
  loader stays whole for the session; no layer is destroyed and no context lost while a session runs.
- A test build without the depth discard (P14, the layer's end): closed (2026-11-03, "'Test a build without the
  depth discard' close out this option"). The discard stays in every build; no experiment build drops it.
- Fewer draws by merging more of them into the batch path: closed (2026-11-05, "Let's close out option 4"; option 4 of
  the list of next performance options put to the author that day: a census of the remaining draws and merging the ones
  that could join a batch). The batch path does its sums on the GPU, so merges risked changing pixels; no build tries it.
  Texture arrays (option 5) stay open on rule 31's terms. **Amended** (2026-11-05: "Let's try atlasing. But follow the
  rule that it should impact visuals as little as possible. Update our other decisions to allow for this option"):
  the characters' textures packed into one atlas a character, so that a character's textured parts can share its
  batches, is allowed: it does join draws in the batch path, as option 4 would, but only those the atlas makes
  possible, built to change the picture as little as it can (padding against bleeding at the atlas's edges, the
  same texels, the same filtering) and tested against the build before (rule 31: the pixel count, pictures of both
  builds, the speed). Merging other draws into the batch path stays closed. **Amended again** (2026-11-06, rule 31's
  Event relaxation): near-identical character materials may be keyed alike so more character parts share batches.
- The Event's headroom by fading more scenery: closed (2026-11-03, "let's close out this option altogether. I don't
  want anything that will effect user experience negatively"); the measurement (FIXES S30) showed nothing to take
  without hiding what the player sees, and nothing that costs the player's view is taken for performance from here on.
  **Amended** (2026-11-06, rule 31's Event relaxation): during the Event, unbatched details under 2-3 pixels may be
  hidden, with a margin against flicker. Fading more scenery stays closed.
