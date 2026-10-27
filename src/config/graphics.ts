import type { RenderQuality } from '../engine/render-quality';

export type GraphicsLevel = 'low' | 'medium' | 'high';
export const isGraphicsLevel = (value: unknown): value is GraphicsLevel =>
  value === 'low' || value === 'medium' || value === 'high';

export const graphicsProfiles: Record<GraphicsLevel, {
  render: RenderQuality; particles: number; fps: number;
}> = {
  low: { render: { scale:100, pixelRatio:1, antialias:'off', shadows:1024,
    aoSamples:0, aoResolution:.5, depthOfField:0, transmission:.5, anisotropy:4 }, particles:0, fps:30 },
  medium: { render: { scale:100, pixelRatio:1.5, antialias:'smaa', shadows:2048,
    aoSamples:16, aoResolution:.5, depthOfField:65, transmission:.75, anisotropy:8 }, particles:.45, fps:60 },
  high: { render: { scale:125, pixelRatio:2, antialias:'smaa', shadows:4096,
    aoSamples:32, aoResolution:1, depthOfField:100, transmission:1, anisotropy:16 }, particles:1, fps:60 }
};

export function defaultGraphicsLevel(): GraphicsLevel {
  const memory = (navigator as Navigator & { deviceMemory?:number }).deviceMemory;
  return matchMedia('(pointer: coarse)').matches || innerWidth < 800 ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (memory !== undefined && memory <= 4) ? 'low' : 'medium';
}
