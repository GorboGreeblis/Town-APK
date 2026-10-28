// Randomness census (report, not in the tiers): every place the game calls Math.random, found by running it, so calls
// made through the game's helpers (a range, a whole number, a pick from a list) are traced back to their caller. The
// author's rule (RULES.md 5): cut randomness that is not part of play; what stays random is decided by the author, so
// this lists it for that decision. Texture painters are seeded (FIXES R1) and do not appear.
//
// A copy of the game file gets a wrapper around Math.random at the very top; each call records the two innermost
// stack frames and when it happened: while loading (before the world is ready), in town, or in the planting Event.
// Sites are grouped by their caller and printed with the code around them, busiest first.
//
//   node tools/random_census.js [game file] [town seconds] [Event seconds]     default: the game file, 60, 60
//   output: tools/.runs/random_census.json and the listing on stdout
const fs = require('fs');
const path = require('path');
const { boot, root } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'tools/uncompressed.html');
const townS = +(process.argv[3] || 60), eventS = +(process.argv[4] || 60);
const WRAP = `<script>(()=>{const R=Math.random,S=window.__gtRand={phase:"load",sites:{}};Math.random=function(){`
  + `const st=(new Error).stack.split("\\n").slice(2,4).map(l=>{const m=/:(\\d+):(\\d+)\\)?$/.exec(l);return m?m[1]+":"+m[2]:"?"}).join("<");`
  + `const k=S.phase+" "+st;S.sites[k]=(S.sites[k]||0)+1;return R()}})()</script>`;
(async () => {
  const src = fs.readFileSync(file, 'utf8');
  const tmp = path.join(root, 'tools/.runs/random_census_game.html');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, src.replace(/<head[^>]*>/i, (m) => m + WRAP));
  const g = await boot({ file: tmp, vr: true, fastSim: false });
  const page = g.page;
  const res = await page.evaluate(async ([townS, eventS]) => {
    const D = window.__dbg, S = window.__gtRand, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    S.phase = 'town'; await wait(townS * 1000);
    S.phase = 'event';
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    const Kt = D.Kt; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true; D.oe.open(); await wait(300);
    const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 15000) await wait(200);
    const event = !!D.me.active; await wait(eventS * 1000); clearInterval(adv);
    const body = await (await fetch(location.href)).text();
    return { sites: S.sites, event, body };
  }, [townS, eventS]);
  await g.close();
  // line:col -> the code there (the served copy, with the harness hook, is what the stack numbers refer to)
  const lines = res.body.split('\n');
  const at = (lc) => { const [l, c] = lc.split(':').map(Number); const s = lines[l - 1] || ''; return s.slice(Math.max(0, c - 90), c + 70).replace(/\s+/g, ' '); };
  const groups = {};
  for (const [k, n] of Object.entries(res.sites)) {
    const [phase, st] = k.split(' '); const [inner, caller] = st.split('<');
    const g2 = groups[st] || (groups[st] = { inner, caller, load: 0, town: 0, event: 0 }); g2[phase] += n;
  }
  const list = Object.values(groups).sort((a, b) => (b.load + b.town + b.event) - (a.load + a.town + a.event));
  for (const s of list) { s.innerCode = at(s.inner); s.callerCode = s.caller && s.caller !== '?' ? at(s.caller) : ''; }
  fs.writeFileSync(path.join(root, 'tools/.runs/random_census.json'), JSON.stringify({ event: res.event, townS, eventS, sites: list }, null, 1));
  console.log(`${list.length} call sites (load / ${townS} s town / ${eventS} s Event${res.event ? '' : ', Event did not start'}):`);
  for (const s of list) console.log(`\n[${s.load} / ${s.town} / ${s.event}] ${s.inner}\n   at:     ${s.innerCode}\n   caller: ${s.callerCode}`);
})().catch((e) => { console.error(e); process.exit(1); });
