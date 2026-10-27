import { pathToFileURL } from 'node:url';
import { loadEnvFile } from 'node:process';
import { readJson,atomicJson,loadProject } from '../content/project.mjs';
import { validate,cacheSchema } from '../content/schema.mjs';
import { download } from './network.mjs';
import { cacheImage } from './images.mjs';
import { parseRSS,parseFriends } from './parsers.mjs';

export async function syncProject(root=process.cwd(),{sourceId,force=false,adapters={}}={}){
 try{loadEnvFile(`${root}/.env.local`);}catch{}
 const project=await loadProject(root),results=[];
 for(const source of project.sync.sources){
  if(sourceId&&source.id!==sourceId)continue;
  if(!source.enabled||!project.site.modules[source.module].syncEnabled){results.push({id:source.id,status:'disabled'});continue;}
  const file=`generated/${source.id}.json`;
  let old;try{old=await readJson(root,file);}catch{old={schemaVersion:1,source:source.id,items:[]};}
  const hours=Math.max(source.refreshHours||0,project.site.modules[source.module].refreshInterval);
  if(!force&&old.lastSuccessfulAt&&Date.now()-Date.parse(old.lastSuccessfulAt)<hours*3600_000){results.push({id:source.id,status:'cached'});continue;}
  const now=new Date().toISOString();
  try{
   let data;
   if(adapters[source.adapter])data=await adapters[source.adapter](source,root);
   else if(['rss','friends-html'].includes(source.adapter)){
    const {buffer}=await download(source.url,{maxBytes:4*1024*1024});
    const raw=(source.adapter==='rss'?parseRSS:parseFriends)(buffer.toString(),source).slice(0,source.maxItems||20);
    const items=[];
    for(const {remoteImage,...item}of raw){const previous=old.items.find(x=>x.id===item.id);const images=await cacheImage(root,remoteImage,source.module==='friends'?'friends':'archive');items.push({...item,source:{...item.source,...(remoteImage?{imageUrl:remoteImage}:{}),license:'原站封面/头像，权利归原作者；不随程序代码授予 MIT'},...(images.image==='/assets/placeholder.svg'&&previous?Object.fromEntries(['image','thumbnail','imageLarge'].filter(k=>previous[k]).map(k=>[k,previous[k]])):images)});}
    data={items};
   }else{const {musicAdapter}=await import('./music.mjs');data=await musicAdapter(source,root,old);}
   const next={schemaVersion:1,source:source.id,lastAttemptAt:now,lastSuccessfulAt:now,...data};
   const errors=validate(next,cacheSchema,file);if(errors.length)throw new Error(`同步数据不符合 Schema：${errors[0]}`);
   await atomicJson(root,file,next);results.push({id:source.id,status:'updated',count:next.items.length});
  }catch(error){
   // Only our adapters' sanitized messages are retained; never print remote bodies or credentials.
   const message=String(error.message||'同步失败').replace(/https?:\/\/\S+/g,'[来源]').slice(0,500);
   await atomicJson(root,file,{...old,lastAttemptAt:now,error:message});results.push({id:source.id,status:'error',error:message});
  }
 }
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await syncProject(process.cwd(),{sourceId:process.argv.find(x=>x.startsWith('--source='))?.slice(9),force:process.argv.includes('--force')});console.log(JSON.stringify(result,null,2));if(result.some(x=>x.status==='error'))process.exitCode=1;}
