// Nextessa waits while the Gem is assembled (standard tier; the author: "If Nextessa arrives during the Gem animation,
// she'll continue to walk against the player, and she will jitter in position when the user moves. She should pause
// after coming through the Portal if the Gem animation is ongoing"; FIXES F-B45). During the Speech the Gem assembles
// in front of the player for about 16 s between two dialogues; the pizza cannot be handed over then (`Bulb.hold`).
//
// The pizza is ordered; as soon as Nextessa is out of the portal the Speech starts (three Artifacts). While the Gem
// assembles the player walks to and fro, and every 100 ms:
//   - Nextessa does not move (under 5 cm from where she stood when the assembly began) and does not walk;
//   - the pizza is not handed over;
// then, once the Speech is over:
//   - she walks up to the player and the pizza is handed over (Snacks), as usual;
//   - no page errors.
//
//   node tools/test_courier_gem.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true });
  const r = await g.page.evaluate(async () => {
    const D = window.__dbg, Kt = D.Kt, At = D.At, wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const adv = setInterval(() => { try { if (D.qt.isOpen) D.qt.advance(); } catch (e) {} }, 250);
    await wait(1000);
    const out = { samples: 0, maxMove: 0, walking: 0, handedDuring: false };
    // the player by Sparkakus, as for the Speech
    const sp = D.st.pos(); At.position.set(sp.x + 1.4, At.position.y, sp.z);
    Kt.rewards.snacks = false; D.ue.call();
    let t0 = performance.now(); while (!D.ue.courier && performance.now() - t0 < 120000) await wait(100);
    out.came = !!D.ue.courier; if (!out.came) { clearInterval(adv); return out; }
    // through the portal: the portal's trip is over or not "in"
    const P = D.ot;
    t0 = performance.now(); while (performance.now() - t0 < 20000 && P && P.trip && P.trip.phase === 'in') await wait(100);
    // the Speech: the first dialogue is advanced, then the Gem assembles (Bulb.hold, no dialogue open)
    Kt.artifacts = 3; Kt.rewards.artifacts = false; At.position.set(sp.x + 1.4, At.position.y, sp.z); await wait(300);
    D.LIB.talk();
    t0 = performance.now(); while (performance.now() - t0 < 30000 && !(D.Bulb.hold && !D.qt.isOpen)) await wait(50);
    out.assembling = !!(D.Bulb.hold && !D.qt.isOpen);
    const c = D.ue.courier.group.position, start = [c.x, c.z]; let k = 0;
    while (D.Bulb.hold && !D.qt.isOpen && !Kt.rewards.artifacts) {
      At.position.set(sp.x + 1.4 + 2.5 * Math.sin(k / 6), At.position.y, sp.z + 2.5 * Math.cos(k / 6)); k++;   // the player moves about
      await wait(100);
      out.samples++; out.maxMove = Math.max(out.maxMove, Math.hypot(c.x - start[0], c.z - start[1]));
      if (D.ue.courier && D.ue.courier.moving) out.walking++;
      if (Kt.rewards.snacks) out.handedDuring = true;
    }
    t0 = performance.now(); while (!Kt.rewards.artifacts && performance.now() - t0 < 60000) await wait(100);
    out.speechDone = Kt.rewards.artifacts;
    // afterwards: she comes and hands the pizza over
    t0 = performance.now(); while (!Kt.rewards.snacks && performance.now() - t0 < 90000) { await wait(200); try { D.ue.claim(); } catch (e) {} }
    out.delivered = Kt.rewards.snacks; out.maxMove = +out.maxMove.toFixed(3);
    clearInterval(adv);
    return out;
  });
  await g.close();
  note(JSON.stringify(r));
  expect('Nextessa came through the portal and the Gem assembled while she was out', r.came && r.assembling && r.samples >= 20, JSON.stringify(r));
  expect('while the Gem assembles she stays where she stood (under 5 cm) and does not walk, as the player moves about', r.maxMove < 0.05 && r.walking === 0, `moved ${r.maxMove} m, walking in ${r.walking} of ${r.samples} samples`);
  expect('the pizza is not handed over during the assembly', r.handedDuring === false);
  expect('after the Speech she comes and hands the pizza over', r.speechDone && r.delivered, JSON.stringify({ speech: r.speechDone, delivered: r.delivered }));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  console.log(failures.length ? `COURIER GEM TEST FAILED (${failures.length})` : 'COURIER GEM TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
