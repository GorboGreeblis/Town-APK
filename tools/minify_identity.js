// Minification identity (report, run after tools/minify_game.js; NOTES 89): proves that two versions of the game file
// (before and after a minification) build exactly the same world. Each is booted with every source of difference
// fixed: Math.random replaced by one fixed sequence from the first line, Date.now frozen, and the texture painters'
// seed taken from the texture's size and call count only (FIXES R1 seeds from the painter's source text too, which
// minification changes, so the seeded grain is the one thing minification may re-roll). At the moment the world is
// ready (before the first frame) the whole scene is recorded: every object's type, name, visibility, render order and
// local transform; every geometry's attributes and index (hashed bit for bit); every material's settings; every
// canvas texture's pixels. The two records must be identical.
//
//   node tools/minify_identity.js BEFORE.html [AFTER.html]       default AFTER: tools/uncompressed.html
const fs = require('fs');
const path = require('path');
const { boot, root } = require('./lib/harness');
const [before, after] = [path.resolve(process.argv[2] || ''), path.resolve(process.argv[3] || path.join(root, 'tools/uncompressed.html'))];
if (!process.argv[2]) { console.log('usage: node tools/minify_identity.js BEFORE.html [AFTER.html]'); process.exit(2); }
const INIT = `<script>(()=>{let s=12345;Math.random=()=>(s=16807*s%2147483647)/2147483647;const T=Date.UTC(2026,9,28,15,0,0);Date.now=()=>T})()</script>`;
const SNAP = `try{window.__snap=(()=>{const H=(a)=>{if(!a)return"-";const b=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let h=2166136261;for(let i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return(h>>>0).toString(16)+"/"+b.length},`
  + `img=(t)=>{try{const c=t&&t.image;if(!c||!c.getContext)return t?"tex:"+(t.image&&t.image.width):"-";return"cv"+c.width+"x"+c.height+":"+H(c.getContext("2d").getImageData(0,0,c.width,c.height).data)}catch(e){return"?"}},`
  + `mat=(m)=>!m?"-":[m.type,m.color&&m.color.getHex(),m.emissive&&m.emissive.getHex(),m.specular&&m.specular.getHex(),m.shininess,m.opacity,m.transparent,m.side,m.depthWrite,m.depthTest,m.vertexColors,m.flatShading,m.fog,m.blending,m.alphaTest,img(m.map),img(m.emissiveMap),img(m.alphaMap)].join(","),`
  + `out=[];C.traverse(o=>{const g=o.geometry,A=g&&g.attributes||{};out.push([o.type,o.name,o.visible,o.renderOrder,o.frustumCulled,Array.from(o.matrix.elements).join(" "),`
  + `g?Object.keys(A).sort().map(k=>k+"="+H(A[k].array)).join(";")+";i="+H(g.index&&g.index.array)+";gr="+JSON.stringify(g.groups):"-",`
  + `Array.isArray(o.material)?o.material.map(mat).join("|"):mat(o.material)].join(" ~ "))});return out})()}catch(e){window.__snapErr=String(e)}`;

function variant(file, tag) {
  let s = fs.readFileSync(file, 'utf8');
  const key = /(\w+)\+"x"\+(\w+)\+":"\+(\w+)\.toString\(\)/g, n = (s.match(key) || []).length;
  if (n !== 1) throw new Error(`${file}: the texture maker's seed key found ${n} times (expected 1)`);
  s = s.replace(key, '$1+"x"+$2').replace(/<head[^>]*>/i, (m) => m + INIT);
  if (s.split('gcEB.ready=!0').length !== 2) throw new Error(file + ': world-ready point not found');
  s = s.replace('gcEB.ready=!0', 'gcEB.ready=!0;' + SNAP + ';0');
  const out = path.join(root, `tools/.runs/minify_identity_${tag}.html`); fs.writeFileSync(out, s); return out;
}

(async () => {
  const recs = [];
  for (const [f, tag] of [[before, 'before'], [after, 'after']]) {
    const g = await boot({ file: variant(f, tag), vr: true, standalone: true });   // no tex/: its files are keyed by the painters' source, which minification changes
    recs.push(await g.page.evaluate(() => ({ snap: window.__snap, err: window.__snapErr })));
    await g.close();
  }
  const [a, b] = recs;
  if (a.err || b.err || !a.snap || !b.snap) { console.log('snapshot failed', a.err, b.err); process.exit(1); }
  // aligned as lists (an object missing or extra on one side shows as itself, not as every object after it)
  const n = a.snap.length, m = b.snap.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a.snap[i] === b.snap[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const only = [];
  for (let i = 0, j = 0; i < n || j < m;) {
    if (i < n && j < m && a.snap[i] === b.snap[j]) { i++; j++; } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) only.push(`after only (object ${j}): ${b.snap[j++].slice(0, 400)}`); else only.push(`before only (object ${i}): ${a.snap[i++].slice(0, 400)}`);
  }
  const diff = only.length; only.slice(0, 8).forEach((x) => console.log('  ' + x));
  const tex = new Set(a.snap.join('\n').match(/cv\d+x\d+:[0-9a-f]+\/\d+/g) || []).size;
  console.log(`${a.snap.length} objects before, ${b.snap.length} after (${tex} distinct canvas textures); ${diff} differ`);
  console.log(diff || a.snap.length !== b.snap.length ? 'MINIFY IDENTITY FAILED' : 'MINIFY IDENTITY PASSED: the same world, object for object, bit for bit');
  process.exit(diff || a.snap.length !== b.snap.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
