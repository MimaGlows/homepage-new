import {createRequire}from'node:module';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});const results=[];
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>document.documentElement.dataset.scene==='ready');await page.waitForTimeout(3000);
 assert.equal(await page.evaluate(()=>window.mima.mode),'focus');
 await page.evaluate(()=>{window.__canvas=document.querySelector('#scene canvas');window.__context=window.__canvas.getContext('webgl2')});
 const selected=await page.evaluate(()=>window.mima.selectedId),before=await page.evaluate(()=>window.mima.stats().covers.uploadedBytes);
 await page.locator('[data-mode=archive]').click();await page.waitForTimeout(2300);assert.equal(await page.evaluate(()=>window.mima.selectedId),selected);assert.equal(await page.evaluate(()=>window.__canvas===document.querySelector('#scene canvas')&&window.__context===window.__canvas.getContext('webgl2')),true);
 assert.ok(await page.evaluate(()=>window.mima.stats().visibleArchiveIds.includes('lin-aliangliang')));await page.screenshot({path:'docs/qa/archive-mode-desktop.png'});
 await page.locator('[data-mode=focus]').click();await page.waitForTimeout(2300);assert.equal(await page.evaluate(()=>window.mima.selectedId),selected);assert.equal(await page.evaluate(()=>window.mima.stats().covers.uploadedBytes),before);assert.equal(await page.locator('#scene canvas').count(),1);results.push('FOCUS/ARCHIVE 保持稳定 ID、相同 renderer/context 和纹理缓存');
 await page.screenshot({path:'docs/qa/focus-mode-desktop.png'});await page.locator('[data-mode=archive]').click();await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.scene==='ready');assert.equal(await page.evaluate(()=>window.mima.mode),'archive');results.push('模式偏好在刷新后保留');
 const base=process.env.QA_URL||'http://127.0.0.1:5173/';await page.goto(`${base}?mode=focus`);await page.waitForFunction(()=>document.documentElement.dataset.scene==='ready');assert.equal(await page.evaluate(()=>window.mima.mode),'focus');results.push('URL 参数优先于已存偏好');
 await page.locator('#browse').click();await page.getByRole('button',{name:'人物',exact:true}).click();await page.getByRole('button',{name:/林阿良良/}).click();await page.waitForFunction(()=>window.mima.selectedId==='lin-aliangliang');assert.ok(await page.locator('.archive-detail').isVisible());results.push('非首页精选人物仍可在允许模式中主动浏览，详情与三维同 ID');
 await page.locator('.archive-close').click();await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);await page.locator('[data-mode=archive]').click();await page.waitForTimeout(2300);assert.equal(await page.locator('#scene canvas').count(),1);assert.ok(await page.locator('.registration').isVisible());await page.screenshot({path:'docs/qa/archive-mode-mobile.png'});results.push('手机模式切换与固定备案可访问');
 assert.deepEqual(errors,[]);await writeFile('docs/qa/phase2-modes.json',JSON.stringify({date:new Date().toISOString(),passed:true,results},null,2)+'\n');console.log(JSON.stringify({passed:true,results},null,2));await ctx.close();
}finally{await browser.close();}
