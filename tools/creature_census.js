// Creature census (report, full tier): what each character costs to draw, as built in the running game. For every
// townsperson, Sparkakus, the Ancient and the courier when present: visible meshes, how many the batcher took
// (gcEB, drawn as part of a shared batch) and how many draw on their own, triangles and vertices, distinct
// materials and textures, transparent meshes, and parts kept out of the static merge (moving parts, lids). The
// companion to CREATURES.md: a change to a model shows here as numbers. Writes tools/.runs/creature_census.json.
//
//   node tools/creature_census.js [file]
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib/harness');
const file = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : undefined;
(async () => {
  const g = await boot({ file, vr: true, fastSim: false });
  const page = g.page;
  await page.waitForTimeout(3000);   // a few frames, so the batcher has taken what it takes
  const r = await page.evaluate(() => {
    const D = window.__dbg, BATCH = 1 << 31;
    const who = [];
    for (const h of D.It.all) if (h.group && h.def) who.push([h.def.name || h.id, h.id || h.def.__type || '', h.group, h.height, h.bodyR]);
    if (D.st && D.st.group) who.push(['SPARKAKUS', 'keeper', D.st.group, D.st.height, null]);
    const slug = D.JGP && D.JGP.slug && D.JGP.slug.ent;
    if (slug && slug.group) who.push(['THE ANCIENT', 'slug', slug.group, slug.height, slug.bodyR]);
    const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
    return who.map(([name, id, grp, height, bodyR]) => {
      const c = { name, id, height: height && +(+height).toFixed(2), bodyR, meshes: 0, batched: 0, own: 0, tris: 0, verts: 0, transparent: 0, kept: 0, materials: new Set(), textures: new Set(), kinds: {} };
      grp.traverse((o) => {
        if (!o.isMesh && !o.isPoints && !o.isSprite) return;
        if (!shown(o)) return;
        const geo = o.geometry, pos = geo && geo.attributes && geo.attributes.position;
        c.meshes++;
        const batched = o.layers && o.layers.mask === BATCH;
        if (batched) c.batched++; else c.own++;
        if (pos) { c.verts += pos.count; c.tris += o.isMesh ? Math.floor((geo.index ? geo.index.count : pos.count) / 3) : 0; }
        if (o.userData && o.userData.keep) c.kept++;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m) continue;
          c.materials.add(m.uuid); c.kinds[m.type] = (c.kinds[m.type] || 0) + 1;
          if (m.transparent) c.transparent++;
          for (const k of ['map', 'bumpMap', 'emissiveMap', 'alphaMap']) if (m[k]) c.textures.add(m[k].uuid);
        }
      });
      return { ...c, materials: c.materials.size, textures: c.textures.size };
    });
  });
  const pad = (v, n) => String(v).padStart(n);
  console.log(`  ${'character'.padEnd(14)} ${pad('height', 6)} ${pad('meshes', 6)} ${pad('batched', 7)} ${pad('own', 4)} ${pad('triangles', 9)} ${pad('vertices', 8)} ${pad('mats', 4)} ${pad('texs', 4)} ${pad('transp', 6)} ${pad('kept', 4)}`);
  for (const c of r.sort((a, b) => b.tris - a.tris)) {
    console.log(`  ${c.name.padEnd(14)} ${pad(c.height || '', 6)} ${pad(c.meshes, 6)} ${pad(c.batched, 7)} ${pad(c.own, 4)} ${pad(c.tris, 9)} ${pad(c.verts, 8)} ${pad(c.materials, 4)} ${pad(c.textures, 4)} ${pad(c.transparent, 6)} ${pad(c.kept, 4)}`);
  }
  const tot = r.reduce((a, c) => ({ own: a.own + c.own, tris: a.tris + c.tris, meshes: a.meshes + c.meshes }), { own: 0, tris: 0, meshes: 0 });
  console.log(`  ${r.length} characters: ${tot.meshes} visible meshes, ${tot.own} drawn on their own (the rest in shared batches), ${tot.tris} triangles`);
  const out = path.join(__dirname, '.runs', 'creature_census.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), characters: r }, null, 1));
  console.log(`  written to ${path.relative(path.join(__dirname, '..'), out)}`);
  if (g.errors.length) console.log('  page errors: ' + g.errors.slice(0, 3).join(' | '));
  await g.close();
  console.log('CREATURE CENSUS DONE');
})().catch((e) => { console.error(e); process.exit(1); });
