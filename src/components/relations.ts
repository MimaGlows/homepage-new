import type{ArchiveItem}from'../content/types';
export function relationGraph(items:ArchiveItem[],name:string,choose:(item:ArchiveItem)=>void){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 330 310');svg.classList.add('archive-graph');svg.setAttribute('role','group');svg.setAttribute('aria-label',items[0]?.type==='friend'?'友链关系网络':'人物公开关系');
 const positions=new Map(items.map((item,i)=>[item.id,{x:165+112*Math.cos(-Math.PI/2+i*2*Math.PI/items.length),y:150+112*Math.sin(-Math.PI/2+i*2*Math.PI/items.length)}]));
 const element=(tag:string,attrs:Record<string,string>)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 const edge=(a:{x:number;y:number},b:{x:number;y:number},label?:string)=>{svg.append(element('line',{x1:String(a.x),y1:String(a.y),x2:String(b.x),y2:String(b.y)}));if(label){const text=element('text',{x:String((a.x+b.x)/2),y:String((a.y+b.y)/2-6),'text-anchor':'middle'});text.textContent=label;svg.append(text);}};
 const friendship=items[0]?.type==='friend',edges=new Set<string>();
 for(const item of items){const p=positions.get(item.id)!;if(friendship)edge({x:165,y:150},p);else for(const rel of item.relations||[]){const target=positions.get(rel.targetId),key=[item.id,rel.targetId].sort().join(':');if(target&&!edges.has(key)){edge(p,target,rel.label);edges.add(key);}}}
 if(friendship){const text=element('text',{x:'165',y:'153','text-anchor':'middle'});text.textContent=name;svg.append(element('circle',{cx:'165',cy:'150',r:'28'}),text);}
 for(const item of items){const p=positions.get(item.id)!,g=element('g',{tabindex:'0',role:'button','aria-label':`打开 ${item.title}`}),text=element('text',{x:String(p.x),y:String(p.y+32),'text-anchor':'middle'});text.textContent=item.title.length>10?item.title.slice(0,9)+'…':item.title;g.append(element('circle',{cx:String(p.x),cy:String(p.y),r:'10'}),text);g.addEventListener('click',()=>choose(item));g.addEventListener('keydown',event=>{const e=event as KeyboardEvent;if(['Enter',' '].includes(e.key)){e.preventDefault();choose(item);}});svg.append(g);}
 return svg;
}
