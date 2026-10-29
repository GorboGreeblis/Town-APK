// Dialogue layout (not in a tier: too slow; each page is given up to a second to type out, and a run on 3.15.52
// was stopped unfinished after 30 minutes): every line the game can say fits its dialogue box. The box wraps a page at 920 px
// and shrinks the font from 56 px down to its floor before it gives up and cuts the page short with "…"; a cut page
// loses words. This collects every dialogue-like string the game holds (each townsperson's talk and gift lines and the
// rest of their definition, the Library's, the shop's and the battles' texts, every place's lines), shows each through
// the real dialogue box page by page, and records what the box draws: it fails on any page drawn with a "…" its text
// does not have, and lists the pages drawn at the smallest sizes.
//
//   node tools/test_textfit.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(2000);
  const r = await page.evaluate(async () => {
    const D = window.__dbg, wait = (ms) => new Promise((res) => setTimeout(res, ms)), out = { texts: 0, pages: 0, cut: [], small: [], sizes: {}, errors: [] };
    // every dialogue-like string: has a space, at least 12 characters, not code or a colour
    const seen = new Set(), texts = [];
    const take = (s, from) => { if (typeof s !== 'string' || s.length < 12 || !/ /.test(s) || /^#|=>|function|\{|px /.test(s) || seen.has(s)) return; seen.add(s); texts.push([s, from]); };
    const walk = (o, from, depth = 0) => {
      if (depth > 5 || o == null) return;
      if (typeof o === 'string') return take(o, from);
      if (typeof o === 'function') { if (o.length === 0 && depth > 0) { try { const v = o(); if (typeof v === 'string') take(v, from); } catch (e) {} } return; }
      if (typeof o !== 'object' || o.isObject3D || o.isMaterial || o.isTexture || ArrayBuffer.isView(o)) return;
      for (const k of Object.keys(o)) { let v; try { v = o[k]; } catch (e) { continue; } walk(v, from + '.' + k, depth + 1); }
    };
    for (const h of D.It.all) if (h.def) walk(h.def, (h.def.name || h.id));
    for (const [n, o] of [['LIB', D.LIB], ['shopText', D.shopText], ['battleText', D.battleText], ['gemTrade', D.gemTrade]]) if (o) walk(o, n);
    for (const q of (D.z && D.z.list) || []) walk(q, 'zone ' + (q.id || q.tag || '?'));
    out.texts = texts.length;
    // what the dialogue box draws
    let drawn = [];
    const P = CanvasRenderingContext2D.prototype, f0 = P.fillText;
    P.fillText = function (t) { if (drawn) drawn.push([String(t), this.font]); return f0.apply(this, arguments); };
    const box = D.qt;
    for (const [s, from] of texts) {
      const pages = s.split('|');
      try {
        drawn = [];
        box.open('TEST', '#ffffff', s);
        for (let k = 0; k < pages.length; k++) {
          // let the page type out in full, then read what was drawn for it
          for (let i = 0; i < 40 && box.isOpen; i++) { await wait(25); }
          const pg = pages[k];
          for (const [t, font] of drawn) {
            const px = +((font.match(/(\d+)px/) || [])[1] || 0);
            if (t.endsWith('…') && !pg.includes('…') && !s.includes('…')) out.cut.push({ from, page: pg.slice(0, 120), drew: t.slice(-40), px });
            if (px) out.sizes[px] = (out.sizes[px] || 0) + 1;
          }
          const sizes = drawn.map(([, f]) => +((f.match(/(\d+)px/) || [])[1] || 0)).filter((x) => x >= 20);
          const min = sizes.length ? Math.min(...sizes) : 0;
          if (min && min <= 36) out.small.push({ from, px: min, chars: pg.length, page: pg.slice(0, 60) });
          out.pages++;
          drawn = [];
          if (box.isOpen) box.advance();
          if (box.isOpen) box.advance();
        }
        let n = 0; while (box.isOpen && n++ < 20) { box.advance(); await wait(20); }
      } catch (e) { out.errors.push(from + ': ' + e); }
    }
    P.fillText = f0;
    return out;
  });
  note(`${r.texts} dialogue strings, ${r.pages} pages shown; font sizes drawn (px: count) ${JSON.stringify(r.sizes)}`);
  if (r.small.length) note(`pages drawn at 36 px or less (${r.small.length}): ` + r.small.slice(0, 8).map((x) => `${x.from} ${x.px}px ${x.chars} chars`).join('; '));
  expect('a full set of dialogue was found and shown', r.texts >= 150 && r.pages >= r.texts, JSON.stringify({ texts: r.texts, pages: r.pages }));
  expect('no page is cut short with "…": every line fits its dialogue box', r.cut.length === 0, JSON.stringify(r.cut.slice(0, 5)));
  expect('showing every line raised no error', r.errors.length === 0, r.errors.slice(0, 3).join(' | '));
  expect('no page errors', g.errors.length === 0, g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log(failures.length ? `TEXTFIT TEST FAILED (${failures.length})` : 'TEXTFIT TEST PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
