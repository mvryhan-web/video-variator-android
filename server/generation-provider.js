// Server-only Google adapter. No account cookies or consumer subscription automation.
import {MODELS,MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
export {MODELS,MODEL_CATALOG};
const ROOT='https://generativelanguage.googleapis.com/v1beta/';
export function validateGeneration(body){
 const selectedModelId=body?.model||MODELS[body?.kind]?.id;
 const m=MODEL_CATALOG.find(candidate=>candidate.id===selectedModelId&&candidate.kind===body?.kind&&candidate.adapter);
 if(!m||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>2000||body.consent!==true)throw new Error('INVALID_REQUEST');
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
export function safeGoogleUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='generativelanguage.googleapis.com'||u.username||u.password)throw new Error('UNSAFE_PROVIDER_URL');return u.toString();}
export async function googleJson(relative,{key,body,fetcher=fetch}){
 if(!/^(models\/[a-z0-9.-]+:(generateContent|predictLongRunning)|models\/[a-z0-9.-]+\/operations\/[A-Za-z0-9_-]+|operations\/[A-Za-z0-9_-]+)$/.test(relative))throw new Error('INVALID_OPERATION');
 const r=await fetcher(ROOT+relative,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(120000),headers:{'x-goog-api-key':key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw new Error(r.status===429?'PROVIDER_BUSY':'PROVIDER_ERROR');
 return r.json();
}
export async function generateGoogle(request,{key,fetcher=fetch}){
 const selectedId=request.model||MODELS[request.kind]?.id;
 const model=MODEL_CATALOG.find(m=>m.id===selectedId&&m.kind===request.kind&&m.adapter);
 if(!model||(model.provider&&model.provider!=='Google'))throw new Error('MODEL_NOT_CONNECTED');
 if(request.kind==='video'){
  const ref=request.references[0];
  const data=await googleJson(`models/${model.id}:predictLongRunning`,{key,fetcher,body:{instances:[{prompt:request.prompt,...(ref?{image:{bytesBase64Encoded:ref.data,mimeType:ref.mimeType}}:{})}],parameters:{aspectRatio:request.ratio,resolution:request.videoResolution||model.quality,durationSeconds:request.videoDuration??model.capabilities.durationSeconds,sampleCount:1}}});
  if(typeof data.name!=='string')throw new Error('EMPTY_OPERATION');
  return {operation:data.name};
 }
 const prompt=request.kind==='music'?`${request.musicMode==='instrumental'?'Instrumental only, no vocals.':'Create a song with vocals.'}\n${request.prompt}`:request.prompt;
 const data=await googleJson(`models/${model.id}:generateContent`,{key,fetcher,body:{contents:[{parts:[{text:prompt},...request.references.map(inlineData=>({inlineData}))]}],...(request.kind==='image'?{generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:request.ratio,imageSize:request.resolution||'1K'}}}:{})}});
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
export async function pollGoogle(operation,{key,fetcher=fetch}){
 const d=await googleJson(operation,{key,fetcher});if(!d.done)return {pending:true};
 if(d.error){const failure=new Error('PROVIDER_TASK_FAILED');failure.terminal=true;throw failure;}
 const uri=d.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
 if(!uri)throw new Error('EMPTY_GENERATION');
 const r=await fetcher(safeGoogleUrl(uri),{redirect:'error',signal:AbortSignal.timeout(120000),headers:{'x-goog-api-key':key}});
 if(!r.ok)throw new Error('VIDEO_DOWNLOAD_FAILED');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>30*1024*1024)throw new Error('RESULT_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 if(!size)throw new Error('EMPTY_GENERATION');return {mime:'video/mp4',bytes:Buffer.concat(chunks),text:''};
}
