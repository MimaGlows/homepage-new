import { defineConfig } from 'vite';
// @ts-expect-error Node-only content pipeline deliberately stays outside the browser TS graph.
import { contentPlugin } from './scripts/content/vite-plugin.mjs';

export default defineConfig({
  base: './',
  plugins: [contentPlugin()],
  build: { target: 'es2022', copyPublicDir:false, modulePreload: false, rollupOptions: { output: {
    manualChunks(id) { if (id.includes('node_modules/three')) return 'three'; }
  } } }
});
