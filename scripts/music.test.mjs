import test from'node:test';import assert from'node:assert/strict';import{mkdtemp,cp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';
import{canonicalMusic,sameRecording}from'./content/music.mjs';import{parseLastfm,parseListenbrainz,parseMusicImport,musicAdapter}from'./sync/music.mjs';import{findAppleTrack}from'./sync/apple.mjs';import{loadProject,compileProject,atomicJson,readJson}from'./content/project.mjs';import{syncProject}from'./sync/run.mjs';
const track=(id,extra={})=>({id,type:'music',title:'A Song',artist:'Artist',album:'Album',duration:200,order:10,published:true,_visible:true,module:'music',...extra});
const project=items=>({records:items,allRecords:items,caches:[],tombstones:{ids:[]}});
test('Cache rotation and smaller re-imports retain aliases protected by manual mapping and hiding',async()=>{
 const{mergeMusicCache}=await import('./sync/music.mjs');const root=await mkdtemp(path.join(tmpdir(),'mima-music-retention-'));try{
  await cp('content',path.join(root,'content'),{recursive:true});await atomicJson(root,'content/overrides.json',{schemaVersion:1,items:[{id:'old-0',patch:{canonicalId:'old-1',mergeLocked:true}}]});await atomicJson(root,'content/tombstones.json',{schemaVersion:1,ids:['old-2']});
  const old={items:Array.from({length:500},(_,i)=>({id:`old-${i}`,type:'music',title:`Track ${i}`,artist:'Artist'}))};
  const result=await mergeMusicCache(root,{items:[{id:'new-track',type:'music',title:'New',artist:'Artist'}],playEvents:[]},old);assert.equal(result.items.length,500);for(const id of ['old-0','old-1','old-2','new-track'])assert.ok(result.items.some(x=>x.id===id));
  const smaller=await mergeMusicCache(root,{items:[{id:'old-1',type:'music',title:'Refreshed',artist:'Artist'}]},result);for(const id of ['old-0','old-1','old-2'])assert.ok(smaller.items.some(x=>x.id===id));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Canonical recordings use ISRC and cautious metadata, keeping live/remix/re-recordings apart',()=>{
 assert.equal(sameRecording(track('a'),track('b',{duration:202})),true);assert.equal(sameRecording(track('a'),track('b',{duration:204})),false);
 assert.equal(sameRecording(track('a',{duration:undefined}),track('b')),false);
 for(const version of ['Live','Remix','Re-recorded','现场'])assert.equal(sameRecording(track('a',{isrc:'USAAA2400001'}),track('b',{isrc:'USAAA2400001',version})),false);
 assert.equal(sameRecording(track('a',{isrc:'USAAA2400001'}),track('b',{isrc:'USAAA2400002'})),false);
 assert.equal(canonicalMusic(project([track('a'),track('b'),track('live',{version:'Live'})])).length,2);
 assert.equal(canonicalMusic(project([track('a',{duration:200}),track('b',{duration:202}),track('c',{duration:204})])).length,2);
});
test('Manual grouping, split locks, confirmed URLs and hidden aliases take priority',()=>{
 const a=track('a',{canonicalId:'b',mergeLocked:true,_overridden:true,platformLinks:[{platform:'apple',url:'https://music.apple.com/cn/song/manual/123',confirmed:true}]}),b=track('b',{canonicalId:'b',mergeLocked:true,platformLinks:[{platform:'apple',url:'https://music.apple.com/cn/song/automatic/456'}]});
 const p=project([a,b]);p.caches=[{matches:[{trackId:'a',platformLinks:[{platform:'apple',url:'https://music.apple.com/cn/song/auto/789'}]}],playEvents:[{id:'play1',trackId:'a',playedAt:'2026-10-20T00:00:00Z'},{id:'play2',trackId:'b',playedAt:'2026-10-21T00:00:00Z'}]}];
 let result=canonicalMusic(p);assert.equal(result.length,1);assert.equal(result[0].id,'b');assert.equal(result[0].platformLinks[0].url,a.platformLinks[0].url);assert.equal(result[0].playCount,2);assert.equal(result[0].lastPlayedAt,'2026-10-21T00:00:00Z');
 p.tombstones.ids=['a'];assert.equal(canonicalMusic(p).length,0);p.tombstones.ids=[];
 a.canonicalId='a';a.neverMergeWith=['b'];assert.equal(canonicalMusic(p).length,2);
});
test('Last.fm keeps one track plus genuine timestamped plays, never fabricates nowplaying events',()=>{
 const raw={name:'A Song',artist:{'#text':'Artist'},album:{'#text':'Album'},url:'https://www.last.fm/music/Artist/_/Song'};
 const result=parseLastfm({recenttracks:{track:[{...raw,date:{uts:'1793000000'}},{...raw,date:{uts:'1793000300'}},{...raw,'@attr':{nowplaying:'true'}}]}},{id:'lastfm',username:'MimaGlows'});
 assert.equal(result.items.length,1);assert.equal(result.playEvents.length,2);assert.notEqual(result.playEvents[0].id,result.playEvents[1].id);
 const lb=parseListenbrainz({payload:{listens:[{listened_at:1793000000,track_metadata:{track_name:'Song',artist_name:'Singer',additional_info:{duration_ms:202000}}}]}},{id:'lb',username:'test'});assert.equal(lb.items[0].duration,202);assert.equal(lb.playEvents.length,1);
});
test('Apple matching uses official ID/ISRC endpoints and only accepts one reliable Catalog URL',async()=>{
 let called;const request=async(url,options)=>{called={url,options};return {data:[{id:'123',attributes:{name:'A Song',artistName:'Artist',isrc:'USAAA2400001',durationInMillis:200000,url:'https://music.apple.com/cn/song/a-song/123'}}]};};
 const match=await findAppleTrack(track('a',{isrc:'USAAA2400001'}),{token:'test-token'},request);assert.equal(match.method,'isrc');assert.match(called.url,/api\.music\.apple\.com\/v1\/catalog\/cn\/songs\?/);assert.match(called.url,/filter%5Bisrc%5D/);assert.equal(match.platformLinks[0].url,'https://music.apple.com/cn/song/a-song/123');
 await findAppleTrack(track('a',{platformLinks:[{platform:'apple',platformId:'123',url:'https://music.apple.com/cn/song/a/123'}]}),{token:'test-token'},request);assert.match(called.url,/\/songs\/123$/);
 const search=async()=>({results:{songs:{data:[{id:'123',attributes:{name:'A Song',artistName:'Artist',durationInMillis:200000,url:'https://music.apple.com/cn/song/a/123'}}]}}});
 assert.equal((await findAppleTrack(track('a'),{token:'test-token'},search)).method,'metadata');assert.equal(await findAppleTrack(track('a',{duration:undefined}),{token:'test-token'},search),null);
 await assert.rejects(()=>findAppleTrack(track('a'),{token:''}),/DEVELOPER_TOKEN/);
});
test('Authorized NetEase/YouTube imports preserve platform links and only real provided timestamps',()=>{
 const ne=parseMusicImport({songs:[{id:123,name:'Title',ar:[{name:'Singer'}],al:{name:'Album'},dt:201000}]},{id:'import-netease',adapter:'netease-import',maxItems:100});assert.equal(ne.items[0].duration,201);assert.equal(ne.items[0].platformLinks[0].url,'https://music.163.com/song?id=123');assert.equal(ne.playEvents.length,0);
 const yt=parseMusicImport([{title:'Watched Title',titleUrl:'https://music.youtube.com/watch?v=test',subtitles:[{name:'Singer'}],time:'2026-10-20T00:00:00Z'}],{id:'import-youtube',adapter:'youtube-import',maxItems:100});assert.equal(yt.playEvents.length,1);assert.equal(yt.items[0].title,'Title');
});
test('Maintainer featured/link/merge/hide choices survive actual repeated sync runner writes and missing credentials',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'mima-music-'));try{
  for(const dir of ['content','generated','public'])await cp(dir,path.join(root,dir),{recursive:true});
  const site=await readJson(root,'content/site.json');site.modules.music.syncEnabled=true;await atomicJson(root,'content/site.json',site);
  const source={id:'test-music',adapter:'lastfm',module:'music',enabled:true,username:'MimaGlows',tokenEnv:'MIMA_TEST_MISSING_KEY'};await atomicJson(root,'content/sync.json',{schemaVersion:1,sources:[source]});
  const a=track('sync-a'),b=track('sync-b',{title:'Different spelling'});for(const x of[a,b]){delete x._visible;delete x.module;}
  const adapters={lastfm:async()=>({items:[a,b],playEvents:[{id:'event-a',trackId:a.id,playedAt:'2026-10-26T00:00:00Z',platform:'lastfm'}]})};
  await syncProject(root,{force:true,adapters});await atomicJson(root,'content/overrides.json',{schemaVersion:1,items:[{id:a.id,patch:{canonicalId:b.id,mergeLocked:true,featured:true,platformLinks:[{platform:'apple',url:'https://music.apple.com/cn/song/manual/123',confirmed:true}]}},{id:b.id,patch:{canonicalId:b.id,mergeLocked:true}}]});
  b.title='New source title';await syncProject(root,{force:true,adapters});let p=await loadProject(root),compiled=await compileProject(p);let songs=JSON.parse(compiled.outputs['data/modules/music.json']).items;assert.equal(songs.length,1);assert.equal(songs[0].id,b.id);assert.equal(songs[0].featured,true);assert.equal(songs[0].platformLinks[0].confirmed,true);
  await atomicJson(root,'content/tombstones.json',{schemaVersion:1,ids:[a.id]});await syncProject(root,{force:true,adapters});compiled=await compileProject(await loadProject(root));assert.equal(JSON.parse(compiled.outputs['data/modules/music.json']).items.length,0);
  const before=await readJson(root,'generated/test-music.json');await syncProject(root,{force:true});const after=await readJson(root,'generated/test-music.json');assert.deepEqual(after.items,before.items);assert.equal(after.lastSuccessfulAt,before.lastSuccessfulAt);assert.match(after.error,/MIMA_TEST_MISSING_KEY/);
 }finally{await rm(root,{recursive:true,force:true});}
});
