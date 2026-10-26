# tools/

| File | Purpose |
| --- | --- |
| `uncompressed.html` | The untouched final HTML version of the game. Source of truth. |
| `index.compressed.html` | The compressed HTML release build, kept for reference and parity checks. |
| `apply_entry_fix.py` | Generates `android/app/src/main/assets/index.html` from `uncompressed.html` by applying the four VR-entry edits. `--verify` checks the asset equals the original plus exactly those edits. |
| `GAME.md` | Basic documentation of the game as found in the code. |
| `run_tests.sh` | The test suite: runs everything below and prints a summary. `--quick` skips the browser tests. |
| `test_server.sh` | Compiles the APK's `GameServer` for a desktop JVM (`server_harness/` holds a stub `android.util.Log` and the `Harness` driver) and checks it serves the game byte-for-byte, plus HEAD/404/405/query handling and concurrency. `--serve` keeps it running at `http://127.0.0.1:17777/` so the game can be opened in a desktop browser exactly as the Quest Browser will see it. |
| `test_entry.js` | Headless Chromium (Playwright) test of the VR-entry fix with a fake `navigator.xr`: early grant, late grant, no grant. Run it against `uncompressed.html early` to see the original drop the grant. |
| `test_parity.js` | Unpacks the compressed release build in headless Chromium and checks it carries the same string and numeric literals as the uncompressed source. Writes details to `.parity/` (git-ignored). |
| `check_apk.sh` | Checks a built APK against VRC.Quest.Packaging.1-6 using `aapt2` and `apksigner`, plus the immersive launch wiring and that the bundled game matches the asset. |

## Running

```sh
export ANDROID_HOME=/path/to/android-sdk     # platforms/android-34, build-tools/34.0.0
tools/run_tests.sh                           # full suite (browser tests take a few minutes)
tools/run_tests.sh --quick                   # no browser tests
```

Individual tools:

```sh
python3 tools/apply_entry_fix.py             # regenerate the asset
python3 tools/apply_entry_fix.py --verify
tools/test_server.sh                         # or: tools/test_server.sh --serve
node tools/test_entry.js                     # patched asset, all scenarios
node tools/test_entry.js tools/uncompressed.html early
node tools/test_parity.js
tools/check_apk.sh android/app/build/outputs/apk/release/app-release.apk
```

Requirements: python3, JDK 17+, Node 18+ with `playwright` (and its Chromium)
installed, Android SDK for the server harness and APK checker.
