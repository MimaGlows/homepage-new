import type { ArchiveItem, Catalog, ModuleId, SiteConfig } from './types';
export const siteConfig:SiteConfig = JSON.parse(document.querySelector('#site-config')!.textContent!);
const url=(path:string)=>`${import.meta.env.BASE_URL}${path.replace(/^\//,'')}`;
const cache = new Map<string,Promise<unknown>>();
async function read<T>(path:string):Promise<T>{
 if(!cache.has(path))cache.set(path,fetch(url(path)).then(response=>{if(!response.ok)throw new Error(`档案暂不可用 (${response.status})`);return response.json();}).catch(error=>{cache.delete(path);throw error;}));
 return cache.get(path) as Promise<T>;
}
export const loadCatalog=()=>read<Catalog>('data/catalog.json');
export const loadModule=async(module:ModuleId)=>(await read<{items:ArchiveItem[]}>(`data/modules/${module}.json`)).items;
export const loadBody=(path:string)=>read<{id:string;markdown:string}>(path);
export function fallbackCatalog():Catalog {
 return {schemaVersion:1,site:siteConfig,status:[],items:siteConfig.navigation.map((item,i)=>({id:`portal-${item.id}`,type:'navigation',module:'navigation',title:item.title,url:item.url,image:`/assets/cover-${item.id}.webp`,description:'',order:item.order,featured:true,pinned:false,modes:['focus','archive']}))};
}
