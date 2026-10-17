// ModelArk REST adapter. No consumer-session automation, paid retry or provider fallback.
const ROOT='https://ark.ap-southeast.bytepluses.com/api/v3/';
const MAX=30*1024*1024;
const IDS={'byteplus-seedance-2':'dreamina-seedance-2-0-260128','byteplus-seedream-4-5':'seedream-4-5-251128','byteplus-seedream-5-lite':'seedream-5-0-lite-260128'};
const SIZES={'1:1':'2048x2048','2:3':'1664x2496','3:2':'2496x1664','9:16':'1600x2848','16:9':'2848x1600'};
async function readLimited(r,limit){
 if(Number(r.headers.get('content-length'))>limit)throw Error('RESULT_TOO_LARGE');
 const reader=r.body?.getReader();if(!reader)throw Error('EMPTY_GENERATION');
 const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('RESULT_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 if(!size)throw Error('EMPTY_GENERATION');return Buffer.concat(chunks);
}
async function json(path,{key,body,fetcher}){
 if(!key)throw Error('PROVIDER_KEY_REQUIRED');
 const r=await fetcher(ROOT+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(120000),headers:{Authorization:`Bearer ${key}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw Error(r.status===429?'PROVIDER_BUSY':'PROVIDER_ERROR');
 return JSON.parse((await readLimited(r,42*1024*1024)).toString('utf8'));
}
export async function generateBytePlus(request,{key,fetcher=fetch}){
 const model=IDS[request.model];
 if(!model||!['image','video'].includes(request.kind)||(request.kind==='video')!==(request.model==='byteplus-seedance-2'))throw Error('MODEL_NOT_CONNECTED');
 const images=(request.references||[]).map(r=>`data:${r.mimeType};base64,${r.data}`);
 if(request.kind==='video'){
  if(!['16:9','9:16','1:1'].includes(request.ratio)||images.length>1)throw Error('INVALID_REQUEST');
  const d=await json('contents/generations/tasks',{key,fetcher,body:{model,content:[{type:'text',text:request.prompt},...images.map(url=>({type:'image_url',image_url:{url},role:'first_frame'}))],ratio:request.ratio,resolution:'720p',duration:5,generate_audio:true,watermark:true}});
  if(typeof d.id!=='string'||!/^[-A-Za-z0-9_]{1,160}$/.test(d.id))throw Error('EMPTY_OPERATION');
  return {operation:`byteplus:${d.id}`};
 }
 if(!SIZES[request.ratio]||images.length>3)throw Error('INVALID_REQUEST');
 const d=await json('images/generations',{key,fetcher,body:{model,prompt:request.prompt,size:SIZES[request.ratio],response_format:'b64_json',stream:false,sequential_image_generation:'disabled',watermark:true,...(request.model==='byteplus-seedream-5-lite'?{output_format:'png'}:{}),...(images.length?{image:images}:{})}});
 const data=d.data?.[0]?.b64_json;
 if(typeof data!=='string'||data.length>Math.ceil(MAX/3)*4||data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('INVALID_PROVIDER_MEDIA');
 const bytes=Buffer.from(data,'base64');
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!bytes.length||bytes.length>MAX||(!png&&!jpeg))throw Error('INVALID_PROVIDER_MEDIA');
 return {mime:png?'image/png':'image/jpeg',bytes,text:''};
}
export function safeBytePlusMediaUrl(value,downloadHosts=''){
 const u=new URL(value),hosts=String(downloadHosts||'').split(',').map(h=>h.trim().toLowerCase()).filter(Boolean);
 // Exact operator-approved provider CDN hostnames only. Never send the API key here.
 if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname)||!/(^|\.)(bytepluses\.com|volces\.com)$/.test(u.hostname))throw Error('UNSAFE_PROVIDER_URL');
 return u.toString();
}
export async function pollBytePlus(operation,{key,downloadHosts='',fetcher=fetch}){
 if(!/^byteplus:[-A-Za-z0-9_]{1,160}$/.test(operation))throw Error('INVALID_OPERATION');
 const d=await json('contents/generations/tasks/'+operation.slice(9),{key,fetcher});
 if(['queued','running'].includes(d.status))return {pending:true};
 if(['failed','expired','cancelled'].includes(d.status)){const e=Error('PROVIDER_TASK_FAILED');e.terminal=true;throw e;}
 if(d.status!=='succeeded'||!d.content?.video_url)throw Error('INVALID_PROVIDER_STATUS');
 const r=await fetcher(safeBytePlusMediaUrl(d.content.video_url,downloadHosts),{redirect:'error',signal:AbortSignal.timeout(120000)});
 if(!r.ok)throw Error('VIDEO_DOWNLOAD_FAILED');
 const bytes=await readLimited(r,MAX);
 if(bytes.subarray(4,8).toString()!=='ftyp')throw Error('INVALID_PROVIDER_MEDIA');
 return {mime:'video/mp4',bytes,text:''};
}

export function bytePlusDownloadsConfigured(hosts){
 const list=String(hosts||'').split(',').map(h=>h.trim()).filter(Boolean);
 return !!list.length&&list.every(h=>{try{safeBytePlusMediaUrl('https://'+h+'/result.mp4',hosts);return true;}catch(_){return false;}});
}
