const $=selector=>document.querySelector(selector),labels={settings:'网站设置',friends:'友链',characters:'OC 人物',music:'音乐',blog:'博客 / 朝花夕拾',social:'X 通讯',sync:'同步来源'},types={friends:'friend',characters:'character',music:'music',blog:'blog',social:'social'};
let state,active='friends',dirty=false;
const clone=value=>structuredClone(value),json=value=>JSON.stringify(value,null,2)+'\n';
const fileDoc=file=>JSON.parse(state.files[file]);
const clean=item=>Object.fromEntries(Object.entries(item).filter(([key])=>!key.startsWith('_')&&key!=='module'));
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function message(text,error=false){$('#status').textContent=text;$('#status').className=error?'error':'';}
function button(text,action,className){const b=el('button',text,className);b.type='button';b.onclick=()=>Promise.resolve(action()).catch(e=>message(e.message,true));return b;}
async function api(path,data){const response=await fetch(`/api/${path}`,{method:'POST',headers:{'content-type':'application/json','x-studio-token':state.token},body:JSON.stringify(data)}),result=await response.json();if(!response.ok)throw Error(result.error);return result;}
async function reload(){state=await(await fetch('/api/state')).json();if(state.error)throw Error(state.error);$('#preview').href=state.previewUrl;dirty=false;render();}
async function save(changes){await api('save',{changes,revision:state.revision});await reload();message('已保存到项目文件，并建立本地恢复副本。可打开“预览已保存网页”检查。');}
function root(title){const container=$('#content');container.replaceChildren(el('h2',title));return container;}
function field(form,label,key,value,{type='text',options,area=false,jsonValue=false}={}){
 const wrapper=el('label',label),input=el(options?'select':area?'textarea':'input');input.name=key;
 if(options)for(const option of options){const o=el('option',typeof option==='string'?option:option.label);o.value=typeof option==='string'?option:option.value;input.append(o);}
 if(!options&&!area)input.type=type;
 if(type==='checkbox'){wrapper.className='check';input.checked=!!value;wrapper.prepend(input);}else{input.value=jsonValue?JSON.stringify(value||[],null,2):value??'';wrapper.append(input);}
 if(jsonValue)input.className='json';input.addEventListener('input',()=>dirty=true);form.append(wrapper);
 return ()=>type==='checkbox'?input.checked:type==='number'?Number(input.value):jsonValue?JSON.parse(input.value||'[]'):input.value.trim();
}
function render(){
 const nav=$('#modules');nav.replaceChildren();for(const [id,label]of Object.entries(labels)){const b=button(label,()=>{if(dirty&&!confirm('有尚未保存的编辑，放弃后切换？'))return;dirty=false;active=id;render();});b.setAttribute('aria-current',String(active===id));nav.append(b);}
 if(active==='settings')settings();else if(active==='sync')syncView();else records();
}
function records(){
 const container=root(labels[active]),toolbar=el('div',undefined,'toolbar'),search=el('input');search.type='search';search.placeholder='搜索名称、歌手、分组或标签';search.setAttribute('aria-label','搜索档案');toolbar.append(search,button('新增档案',()=>edit()));container.append(toolbar);
 if(active==='music'){toolbar.append(button('合并 / 拆分 / 禁止合并',musicMappings));const upload=el('input');upload.type='file';upload.accept='.json,application/json';upload.setAttribute('aria-label','导入本人音乐导出 JSON');const platform=el('select');platform.setAttribute('aria-label','导入平台');for(const [value,label]of [['netease','网易云导出'],['youtube','YouTube Music 导出']]){const o=el('option',label);o.value=value;platform.append(o);}toolbar.append(platform,upload);upload.onchange=async()=>{if(!upload.files[0])return;try{const data=JSON.parse(await upload.files[0].text());const result=await api('import-music',{platform:platform.value,data});await reload();message(`已导入 ${result.count} 首歌曲；此为本人导出数据，不是新产生的播放记录。`);}catch(e){message(e.message,true);}};}
 const list=el('div');container.append(list);
 let dragged;
 const all=state.records.filter(x=>x.module===active).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(a.order??100)-(b.order??100)||a.id.localeCompare(b.id));
 function paint(){list.replaceChildren();const query=search.value.toLowerCase();for(const item of all.filter(x=>[x.title,x.artist,x.group,...(x.tags||[])].join(' ').toLowerCase().includes(query))){
  const row=el('div',undefined,'record');row.dataset.id=item.id;row.draggable=true;row.ondragstart=()=>dragged=item.id;row.ondragover=e=>e.preventDefault();row.ondrop=async e=>{e.preventDefault();if(!dragged||dragged===item.id)return;try{const ids=all.map(x=>x.id),from=ids.indexOf(dragged),to=ids.indexOf(item.id);ids.splice(to,0,ids.splice(from,1)[0]);await reorder(ids);}catch(e){message(e.message,true);}};
  const img=el('img');img.src=item.thumbnail||item.image||'/assets/placeholder.svg';img.alt='';img.loading='lazy';img.onerror=()=>img.src='/assets/placeholder.svg';
  const text=el('div');text.append(el('strong',item.title),el('p',[item.artist,item.group,item._origin==='automatic'?'自动缓存':'手动内容',item._overridden?'人工覆盖':'',item._deleted?'永久隐藏':item.published===false?'隐藏':'',item.featured?'首页精选':'',item.pinned?'置顶':''].filter(Boolean).join(' · ')),el('small',item.id));
  const actions=el('div',undefined,'actions');actions.append(button('编辑',()=>edit(item)),button(item._deleted||item.published===false?'恢复显示':'隐藏',()=>patchItem(item,{published:item._deleted||item.published===false})),button('↑',async()=>{const ids=all.map(x=>x.id),i=ids.indexOf(item.id);if(i>0){[ids[i-1],ids[i]]=[ids[i],ids[i-1]];await reorder(ids);}}));
  row.append(img,text,actions);list.append(row);
 }if(!list.children.length)list.append(el('p','暂无条目。可手动新增，也可在“同步来源”配置公开来源。','muted'));}
 search.oninput=paint;paint();
 const status=state.status.filter(s=>state.sync.sources.some(x=>x.id===s.source&&x.module===active));for(const s of status)container.append(el('p',`${s.source} · 上次成功 ${s.lastSuccessfulAt||'尚未同步'}${s.error?' · '+s.error:''}`,'muted'));
}
function itemChanges(item,patch){
 const changes={},manualFile=`content/records/${active}.json`,manual=fileDoc(manualFile),index=manual.items.findIndex(x=>x.id===item.id);
 if(index>=0){manual.items[index]={...manual.items[index],...patch};changes[manualFile]=json(manual);}
 else {const overrides=fileDoc('content/overrides.json'),entry=overrides.items.find(x=>x.id===item.id);if(entry)entry.patch={...entry.patch,...patch};else overrides.items.push({id:item.id,patch});changes['content/overrides.json']=json(overrides);}
 const tombstones=fileDoc('content/tombstones.json');if(patch.published===true&&tombstones.ids.includes(item.id)){tombstones.ids=tombstones.ids.filter(x=>x!==item.id);changes['content/tombstones.json']=json(tombstones);}return changes;
}
async function patchItem(item,patch){await save(itemChanges(item,patch));}
async function reorder(ids){
 const manualFile=`content/records/${active}.json`,manual=fileDoc(manualFile),overrides=fileDoc('content/overrides.json');
 ids.forEach((id,index)=>{const record=manual.items.find(x=>x.id===id),patch={order:(index+1)*10};if(record)Object.assign(record,patch);else{const entry=overrides.items.find(x=>x.id===id);if(entry)Object.assign(entry.patch,patch);else overrides.items.push({id,patch});}});
 await save({[manualFile]:json(manual),'content/overrides.json':json(overrides)});
}
function edit(existing){
 const isNew=!existing,item=existing?clean(existing):{id:'',type:types[active],title:'',description:'',published:true,featured:false,pinned:false,archived:false,order:100,modes:['focus','archive'],image:'/assets/placeholder.svg'},container=root(isNew?`新增${labels[active]}`:`编辑 · ${item.title}`),form=el('form');container.append(form);
 const grid=el('div',undefined,'grid'),read={};form.append(grid);
 read.id=field(grid,'稳定 ID（小写英文、数字、短横线）','id',item.id);grid.querySelector('[name=id]').readOnly=!isNew;
 read.title=field(grid,'名称 / 标题','title',item.title);read.url=field(grid,'来源或跳转 HTTPS 地址','url',item.url,{type:'url'});
 read.order=field(grid,'排序（较小靠前）','order',item.order??100,{type:'number'});read.description=field(form,'简介 / 展示摘要','description',item.description,{area:true});
 read.group=field(grid,'分组','group',item.group);read.tags=field(grid,'标签（中文逗号或英文逗号分隔；可填朝花夕拾）','tags',(item.tags||[]).join('，'));
 const checks=el('div',undefined,'checks');form.append(checks);for(const [key,label]of [['published','公开显示'],['featured','首页精选'],['pinned','置顶'],['archived','归档']])read[key]=field(checks,label,key,item[key],{type:'checkbox'});
 const modes=el('div',undefined,'checks');form.append(modes);const focus=field(modes,'FOCUS','focus',item.modes?.includes('focus')??true,{type:'checkbox'}),archive=field(modes,'ARCHIVE','archive',item.modes?.includes('archive')??true,{type:'checkbox'});
 form.append(el('h3','图片'));const picture=el('img',undefined,'image-preview');picture.src=item.image;picture.alt='当前档案图片';form.append(picture);
 const image=field(form,'本地图片路径','image',item.image),media=el('select');media.setAttribute('aria-label','选择已有图片');const initial=el('option','选择已有图片…');initial.value='';media.append(initial);for(const path of state.media.filter(x=>x.endsWith('-768.webp')||!/-\d+\.webp$/.test(x))){const option=el('option',path);option.value=path;media.append(option);}media.onchange=()=>{if(media.value){form.elements.image.value=media.value;picture.src=media.value;delete item.thumbnail;delete item.imageLarge;dirty=true;}};form.append(media);
 const upload=el('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp,image/avif,image/gif';upload.setAttribute('aria-label','上传图片');upload.onchange=async()=>{const file=upload.files[0];if(!file)return;try{message('正在生成本地 WebP 图片…');const group={friends:'friends',characters:'characters',music:'albums'}[active]||'archive',response=await fetch(`/api/upload?group=${group}`,{method:'POST',headers:{'x-studio-token':state.token},body:file}),data=await response.json();if(!response.ok)throw Error(data.error);Object.assign(item,data);form.elements.image.value=data.image;picture.src=data.image;dirty=true;message('图片已生成；保存档案后才会用于网页。');}catch(e){message(e.message,true);}};form.append(upload);
 read.image=image;
 if(active==='characters'){
  form.append(el('h3','人物设定'));const bodyFile=item.bodyFile||`characters/${item.id||'new'}.md`;read.body=field(form,'详细设定（Markdown）','body',state.files[`content/${bodyFile}`]||'',{area:true});form.elements.body.className='markdown';
  read.relations=field(form,'人物关系 JSON：targetId、label、public','relations',item.relations,{area:true,jsonValue:true});read.artworks=field(form,'更多立绘 JSON：image、caption、attribution、public','artworks',item.artworks,{area:true,jsonValue:true});read.articleLinks=field(form,'设定文章 JSON：title、url','articleLinks',item.articleLinks,{area:true,jsonValue:true});
 }
 if(active==='music'){
  form.append(el('h3','歌曲与平台'));for(const [key,label]of [['artist','歌手（必填）'],['album','专辑'],['isrc','ISRC（已知时填写）'],['version','版本，如 Live / Remix']])read[key]=field(form,label,key,item[key]);read.duration=field(form,'时长（秒，未知留空）','duration',item.duration,{type:'number'});
  read.platformLinks=field(form,'平台链接 JSON：platform、url、confirmed（人工确认填 true）','platformLinks',item.platformLinks,{area:true,jsonValue:true});
  for(const [platform,label]of [['apple','Apple Music'],['netease','网易云音乐'],['youtube','YouTube Music']])read[`link-${platform}`]=field(form,`${label} 歌曲 URL（人工确认）`,`link-${platform}`,item.platformLinks?.find(x=>x.platform===platform)?.url,{type:'url'});
  form.append(el('p','人工修正的链接保存在内容层，不会被自动同步覆盖。合并与拆分工具见音乐列表。','muted'));
 }
 form.append(el('h3','来源与权利'));const sourceURL=field(form,'来源 HTTPS URL','sourceUrl',item.source?.url),attribution=field(form,'作者 / 绘者 / 来源署名','attribution',item.source?.attribution),license=field(form,'图片授权或使用范围说明','license',item.source?.license);
 const actions=el('div',undefined,'actions');form.append(actions);const submit=el('button','校验并保存','primary');submit.type='submit';actions.append(submit,button('返回列表',()=>{if(dirty&&!confirm('放弃尚未保存的编辑？'))return;dirty=false;render();}));
 if(existing)actions.append(button('永久隐藏（可恢复）',async()=>{const tombstones=fileDoc('content/tombstones.json');if(!tombstones.ids.includes(item.id))tombstones.ids.push(item.id);await save({'content/tombstones.json':json(tombstones)});},'danger'));
 if(existing?._overridden)actions.append(button('解除全部人工覆盖',async()=>{const overrides=fileDoc('content/overrides.json');overrides.items=overrides.items.filter(x=>x.id!==item.id);await save({'content/overrides.json':json(overrides)});}));
 form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{
  const next=clone(item);for(const [key,get]of Object.entries(read)){if(['body','tags','duration'].includes(key)||key.startsWith('link-'))continue;const value=get();if(value===''&&!['title','id','image','description'].includes(key))delete next[key];else next[key]=value;}
  if(active==='music')for(const platform of ['apple','netease','youtube']){const url=read[`link-${platform}`](),before=item.platformLinks?.find(x=>x.platform===platform)?.url;if(url!==before&&url){next.platformLinks=(next.platformLinks||[]).filter(x=>x.platform!==platform);next.platformLinks.push({platform,url,confirmed:true});}}
  if(image()!==item.image){delete next.thumbnail;delete next.imageLarge;}
  next.tags=read.tags().split(/[,，]/).map(x=>x.trim()).filter(Boolean);next.modes=[...(focus()?['focus']:[]),...(archive()?['archive']:[])];next.updatedAt=new Date().toISOString();
  if(read.duration){if(form.elements.duration.value)next.duration=read.duration();else delete next.duration;}
  if(sourceURL())next.source={url:sourceURL(),attribution:attribution(),license:license()};else delete next.source;
  if(read.body)next.bodyFile=next.bodyFile||`characters/${next.id}.md`;
  let changes;
  if(isNew){const file=`content/records/${active}.json`,doc=fileDoc(file);doc.items.push(next);changes={[file]:json(doc)};}else {const file=`content/records/${active}.json`,doc=fileDoc(file),index=doc.items.findIndex(x=>x.id===next.id);if(index>=0){doc.items[index]=next;changes={[file]:json(doc)};}else{const patch={};for(const [key,value]of Object.entries(next))if(!['id','type'].includes(key)&&JSON.stringify(value)!==JSON.stringify(existing[key]))patch[key]=value;changes=itemChanges(existing,patch);}}
  if(read.body)changes[`content/${next.bodyFile}`]=read.body()+'\n';
  await save(changes);
 }catch(e){message(e.message,true);}finally{submit.disabled=false;}};
}
function musicMappings(){
 const container=root('音乐录音映射'),form=el('form');container.append(el('p','这里操作歌曲录音的关系，不会伪造或删除真实播放事件。人工决定保存在 overrides，优先于再次同步。','muted'),form);
 const tracks=state.records.filter(x=>x.type==='music'),options=tracks.map(x=>({value:x.id,label:`${x.title} · ${x.artist} [${x.id}]`}));
 if(!tracks.length){container.append(el('p','先手动添加或导入歌曲。'));return;}
 const from=field(form,'歌曲 A','merge-from',tracks[0].id,{options}),to=field(form,'歌曲 B / 合并后的主记录','merge-to',tracks[1]?.id||tracks[0].id,{options});
 const group=id=>state.canonicalTracks.find(x=>x.aliasIds.includes(id))?.aliasIds||[id];
 async function mapping(kind){
  const a=from(),b=to();if(a===b&&kind!=='split')throw Error('请选择两条不同的记录');
  const overrides=fileDoc('content/overrides.json');
  function patch(id,value){const entry=overrides.items.find(x=>x.id===id);if(entry)Object.assign(entry.patch,value);else overrides.items.push({id,patch:value});}
  if(kind==='merge'){for(const id of new Set([...group(a),...group(b)]))patch(id,{canonicalId:b,mergeLocked:true});}
  if(kind==='split'){
   const members=group(a),rest=members.filter(id=>id!==a),other=rest[0];
   patch(a,{canonicalId:a,mergeLocked:true,neverMergeWith:rest});for(const id of rest)patch(id,{canonicalId:other,mergeLocked:true,neverMergeWith:[...(tracks.find(x=>x.id===id)?.neverMergeWith||[]),a].filter((x,i,array)=>array.indexOf(x)===i)});
  }
  if(kind==='never'){if(group(a).includes(b))throw Error('两条已在同组，请先拆分 A');patch(a,{mergeLocked:true,neverMergeWith:[...new Set([...(tracks.find(x=>x.id===a)?.neverMergeWith||[]),b])]});patch(b,{mergeLocked:true,neverMergeWith:[...new Set([...(tracks.find(x=>x.id===b)?.neverMergeWith||[]),a])]});}
  await save({'content/overrides.json':json(overrides)});musicMappings();
 }
 const actions=el('div',undefined,'actions');actions.append(button('将 A 合并到 B',()=>mapping('merge'),'primary'),button('从当前组拆分 A',()=>mapping('split')),button('禁止 A 与 B 自动合并',()=>mapping('never')),button('返回音乐列表',()=>render()));form.append(actions);
 container.append(el('h3','当前统一歌曲'));for(const track of state.canonicalTracks){const row=el('div',undefined,'status-row');row.append(el('strong',`${track.title} · ${track.artist}${track._hidden?'（隐藏）':''}`),el('p',`${track.id} ← ${track.aliasIds.join('，')} · ${track.playCount} 条缓存播放事件`));container.append(row);}
}
function settings(){
 const site=clone(state.site),container=root('网站设置'),form=el('form');container.append(form);const read={},grid=el('div',undefined,'grid');form.append(grid);
 read.title=field(grid,'浏览器标题','title',site.title);read.name=field(grid,'个人名称','name',site.name);read.description=field(form,'搜索摘要','description',site.description);
 form.append(el('h3','固定导航'));const navigation=site.navigation.map(nav=>{const block=el('div',undefined,'grid');form.append(block);return {id:nav.id,title:field(block,`${nav.id} 显示名称`,`${nav.id}-title`,nav.title),url:field(block,'HTTPS 地址',`${nav.id}-url`,nav.url),order:field(block,'排序',`${nav.id}-order`,nav.order,{type:'number'})};});
 const registration={text:field(form,'备案文字','registration-text',site.registration.text),url:field(form,'备案链接','registration-url',site.registration.url)};
 form.append(el('h3','默认展示'));const defaults={mode:field(form,'模式','mode',site.defaults.mode,{options:['focus','archive']}),theme:field(form,'主题','theme',site.defaults.theme,{options:['day','night']})};for(const [key,label]of [['intro','开场动画'],['particles','空间粒子'],['parallax','鼠标视差']])defaults[key]=field(form,label,key,site.defaults[key],{type:'checkbox'});
 form.append(el('h3','模块顺序与显示'));const moduleBlocks=el('div');form.append(moduleBlocks);const moduleRead={};
 function modules(){moduleBlocks.replaceChildren();for(const id of site.moduleOrder){const block=el('section',undefined,'module-setting');block.append(el('h3',labels[id]||'固定导航'));const actions=el('div',undefined,'actions');actions.append(button('↑',()=>{collect();const i=site.moduleOrder.indexOf(id);if(i>0){[site.moduleOrder[i-1],site.moduleOrder[i]]=[site.moduleOrder[i],site.moduleOrder[i-1]];dirty=true;modules();}}),button('↓',()=>{collect();const i=site.moduleOrder.indexOf(id);if(i<5){[site.moduleOrder[i+1],site.moduleOrder[i]]=[site.moduleOrder[i],site.moduleOrder[i+1]];dirty=true;modules();}}));block.append(actions);const settings=site.modules[id],get={};moduleRead[id]=get;const checks=el('div',undefined,'checks');block.append(checks);for(const [key,label]of [['enabled','启用模块'],['showInFocus','FOCUS'],['showInArchive','ARCHIVE'],['syncEnabled','允许同步']])get[key]=field(checks,label,`${id}-${key}`,settings[key],{type:'checkbox'});const grid=el('div',undefined,'grid');block.append(grid);get.displayLimit=field(grid,'显示数量',`${id}-limit`,settings.displayLimit,{type:'number'});get.sorting=field(grid,'排序方式',`${id}-sorting`,settings.sorting,{options:[{value:'manual',label:'人工顺序'},{value:'newest',label:'最近日期'},{value:'title',label:'名称'}]});get.refreshInterval=field(grid,'最短同步间隔（小时）',`${id}-refresh`,settings.refreshInterval,{type:'number'});get.fallbackBehavior=field(grid,'来源失败时',`${id}-fallback`,settings.fallbackBehavior,{options:[{value:'cache',label:'保留旧缓存'},{value:'manual',label:'只用手动内容'},{value:'hide',label:'隐藏自动内容'}]});moduleBlocks.append(block);}}
 function collect(){for(const [id,fields]of Object.entries(moduleRead))for(const [key,get]of Object.entries(fields))site.modules[id][key]=get();}modules();
 const submit=el('button','保存网站设置','primary');submit.type='submit';form.append(submit);form.onsubmit=async event=>{event.preventDefault();try{collect();for(const [key,get]of Object.entries(read))site[key]=get();site.navigation=navigation.map(x=>({id:x.id,title:x.title(),url:x.url(),order:x.order()}));site.registration={text:registration.text(),url:registration.url()};site.defaults=Object.fromEntries(Object.entries(defaults).map(([key,get])=>[key,get()]));await save({'content/site.json':json(site)});}catch(e){message(e.message,true);}};
}
function syncView(){
 const container=root('同步来源'),config=clone(state.sync),form=el('form');container.append(el('p','来源和模块的同步开关都开启才会执行。令牌只在 .env.local 或系统环境配置，本页不显示或保存密钥。关闭同步保留缓存。','muted'),form);
 const read=[];for(const source of config.sources){const block=el('section',undefined,'module-setting');block.append(el('h3',`${source.id} · ${source.adapter}`));form.append(block);const fields={};for(const [key,label,type]of [['enabled','启用来源','checkbox'],['username','公开用户名','text'],['url','来源 HTTPS URL','url'],['tokenEnv','密钥环境变量名称','text'],['storefront','Apple 地区（cn/us 等）','text'],['importFile','本地授权导出路径（imports/name.json）','text'],['refreshHours','间隔小时','number'],['maxItems','最多条数','number']])fields[key]=field(block,label,`${source.id}-${key}`,source[key],{type});read.push({source,fields});const status=state.status.find(x=>x.source===source.id);if(status)block.append(el('p',`上次尝试：${status.lastAttemptAt||'无'}\n上次成功：${status.lastSuccessfulAt||'无'}\n条目：${status.count} / 播放事件：${status.events}\n${status.error||'缓存正常'}`,'muted'));block.append(button('同步此来源（使用已保存配置）',async()=>{message('正在同步，期间可继续阅读内容…');const result=await api('sync',{sourceId:source.id});await reload();message(result.map(x=>`${x.id}: ${x.status}${x.error?' · '+x.error:''}`).join('\n'));}));}
 const submit=el('button','保存来源配置','primary');submit.type='submit';form.append(submit);form.onsubmit=async e=>{e.preventDefault();try{for(const {source,fields}of read)for(const [key,get]of Object.entries(fields)){const value=get();if(value===''||typeof value==='number'&&!Number.isFinite(value)||typeof value==='number'&&value===0)delete source[key];else source[key]=value;}await save({'content/sync.json':json(config)});}catch(e){message(e.message,true);}};
}
$('#refresh').onclick=()=>{if(!dirty||confirm('放弃未保存编辑并重新读取？'))reload().catch(e=>message(e.message,true));};
$('#recovery').onclick=()=>{const container=root('恢复本地副本');container.append(el('p','每次保存前都会保留被修改文件的副本。恢复也会建立新副本；Git 提交记录是另一条长期恢复途径。','muted'));for(const id of state.backups){const row=el('div',undefined,'status-row');row.append(el('span',new Date(Number(id.split('-')[0])).toLocaleString('zh-CN')+' '),button('恢复这次保存之前',async()=>{if(!confirm('将相关内容文件恢复到这次保存之前？'))return;await api('restore',{id,revision:state.revision});await reload();message('已恢复，恢复动作自身也有备份。');}));container.append(row);}if(!state.backups.length)container.append(el('p','尚无本地保存副本。'));};
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
reload().catch(e=>message(e.message,true));
