// Test pass report (analysis only): turns a `run_tests.sh` log into the result to record in TEST_PLAN.md ("Latest
// results"), so a pass is written up the same way every time, also one cut short by a container restart and finished
// with `--resume` (give every log of the pass, in order: a stage's last run counts).
//   - per stage: PASS / FAIL / INFO (report stages) / not run, its time, and its own PASS and FAIL line counts;
//   - every FAIL line, under its stage; the frame-hazard lines; the runner's SUMMARY when the log has one;
//   - the verdict: every stage of the tier passed, or which did not.
//
//   node tools/pass_report.js tools/.runs/full_3.15.52.log [more logs of the same pass ...] [--md]
// --md prints a Markdown paragraph for TEST_PLAN.md's "Latest results" instead of the plain listing.
const fs = require('fs');
const args = process.argv.slice(2); const md = args.includes('--md'); const logs = args.filter((a) => a !== '--md');
if (!logs.length) { console.log('usage: node tools/pass_report.js LOG [LOG ...] [--md]'); process.exit(2); }

const stages = new Map(); let tier = '', minutes = 0, build = ''; const summary = new Map(), hazards = [];
for (const f of logs) {
  const lines = fs.readFileSync(f, 'utf8').replace(/\r/g, '').split('\n');
  let cur = null, inSummary = false;
  for (const l of lines) {
    let m;
    if ((m = /^Greeblis Town test pass: ([^;\s]+)/.exec(l))) { tier = m[1]; const b = /; build ([^;\s]+)/.exec(l); if (b) build = b[1]; }
    if ((m = /^=== SUMMARY \((\S+), (\d+) min\) ===/.exec(l))) { inSummary = true; tier = m[1]; minutes += +m[2]; cur = null; continue; }
    if (inSummary) {
      if ((m = /^  (PASS|FAIL|INFO|SKIP)  (.*?)(?: \(([^()]*)\))?$/.exec(l))) summary.set(m[2], { result: m[1], note: m[3] || '' });
      else if (/^\s+\S/.test(l) && /frame-hazard|hazard|XR frames/.test(l)) hazards.push(l.trim());
      continue;
    }
    if ((m = /^=== (?:report: )?(.*) ===$/.exec(l))) { const report = /^=== report: /.test(l); cur = { name: m[1], report, pass: 0, fail: 0, fails: [], end: '' }; stages.set(m[1], cur); continue; }
    if (!cur) continue;
    if (/^\s*PASS\s/.test(l)) cur.pass++;
    if (/^\s*FAIL\s/.test(l)) { cur.fail++; if (cur.fails.length < 6) cur.fails.push(l.trim().slice(0, 300)); }
    if (/\b(PASSED|FAILED)\b/.test(l) && !/^\s*(PASS|FAIL)\s/.test(l)) cur.end = l.trim().slice(0, 160);
  }
}
const rows = [];
for (const [name, s] of stages) {
  const sum = summary.get(name);
  const result = sum ? sum.result : s.report ? 'INFO' : (s.fail || /FAILED/.test(s.end)) ? 'FAIL?' : /PASSED/.test(s.end) ? 'PASS?' : 'ended?';
  rows.push({ name, result, time: sum ? sum.note : '', pass: s.pass, fail: s.fail, fails: s.fails });
}
for (const [name, sum] of summary) if (!stages.has(name)) rows.push({ name, result: sum.result, time: sum.note, pass: 0, fail: 0, fails: [] });
const bad = rows.filter((r) => /FAIL/.test(r.result)), pending = rows.filter((r) => /\?$/.test(r.result) && !/FAIL/.test(r.result));
const passLines = rows.reduce((a, r) => a + r.pass, 0), failLines = rows.reduce((a, r) => a + r.fail, 0);
const verdict = !summary.size ? 'no SUMMARY yet (the pass is still running, or was cut short: finish it with --resume)'
  : bad.length || hazards.length ? `${bad.length} stage(s) failed${hazards.length ? ', frame hazards seen' : ''}` : 'every stage passed';

if (md) {
  const ver = build || 'an unnamed build (the log predates the build line)';
  console.log(`**${tier ? tier[0].toUpperCase() + tier.slice(1) : 'A'} tier on ${ver}** (\`${logs.map((l) => l.replace(/^.*tools\//, 'tools/')).join('`, `')}\`${minutes ? `, ${minutes} min` : ''}): ${verdict}; ${rows.length} stages, ${passLines} PASS lines, ${failLines} FAIL lines.` +
    (bad.length ? ' Failed: ' + bad.map((r) => `${r.name} (${r.fails.slice(0, 2).map((f) => f.replace(/^FAIL\s+/, '')).join('; ') || r.time})`).join(' | ') + '.' : '') +
    (hazards.length ? ' Frame hazards: ' + hazards.slice(0, 3).join(' | ') + '.' : ''));
} else {
  console.log(`tier: ${tier || '?'}; build: ${build || '? (log predates the build line)'}; logs: ${logs.join(', ')}${minutes ? `; ${minutes} min` : ''}`);
  for (const r of rows) {
    console.log(`  ${r.result.padEnd(6)} ${r.name}${r.time ? ` (${r.time})` : ''}  [${r.pass} PASS, ${r.fail} FAIL]`);
    for (const f of r.fails) console.log(`           ${f}`);
  }
  for (const h of hazards) console.log(`  HAZARD ${h}`);
  if (pending.length) console.log(`  (${pending.length} stage(s) without a SUMMARY entry: judged from their own output, marked with ?)`);
  console.log(`VERDICT: ${verdict}; ${rows.length} stages, ${passLines} PASS lines, ${failLines} FAIL lines`);
}
process.exit(bad.length || hazards.length ? 1 : 0);
