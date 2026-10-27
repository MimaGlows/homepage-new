type Twitter={widgets:{createTimeline:(source:{sourceType:'profile';screenName:string},target:HTMLElement,options:Record<string,unknown>)=>Promise<HTMLElement|undefined>}};
let script:Promise<Twitter>|undefined;
export async function showTimeline(username:string,host:HTMLElement){
 if(!/^[A-Za-z0-9_]{1,15}$/.test(username))throw Error('账号格式无效');
 script??=new Promise<Twitter>((resolve,reject)=>{
  const existing=(window as Window&{twttr?:Twitter}).twttr;if(existing?.widgets){resolve(existing);return;}
  const node=document.createElement('script');node.src='https://platform.twitter.com/widgets.js';node.async=true;node.referrerPolicy='no-referrer';
  const timeout=setTimeout(()=>{script=undefined;node.remove();reject(Error('官方时间线加载超时'));},10000);
  node.onload=()=>{clearTimeout(timeout);const api=(window as Window&{twttr?:Twitter}).twttr;if(api?.widgets)resolve(api);else{script=undefined;reject(Error('官方时间线暂不可用'));}};
  node.onerror=()=>{clearTimeout(timeout);script=undefined;node.remove();reject(Error('官方时间线连接失败'));};document.head.append(node);
 });
 const api=await script;if(!host.isConnected)return;
 const result=await Promise.race([api.widgets.createTimeline({sourceType:'profile',screenName:username},host,{theme:document.documentElement.dataset.theme==='night'?'dark':'light',height:420,dnt:true,chrome:'noheader nofooter noborders'}),new Promise<undefined>(resolve=>setTimeout(()=>resolve(undefined),10000))]);
 if(!result)throw Error('官方时间线暂不可用，请打开 X 来源');
}
