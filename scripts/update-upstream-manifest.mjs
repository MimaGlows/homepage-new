import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';
const file='docs/upstream-manifest.json',manifest=JSON.parse(await readFile(file));
for(const entry of manifest.files){const buffer=await readFile(entry.file);entry.current_sha256=createHash('sha256').update(buffer).digest('hex');entry.unchanged=entry.current_sha256===entry.upstream_sha256;if(entry.bytes!==undefined)entry.bytes=buffer.length;}
await writeFile(file,JSON.stringify(manifest,null,2)+'\n');console.log({engineFiles:manifest.files.filter(x=>x.file.startsWith('src/engine/')).length,unchanged:manifest.files.filter(x=>x.file.startsWith('src/engine/')&&x.unchanged).length,changed:manifest.files.filter(x=>!x.unchanged).map(x=>x.file)});
