import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const blocked=new BlockList();
for(const [ip,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['198.18.0.0',15],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(ip,prefix,'ipv4');
for(const [ip,prefix]of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]])blocked.addSubnet(ip,prefix,'ipv6');
export function isPublicAddress(address){const family=isIP(address);return !!family&&!address.toLowerCase().startsWith('::ffff:')&&!blocked.check(address,family===6?'ipv6':'ipv4');}
async function resolveAddresses(hostname){
 if(isIP(hostname))return [{address:hostname,family:isIP(hostname)}];
 if(process.env.MIMA_SYNC_DNS_DOH==='1'){
  // Opt-in for local TUN/fake-IP proxies. Bootstrap is pinned to Cloudflare's
  // public resolver; this never permits private destinations or arbitrary resolvers.
  const result=await new Promise((resolve,reject)=>{
   const request=https.get(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,{headers:{accept:'application/dns-json'},lookup:(_host,options,cb)=>cb(null,options.all?[{address:'1.1.1.1',family:4}]:'1.1.1.1',4)},response=>{const chunks=[];let size=0;response.on('data',chunk=>{size+=chunk.length;if(size>65536)response.destroy();else chunks.push(chunk);});response.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString()));}catch{reject(new Error('公共 DNS 响应无效'));}});response.on('error',()=>reject(new Error('公共 DNS 读取失败')));});
   request.setTimeout(10000,()=>request.destroy());request.on('error',()=>reject(new Error('公共 DNS 连接失败')));
  });
  return (result.Answer||[]).filter(x=>x.type===1).map(x=>({address:x.data,family:4}));
 }
 return lookup(hostname,{all:true}).catch(()=>{throw new Error('来源域名解析失败');});
}
// Resolve once, validate every address, then pin the connection lookup. Each redirect
// repeats this check; URLs/headers (which may contain tokens) never enter errors.
export async function download(value,{maxBytes=8*1024*1024,headers={},redirects=4,timeout=15000}={}){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')throw new Error('来源必须使用标准 HTTPS');
 const hostname=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=await resolveAddresses(hostname);
 if(!addresses.length||addresses.some(x=>!isPublicAddress(x.address)))throw new Error('不允许访问本机或私有网络地址');
 const selected=addresses[0];
 return new Promise((resolve,reject)=>{
  const request=https.get(url,{headers:{'user-agent':'MimaArchiveSync/1.0',...headers},lookup:(_host,options,cb)=>cb(null,options.all?[selected]:selected.address,selected.family)},response=>{
   if([301,302,303,307,308].includes(response.statusCode)){
    response.resume();if(!redirects||!response.headers.location){reject(new Error('来源重定向次数过多'));return;}
    const target=new URL(response.headers.location,url);
    // Never forward credentials to another origin.
    download(target,{maxBytes,timeout,redirects:redirects-1,headers:target.origin===url.origin?headers:{}}).then(resolve,reject);return;
   }
   if(response.statusCode!==200){response.resume();reject(new Error(`来源返回 HTTP ${response.statusCode}`));return;}
   let size=0;const chunks=[];
   response.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){response.destroy();reject(new Error('来源内容超过大小限制'));}else chunks.push(chunk);});
   response.on('end',()=>resolve({buffer:Buffer.concat(chunks),contentType:response.headers['content-type']||''}));
   response.on('error',()=>reject(new Error('来源读取中断')));
  });
  const deadline=setTimeout(()=>request.destroy(),timeout);request.once('close',()=>clearTimeout(deadline));
  request.setTimeout(timeout,()=>request.destroy());request.on('error',()=>reject(new Error('来源连接失败或超时')));
 });
}
export async function json(url,options){const {buffer}=await download(url,options);try{return JSON.parse(buffer.toString());}catch{throw new Error('来源未返回有效 JSON');}}
