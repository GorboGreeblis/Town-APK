// Maps the game's boot sequence: parses the last <script> of the game HTML and
// prints the top-level elements of the boot IIFE (and its nested IIFE) with
// character offsets and sizes, so apply_entry_fix.py can place yield points
// on exact anchors.   node tools/lib/boot_map.js [file]
const fs = require('fs'); const path = require('path'); const acorn = require('acorn');
const file = process.argv[2] || path.join(__dirname, '..', 'uncompressed.html');
const html = fs.readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)];
const last = scripts[scripts.length - 1]; const src = last[1]; const base = last.index + last[0].indexOf(src);
const ast = acorn.parse(src, { ecmaVersion: 2022, allowAwaitOutsideFunction: true });
// find the try statement whose test contains 'window.__jgpBlocked'
let bootTry = null;
(function walk(n) { if (!n || typeof n.type !== 'string') return; if (n.type === 'TryStatement' && src.slice(n.start, n.start + 60).includes('__jgpBlocked')) { bootTry = n; return; } for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); } })(ast);
if (!bootTry) throw new Error('boot try not found');
const stmt = bootTry.block.body[0]; const cond = stmt.expression; // ConditionalExpression
const alt = cond.alternate; // UnaryExpression ! CallExpression
const outer = alt.argument.callee; // FunctionExpression
const seq = (body) => { const items = []; for (const s of body) { if (s.type === 'ExpressionStatement' && s.expression.type === 'SequenceExpression') items.push(...s.expression.expressions); else items.push(s); } return items; };
const describe = (list, label) => { console.log(`== ${label}: ${list.length} elements`); list.forEach((e, i) => { const txt = src.slice(e.start, e.end); console.log(`${String(i).padStart(3)}  off=${base + e.start}  len=${String(e.end - e.start).padStart(6)}  ${e.type.padEnd(22)} ${txt.slice(0, 70).replace(/\n/g, ' ')}`); }); };
const outerItems = seq(outer.body.body); describe(outerItems, 'outer boot function');
// nested IIFE = first element if it is a CallExpression of a FunctionExpression
const first = outerItems[0]; if (first.type === 'CallExpression' && first.callee.type === 'FunctionExpression') { const inner = seq(first.callee.body.body); describe(inner, 'nested IIFE (world build)'); }
// also the last "!function(){...gcEB.ready=!0}()" element if present
const lastEl = outerItems.find((e) => src.slice(e.start, e.end).includes('gcEB.ready=!0')); if (lastEl) { const f = lastEl.type === 'UnaryExpression' ? lastEl.argument.callee : null; if (f) describe(seq(f.body.body), 'finalize IIFE (batching, ready)'); }
