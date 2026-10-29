import type { ArchiveItem, DisplayMode } from './content/types';
import { installArchiveItems, hydrateArchiveImages } from './engine/data';
import { ArchiveScene } from './engine/scene';
import { defaultGraphicsLevel, graphicsProfiles, type GraphicsLevel } from './config/graphics';
import { DEFAULT_LIGHTING_PRESET } from './engine/music-row-lighting';

export type Theme = 'day' | 'night';
export interface SceneController {
  mode(mode:DisplayMode):void; visibility(ids:string[]):void; hydrate(items:ArchiveItem[]):void;
  select(index: number): void; theme(theme: Theme): void; reduced(value: boolean): void;
  extract(value: boolean): void; replay(): void; skip(): void; resize(): void;
  quality(level:GraphicsLevel, locked:boolean):void;
  pause(): void; resume(): void; dispose(): void; stats(): unknown;
}
export async function mountScene(host: HTMLElement, options: {
  items: ArchiveItem[]; mode:DisplayMode; visibleIds:string[]; name: string; particles: boolean; parallax: boolean;
  theme: Theme; reduced: boolean; selected: number; extracted: boolean; signal: AbortSignal;
  quality:GraphicsLevel; qualityLocked:boolean; onQualityChange(level:GraphicsLevel):void;
  onSelect(index: number, inspect?:boolean): void; onStep(direction: number): void; onFailure(): void;
}): Promise<SceneController> {
  installArchiveItems(options.items, options.name);
  const scene = new ArchiveScene(host);
  let disposed = false, suspended = document.hidden, reduced = options.reduced;
  let handle = 0, lastFrame = 0, introTime: number | null = null, selected = options.selected;
  let displayMode=options.mode;
  scene.setVisibleArchiveIds(options.visibleIds);
  let settleFrames = 0;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let hovered: number | null = null;
  const mobile = () => matchMedia('(pointer: coarse)').matches || innerWidth < 800;
  let graphicsLevel=options.quality,graphicsLocked=options.qualityLocked;
  let frameLimited=false,frameOrigin=0,budgetStart=0,budgetFrames=0;
  const quality = () => {
    const profile=graphicsProfiles[graphicsLevel];
    scene.setQuality(profile.render);
    scene.setAmbientOptions(options.particles&&profile.particles>0,options.parallax&&graphicsLevel!=='low',profile.particles);
  };
  const stop = () => { cancelAnimationFrame(handle); handle = 0; };
  function dispose() {
    if (disposed) return;
    disposed = true; clearTimeout(hoverTimer); stop(); scene.dispose();
    options.signal.removeEventListener('abort', dispose);
  }
  options.signal.addEventListener('abort', dispose, { once: true });
  try {
    if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    scene.enableSelectionLighting();
    scene.setLightingExperiment({ ...DEFAULT_LIGHTING_PRESET });
    quality();
    scene.setReduced(reduced);
    scene.setTheme(options.theme);
    await scene.load(undefined, selected);
    if (disposed) throw new DOMException('Aborted', 'AbortError');
    // No font, music library, audio device, worker or full-pipeline warmup gate.
    // The shared atlas decodes local artwork from visited modules only.
    scene.showMusicArchiveImmediately(performance.now() / 1000);
    scene.setMusicOverview(displayMode==='archive');
    if (options.extracted) scene.setMode('detail');
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (disposed) throw new DOMException('Aborted', 'AbortError');
    scene.update(performance.now() / 1000);
    scene.onSelect = (index) => { if (introTime === null) options.onSelect(index,true); };
    scene.onNavigate = (_, direction) => { if (introTime === null) options.onStep(direction); };
    // Hovering a physical card remains a raycast; HTML links select the matching lane.
    scene.onHover = index => {
      host.dataset.hovered = index === null ? '' : String(index);
      if (hovered === index) return;
      hovered = index; clearTimeout(hoverTimer);
      if (index !== null && index !== selected && introTime === null) {
        hoverTimer = setTimeout(() => { if (!disposed && !suspended) options.onSelect(index); }, 220);
      }
    };
    scene.renderer.domElement.setAttribute('aria-hidden', 'true');
    scene.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); if (!disposed) { dispose(); options.onFailure(); }
    });
    function frame(ms: number) {
      handle = 0;
      if (disposed || suspended) return;
      const interval = 1000 / graphicsProfiles[graphicsLevel].fps;
      if (ms - lastFrame < interval - 1) { handle = requestAnimationFrame(frame); return; }
      const delta = lastFrame ? Math.min(.05, (ms - lastFrame) / 1000) : 0;
      lastFrame = ms;
      // Ignore startup/shader warmup, hidden tabs and deliberate reduced motion.
      // Automatic defaults may drop once; an explicit visitor choice always wins.
      if(!frameOrigin)frameOrigin=ms;
      if(!graphicsLocked&&graphicsLevel!=='low'&&!reduced&&introTime===null&&ms-frameOrigin>4000){
        if(!budgetStart){budgetStart=ms;budgetFrames=0;}
        else if(++budgetFrames>1&&ms-budgetStart>=3000){
          if((ms-budgetStart)/budgetFrames>36){frameLimited=true;graphicsLevel='low';quality();options.onQualityChange(graphicsLevel);}
          budgetStart=ms;budgetFrames=0;
        }
      }else{budgetStart=0;budgetFrames=0;}
      if (introTime !== null) {
        introTime = Math.min(5.2, introTime + delta);
        scene.update(ms / 1000, { time: 21.92 + introTime, reveal: 1, lift: 0, zoom: 0, musicIntro: true });
        if (introTime >= 5.2) { introTime = null; scene.finishMusicIntro(ms / 1000); }
      } else scene.update(ms / 1000);
      // Reduced motion renders only changed states, then releases its RAF entirely.
      if (!reduced || introTime !== null || --settleFrames > 0) handle = requestAnimationFrame(frame);
    }
    function wake() {
      if (disposed || suspended) return;
      settleFrames = 35;
      if (!handle) { lastFrame = 0; handle = requestAnimationFrame(frame); }
    }
    host.addEventListener('pointermove', wake, { signal: options.signal, passive: true });
    host.addEventListener('pointerup', wake, { signal: options.signal, passive: true });
    wake();
    return {
      mode(value) { displayMode=value;scene.setMode('archive');scene.setMusicOverview(value==='archive');wake(); },
      visibility(ids) { scene.setVisibleArchiveIds(ids);wake(); },
      hydrate(items) { hydrateArchiveImages(items);scene.updateArchiveArtwork();wake(); },
      select(index) {
        selected = index; introTime = null;
        if (scene.musicPresentationPhase === 'placing' || scene.musicPresentationPhase === 'presented') scene.switchMusicAlbum(index);
        else scene.select(index);
        wake();
      },
      theme(theme) { scene.setTheme(theme, true); wake(); },
      reduced(value) { reduced = value; scene.setReduced(value); if (value && introTime !== null) { introTime = null; scene.showMusicArchiveImmediately(performance.now() / 1000); } wake(); },
      extract(value) { introTime = null; scene.setMode(value ? 'detail' : 'archive');if(!value)scene.setMusicOverview(displayMode==='archive');wake(); },
      replay() { if (reduced) return; introTime = 0; scene.select(selected); scene.setMode('hidden'); wake(); },
      skip() { if (introTime !== null) { introTime = null; scene.showMusicArchiveImmediately(performance.now() / 1000); wake(); } },
      quality(level,locked) { graphicsLevel=level;graphicsLocked=locked;frameLimited=false;budgetStart=0;budgetFrames=0;frameOrigin=0;quality();wake(); },
      resize() { if(!graphicsLocked&&!frameLimited){const next=defaultGraphicsLevel();if(next!==graphicsLevel){graphicsLevel=next;options.onQualityChange(next);}}quality(); scene.resize(); wake(); },
      pause() { suspended = true;budgetStart=0;budgetFrames=0; clearTimeout(hoverTimer); stop(); },
      resume() { suspended = false; lastFrame = 0; wake(); },
      dispose,
      stats: () => ({ ...scene.getStats(), reduced, suspended, animationScheduled: !!handle, mobile: mobile(), mode:displayMode,qualityLevel:graphicsLevel,qualityLocked:graphicsLocked,qualityTier:graphicsLevel==='low'?'performance':graphicsLevel==='medium'?'balanced':'high',qualityReason:graphicsLocked?'visitor':frameLimited?'sustained-frame-time':mobile()?'mobile':defaultGraphicsLevel()==='low'?'hardware':'default' })
    };
  } catch (error) { dispose(); throw error; }
}
