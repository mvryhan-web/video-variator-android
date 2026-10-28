// Server-only Google adapter. No account cookies or consumer subscription automation.
import {MODELS,MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
export {MODELS,MODEL_CATALOG};
const ROOT='https://generativelanguage.googleapis.com/v1beta/';
// BASE #5: video/audio input transport and native camera/motion controls are
// not wired to a verified provider adapter. Never silently discard a user's
// reference or promised paid control while creating a chargeable Video task.
const UNWIRED_VIDEO_CONTROLS=[
 'referenceVideo','referenceVideos','videoReference','videoReferences',
 'referenceAudio','referenceAudios','audioReference','audioReferences',
 'reference_video','reference_audio','videoUrl','audioUrl',
 'camera','cameraMotion','camera_motion','motion','motionControls','motion_controls',
 'generateAudio','generate_audio','watermark'
];
export function rejectUnsupportedVideoControls(body){
 if(body?.kind!=='video'||!body||typeof body!=='object')return;
 if(UNWIRED_VIDEO_CONTROLS.some(k=>Object.prototype.hasOwnProperty.call(body,k)))
  throw new Error('UNSUPPORTED_VIDEO_CONTROL');
 // Video uses an explicit accepted request/quote contract. A future UI field
 // must not become a paid promise until the provider adapter supports it.
 // `credits` is a legacy untrusted quote hint, never a provider control or
 // server-authoritative price. validateGeneration drops it before pricing.
 const allowed=new Set(['kind','model','prompt','consent','ratio','references',
  'videoInputMode','videoResolution','videoDuration','musicMode',
  'requestId','referenceCount','expectedCredits','quantity','credits']);
 const legacyImageErrors=new Set(['seed','negativePrompt','negative_prompt']);
 if(Object.keys(body).some(k=>!allowed.has(k)&&!legacyImageErrors.has(k)))
  throw new Error('UNSUPPORTED_VIDEO_CONTROL');
}
export function validateGeneration(body){
 const selectedModelId=body?.model||MODELS[body?.kind]?.id;
 const m=MODEL_CATALOG.find(candidate=>candidate.id===selectedModelId&&candidate.kind===body?.kind&&candidate.adapter);
 if(!m||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>2000||body.consent!==true)throw new Error('INVALID_REQUEST');
 rejectUnsupportedVideoControls(body);
 // Existing Image providers have no verified seed/negative-prompt API support.
 // Reject explicit fields instead of silently ignoring a promised control.
 if(body&&('seed'in body||'negativePrompt'in body||'negative_prompt'in body))throw new Error('UNSUPPORTED_IMAGE_CONTROL');
 if(m.ratios.length&&!m.ratios.includes(body.ratio))throw new Error('UNSUPPORTED_FORMAT');
 const references=body.references??[];
 if(!Array.isArray(references)||references.length>m.references)throw new Error('INVALID_REFERENCES');
 for(const r of references){
  if(!r||!['image/png','image/jpeg'].includes(r.mimeType)||typeof r.data!=='string'||r.data.length>1400000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.data))throw new Error('INVALID_REFERENCES');
  const b=Buffer.from(r.data,'base64');
  if(r.mimeType==='image/png'&&!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('INVALID_REFERENCES');
  if(r.mimeType==='image/jpeg'&&(b[0]!==255||b[1]!==216||b[2]!==255))throw new Error('INVALID_REFERENCES');
 }
 const outputFormat=body.kind==='image'?(body.outputFormat||m.capabilities?.outputFormats?.[0]||'auto'):null;
 if(body.kind==='image'&&!m.capabilities?.outputFormats?.includes(outputFormat))throw new Error('UNSUPPORTED_IMAGE_FORMAT');
 if(body.kind!=='image'&&body.outputFormat)throw new Error('UNSUPPORTED_IMAGE_FORMAT');
 const resolution=body.kind==='image'?(body.resolution||m.quality||'1K'):null;
 if(body.kind==='image'&&(!m.capabilities?.resolutions?.includes(resolution)))throw new Error('UNSUPPORTED_RESOLUTION');
 if(body.kind!=='image'&&body.resolution)throw new Error('UNSUPPORTED_RESOLUTION');
 const videoInputMode=body.kind==='video'?(body.videoInputMode||(references.length?'first_frame':'text')):null;
 if(body.kind==='video'&&!m.capabilities?.videoInputModes?.includes(videoInputMode))throw new Error('UNSUPPORTED_VIDEO_INPUT_MODE');
 if(body.kind==='video'&&(
  videoInputMode==='text'&&references.length!==0||
  videoInputMode==='first_frame'&&references.length!==1||
  videoInputMode==='first_last'&&references.length!==2||
  videoInputMode==='reference_image'&&(references.length<1||references.length>3)
 ))throw new Error('INVALID_VIDEO_REFERENCES');
 if(body.kind!=='video'&&body.videoInputMode!=null)throw new Error('UNSUPPORTED_VIDEO_SETTINGS');
 const videoResolution=body.kind==='video'?(body.videoResolution||m.quality):null;
 const videoDuration=body.kind==='video'?(body.videoDuration==null?m.capabilities?.durationSeconds:body.videoDuration):null;
 if(body.kind==='video'&&!m.capabilities?.resolutions?.includes(videoResolution))throw new Error('UNSUPPORTED_VIDEO_RESOLUTION');
 if(body.kind==='video'&&!m.capabilities?.durations?.includes(videoDuration))throw new Error('UNSUPPORTED_VIDEO_DURATION');
 if(body.kind==='video'&&m.provider==='Google'&&references.length&&videoDuration!==8)throw new Error('UNSUPPORTED_VIDEO_DURATION');
 if(body.kind==='video'&&m.provider==='Google'&&videoResolution==='1080p'&&videoDuration!==8)throw new Error('UNSUPPORTED_VIDEO_DURATION');
 if(body.kind!=='video'&&(body.videoResolution!=null||body.videoDuration!=null))throw new Error('UNSUPPORTED_VIDEO_SETTINGS');
 if(body.kind==='music'&&!['song','instrumental'].includes(body.musicMode))throw new Error('INVALID_MUSIC_MODE');
 return {kind:body.kind,model:m.id,prompt:body.prompt.trim(),ratio:body.ratio,references,musicMode:body.musicMode,...(body.kind==='image'?{resolution,outputFormat}:{}),...(body.kind==='video'?{videoResolution,videoDuration,videoInputMode}:{})};
}
export function safeGoogleUrl(value){
 let u;try{u=new URL(value);}catch{throw new Error('UNSAFE_PROVIDER_URL');}
 // Never send the server API key to nonstandard ports, userinfo or fragments.
 // Veo may require ?alt=media on the legitimate Google API HTTPS origin.
 if(u.protocol!=='https:'||u.hostname!=='generativelanguage.googleapis.com'||
    u.username||u.password||u.port||u.hash)throw new Error('UNSAFE_PROVIDER_URL');
 return u.toString();
}
export async function googleJson(relative,{key,body,fetcher=fetch,signal=null}){
 signal?.throwIfAborted();
 if(typeof key!=='string'||!key.trim())throw new Error('PROVIDER_KEY_REQUIRED');
 if(!/^(interactions|models\/[a-z0-9.-]+:(generateContent|predictLongRunning)|models\/[a-z0-9.-]+\/operations\/[A-Za-z0-9_-]+|operations\/[A-Za-z0-9_-]+)$/.test(relative))throw new Error('INVALID_OPERATION');
 const jsonBody=body?JSON.stringify(body):undefined;
 signal?.throwIfAborted();
 const r=await fetcher(ROOT+relative,{method:body?'POST':'GET',redirect:'error',
 signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000),
 headers:{'x-goog-api-key':key,...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:jsonBody}:{})});
 signal?.throwIfAborted();
 if(!r.ok)throw new Error(r.status===429?'PROVIDER_BUSY':'PROVIDER_ERROR');
 // Native fetch responses are streamed and hard-capped. The provider may omit
 // or forge Content-Length, so enforce the decoded byte limit while reading.
 // The json() fallback is for narrowly mocked fetchers without a body stream.
 const maxJson=42*1024*1024;
 if(Number(r.headers?.get?.('content-length'))>maxJson)throw new Error('RESULT_TOO_LARGE');
 if(r.body?.getReader){
  const reader=r.body.getReader(),chunks=[];let size=0;
  try{
   for(;;){const {value,done}=await reader.read();signal?.throwIfAborted();if(done)break;
    size+=value.length;if(size>maxJson)throw new Error('RESULT_TOO_LARGE');
    chunks.push(Buffer.from(value));
   }
  }finally{await reader.cancel().catch(()=>{});}
  signal?.throwIfAborted();
  if(!size)throw new Error('EMPTY_GENERATION');
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{throw new Error('INVALID_PROVIDER_MEDIA');}
 }
 const data=await r.json();
 signal?.throwIfAborted();
 return data;
}
export async function generateGoogle(request,{key,fetcher=fetch,signal=null}){
 signal?.throwIfAborted();
 const selectedId=request.model||MODELS[request.kind]?.id;
 const model=MODEL_CATALOG.find(m=>m.id===selectedId&&m.kind===request.kind&&m.adapter);
 if(!model||(model.provider&&model.provider!=='Google'))throw new Error('MODEL_NOT_CONNECTED');
 if(request.kind==='video'){
  const ref=request.references[0];
  const data=await googleJson(`models/${model.id}:predictLongRunning`,{key,fetcher,signal,body:{instances:[{prompt:request.prompt,...(ref?{image:{bytesBase64Encoded:ref.data,mimeType:ref.mimeType}}:{})}],parameters:{aspectRatio:request.ratio,resolution:request.videoResolution||model.quality,durationSeconds:request.videoDuration??model.capabilities.durationSeconds,sampleCount:1}}});
  // Persist only IDs that the polling endpoint can actually address.
  // Arbitrary provider strings would strand a paid asynchronous job.
  if(typeof data.name!=='string'||data.name.length>512||
     !/^(?:operations\/[A-Za-z0-9_-]+|models\/[a-z0-9.-]+\/operations\/[A-Za-z0-9_-]+)$/.test(data.name))
    throw new Error('EMPTY_OPERATION');
  return {operation:data.name};
 }
 if(request.kind==='image'&&['gemini-nano-banana-2.1','gemini-3-pro-image'].includes(model.id)){
  const input=[{type:'text',text:request.prompt},...request.references.map(ref=>({type:'image',mime_type:ref.mimeType,data:ref.data}))];
  const data=await googleJson('interactions',{key,fetcher,signal,body:{model:model.id,input,response_format:{type:'image',mime_type:'image/png',aspect_ratio:request.ratio,image_size:request.resolution||'1K'}}});
  const image=data.output_image;
  if(!image||typeof image.data!=='string'||image.data.length>40*1024*1024||image.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(image.data))throw new Error('INVALID_PROVIDER_MEDIA');
  const bytes=Buffer.from(image.data,'base64'),mime=image.mime_type||image.mimeType||'image/png';
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(bytes.length>30*1024*1024||!((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpeg)))throw new Error('INVALID_PROVIDER_MEDIA');
  return {mime,bytes,text:''};
 }
 const prompt=request.kind==='music'?`${request.musicMode==='instrumental'?'Instrumental only, no vocals.':'Create a song with vocals.'}\n${request.prompt}`:request.prompt;
 const data=await googleJson(`models/${model.id}:generateContent`,{key,fetcher,signal,body:{contents:[{parts:[{text:prompt},...request.references.map(inlineData=>({inlineData}))]}],...(request.kind==='image'?{generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:request.ratio,imageSize:request.resolution||'1K'}}}:{})}});
 const parts=data.candidates?.[0]?.content?.parts||[];
 const media=parts.map(p=>p.inlineData||p.inline_data).find(p=>p?.data&&String(p.mimeType||p.mime_type).startsWith(request.kind==='image'?'image/':'audio/'));
 if(!media)throw new Error('EMPTY_GENERATION');
 const mime=media.mimeType||media.mime_type;
 if(!['image/png','image/jpeg','audio/mpeg','audio/mp3','audio/wav'].includes(mime))throw new Error('UNSUPPORTED_PROVIDER_MEDIA');
 if(typeof media.data!=='string'||media.data.length>40*1024*1024||media.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(media.data))throw new Error('INVALID_PROVIDER_MEDIA');
 const bytes=Buffer.from(media.data,'base64');if(!bytes.length||bytes.length>30*1024*1024)throw new Error('INVALID_PROVIDER_MEDIA');
 if(request.kind==='image'){
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!((mime==='image/png'&&png)||(mime==='image/jpeg'&&jpeg)))throw new Error('INVALID_PROVIDER_MEDIA');
 }
 return {mime,bytes,text:parts.map(p=>p.text||'').join('\n').slice(0,12000)};
}
// A file-type signature is not a playable result. Require a complete top-level
// MP4 box sequence, movie metadata with a track and nonempty media payload.
// This is structural validation only, not a codec or malware assessment.
function mp4Box(data,offset,end){
 if(offset+8>end)return null;
 let length=data.readUInt32BE(offset),header=8;
 if(length===1){
  if(offset+16>end)return null;
  const extended=data.readBigUInt64BE(offset+8);
  if(extended>BigInt(end-offset))return null;
  length=Number(extended);header=16;
 }else if(length===0)length=end-offset;
 if(length<header||offset+length>end)return null;
 return {kind:data.toString('ascii',offset+4,offset+8),start:offset+header,end:offset+length};
}
function completeMp4Media(bytes){
 let pos=0,top=0,hasMovie=false,hasMedia=false;
 while(pos<bytes.length&&++top<=4096){
  const box=mp4Box(bytes,pos,bytes.length);if(!box)return false;
  if(box.kind==='mdat'&&box.end>box.start)hasMedia=true;
  if(box.kind==='moov'){
   let childPos=box.start,nested=0,hasHeader=false,hasTrack=false;
   while(childPos<box.end&&++nested<=4096){
    const child=mp4Box(bytes,childPos,box.end);if(!child)return false;
    if(child.kind==='mvhd')hasHeader=true;
    if(child.kind==='trak')hasTrack=true;
    childPos=child.end;
   }
   if(childPos!==box.end||!hasHeader||!hasTrack)return false;
   hasMovie=true;
  }
  pos=box.end;
 }
 return pos===bytes.length&&top<=4096&&hasMovie&&hasMedia;
}

export async function pollGoogle(operation,{key,fetcher=fetch,signal=null}){
 signal?.throwIfAborted();
 const d=await googleJson(operation,{key,fetcher,signal});signal?.throwIfAborted();if(!d.done)return {pending:true};
 if(d.error){const failure=new Error('PROVIDER_TASK_FAILED');failure.terminal=true;throw failure;}
 const uri=d.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
 if(!uri)throw new Error('EMPTY_GENERATION');
 signal?.throwIfAborted();
 const r=await fetcher(safeGoogleUrl(uri),{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000),headers:{'x-goog-api-key':key}});
 signal?.throwIfAborted();
 if(!r.ok)throw new Error('VIDEO_DOWNLOAD_FAILED');
 const limit=30*1024*1024;
 if(Number(r.headers?.get?.('content-length'))>limit)throw new Error('RESULT_TOO_LARGE');
 if(!r.body?.getReader)throw new Error('INVALID_PROVIDER_MEDIA');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();signal?.throwIfAborted();if(done)break;size+=value.length;if(size>limit)throw new Error('RESULT_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 signal?.throwIfAborted();
 if(!size)throw new Error('EMPTY_GENERATION');
 const bytes=Buffer.concat(chunks),headerSize=bytes.length>=8?bytes.readUInt32BE(0):0;
 // Never report HTML/JSON/error pages as completed MP4 output. Use a minimal
 // ISO-BMFF file-type box check; this is NOT a codec or malware verdict.
 const brand=bytes.toString('ascii',8,12);
 // AVIF/HEIC and arbitrary ISO-BMFF boxes also start with 'ftyp'. Only
 // recognized video MP4 major brands may be served as video/mp4 here.
 const mp4Brand=/^(?:isom|iso[2-9]|mp4[12]|avc1|hvc1|hev1|M4V |dash|msdh|f4v )$/.test(brand);
 if(bytes.length<16||bytes.subarray(4,8).toString('ascii')!=='ftyp'||
    headerSize<16||headerSize>bytes.length||!mp4Brand||!completeMp4Media(bytes))throw new Error('INVALID_PROVIDER_MEDIA');
 return {mime:'video/mp4',bytes,text:''};
}
