import { siteConfig, loadCatalog, loadModule, fallbackCatalog } from './content/client';
import type { Catalog, DisplayMode, ModuleId, ArchiveItem } from './content/types';
import type { SceneController, Theme } from './scene';
import { defaultGraphicsLevel, isGraphicsLevel, type GraphicsLevel } from './config/graphics';
const root = document.documentElement;
const host = document.querySelector<HTMLElement>('#scene')!;
const query = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let graphicsLevel = defaultGraphicsLevel(), graphicsLocked = false;
try { const saved=localStorage.getItem('mima-quality'); if(isGraphicsLevel(saved)){graphicsLevel=saved;graphicsLocked=true;} } catch {}
let catalog:Catalog = fallbackCatalog();
const modeQuery=new URLSearchParams(location.search).get('mode');
let savedMode:string|null=null, desiredSelectionId:string|undefined;
try{savedMode=localStorage.getItem('mima-mode');desiredSelectionId=localStorage.getItem('mima-selected')||undefined;}catch{}
let mode:DisplayMode=(modeQuery==='focus'||modeQuery==='archive')?modeQuery:(savedMode==='focus'||savedMode==='archive')?savedMode:siteConfig.defaults.mode;
const loadedModules=new Set<ModuleId>(['navigation']);
const hydratedModules=new Map<ModuleId,ArchiveItem[]>();
const visibleIndices=()=>catalog.items.flatMap((item,i)=>{
 const config=siteConfig.modules[item.module];
 const eligible=config.enabled&&item.modes.includes(mode)&&(mode==='focus'?config.showInFocus:config.showInArchive);
 return eligible&&(mode==='archive'||item.featured||item.id===desiredSelectionId)?[i]:[];
});
function syncModeUI(){
 root.dataset.mode=mode;
 document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
 controller?.visibility(visibleIndices().map(i=>catalog.items[i].id));
}
async function hydrate(module:ModuleId){
 if(loadedModules.has(module))return;
 try{const items=await loadModule(module);loadedModules.add(module);hydratedModules.set(module,items);controller?.hydrate(items);}catch{ /* Catalog and placeholder stay available. */ }
}
let reduced = reducedQuery.matches, theme: Theme = root.dataset.theme === 'night' ? 'night' : 'day';
let selected = 0, extracted = false, controller: SceneController | undefined;
let loadAbort: AbortController | undefined, loadTask: Promise<void> | undefined, pageDisposed = false;
const selectors = [...document.querySelectorAll<HTMLButtonElement>('[data-select]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-link]')];
const themeButton = query<HTMLButtonElement>('#theme');
const auth = query<HTMLElement>('#auth');
let introTimers: ReturnType<typeof setTimeout>[] = [];
let introRevision = 0;
let moduleFailed = false;
performance.mark('mima:shell');
// Record the decoded preview's next paint separately from the name's LCP.
const previewImage = query<HTMLImageElement>('#preview img');
const markPreview = () => void previewImage.decode().then(() => requestAnimationFrame(() => {
  if (!performance.getEntriesByName('mima:preview-visible').length) performance.mark('mima:preview-visible');
})).catch(() => { /* Paper and links remain usable even when the preview fails. */ });
previewImage.addEventListener('load', markPreview);
markPreview();

function setTheme(value: Theme, persist = true) {
  theme = value; root.dataset.theme = value;
  themeButton.setAttribute('aria-pressed', String(value === 'night'));
  themeButton.setAttribute('aria-label', value === 'day' ? '切换至暗色主题' : '切换至亮色主题');
  query<HTMLMetaElement>('meta[name=theme-color]').content = value === 'day' ? '#eae5e1' : '#07111f';
  const picture = query<HTMLPictureElement>('#preview');
  const img = picture.querySelector('img')!;
  const source = picture.querySelector('source')!;
  const url = (suffix: string) => `${import.meta.env.BASE_URL}assets/preview-${value}${suffix}.webp`;
  if (!img.getAttribute('src')?.includes(`preview-${value}.webp`)) img.src = url('');
  source.srcset = url('-mobile');
  try { if(persist) localStorage.setItem('mima-theme', value); } catch { /* Privacy mode keeps an in-memory theme. */ }
  controller?.theme(value);
}
function select(index: number, persist = true) {
  if(!catalog.items.length||index<0)return;
  selected = (index + catalog.items.length) % catalog.items.length;
  selectors.forEach((el, i) => el.setAttribute('aria-pressed', String(catalog.items[selected]?.id === `portal-${siteConfig.navigation[i]?.id}`)));
  links.forEach((el, i) => { el.dataset.active = String(catalog.items[selected]?.id === `portal-${siteConfig.navigation[i]?.id}`); });
  if(persist){desiredSelectionId=catalog.items[selected].id;try{localStorage.setItem('mima-selected',desiredSelectionId);}catch{}}
  syncModeUI();void hydrate(catalog.items[selected].module);
  controller?.skip(); controller?.select(selected);
  if (extracted) controller?.extract(true);
}
function extract(value: boolean) {
  extracted = value; query('#extract').setAttribute('aria-pressed', String(value));
  query('#extract').setAttribute('aria-label', value ? '归位当前档案' : '抽取当前档案');
  controller?.skip(); controller?.extract(value);
}
function finishIntro() {
  const hadFocus = auth.contains(document.activeElement);
  introRevision++;
  introTimers.forEach(clearTimeout); introTimers = [];
  auth.hidden = true; auth.classList.remove('playing', 'leaving');
  controller?.skip();
  if (hadFocus) query<HTMLButtonElement>('#replay').focus({ preventScroll: true });
}
function startIntro(replay: boolean) {
  finishIntro();
  if (reduced || (!replay && !siteConfig.defaults.intro)) return;
  const revision = introRevision;
  auth.hidden = false; auth.classList.add('playing');
  query('#auth-status').textContent = 'ESTABLISHING CONNECTION';
  if (replay) { extract(false); controller?.replay(); }
  introTimers.push(setTimeout(() => { if (revision === introRevision) query('#auth-status').textContent = 'VERIFYING VISITOR ID'; }, 650));
  introTimers.push(setTimeout(() => { if (revision === introRevision) query('#auth-status').textContent = 'ACCESS GRANTED'; }, 1500));
  // Cosmetic sequence does not claim real authentication and never blocks the links.
  introTimers.push(setTimeout(() => { if (revision === introRevision) auth.classList.add('leaving'); }, 2400));
  introTimers.push(setTimeout(() => {
    if (revision !== introRevision) return;
    const hadFocus = auth.contains(document.activeElement);
    auth.hidden = true;
    if (hadFocus) query<HTMLButtonElement>('#replay').focus({ preventScroll: true });
  }, 2850));
}
function failScene() {
  loadAbort?.abort(); controller = undefined;
  root.dataset.scene = 'fallback'; query('#fallback').hidden = false;
  performance.mark('mima:fallback');
}
function step(direction:number){const indices=visibleIndices();if(!indices.length)return;const current=indices.indexOf(selected);select(indices[(Math.max(0,current)+direction+indices.length)%indices.length]);}
function setMode(value:DisplayMode,persist=true){
 mode=value;syncModeUI();finishIntro();extract(false);controller?.mode(value);
 if(!visibleIndices().includes(selected)){const first=visibleIndices()[0];if(first!==undefined)select(first,false);}
 if(persist){try{localStorage.setItem('mima-mode',value);}catch{}const url=new URL(location.href);url.searchParams.set('mode',value);history.replaceState(null,'',url);}
}
async function showDetails(id:string){
 finishIntro();extract(true);const {openArchiveDetail}=await import('./components/archive-browser');
 await openArchiveDetail(id,{select: nextId=>{const index=catalog.items.findIndex(item=>item.id===nextId);select(index);},current:()=>catalog.items[selected]?.id,mode:()=>mode});
}
async function loadScene() {
  if (loadTask || pageDisposed || root.dataset.scene === 'ready') return loadTask;
  query('#fallback').hidden = true; root.dataset.scene = 'loading';
  loadAbort = new AbortController();
  const current = loadAbort;
  let didImport = false;
  const aborted = new Promise<never>((_, reject) => current.signal.addEventListener('abort', () => reject(current.signal.reason ?? new Error('Scene load cancelled')), { once: true }));
  const timer = setTimeout(() => current.abort(new Error('Scene load timeout')), 20000);
  loadTask = (async () => {
    try {
      if (new URLSearchParams(location.search).has('static')) throw new Error('Static preview requested');
      performance.mark('mima:scene-request');
      catalog = await loadCatalog().catch(() => fallbackCatalog());
      if (!catalog.items.length) {root.dataset.scene='static';return;}
      const desired=catalog.items.findIndex(item=>item.id===desiredSelectionId||!!desiredSelectionId&&item.aliasIds?.includes(desiredSelectionId));
      selected=desired>=0?desired:(mode==='focus'?catalog.items.findIndex(item=>item.featured&&item.module!=='navigation'):0);
      if(selected<0)selected=0;
      desiredSelectionId=catalog.items[selected].id;
      syncModeUI();
      const valid=visibleIndices();if(!valid.includes(selected)&&valid.length)selected=valid[0];
      const { mountScene } = await Promise.race([import('./scene'), aborted]);
      didImport = true; moduleFailed = false;
      if (current.signal.aborted || pageDisposed) return;
      const next = await Promise.race([mountScene(host, { items:catalog.items.map(item=>({...item,image:loadedModules.has(item.module)?item.image:'/assets/placeholder.svg'})),mode,visibleIds:visibleIndices().map(i=>catalog.items[i].id),name:siteConfig.name,particles:siteConfig.defaults.particles,parallax:siteConfig.defaults.parallax,quality:graphicsLevel,qualityLocked:graphicsLocked,onQualityChange:value=>{graphicsLevel=value;syncGraphicsUI();},theme, reduced, selected, extracted, signal: current.signal,
        onSelect: (index,inspect) => {select(index);if(inspect)void showDetails(catalog.items[index].id);}, onStep: direction => step(direction), onFailure: failScene }), aborted]);
      if (current.signal.aborted || pageDisposed) { next.dispose(); return; }
      controller = next;
      // Apply the latest choices, including changes made during asynchronous loading.
      next.quality(graphicsLevel,graphicsLocked); next.theme(theme); next.reduced(reduced); next.select(selected); next.mode(mode); next.extract(extracted);for(const items of hydratedModules.values())next.hydrate(items);void hydrate(catalog.items[selected].module);
      select(selected,false);
      root.dataset.scene = 'ready'; performance.mark('mima:scene-ready');
      performance.measure('mima:scene-startup', 'mima:scene-request', 'mima:scene-ready');
    } catch (error) {
      moduleFailed = !didImport;
      if (!pageDisposed) { console.warn('[MimaGlows] Static archive retained:', error); failScene(); }
    } finally { clearTimeout(timer); loadTask = undefined; }
  })();
  return loadTask;
}
// Engine is deliberately absent from the static import graph.
const graphicsButton=query<HTMLButtonElement>('#graphics'),graphicsPanel=query<HTMLElement>('#graphics-panel');
function syncGraphicsUI(){
  root.dataset.quality=graphicsLevel;
  document.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.quality===graphicsLevel)));
  query('#graphics-description').textContent=({low:'低 · 精简粒子与光影，节省性能',medium:'中 · SMAA 抗锯齿与柔和光影',high:'高 · SMAA 抗锯齿、精细玻璃与完整粒子'})[graphicsLevel];
}
function closeGraphics(restoreFocus=false){graphicsPanel.hidden=true;graphicsButton.setAttribute('aria-expanded','false');if(restoreFocus)graphicsButton.focus();}
graphicsButton.addEventListener('click',()=>{graphicsPanel.hidden=!graphicsPanel.hidden;graphicsButton.setAttribute('aria-expanded',String(!graphicsPanel.hidden));if(!graphicsPanel.hidden)graphicsPanel.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus();});
graphicsPanel.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();closeGraphics(true);}else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const buttons=[...graphicsPanel.querySelectorAll<HTMLButtonElement>('[data-quality]')],i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(Math.max(0,i)+(event.key==='ArrowRight'?1:2))%3].focus();}});
document.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(button=>button.addEventListener('click',()=>{const level=button.dataset.quality;if(!isGraphicsLevel(level))return;graphicsLevel=level;graphicsLocked=true;try{localStorage.setItem('mima-quality',level);}catch{}controller?.quality(level,true);syncGraphicsUI();}));
document.addEventListener('pointerdown',event=>{if(!(event.target as Element).closest('.graphics-control'))closeGraphics();});
document.addEventListener('focusin',event=>{if(!(event.target as Element).closest('.graphics-control'))closeGraphics();});
syncGraphicsUI();
themeButton.addEventListener('click', () => setTheme(theme === 'day' ? 'night' : 'day'));
query('#extract').addEventListener('click', () => extract(!extracted));
query('#skip').addEventListener('click', finishIntro);
query('#replay').addEventListener('click', () => startIntro(true));
query('#retry').addEventListener('click', () => {
  // Browsers cache failed module imports for this document; a fresh document retries them.
  if (moduleFailed) location.reload();
  else void loadScene();
});
selectors.forEach((button,i)=>button.addEventListener('click',()=>select(catalog.items.findIndex(item=>item.id===`portal-${siteConfig.navigation[i].id}`))));
document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode as DisplayMode)));
links.forEach((link, i) => {
  const activate=()=>{const index=catalog.items.findIndex(item=>item.id===`portal-${siteConfig.navigation[i].id}`);if(index!==selected&&index>=0)select(index);};
  link.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')activate();});
  link.addEventListener('focus',activate);
});
let lastWheel = 0;
host.addEventListener('wheel', event => {
  if (Math.abs(event.deltaY) + Math.abs(event.deltaX) < 8 || event.ctrlKey) return;
  event.preventDefault();
  if (performance.now() - lastWheel < 650) return;
  lastWheel = performance.now(); step(event.deltaY + event.deltaX > 0 ? 1 : -1);
}, { passive: false });
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || (event.target as Element)?.closest('input,textarea,select,[contenteditable=true]')) return;
  const key = event.key.toLowerCase();
  if (key === 'escape') { finishIntro(); extract(false); }
  else if (key.startsWith('arrow') && ['arrowright','arrowleft','arrowup','arrowdown'].includes(key)) {
    event.preventDefault(); step(key === 'arrowright' || key === 'arrowdown' ? 1 : -1);
  } else if (key === 'enter' && !((event.target as Element)?.closest('a,button'))) { event.preventDefault(); extract(!extracted); }
  else if (key === 'd' || key === 'n') setTheme(key === 'd' ? 'day' : 'night');
  else if (key === 'r') startIntro(true);
});
reducedQuery.addEventListener('change', event => {
  reduced = event.matches; if (reduced) finishIntro(); controller?.reduced(reduced);
});
let resizeTimer: ReturnType<typeof setTimeout>;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => {
  if(controller)controller.resize();
  else if(!graphicsLocked){graphicsLevel=defaultGraphicsLevel();syncGraphicsUI();}
}, 120); });
document.addEventListener('visibilitychange', () => { if (document.hidden) controller?.pause(); else controller?.resume(); });
addEventListener('pagehide', event => {
  if (event.persisted) controller?.pause();
  else { pageDisposed = true; loadAbort?.abort(); controller?.dispose(); finishIntro(); }
});
addEventListener('pageshow', event => { if (event.persisted) controller?.resume(); });
setTheme(theme,false);select(0,false);syncModeUI();
query('#browse').addEventListener('click', async () => {
  finishIntro();
  const { toggleBrowser } = await import('./components/archive-browser');
  toggleBrowser({select:id=>{const index=catalog.items.findIndex(x=>x.id===id);if(index>=0)select(index);},current:()=>catalog.items[selected]?.id,mode:()=>mode});
});
// Two paints and a short idle window put HTML + compressed preview ahead of WebGL work.
requestAnimationFrame(() => requestAnimationFrame(() => {
  startIntro(false);
  setTimeout(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) { failScene(); return; }
    void loadScene();
  }, 400);
}));
// Read-only diagnostics for browser QA; no user data, audio or external telemetry.
Object.assign(window, { mima: { stats: () => controller?.stats(), get selected() { return selected; }, get extracted() { return extracted; },get selectedId(){return catalog.items[selected]?.id;},get mode(){return mode;} } });
