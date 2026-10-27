// Renderer adapter only: business content is validated and compiled outside Three.js.
import { assetUrl } from './asset-url';
import type { ArchiveItem } from '../content/types';
export interface ArchiveRecord {
 id:string;title:string;en:string;category:string;
 album:{id:string;artist:string;coverUrl:string};
}
export const musicLibrary=true;
export let archiveColumns:string[]=[];
export let records:ArchiveRecord[]=[];
export const slotStride=32;
export function installArchiveItems(items:ArchiveItem[],name:string){
 const safe=items.length?items:[{id:'archive-empty',title:name,description:'',image:'/assets/placeholder.svg'}];
 records=safe.map(item=>({id:item.id,title:item.title,en:name,category:item.title,album:{id:item.id,artist:name,coverUrl:assetUrl(item.image)}}));
 archiveColumns=records.map(item=>item.title);
}
export const columnFiles=(lane:number)=>records[lane]?[lane]:[];
export function fileLocation(index:number){return{lane:index,row:12,slot:index*slotStride+12};}
export function fileAtSlot(slot:number){return Math.floor(slot/slotStride);}

export function hydrateArchiveImages(items:ArchiveItem[]) {
 const images=new Map(items.map(item=>[item.id,item.image]));
 records=records.map(record=>images.has(record.id)?{...record,album:{...record.album,coverUrl:assetUrl(images.get(record.id)!)}}:record);
}
