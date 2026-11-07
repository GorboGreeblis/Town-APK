// The headset log readers on a log of the shipped game (quick tier; no browser, no headset). Since 4.0.63 the shipped
// game writes no lines of its own (RULES.md 34) and since 4.0.64 the capture holds the headset runtime's VrApi lines only
// (capture_log): two processes log them, the game's and the system shell's (while the system menu draws). This makes
// such a log (a 5-minute game session at 72 Hz with two dips and a 20-second system-menu visit, the shell at 90 Hz)
// and checks:
//   - perf_log.js reads it: the game's process named as the game, its seconds under 60 found, the shell's time listed
//     as the game out of the foreground, and the note that the final build writes no game lines;
//   - fps_estimate.js reads it (B126-B132's pass, 4.0.64): the game's process picked (the one with the most lines), the
//     shell's seconds left out as pauses, the whole run read as one (no Event split without game lines), the two dips
//     counted and no run of 3 s under 60 made up.
//
//   node tools/test_logreaders.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const T = __dirname;
const out = path.join(T, '.runs', 'logreaders'); fs.mkdirSync(out, { recursive: true });
const failures = [];
const expect = (name, ok, detail) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  [' + detail + ']'}`); if (!ok) failures.push(name); };

// the log: 11-07 12:00:00 on; the game (pid 5000) from 0 s to 300 s, the shell (pid 3000) before, after and at 120-140 s
const pad = (n) => String(n).padStart(2, '0');
const at = (s) => `11-07 ${pad(12 + Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}.000`;
const line = (s, pid, f, hz, gpu) => `${at(s)}  ${pid}  ${pid + 7} I VrApi   : FPS=${f}/${hz},Prd=40ms,Tear=0,Early=0,Stale=0,Stale2/5/10/max=0/0/0/0,VSnc=1,Lat=-4,Fov=0,CPU4/GPU=4/4,1785/525MHz,OC=3F,TA=0/0/0,SP=N/N/N,Mem=2736MHz,Free=3200MB,PLS=0,Temp=34.0C/0.0C,TW=1.20ms,App=${gpu.toFixed(2)}ms,GD=0.00ms,CPU&GPU=10.50ms,LCnt=1(DR90,LM0),GPU%=0.62,CPU%=0.30(W0.40),DSF=1.00,CFL=14.00/20.00,ICFLp95=16.00,LD=0,SF=1.00,LP=0,DVFS=0`;
const L = [];
for (let s = -20; s < 0; s++) L.push(line(s + 20, 3000, 90, 90, 3));           // the home shell before the launch (0-19 s)
for (let s = 0; s < 300; s++) {
  const t = s + 20;
  // the system menu: the shell draws every second; the game's process still logs, every other second (as in the
  // author's logs: the runtime's lines switch process in runs of two)
  if (s >= 120 && s < 140) { L.push(line(t, 3000, 90, 90, 3)); if (s % 2) L.push(line(t, 5000, 2, 72, 1)); continue; }
  const f = s === 200 || s === 201 ? 55 : s === 250 ? 58 : 72;                 // two dips under 60: 2 s, then 1 s
  L.push(line(t, 5000, f, 72, 9));
}
for (let s = 320; s < 330; s++) L.push(line(s, 3000, 90, 90, 3));            // back in the home shell
const log = path.join(out, 'vrapi_only.txt'); fs.writeFileSync(log, L.join('\n') + '\n');

const run = (tool, args) => { try { return execFileSync('node', [path.join(T, tool), ...args], { encoding: 'utf8', timeout: 60000 }); } catch (e) { return String(e.stdout || '') + String(e.stderr || '') + '\nEXIT ' + e.status; } };

const pl = run('perf_log.js', [log]);
expect('perf_log.js names the game\'s process (the one that drew the session)', /process 5000 \(the game\)/.test(pl), pl.split('\n').slice(0, 3).join(' | '));
expect('perf_log.js finds the game\'s seconds under 60 (the two dips, the menu\'s seconds apart)', /process 5000 \(the game\)[^\n]*\d+ s under 60/.test(pl), (pl.match(/process 5000[^\n]*/) || [''])[0].slice(0, 200));
expect('perf_log.js lists the system menu as the game out of the foreground', /the game out of the foreground/.test(pl));
expect('perf_log.js says the final build writes no game lines', /no game perf lines found: the final \(Store\) build writes none/.test(pl));

const fe = run('fps_estimate.js', [log, '--device', 'q3s']);
const head = fe.split('\n')[0] || '';
expect('fps_estimate.js reads a log without game lines (no error)', !/EXIT|no runtime lines/.test(fe), fe.slice(0, 300));
expect('fps_estimate.js picks the game\'s process and says the Event is not told apart', /no game lines: .*process 5000/.test(fe) && /the whole run:/.test(fe), fe.split('\n').slice(0, 3).join(' | '));
const secs = +(head.match(/: (\d+) s of play/) || [])[1];
expect('fps_estimate.js leaves out the menu\'s seconds and the loading (about 300 - 20 - 15 s of play)', secs >= 250 && secs <= 270, head);
const asRun = (fe.match(/Quest 3S, as run:\s+([^\n]*)/) || [])[1] || '';
expect('fps_estimate.js counts the 3 seconds under 60 and no run of 3 s or more', /\b3 of \d+ s under 60/.test(asRun) && /longest run under 60: 2 s, runs of 3 s or more: 0/.test(asRun), asRun);

console.log(failures.length ? `LOG READERS TEST FAILED (${failures.length})` : 'LOG READERS TEST PASSED');
process.exit(failures.length ? 1 : 0);
