// Server-only, NOT wired to paid dispatch. BASE #4 M0, Issue #178 / cost policy #182.
// Provider config must be approved by B and pricing/purchased-credit gate by D.
const ROOT = 'https://api.openai.com/v1/images/';
const MODELS = new Set(['gpt-image-2.5-flare','gpt-image-2.5-sunburst',
  'gpt-image-2.5-flare-2026-09-08','gpt-image-2.5-sunburst-2026-09-08',
  'gpt-image-2','gpt-image-2-2026-04-21','gpt-image-1.5']);
const QUALITY = new Set(['auto','low','medium','high','xhigh','max']);
const MIME = {png:'image/png',jpeg:'image/jpeg'};
const MAX_IMAGE = 30*1024*1024, MAX_REF = 1024*1024;
const PNG = Buffer.from([137,80,78,71,13,10,26,10]);
function reject(code){throw new Error(code);}
function bytesFromBase64(value,limit,error){
 if(typeof value!=='string'||value.length>Math.ceil(limit/3)*4+4||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))reject(error);
 const bytes=Buffer.from(value,'base64');
 if(!bytes.length||bytes.length>limit||bytes.toString('base64')!==value)reject(error);
 return bytes;
}
// Reject signature-only JPEG impostors. Not a replacement for full codec decode.
function verifyJpegFrame(bytes){
 let at=2,seenFrame=false;
 while(at<bytes.length-2){
  if(bytes[at++]!==255)return false;
  while(bytes[at]===255)at++;
  const marker=bytes[at++];
  if(!marker||marker===217||at>=bytes.length-2)return false;
  if(marker===1||(marker>=208&&marker<=215))continue;
  if(at+2>bytes.length-2)return false;
  const length=bytes.readUInt16BE(at);
  if(length<2||at+length>bytes.length-2)return false;
  if(marker===218)return seenFrame&&length>=6&&at+length<bytes.length-2;
  if(marker>=192&&marker<=207&&![196,200,204].includes(marker)){
   if(length<7)return false;
   const h=bytes.readUInt16BE(at+3),w=bytes.readUInt16BE(at+5);
   if(!w||!h||w>8192||h>8192)return false;
   seenFrame=true;
  }
  at+=length;
 }
 return false;
}
// Provider bytes are billable outputs. Checking only the PNG signature and
// final IEND marker can accept broken/forged IDAT payloads as successful jobs.
// Validate bounded chunk structure and CRC before handing the image to storage.
const PNG_CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{
 let c=n;
 for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
 return c>>>0;
});
function pngChunkCrc(bytes,from,to){
 let crc=0xffffffff;
 for(let n=from;n<to;n++)crc=PNG_CRC_TABLE[(crc^bytes[n])&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function validPng(bytes){
 if(bytes.length<57||!bytes.subarray(0,8).equals(PNG))return false;
 let pos=8,seenHeader=false,seenPixels=false;
 while(pos+12<=bytes.length){
  const size=bytes.readUInt32BE(pos);
  if(size>bytes.length-pos-12)return false;
  const end=pos+12+size;
  const type=bytes.toString('ascii',pos+4,pos+8);
  if(!/^[A-Za-z]{4}$/.test(type))return false;
  if(pngChunkCrc(bytes,pos+4,pos+8+size)!==bytes.readUInt32BE(pos+8+size))return false;
  if(!seenHeader){
   if(type!=='IHDR'||size!==13)return false;
   const w=bytes.readUInt32BE(pos+8),h=bytes.readUInt32BE(pos+12);
   const depth=bytes[pos+16],color=bytes[pos+17];
   if(!w||!h||w>8192||h>8192||
      !({0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]}[color]?.includes(depth))||
      bytes[pos+18]!==0||bytes[pos+19]!==0||bytes[pos+20]>1)return false;
   seenHeader=true;
  }else if(type==='IHDR')return false;
  if(type==='IDAT'){if(!size)return false;seenPixels=true;}
  if(type==='IEND')return size===0&&seenPixels&&end===bytes.length;
  pos=end;
 }
 return false;
}
function verifyImage(bytes,mime){
 if(!bytes.length||bytes.length>MAX_IMAGE)reject('INVALID_PROVIDER_MEDIA');
 if(mime==='image/png'){
  if(!validPng(bytes))reject('INVALID_PROVIDER_MEDIA');
 }else if(mime==='image/jpeg'){
  if(bytes.length<64||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||
     bytes.at(-2)!==255||bytes.at(-1)!==217||!verifyJpegFrame(bytes))reject('INVALID_PROVIDER_MEDIA');
 }else reject('UNSUPPORTED_PROVIDER_MEDIA');
}
function verifySize(value){
 const match=/^([1-9]\d{2,3})x([1-9]\d{2,3})$/.exec(value||'');
 if(!match)reject('UNSUPPORTED_RESOLUTION');
 const w=Number(match[1]),h=Number(match[2]);
 if(w%16||h%16||w>3840||h>3840||w*h<655360||w*h>8294400||
    w/h>3||h/w>3)reject('UNSUPPORTED_RESOLUTION');
 return value;
}
export function buildOpenAIImageRequest(request,config){
 if(!request||typeof request!=='object'||Array.isArray(request)||request.kind!=='image'||
    !config||config.enabled!==true||!MODELS.has(config.id)||request.model!==config.id||
    typeof request.prompt!=='string'||!request.prompt.trim()||request.prompt.length>2000)reject('INVALID_REQUEST');
 for(const field of ['seed','negativePrompt','negative_prompt','mask','imageMask',
   'inputFidelity','n','quantity','background','outputCompression']){
   if(Object.hasOwn(request,field))reject('UNSUPPORTED_IMAGE_CONTROL');
 }
 const refs=request.references??[];
 if(!Array.isArray(refs)||refs.length>3||!Number.isInteger(config.maxReferences)||
    config.maxReferences<0||refs.length>config.maxReferences)reject('INVALID_REFERENCES');
 const size=verifySize(config.sizes?.[request.ratio]?.[request.resolution||'1K']);
 // Pre-2 image models accept only standard sizes, irrespective of config typos.
 if(config.id==='gpt-image-1.5'&&
    !['1024x1024','1536x1024','1024x1536'].includes(size))reject('UNSUPPORTED_RESOLUTION');
 const format=request.outputFormat==null||request.outputFormat==='auto'?'png':request.outputFormat;
 if(!Object.hasOwn(MIME,format)||!Array.isArray(config.formats)||
    !config.formats.includes(format))reject('UNSUPPORTED_IMAGE_FORMAT');
 if(!QUALITY.has(config.quality)||
    (['xhigh','max'].includes(config.quality)&&!config.id.startsWith('gpt-image-2.5-')))
      reject('UNSUPPORTED_IMAGE_QUALITY');
 const references=refs.map(ref=>{
   if(!ref||!['image/png','image/jpeg'].includes(ref.mimeType))reject('INVALID_REFERENCES');
   const bytes=bytesFromBase64(ref.data,MAX_REF,'INVALID_REFERENCES');
   try{verifyImage(bytes,ref.mimeType);}catch(_){reject('INVALID_REFERENCES');}
   return {mime:ref.mimeType,bytes};
 });
 return {model:config.id,prompt:request.prompt.trim(),size,quality:config.quality,
         output_format:format,n:1,references};
}
export function decodeOpenAIImageResponse(value,format){
 if(!value||!Array.isArray(value.data)||value.data.length!==1||
    !Object.hasOwn(MIME,format))reject('EMPTY_GENERATION');
 const bytes=bytesFromBase64(value.data[0]?.b64_json,MAX_IMAGE,'INVALID_PROVIDER_MEDIA');
 const mime=MIME[format];
 verifyImage(bytes,mime);
 if(value.output_format&&value.output_format!==format)reject('INVALID_PROVIDER_MEDIA');
 return {mime,bytes,text:''};
}
function requirePaidGate(gate){
 // These trusted server-only attestations do NOT replace D's real ledger validation.
 if(!gate||gate.customerPaymentConfirmed!==true||gate.purchasedCreditsReserved!==true||
    gate.serverPriceApproved!==true||gate.userConsented!==true||
    gate.durableStorageReady!==true)reject('CUSTOMER_PAID_GENERATION_REQUIRED');
}
function responseCode(status){
 if(status===429)return 'PROVIDER_BUSY';
 if(status===401||status===403)return 'PROVIDER_NOT_CONFIGURED';
 if(status===402)return 'PROVIDER_BILLING_REQUIRED';
 if(status===400||status===422)return 'PROVIDER_REQUEST_REJECTED';
 if(status>=500)return 'PROVIDER_UNAVAILABLE';
 return 'PROVIDER_ERROR';
}
// NO retries, NO URLs, NO direct browser callers, NO prod registration.
export async function generateOpenAIImage(request,{
 key,modelConfig,purchasedJobGate,fetcher=fetch
}={}){
 requirePaidGate(purchasedJobGate);
 if(typeof key!=='string'||!key.trim())reject('PROVIDER_NOT_CONFIGURED');
 const prepared=buildOpenAIImageRequest(request,modelConfig);
 const {references,...payload}=prepared;
 let body,headers={Authorization:'Bearer '+key};
 const route=references.length?'edits':'generations';
 if(references.length){
   const form=new FormData();
   for(const [name,value] of Object.entries(payload))form.append(name,String(value));
   references.forEach((ref,index)=>form.append('image[]',
      new Blob([ref.bytes],{type:ref.mime}),
      'reference-'+index+(ref.mime==='image/png'?'.png':'.jpg')));
   body=form;
 }else{
   headers={...headers,'Content-Type':'application/json'};
   body=JSON.stringify(payload);
 }
 let response;
 try{response=await fetcher(ROOT+route,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers,body
 });}catch(_){reject('PROVIDER_UNAVAILABLE');}
 if(!response||typeof response.status!=='number')reject('PROVIDER_UNAVAILABLE');
 if(!response.ok)reject(responseCode(response.status));
 let json;
 try{json=await response.json();}catch(_){reject('INVALID_PROVIDER_MEDIA');}
 // Never accept a billed output at a different reported size or quality by surprise.
 if(json?.size&&json.size!==prepared.size)reject('INVALID_PROVIDER_MEDIA');
 if(json?.quality&&prepared.quality!=='auto'&&json.quality!==prepared.quality)
   reject('INVALID_PROVIDER_MEDIA');
 return decodeOpenAIImageResponse(json,prepared.output_format);
}
