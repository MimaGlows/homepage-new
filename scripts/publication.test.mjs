import test from'node:test';import assert from'node:assert/strict';import{mkdtemp,cp,symlink,readFile,rm,access}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{execFile}from'node:child_process';import{promisify}from'node:util';import{atomicJson,loadProject,compileProject}from'./content/project.mjs';
test('Actual production build excludes hidden artwork and unused uploads, while changed main images discard stale generated sizes',async()=>{
 const root=await(await import('node:fs/promises')).realpath(await mkdtemp(path.join(tmpdir(),'mima-private-build-')));try{
  for(const dir of ['content','generated','public','src','scripts','index.html','vite.config.ts','package.json','tsconfig.json'])await cp(dir,path.join(root,dir),{recursive:true});await symlink(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
  const doc=JSON.parse(await readFile(path.join(root,'content/records/characters.json')));
  doc.items[0].image='/assets/cover-blog.webp';doc.items[0].artworks=[{image:'/media/characters/private-test.webp',public:false}];doc.items[1].published=false;doc.items[1].image='/media/characters/hidden-avatar.webp';
  for(const name of ['private-test','hidden-avatar','unreferenced-upload'])await cp('public/assets/cover-blog.webp',path.join(root,`public/media/characters/${name}.webp`));
  await atomicJson(root,'content/records/characters.json',doc);const compiled=await compileProject(await loadProject(root));const published=JSON.parse(compiled.outputs['data/modules/characters.json']).items.find(x=>x.id==='nanakaze');assert.equal(published.image,'/assets/cover-blog.webp');assert.equal(published.imageLarge,undefined);assert.equal(published.thumbnail,undefined);
  // Execute the real project config, so removing its public-copy protection fails this test.
  await promisify(execFile)(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'build','--logLevel','silent'],{cwd:root});
  for(const name of ['private-test','hidden-avatar','unreferenced-upload'])await assert.rejects(()=>access(path.join(root,`dist/media/characters/${name}.webp`)));
  await access(path.join(root,'dist/assets/cover-blog.webp'));assert.ok(!(await readFile(path.join(root,'dist/data/modules/characters.json'),'utf8')).includes('private-test'));
 }finally{await rm(root,{recursive:true,force:true});}
});
