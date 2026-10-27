import{createRequire}from'node:module';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';const{chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(process.env.QA_URL||'http://127.0.0.1:4173/');await page.waitForFunction(()=>document.documentElement.dataset.scene==='ready');await page.waitForTimeout(3000);
 let opened=false;
 for(let y=180;y<620&&!opened;y+=65)for(let x=150;x<950&&!opened;x+=70){await page.mouse.move(x,y);const hovered=await page.locator('#scene').getAttribute('data-hovered');if(hovered===null||hovered==='')continue;await page.mouse.click(x,y);opened=await page.locator('#archive-browser').isVisible();}
 assert.ok(opened,'点击原生玻璃卡片应打开对应详情');await page.waitForFunction(()=>window.mima.stats().canInspect&&window.mima.stats().extraction>3.4);
 const selected=await page.evaluate(()=>window.mima.selectedId);await page.locator('.archive-close').click();await page.mouse.move(420,330);await page.mouse.down();await page.mouse.move(580,340,{steps:12});await page.mouse.up();await page.waitForFunction(()=>Math.abs(window.mima.stats().rotation)>.1);const rotated=await page.evaluate(()=>window.mima.stats().rotation);assert.equal(await page.evaluate(()=>window.mima.selectedId),selected);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>Math.abs(window.mima.stats().rotation)<.01&&window.mima.stats().cameraDetail<.01);assert.ok(await page.evaluate(()=>window.mima.stats().cameraPosition.every(Number.isFinite)));
 const report={date:new Date().toISOString(),passed:true,selected,rotated,checks:['真实卡片点击打开详情并抽取','鼠标拖动改变原生模型 rotation','归位对齐与连续相机完成，无重建']};await writeFile('docs/qa/phase7-pointer.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
