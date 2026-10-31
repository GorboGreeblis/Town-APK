#!/usr/bin/env node
/**
 * Game content test (standard tier): the story content of tools/LORE.md, played through the game's own
 * interaction menu (the same options a controller pick shows: `xe.actionsFor(target)`, each option's `run`),
 * checking the exact text the dialogue box receives and the state it changes.
 *
 *   zones      every pickable place has its menu (Sparkakus, the phone, the Ancient, the shyness book, the robin...)
 *   phone      before the bribe the TELEPHONE cannot get through the Portal
 *   gifts      every townsperson's "Give a blossom" shows their own gift line, costs one Blossom and marks them met;
 *              a dancer's "Let's dance!" opens their dance battle;
 *              the Sheriff's gift is the bribe that opens the Portal (the phone then rings through); Gooward
 *              answers with flying goo and cannot be interacted with until it is over (A39); Sparkakus romps about the Library; the Ancient
 *   talk       each townsperson's lines come in order, one per talk, and wrap around
 *   shyness    Zollod is shy and his shop is closed until the player takes OVERCOMING SHYNESS from the Library
 *   outfits    the three outfits: too little flint, buying (worn at once), taking off and putting on again
 *   battles    each dancer's battle panel: its title and stamina bar ("Robot steps left", ...), King Dino on drums
 *   ancient    the Ancient's talk line
 *   robin      the robin flies off when picked; so does the cardinal on the second park tree (A38)
 *   pizza      the courier ordered after the bribe comes through the glowing Portal and delivers (on its own when it
 *              reaches the player, else when claimed): the line and the Snacks
 *   vignettes  the two-line exchanges: speech bubbles or Gree-mail tokens, counted and ended; the Ancient's only inside
 *              the church (a sample in the standard tier, all 102 with --long)
 *   event      during the planting Event each townsperson says their gardening line, Fortizmo has no talk,
 *              nobody takes Blossoms, the Ancient says "Hello", Sparkakus his own line; Backpacka comes once the
 *              townsfolk have gathered and formed their ring (--long: waits for the whole visit)
 *
 * Usage: node tools/test_content.js [file.html] [--long]
 */
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
const LONG = process.argv.includes('--long');

(async () => {
  const g = await boot({ file, vr: true, fastSim: false, renderEvery: 4 });
  const { page } = g;
  const { failures, expect, note } = reporter();
  await page.waitForTimeout(1500);
  // Every text the dialogue box is given is recorded (name and the full text, pages joined by "|"); a timer presses
  // the player's "next" so dialogues close. Helpers: act(option) runs a menu option and returns the texts it caused.
  await page.evaluate(() => {
    window.__errs = []; const ce = console.error.bind(console); console.error = function () { try { window.__errs.push([...arguments].map((a) => (a && a.stack) ? a.stack : String(a)).join(' ').slice(0, 1500)); } catch (e) {} return ce.apply(console, arguments); };
    const D = window.__dbg, rec = window.__said = [];
    window.__p0 = new Set(D.O.info.programs);   // every program compiled from here on was compiled during play
    const o0 = D.qt.open.bind(D.qt);
    D.qt.open = function (name, color, text, cb) { rec.push({ name: String(name), text: String(text) }); return o0(name, color, text, cb); };
    window.__adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 120);
    // the Portal's blue light: watched from the start, so its moment is not missed whenever the courier comes
    window.__portalLit = 0; let portal = null; D.C.traverse((o) => { if (o.isPointLight && o.color.getHex() === 0x3aa8ff) portal = o; });
    window.__portalWatch = setInterval(() => { if (portal && portal.visible && portal.intensity > 0) window.__portalLit++; }, 100);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__h = {
      wait,
      ent: (id) => D.It.all.find((h) => h.id === id),
      byName: (n) => D.It.all.find((h) => h.def && h.def.name === n),
      zone: (id) => D.z.list.find((q) => q.id === id),
      labels: (t) => D.xe.actionsFor(t).map((o) => o.label),
      async act(t, re, settle = 400) {
        const o = D.xe.actionsFor(t).find((x) => re.test(x.label)); if (!o) return null;
        const n = rec.length; o.run(); await wait(settle);
        const t0 = performance.now(); while ((D.qt.isOpen || D._t.state) && performance.now() - t0 < 15000) { if (D._t.state && !D.qt.isOpen) break; await wait(60); }
        return rec.slice(n).map((r) => r.text);
      },
      // waits in game seconds (the game's own clock, Re.t), so a busy machine slows the wait with the game; the wall cap
      // is only a safety net
      async gwait(cond, gameS, wallCapS = 900) { const g0 = D.Re.t, w0 = performance.now(); while (!cond() && D.Re.t - g0 < gameS && performance.now() - w0 < wallCapS * 1000) await wait(100); return { ok: !!cond(), game: +(D.Re.t - g0).toFixed(1), wall: +((performance.now() - w0) / 1000).toFixed(1) }; },
      async run(fn, settle = 400) { const n = rec.length; fn(); await wait(settle); const t0 = performance.now(); while (D.qt.isOpen && performance.now() - t0 < 15000) await wait(60); return rec.slice(n).map((r) => r.text); },
    };
  });

  // ---- zones: every pickable place has its menu
  const zones = await page.evaluate(() => { const D = window.__dbg; return D.z.list.map((q) => ({ id: q.id || null, label: (() => { try { return q.label(); } catch (e) { return 'ERR ' + e; } })(), gift: !!q.gift })); });
  note('pickable places: ' + zones.map((q) => `${q.id}=${JSON.stringify(q.label)}${q.gift ? '+gift' : ''}`).join(', '));
  const zl = Object.fromEntries(zones.map((q) => [q.id, q.label]));
  expect('zones: Sparkakus, the phone, the Ancient, the shyness book, the robin and the Summoning Pillar all have their menu', zl.stump === 'Talk to SPARKAKUS' && zl.phone === 'Call for pizza' && zl.slug === 'Talk' && zl.shybook === 'Take OVERCOMING SHYNESS' && zl.robin === 'Robin' && zl.campfire === 'Use the Summoning Pillar', JSON.stringify(zl));
  expect('zones: Garden Supplies is closed while Zollod is shy', zl.gshop === null, JSON.stringify(zl.gshop));

  // ---- phone before the bribe
  const phone0 = await page.evaluate(async () => { const H = window.__h, D = window.__dbg; return { phone: D.Kt.phone, said: await H.act(H.zone('phone'), /Call for pizza/) }; });
  expect('phone: before the bribe the call cannot get through the Portal', phone0.phone === false && phone0.said && phone0.said[0] === '*connection to the Portal seems blocked*', JSON.stringify(phone0));

  // ---- the Ancient's talk line
  const anc = await page.evaluate(async () => { const H = window.__h; return await H.act(H.zone('slug'), /^Talk$/); });
  expect('ancient: "I am the one reborn."', anc && anc[0] === 'I am the one reborn.', JSON.stringify(anc));

  // ---- talk: lines in order, one per talk, wrapping around
  const talk = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, out = [];
    for (const e of D.It.all) {
      if (!e.kind || !e.def || !e.def.lines || !e.def.lines.length || e.def.name === 'ZOLLOD') continue;
      if (e.id === 'p_gemtoe' && D.Kt.gem) continue;
      const L = e.def.lines, k0 = (D.Kt.talkState[e.id] || 0), got = [];
      for (let i = 0; i <= L.length; i++) { const s = await H.act(e, /^Talk to /, 150); got.push(s && s[0]); }
      const want = []; for (let i = 0; i <= L.length; i++) want.push(L[(k0 + i) % L.length]);
      out.push({ id: e.id, name: e.def.name, ok: JSON.stringify(got) === JSON.stringify(want), n: L.length, first: got[0], want0: want[0] });
    }
    return out;
  });
  const badTalk = talk.filter((t) => !t.ok);
  expect(`talk: ${talk.length} townsfolk say their lines in order, one per talk, and wrap around (${talk.reduce((a, t) => a + t.n, 0)} lines)`, talk.length >= 10 && badTalk.length === 0, JSON.stringify(badTalk.slice(0, 3)));

  // ---- gifts
  const gifts = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, Kt = D.Kt, out = [];
    Kt.blossoms = 40;
    let goo = 0; const ga = D.Nt.gooArc; D.Nt.gooArc = function () { goo++; return ga.apply(this, arguments); };
    for (const e of D.It.all) {
      if (!e.kind || !e.def || e.def.gift == null) continue;
      const labels = H.labels(e); const b0 = Kt.blossoms;
      const s = await H.act(e, /^Give a blossom$/, e.id === 'gorbo' ? 3200 : 300);
      await H.wait(400);   // a dancer's "Let's dance!" opens a battle once the dialogue closes
      const st = D._t.state, battle = st && st.kind === 'battle' ? st.title : null;
      if (st) { D._t.close(); await H.wait(300); }
      out.push({ id: e.id, name: e.def.name, offered: labels.includes('Give a blossom'), said: s && s[0], want: e.def.gift, cost: b0 - Kt.blossoms, met: Kt.met.has(e.id), phone: Kt.phone, battle });
    }
    D.Nt.gooArc = ga;
    return { out, goo };
  });
  const badGift = gifts.out.filter((g2) => !(g2.offered && g2.said === g2.want && g2.cost === 1 && g2.met));
  expect(`gifts: ${gifts.out.length} townsfolk each show their own gift line for a Blossom, cost one Blossom and are marked met`, gifts.out.length >= 10 && badGift.length === 0, JSON.stringify(badGift.slice(0, 3)));
  const dancers = gifts.out.filter((x) => ['w_mont', 'p_etcher', 'p_glyph'].includes(x.id));
  expect('gifts: a Blossom to a dancer ("Let’s dance!") invites them to a dance battle', dancers.length === 3 && dancers.every((x) => x.battle === 'DANCE BATTLE: ' + x.name), JSON.stringify(dancers.map((x) => [x.name, x.battle])));
  expect('gifts: nobody else answers a Blossom with a battle', gifts.out.filter((x) => !['w_mont', 'p_etcher', 'p_glyph'].includes(x.id)).every((x) => !x.battle), JSON.stringify(gifts.out.filter((x) => x.battle).map((x) => x.name)));
  const sheriff = gifts.out.find((x) => x.id === 'drifter');
  expect('gifts: the Sheriff takes the Blossom as a bribe ("A bribe? …Portal is now open to your use.") and the phone works from then on', sheriff && /^A bribe\?/.test(sheriff.said) && sheriff.phone === true, JSON.stringify(sheriff));
  expect('gifts: Gooward answers a Blossom with flying goo', gifts.goo >= 3, `${gifts.goo} goo arcs`);
  // A39: Gooward cannot be interacted with until his goo barrage is over (the author: "making Gooward non-interactable
  // until the goo barrage is over"); the player stands beside him throughout
  const gw = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, Kt = D.Kt, e = D.It.byId.gorbo; if (!e) return { none: true };
    Kt.blossoms = Math.max(Kt.blossoms, 2); await H.wait(4500);
    const beside = () => { D.At.position.x = e.group.position.x + 1.4; D.At.position.z = e.group.position.z; };
    beside(); await H.wait(300); const before = D.xe.current === e;
    await H.act(e, /^Give a blossom$/, 300); const g0 = e.giftAt || performance.now();
    let n = 0, hit = 0; while (performance.now() - g0 < 3600) { beside(); await H.wait(120); if (!D.qt.isOpen) { D.xe.scan(); n++; if (D.xe.current === e) hit++; } }   // the scan run here (it does not run while a dialogue is open)
    while (performance.now() - g0 < 4300) await H.wait(100); beside(); await H.wait(300); while (D.qt.isOpen) await H.wait(100); D.xe.scan();
    return { before, during: n, targeted: hit, after: D.xe.current === e };
  });
  expect('gifts: after a Blossom, Gooward cannot be interacted with until his goo barrage is over, then can again', !gw.none && gw.before && gw.during >= 3 && gw.targeted === 0 && gw.after, JSON.stringify(gw));
  const phone1 = await page.evaluate(async () => { const H = window.__h; return await H.act(H.zone('phone'), /Call for pizza/); });
  expect('phone: after the bribe Nextessa answers ("*Ring Ring* This is Nextessa’s inter-temporal pizza shop!")', phone1 && /^\*Ring Ring\* This is Nextessa/.test(phone1[0] || ''), JSON.stringify(phone1));
  const sp = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, z = H.zone('stump'), st = D.st; const home = st.atHome ? st.atHome() : null;
    const n = window.__said.length; z.gift(); let romped = false;
    const t0 = performance.now(); while (performance.now() - t0 < 90000) { if (st.romping && st.romping()) romped = true; if (window.__said.length > n && !D.qt.isOpen && !D.Bulb.hold) break; await H.wait(100); }
    return { home, romped, said: window.__said.slice(n).map((r) => r.text), s: Math.round((performance.now() - t0) / 1000), hold: !!D.Bulb.hold };
  });
  expect('gifts: Sparkakus, given a Blossom at the Library, romps about and then apologises ("…sorry I don’t know what got into me.")', sp.home === true && sp.romped && sp.said[0] === '…sorry I don’t know what got into me.', JSON.stringify(sp));
  const ancG = await page.evaluate(async () => { const H = window.__h; return await H.run(() => H.zone('slug').gift()); });
  expect('gifts: the Ancient answers a Blossom with "..."', ancG[0] === '...', JSON.stringify(ancG));

  // ---- Zollod's shyness and the book
  const shy = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, Kt = D.Kt, z = H.byName('ZOLLOD'), out = {};
    out.hold = !!D.Bulb.hold;
    out.before = { labels: H.labels(z), shyFree: Kt.shyFree, shyBook: Kt.shyBook };
    out.shyLine = await H.act(z, /^Talk to /);
    const book = H.zone('shybook'); out.bookLabel = book.label(); book.run(); await H.wait(300);
    out.afterBook = { shyBook: Kt.shyBook, bookLabel: book.label() };
    out.cured = await H.act(z, /^Talk to /);
    out.after = { labels: H.labels(z), shyFree: Kt.shyFree, gshop: H.zone('gshop').label() };
    out.work = await H.act(z, /^Talk to /);
    return out;
  });
  expect('shyness: Zollod only says "…|…|I’m shy…" and offers no shop', shy.before.labels.length === 1 && /^Talk to ZOLLOD/.test(shy.before.labels[0]) && shy.shyLine && shy.shyLine[0] === '…|…|I’m shy…', JSON.stringify(shy.before) + ' ' + JSON.stringify(shy.shyLine));
  expect('shyness: the Library book can be taken ("Take OVERCOMING SHYNESS") and leaves the shelf', shy.bookLabel === 'Take OVERCOMING SHYNESS' && shy.afterBook.shyBook === true && shy.afterBook.bookLabel === null, JSON.stringify(shy.afterBook));
  expect('shyness: with the book Zollod is cured ("…|That book…|Let me see..|Wow I’m free from shyness!")', shy.cured && shy.cured[0] === '…|That book…|Let me see..|Wow I’m free from shyness!' && shy.after.shyFree === true, JSON.stringify(shy.cured));
  expect('shyness: then Garden Supplies opens and Zollod talks about his work', shy.after.labels.includes('Shop at Garden Supplies') && shy.after.gshop === 'Shop at Garden Supplies' && shy.work && shy.work[0] === 'Bringing plants to life is MY life’s work.', JSON.stringify(shy.after) + ' ' + JSON.stringify(shy.work));

  // ---- outfits
  const shop = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, Kt = D.Kt, out = { steps: [] };
    const item = (name) => (D._t.state && D._t.state.items || []).find((i) => i.label === name || (i.label === 'Change out' && false));
    const log = () => D._t.state && D._t.state.log;
    D.ne.open(); await H.wait(300);
    out.title = D._t.state && D._t.state.title; out.items = (D._t.state.items || []).map((i) => i.label + (i.meta ? ' (' + i.meta + ')' : ''));
    Kt.acorns = 1; item('Sun Dress').onClick(); await H.wait(200); out.need = log();
    Kt.acorns = 9;
    for (const [name, slot] of [['Flower Hat', 'hat'], ['Sun Dress', 'dress'], ['Frog Shoes', 'shoes']]) {
      const it = (D._t.state.items || []).find((i) => i.label === name); if (!it) { out.steps.push(name + ' missing'); continue; }
      it.onClick(); await H.wait(200);
      out.steps.push({ name, log: log(), worn: !!(Kt.equip[slot] && Kt.equip[slot].name === name), owned: [...Kt.owned] });
    }
    out.flintLeft = Kt.acorns;
    const off = (D._t.state.items || []).find((i) => i.label === 'Change out'); const nOff = (D._t.state.items || []).filter((i) => i.label === 'Change out').length;
    out.changeOut = nOff;
    if (off) { off.onClick(); await H.wait(200); out.offLog = log(); }
    const again = (D._t.state.items || []).find((i) => /Flower Hat|Sun Dress|Frog Shoes/.test(i.label) && !/flint/.test(i.meta || '')); if (again) { again.onClick(); await H.wait(200); out.onLog = log(); }
    out.flintAfter = Kt.acorns;
    D._t.close(); await H.wait(200);
    return out;
  });
  expect('outfits: the shop offers the Flower Hat, Sun Dress and Frog Shoes at 3 flint and the bagel seasoning packet at 25', shop.title === 'GARDEN SUPPLIES' && ['Flower Hat (3 flint)', 'Sun Dress (3 flint)', 'Frog Shoes (3 flint)'].every((x) => shop.items.includes(x)) && shop.items.some((x) => /^bagel seasoning packet \((25 flint|bought)\)/.test(x)), JSON.stringify(shop.items));
  expect('outfits: with 1 flint: "You need 2 more flint for the Sun Dress."', shop.need === 'You need 2 more flint for the Sun Dress.', JSON.stringify(shop.need));
  expect('outfits: each outfit is bought and worn at once ("You bought the … and put it on. Take a look in the mirror!"), 9 flint spent', shop.steps.every((s) => s.worn && s.log === `You bought the ${s.name} and put it on. Take a look in the mirror!`) && shop.flintLeft === 0, JSON.stringify(shop.steps));
  expect('outfits: a worn outfit shows "Change out" and comes off ("You take off the …"); putting it on again is free ("You put on the …")', shop.changeOut === 3 && /^You take off the /.test(shop.offLog || '') && /^You put on the /.test(shop.onLog || '') && shop.flintAfter === 0, JSON.stringify({ n: shop.changeOut, off: shop.offLog, on: shop.onLog, flint: shop.flintAfter }));

  // ---- dance battle panels
  const bat = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, out = [];
    for (const id of ['w_mont', 'p_etcher', 'p_glyph']) {
      const e = H.ent(id); D.Dbt.start(e); await H.wait(400);
      const s = D._t.state || {}; const txt = JSON.stringify(s, (k, v) => (typeof v === 'function' ? undefined : v));
      out.push({ id, kind: s.kind, title: s.title, sub: s.sub, moves: (s.items || []).map((i) => i.label), bar: /steps left|twists left|moves left/.test(txt) ? (txt.match(/(Robot steps left|Tentacle twists left|Macarena moves left)/) || [])[0] : null });
      D._t.close(); await H.wait(300);
    }
    return out;
  });
  const wantBat = { w_mont: ['DANCE BATTLE: MONTGUMMERY', 'Robot steps left'], p_etcher: ['DANCE BATTLE: ETCHER', 'Tentacle twists left'], p_glyph: ['DANCE BATTLE: GLYPH', 'Macarena moves left'] };
  const badBat = bat.filter((b) => !(b.kind === 'battle' && b.title === wantBat[b.id][0] && b.bar === wantBat[b.id][1] && ['Rock out!', 'Do the splits like scissors!', 'Go horizontal like paper!'].every((m) => b.moves.includes(m))));
  expect('battles: Montgummery, Etcher and Glyph each open their own panel (title, stamina bar "Robot steps left" / "Tentacle twists left" / "Macarena moves left", the three moves)', badBat.length === 0, JSON.stringify(badBat.length ? badBat : bat));
  expect('battles: King Dino on drums', bat.every((b) => b.sub === 'KING DINO on drums.'), JSON.stringify(bat.map((b) => b.sub)));

  // ---- the robin
  const robin = await page.evaluate(async () => { const H = window.__h, D = window.__dbg, z = H.zone('robin'); const b = window.__dbg.JGP.robin.bird; const p0 = b.getWorldPosition(new THREE.Vector3()); z.run(); await H.wait(1500); const p1 = b.getWorldPosition(new THREE.Vector3()); return { moved: +p0.distanceTo(p1).toFixed(2) }; });
  expect('robin: picking the robin makes it fly off', robin.moved > 0.3, JSON.stringify(robin));
  // the cardinal (A38) on the second park tree: the robin's behaviour, its own name
  const cardinal = await page.evaluate(async () => { const H = window.__h, z = H.zone('cardinal'); const c = window.__dbg.JGP.cardinal; if (!z || !c) return { none: true, zone: !!z, bird: !!c }; const b = c.bird; const p0 = b.getWorldPosition(new THREE.Vector3()); z.run(); await H.wait(1500); const p1 = b.getWorldPosition(new THREE.Vector3()); return { label: z.label(), moved: +p0.distanceTo(p1).toFixed(2), at: [+p0.x.toFixed(1), +p0.y.toFixed(1), +p0.z.toFixed(1)] }; });
  expect('cardinal: on the second park tree, named Cardinal, and picking it makes it fly off like the robin', !cardinal.none && cardinal.label === 'Cardinal' && cardinal.moved > 0.3 && Math.hypot(cardinal.at[0] + 24.5, cardinal.at[2] - 34.5) < 2, JSON.stringify(cardinal));

  // ---- the pizza delivery (ordered after the bribe above): the courier comes through the Portal, whose blue light is
  // on while it opens (a light changes every lit shader: this play is part of the compile check at the end)
  const pizza = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, Kt = D.Kt, out = { states: [] };
    const t0 = performance.now();
    while (performance.now() - t0 < 120000) {
      const st = D.ue.state; if (out.states[out.states.length - 1] !== st) out.states.push(st);
      if (st === 'waiting' || window.__said.some((r) => r.text.startsWith('One hot and ready pie!'))) break;
      await H.wait(200);
    }
    out.portalLit = window.__portalLit > 0;
    // the courier walks up to the player and delivers on its own when near; otherwise it waits to be claimed
    if (D.ue.state === 'waiting' || D.ue.state === 'arriving') { out.claimed = D.ue.claim(true); await H.wait(600); }
    const t1 = performance.now(); while (D.qt.isOpen && performance.now() - t1 < 15000) await H.wait(100);
    out.delivered = window.__said.filter((r) => r.text.startsWith('One hot and ready pie!|* +20 Snacks *|I love my job!')).map((r) => r.text);
    out.snacks = Kt.rewards.snacks;
    return out;
  });
  expect('pizza: the courier comes through the Portal (its light comes on) and reaches the player', pizza.portalLit && pizza.states.some((x) => x === 'speaking' || x === 'waiting' || x === 'leaving'), JSON.stringify(pizza.states) + ' portal lit ' + pizza.portalLit);
  expect('pizza: the delivery: "One hot and ready pie!|* +20 Snacks *|I love my job!" and the Snacks', pizza.delivered.length >= 1 && pizza.snacks === true, JSON.stringify(pizza));

  // ---- vignettes: the two-line exchanges (90 between townsfolk, the Ancient's 12 inside the church). A text vignette
  // shows the two lines as speech bubbles over the speakers; a token vignette sends their Gree-mail tokens
  // (Hennrick's cube, the Sheriff's spore, ...). The standard tier plays a sample of each kind, --long every one.
  const vig = await page.evaluate(async (LONG) => {
    const D = window.__dbg, V = D.VIGS, H = window.__h, C = D.C, out = { played: [], failed: [] };
    const m = V.lineUp(); out.cast = Object.keys(m).sort().join(',');
    const town = V.all.filter((pk) => pk[0] !== 'SL' && pk[1] !== 'SL'), anc = V.all.filter((pk) => pk[0] === 'SL' || pk[1] === 'SL');
    out.total = V.all.length; out.town = town.length; out.ancient = anc.length;
    const sample = (arr, n) => arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / n)) === 0).slice(0, n);
    const runOne = async (pk, text) => {
      const A = m[pk[0]], B = m[pk[1]]; if (!A || !B) { out.failed.push(pk[0] + pk[1] + ' not in the line-up'); return; }
      // the game cuts a vignette short when a speaker is held (the player's last target while a dialogue is open,
      // or in a scene); the test's own earlier talks and the courier's delivery must not count as that
      await H.gwait(() => !D.qt.isOpen, 30, 120); D.xe.lastTarget = null;
      // and when a speaker is busy (Sparkakus walks off to browse his shelves now and then): like the game's own pick,
      // wait until both are free, and keep Sparkakus in place for the exchange as the game does when he hosts a visit
      const sp = [A, B].find((e) => e === (D.st && D.st.ent));
      if (sp && sp.stay) sp.stay();
      const free = (e) => { try { if (e.sync) e.sync(); } catch (x) {} return !e.busy && !(e.scene && e.scene()) && !e.visiting && !e.hosting; };
      await H.gwait(() => free(A) && free(B), 60, 300);
      const id = pk[0] + pk[1] + (text ? 't' : ''), n0 = V.plays[id] || 0;
      // count what the exchange adds to the scene (speech bubbles one after the other, or the flying tokens)
      let shown = 0; const add0 = C.add; C.add = function () { shown += arguments.length; return add0.apply(this, arguments); };
      const ok = V.play(A, B, text);
      if (!ok) { C.add = add0; if (sp && sp.browse) sp.browse(); out.failed.push(id + ' refused'); return; }
      // vignette time runs on game frames, so a slow machine stretches the 8.2 s of a text exchange
      const w = await H.gwait(() => !V.playing(), 40, 900);   // a text exchange lasts 8.2 game seconds
      C.add = add0;
      if (sp && sp.browse) sp.browse();
      const r = { id, counted: (V.plays[id] || 0) === n0 + 1, ended: !V.playing(), shown, s: w.game, wall: w.wall };
      (r.counted && r.ended && r.shown >= (text ? 2 : 1) ? out.played : out.failed).push(r);
    };
    const T = LONG ? town : sample(town, 8), K = LONG ? [] : sample(town.slice(1), 4);
    for (const pk of T) await runOne(pk, true);
    for (const pk of K) await runOne(pk, false);
    // the Ancient's: from inside the church (outside it they never play; inside, only they do)
    const slug = D.JGP.slug && D.JGP.slug.ent; out.slug = !!slug;
    if (slug) {
      const p = slug.group.position, a0 = D.At.position.clone(); D.At.position.set(p.x + 1.5, D.At.position.y, p.z + 1.5); await H.wait(300);
      out.inCave = V.computeInCave();
      const other = town[0]; out.townRefusedInCave = V.play(m[other[0]], m[other[1]], true) === false;
      for (const pk of (LONG ? anc : sample(anc, 3))) await runOne(pk, true);
      D.At.position.copy(a0); await H.wait(300);
    }
    return out;
  }, LONG);
  note(`vignettes: ${vig.total} in all (${vig.town} between townsfolk, ${vig.ancient} with the Ancient); line-up ${vig.cast}; played ${vig.played.length} (game seconds): ` + vig.played.map((r) => `${r.id} ${r.s}s`).join(', '));
  expect('vignettes: the game knows all 102 exchanges (90 between townsfolk + the Ancient\'s 12)', vig.total === 102 && vig.town === 90 && vig.ancient === 12, JSON.stringify([vig.total, vig.town, vig.ancient]));
  expect('vignettes: the line-up includes the Ancient and, once cured, Zollod', /SL/.test(vig.cast) && /ZL/.test(vig.cast) && /SP/.test(vig.cast), vig.cast);
  expect(`vignettes: every exchange played shows its bubbles or tokens, is counted, and ends (${vig.played.length} played)`, vig.failed.length === 0 && vig.played.length >= (LONG ? 102 : 15), JSON.stringify(vig.failed.slice(0, 4)));
  expect('vignettes: inside the church only the Ancient\'s exchanges play', vig.inCave === true && vig.townRefusedInCave === true, JSON.stringify({ inCave: vig.inCave, refused: vig.townRefusedInCave }));

  // ---- the planting Event
  const ev = await page.evaluate(async () => {
    const H = window.__h, D = window.__dbg, Kt = D.Kt, out = { lines: [] };
    Kt.blossoms = 5; Kt.rewards.stone = Kt.rewards.seeds = Kt.rewards.snacks = true;
    D.oe.open(); await H.wait(200); const yes = (D._t.state && D._t.state.items || []).find((i) => i.label === 'Yes'); if (yes) yes.onClick();
    const t0 = performance.now(); while (!D.me.active && performance.now() - t0 < 10000) await H.wait(100);
    out.active = D.me.active; await H.wait(1500);
    for (const e of D.It.all) {
      if (!e.kind || !e.def || !e.def.name || e.kind === 'courier') continue;
      const labels = H.labels(e);
      if (!labels.length) { out.lines.push({ id: e.id, name: e.def.name, labels }); continue; }
      const s = await H.act(e, /^Talk to /, 150);
      out.lines.push({ id: e.id, name: e.def.name, labels, said: s && s[0], want: (e.def.campfire || '...') });
    }
    out.ancient = await H.act(H.zone('slug'), /^Talk$/);
    out.spark = await H.act(H.zone('stump'), /^Talk to /);
    out.giftOffered = D.It.all.some((e) => e.kind && H.labels(e).includes('Give a blossom'));
    // Backpacka: comes during the Event (its visit starts with the planting)
    const bw = await H.gwait(() => D.JGP.backpacka.busy(), 300, 1500);   // after the gathering, the ring and the horn (game seconds)
    out.bpCame = D.JGP.backpacka.busy(); out.bpAt = bw.game + ' game s (' + bw.wall + ' s)';
    return out;
  });
  expect('event: the planting Event started', ev.active === true, JSON.stringify(ev.active));
  const fz = ev.lines.find((l) => l.id === 'frog');
  expect('event: Fortizmo cannot be talked to during the Event', fz && fz.labels.length === 0, JSON.stringify(fz));
  const talkers = ev.lines.filter((l) => l.labels.length);
  const badEv = talkers.filter((l) => l.said !== l.want);
  expect(`event: ${talkers.length} townsfolk each say their own gardening line`, talkers.length >= 10 && badEv.length === 0, JSON.stringify(badEv.slice(0, 3)));
  expect('event: nobody takes a Blossom during the Event', ev.giftOffered === false);
  expect('event: the Ancient says "Hello"', ev.ancient && ev.ancient[0] === 'Hello', JSON.stringify(ev.ancient));
  expect('event: Sparkakus: "Digging in the dirt like an animal? …don’t tell the others at the genealogical society."', ev.spark && ev.spark[0] === 'Digging in the dirt like an animal? …don’t tell the others at the genealogical society.', JSON.stringify(ev.spark));
  expect('event: Backpacka comes during the Event', ev.bpCame === true, `after ${ev.bpAt}`);
  if (LONG) {
    const bp = await page.evaluate(async () => { const D = window.__dbg, wait = (ms) => new Promise((r) => setTimeout(r, ms)); const t0 = performance.now(); while (D.JGP.backpacka.busy() && performance.now() - t0 < 200000) await wait(1000); return { gone: !D.JGP.backpacka.busy(), s: Math.round((performance.now() - t0) / 1000), active: D.me.active }; });
    expect('event (--long): Backpacka leaves again', bp.gone === true, JSON.stringify(bp));
  }
  await page.evaluate(() => { try { window.__dbg.me.wrap(); } catch (e) {} });
  await page.waitForTimeout(1000);
  // A shader compiled during play stalls a Quest for 50-1,000 ms; this test plays far more of the game than the
  // multiview check (gifts, outfits, battles, the robin, vignette tokens, the Event, Backpacka), so it checks too.
  const late = await page.evaluate(() => {
    const D = window.__dbg, O = D.O, fresh = O.info.programs.filter((p) => !window.__p0.has(p)), users = [];
    D.C.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) { const pr = O.properties.get(m); for (const p of (pr.programs ? pr.programs.values() : [])) if (fresh.includes(p)) { let n = [], q = o; while (q && q !== D.C) { n.push(q.name || q.type); q = q.parent; } users.push(p.name + ' <- ' + m.type + (m.flatShading ? ' flat' : '') + (m.transparent ? ' transparent' : '') + ' on ' + n.slice(0, 3).join('<')); } } });
    return { n: fresh.length, names: fresh.map((p) => p.name), users: [...new Set(users)].slice(0, 8) };
  });
  expect('no shader program compiled during all of this play', late.n === 0, `${late.n}: ${late.names.join(', ')}; used by: ${late.users.join(' | ')}`);
  if (g.errors.length) note('console errors in full: ' + (await page.evaluate(() => window.__errs.join(' || '))).slice(0, 3000));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `CONTENT TEST FAILED (${failures.length})` : 'CONTENT TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
