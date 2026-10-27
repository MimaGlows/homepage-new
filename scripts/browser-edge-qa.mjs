import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
const base = process.env.QA_URL || 'http://127.0.0.1:4173/';
const results = [];
const ready = page => page.waitForFunction(() => document.documentElement.dataset.scene === 'ready',null,{timeout:30000});
async function test(name, fn) { await fn();results.push({name,passed:true});console.log(`PASS ${name}`); }
try {
 await test('Subpath static hosting loads all relative chunks, previews and GLB',async()=>{
  const page=await browser.newPage();const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
  await page.goto(process.env.SUBPATH_URL || 'http://127.0.0.1:4175/rhine/');await ready(page);
  assert.deepEqual(failed,[]);assert.equal(await page.locator('#scene canvas').count(),1);await page.close();
 });
 await test('Failed dynamic module can be retried after network recovery',async()=>{
  const page=await browser.newPage();await page.route(/\/assets\/scene-.*\.js$/,r=>r.abort());
  await page.goto(base);await page.waitForFunction(()=>document.documentElement.dataset.scene==='fallback');
  await page.unrouteAll();await page.locator('#retry').click();await ready(page);await page.close();
 });
 await test('20-second timeout rejects a stalled model, ignores its late result, and retries cleanly',async()=>{
  const page=await browser.newPage();let pending;
  await page.route(/\.glb(?:\?|$)/,route=>{pending=route});
  await page.goto(base);await page.waitForFunction(()=>document.documentElement.dataset.scene==='fallback',null,{timeout:25000});
  assert.equal(await page.locator('#scene canvas').count(),0);
  if(pending)await pending.fulfill({status:200,contentType:'model/gltf-binary',body:await readFile('public/assets/music-case-v043.glb')});
  await page.waitForTimeout(300);await page.unrouteAll();assert.equal(await page.locator('#scene canvas').count(),0);
  await page.locator('#retry').click();await ready(page);assert.equal(await page.locator('#scene canvas').count(),1);await page.close();
 });
 await test('Resize desktop → portrait → landscape preserves accessible links and finite camera',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base);await ready(page);
  for(const size of [{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(size);await page.waitForTimeout(1800);
   assert.ok(await page.locator('nav a').evaluateAll(links=>links.every(a=>{const r=a.getBoundingClientRect();return r.height>=44&&r.right<=innerWidth&&r.bottom<=innerHeight&&a.contains(document.elementFromPoint(r.x+5,r.y+20))})));
   assert.ok(await page.evaluate(()=>window.mima.stats().cameraPosition.every(Number.isFinite)));
  }
  await page.close();
 });
 await test('Physical card hover raycasts select a different native archive lane',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base);await ready(page);await page.waitForTimeout(3000);
  let found=false;
  for(let y=180;y<600&&!found;y+=90)for(let x=200;x<1250&&!found;x+=100){
   await page.mouse.move(x,y);const index=await page.locator('#scene').getAttribute('data-hovered');
   if(index==='1'||index==='2'){await page.waitForFunction(i=>window.mima.selected===i,Number(index));found=true;}
  }
  assert.ok(found);await page.close();
 });
 await test('Changing reduced-motion during playback cancels the intro and reaches static browsing',async()=>{
  const page=await browser.newPage();await page.goto(base);await ready(page);await page.waitForTimeout(3000);await page.keyboard.press('r');await page.waitForTimeout(300);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1500);
  assert.equal(await page.locator('#auth').isVisible(),false);assert.equal(await page.evaluate(()=>window.mima.stats().animationScheduled),false);await page.close();
 });
}finally{await writeFile('docs/qa/edge-results.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),results},null,2)+'\n');await browser.close()}
