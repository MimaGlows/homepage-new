import {createRequire}from'node:module';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>document.documentElement.dataset.scene==='ready');await page.waitForTimeout(1000);
 assert.ok(!requests.some(x=>/data\/modules\/(friends|blog)/.test(x)));
 await page.locator('#browse').click();await page.getByRole('button',{name:'人物',exact:true}).click();await page.locator('[data-archive-id=nanakaze]').click();await page.getByRole('heading',{name:/形象/,exact:true}).waitFor();
 assert.match(await page.locator('.archive-credit').innerText(),/虫子Neurax/);assert.equal(await page.locator('.archive-detail>img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.screenshot({path:'docs/qa/phase3-character-desktop.png'});
 await page.locator('.archive-relation').click();await page.waitForFunction(()=>window.mima.selectedId==='lin-aliangliang');
 await page.getByRole('button',{name:'友链',exact:true}).click();await page.locator('.archive-card').first().waitFor();assert.equal(await page.locator('.archive-card').count(),3);await page.locator('.archive-card').first().click();assert.match(await page.locator('.archive-detail a').first().getAttribute('href'),/^https:/);
 await page.getByRole('button',{name:'文献',exact:true}).click();await page.locator('.archive-card').first().waitFor();assert.ok(await page.locator('.archive-card').count()>0);await page.getByRole('button',{name:'朝花夕拾',exact:true}).click();await page.getByRole('button',{name:'全部',exact:true}).click();await page.locator('.archive-card').first().click();assert.ok(await page.locator('.archive-meta').isVisible());
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/qa/phase3-blog-mobile.png'});assert.ok(await page.locator('.registration').isVisible());
 assert.deepEqual(errors,[]);assert.ok(requests.every(url=>new URL(url).hostname==='127.0.0.1'));
 const report={date:new Date().toISOString(),passed:true,checks:['仅当前浏览模块加载数据','真实七风设计稿与绘者署名','安全 Markdown 标题排版','人物关系同步三维 ID','真实三个友链与外链','RSS 文章日期/筛选','手机备案','公开展示无第三方网络请求'],requests:requests.filter(x=>x.includes('/data/'))};await writeFile('docs/qa/phase3-content.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
