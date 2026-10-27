import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { download } from './network.mjs';
export async function optimizeImage(root,buffer,group='archive'){
 if(!['friends','albums','characters','archive'].includes(group))throw new Error('未知图片分类');
 if(buffer.length>12*1024*1024)throw new Error('图片不得超过 12 MiB');
 const input=sharp(buffer,{limitInputPixels:40_000_000,animated:false,failOn:'error'});
 const meta=await input.metadata();
 if(!['jpeg','png','webp','avif','heif','gif'].includes(meta.format))throw new Error('请上传 PNG / JPEG / WebP / AVIF / GIF 图片');
 const hash=createHash('sha256').update(buffer).digest('hex').slice(0,20);
 const dir=path.join(root,'public/media',group);await mkdir(dir,{recursive:true});
 const result={};
 for(const [key,width]of [['thumbnail',256],['image',768],['imageLarge',1440]]){
  const name=`${hash}-${width}.webp`,file=path.join(dir,name);
  try{await access(file);}catch{await writeFile(file,await input.clone().rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:width===256?74:82,effort:4}).toBuffer());}
  result[key]=`/media/${group}/${name}`;
 }
 return result;
}
export async function cacheImage(root,url,group){
 if(!url)return {image:'/assets/placeholder.svg'};
 try{const {buffer}=await download(url);return await optimizeImage(root,buffer,group);}catch{return {image:'/assets/placeholder.svg'};}
}
