// Audio test (standard tier): the game makes all its sound with Web Audio, one context and short-lived nodes
// (a note is an oscillator and a gain that disconnect themselves when the note ends; the jazz, the ambience and the
// drums build theirs on G.ctx()). A leak would be sources that never end, or a second context, piling up over a
// long session until the headset's audio thread stutters. Before the game's first line this wraps the Web Audio
// API to count every context, node, source start and end, then plays the same round of sounds three times (talk,
// a gift, a dance battle with its drums, the Portal, Sparkakus's bulb, the jazz, pickups) and checks that what is
// still playing after each round settles is no more than before the first, and that a suspended context (headset
// off the head, the app in the background) runs again when the game is back in focus.
//
//   node tools/test_audio.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const probe = () => {
  const A = window.__aud = { ctxs: 0, ctx: null, made: {}, live: new Set(), started: 0, ended: 0, endedConnected: 0, out: new WeakMap() };
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  window.AudioContext = class extends Ctx { constructor(...a) { super(...a); A.ctxs++; A.ctx = this; } };
  const P = window.BaseAudioContext ? BaseAudioContext.prototype : Ctx.prototype;
  for (const k of Object.getOwnPropertyNames(P)) {
    if (!/^create/.test(k)) continue;
    const d = Object.getOwnPropertyDescriptor(P, k); if (!d || typeof d.value !== 'function') continue;
    const f = d.value;
    P[k] = function (...a) { const n = f.apply(this, a); A.made[k] = (A.made[k] || 0) + 1; return n; };
  }
  const N = AudioNode.prototype, c0 = N.connect, d0 = N.disconnect;
  N.connect = function (...a) { A.out.set(this, (A.out.get(this) || 0) + 1); return c0.apply(this, a); };
  N.disconnect = function (...a) { A.out.set(this, a.length ? Math.max(0, (A.out.get(this) || 0) - 1) : 0); return d0.apply(this, a); };
  const S = AudioScheduledSourceNode.prototype, s0 = S.start;
  S.start = function (...a) {
    A.started++; A.live.add(this);
    // added after the game's own onended (set before start), so it sees the node after the game's cleanup
    this.addEventListener('ended', () => { A.live.delete(this); A.ended++; if (A.out.get(this)) A.endedConnected++; });
    return s0.apply(this, a);
  };
};
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, initScripts: [probe] });
  const page = g.page;
  await page.waitForTimeout(3000);
  const r = await page.evaluate(async () => {
    const D = window.__dbg, A = window.__aud, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = { rounds: [], log: [] };
    try { D.G.ctx(); } catch (e) { out.log.push('G.ctx: ' + e); }
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 120);
    const ent = (id) => D.It.all.find((h) => h.id === id);
    const act = async (t, re, ms = 1500) => { try { const o = D.xe.actionsFor(t).find((x) => re.test(x.label)); if (o) { o.run(); await wait(ms); return true; } } catch (e) { out.log.push(String(e)); } return false; };
    const settle = async () => { const t0 = performance.now(); while ((D.qt.isOpen || D._t.state) && performance.now() - t0 < 15000) { try { if (D._t.state && !D.qt.isOpen) D._t.close(); } catch (e) {} await wait(100); } await wait(4000); };
    const snap = () => ({ live: A.live.size, started: A.started, ended: A.ended, endedConnected: A.endedConnected, made: Object.values(A.made).reduce((a, b) => a + b, 0), state: A.ctx && A.ctx.state });
    await settle();
    out.base = snap();
    D.Kt.blossoms = 40;
    const talkers = D.It.all.filter((h) => h.kind === 'npc' && h.def && !h.def.shy).slice(0, 3);
    for (let k = 0; k < 3; k++) {
      const s0 = snap(), did = [];
      for (const e of talkers) if (await act(e, /^Talk/)) did.push('talk');
      await settle();
      if (await act(talkers[k % talkers.length], /Give a blossom/)) did.push('gift');
      await settle();
      try { D.Dbt.start(ent(['w_mont', 'p_etcher', 'p_glyph'][k])); did.push('battle'); await wait(3000); D._t.close(); } catch (e) { out.log.push('battle: ' + e); }
      try { D.ot.activate(); did.push('portal'); await wait(2500); D.ot.close(); } catch (e) { out.log.push('portal: ' + e); }
      try { D.Bulb.hold = true; D.Bulb.start(() => D.st.pos(), 3.6); did.push('bulb'); await wait(2500); D.Bulb.hold = false; D.Bulb.stop(); } catch (e) { out.log.push('bulb: ' + e); }
      // the jazz drums play while the player is at King Dino's kit (they follow the player's distance, no start call)
      try { const a0 = D.At.position.clone(); D.At.position.set(-36.6, a0.y, 21.2); const s0 = A.started; await wait(6000); if (A.started - s0 > 10) did.push('jazz'); D.At.position.copy(a0); await wait(2500); } catch (e) { out.log.push('jazz: ' + e); }
      try { for (let i = 0; i < 4; i++) { D.G.pickup(); D.G.jingle(); await wait(150); } did.push('pickups'); } catch (e) { out.log.push('pickups: ' + e); }
      await settle();
      const s1 = snap();
      out.rounds.push({ did, live: s1.live, started: s1.started - s0.started, ended: s1.ended - s0.ended, endedConnected: s1.endedConnected - s0.endedConnected, made: s1.made - s0.made, state: s1.state, kinds: { ...A.made } });
    }
    // a suspended context (headset off, app in the background) runs again when the game is back in focus
    let resumed = null;
    if (A.ctx) { await A.ctx.suspend(); const was = A.ctx.state; dispatchEvent(new Event('focus')); await wait(1000); resumed = { was, now: A.ctx.state }; }
    out.resumed = resumed; out.ctxs = A.ctxs;
    out.stillLive = [...A.live].map((n) => n.constructor.name + (n.loop ? ' loop' : '')).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
    clearInterval(window.__adv);
    return out;
  });
  note('baseline after boot: ' + JSON.stringify(r.base) + '; still playing at the end: ' + JSON.stringify(r.stillLive));
  r.rounds.forEach((x, i) => note(`round ${i + 1} (${x.did.join(', ')}): ${x.started} sources started, ${x.ended} ended, ${x.made} nodes made, ${x.endedConnected} ended still connected; playing after it settles: ${x.live}`));
  if (r.log.length) note('log: ' + r.log.slice(0, 5).join(' | '));
  expect('the game uses one audio context', r.ctxs === 1, String(r.ctxs));
  expect('each round played its sounds (talk, a gift, a battle, the Portal, the bulb, the jazz, pickups)', r.rounds.length === 3 && r.rounds.every((x) => x.started >= 20 && x.did.length >= 7 && x.did.includes('jazz')), JSON.stringify(r.rounds.map((x) => [x.did, x.started])));
  const maxLive = Math.max(...r.rounds.map((x) => x.live));
  expect('after each round settles, no more sources are playing than after boot: every source a round started has ended', maxLive <= r.base.live, JSON.stringify({ base: r.base.live, rounds: r.rounds.map((x) => x.live) }));
  // a source that ends still connected to its gain is released by the browser once it has finished (and the drum hits
  // set their own cleanup after start(), so this probe sees them before it runs); what matters is
  // that the count per round does not grow (the same sounds leave the same number each time)
  const ec = r.rounds.map((x) => x.endedConnected), made = r.rounds.map((x) => x.made);
  expect('the same round leaves no more behind each time (ended-but-connected sources and nodes made per round do not grow)', ec[2] <= ec[0] * 1.3 + 5 && made[2] <= made[0] * 1.3 + 20, JSON.stringify({ endedConnected: ec, made }));
  expect('the context is running throughout', r.rounds.every((x) => x.state === 'running'), JSON.stringify(r.rounds.map((x) => x.state)));
  expect('a suspended context runs again when the game is back in focus', r.resumed && r.resumed.was === 'suspended' && r.resumed.now === 'running', JSON.stringify(r.resumed));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `AUDIO TEST FAILED (${failures.length})` : 'AUDIO TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
