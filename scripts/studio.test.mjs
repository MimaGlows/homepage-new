import test from'node:test';import assert from'node:assert/strict';import{mkdtemp,cp,rm,readFile}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';
import{startStudio}from'./studio/server.mjs';import{loadProject}from'./content/project.mjs';
test('Local Studio writes validated real files, prevents cross-origin writes, detects conflicts and restores backups',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'mima-studio-'));let studio;
 try{
  for(const dir of ['content','generated','public'])await cp(dir,path.join(root,dir),{recursive:true});
  studio=await startStudio(root,{port:4329,preview:false});const base=studio.url;
  const state=await(await fetch(base+'/api/state')).json();assert.ok(state.token);assert.ok(state.files['content/site.json']);
  const request=(path,data,headers={})=>fetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json','x-studio-token':state.token,...headers},body:JSON.stringify(data)});
  const site=JSON.parse(state.files['content/site.json']);site.name='Studio real save';
  const changes={'content/site.json':JSON.stringify(site)};
  assert.equal((await request('/api/save',{changes,revision:state.revision},{origin:'https://hostile.example'})).status,403);
  assert.equal((await request('/api/save',{changes,revision:state.revision},{'x-studio-token':'wrong'})).status,403);
  assert.equal((await request('/api/save',{changes:{'../outside':'x'},revision:state.revision})).status,400);
  const invalid=structuredClone(site);invalid.navigation[0].url='javascript:bad()';assert.equal((await request('/api/save',{changes:{'content/site.json':JSON.stringify(invalid)},revision:state.revision})).status,400);
  assert.equal(JSON.parse(await readFile(path.join(root,'content/site.json'))).name,'MimaGlows');
  const response=await request('/api/save',{changes,revision:state.revision});assert.equal(response.status,200);const saved=await response.json();assert.equal((await loadProject(root)).site.name,'Studio real save');
  assert.equal((await request('/api/save',{changes,revision:state.revision})).status,409);
  const restored=await request('/api/restore',{id:saved.backupId,revision:saved.revision});assert.equal(restored.status,200);assert.equal((await loadProject(root)).site.name,'MimaGlows');
  const current=await(await fetch(base+'/api/state')).json();assert.equal(current.backups.length,2);
  const doc=JSON.parse(current.files['content/records/characters.json']);doc.items.push({id:'studio-fourth',type:'character',title:'Studio第四位',bodyFile:'characters/studio-fourth.md'});
  assert.equal((await request('/api/save',{changes:{'content/records/characters.json':JSON.stringify(doc),'content/characters/studio-fourth.md':'# 真正写入 Markdown'},revision:current.revision})).status,200);
  assert.match(await readFile(path.join(root,'content/characters/studio-fourth.md'),'utf8'),/真正写入/);
  let next=await(await fetch(base+'/api/state')).json();assert.equal((await request('/api/save',{changes:{'content/tombstones.json':JSON.stringify({schemaVersion:1,ids:['studio-fourth']})},revision:next.revision})).status,200);
  next=await(await fetch(base+'/api/state')).json();assert.equal(next.records.find(x=>x.id==='studio-fourth')._deleted,true);
  assert.equal((await request('/api/save',{changes:{'content/tombstones.json':JSON.stringify({schemaVersion:1,ids:[]})},revision:next.revision})).status,200);next=await(await fetch(base+'/api/state')).json();assert.ok(!next.records.find(x=>x.id==='studio-fourth')._deleted);
 }finally{await studio?.close();await rm(root,{recursive:true,force:true});}
});
