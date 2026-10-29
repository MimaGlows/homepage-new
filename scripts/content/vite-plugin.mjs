import { loadProject, compileProject } from './project.mjs';
import {readFile,readdir}from'node:fs/promises';
import path from'node:path';
const coreAssets=['preview-day.webp','preview-night.webp','preview-day-mobile.webp','preview-night-mobile.webp','preview-day-archive.webp','preview-night-archive.webp','preview-day-archive-mobile.webp','preview-night-archive-mobile.webp','music-case-v043.glb','placeholder.svg','cover-blog.webp','cover-minecraft.webp','cover-stronghold.webp'];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function contentPlugin(root=process.cwd()) {
 let snapshot;
 const read=()=>snapshot??=loadProject(root).then(async p=>({project:p,...await compileProject(p)}));
 return {
  name:'mima-content',
  async buildStart(){await read();},
  async transformIndexHtml(html){
   const {manifest}=await read(),s=manifest.site;
   const tokens={SITE_TITLE:s.title,SITE_NAME:s.name,SITE_DESCRIPTION:s.description,REGISTRATION_TEXT:s.registration.text,REGISTRATION_URL:s.registration.url,DEFAULT_THEME:s.defaults.theme};
   for(const item of s.navigation){tokens[`LINK_${item.id}`]=item.url;tokens[`LABEL_${item.id}`]=item.title;}
   const nav=`<nav aria-label="外部链接">${s.navigation.map((item,i)=>`<a href="${escape(item.url)}" data-link="${i}" data-nav-id="${item.id}" target="_blank" rel="noopener noreferrer"><span class="link-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span>${escape(item.title)}</span><span class="arrow" aria-hidden="true">↗</span></a>`).join('')}</nav>`;
   const selectors=s.navigation.map((item,i)=>`<button type="button" data-select="${i}" aria-label="选择 ${escape(item.title)}" aria-pressed="${i===0}"><span></span></button>`).join('');
   html=html.replace(/(<div class="selector"[^>]*>)[\s\S]*?(<\/div>)/,`$1${selectors}$2`);
   html=html.replace(/<nav aria-label="外部链接">[\s\S]*?<\/nav>/,nav);
   return html.replace(/__([A-Z_a-z]+)__/g,(all,key)=>key in tokens?escape(tokens[key]):all).replace('<!--SITE_CONFIG-->',`<script id="site-config" type="application/json">${JSON.stringify(s).replaceAll('<','\\u003c')}</script>`);
  },
  async generateBundle(){const {outputs,publicFiles}=await read();for(const [fileName,source]of Object.entries(outputs))this.emitFile({type:'asset',fileName,source});
   const files=new Set([...publicFiles,...coreAssets.map(x=>`assets/${x}`),'_headers',...(await readdir(path.join(root,'public/licenses'))).map(x=>`licenses/${x}`)]);
   for(const fileName of files)this.emitFile({type:'asset',fileName,source:await readFile(path.join(root,'public',fileName))});
  },
  configureServer(server){
   server.watcher.add([`${root}/content`,`${root}/generated`]);
   let reloadTimer;
   const reload=file=>{const relative=path.relative(root,file).split(path.sep).join('/');if(relative.startsWith('content/')||relative.startsWith('generated/')){snapshot=undefined;clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>{snapshot=undefined;read().then(()=>server.ws.send({type:'full-reload',path:'*'})).catch(error=>server.ws.send({type:'error',err:{message:error.message,stack:''}}));},60);}};
   server.watcher.on('change',reload).on('add',reload).on('unlink',reload);
   server.middlewares.use(async(req,res,next)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(!pathname.startsWith('/data/'))return next();
    try{const {outputs}=await read(),body=outputs[pathname.slice(1)];if(body===undefined)return next();res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(body);}catch(error){res.statusCode=422;res.end(JSON.stringify({error:error.message}));}
   });
  }
 };
}
