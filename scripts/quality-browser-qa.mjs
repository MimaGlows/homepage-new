import{createRequire}from'node:module';import{writeFile}from'node:fs/promises';import assert from'node:assert/strict';const{chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});const checks=[];
try{
 for(const type of ['hardware','slow-frames','visitor-high']){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(type=>{
   Object.defineProperty(navigator,'hardwareConcurrency',{value:type==='hardware'?2:16,configurable:true});Object.defineProperty(navigator,'deviceMemory',{value:type==='hardware'?2:8,configurable:true});
   if(type==='visitor-high')localStorage.setItem('mima-quality','high');
   if(type!=='hardware'){let simulated=performance.now(),elapsed=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(()=>{simulated+=70;elapsed+=70;window.__qaElapsed=elapsed;callback(simulated);});}
  },type);
  await page.goto(process.env.QA_URL||'http://127.0.0.1:4173/');await page.waitForFunction(()=>document.documentElement.dataset.scene==='ready');
  if(type==='visitor-high'){
   await page.waitForFunction(()=>window.__qaElapsed>16000);const stats=await page.evaluate(()=>({...window.mima.stats(),quality:JSON.parse(document.querySelector('#scene').dataset.renderQuality)}));
   assert.equal(stats.qualityLevel,'high');assert.equal(stats.qualityReason,'visitor');assert.equal(stats.postprocessing.smaa,true);assert.equal(stats.quality.shadows,4096);checks.push({type,reason:stats.qualityReason,quality:stats.quality});await page.close();continue;
  }
  await page.waitForFunction(()=>window.mima.stats().qualityTier==='performance');const stats=await page.evaluate(()=>({...window.mima.stats(),quality:JSON.parse(document.querySelector('#scene').dataset.renderQuality)}));
  assert.equal(stats.mobile,false);assert.equal(stats.qualityReason,type==='hardware'?'hardware':'sustained-frame-time');assert.equal(stats.quality.aoSamples,0);assert.equal(stats.quality.shadows,1024);assert.equal(await page.locator('#scene canvas').count(),1);checks.push({type,reason:stats.qualityReason,quality:stats.quality});await page.close();
 }
 const report={date:new Date().toISOString(),passed:true,conditions:'Desktop viewport; injected 2-core/2GiB hints, then separate 70ms RAF timestamp simulations with default and visitor-selected high quality. Verifies automatic downgrade, manual choice retention and actual renderer settings, not real low-end GPU performance.',checks};await writeFile('docs/qa/phase7-adaptive-quality.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
