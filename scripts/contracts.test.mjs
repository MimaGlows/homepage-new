import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('Central navigation remains valid without fixing a maintainer’s chosen URLs', async () => {
 const { loadProject }=await import('./content/project.mjs');
 const project=await loadProject();
 assert.deepEqual(project.site.navigation.map(x=>x.id).sort(),['blog','minecraft','stronghold']);
 for(const item of project.site.navigation) assert.equal(new URL(item.url).protocol,'https:');
});
test('Critical entry keeps Three.js behind an import boundary', async () => {
 const shell = await readFile('src/shell.ts','utf8');
 assert.match(shell,/import\('\.\/scene'\)/);
 assert.doesNotMatch(shell,/^import (?!type).*from ['"].*(three|engine|scene)/m);
 const html=await readFile('index.html','utf8');
 assert.match(html,/__REGISTRATION_URL__/);
});
