export type ModuleId = 'navigation'|'friends'|'music'|'blog'|'social'|'characters';
export type DisplayMode = 'focus'|'archive';
export interface ModuleConfig { enabled:boolean;showInFocus:boolean;showInArchive:boolean;displayLimit:number;sorting:'manual'|'newest'|'title';syncEnabled:boolean;refreshInterval:number;fallbackBehavior:'cache'|'manual'|'hide' }
export interface SiteConfig {
 title:string;name:string;description:string;registration:{text:string;url:string};
 navigation:{id:string;title:string;url:string;order:number}[];
 defaults:{mode:DisplayMode;theme:'day'|'night';intro:boolean;particles:boolean;parallax:boolean};
 moduleOrder:ModuleId[];modules:Record<ModuleId,ModuleConfig>;
}
export interface ArchiveItem {
 id:string;type:string;title:string;description:string;image:string;thumbnail?:string;imageLarge?:string;url?:string;module:ModuleId;
 featured:boolean;pinned:boolean;order:number;modes:DisplayMode[];bodyUrl?:string;
 tags?:string[];source?:{url:string;imageUrl?:string;attribution?:string;license?:string};
 relations?:{targetId:string;label:string;public?:boolean}[];
 artworks?:{image:string;caption?:string;sourceUrl?:string;attribution?:string;public?:boolean}[];
 artist?:string;album?:string;platformLinks?:{platform:string;url:string;confirmed?:boolean}[];
 publishedAt?:string;lastPlayedAt?:string;articleLinks?:{title:string;url:string}[];
 aliasIds?:string[];playCount?:number;
}
export interface Catalog {schemaVersion:1;site:SiteConfig;items:ArchiveItem[];status:{source:string;lastSuccessfulAt?:string;error?:string}[]}
