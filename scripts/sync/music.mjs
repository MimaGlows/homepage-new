import{readFile,realpath}from'node:fs/promises';import path from'node:path';
import{json}from'./network.mjs';import{cacheImage}from'./images.mjs';import{stableId,publicUrl}from'./parsers.mjs';
const text=value=>typeof value==='object'?value?.['#text']||value?.name||'':String(value||'');
const timestamp=value=>Number.isFinite(Number(value))&&Number(value)>0?new Date(Number(value)*1000).toISOString():undefined;
export function parseLastfm(data,source){
 if(data.error)throw Error(`Last.fm 请求失败（代码 ${Number(data.error)||0}）`);
 if(!Array.isArray(data.recenttracks?.track))throw Error('Last.fm 响应缺少 recenttracks.track');
 const tracks=new Map(),playEvents=[];
 for(const value of data.recenttracks.track){
  const title=text(value.name),artist=text(value.artist);if(!title||!artist)continue;
  const album=text(value.album),id=stableId('lastfm',value.mbid||`${title}\0${artist}\0${album}`),playedAt=timestamp(value.date?.uts),url=publicUrl(value.url);
  const track={id,type:'music',title:title.slice(0,180),artist:artist.slice(0,200),album:album.slice(0,200),published:true,order:tracks.size*10,remoteImage:value.image?.findLast(x=>x['#text'])?.['#text'],...(url?{url,platformLinks:[{platform:'lastfm',url}]}:{}),...(playedAt?{lastPlayedAt:playedAt}:{}),source:{url:`https://www.last.fm/user/${encodeURIComponent(source.username)}`,attribution:'Last.fm · 用户公开收听记录',retrievedAt:new Date().toISOString()}};
  if(!tracks.has(id))tracks.set(id,track);
  // nowplaying has no completed timestamp and never becomes a fabricated PlayEvent.
  if(playedAt)playEvents.push({id:stableId('play',`${source.id}:${id}:${playedAt}`),trackId:id,playedAt,platform:'lastfm',sourceId:source.id});
 }
 return {items:[...tracks.values()],playEvents};
}
export function parseListenbrainz(data,source){
 if(!Array.isArray(data.payload?.listens))throw Error('ListenBrainz 响应缺少 listens');const items=new Map(),playEvents=[];
 for(const value of data.payload.listens){const m=value.track_metadata||{},extra=m.additional_info||{},title=m.track_name,artist=m.artist_name;if(!title||!artist)continue;
  const id=stableId('listenbrainz',extra.recording_mbid||`${title}\0${artist}\0${m.release_name||''}`),playedAt=timestamp(value.listened_at),url=`https://listenbrainz.org/user/${encodeURIComponent(source.username)}/`;
  const item={id,type:'music',title:title.slice(0,180),artist:artist.slice(0,200),album:(m.release_name||'').slice(0,200),url,platformLinks:[{platform:'listenbrainz',url}],published:true,order:items.size*10,...(Number(extra.duration_ms)>0?{duration:Math.round(extra.duration_ms/1000)}:{}),...(playedAt?{lastPlayedAt:playedAt}:{}),source:{url,attribution:'ListenBrainz 公开最近收听',retrievedAt:new Date().toISOString()}};
  if(!items.has(id))items.set(id,item);if(playedAt)playEvents.push({id:stableId('play',`${source.id}:${id}:${playedAt}`),trackId:id,playedAt,platform:'listenbrainz',sourceId:source.id});
 }return {items:[...items.values()],playEvents};
}
export function parseMusicImport(data,source){
 const values=Array.isArray(data)?data:data.tracks||data.songs||data.items;if(!Array.isArray(values))throw Error('导入文件须包含 tracks / songs 数组，或为 YouTube 导出数组');
 const items=new Map(),playEvents=[],netease=source.adapter==='netease-import';
 for(const value of values.slice(0,source.maxItems||100)){
  const title=text(value.name||value.title).replace(/^Watched /,''),artist=text(value.artist)||(value.ar||value.artists||[]).map(x=>x.name).join(' / ')||value.subtitles?.[0]?.name||'未知歌手（待补充）';
  if(!title)continue;const rawID=String(value.id||value.titleUrl||`${title}:${artist}`),id=stableId(netease?'netease':'youtube',rawID);
  const url=publicUrl(value.url||value.titleUrl||(netease&&/^\d+$/.test(rawID)?`https://music.163.com/song?id=${rawID}`:undefined));
  const playedAt=value.time&&Number.isFinite(Date.parse(value.time))?new Date(value.time).toISOString():undefined;
  const item={id,type:'music',title:title.slice(0,180),artist:artist.slice(0,200),album:text(value.album?.name||value.al?.name||value.album).slice(0,200),published:true,order:items.size*10,...(Number(value.duration||value.dt)>0?{duration:Math.round(value.duration||value.dt/1000)}:{}),...(value.isrc?{isrc:String(value.isrc).toUpperCase()}:{}),...(url?{url,platformLinks:[{platform:netease?'netease':'youtube',url}]}:{}),...(playedAt?{lastPlayedAt:playedAt}:{}),source:{url:url||(netease?'https://music.163.com/':'https://music.youtube.com/'),attribution:'本人授权导出文件导入',retrievedAt:new Date().toISOString()}};
  if(!items.has(id))items.set(id,item);if(playedAt)playEvents.push({id:stableId('play',`${source.id}:${id}:${playedAt}`),trackId:id,playedAt,platform:netease?'netease':'youtube',sourceId:source.id});
 }return {items:[...items.values()],playEvents};
}
export async function mergeMusicCache(root,data,old={items:[]}){
 const protectedIds=new Set();
 for(const file of ['content/overrides.json','content/tombstones.json','content/records/music.json']){
  const doc=JSON.parse(await readFile(path.join(root,file),'utf8'));
  for(const id of doc.ids||[])protectedIds.add(id);
  for(const item of doc.items||[]){protectedIds.add(item.id);const value=item.patch||item;if(value.canonicalId)protectedIds.add(value.canonicalId);for(const id of value.neverMergeWith||[])protectedIds.add(id);}
 }
 const map=new Map(old.items.map(x=>[x.id,x]));for(const item of data.items){const previous=map.get(item.id);map.delete(item.id);map.set(item.id,{...previous,...item});}
 const protectedTracks=[...map.values()].filter(x=>protectedIds.has(x.id)),remaining=[...map.values()].filter(x=>!protectedIds.has(x.id));
 if(protectedTracks.length>500||protectedTracks.length===500&&remaining.length)throw Error('500 首缓存均被人工保护，未覆盖旧数据；请整理归档后再同步');
 data.items=[...protectedTracks,...remaining.slice(-(500-protectedTracks.length))];
 data.playEvents=[...new Map([...(old.playEvents||[]),...(data.playEvents||[])].map(x=>[x.id,x])).values()].sort((a,b)=>a.playedAt.localeCompare(b.playedAt)).slice(-10000);
 return data;
}
export async function musicAdapter(source,root,old={items:[]},request=json){
 let data;
 if(source.adapter==='lastfm'){
  const key=process.env[source.tokenEnv||'LASTFM_API_KEY'];if(!key)throw Error(`缺少本地环境变量 ${source.tokenEnv||'LASTFM_API_KEY'}；保留缓存，可继续手动维护音乐`);
  if(!source.username)throw Error('请填写 Last.fm 公开用户名');
  const url=new URL('https://ws.audioscrobbler.com/2.0/');url.search=new URLSearchParams({method:'user.getrecenttracks',user:source.username,api_key:key,format:'json',limit:String(source.maxItems||30)});data=parseLastfm(await request(url),source);
 }else if(source.adapter==='listenbrainz'){
  if(!source.username)throw Error('请填写 ListenBrainz 公开用户名');data=parseListenbrainz(await request(`https://api.listenbrainz.org/1/user/${encodeURIComponent(source.username)}/listens?count=${source.maxItems||30}`),source);
 }else if(['netease-import','youtube-import'].includes(source.adapter)){
  if(!/^imports\/[a-z0-9][a-z0-9_-]*\.json$/.test(source.importFile||''))throw Error('导入路径应为 imports/name.json');const file=await realpath(path.join(root,source.importFile));if(!file.startsWith(await realpath(root)+path.sep))throw Error('导入文件路径越界');const buffer=await readFile(file);if(buffer.length>8*1024*1024)throw Error('导出文件过大，请保留近期记录后导入');data=parseMusicImport(JSON.parse(buffer.toString()),source);
 }else if(source.adapter==='apple-catalog'){
  const{matchAppleProject}=await import('./apple.mjs');return matchAppleProject(root,source,old,request);
 }else throw Error('此来源使用手动内容文件维护，不执行第三方抓取');
 for(let i=0;i<data.items.length;i++){const{remoteImage,...item}=data.items[i],previous=old.items.find(x=>x.id===item.id);const images=remoteImage?await cacheImage(root,remoteImage,'albums'):{image:previous?.image||'/assets/placeholder.svg'};data.items[i]={...item,...images,...(remoteImage?{source:{...item.source,imageUrl:remoteImage,license:'专辑封面权利归原作者；不随程序代码授予 MIT'}}:{})};}
 return mergeMusicCache(root,data,old);
}
