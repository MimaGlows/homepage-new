/** Capture real WebGL geometry/lighting with neutral public artwork. A hidden OC
 * must never remain visible because its portrait was baked into the poster. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
try {
 for (const mobile of [false, true]) {
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce', isMobile: mobile, hasTouch: mobile });
  await page.route('**/data/**',async route=>{const response=await route.fetch();const data=await response.json();for(const item of data.items||[])if(item.type!=='navigation'){item.image='/assets/placeholder.svg';delete item.thumbnail;delete item.imageLarge;item.artworks=[];}await route.fulfill({response,json:data});});
  for (const mode of ['focus','archive']) {
   const url=new URL(process.env.QA_URL || 'http://127.0.0.1:4173/');url.searchParams.set('mode',mode);
   await page.goto(url.href);
   await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 30000 });
   for (const theme of ['day', 'night']) {
    await page.keyboard.press(theme === 'day' ? 'd' : 'n');
    await page.waitForTimeout(1400);
    const style = await page.addStyleTag({ content: '#terminal > :not(#scene){visibility:hidden!important}#scene{opacity:1!important}' });
    const name=`preview-${theme}${mode === 'archive' ? '-archive' : ''}${mobile ? '-mobile' : ''}.webp`;
    await sharp(await page.screenshot()).resize(mobile ? 390 : 1440, mobile ? 844 : 900).webp({ quality: 82, effort: 6 }).toFile(`public/assets/${name}`);
    await style.evaluate(node => node.remove());
   }
  }
  await page.close();
 }
} finally { await browser.close(); }
console.log('Eight real-scene previews written to public/assets/. Rebuild before measuring.');
