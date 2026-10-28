// Builds the compressed version of the game, tools/index.compressed.html: the game file (minified, RULES.md 19)
// compressed into one self-contained HTML page small enough to inscribe as a Bitcoin ordinal (the author: "must be
// fully functional as a Bitcoin ordinal, as the previous compressed version was"; RULES.md 20). The APK never uses it.
//
// The method is the previous compressed version's (git history: tools/index.compressed.html before 3.15.43). Its
// page is kept as tools/lib/compressed_loader.html, unchanged but for four placeholders: the page shows "LOADING", a
// <script type="b"> holds the compressed game as text, and the loader script unpacks it with a context-mixing model
// (sixteen hashed contexts of the bytes before, a match model and three mixers, refined by two adaptive probability
// maps) driving a binary arithmetic decoder, counting "LOADING nn%", then document.write()s the game. Outside a Quest
// browser it shows a "designed for Meta Quest" note instead. Only the decoder ever existed in the repository; the
// encoder here is that same decoder's text with the arithmetic coder turned around (the bit is read from the game
// instead of decided from the stream, and the coder's settled bytes are written instead of read), so the two cannot
// drift apart: every build is unpacked again here and compared with the game file byte for byte.
//
// The payload is text: the coded bytes are cut into 7-bit groups (least significant bit first); a group is one
// character, except 0, 13 and 60 (NUL, carriage return and "<", which a page's script text cannot hold as they are),
// which are joined with the next group into one character from 128 up (two bytes in UTF-8).
//
//   node tools/build_compressed.js            write tools/index.compressed.html from tools/uncompressed.html
//   node tools/build_compressed.js --check    exit 1 unless the compressed version unpacks to the game file exactly
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const gameFile = path.join(root, 'tools/uncompressed.html');
const outFile = path.join(root, 'tools/index.compressed.html');
const template = fs.readFileSync(path.join(__dirname, 'lib/compressed_loader.html'), 'utf8');
const ESC = [0, 13, 60];

// the model: the decoder's generator function, as the template has it
const genStart = template.indexOf('function*(t,r){');
const genEnd = template.indexOf('}(n,__GAME_BYTES__)');
if (genStart < 0 || genEnd < 0) throw new Error('decoder not found in the template');
const DECODER = template.slice(genStart, genEnd + 1);
const swap = (src, a, b) => { if (src.split(a).length !== 2) throw new Error('encoder: decoder text changed near ' + a.slice(0, 40)); return src.replace(a, b); };
// encoder: the bit comes from the input (byte __p, bit c of 8, most significant first); settled top bytes go out
let ENC = DECODER;
ENC = swap(ENC, 'ft=G<=lt?1:0', 'ft=__in[__p]>>7-c&1');
ENC = swap(ENC, ';!(4278190080&(D^E));)G=(G<<8|(H<t.length?t[H++]:255))>>>0,D=D<<8>>>0', ';!(4278190080&(D^E));)__out.push(D>>>24),D=D<<8>>>0');
ENC = swap(ENC, 'const N=255&s;', 'const N=255&s;__p++;');
ENC = swap(ENC, 'return p}', '__out.push(D>>>24);return p}');   // flush: the decoder pads with 255
const encodeBytes = new Function('__in', `let __p=0;const __out=[];const g=(${ENC})(new Uint8Array(0),__in.length);while(!g.next().done);return Uint8Array.from(__out);`);
const decodeBytes = new Function('t', 'n', `const g=(${DECODER})(t,n);let s;while(!(s=g.next()).done);return s.value;`);

function toText(bytes) {
  const groups = []; let acc = 0, bits = 0;
  for (const b of bytes) { acc |= b << bits; bits += 8; while (bits >= 7) { groups.push(acc & 127); acc >>= 7; bits -= 7; } }
  if (bits) groups.push(acc & 127);
  let s = '';
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i], e = ESC.indexOf(g);
    s += e < 0 ? String.fromCharCode(g) : String.fromCharCode(128 + (e << 7) + (i + 1 < groups.length ? groups[++i] : 0));
  }
  return s;
}
function fromText(s, n) {   // the loader's own unpacking, as a check
  const out = new Uint8Array(n); let r = 0, l = 0, a = 0;
  const c = (t) => { r |= t << l; l += 7; if (l >= 8) { if (a < n) out[a++] = r & 255; r >>= 8; l -= 8; } };
  for (let i = 0; i < s.length; i++) { const o = s.charCodeAt(i); if (o < 128) c(o); else { c(ESC[(o - 128) >> 7]); c((o - 128) & 127); } }
  return out;
}
const version = () => (fs.readFileSync(path.join(root, 'tools/android/app/build.gradle'), 'utf8').match(/versionName "([^"]+)"/) || [])[1] || '?';

function build() {
  const game = fs.readFileSync(gameFile);
  const t0 = Date.now(), coded = encodeBytes(new Uint8Array(game));
  const text = toText(coded);
  const page = template.replace('__PAYLOAD__', () => text).split('__PAYLOAD_BYTES__').join(String(coded.length)).split('__GAME_BYTES__').join(String(game.length)).replace('__VERSION__', version());
  // unpacked again from the page text, exactly as the loader does it
  const back = decodeBytes(fromText(text, coded.length), game.length);
  if (Buffer.compare(Buffer.from(back), game) !== 0) throw new Error('round trip failed: the compressed version does not unpack to the game file');
  fs.writeFileSync(outFile, page);
  console.log(`wrote tools/index.compressed.html: ${Buffer.byteLength(page)} bytes (game ${game.length} bytes, coded ${coded.length}; ${((Date.now() - t0) / 1000).toFixed(0)} s); unpacks to the game file exactly`);
}

function check() {
  const game = fs.readFileSync(gameFile);
  if (!fs.existsSync(outFile)) { console.log('COMPRESSED CHECK FAILED: no tools/index.compressed.html (run node tools/build_compressed.js)'); process.exit(1); }
  const page = fs.readFileSync(outFile, 'utf8');
  const a = page.indexOf('<script type="b">') + 17, b = page.indexOf('</script>', a);
  const nb = +(page.match(/new Uint8Array\((\d+)\)/) || [])[1], ng = +(page.match(/\}\(n,(\d+)\)/) || [])[1];
  const ok = ng === game.length && Buffer.compare(Buffer.from(decodeBytes(fromText(page.slice(a, b), nb), ng)), game) === 0;
  console.log(ok ? `COMPRESSED CHECK PASSED: tools/index.compressed.html (${Buffer.byteLength(page)} bytes) unpacks to the game file exactly` : 'COMPRESSED CHECK FAILED: tools/index.compressed.html does not unpack to the current game file (run node tools/build_compressed.js)');
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes('--check')) check(); else build();
