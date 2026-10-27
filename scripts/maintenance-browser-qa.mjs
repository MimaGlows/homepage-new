import {createRequire}from'node:module';
import {mkdtemp,cp,symlink,readFile,writeFile,rm}from'node:fs/promises';
import path from'node:path';import{tmpdir}from'node:os';import{spawn}from'node:child_process';import assert from'node:assert/strict';
import{atomicJson,loadProject,compileProject}from'./content/project.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await mkdtemp(path.join(tmpdir(),'mima-maintainer-'));let server,browser;const results=[];
const read=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const url='http://127.0.0.1:5176/';
try{
 for(const f of ['content','generated','public','src','scripts','index.html','vite.config.ts','package.json','tsconfig.json'])await cp(f,path.join(root,f),{recursive:true});
 await symlink(path.resolve('node_modules'),path.join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5176','--strictPort'],{cwd:root,stdio:'pipe'});
 let log='';server.stderr.on('data',b=>log+=b);for(let i=0;i<100;i++){if(await fetch(url).then(r=>r.ok).catch(()=>false))break;await new Promise(r=>setTimeout(r,100));if(i===99)throw new Error(log||'Preview did not start');}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 async function edit(file,value){const origin=await page.evaluate(()=>performance.timeOrigin);await atomicJson(root,file,value);await page.waitForFunction(origin=>performance.timeOrigin!==origin,origin,{timeout:15000});await page.waitForLoadState('domcontentloaded');}
 async function openModule(label){if(!await page.locator('#archive-browser').isVisible())await page.locator('#browse').click();await page.getByRole('button',{name:label,exact:true}).click();}
 const file='content/records/friends.json',friends=await read(file);friends.items.push({id:'maintenance-friend',type:'friend',title:'人工维护验收友链',url:'https://example.org/first',description:'无需修改 TypeScript',image:'/assets/placeholder.svg'});
 await edit(file,friends);await openModule('友链');await page.getByRole('button',{name:/人工维护验收友链/}).click();assert.equal(await page.getByRole('link',{name:'打开来源 ↗'}).getAttribute('href'),'https://example.org/first');results.push('新增友链→文件保存→自动刷新→实际网页出现');
 friends.items[0].url='https://example.org/edited';await edit(file,friends);await openModule('友链');await page.getByRole('button',{name:/人工维护验收友链/}).click();assert.equal(await page.getByRole('link',{name:'打开来源 ↗'}).getAttribute('href'),'https://example.org/edited');results.push('修改既有友链网址并确认真实 anchor 生效');
 await atomicJson(root,'generated/friends.json',{schemaVersion:1,source:'fixture',items:[{...friends.items[0],title:'自动再次同步'}]});
 const origin=await page.evaluate(()=>performance.timeOrigin);await atomicJson(root,'content/tombstones.json',{schemaVersion:1,ids:['maintenance-friend']});await page.waitForFunction(o=>performance.timeOrigin!==o,origin);await page.waitForTimeout(250);await page.reload();
 assert.ok(!(await compileProject(await loadProject(root))).manifest.items.some(x=>x.id==='maintenance-friend'));await page.locator('#browse').click();await page.getByRole('button',{name:'友链',exact:true}).click();assert.equal(await page.locator('[data-archive-id=maintenance-friend]').count(),0);results.push('永久隐藏友链后重复写入自动缓存仍不恢复');
 const chars=await read('content/records/characters.json');chars.items[0].description='经本人修改的人物简介';chars.items[0].image='/assets/cover-blog.webp';
 chars.items.push({id:'fourth-acceptance-oc',type:'character',title:'第四位测试 OC',order:0,bodyFile:'characters/fourth.md'});await writeFile(path.join(root,'content/characters/fourth.md'),'# 新增人物\n\n仅数据和 Markdown。');await edit('content/records/characters.json',chars);
 await openModule('人物');const cards=page.locator('.archive-card');assert.match(await cards.first().textContent(),/第四位测试 OC/);await page.getByRole('button',{name:/七风 经本人修改的人物简介/}).click();assert.match(await page.locator('.archive-detail>img').getAttribute('src'),/cover-blog.webp/);results.push('修改 OC 简介与图片；新增第四位并排序，无渲染代码改动');
 await page.getByRole('button',{name:'← 返回列表',exact:true}).click();const focusOrder=await page.locator('.archive-card').evaluateAll(cards=>cards.map(x=>x.dataset.archiveId));await page.locator('[data-mode=archive]').click();await openModule('人物');await page.locator('.archive-card').first().waitFor();assert.deepEqual(await page.locator('.archive-card').evaluateAll(cards=>cards.map(x=>x.dataset.archiveId)),focusOrder);await page.locator('[data-mode=focus]').click();results.push('修改 OC 排序后，FOCUS 与 ARCHIVE 的人物列表顺序一致');
 const site=await read('content/site.json');site.name='维护验收姓名';site.navigation.find(x=>x.id==='minecraft').url='https://example.org/minecraft';site.defaults.theme='night';site.defaults.intro=false;site.modules.social.enabled=false;for(const m of Object.values(site.modules))m.syncEnabled=false;
 await edit('content/site.json',site);assert.equal(await page.locator('#replay').textContent(),'维护验收姓名');assert.equal(await page.locator('a[data-nav-id="minecraft"]').getAttribute('href'),'https://example.org/minecraft');assert.equal(await page.locator('.registration').getAttribute('href'),'https://beian.miit.gov.cn/');assert.equal(await page.locator('html').getAttribute('data-theme'),'night');results.push('集中修改姓名、导航、主题、动画和模块；全部同步关闭仍工作');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok(await page.locator('.registration').isVisible());assert.ok(await page.locator('.registration').evaluate(a=>{const r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}));results.push('手机底部备案和导航可见');
 assert.deepEqual(errors,[]);await page.screenshot({path:'docs/qa/phase1-maintenance-mobile.png'});
 console.log(JSON.stringify({passed:true,results},null,2));await writeFile('docs/qa/phase1-maintenance.json',JSON.stringify({date:new Date().toISOString(),passed:true,results},null,2)+'\n');
}finally{await browser?.close();server?.kill('SIGTERM');await rm(root,{recursive:true,force:true});}
