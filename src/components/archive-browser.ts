import { loadCatalog, loadModule, loadBody } from '../content/client';
import type { ArchiveItem, ModuleId, DisplayMode } from '../content/types';
import { markdown } from './markdown';
import { relationGraph } from './relations';
const labels:Record<ModuleId,string>={navigation:'入口',friends:'友链',music:'音乐',blog:'文献',social:'通讯',characters:'人物'};
let lastOpener:HTMLElement|null=null, revision=0;
type BrowserOptions={select:(id:string)=>void;current:()=>string|undefined;mode:()=>DisplayMode};
export async function openArchiveDetail(id:string,options:BrowserOptions){await toggleBrowser(options,id);}
export async function toggleBrowser(options:BrowserOptions,initialId?:string){
 const root=document.querySelector<HTMLElement>('#archive-browser')!,button=document.querySelector<HTMLElement>('#browse')!;
 if(!root.hidden&&!initialId){close();return;}
 lastOpener=document.activeElement as HTMLElement;root.hidden=false;root.dataset.view='list';button.setAttribute('aria-expanded','true');root.focus();
 function close(){revision++;root.hidden=true;button.setAttribute('aria-expanded','false');lastOpener?.focus();}
 root.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}};
 const header=document.createElement('div');header.className='archive-browser-header';
 const title=document.createElement('h2');title.textContent='PERSONAL ARCHIVE';
 const exit=document.createElement('button');exit.type='button';exit.className='archive-close';exit.textContent='×';exit.setAttribute('aria-label','关闭内容档案');exit.onclick=close;header.append(title,exit);
 const tabs=document.createElement('div');tabs.className='archive-modules';tabs.setAttribute('aria-label','内容类别');
 const workspace=document.createElement('div');workspace.className='archive-workspace';workspace.dataset.detail='false';
 const body=document.createElement('div');body.className='archive-browser-content';
 const detailBody=document.createElement('div');detailBody.className='archive-detail';detailBody.hidden=true;detailBody.setAttribute('role','region');detailBody.setAttribute('aria-label','档案详情');
 workspace.append(body,detailBody);root.replaceChildren(header,tabs,workspace);
 body.textContent='正在读取本地档案…';
 try{
  const catalog=await loadCatalog();
  const available=catalog.site.moduleOrder.filter(id=>catalog.site.modules[id].enabled&&(options.mode()==='focus'?catalog.site.modules[id].showInFocus:catalog.site.modules[id].showInArchive)&&catalog.items.some(item=>item.module===id&&item.modes.includes(options.mode())));
  if(!available.length){body.textContent='尚无公开档案。';return;}
  let active:ModuleId=available[0];
  const show=async(module:ModuleId,detailId?:string)=>{
   const token=++revision;active=module;root.dataset.view='list';workspace.dataset.detail='false';detailBody.hidden=true;detailBody.replaceChildren();
   tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.module===module)));
   body.replaceChildren();body.textContent='正在读取本地档案…';
   try{
    const items=(await loadModule(module)).filter(item=>item.modes.includes(options.mode()));if(token!==revision||root.hidden)return;
    body.replaceChildren();
    const list=document.createElement('div');list.className='archive-list';body.append(list);
    if(module==='friends'||module==='characters'){
     const filters=document.createElement('div');filters.className='archive-filters';
     const graph=document.createElement('div');graph.hidden=true;body.append(graph);
     for(const [label,network]of [['列表',false],['关系',true]] as const){const filter=document.createElement('button');filter.textContent=label;filter.setAttribute('aria-pressed',String(!network));filter.onclick=()=>{list.hidden=network;graph.hidden=!network;if(network&&!graph.childNodes.length)graph.append(relationGraph(items,catalog.site.name,item=>{options.select(item.id);void detail(item);}));filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));};filters.append(filter);}body.prepend(filters);
    }
    let byAlbum=false;
    if(module==='music'){
     const filters=document.createElement('div');filters.className='archive-filters';
     for(const [label,value]of [['歌曲',false],['专辑',true]] as const){const filter=document.createElement('button');filter.textContent=label;filter.setAttribute('aria-pressed',String(!value));filter.onclick=()=>{byAlbum=value;filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));list.querySelectorAll('.archive-album-heading').forEach(n=>n.remove());const order=byAlbum?[...items].sort((a,b)=>(a.album||'未标注专辑').localeCompare(b.album||'未标注专辑','zh-CN')):items;let last='';for(const item of order){const card=list.querySelector<HTMLElement>(`[data-archive-id="${item.id}"]`);if(!card)continue;if(byAlbum&&(item.album||'未标注专辑')!==last){last=item.album||'未标注专辑';const heading=document.createElement('h4');heading.className='archive-album-heading';heading.textContent=last;list.append(heading);}list.append(card);}};filters.append(filter);}body.prepend(filters);
    }
    if(module==='blog'){
     const filters=document.createElement('div');filters.className='archive-filters';
     for(const [label,tag]of [['全部',''],['朝花夕拾','朝花夕拾']]){const filter=document.createElement('button');filter.textContent=label;filter.onclick=()=>{for(const card of list.querySelectorAll<HTMLElement>('[data-archive-id]'))card.hidden=!!tag&&!items.find(x=>x.id===card.dataset.archiveId)?.tags?.includes(tag);filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));};filter.setAttribute('aria-pressed',String(!tag));filters.append(filter);}body.prepend(filters);
    }
    for(const item of items){
     const card=document.createElement('button');card.type='button';card.className='archive-card';card.dataset.archiveId=item.id;
     const img=document.createElement('img');img.src=localImage(item.thumbnail||item.image);img.alt='';img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src=localImage('/assets/placeholder.svg');};
     const text=document.createElement('span'),name=document.createElement('strong'),description=document.createElement('small');name.textContent=item.title;description.textContent=item.description;
     text.append(name,description);card.append(img,text);card.onclick=()=>{options.select(item.id);void detail(item);};list.append(card);
    }
    if(!items.length)body.textContent='此类别暂时没有公开档案。';
    if(detailId){const item=items.find(x=>x.id===detailId);if(item)await detail(item);}
   }catch{if(token===revision)body.textContent='本地档案读取失败，请稍后重新打开。';}
  };
  async function detail(item:ArchiveItem){
   const token=++revision;root.dataset.view='companion';workspace.dataset.detail='true';detailBody.hidden=false;detailBody.replaceChildren();detailBody.scrollTop=0;
   body.querySelectorAll<HTMLElement>('[data-archive-id]').forEach(card=>card.setAttribute('aria-current',String(card.dataset.archiveId===item.id)));
   const back=document.createElement('button');back.type='button';back.textContent='← 返回列表';back.className='archive-back';back.onclick=()=>{if(root.dataset.view==='reading'){root.dataset.view='companion';full.hidden=true;read.hidden=false;back.textContent='← 返回列表';read.focus();return;}revision++;root.dataset.view='list';detailBody.hidden=true;workspace.dataset.detail='false';body.querySelector<HTMLButtonElement>(`[data-archive-id="${item.id}"]`)?.focus();};
   const h=document.createElement('h3');h.textContent=item.title;h.tabIndex=-1;
   const img=document.createElement('img');img.src=localImage(item.imageLarge||item.image);img.alt=item.title;img.loading='lazy';img.onerror=()=>{img.onerror=null;img.src=localImage('/assets/placeholder.svg');};
   const description=document.createElement('p');description.textContent=item.description;const read=document.createElement('button');read.type='button';read.className='archive-read';read.textContent='阅读完整档案 ↗';const full=document.createElement('div');full.className='archive-full';full.hidden=true;read.onclick=()=>{root.dataset.view='reading';full.hidden=false;read.hidden=true;back.textContent='← 返回摘要';detailBody.scrollTop=0;h.focus({preventScroll:true});};full.append(img);detailBody.append(back,h,description,read,full);
   h.focus({preventScroll:true});
   const metadata=[item.artist,item.album,item.publishedAt?new Date(item.publishedAt).toLocaleDateString('zh-CN'):undefined,item.lastPlayedAt?`最近收听 ${new Date(item.lastPlayedAt).toLocaleString('zh-CN')}`:undefined].filter(Boolean);
   if(metadata.length){const p=document.createElement('p');p.className='archive-meta';p.textContent=metadata.join(' · ');full.append(p);}
   for(const link of [{title:'打开来源 ↗',url:item.url},...(item.platformLinks||[]).map(x=>({title:x.platform+' ↗',url:x.url})),...(item.articleLinks||[])])if(link.url&&safeLink(link.url)){const a=document.createElement('a');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=link.title;full.append(a,document.createElement('br'));}
   if(item.bodyUrl){try{const content=await loadBody(item.bodyUrl);if(token!==revision)return;full.append(markdown(content.markdown));}catch{const p=document.createElement('p');p.textContent='详细设定暂不可用，仍可打开来源页面。';full.append(p);}}
   if(token!==revision)return;
   for(const art of item.artworks||[]){if(art.image===(item.imageLarge||item.image))continue;const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=localImage(art.image);image.alt=art.caption||item.title;image.loading='lazy';caption.textContent=[art.caption,art.attribution].filter(Boolean).join(' · ');figure.append(image,caption);full.append(figure);}
   for(const relation of item.relations||[]){const target=catalog.items.find(x=>x.id===relation.targetId);if(!target)continue;const button=document.createElement('button');button.className='archive-relation';button.textContent=`${relation.label} → ${target.title}`;button.onclick=async()=>{const next=(await loadModule(target.module)).find(x=>x.id===target.id);if(next){options.select(next.id);void show(target.module,next.id);}};full.append(button);}
   if(item.source){const credit=document.createElement('p');credit.className='archive-credit';credit.textContent=[item.source.attribution,item.source.license].filter(Boolean).join(' · ');full.append(credit);}
   if(item.module==='social'&&item.url){const u=new URL(item.url);if(['x.com','twitter.com'].includes(u.hostname)&&/^\/[A-Za-z0-9_]{1,15}\/?$/.test(u.pathname)){const load=document.createElement('button');load.className='archive-relation';load.textContent='载入 X 官方时间线';const timeline=document.createElement('div');load.onclick=async()=>{load.disabled=true;load.textContent='正在连接 X…';try{const{showTimeline}=await import('./x-timeline');await showTimeline(u.pathname.replaceAll('/',''),timeline);load.hidden=true;}catch{load.disabled=false;load.textContent='连接不可用，重试或打开来源';}};full.append(load,timeline);}}
  }
  for(const module of available){const tab=document.createElement('button');tab.type='button';tab.dataset.module=module;tab.textContent=labels[module];tab.onclick=()=>{body.classList.remove('archive-detail');void show(module);};tabs.append(tab);}
  if(initialId){const module=catalog.items.find(item=>item.id===initialId)?.module;if(module)await show(module,initialId);else void show(active);}else void show(active);
 }catch{body.textContent='档案目录暂不可用，底部入口仍可正常使用。';}
}
const localImage=(image:string)=>`${import.meta.env.BASE_URL}${image.replace(/^\//,'')}`;
const safeLink=(url:string)=>{try{return new URL(url).protocol==='https:';}catch{return false;}};
