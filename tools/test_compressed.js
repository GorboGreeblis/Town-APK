// Compressed version test (every tier but quick): index.compressed.html works as a Bitcoin ordinal (RULES.md 20).
// The page is served alone, as an inscription is: every other path is a 404, and the response carries the content
// security policy ordinals.com serves inscriptions with (only the page's own origin, inline code, data: and blob:),
// so anything the game would fetch from elsewhere fails here as it would there. Checked:
//   - first, that it unpacks to the game file exactly (build_compressed.js --check);
//   - with a Quest browser's user agent: "LOADING nn%" counts up, the game replaces the page and boots, enters VR
//     through the fake headset, draws frames, with no page error (the refused optional extras aside), and asks for
//     nothing from another host;
//   - in an explorer's preview (the Ordinals check; the author: it must work as an ordinal on ordinals.com and
//     ordiscan.com): ord shows an HTML inscription's page at /content/<id> (checked above) and, on the inscription's
//     page, in a frame with sandbox="allow-scripts" (/preview/<id>: an opaque origin, no storage, no permission to
//     start VR). In such a frame, with a Quest browser's user agent, it unpacks and boots without page errors, and,
//     VR being refused, it says to open the inscription's full page in the Quest Browser;
//   - with a desktop browser's user agent: the page says the game is designed for the Meta Quest Browser and to open
//     the file there, and unpacks nothing.
//
//   node tools/test_compressed.js [page]          default: index.compressed.html
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { reporter, root } = require('./lib/harness');
const file = path.resolve(process.argv[2] || path.join(root, 'index.compressed.html'));
const CSP = "default-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob:";
const QUEST = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/35.0 Chrome/128.0 VR Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

(async () => {
  const { expect, note, failures } = reporter();
  if (!process.argv[2]) {
    let ok = true; try { execFileSync('node', [path.join(root, 'tools/build_compressed.js'), '--check'], { stdio: 'pipe' }); } catch (e) { ok = false; }
    expect('it unpacks to the game file exactly (build_compressed.js --check)', ok);
  }
  const body = fs.readFileSync(file);
  note(`page: ${body.length} bytes (an inscription must stay under about 390,000)`);
  expect('small enough for one inscription (under 390,000 bytes)', body.length < 390000, String(body.length));
  const srv = await new Promise((res) => { const s = http.createServer((q, r) => {
    // /preview: an explorer's inscription page, the inscription in a sandboxed frame as ord shows it (ordinals.com's
    // /preview/<id>; sandbox="allow-scripts": an opaque origin, no storage, no permission to start VR)
    if (q.url.split('?')[0] === '/preview') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return r.end('<!doctype html><title>preview</title><iframe sandbox="allow-scripts" src="/" style="width:900px;height:600px"></iframe>'); }
    if (q.url.split('?')[0] !== '/') { r.writeHead(404, { 'Content-Security-Policy': CSP }); return r.end(); }
    r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP }); r.end(body);
  }); s.listen(0, '127.0.0.1', () => res(s)); });
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

  // in a Quest browser
  {
    const ctx = await browser.newContext({ userAgent: QUEST, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage(), errors = [], requests = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0]));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
    page.on('request', (r) => requests.push(r.url()));
    await page.addInitScript(fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8'));
    await page.addInitScript(() => { window.__ldSeen = []; const t = setInterval(() => { const d = document.getElementById('ld'); if (d) window.__ldSeen.push(d.textContent); else clearInterval(t); }, 50); });
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'load' });
    const booted = await page.waitForFunction(() => window.__gtXR && window.__gtXR.booted === true, null, { timeout: 300000 }).then(() => true, () => false);
    const unpackS = (Date.now() - t0) / 1000;
    const seen = await page.evaluate(() => [...new Set(window.__ldSeen || [])]);
    expect('shows LOADING and counts up while it unpacks', seen.some((s) => /LOADING \d+%/.test(s)), seen.slice(0, 3).join(' | ') + ' ... ' + seen.slice(-1));
    expect('the game replaces the page and boots', booted, `${unpackS.toFixed(0)} s`);
    let frames = 0;
    if (booted) {
      await page.evaluate(() => window.__fakeXR.fire());
      frames = await page.waitForFunction(() => window.__fakeXR.frames > 5, null, { timeout: 90000 }).then(() => page.evaluate(() => window.__fakeXR.frames), () => 0);
    }
    expect('enters VR and draws frames', frames > 5, `${frames} frames`);
    await page.waitForTimeout(3000);
    const other = requests.filter((u) => !u.startsWith(url) && !/^(data|blob):/.test(u));
    expect('asks for nothing from another host', other.length === 0, other.slice(0, 3).join(' | '));
    const real = errors.filter((e) => !/status of 404|Content Security Policy|Refused to/.test(e));
    expect('no page errors (the refused optional extras aside)', real.length === 0, real.slice(0, 3).join(' | '));
    const csp = errors.filter((e) => /Content Security Policy|Refused to/.test(e));
    if (csp.length) note('refused by the ordinal policy: ' + csp.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // in an explorer's preview frame, in a Quest browser: it unpacks and boots, but VR cannot start in a sandboxed frame
  // (the frame is not allowed to; the fake headset refuses as the browser does), and the page says where to play
  {
    const ctx = await browser.newContext({ userAgent: QUEST, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0]));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().split('\n')[0]); });
    await page.addInitScript(fs.readFileSync(path.join(root, 'tools/fakexr.js'), 'utf8'));
    await page.addInitScript(() => { if (window.self !== window.top && navigator.xr) navigator.xr.requestSession = () => Promise.reject(new DOMException('The frame is not allowed to start VR', 'SecurityError')); });
    await page.goto(url + 'preview', { waitUntil: 'load' });
    let frame = null; for (let i = 0; i < 100 && !frame; i++) { frame = page.frames().find((f) => f !== page.mainFrame()); if (!frame) await page.waitForTimeout(100); }
    const booted = frame ? await frame.waitForFunction(() => window.__gtXR && window.__gtXR.booted === true, null, { timeout: 300000 }).then(() => true, () => false) : false;
    expect('in a sandboxed preview frame it unpacks and boots', booted);
    let gate = '';
    if (booted) {
      await frame.evaluate(() => { try { window.__fakeXR.fire(); } catch (e) {} });
      await page.waitForTimeout(4000);
      gate = await frame.evaluate(() => (document.getElementById('gateText') || {}).textContent || '');
    }
    expect('there it says VR cannot start in the preview and to open the full page in the Quest Browser', /preview/.test(gate) && /Quest Browser/.test(gate), gate.replace(/\n+/g, ' / '));
    // the optional extras (tex/, /log) are refused from the frame's opaque origin, as in the full page
    const real = errors.filter((e) => !/status of 404|Content Security Policy|Refused to|not allowed to start VR|CORS policy|ERR_FAILED/.test(e));
    expect('no page errors in the preview frame (the refused optional extras aside)', real.length === 0, real.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // in a desktop browser
  {
    const ctx = await browser.newContext({ userAgent: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1500);
    const txt = await page.evaluate(() => (document.getElementById('ld') || {}).textContent || '');
    expect('outside a Quest browser it says the game is designed for the Meta Quest Browser and to open the file there', /designed for the Meta Quest Browser/.test(txt) && /open this file in the Quest Browser/.test(txt), txt.replace(/\n+/g, ' / '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(failures.length ? `COMPRESSED TEST FAILED (${failures.length})` : 'COMPRESSED TEST PASSED'); process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
