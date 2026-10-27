import { readFile, readdir, mkdir, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { siteSchema, recordsSchema, overrideSchema, tombstoneSchema, cacheSchema, syncSchema, validate, defaults, moduleDefaults, moduleFor, modules } from './schema.mjs';
import { canonicalMusic } from './music.mjs';
export class ContentError extends Error { constructor(errors){super(errors.join('\n'));this.errors=errors;} }
export const readJson = async (root,file) => {try{return JSON.parse(await readFile(path.join(root,file),'utf8'));}catch(e){throw new ContentError([`${file}: ${e.message}`]);}};
export async function atomicJson(root,file,value) {
 const target=path.join(root,file);await mkdir(path.dirname(target),{recursive:true});
 const temp=`${target}.${process.pid}.${Date.now()}.tmp`;
 await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,target);
}
export async function loadProject(root=process.cwd(),changes={}) {
 const errors=[], warnings=[], files=[];
 const load=async(file,schema)=>{let value;if(Object.hasOwn(changes,file)){try{value=JSON.parse(changes[file]);}catch{throw new ContentError([`${file}: JSON 格式不正确`]);}}else value=await readJson(root,file);validate(value,schema,file,errors);files.push(file);if(errors.length)throw new ContentError(errors);return value;};
 const site=await load('content/site.json',siteSchema);
 const sync=await load('content/sync.json',syncSchema);
 const overrides=await load('content/overrides.json',overrideSchema);
 const tombstones=await load('content/tombstones.json',tombstoneSchema);
 const manual=[], caches=[];
 for(const file of (await readdir(path.join(root,'content/records'))).filter(x=>x.endsWith('.json')).sort()){
  const doc=await load(`content/records/${file}`,recordsSchema);
  for(const [i,item]of doc.items.entries())manual.push({...item,_file:`content/records/${file}.items[${i}]`});
 }
 for(const file of (await readdir(path.join(root,'generated'))).filter(x=>x.endsWith('.json')).sort()){
  const doc=await load(`generated/${file}`,cacheSchema);caches.push({...doc,_file:`generated/${file}`});
 }
 const checkUnique=(list,label,get=x=>x.id)=>{const ids=new Set();for(const item of list){const id=get(item);if(ids.has(id))errors.push(`${label}: 重复 ID ${id}`);ids.add(id);}};
 checkUnique(manual,'content/records');checkUnique(caches.flatMap(x=>x.items),'generated');
 checkUnique(overrides.items,'content/overrides.json');checkUnique(tombstones.ids,'content/tombstones.json',x=>x);
 checkUnique(site.navigation,'content/site.json.navigation');checkUnique(site.moduleOrder,'content/site.json.moduleOrder',x=>x);
 checkUnique(sync.sources,'content/sync.json.sources');
 if(site.navigation.length!==3||!['blog','minecraft','stronghold'].every(id=>site.navigation.some(x=>x.id===id)))errors.push('content/site.json.navigation: 必须保留 blog / minecraft / stronghold 三个稳定 ID');
 if(site.moduleOrder.length!==modules.length||!modules.every(x=>site.moduleOrder.includes(x)))errors.push('content/site.json.moduleOrder: 必须恰好包含全部六个模块');
 const reserved=new Set(site.navigation.map(x=>`portal-${x.id}`));
 for(const item of manual)if(reserved.has(item.id))errors.push(`${item._file}.id: 导航 ID 由 site.json 管理`);
 const merged=new Map();
 for(const cache of caches)for(const item of cache.items){if(cache.error&&site.modules[moduleFor[item.type]].fallbackBehavior&&site.modules[moduleFor[item.type]].fallbackBehavior!=='cache')continue;merged.set(item.id,{...defaults(item),_file:cache._file,_origin:'automatic'});}
 for(const item of manual){const old=merged.get(item.id);if(old&&old.type!==item.type)errors.push(`${item._file}.type: 与自动缓存同 ID 的类别不一致`);merged.set(item.id,{...defaults(item),_origin:'manual'});}
 for(const {id,patch}of overrides.items){if(merged.has(id))merged.set(id,{...merged.get(id),...patch,_overridden:true});}
 for(const item of merged.values()) {
  for(const key of ['thumbnail','imageLarge']){const generated=/^(\/media\/[a-z]+\/[a-f0-9]{20})-(256|1440)\.webp$/.exec(item[key]||'');if(generated&&item.image!==`${generated[1]}-768.webp`){delete item[key];warnings.push(`${item._file}.${key}: 主图已修改，忽略旧的自动尺寸图`);}}
  if(item.type==='music'&&!item.artist)errors.push(`${item._file}.artist: 音乐必须填写歌手`);
  if(item.bodyFile&&!Object.hasOwn(changes,`content/${item.bodyFile}`)){try{await stat(path.join(root,'content',item.bodyFile));}catch{errors.push(`${item._file}.bodyFile: 找不到 content/${item.bodyFile}`);}}
  for(const p of [item.image,...(item.artworks||[]).map(x=>x.image)].filter(Boolean))try{await stat(path.join(root,'public',p.slice(1)));}catch{warnings.push(`${item._file}.image: ${p} 不存在，公开构建使用占位图`);}
  for(const rel of item.relations||[])if(!merged.has(rel.targetId))errors.push(`${item._file}.relations: 找不到人物 ID ${rel.targetId}`);
 }
 if(errors.length)throw new ContentError(errors);
 site.modules=Object.fromEntries(modules.map(key=>[key,moduleDefaults(site.modules[key])]));
 const tombstoneIds=new Set(tombstones.ids);
 const allRecords=[...merged.values()].map(item=>{
  const module=moduleFor[item.type], config=site.modules[module];
  return {...item,module,_visible:item.published&&!item.archived&&config.enabled};
 });
 const records=allRecords.filter(item=>!tombstoneIds.has(item.id));
 return {root,site,sync,overrides,tombstones,manual,caches,records,allRecords,warnings,files};
}
export function sortRecords(items,sorting='manual') {
 return [...items].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(sorting==='newest'?(Date.parse(b.publishedAt||b.updatedAt||'1970-01-01')-Date.parse(a.publishedAt||a.updatedAt||'1970-01-01')):sorting==='title'?a.title.localeCompare(b.title,'zh-CN'):a.order-b.order)||a.id.localeCompare(b.id));
}
export async function compileProject(project) {
 const {site,root}=project,outputs={},catalog=[],publicFiles=new Set();
 const nav=[...site.navigation].sort((a,b)=>a.order-b.order).map((item,i)=>defaults({id:`portal-${item.id}`,type:'navigation',title:item.title,url:item.url,featured:true,order:item.order,image:`/assets/cover-${['blog','minecraft','stronghold'][['blog','minecraft','stronghold'].indexOf(item.id)]}.webp`,module:'navigation'}));
 const all=[...nav,...project.records.filter(x=>x._visible&&x.type!=='music'),...canonicalMusic(project)];
 for(const module of site.moduleOrder){
  const config=site.modules[module];
  const candidates=all.filter(x=>x.module===module&&config.enabled);
  const records=sortRecords(candidates,config.sorting).slice(0,config.displayLimit);
  const publish=[];
  for(const item of records){
   const clean=Object.fromEntries(Object.entries(item).filter(([key])=>!key.startsWith('_')&&key!=='bodyFile'));
   try{await stat(path.join(root,'public',clean.image.slice(1)));}catch{clean.image='/assets/placeholder.svg';}
   for(const key of ['thumbnail','imageLarge'])if(clean[key])try{await stat(path.join(root,'public',clean[key].slice(1)));}catch{delete clean[key];}
   if(item.bodyFile){const body=await readFile(path.join(root,'content',item.bodyFile),'utf8');outputs[`data/bodies/${item.id}.json`]=JSON.stringify({id:item.id,markdown:body});clean.bodyUrl=`data/bodies/${item.id}.json`;}
   clean.relations=(clean.relations||[]).filter(x=>x.public!==false&&all.some(y=>y.id===x.targetId));
   clean.artworks=(clean.artworks||[]).filter(x=>x.public!==false);
   for(const art of clean.artworks)try{await stat(path.join(root,'public',art.image.slice(1)));}catch{art.image='/assets/placeholder.svg';}
   for(const file of [clean.image,clean.thumbnail,clean.imageLarge,...clean.artworks.map(x=>x.image)].filter(Boolean))publicFiles.add(file.slice(1));
   publish.push(clean);
   catalog.push(Object.fromEntries(['id','type','title','description','image','url','module','featured','pinned','order','modes','aliasIds'].map(key=>[key,clean[key]])));
  }
  outputs[`data/modules/${module}.json`]=JSON.stringify({schemaVersion:1,items:publish});
 }
 const publicSite={title:site.title,name:site.name,description:site.description,registration:site.registration,navigation:[...site.navigation].sort((a,b)=>a.order-b.order),defaults:site.defaults,moduleOrder:site.moduleOrder,modules:site.modules};
 const manifest={schemaVersion:1,site:publicSite,items:catalog,status:project.caches.map(({source,lastSuccessfulAt,error})=>({source,lastSuccessfulAt,error:error?'同步暂不可用，保留已有缓存':undefined}))};
 outputs['data/catalog.json']=JSON.stringify(manifest);
 return {manifest,outputs,publicFiles:[...publicFiles]};
}
