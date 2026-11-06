/**
 * TEST-only public Hugging Face ZeroGPU Space adapter.
 * No provider secrets, Stripe, paid API calls, or commercial credentials.
 * These are community-hosted third-party demos: capacity is NOT guaranteed.
 * Text-only requests; uploaded photos/audio are NEVER forwarded here.
 */
export const FREE_SPACE_MODELS=Object.freeze({
  image:Object.freeze({id:'test-flux-schnell',label:'FLUX.1 Schnell · Free',host:'black-forest-labs-flux-1-schnell.hf.space',action:'infer',mime:['image/png','image/jpeg','image/webp']}),
  video:Object.freeze({id:'test-ltx-video',label:'LTX-Video · Free',host:'lightricks-ltx-video-distilled.hf.space',action:'text_to_video',mime:['video/mp4']}),
  music:Object.freeze({id:'test-musicgen',label:'MusicGen · Free',host:'facebook-musicgen.hf.space',action:'predict_batched',mime:['audio/wav','audio/mpeg','audio/mp3','audio/ogg']})
});
const failure=(name)=>{throw Error(name);};
const allowedEventId=s=>typeof s==='string'&&/^[a-f0-9-]{8,80}$/i.test(s);
const fileLimit={image:16*1024*1024,video:24*1024*1024,music:16*1024*1024};
function requestData(kind,prompt){
  if(kind==='image')return [prompt,0,true,512,512,4];
  if(kind==='video')return [prompt,'',null,null,320,512,'text-to-video',2,33,0,true,2,false];
  if(kind==='music')return [prompt,null];
  return failure('FREE_MODEL_UNAVAILABLE');
}
function findFile(value,depth=0){
  if(depth>5||!value)return null;
  if(typeof value==='string')return value;
  if(typeof value!=='object')return null;
  if(typeof value.url==='string'&&value.url)return value.url;
  if(typeof value.path==='string'&&value.path)return value.path;
  if(Array.isArray(value)){for(const v of value){const result=findFile(v,depth+1);if(result)return result;}}
  else{for(const [k,v] of Object.entries(value)){if(k==='meta')continue;const result=findFile(v,depth+1);if(result)return result;}}
  return null;
}
function safeMediaUrl(raw,model){
  if(typeof raw!=='string'||raw.length>3000)return failure('FREE_INVALID_MEDIA_URL');
  let url;
  try{
    if(raw.startsWith('/')&&!raw.startsWith('//'))url=new URL(raw,'https://'+model.host);
    else if(raw.startsWith('https://'))url=new URL(raw);
    else if(!raw.includes('://'))url=new URL('/gradio_api/file='+encodeURIComponent(raw),'https://'+model.host);
  }catch{}
  if(!url||url.protocol!=='https:'||url.hostname!==model.host||url.username||url.password||url.port)
    return failure('FREE_INVALID_MEDIA_URL');
  return url.href;
}
function mediaType(bytes,kind){
  if(kind==='image'){
    if(bytes.length<24)return failure('FREE_RESULT_FORMAT_MISMATCH');
    if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
    if(bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
    if(bytes.length>12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
  }
  if(kind==='video'&&bytes.length>32&&bytes.toString('ascii',4,8)==='ftyp'&&bytes.includes(Buffer.from('moov'))&&bytes.includes(Buffer.from('mdat')))return 'video/mp4';
  if(kind==='music'){
    if(bytes.length<44)return failure('FREE_RESULT_FORMAT_MISMATCH');
    if(bytes.length>44&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE')return 'audio/wav';
    if(bytes.length>3&&bytes.toString('ascii',0,3)==='ID3')return 'audio/mpeg';
    if(bytes.length>3&&bytes[0]===255&&(bytes[1]&224)===224)return 'audio/mpeg';
    if(bytes.length>4&&bytes.toString('ascii',0,4)==='OggS')return 'audio/ogg';
  }
  return failure('FREE_RESULT_FORMAT_MISMATCH');
}
async function limitedBody(response,max){
  const chunks=[];let length=0;
  if(!response.body)return failure('FREE_EMPTY_RESULT');
  for await(const chunk of response.body){
    const bytes=Buffer.from(chunk);length+=bytes.length;
    if(length>max)return failure('FREE_RESULT_TOO_LARGE');
    chunks.push(bytes);
  }
  if(!length)return failure('FREE_EMPTY_RESULT');
  return Buffer.concat(chunks,length);
}
function parseGradioEvent(data){
  let value;
  try{value=JSON.parse(data);}catch{return failure('FREE_PROVIDER_BAD_RESULT');}
  if(value?.error)return failure('FREE_PROVIDER_FAILED');
  return value;
}
/**
 * @param {object} args
 * @param {Function} args.fetcher Injectable for zero-cost network-free tests.
 */
export async function generateTestSpaceMedia({kind,model:requestedModel,prompt,consent,referenceCount=0,fetcher=fetch,timeoutMs=150000}={}){
  const entry=FREE_SPACE_MODELS[kind];
  if(!entry||entry.id!==requestedModel)return failure('FREE_MODEL_UNAVAILABLE');
  if(consent!==true)return failure('FREE_EXTERNAL_CONSENT_REQUIRED');
  if(!Number.isSafeInteger(referenceCount)||referenceCount!==0)return failure('FREE_TEXT_ONLY');
  if(typeof prompt!=='string'||prompt.trim().length<3||prompt.length>1200)return failure('FREE_INVALID_PROMPT');
  if(timeoutMs<1000||timeoutMs>180000)return failure('FREE_INVALID_TIMEOUT');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const root='https://'+entry.host+'/gradio_api/call/'+entry.action;
    const started=await fetcher(root,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({data:requestData(kind,prompt.trim())}),signal:controller.signal});
    if(started.status===429)return failure('FREE_PROVIDER_QUOTA_REACHED');
    if(!started.ok)return failure('FREE_PROVIDER_UNAVAILABLE');
    const reply=await started.json();
    if(!allowedEventId(reply?.event_id))return failure('FREE_PROVIDER_BAD_JOB_ID');
    const events=await fetcher(root+'/'+reply.event_id,{method:'GET',redirect:'error',headers:{accept:'text/event-stream'},signal:controller.signal});
    if(!events.ok||!events.body)return failure('FREE_PROVIDER_UNAVAILABLE');
    let text='',completion=null;
    for await(const chunk of events.body){
      text+=Buffer.from(chunk).toString('utf8').replace(/\r/g,'');
      if(text.length>1024*1024)return failure('FREE_PROVIDER_BAD_RESULT');
      let separator;
      while((separator=text.indexOf('\n\n'))!==-1){
        const block=text.slice(0,separator).replace(/\r/g,'');text=text.slice(separator+2);
        const e=block.match(/^event: *([^\n]+)/m)?.[1]?.trim();
        if(e==='error')return failure('FREE_PROVIDER_FAILED');
        if(e==='complete'){
          const payload=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('');
          completion=parseGradioEvent(payload);
          break;
        }
      }
      if(completion!==null)break;
    }
    if(completion===null)return failure('FREE_PROVIDER_INCOMPLETE');
    const raw=findFile(completion);
    if(!raw)return failure('FREE_EMPTY_RESULT');
    const url=safeMediaUrl(raw,entry);
    const result=await fetcher(url,{method:'GET',redirect:'error',signal:controller.signal});
    if(!result.ok)return failure('FREE_DOWNLOAD_FAILED');
    const buffer=await limitedBody(result,fileLimit[kind]);
    const mime=mediaType(buffer,kind);
    if(!entry.mime.includes(mime))return failure('FREE_RESULT_FORMAT_MISMATCH');
    return {buffer,mime,provider:'Hugging Face public ZeroGPU ('+entry.label+')',previewOnly:true};
  }catch(e){
    if(controller.signal.aborted)return failure('FREE_PROVIDER_TIMEOUT');
    throw e;
  }finally{clearTimeout(timer);}
}
