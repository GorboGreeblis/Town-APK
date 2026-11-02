// The Post Office's mail pile (standard tier; A43, B55: the pile had pictures only). Behind the kiosk: letters,
// sacks and five parcels, four of them labelled ("To Montreal", "To Cobourg", "To Bangkok", "To Ormstown"), one
// blank. Each label is a thin panel (4 mm) with a painted texture on a parcel's outer face. Checked, from the scene
// as built while loading:
//   - five parcels behind the Post Office, four with a label panel whose texture is painted (an image or a canvas
//     with more than one colour), one blank;
//   - every parcel lies on the pile (none floating high or buried: its bottom within -0.3 .. +0.4 m of the ground);
//   - the "To Ormstown" parcel (A43: "between the stacks, clear of them so the whole label shows") overlaps no other
//     parcel and no letter stack, and its label faces away from the pile's centre (the label is seen from outside);
//   - every label faces away from the pile's centre;
//   - no page errors.
//
//   node tools/test_mailpile.js [file]
const path = require('path');
const { boot, reporter } = require('./lib/harness');
const file = process.argv[2] ? path.resolve(process.argv[2]) : undefined;

(async () => {
  const { expect, note, failures } = reporter();
  const g = await boot({ file, vr: false, fastSim: true });
  const errors = []; g.page.on('pageerror', (e) => errors.push(e.message)); g.page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
  const r = await g.page.evaluate(async () => {
    const T = window.THREE, D = window.__dbg, C = D.C; await new Promise((res) => setTimeout(res, 800));
    C.updateMatrixWorld(true);
    // the label panels: the only Lambert meshes with a 256 x 128 painted map, on a parcel group (rotation order YXZ, tilted -0.14)
    const labels = []; C.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.isMeshLambertMaterial && o.material.map && o.material.map.image && o.material.map.image.width === 256 && o.material.map.image.height === 128 && o.parent && o.parent.rotation.order === 'YXZ' && Math.abs(o.parent.rotation.x + 0.14) < 1e-6) labels.push(o); });
    // the parcels: the label panels' parents, plus the blank parcel (a sibling group built the same way: rotation order YXZ, tilted -0.14)
    const pileGroup = labels.length ? labels[0].parent.parent : null;
    const parcels = pileGroup ? pileGroup.children.filter((k) => k.isGroup && k.rotation.order === 'YXZ' && Math.abs(k.rotation.x + 0.14) < 1e-6) : [];
    const centre = pileGroup ? pileGroup.localToWorld(new T.Vector3(0, 0, -4.67)) : new T.Vector3();
    const box = (o) => new T.Box3().setFromObject(o);
    const painted = (tex) => { const im = tex.image; if (!im) return false; if (im.naturalWidth) return im.naturalWidth > 0; if (im.getContext) { const d = im.getContext('2d').getImageData(0, 0, im.width, im.height).data; const first = [d[0], d[1], d[2]]; for (let i = 4; i < d.length; i += 4 * 37) if (d[i] !== first[0] || d[i + 1] !== first[1] || d[i + 2] !== first[2]) return true; return false; } return false; };
    const ground = (x, z) => (D.JGP && D.JGP.groundAt ? D.JGP.groundAt(x, z, 0.3) : 0);
    const out = { labels: labels.length, parcels: parcels.length, paintedLabels: labels.filter((l) => painted(l.material.map)).length, facing: 0, rest: [], ormstown: null };
    for (const l of labels) {
      const n = new T.Vector3(0, 0, 1).transformDirection(l.matrixWorld), p = l.getWorldPosition(new T.Vector3());
      if (p.clone().sub(centre).setY(0).normalize().dot(n.setY(0).normalize()) > 0.2) out.facing++;
    }
    for (const k of parcels) { const b = box(k), p = k.getWorldPosition(new T.Vector3()); out.rest.push(+(b.min.y - ground(p.x, p.z)).toFixed(3)); }
    // the Ormstown parcel: the one at the pile's local (-1.4, -6.45)
    const orm = parcels.find((k) => Math.abs(k.position.x + 1.4) < 0.01 && Math.abs(k.position.z + 6.45) < 0.01);
    if (orm) {
      const ob = box(orm); let overlaps = 0; for (const k of parcels) if (k !== orm && box(k).intersectsBox(ob)) overlaps++;
      // the letter stacks are the pile's other children with a small footprint near the parcels (the four stacks and the sacks); none may cut into the parcel's box
      const others = pileGroup.children.filter((k) => !parcels.includes(k) && k !== orm); let stackHits = 0;
      for (const k of others) { const kb = box(k); if (kb.isEmpty()) continue; const s = kb.getSize(new T.Vector3()); if (s.x > 2 || s.z > 2) continue; if (kb.intersectsBox(ob)) stackHits++; }
      const lab = labels.find((l) => l.parent === orm);
      out.ormstown = { overlaps, stackHits, labelled: !!lab, size: ob.getSize(new T.Vector3()).toArray().map((v) => +v.toFixed(2)) };
    }
    return out;
  });
  note(JSON.stringify(r));
  expect('five parcels behind the Post Office, four of them labelled with a painted texture', r.parcels === 5 && r.labels === 4 && r.paintedLabels === 4, JSON.stringify({ parcels: r.parcels, labels: r.labels, painted: r.paintedLabels }));
  // the parcels lie on the letters and sacks of the pile and on the slope behind the kiosk, so their bottoms sit between
  // 30 cm below and 40 cm above the ground height at their centre (the author approved the pile's look, A43)
  expect('every parcel lies on the pile: none floating high or buried (bottom within -0.3 .. +0.4 m of the ground)', r.rest.length === 5 && r.rest.every((v) => v > -0.3 && v < 0.4), JSON.stringify(r.rest));
  expect('every label faces away from the pile\'s centre (seen from outside)', r.facing === 4, `${r.facing} of ${r.labels}`);
  expect('the "To Ormstown" parcel is labelled, overlaps no other parcel and cuts into no letter stack (A43)', !!r.ormstown && r.ormstown.labelled && r.ormstown.overlaps === 0 && r.ormstown.stackHits === 0, JSON.stringify(r.ormstown));
  expect('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await g.close(); console.log(failures.length ? `MAIL PILE TEST FAILED (${failures.length})` : 'MAIL PILE TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
