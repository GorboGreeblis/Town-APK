// No name used but never declared (quick tier; S34, 4.0.28; the author's flash log 1b7d04a9: "[camera] ReferenceError:
// Ot is not defined" about 170 times in a run: A50 removed the controller-pulse helper but left one call, in the
// wrist and menu ray's hover, so each new hover threw and cut the camera step short). Every script block of the game
// file is parsed and its scopes resolved (var and function hoisting, let/const/class blocks, parameters, catch
// bindings); a name that no enclosing scope declares, that no other script declares at its top level, and that is not
// a browser global or one of the few known optional ones (three.js's own feature tests) fails the check.
//
//   node tools/test_freevars.js [file]      (default: tools/uncompressed.html)
// list identifiers referenced but never declared in any enclosing scope (free variables), per script block
const fs = require('fs'), acorn = require(require('path').join(__dirname, 'node_modules/acorn'));
const html = fs.readFileSync(process.argv[2] || require('path').join(__dirname, 'uncompressed.html'), 'utf8'); const re = /<script[^>]*>([\s\S]*?)<\/script>/g; let m, idx = 0;
const known = new Set(Object.getOwnPropertyNames(globalThis).concat(['window','document','navigator','performance','requestAnimationFrame','cancelAnimationFrame','fetch','XRWebGLLayer','XRWebGLBinding','XRRigidTransform','WebGL2RenderingContext','WebGLRenderingContext','Image','HTMLCanvasElement','HTMLImageElement','ImageBitmap','OffscreenCanvas','AudioContext','webkitAudioContext','location','innerWidth','innerHeight','devicePixelRatio','localStorage','sessionStorage','screen','getComputedStyle','alert','Blob','URL','Worker','MutationObserver','ResizeObserver','KeyboardEvent','Event','CustomEvent','DOMParser','XMLHttpRequest','ImageData','Path2D','createImageBitmap','addEventListener','removeEventListener','setTimeout','clearTimeout','setInterval','clearInterval','console','self','globalThis','undefined','arguments','THREE','__gtLog','__gtY','__gtTexSub','VideoFrame','HTMLVideoElement','SVGElement','WebGLTexture','WebGLFramebuffer','XRSession','XRFrame','gcHookErr','WebGL2ComputeRenderingContext','__THREE_DEVTOOLS__','CanvasRenderingContext2D','__gtAssets','DOMException','TextDecoder','TextEncoder','FileReader','btoa','atob','structuredClone','queueMicrotask','matchMedia','origin','name']));
const globalsDeclared = new Set(); const refsAll = [];
function collect(code, blk) {
  let ast; try { ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' }); } catch (e) { console.log('parse fail', blk, e.message); return; }
  const scopes = []; const push = (s) => scopes.push(s), pop = () => scopes.pop(); const free = [];
  const declare = (name, kind) => { const s = kind === 'var' ? [...scopes].reverse().find((x) => x.fn) : scopes[scopes.length - 1]; s.names.add(name); if (s === scopes[0]) globalsDeclared.add(name); };
  const pat = (p, kind) => { if (!p) return; switch (p.type) { case 'Identifier': declare(p.name, kind); break; case 'ObjectPattern': p.properties.forEach((q) => pat(q.type === 'RestElement' ? q.argument : q.value, kind)); break; case 'ArrayPattern': p.elements.forEach((q) => pat(q, kind)); break; case 'RestElement': pat(p.argument, kind); break; case 'AssignmentPattern': pat(p.left, kind); break; } };
  // hoist var/function declarations of a function body before walking
  const hoist = (node) => { (function h(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(h); if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach((d) => pat(d.id, 'var')); if (n.type === 'FunctionDeclaration') { declare(n.id.name, 'var'); return; } if (/Function/.test(n.type) || n.type === 'ClassExpression' || n.type === 'ClassDeclaration') return; for (const k in n) if (k !== 'type' && n[k] && typeof n[k] === 'object') h(n[k]); })(node); };
  const hoistBlock = (body) => body.forEach((s) => { if (s.type === 'VariableDeclaration' && s.kind !== 'var') s.declarations.forEach((d) => pat(d.id, 'let')); if (s.type === 'ClassDeclaration') declare(s.id.name, 'let'); if (s.type === 'FunctionDeclaration' && scopes[scopes.length - 1].fn !== true) declare(s.id.name, 'let'); });
  const resolve = (name, node) => { for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].names.has(name)) return; free.push([name, node.start]); };
  function walk(n, parent) {
    if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach((c) => walk(c, parent));
    switch (n.type) {
      case 'Program': push({ fn: true, names: new Set() }); hoist(n.body); hoistBlock(n.body); n.body.forEach((c) => walk(c, n)); return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        push({ fn: true, names: new Set() }); if (n.type === 'FunctionExpression' && n.id) declare(n.id.name, 'let'); n.params.forEach((p) => pat(p, 'let')); n.params.forEach((p) => walkPatDefaults(p));
        if (n.body.type === 'BlockStatement') { hoist(n.body.body); hoistBlock(n.body.body); n.body.body.forEach((c) => walk(c, n)); } else walk(n.body, n); pop(); return; }
      case 'BlockStatement': case 'StaticBlock': push({ fn: false, names: new Set() }); hoistBlock(n.body); n.body.forEach((c) => walk(c, n)); pop(); return;
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': push({ fn: false, names: new Set() }); if (n.init && n.init.type === 'VariableDeclaration' && n.init.kind !== 'var') n.init.declarations.forEach((d) => pat(d.id, 'let')); if (n.left && n.left.type === 'VariableDeclaration' && n.left.kind !== 'var') n.left.declarations.forEach((d) => pat(d.id, 'let'));
        ['init', 'test', 'update', 'left', 'right', 'body'].forEach((k) => n[k] && walk(n[k], n)); pop(); return;
      case 'CatchClause': push({ fn: false, names: new Set() }); if (n.param) pat(n.param, 'let'); walk(n.body, n); pop(); return;
      case 'ClassDeclaration': case 'ClassExpression': push({ fn: false, names: new Set() }); if (n.id) declare(n.id.name, 'let'); if (n.superClass) walk(n.superClass, n); walk(n.body, n); pop(); return;
      case 'VariableDeclaration': n.declarations.forEach((d) => { walkPatDefaults(d.id); d.init && walk(d.init, d); }); return;
      case 'Identifier': resolve(n.name, n); return;
      case 'MemberExpression': walk(n.object, n); if (n.computed) walk(n.property, n); return;
      case 'Property': if (n.computed) walk(n.key, n); walk(n.value, n); return;
      case 'MethodDefinition': case 'PropertyDefinition': if (n.computed) walk(n.key, n); n.value && walk(n.value, n); return;
      case 'LabeledStatement': walk(n.body, n); return; case 'BreakStatement': case 'ContinueStatement': return;
    }
    for (const k in n) if (k !== 'type' && k !== 'start' && k !== 'end' && n[k] && typeof n[k] === 'object') walk(n[k], n);
  }
  function walkPatDefaults(p) { if (!p) return; if (p.type === 'AssignmentPattern') { walk(p.right, p); walkPatDefaults(p.left); } else if (p.type === 'ObjectPattern') p.properties.forEach((q) => { if (q.computed) walk(q.key, q); walkPatDefaults(q.type === 'RestElement' ? q.argument : q.value); }); else if (p.type === 'ArrayPattern') p.elements.forEach(walkPatDefaults); }
  walk(ast); refsAll.push([blk, free, code]);
}
while ((m = re.exec(html))) { idx++; if (m[1].length > 50) collect(m[1], idx); }
let bad = 0;
for (const [blk, free, code] of refsAll) { const left = free.filter(([n]) => !known.has(n) && !globalsDeclared.has(n)); const by = {}; left.forEach(([n, at]) => (by[n] = by[n] || []).push(at)); for (const n in by) bad++, console.log(`  FAIL  script ${blk}: ${n} used ${by[n].length} time(s) but never declared  e.g. ...${code.slice(Math.max(0, by[n][0] - 80), by[n][0] + 40).replace(/\s+/g, ' ')}...`); }
console.log(bad ? `FREE VARIABLES TEST FAILED (${bad})` : 'FREE VARIABLES TEST PASSED'); process.exit(bad ? 1 : 0);
