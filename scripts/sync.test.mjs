import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile}from 'node:fs/promises';import {tmpdir}from 'node:os';import path from 'node:path';
import {parseRSS,parseFriends}from './sync/parsers.mjs';import {isPublicAddress,download}from './sync/network.mjs';import {syncProject}from './sync/run.mjs';import {loadProject,compileProject,atomicJson}from './content/project.mjs';import {optimizeImage}from './sync/images.mjs';
test('Sync only accepts public HTTPS targets, including mapped/private IPs',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','198.18.0.1','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(isPublicAddress(ip),false,ip);
 for(const ip of ['43.174.247.38','1.1.1.1','2606:4700:4700::1111'])assert.equal(isPublicAddress(ip),true,ip);
 await assert.rejects(()=>download('http://example.org/'));await assert.rejects(()=>download('https://127.0.0.1/'));
});
test('RSS and friends parse text, canonical stable URLs and dates without executing HTML',()=>{
 const source={url:'https://example.org/rss/',maxItems:10};
 const result=parseRSS('<rss><channel><item><title><![CDATA[Title]]></title><guid>stable</guid><link>https://example.org/post/</link><description><![CDATA[<p>Hello <script>bad()</script>world</p>]]></description><pubDate>Mon, 26 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>',source);
 assert.equal(result[0].description,'Hello world');assert.equal(result[0].publishedAt,'2026-10-26T00:00:00.000Z');
 assert.throws(()=>parseRSS('<!DOCTYPE a><rss/>',source));assert.throws(()=>parseFriends('<p>No bookmarks</p>',source));
 const friends=parseFriends('<a class="kg-bookmark-container" href="https://friend.example/?ref=mimaglows.com"><div class="kg-bookmark-title">Name</div></a>',source);
 assert.equal(friends[0].url,'https://friend.example/');assert.equal(friends[0].title,'Name');
});
test('Actual sync runner respects overrides/deletions and retains old success after source failure',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'mima-sync-'));try{
  for(const dir of ['content','generated','public'])await cp(dir,path.join(root,dir),{recursive:true});
  const source={id:'test-source',module:'friends',adapter:'friends-html',enabled:true,refreshHours:1};
  await atomicJson(root,'content/sync.json',{schemaVersion:1,sources:[source]});
  const friend={id:'test-synced',type:'friend',title:'Original',url:'https://example.org/'};
  const adapters={'friends-html':async()=>({items:[friend]})};
  assert.equal((await syncProject(root,{force:true,adapters}))[0].status,'updated');
  await atomicJson(root,'content/overrides.json',{schemaVersion:1,items:[{id:friend.id,patch:{title:'Manual',featured:true}}]});
  friend.title='New upstream';await syncProject(root,{force:true,adapters});assert.equal((await loadProject(root)).records.find(x=>x.id===friend.id).title,'Manual');
  await atomicJson(root,'content/tombstones.json',{schemaVersion:1,ids:[friend.id]});await syncProject(root,{force:true,adapters});assert.ok(!(await compileProject(await loadProject(root))).manifest.items.some(x=>x.id===friend.id));
  const before=JSON.parse(await readFile(path.join(root,'generated/test-source.json')));
  await syncProject(root,{force:true,adapters:{'friends-html':async()=>{throw Error('Source unavailable');}}});
  const after=JSON.parse(await readFile(path.join(root,'generated/test-source.json')));assert.deepEqual(after.items,before.items);assert.equal(after.lastSuccessfulAt,before.lastSuccessfulAt);assert.equal(after.error,'Source unavailable');
  source.enabled=false;await atomicJson(root,'content/sync.json',{schemaVersion:1,sources:[source]});assert.equal((await syncProject(root,{force:true,adapters}))[0].status,'disabled');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Upload optimizer rejects active SVG files',async()=>{await assert.rejects(()=>optimizeImage('/tmp',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')));});
