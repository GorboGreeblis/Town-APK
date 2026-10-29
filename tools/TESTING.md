# Running and writing the tests

How to run the test passes, read their results, and add a test that holds up. What each test checks is in
README.md (one row per tool) and TEST_PLAN.md (one row per thing to test, with its coverage); this file is the
how-to. Numbers in brackets are NOTES.md entries.

## 1. Running the passes

```
tools/run_tests.sh --quick      static checks, no browser                    about 1 minute
tools/run_tests.sh --smoke      a spot check of every element                 about 10 minutes
tools/run_tests.sh              the standard pass (default)                   about an hour
tools/run_tests.sh --full       every scenario, long soaks, graphics, perf    2-2.5 hours; the final build only
... --resume                    skip the stages that already passed (section 2)
... --only=REGEX                run only the stages whose name matches, with the tier's settings
```

The summary at the end gives each stage's time and the whole pass's. To re-run one failed stage exactly as the tier
ran it: `tools/run_tests.sh --only='quality governor'` (any part of its name; case does not matter).

Times are on a 4-core cloud container. Every browser stage runs one headless Chromium with SwiftShader (the GPU
is software), so the stages run one after another. Do not run a second browser test while a pass runs: the
timing checks (the governor, the perf report, the jazz drums, hitches) measure the shared CPU and would fail on
the contention, not on the game.

What a pass needs: `python3`, a JDK 17+, `node` with `playwright` (the container has Chromium installed, see
`require('playwright')`), the tools' own packages (`npm install --prefix tools`: terser for `minify_game.js`, acorn), and the Android SDK for the server harness and the APK checker. `ANDROID_HOME` is used
when set; otherwise the runner takes `sdk.dir` from `tools/android/local.properties`, the SDK the Gradle build
uses.

Environment switches for the browser tests:

| Variable | Effect |
| --- | --- |
| `GT_ASSET=path` | The game file the browser tests load (an experiment build); the copy, minify, compressed and APK checks always check the game file and the root APK. |
| `GT_MULTIVIEW=0` | The classic two-pass path instead of multiview (the headset's path since 3.15.34, the default). |
| `GT_DEVICE=quest3s` / `quest3` / `quest2` | That headset's user agent and GPU limits (`fakexr.js` `DEVICES`); the default user agent is a Quest 3. |
| `GT_HEADSET_FOV=1` | Quest 3-shaped eyes, for draw counts and culling as on the headset. |
| `GT_LAYER_DEPTH=0` | The layer brings no depth texture, so multiview draws into the game's own depth buffer as on the headset (P14's depth discard runs). |

Logs: pipe a pass into `tools/.runs/` (git-ignored), for example
`nohup sh tools/run_tests.sh --resume >> tools/.runs/std_v41.log 2>&1 &`. Each stage prints its PASS/FAIL/NOTE
lines; the summary at the end lists every stage (and is kept in `tools/.runs/summary_<tier>.txt`); the first line
names the tier, the build and the time. Record a finished pass in TEST_PLAN.md ("Latest results") and in the pull
request: `node tools/pass_report.js tools/.runs/full_X.log --md` writes the paragraph (stages, PASS and FAIL lines,
every failure, the frame hazards, the verdict); give it every log of a pass that a restart split.

After a pass (RULES.md 23: every build gets the full tier until the author says otherwise):
- A stage that failed for a reason now fixed: run it again alone with the same tier's settings,
  `tools/run_tests.sh --full --only='docs consistency'` (the name is matched as a case-insensitive regular
  expression), and record both runs.
- A fix to the game is a new build (`build.sh --bump`), and a new build gets its own full pass; `--resume` skips
  nothing then, since every stage's key includes the asset.
- A fix to one test or tool only: `--resume` re-runs just the stages whose files changed.

## 2. When the machine restarts

The cloud container can restart without warning (three times during one full pass of 3.15.41, NOTES 77), which
kills every process. Files, commits and logs survive; environment variables do not.

- Start long passes with `--resume`. Each stage that passes is written to `tools/.runs/resume_<tier>.txt` with a
  key made from the files it used: the asset, the APK, the harness and fake headset, and the files its own
  command names (its test script). Run the same command again after a restart and every stage that already
  passed on those same files is shown as `PASS ... (earlier run)` and skipped; failed and new stages run.
  Editing one test re-runs only that test. Delete the state file to start clean.
- For a single test, check the end of its log: a test cut short has no `... PASSED` / `... FAILED` line.

## 3. Machine speed and the performance report

`perf_report.js` fails on script frame times, which depend on the machine. It times a fixed in-page workload
before and after the situations and keeps the faster of the two (a load spike only slows it). The baseline
(`perf_baseline.json`) stores that time as `calib`; each run scales the baseline's times by the ratio, and the
absolute limits (p99 12 / 16 ms, max 120 ms) by the ratio to the machine they were set on (`ABS_CALIB`, about
2.0 ms), never below their own values. Write a new baseline (`--update-baseline`) only from a build that passed
on the same machine, and only after comparing it with the previous build back to back on one machine: 3.15.40
and 3.15.41 matched within noise, which is what showed the old baseline, not the build, was off [77].

## 4. Writing a test

Most tests follow the same shape (see `test_greet.js`, the shortest):

```js
const { boot, reporter } = require('./lib/harness');
const { expect, note, failures } = reporter();
const g = await boot({ file, vr: true, fastSim: false });   // the game in a fake VR session
const r = await g.page.evaluate(async () => { const D = window.__dbg; /* drive the game, return plain data */ });
expect('what must be true, in words a reader can check', condition, 'details shown on failure');
console.log(failures.length ? 'X TEST FAILED' : 'X TEST PASSED'); process.exit(failures.length ? 1 : 0);
```

`boot()` serves a temporary copy of the game with a debug hook, installs the fake headset (`fakexr.js`), grants
the session and waits for XR frames. Options: `vr` (default true; the game only runs NPCs, pickups and input while
presenting), `fastSim` (default true: rendering is stubbed so game logic runs fast; set `false` when the test
needs real frames, the batcher's uniform arrays or the dialogue box's canvas), `noVisits` (default true: the
random visit scheduler is held off), `initScripts` (functions that run before the game's first line, e.g. to
wrap a browser API, as `test_audio.js` wraps Web Audio).

**The frame-hazard watch.** Every boot through the harness watches for GPU work inside an XR frame callback (texture uploads and copies, mipmap builds, pixel reads, renderbuffer storage, shader compiles: the flash causes, NOTES 67, 80, 91), on both render paths, whatever the test is about. `close()` prints a WARNING line and appends to `.runs/frame_hazards.log`; `run_tests.sh` lists them in its summary and fails the pass. A test can read the record itself with `g.frameHazards()`.

**Standalone mode.** `boot({ standalone: true })` serves the game file and nothing else (every other path is a 404, as from any plain web server with the file alone) and returns every request the page made in `requests`; `test_standalone.js` uses it to prove the game needs nothing beside it (RULES.md 2).

**Reaching the game.** `window.__dbg` holds the game's top-level names (`HOOK_NAMES` in `lib/harness.js`): `It`
(all entities; `It.byId`), `JGP` (navigation, roaming, `JGP.jazz`, `JGP.farDetail`, `JGP.slug`), `Kt` (the
player's inventory and rewards), `At` (the player's rig), `Re.t` (the game clock in seconds), `qt` (the dialogue
box), `_t` (panels), `xe` (the interaction menu: `xe.actionsFor(target)`), `z.list` / `E.list` (zones), `st`
(Sparkakus), `ot` (the Portal), `Bulb`, `me` (the Event), `ee` (the horn), `gcEB` (the batcher), `O` (the
renderer), `C` (the scene), `B` (the camera). Names declared in another scope are tagged in the test copy
(`TAGGED`: `Ge` the governor, `VIGS` the vignettes, `UI` the second `F`). A name that fails to resolve becomes a
lazy getter, so a hook that does not exist reads as `undefined` rather than breaking the boot.

**Only these names are stable.** Since 3.15.45 the game file is minified (RULES.md 19): every local name is the
minifier's choice and can change whenever the file is minified again. The names kept are `RESERVED` in
`minify_game.js`: `HOOK_NAMES` and the `TAGGED` names above, plus `Ge`, `VIGS`, `F`, `W`, `t`, `bend` and `park`;
property names and globals (`window.__gt*`, `gcEB`, `mvInFrame`...) are never renamed. Reach everything else
through them, never by a local name read from the file (names quoted elsewhere in the docs may be from the
unminified 3.15.44 file, git 21596f1). A test that needs another top-level name adds it to `HOOK_NAMES` (which
`RESERVED` includes) before the next minification, and the harness's anchors (`gcEB.ready=!0;`, the `TAGGED`
declarations) must keep matching.

**Drive the game through its own entry points**, the way a player would reach them: the menu's actions
(`xe.actionsFor(e).find(...).run()`), `Dbt.start(dancer)` for a battle, `oe.open()` and its "Yes" for the Event,
moving `At.position` for walking. Do not set state the game derives: `me.active` is a read-only getter (start
the real Event instead), and a speaker's `busy` comes from what they are doing.

**Wait in game time, not wall time.** On a slow or busy machine the game runs slower than the wall clock. Wait
for `D.Re.t` to advance (`gwait` in `test_content.js`), with a wall-clock cap only as a safety net.

**Wait for the condition the game itself waits for.** Most flaky first drafts started something while the game
was in a state where it rightly refused or cut it short:
- a vignette ends at once when a speaker is busy; Sparkakus becomes busy whenever he walks to his shelves, so
  wait until both speakers are free and hold him (`st.ent.stay()` / `browse()`, as the game does for a visit);
- the jazz drums keep the audio clock for 1.5 s after the player stops hearing them, and each clock switch
  starts the bars again; judge each clock's run on its own;
- Mama Gorbo's heart count stays at 8 between meetings; wait for a meeting's own first goo arc;
- the courier delivers on its own when it reaches the player; accept that as a delivery.

**Read the game file, not an old copy.** Since 3.15.43 `uncompressed.html` is the release (the asset and the root
`index.html` are byte-identical copies); the author's original is in git history only, and differs in places
(its batcher stored four vec4 a part, the release five). Do not rely on a detail read from the original.

**Make the failure say why.** Each `expect` names the rule in plain words and prints the data that broke it
(the first few offenders, not all of them). Use `note` for measurements worth keeping in the log. A test that
can only pass is no test: when it is new, check that it fails on a build or a state where the rule is broken
(the warm-up coverage check fails on 3.15.40 and passes on 3.15.41).

**Add it to the pass.** A `run "<what it checks>" node "$ROOT/tools/test_x.js" "$ASSET"` line in the right tier of
`run_tests.sh`, a row in README.md, and the TEST_PLAN.md row it covers marked done with the build it passed on.
