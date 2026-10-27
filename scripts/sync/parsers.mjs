import { parse } from 'parse5';
import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';
export const stableId=(prefix,value)=>`${prefix}-${createHash('sha256').update(String(value)).digest('hex').slice(0,18)}`;
export const attr=(node,name)=>node.attrs?.find(x=>x.name===name)?.value;
export const hasClass=(node,name)=>(attr(node,'class')||'').split(/\s+/).includes(name);
export function findAll(node,predicate){const result=[];function walk(n){if(predicate(n))result.push(n);for(const c of n.childNodes||[])walk(c);}walk(node);return result;}
export function plainText(node){if(typeof node==='string')node=parse(node);return (node.nodeName==='#text'?node.value:['script','style'].includes(node.tagName)?'':(node.childNodes||[]).map(plainText).join(' ')).replace(/\s+/g,' ').trim();}
export function publicUrl(value,base){try{const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password)return;u.hash='';u.searchParams.delete('ref');return u.href;}catch{}}
export function parseFriends(html,source){
 const dom=parse(html),links=findAll(dom,n=>n.tagName==='a'&&hasClass(n,'kg-bookmark-container'));
 if(!links.length)throw new Error('友链页结构已改变：未找到公开书签，保留旧缓存');
 return links.map((node,index)=>{
  const url=publicUrl(attr(node,'href'),source.url);if(!url)return null;
  const text=klass=>plainText(findAll(node,n=>hasClass(n,klass))[0]||{childNodes:[]});
  const thumb=findAll(node,n=>hasClass(n,'kg-bookmark-thumbnail'))[0];
  const img=findAll(thumb||node,n=>n.tagName==='img')[0];
  return {id:stableId('friend',url),type:'friend',title:text('kg-bookmark-title')||new URL(url).hostname,description:text('kg-bookmark-description').slice(0,500),url,remoteImage:publicUrl(attr(img||{},'src'),source.url),published:true,order:(index+1)*10,source:{url:source.url,attribution:'原友链页面及各站点',retrievedAt:new Date().toISOString()}};
 }).filter(Boolean);
}
export function parseRSS(xml,source){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('RSS 含不允许的实体声明');
 const doc=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',processEntities:true}).parse(xml);
 const values=doc.rss?.channel?.item;if(!values)throw new Error('RSS 未包含文章列表，保留旧缓存');
 return (Array.isArray(values)?values:[values]).slice(0,source.maxItems||20).map((entry,index)=>{
  const url=publicUrl(entry.link,source.url);if(!url)return null;
  const pub=Date.parse(entry.pubDate),categories=Array.isArray(entry.category)?entry.category:entry.category?[entry.category]:[];
  return {id:stableId('post',typeof entry.guid==='object'?entry.guid['#text']:entry.guid||url),type:'blog',title:String(entry.title||'未命名文章').slice(0,180),description:plainText(String(entry.description||'')).slice(0,220),url,remoteImage:publicUrl(entry['media:content']?.['@_url'],source.url),...(Number.isFinite(pub)?{publishedAt:new Date(pub).toISOString()}:{}),tags:categories.map(String).slice(0,20),published:true,order:(index+1)*10,source:{url:source.url,attribution:String(entry['dc:creator']||'MimaGlows').slice(0,240),retrievedAt:new Date().toISOString()}};
 }).filter(Boolean);
}
