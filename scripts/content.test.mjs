import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,cp,readFile,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadProject,compileProject,atomicJson,ContentError } from './content/project.mjs';
import { recordsSchema,validate } from './content/schema.mjs';
async function fixture(fn){const root=await mkdtemp(path.join(tmpdir(),'mima-content-'));try{for(const dir of ['content','generated','public'])await cp(dir,path.join(root,dir),{recursive:true});await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
const read=async(root,file)=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const friend={id:'test-friend',type:'friend',title:'新增友链',url:'https://example.org/',published:true,order:20};
test('Verified examples share the production schema',async()=>{assert.deepEqual(validate(JSON.parse(await readFile('content/examples/records.json','utf8')),recordsSchema),[]);});
test('A maintainer adds, edits, sorts and hides content without touching renderer code',()=>fixture(async root=>{
 const file='content/records/friends.json';const doc=await read(root,file);doc.items.push({...friend},{...friend,id:'first-friend',title:'置顶友链',pinned:true,order:100});await atomicJson(root,file,doc);
 let compiled=await compileProject(await loadProject(root));let visible=JSON.parse(compiled.outputs['data/modules/friends.json']).items;
 assert.equal(visible[0].id,'first-friend');assert.equal(visible.find(x=>x.id==='test-friend').title,'新增友链');
 doc.items[0].url='https://example.org/changed';await atomicJson(root,file,doc);
 compiled=await compileProject(await loadProject(root));assert.match(compiled.outputs['data/modules/friends.json'],/example.org\/changed/);
 doc.items[0].published=false;await atomicJson(root,file,doc);compiled=await compileProject(await loadProject(root));assert.ok(!compiled.manifest.items.some(x=>x.id==='test-friend'));
}));
test('Manual override and permanent deletion survive repeated automatic cache updates',()=>fixture(async root=>{
 const cache={schemaVersion:1,source:'test-auto',items:[friend]};await atomicJson(root,'generated/friends.json',cache);
 await atomicJson(root,'content/overrides.json',{schemaVersion:1,items:[{id:friend.id,patch:{title:'人工确认',url:'https://example.org/manual',featured:true}}]});
 cache.items[0]={...friend,title:'自动新名称',url:'https://example.org/automatic'};await atomicJson(root,'generated/friends.json',cache);
 let p=await loadProject(root),item=p.records.find(x=>x.id===friend.id);assert.equal(item.title,'人工确认');assert.equal(item.url,'https://example.org/manual');
 await atomicJson(root,'content/tombstones.json',{schemaVersion:1,ids:[friend.id]});cache.items[0].title='再次同步';await atomicJson(root,'generated/friends.json',cache);
 p=await loadProject(root);assert.ok(!p.records.some(x=>x.id===friend.id));
}));
test('Private records, bodies and private relations never enter static public JSON',()=>fixture(async root=>{
 const file='content/records/characters.json',doc=await read(root,file);doc.items[1].published=false;doc.items[0].relations=[{targetId:doc.items[2].id,label:'私密关系',public:false}];await atomicJson(root,file,doc);
 const result=await compileProject(await loadProject(root));assert.ok(!result.manifest.items.some(x=>x.id===doc.items[1].id));assert.ok(!result.outputs[`data/bodies/${doc.items[1].id}.json`]);assert.ok(!result.outputs['data/modules/characters.json'].includes('私密关系'));
}));
test('Invalid IDs, field names, URLs and bodies report precise source locations',()=>fixture(async root=>{
 const file='content/records/friends.json';await atomicJson(root,file,{schemaVersion:1,items:[{...friend,url:'javascript:alert(1)',bodyFile:'../../outside.md',publshed:true},friend]});
 await assert.rejects(()=>loadProject(root),error=>error instanceof ContentError&&/friends.json.items\[0\].url/.test(error.message)&&/publshed/.test(error.message));
 await atomicJson(root,file,{schemaVersion:1,items:[{...friend},{...friend}]});await assert.rejects(()=>loadProject(root),/重复 ID/);
}));
test('Missing image has a real local placeholder and API failures retain the last cached content',()=>fixture(async root=>{
 await atomicJson(root,'generated/friends.json',{schemaVersion:1,source:'test-auto',lastSuccessfulAt:'2026-10-25T00:00:00Z',lastAttemptAt:'2026-10-26T00:00:00Z',error:'upstream unreachable',items:[{...friend,image:'/media/missing.webp'}]});
 const result=await compileProject(await loadProject(root));assert.equal(result.manifest.items.find(x=>x.id===friend.id).image,'/assets/placeholder.svg');
 assert.equal(result.manifest.status.find(x=>x.source==='test-auto').lastSuccessfulAt,'2026-10-25T00:00:00Z');
}));
test('Adding a fourth OC and disabling a module require only content JSON and Markdown',()=>fixture(async root=>{
 const file='content/records/characters.json',doc=await read(root,file);doc.items.push({id:'fourth-oc',type:'character',title:'第四位测试人物',order:0,bodyFile:'characters/fourth.md'});await writeFile(path.join(root,'content/characters/fourth.md'),'# 第四位\n\n可维护设定。');await atomicJson(root,file,doc);
 let p=await loadProject(root),result=await compileProject(p);assert.equal(result.manifest.items.find(x=>x.id==='fourth-oc').title,'第四位测试人物');
 const site=await read(root,'content/site.json');site.modules.characters.enabled=false;await atomicJson(root,'content/site.json',site);result=await compileProject(await loadProject(root));assert.ok(!result.manifest.items.some(x=>x.module==='characters'));
}));
test('Git restores an accidental content edit in an isolated maintainer repository',()=>fixture(async root=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const run=promisify(execFile);
 const git=(...args)=>run('git',args,{cwd:root,env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}});
 await git('init','-q');await git('config','user.name','Mima content acceptance');await git('config','user.email','acceptance@example.invalid');
 await git('add','content/records/friends.json');await git('commit','-q','-m','Content recovery fixture');
 const before=await readFile(path.join(root,'content/records/friends.json'),'utf8');await writeFile(path.join(root,'content/records/friends.json'),'accidental invalid content');
 await git('restore','--','content/records/friends.json');assert.equal(await readFile(path.join(root,'content/records/friends.json'),'utf8'),before);
}));
