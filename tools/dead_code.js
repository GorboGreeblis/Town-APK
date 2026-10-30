// Dead code census (report): which functions of the game file never ran in any recorded session. Record sessions
// with GT_COVERAGE=1 (the harness writes V8 function coverage to tools/.runs/coverage/ when a test closes; e.g.
// `GT_COVERAGE=1 tools/run_tests.sh --standard`), then:
//
//   node tools/dead_code.js [game file] [--min BYTES] [--all]     default: tools/uncompressed.html, functions >= 200 bytes
//
// For each script of the page (the head scripts, three.js, the game) it parses the source as served (with the test
// hooks, as the harness serves it), marks every function some session ran, and lists the outermost functions none
// ran, largest first, with their size and a snippet (string literals help find them in the source). A function that
// never ran is a candidate, not a verdict: rare paths (errors, other headsets, the classic render path, a later
// Event) may simply not have come up; each one is checked by hand before anything is removed.
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const { root, hooked } = require('./lib/harness');
const args = process.argv.slice(2);
const file = path.resolve(args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || path.join(root, 'tools/uncompressed.html'));
const minI = args.indexOf('--min'), MIN = minI >= 0 ? +args[minI + 1] : 200, ALL = args.includes('--all');
const dir = path.join(root, 'tools/.runs/coverage');
const body = String(hooked(file));
const lines = body.split('\n'), lineStart = [0]; for (const l of lines) lineStart.push(lineStart[lineStart.length - 1] + l.length + 1);
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
if (!files.length) { console.log('no coverage recorded: run tests with GT_COVERAGE=1 first'); process.exit(1); }
const ran = new Map();   // script start offset in the page -> Set of function end offsets that ran
const seenScripts = new Map();
let sessions = 0;
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (path.resolve(c.file) !== file) continue;
  sessions++;
  for (const s of c.scripts) {
    const at = lineStart[s.startLine] + s.startColumn;
    seenScripts.set(at, s.length);
    const set = ran.get(at) || new Set(); ran.set(at, set);
    for (const [, , end, count] of s.functions) if (count > 0) set.add(end);
  }
}
if (!sessions) { console.log(`no coverage recorded for ${path.relative(root, file)} (${files.length} files for other game files)`); process.exit(1); }
console.log(`${sessions} recorded sessions of ${path.relative(root, file)}; ${seenScripts.size} scripts`);
let totalDead = 0;
for (const [at, len] of [...seenScripts].sort((a, b) => b[1] - a[1])) {
  const src = body.slice(at, at + len), set = ran.get(at);
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }); } catch (e) { console.log(`script at ${at}: not parsed (${e.message})`); continue; }
  const dead = [];
  const walk = (n, deadAbove) => {
    if (!n || typeof n.type !== 'string') return;
    const isFn = /Function/.test(n.type);
    let nowDead = deadAbove;
    if (isFn && !deadAbove && !set.has(n.end)) { dead.push(n); nowDead = true; }
    for (const k in n) { const v = n[k]; if (k === 'loc' || k === 'start' || k === 'end') continue; if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && walk(x, nowDead)); else if (v && typeof v.type === 'string') walk(v, nowDead); }
  };
  walk(ast, false);
  const bytes = dead.reduce((a, n) => a + n.end - n.start, 0); totalDead += bytes;
  const ln = lineStart.findIndex((s) => s > at) - 1;
  console.log(`\n== script at line ${ln + 1} (${(len / 1024).toFixed(0)} KB): ${dead.length} functions never ran, ${(bytes / 1024).toFixed(1)} KB (${(100 * bytes / len).toFixed(1)}%)`);
  for (const n of dead.sort((a, b) => (b.end - b.start) - (a.end - a.start))) {
    const size = n.end - n.start; if (size < MIN && !ALL) continue;
    const text = src.slice(n.start, n.end), strs = (text.match(/"[^"\\]{3,40}"/g) || []).slice(0, 4).join(' ');
    console.log(`  ${String(size).padStart(6)} B  @${n.start}  ${text.slice(0, 110).replace(/\s+/g, ' ')}${strs ? '   strings: ' + strs : ''}`);
  }
}
console.log(`\ntotal never ran: ${(totalDead / 1024).toFixed(1)} KB`);
