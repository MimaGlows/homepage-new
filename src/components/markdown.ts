// A deliberately small Markdown subset: headings, paragraphs, lists, quotes,
// emphasis and HTTPS links. Raw HTML/images are text; artwork uses local fields.
export function markdown(source:string){
 const fragment=document.createDocumentFragment();
 for(const block of source.replace(/\r/g,'').split(/\n\s*\n/)){
  if(!block.trim())continue;
  const heading=/^(#{1,4})\s+(.+)$/s.exec(block);
  const lines=block.split('\n');
  if(lines.every(x=>/^[-*] /.test(x))){const list=document.createElement('ul');for(const line of lines){const li=document.createElement('li');inline(li,line.slice(2));list.append(li);}fragment.append(list);continue;}
  const element=document.createElement(heading?`h${Math.min(4,heading[1].length+1)}`:block.startsWith('> ')?'blockquote':'p');
  inline(element,heading?heading[2]:block.replace(/^> /gm,''));fragment.append(element);
 }
 return fragment;
}
function inline(parent:HTMLElement,text:string){
 const pattern=/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;let last=0;
 for(const match of text.matchAll(pattern)){
  parent.append(document.createTextNode(text.slice(last,match.index)));
  const element=document.createElement(match[1]?'a':match[3]?'strong':'code');element.textContent=match[1]||match[3]||match[4];
  if(element instanceof HTMLAnchorElement){try{const url=new URL(match[2]);if(url.username||url.password)throw 0;element.href=url.href;element.target='_blank';element.rel='noopener noreferrer';}catch{element.removeAttribute('href');}}
  parent.append(element);last=match.index!+match[0].length;
 }
 parent.append(document.createTextNode(text.slice(last)));
}
