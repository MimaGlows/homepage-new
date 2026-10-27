import http from'node:http';import path from'node:path';import{readFile}from'node:fs/promises';import{randomBytes}from'node:crypto';import{pathToFileURL,fileURLToPath}from'node:url';
import{studioState,saveChanges,restoreBackup}from'./store.mjs';import{optimizeImage}from'../sync/images.mjs';import{syncProject}from'../sync/run.mjs';
import{parseMusicImport,mergeMusicCache}from'../sync/music.mjs';import{cacheSchema,validate}from'../content/schema.mjs';import{atomicJson,readJson}from'../content/project.mjs';
const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../studio');
export async function startStudio(root=process.cwd(),{port=4317,previewPort=4318,preview=true}={}){
 const token=randomBytes(32).toString('hex');let vite,queue=Promise.resolve();
 const origin=`http://127.0.0.1:${port}`;
 const mutation=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
 if(preview){const {createServer}=await import('vite');vite=await createServer({root,server:{host:'127.0.0.1',port:previewPort,strictPort:true}});await vite.listen();}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const send=(status,data,type='application/json')=>{res.writeHead(status,{'content-type':`${type}; charset=utf-8`});res.end(type==='application/json'?JSON.stringify(data):data);};
  try{
   if(req.headers.host!==`127.0.0.1:${port}`||req.headers.origin&&req.headers.origin!==origin){send(403,{error:'仅允许本机同源访问'});return;}
   const url=new URL(req.url,origin);
   if(req.method==='GET'){
    if(url.pathname==='/api/state'){send(200,{...await studioState(root),token,previewUrl:`http://127.0.0.1:${previewPort}/`});return;}
    const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
    if(files[url.pathname]){send(200,await readFile(path.join(here,files[url.pathname]),'utf8'),url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html');return;}
    if(url.pathname.startsWith('/media/')||url.pathname.startsWith('/assets/')){
     if(!/^\/(media|assets)\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif|svg)$/.test(url.pathname)){send(400,{error:'图片路径无效'});return;}
     const file=path.join(root,'public',url.pathname);res.writeHead(200,{'content-type':url.pathname.endsWith('.svg')?'image/svg+xml':`image/${url.pathname.split('.').pop()}`});res.end(await readFile(file));return;
    }
    send(404,{error:'页面不存在'});return;
   }
   if(req.method!=='POST'||req.headers['x-studio-token']!==token||req.headers.origin!==origin){send(403,{error:'请求校验失败，请重新打开本地管理台'});return;}
   const upload=url.pathname==='/api/upload',limit=upload?12*1024*1024:2*1024*1024;let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>limit){send(413,{error:'内容超过大小限制'});return;}chunks.push(chunk);}
   const buffer=Buffer.concat(chunks);
   if(upload){send(200,await mutation(()=>optimizeImage(root,buffer,url.searchParams.get('group')||'archive')));return;}
   if(!req.headers['content-type']?.startsWith('application/json')){send(415,{error:'需要 JSON 请求'});return;}
   const data=JSON.parse(buffer.toString());
   if(url.pathname==='/api/save'){send(200,await mutation(()=>saveChanges(root,data.changes,data.revision)));return;}
   if(url.pathname==='/api/restore'){send(200,await mutation(()=>restoreBackup(root,data.id,data.revision)));return;}
   if(url.pathname==='/api/sync'){send(200,await mutation(()=>syncProject(root,{sourceId:data.sourceId,force:true})));return;}
   if(url.pathname==='/api/import-music'){send(200,await mutation(async()=>{if(!['netease','youtube'].includes(data.platform))throw Error('导入平台无效');const source={id:`import-${data.platform}`,adapter:`${data.platform}-import`,maxItems:100};const file=`generated/${source.id}.json`;let old;try{old=await readJson(root,file);}catch{old={items:[]};}const parsed=parseMusicImport(data.data,source),count=parsed.items.length;const content={schemaVersion:1,source:source.id,lastAttemptAt:new Date().toISOString(),lastSuccessfulAt:new Date().toISOString(),...await mergeMusicCache(root,parsed,old)};const errors=validate(content,cacheSchema,'音乐导入');if(errors.length)throw Error(errors.join('\n'));await atomicJson(root,file,content);return {count};}));return;}
   send(404,{error:'操作不存在'});
  }catch(error){send(error.status||400,{error:error.message||'操作失败'});}
 });
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){await vite?.close();throw error;}
 return {url:origin,server,close:async()=>{await new Promise(resolve=>server.close(resolve));await vite?.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const studio=await startStudio(process.cwd(),{port:Number(process.env.STUDIO_PORT)||4317,previewPort:Number(process.env.STUDIO_PREVIEW_PORT)||4318});console.log(`Mima Archive Studio: ${studio.url}\n预览：http://127.0.0.1:${Number(process.env.STUDIO_PREVIEW_PORT)||4318}/\n仅监听本机；保存不会发布。`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await studio.close();process.exit(0);});}
