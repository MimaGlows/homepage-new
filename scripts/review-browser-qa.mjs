import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
const base=process.env.QA_URL||'http://127.0.0.1:4173/';
const checks=[],errors=[];
const waitReady=page=>page.waitForFunction(()=>document.documentElement.dataset.scene==='ready',null,{timeout:60000});
const level=async(page,value)=>{
 if(!await page.locator('#graphics-panel').isVisible())await page.locator('#graphics').click();
 await page.locator(`[data-quality=${value}]`).click();
 await page.waitForFunction(value=>window.mima.stats()?.qualityLevel===value,value);
 return page.evaluate(()=>({...window.mima.stats(),quality:JSON.parse(document.querySelector('#scene').dataset.renderQuality)}));
};
try{
 const page=await browser.newPage({viewport:{width:1214,height:801},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await waitReady(page);
 await page.evaluate(()=>{window.originalCanvas=document.querySelector('#scene canvas');});
 const initial=await page.evaluate(()=>window.mima.selectedId);
 let stats=await level(page,'low');assert.equal(stats.postprocessing.smaa,false);assert.equal(stats.particles.dust,0);assert.equal(stats.quality.shadows,1024);
 const lowWidth=stats.quality.width;
 stats=await level(page,'medium');assert.equal(stats.postprocessing.smaa,true);assert.equal(stats.quality.aoSamples,16);assert.equal(stats.particles.dust,43);
 stats=await level(page,'high');assert.equal(stats.postprocessing.smaa,true);assert.equal(stats.quality.shadows,4096);assert.equal(stats.quality.transmission,1);assert.ok(stats.quality.width>lowWidth);assert.equal(stats.particles.dust,96);
 await page.keyboard.press('Escape');await page.locator('#skip').click({timeout:500}).catch(()=>{});await page.keyboard.press('n');await page.waitForTimeout(1200);
 stats=await page.evaluate(()=>window.mima.stats());assert.equal(stats.particles.stars,140);assert.equal(stats.particles.dust,96);assert.equal(await page.evaluate(()=>window.originalCanvas===document.querySelector('#scene canvas')),true);assert.equal(await page.evaluate(()=>window.mima.selectedId),initial);
 checks.push({name:'低中高实际改变SMAA、分辨率、阴影、AO与粒子，保持相同canvas和选档',passed:true,high:stats.particles});
 await page.locator('#graphics').click();await page.screenshot({path:'docs/qa/review-quality-high.png'});await page.keyboard.press('Escape');
 await page.reload();await waitReady(page);assert.equal(await page.evaluate(()=>window.mima.stats().qualityLevel),'high');assert.equal(await page.evaluate(()=>window.mima.stats().qualityLocked),true);checks.push({name:'手动画质记忆，刷新后仍保持高档',passed:true});
 await level(page,'medium');await page.keyboard.press('Escape');await page.keyboard.press('d');await page.waitForTimeout(700);
 for(const viewport of [{width:1214,height:801},{width:893,height:801},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(300);
  assert.equal(await page.locator('.baseline').count(),0);
  const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return{footer:rect('.footer'),registration:rect('.registration'),links:[...document.querySelectorAll('.footer nav a')].map(a=>{const r=a.getBoundingClientRect();return {right:r.right,bottom:r.bottom,x:r.x,y:r.y};})};});
  assert.ok(viewport.height-layout.footer.bottom<=45,JSON.stringify(layout));assert.ok(layout.registration.x>viewport.width/2,JSON.stringify(layout));assert.ok(layout.registration.y>=layout.footer.bottom,JSON.stringify(layout));
  for(const a of layout.links)assert.ok(a.x>=0&&a.right<=viewport.width&&a.bottom<=viewport.height,JSON.stringify(layout));
  await page.locator('#browse').click();await page.locator('[data-archive-id]').first().waitFor();
  const panel=await page.locator('#archive-browser').boundingBox();assert.ok(panel.width>=Math.min(300,viewport.width-36));assert.ok(panel.width<=viewport.width);assert.ok(panel.height>100);assert.ok(panel.y+panel.height<=layout.footer.y);
  await page.locator('[data-module=characters]').click();await page.locator('[data-archive-id=nanakaze]').click();await page.locator('.archive-detail h3').first().waitFor();
  assert.ok(await page.locator('.archive-detail').isVisible());assert.equal(await page.locator('.archive-browser-content').isVisible(),false);
  assert.equal(await page.locator('#archive-browser').getAttribute('data-view'),'companion');assert.ok(await page.locator('.archive-read').isVisible());
  await page.locator('.archive-read').click();assert.equal(await page.locator('#archive-browser').getAttribute('data-view'),'reading');
  assert.ok(await page.locator('.archive-full>img').isVisible());await page.locator('.archive-full>img').evaluate(img=>img.decode());
  await page.screenshot({path:`docs/qa/review-layout-${viewport.width}.png`});
  await page.locator('.archive-back').click();assert.equal(await page.locator('#archive-browser').getAttribute('data-view'),'companion');
  await page.locator('.archive-back').click();assert.ok(await page.locator('[data-archive-id=nanakaze]').isVisible());await page.locator('.archive-close').click();
  checks.push({name:`${viewport.width}×${viewport.height} 底部导航、右下备案、摘要及阅读返回`,passed:true,layout,panel});
 }
 await page.close();
 const reduced=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await reduced.goto(base);await waitReady(reduced);await level(reduced,'high');await reduced.keyboard.press('Escape');assert.equal(await reduced.evaluate(()=>window.mima.stats().reduced),true);await reduced.waitForTimeout(1600);assert.equal(await reduced.evaluate(()=>window.mima.stats().animationScheduled),false);checks.push({name:'手机仍可手动高档，减少动态效果继续停止常驻RAF',passed:true});await reduced.close();
 const staticPage=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});await staticPage.goto(base);assert.equal(await staticPage.locator('.footer nav a').count(),3);assert.equal(await staticPage.locator('.baseline').count(),0);assert.ok(await staticPage.locator('.registration').isVisible());checks.push({name:'无JS仍有完整底部导航和右下备案',passed:true});await staticPage.close();
 assert.deepEqual(errors,[]);
 const report={date:new Date().toISOString(),browser:browser.version(),base,passed:true,checks,errors};await writeFile('docs/qa/review-feedback.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
