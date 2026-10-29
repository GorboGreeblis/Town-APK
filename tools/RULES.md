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
   NPCs wander, NPCs' interactions with each other and which chats play ("should still appear random"), the UFO's
   heading, and which way each flint lies (2026-10-29: "Close out as intended"). The UFO's flight path is as intended
   the way it is (2026-10-29: "The UFO's path is currently fine the way it is. Mark as intended": it draws from the
   game's seeded generator, so its first flight is likely the same on every launch). Seeded, the same on every
   launch (2026-10-29: "1 to 7: seed", FIXES R5): the stars, the clouds, blinks, idle sway phases, Anomalee's glitch
   timing and jaw, the Event ring's sway. Random by the author's word too (2026-10-29: "whatever you recommended we
   keep random, keep random"): particles and splats, the pickups' bob and glint, sound pitch variation, Anomalee's
   glitch shake, the robin's return, the Gem's sparkles (RANDOMNESS.md). Painted textures are seeded (the same on every launch, FIXES R1 [88]). Any other randomness is the author's
   call ("other instances of randomness are questionable"): list it and ask before changing it.

## How the game looks

6. **As little visual change as possible** for every change (the author, throughout). A performance change that
   claims no visible change must prove identical pixels (`opt_identity.js`, or a dedicated proof); anything visible
   is put to the author first, with pictures.
7. **Creature designs are final** (2026-10-27). Fix a model with care and without changing its look; anything the
   author would notice is their call (RELEASE.md 6, CREATURES.md).
8. **Emotes have one colour per glyph** (2026-10-28, F-B29, approved): heart pink, note lime, flower, `!`, star and
   sparkle yellow, `?` teal, the rest white.
9. **No texture is made during play** (2026-10-28, F-B29/F-B30): everything is made while loading
   (`texture_census.js`).
10. **No render-scale changes** (2026-10-28: the Event's resolution drop removed, "close out that option"; both flash
    experiments in the release): the projection layer is never swapped; the quality governor changes foveation only
    (F-B31) [83].

## Builds and the repository

11. **The repository root holds only** `GreeblisTown-release.apk`, `index.html` and `tools/` (2026-10-27).
12. **The APK and `index.html` at the root are always the latest build** (2026-10-27; restated 2026-10-28: "The .apk
    and index.html file in root must always be the latest build"). Every change to the game is followed by a rebuild
    and a version bump (`versionCode` only goes up) before it is committed (`tools/build.sh --bump`). Enforced:
    `sync_game.py --check` (quick tier, pre-commit hook) fails if `index.html` differs from the game file; the
    pre-commit hook and `check_apk.sh` fail if the root APK does not hold the current game; `test_standalone.js`
    fails if its pre-painted textures are stale.
13. **Never commit the signing keystore.**
14. **Commit often**; living documentation lives in `tools/`.
15. **(Superseded by rule 22, 2026-10-28.) Changes to the entry script, the layers shim or the multiview path shipped first as an experiment APK**
    (`tools/build_experiment.sh NAME`) for a headset test, then into the main build (RELEASE.md 6; 3.15.11 skipped
    this and crashed at launch, F-B15).
16. **Note all rules in the documentation** (2026-10-28: "Please be sure to always note all rules in the
    documentation, for further work"): this file.

## Names and devices

17. **Names**: "the Event" is the planting event; "the Speech" is Sparkakus's library finale.
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
20. **The compressed version lives in `tools/` beside the uncompressed one, works as a Bitcoin ordinal, and is always
    updated with the others; the APK never uses it** (2026-10-28: "create a Bitcoin ordinal compressed version of the
    game and store it in the tools folder. This build must always always be updated with the others", "The Compressed
    version should always be the latest version of the game", "must be fully
    functional as a Bitcoin ordinal, as the previous compressed version was", "The .apk should never use the
    compressed version of the game file. The tools folder should contain both a compressed version and an
    uncompressed version of the game file", "Look to the previous compressed game file for methods of compression")
    [89]. `tools/index.compressed.html`, built by `build_compressed.js` (in `build.sh`) with the previous compressed
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

## Priorities

- **Performance is the biggest blocker for the Store submission** (2026-10-28: "once all other tasks are completed,
  performance should be our focus"): after the open tasks, work goes to the frame rate (the Event on a Quest 3S).

## Decisions that close an option

- Texture arrays for batching: closed (2026-10-27, PERF.md 10).
- The Event's own render scale (P16, P17) and P18: removed (2026-10-28) [83].
