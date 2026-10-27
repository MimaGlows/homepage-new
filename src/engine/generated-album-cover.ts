// Local fallback artwork. System fonts only; never waits for font downloads.
export function generatedCoverSource(metadata: { title: string; id?: string; artist?: string }) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#e7e3db'; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = '#b4a285'; c.lineWidth = 1;
  for (let x = 32; x < 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 512); c.stroke(); }
  c.fillStyle = '#302f2b'; c.font = '24px monospace'; c.fillText(metadata.title, 32, 455);
  c.font = '11px monospace'; c.fillText('MIMAGLOWS / ARCHIVE', 32, 484);
  return canvas;
}
