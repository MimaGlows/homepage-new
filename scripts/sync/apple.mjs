import{loadProject}from'../content/project.mjs';import{sameRecording,normalize,versionOf}from'../content/music.mjs';import{json}from'./network.mjs';
export async function findAppleTrack(track,{storefront='cn',token=process.env.APPLE_MUSIC_DEVELOPER_TOKEN}={},request=json){
 if(!token)throw Error('缺少 APPLE_MUSIC_DEVELOPER_TOKEN；可先在 Studio 人工填写 Apple Music 官方歌曲 URL');
 if(!/^[a-z]{2}$/.test(storefront))throw Error('Apple storefront 应为两位小写地区代码');
 const base=`https://api.music.apple.com/v1/catalog/${storefront}`,known=track.platformLinks?.find(x=>x.platform==='apple'&&x.platformId),headers={authorization:`Bearer ${token}`};
 let endpoint,method;
 if(known){if(!/^\d+$/.test(known.platformId))throw Error('Apple Music ID 应为数字');endpoint=`${base}/songs/${known.platformId}`;method='id';}
 else if(track.isrc){endpoint=`${base}/songs?${new URLSearchParams({'filter[isrc]':track.isrc})}`;method='isrc';}
 else{endpoint=`${base}/search?${new URLSearchParams({term:`${track.title} ${track.artist}`,types:'songs',limit:'10'})}`;method='metadata';}
 const data=await request(endpoint,{headers}),values=method==='metadata'?data.results?.songs?.data:data.data;
 if(!Array.isArray(values))throw Error('Apple Catalog 未返回有效歌曲列表');
 const matches=values.filter(value=>{const a=value.attributes;if(!a?.url||!/^https:\/\/music\.apple\.com\//.test(a.url))return false;const candidate={title:a.name,artist:a.artistName,isrc:a.isrc,duration:Math.round(a.durationInMillis/1000)};if(method==='id')return String(value.id)===String(known.platformId);if(method==='isrc')return track.isrc===a.isrc&&versionOf(track)===versionOf(candidate);return sameRecording(track,candidate)&&normalize(track.title)===normalize(candidate.title)&&normalize(track.artist)===normalize(candidate.artist);});
 if(matches.length!==1)return null;const value=matches[0];
 return {trackId:track.id,platformLinks:[{platform:'apple',platformId:String(value.id),url:value.attributes.url}],method,matchedAt:new Date().toISOString()};
}
export async function matchAppleProject(root,source,old={matches:[]},request=json){
 const project=await loadProject(root),matches=new Map((old.matches||[]).map(x=>[x.trackId,x]));let checked=0;
 for(const track of project.records.filter(x=>x.type==='music'&&x._visible)){
  if(track.platformLinks?.some(x=>x.platform==='apple'&&x.confirmed))continue;
  if(checked++>=(source.maxItems||20))break;
  const result=await findAppleTrack(track,{storefront:source.storefront||'cn',token:process.env[source.tokenEnv||'APPLE_MUSIC_DEVELOPER_TOKEN']},request);
  if(result)matches.set(track.id,result);
 }
 return {items:[],matches:[...matches.values()]};
}
