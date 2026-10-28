# The author's rules

Every standing rule the author has set for this project, in one place. Read it before any change; when the author
sets a new rule, add it here (with the date and the author's words) in the same change. Other docs may repeat a rule
where it applies; this file is the list. Numbers in brackets are NOTES.md entries.

## The game file

1. **One game file, edited directly** (2026-10-28: "I want all edits applied to the game file itself. Not applied
   after. Please edit the actual file"; "this also means adding all changes to the actual uncompressed file") [87].
   The game is `tools/uncompressed.html`. Every change is made in it. Never edit `index.html` or the APK's asset:
   they are copies, written by `python3 tools/sync_game.py` and checked by `sync_game.py --check` (quick tier,
   pre-commit hook).
2. **The game must always be rebuildable from the game file alone** (2026-10-28: "I want to ensure that the game
   itself can be rebuilt from the index.html file"; "as a rule this should always be possible"). It runs fully with
   nothing beside it (no files, no server, nothing from the web), and everything shipped with it is derived from it:
   the copies (`sync_game.py`) and the pre-painted textures in the APK's `assets/tex/`
   (`node tools/prerender_textures.js`, after any change to a texture painter). `tools/build.sh` rebuilds all of it
   from the game file in one command. `test_standalone.js` (every tier but quick, and the last step of `build.sh`)
   proves both: it runs the game file alone and checks every pre-painted texture is exactly what the game
   paints [88].
3. **No original, no compressed build kept** (2026-10-28: "we don't need to save the original anywhere in the
   repo"; "we will no longer have a 'compressed' version either") [87]. Git history has them.
4. **Every change is recorded** in `tools/FIXES.md` (the changelog: what, why, who decided, how it was proven), with
   longer investigations in NOTES.md and bugs in BUGS.md.
5. **Randomness: cut it where it is not part of play** (2026-10-28: "we should cut as much randomness as possible").
   These stay random, by the author's word: where Flint and Blossoms spawn ("should still spawn randomly"), where
   NPCs wander, NPCs' interactions with each other and which chats play ("should still appear random"), the UFO's
   heading. Painted textures are seeded (the same on every launch, FIXES R1 [88]). Any other randomness is the author's
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
12. **The root APK is always the latest build** (2026-10-27): every change to the game is followed by a rebuild and a
    version bump (`versionCode` only goes up) before it is committed (`tools/build.sh --bump`); the pre-commit hook
    checks it.
13. **Never commit the signing keystore.**
14. **Commit often**; living documentation lives in `tools/`.
15. **Changes to the entry script, the layers shim or the multiview path ship first as an experiment APK**
    (`tools/build_experiment.sh NAME`) for a headset test, then into the main build (RELEASE.md 6; 3.15.11 skipped
    this and crashed at launch, F-B15).
16. **Note all rules in the documentation** (2026-10-28: "Please be sure to always note all rules in the
    documentation, for further work"): this file.

## Names and devices

17. **Names**: "the Event" is the planting event; "the Speech" is Sparkakus's library finale.
18. **Devices**: the author tests on a Quest 3S (its browser reports itself as "Quest 3"). Quest 2, Quest Pro and
    the original Quest are not supported (manifest `quest3|quest3s`).

## Decisions that close an option

- Texture arrays for batching: closed (2026-10-27, PERF.md 10).
- The Event's own render scale (P16, P17) and P18: removed (2026-10-28) [83].
