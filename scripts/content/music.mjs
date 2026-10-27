export const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu,'');
export function versionOf(track){return [...new Set(`${track.version||''} ${track.title}`.toLowerCase().match(/live|remix|remaster(?:ed)?|instrumental|karaoke|acoustic|re.?record(?:ed|ing)?|sped.?up|slowed|现场|混音|重录|伴奏/g)||[])].sort().join('|');}
export function sameRecording(a,b){
 if(versionOf(a)!==versionOf(b))return false;
 if(a.isrc&&b.isrc)return a.isrc===b.isrc;
 return normalize(a.title)===normalize(b.title)&&normalize(a.artist)===normalize(b.artist)&&!!a.duration&&!!b.duration&&Math.abs(a.duration-b.duration)<=2;
}
const rank=item=>(item._overridden?8:0)+(item._origin==='manual'?4:0);
export function canonicalMusic(project,{includeHidden=false}={}){
 const items=(project.allRecords||project.records).filter(x=>x.type==='music'),byId=new Map(items.map(x=>[x.id,x])),parent=new Map(items.map(x=>[x.id,x.canonicalId||x.id]));
 function root(id){const seen=new Set();while(parent.has(id)&&parent.get(id)!==id){if(seen.has(id))return [...seen].sort()[0];seen.add(id);id=parent.get(id);}return id;}
 const canAuto=(a,b)=>!a.mergeLocked&&!b.mergeLocked&&!a.canonicalId&&!b.canonicalId&&!a.neverMergeWith?.includes(b.id)&&!b.neverMergeWith?.includes(a.id);
 // Explicit manual mappings are established first; automatic evidence never undoes them.
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];if(root(a.id)===root(b.id)||!canAuto(a,b)||!sameRecording(a,b))continue;
  const groupA=items.filter(x=>root(x.id)===root(a.id)),groupB=items.filter(x=>root(x.id)===root(b.id));
  if(groupA.every(x=>groupB.every(y=>canAuto(x,y)&&sameRecording(x,y)))){const ids=[root(a.id),root(b.id)].sort();parent.set(ids[1],ids[0]);}
 }
 const groups=new Map();for(const item of items){const id=root(item.id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(item);}
 const hidden=new Set(project.tombstones.ids),matches=project.caches.flatMap(x=>x.matches||[]),events=project.caches.flatMap(x=>x.playEvents||[]);
 return [...groups].map(([id,aliases])=>{
  aliases.sort((a,b)=>rank(b)-rank(a)||Number(b.id===id)-Number(a.id===id)||a.id.localeCompare(b.id));
  const main=aliases[0],aliasIds=aliases.map(x=>x.id),links=new Map();
  // Lowest priority first. A confirmed manual URL beats every automatic match.
  for(const match of matches.filter(x=>aliasIds.includes(x.trackId)))for(const link of match.platformLinks)links.set(link.platform,link);
  for(const track of [...aliases].reverse())for(const link of track.platformLinks||[]){const old=links.get(link.platform);if(!old?.confirmed||link.confirmed)links.set(link.platform,link);}
  const plays=events.filter(x=>aliasIds.includes(x.trackId));
  const lastPlayedAt=[...aliases.map(x=>x.lastPlayedAt),...plays.map(x=>x.playedAt)].filter(Boolean).sort().at(-1);
  const blocked=hidden.has(id)||aliases.some(x=>hidden.has(x.id)||x.published===false||x.archived);
  return {...main,id,aliasIds,platformLinks:[...links.values()],...(lastPlayedAt?{lastPlayedAt}:{}),playCount:new Set(plays.map(x=>x.id)).size,featured:aliases.some(x=>x.featured),pinned:aliases.some(x=>x.pinned),order:Math.min(...aliases.map(x=>x.order??100)),_visible:!blocked&&main._visible,_hidden:blocked};
 }).filter(x=>includeHidden||x._visible);
}
