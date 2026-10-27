import {readFile,readdir,writeFile,mkdir,rename,unlink,realpath}from'node:fs/promises';
import path from'node:path';import{createHash,randomUUID}from'node:crypto';
import{loadProject,ContentError}from'../content/project.mjs';
import{canonicalMusic}from'../content/music.mjs';
export const editable=file=>/^content\/(site|sync|overrides|tombstones)\.json$/.test(file)||/^content\/records\/(friends|music|blog|social|characters)\.json$/.test(file)||/^content\/characters\/[a-z0-9][a-z0-9/-]*\.md$/.test(file)&&!file.includes('..');
export async function filesSnapshot(root){
 const result={};for(const file of ['content/site.json','content/sync.json','content/overrides.json','content/tombstones.json',...(await readdir(path.join(root,'content/records'))).filter(x=>x.endsWith('.json')).map(x=>`content/records/${x}`)])result[file]=await readFile(path.join(root,file),'utf8');
 async function walk(dir){for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){const file=`${dir}/${entry.name}`;if(entry.isDirectory())await walk(file);else if(file.endsWith('.md'))result[file]=await readFile(path.join(root,file),'utf8');}}
 await walk('content/characters');return result;
}
export function revision(files){return createHash('sha256').update(JSON.stringify(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');}
async function safeTarget(root,file){
 const target=path.resolve(root,file),base=await realpath(root);
 let parent=path.dirname(target);while(true){try{const resolved=await realpath(parent);if(resolved!==base&&!resolved.startsWith(base+path.sep))throw Error('文件路径越界');break;}catch(error){if(error.code!=='ENOENT')throw error;parent=path.dirname(parent);}}
 try{const resolved=await realpath(target);if(!resolved.startsWith(base+path.sep))throw Error('文件路径越界');}catch(error){if(error.code!=='ENOENT')throw error;}return target;
}
export async function saveChanges(root,changes,expected,{backup=true}={}){
 const current=await filesSnapshot(root);
 if(expected!==revision(current)){const e=Error('内容已被其他窗口或编辑器修改。请重新读取后再保存，避免覆盖。');e.status=409;throw e;}
 if(!changes||!Object.keys(changes).length||Object.keys(changes).length>20)throw Error('请选择要保存的内容');
 for(const [file,text]of Object.entries(changes)){if(!editable(file)||typeof text!=='string'||Buffer.byteLength(text)>512000)throw Error(`不允许的文件或内容大小：${file}`);await safeTarget(root,file);}
 await loadProject(root,changes);
 const originals=Object.fromEntries(Object.keys(changes).map(file=>[file,current[file]??null]));
 let backupId;
 if(backup){backupId=`${Date.now()}-${randomUUID()}`;await mkdir(path.join(root,'.studio/backups'),{recursive:true});await writeFile(path.join(root,'.studio/backups',`${backupId}.json`),JSON.stringify({createdAt:new Date().toISOString(),files:originals},null,2));}
 const written=[];
 async function write(file,text){const target=await safeTarget(root,file);await mkdir(path.dirname(target),{recursive:true});const temp=`${target}.${randomUUID()}.tmp`;await writeFile(temp,text);await rename(temp,target);}
 try{for(const [file,text]of Object.entries(changes).sort(([a],[b])=>Number(b.endsWith('.md'))-Number(a.endsWith('.md')))){await write(file,text);written.push(file);}}catch(error){for(const file of written){if(originals[file]===null)await unlink(path.join(root,file));else await write(file,originals[file]);}throw error;}
 return {revision:revision({...current,...changes}),backupId};
}
export async function backups(root){try{return (await readdir(path.join(root,'.studio/backups'))).filter(x=>/^\d+-[a-f0-9-]+\.json$/.test(x)).sort().reverse().slice(0,50).map(x=>x.slice(0,-5));}catch{return [];}}
export async function restoreBackup(root,id,expected){
 if(!/^\d+-[a-f0-9-]+$/.test(id))throw Error('恢复编号无效');const data=JSON.parse(await readFile(path.join(root,'.studio/backups',`${id}.json`),'utf8'));
 const current=await filesSnapshot(root),changes={};for(const [file,text]of Object.entries(data.files)){if(text===null){if(file.endsWith('.md'))continue;throw Error('无法恢复未创建的结构文件');}changes[file]=text;}
 // New unused Markdown files may remain on disk; no public record points to them.
 return saveChanges(root,changes,expected);
}
export async function studioState(root){
 const project=await loadProject(root),files=await filesSnapshot(root),media=[];
 async function walk(dir){try{for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){if(entry.isDirectory())await walk(`${dir}/${entry.name}`);else if(/\.(webp|png|jpe?g|avif)$/.test(entry.name))media.push('/'+`${dir}/${entry.name}`.replace(/^public\//,''));}}catch{}}
 await walk('public/media');
 const records=project.allRecords.map(item=>project.tombstones.ids.includes(item.id)?{...item,_deleted:true}:item);
 return {revision:revision(files),files,site:project.site,sync:project.sync,records,canonicalTracks:canonicalMusic(project,{includeHidden:true}),media,warnings:project.warnings,backups:await backups(root),status:project.caches.map(({source,lastAttemptAt,lastSuccessfulAt,error,items,playEvents})=>({source,lastAttemptAt,lastSuccessfulAt,error,count:items.length,events:playEvents?.length||0}))};
}
