// P13 exactness test: the tentacle bend (`bend`, the tentacled creature's dance) from the original game
// and from the asset are run on the same inputs and their outputs compared bit for bit. Inputs: tubes
// built ring by ring (ten vertices per ring sharing a distance along the tentacle, as the game's tubes
// are), plus shuffled vertex orders and the region before the bend starts; random curl, sway, phase and
// lift, including zero curl and zero lift.
//
//   node tools/test_bend_exact.js [asset]
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const asset = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'tools/android/app/src/main/assets/index.html');
const orig = path.join(root, 'tools/uncompressed.html');
const grab = (f) => { const s = fs.readFileSync(f, 'utf8'); const a = s.indexOf('const bend=(tm,phi,amp,wph,lift)=>{'); const b = s.indexOf('},ORDER=', a); if (a < 0 || b < 0) throw new Error('bend not found in ' + f); return s.slice(a + 'const bend='.length, b + 1); };
const A = eval('(' + grab(orig) + ')'), B = eval('(' + grab(asset) + ')');
const attr = (arr) => ({ array: arr, count: arr.length / 3, itemSize: 3, needsUpdate: false, setXYZ(i, x, y, z) { this.array[3 * i] = x; this.array[3 * i + 1] = y; this.array[3 * i + 2] = z; return this; } });
let seed = 7; const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
const tube = (rings, radial, len, shuffle) => { const n = rings * radial, p = new Float32Array(3 * n), nn = new Float32Array(3 * n); let k = 0; for (let r = 0; r < rings; r++) { const z = Math.fround(-0.3 + (len + 1.2) * r / (rings - 1)); for (let s = 0; s < radial; s++) { const a = 2 * Math.PI * s / radial, rr = 0.14 + 0.05 * Math.sin(5 * a); p[3 * k] = rr * Math.cos(a); p[3 * k + 1] = rr * Math.sin(a); p[3 * k + 2] = z; nn[3 * k] = Math.cos(a); nn[3 * k + 1] = Math.sin(a); nn[3 * k + 2] = 0.1 * rnd(); k++; } } if (shuffle) { const idx = [...Array(n).keys()].sort(() => rnd() - 0.5); const p2 = new Float32Array(3 * n), n2 = new Float32Array(3 * n); idx.forEach((o, i) => { for (let c = 0; c < 3; c++) { p2[3 * i + c] = p[3 * o + c]; n2[3 * i + c] = nn[3 * o + c]; } }); return [p2, n2]; } return [p, nn]; };
let cases = 0, bad = 0;
for (let t = 0; t < 400; t++) {
  const len = 1 + 3 * rnd(); const [p0, n0] = tube(81, 10, len, t % 5 === 4);
  const mk = () => ({ geometry: { attributes: { position: attr(new Float32Array(p0.length)), normal: attr(new Float32Array(n0.length)) } }, userData: { p0, n0, len }, frustumCulled: true });
  const ta = mk(), tb = mk();
  const phi = t % 7 === 0 ? 0 : (rnd() - 0.3) * 3, amp = t % 11 === 0 ? 0 : rnd() * 0.3, wph = rnd() * 40, lift = t % 3 === 0 ? 0 : rnd() * 0.8;
  A(ta, phi, amp, wph, lift); B(tb, phi, amp, wph, lift); cases++;
  const eq = (x, y) => { const X = new Uint32Array(x.buffer), Y = new Uint32Array(y.buffer); for (let i = 0; i < X.length; i++) if (X[i] !== Y[i]) return i; return -1; };
  const dp = eq(ta.geometry.attributes.position.array, tb.geometry.attributes.position.array), dn = eq(ta.geometry.attributes.normal.array, tb.geometry.attributes.normal.array);
  const flags = ta.geometry.attributes.position.needsUpdate === tb.geometry.attributes.position.needsUpdate && ta.frustumCulled === tb.frustumCulled;
  if (dp >= 0 || dn >= 0 || !flags) { bad++; if (bad < 5) console.log(`  DIFF case ${t}: position word ${dp}, normal word ${dn}, flags ${flags} (phi ${phi}, amp ${amp}, lift ${lift})`); }
}
console.log(`${cases} cases, ${bad} differing`);
console.log(bad ? 'BEND EXACT TEST FAILED' : 'BEND EXACT TEST PASSED'); process.exit(bad ? 1 : 0);
