/** Optional QA tooling: PLAYWRIGHT_MODULE may point to an existing Playwright install. */
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:4173/';
const output = process.env.QA_OUTPUT || 'docs/qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const report = { date: new Date().toISOString(), base, browser: browser.version(), environment: 'Local production Vite preview; fresh contexts; CDP cache disabled; Vite preview gzip responses; no external CDN', performance: [], checks: [] };
report.build = [];
for (const name of (await readdir('dist/assets')).filter(name => /\.(js|css)$/.test(name))) {
 const bytes = await readFile(`dist/assets/${name}`);
 report.build.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const context = options => browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...options });
const ready = page => page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 30000 });
async function check(name, fn) { await fn(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
async function instrument(page) {
  await page.addInitScript(() => {
    window.__metrics = { lcp: 0, cls: 0, longTasks: [], shifts: [] };
    new PerformanceObserver(list => { for (const e of list.getEntries()) { window.__metrics.lcp = e.startTime; window.__metrics.lcpElement = e.element?.tagName; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) { window.__metrics.cls += e.value; window.__metrics.shifts.push(e.value); } }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__metrics.longTasks.push({ start: e.startTime, duration: e.duration }); }).observe({ type: 'longtask', buffered: true });
  });
}
try {
  for (const mobile of [false, true]) for (let run = 1; run <= 3; run++) {
    const ctx = await context(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
    const page = await ctx.newPage(); await instrument(page);
    const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Performance.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (mobile) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: 'cellular4g' });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const first = await page.evaluate(() => [...document.querySelectorAll('nav a')].map(a => ({ href: a.href, visible: a.getBoundingClientRect().height >= 44, clickable: a.contains(document.elementFromPoint(a.getBoundingClientRect().x + 5, a.getBoundingClientRect().y + 20)) })));
    assert.ok(first.every(link => link.visible && link.clickable));
    await ready(page); await page.waitForTimeout(1500);
    const metrics = await page.evaluate(() => ({ ...window.__metrics, paints: performance.getEntriesByType('paint').map(e => ({ name: e.name, start: e.startTime })), marks: performance.getEntriesByType('mark').map(e => ({ name: e.name, start: e.startTime })), resources: performance.getEntriesByType('resource').map(e => ({ name: e.name.split('/').pop(), start: e.startTime, end: e.responseEnd, transfer: e.transferSize, encoded: e.encodedBodySize, decoded: e.decodedBodySize, type: e.initiatorType })), stats: window.mima.stats() }));
    metrics.devtools = (await cdp.send('Performance.getMetrics')).metrics;
    report.performance.push({ device: mobile ? 'mobile-390x844' : 'desktop-1440x900', run, network: mobile ? '1.6 Mbps down / 150 ms latency / CPU 4x' : 'unthrottled localhost', errors, firstLinks: first, ...metrics });
    assert.deepEqual(errors, []);
    if (run === 1) await page.screenshot({ path: `${output}/production-${mobile ? 'mobile' : 'desktop'}.png` });
    console.log(`PERF ${mobile ? 'mobile' : 'desktop'} #${run} LCP=${metrics.lcp.toFixed(0)}ms scene=${metrics.marks.find(m=>m.name==='mima:scene-ready')?.start.toFixed(0)}ms`);
    await ctx.close();
  }
  const ctx = await context(); const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await ready(page); await page.waitForTimeout(3000);
  await check('Theme controls update scene lighting, DOM and persisted preference', async () => {
    await page.locator('#theme').click(); await page.waitForFunction(() => window.mima.stats().theme === 'night');
    await page.waitForTimeout(1400); await page.screenshot({ path: `${output}/production-night.png` });
    await page.reload(); await ready(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'night');
    await page.keyboard.press('d'); await page.waitForFunction(() => window.mima.stats().theme === 'day');
  });
  await check('Replay and Escape skip preserve unobstructed external navigation', async () => {
    await page.locator('#replay').click(); assert.equal(await page.locator('#auth').isVisible(), true);
    assert.ok(await page.locator('nav a').first().evaluate(a => { const r=a.getBoundingClientRect(); return a.contains(document.elementFromPoint(r.x+5,r.y+20)); }));
    await page.waitForTimeout(500); await page.screenshot({ path: `${output}/intro.png` });
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#auth').isVisible(), false);
  });
  await check('Keyboard and link hover select matching native 3D archive lanes', async () => {
    await page.locator('[data-select="0"]').click(); await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => window.mima.selectedId === 'portal-minecraft');
    await page.locator('[data-link="2"]').hover(); await page.waitForFunction(() => window.mima.stats().selectedAlbumId === 'portal-stronghold');
    for (const key of ['ArrowLeft','ArrowRight','ArrowLeft','ArrowLeft','ArrowRight']) await page.keyboard.press(key);
    assert.ok(await page.evaluate(() => window.mima.stats().cameraPosition.every(Number.isFinite)));
  });
  await check('Extraction and return use original camera and lift transition', async () => {
    await page.locator('#extract').click(); await page.waitForFunction(() => window.mima.stats().cameraDetail > .99 && window.mima.stats().extraction > 3.4);
    await page.waitForTimeout(500); await page.screenshot({ path: `${output}/extracted.png` });
    const before = await page.evaluate(() => window.mima.selected);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(before => window.mima.selected !== before && window.mima.stats().returningFiles === 0 && window.mima.stats().extraction > 3.4, before);
    await page.keyboard.press('Escape'); await page.waitForFunction(() => window.mima.stats().cameraDetail < .01 && !window.mima.extracted);
  });
  await check('Full 5.2-second native camera replay reaches a continuous browsing endpoint', async () => {
    await page.keyboard.press('r');
    await page.waitForFunction(() => window.mima.stats().selectionLight.ribbon.opening);
    await page.waitForFunction(() => window.mima.stats().musicArchiveReady && !window.mima.stats().selectionLight.ribbon.opening, null, { timeout: 15000 });
    assert.ok(await page.evaluate(() => window.mima.stats().cameraPosition.every(Number.isFinite)));
  });
  await check('Context loss keeps poster + links and supports a clean retry', async () => {
    await page.evaluate(() => document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => document.documentElement.dataset.scene === 'fallback');
    await page.screenshot({ path: `${output}/fallback.png` });
    await page.locator('#retry').click(); await ready(page);
    assert.equal(await page.locator('#scene canvas').count(), 1);
  });
  assert.deepEqual(errors, []); await ctx.close();
  await check('Touch swipe changes archive without touching the link strip', async () => {
    const ctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await page.goto(base); await ready(page); await page.waitForTimeout(3000);
    const before=await page.evaluate(()=>window.mima.selectedId);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 350 }] });
    for (const x of [260, 200, 140, 80]) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 350 }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(id => window.mima.selectedId !== id,before);
    await page.keyboard.press('n'); await page.waitForTimeout(1500); await page.screenshot({ path: `${output}/production-night-mobile.png` });
    await ctx.close();
  });
  await check('Reduced motion suppresses intro, parallax, idle animation and recurring RAF', async () => {
    const ctx=await context({ reducedMotion: 'reduce' }); const page=await ctx.newPage(); await page.goto(base); await ready(page); await page.waitForTimeout(1500);
    assert.equal(await page.locator('#auth').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.mima.stats().animationScheduled),false);
    await page.locator('#replay').click(); assert.equal(await page.locator('#auth').isVisible(),false);
    await page.locator('[data-select="0"]').click();await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(()=>window.mima.stats().selectedAlbumId),'portal-minecraft');
    assert.equal(await page.evaluate(()=>window.mima.stats().animationScheduled),false);
    await ctx.close();
  });
  for (const mode of ['no-javascript','module-failure','model-failure','no-webgl','save-data']) await check(`Complete static fallback: ${mode}`, async () => {
    const ctx = await context(mode==='no-javascript'?{javaScriptEnabled:false}:{}); const page=await ctx.newPage();
    if (mode==='module-failure') await page.route(/\/assets\/scene-[^/]+\.js$/,route=>route.abort());
    if (mode==='model-failure') await page.route(/\.glb(?:\?|$)/,route=>route.fulfill({status:503,body:'unavailable'}));
    if (mode==='no-webgl') await page.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'||type==='webgl')return null;return native.call(this,type,...args)}});
    if (mode==='save-data') await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
    await page.goto(base); if(mode!=='no-javascript') await page.waitForFunction(()=>document.documentElement.dataset.scene==='fallback');
    const img=page.locator('#preview img'); await img.evaluate(img=>img.decode());
    assert.equal(await page.locator('nav a').count(),3);
    assert.ok(await page.locator('nav a').evaluateAll(links=>links.every(a=>{const r=a.getBoundingClientRect();return a.contains(document.elementFromPoint(r.x+5,r.y+20))})));
    await page.screenshot({path:`${output}/${mode}.png`}); await ctx.close();
  });
  if (process.env.BASELINE_URL) {
    const ctx=await context();const page=await ctx.newPage();await instrument(page);
    const cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await page.goto(process.env.BASELINE_URL);await page.waitForFunction(()=>document.querySelector('#stage.theme-motion-ready'),null,{timeout:60000});await page.waitForTimeout(3500);
    report.baseline=await page.evaluate(()=>({...window.__metrics,paints:performance.getEntriesByType('paint').map(e=>({name:e.name,start:e.startTime})),resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),start:e.startTime,end:e.responseEnd,transfer:e.transferSize,encoded:e.encodedBodySize,decoded:e.decodedBodySize})),preparation:document.querySelector('#three-scene')?.dataset.startupPreparation,stats:window.rhineMusic?.stats()}));
    await page.screenshot({path:`${output}/v3-baseline.png`});await ctx.close();
  }
} finally {
  await writeFile(`${output}/results.json`,JSON.stringify(report,null,2)+'\n');await browser.close();
}
