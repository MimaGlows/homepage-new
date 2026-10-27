import{mkdtemp,cp,rm,writeFile}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import assert from'node:assert/strict';import{syncProject}from'./sync/run.mjs';import{loadProject,compileProject,readJson,atomicJson}from'./content/project.mjs';
const root=await mkdtemp(path.join(tmpdir(),'mima-real-source-'));try{
 for(const dir of ['content','generated','public'])await cp(dir,path.join(root,dir),{recursive:true});
 const original=await readJson(root,'generated/friends-page.json');assert.ok(original.items.length>=2);const hidden=original.items[0].id,edited=original.items[1].id;
 await atomicJson(root,'content/tombstones.json',{schemaVersion:1,ids:[hidden]});await atomicJson(root,'content/overrides.json',{schemaVersion:1,items:[{id:edited,patch:{url:'https://example.org/maintainer-confirmed',description:'本地验收覆盖，不进入正式内容'}}]});
 const result=await syncProject(root,{sourceId:'friends-page',force:true});assert.equal(result[0].status,'updated');const project=await loadProject(root),compiled=await compileProject(project);
 assert.ok(!compiled.manifest.items.some(x=>x.id===hidden));assert.equal(project.records.find(x=>x.id===edited).url,'https://example.org/maintainer-confirmed');
 const site=await readJson(root,'content/site.json');for(const module of Object.values(site.modules))module.syncEnabled=false;await atomicJson(root,'content/site.json',site);const disabled=await syncProject(root,{force:true});assert.ok(disabled.every(x=>x.status==='disabled'));
 const cached=await compileProject(await loadProject(root));assert.deepEqual(cached.manifest.items,compiled.manifest.items);
 const report={date:new Date().toISOString(),passed:true,source:'https://mimaglows.com/about-2/',result,checks:['隔离副本隐藏一位真实友链后成功重抓实际公开来源，未恢复','另一个真实友链的人工网址覆盖仍有效','全部第三方同步关闭后缓存和人工内容保持','验收更改未写入主项目内容']};await writeFile('docs/qa/phase7-real-source-maintenance.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await rm(root,{recursive:true,force:true});}
