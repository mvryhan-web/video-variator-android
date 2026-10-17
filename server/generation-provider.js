// Server-only Google adapter. No account cookies or consumer subscription automation.
import {MODELS,MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
export {MODELS,MODEL_CATALOG};
const ROOT='https://generativelanguage.googleapis.com/v1beta/';
export function validateGeneration(body){
 const m=body?.model?MODEL_CATALOG.find(m=>m.id===body.model&&m.kind===body.kind&&m.adapter):MODELS[body?.kind];
 if(!m||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>2000||body.consent!==true)throw new Error('INVALID_REQUEST');
 if(m.ratios.length&&!m.ratios.includes(body.ratio))throw new Error('UNSUPPORTED_FORMAT');
 const references=body.references??[];
 if(!Array.isArray(references)||references.length>m.references)throw new Error('INVALID_REFERENCES');
 for(const r of references){
  if(!r||!['image/png','image/jpeg'].includes(r.mimeType)||typeof r.data!=='string'||r.data.length>1400000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.data))throw new Error('INVALID_REFERENCES');
  const b=Buffer.from(r.data,'base64');
  if(r.mimeType==='image/png'&&!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('INVALID_REFERENCES');
  if(r.mimeType==='image/jpeg'&&(b[0]!==255||b[1]!==216||b[2]!==255))throw new Error('INVALID_REFERENCES');
 }
 if(body.kind==='music'&&!['song','instrumental'].includes(body.musicMode))throw new Error('INVALID_MUSIC_MODE');
 return {kind:body.kind,model:m.id,prompt:body.prompt.trim(),ratio:body.ratio,references,musicMode:body.musicMode};
}
export function safeGoogleUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='generativelanguage.googleapis.com'||u.username||u.password)throw new Error('UNSAFE_PROVIDER_URL');return u.toString();}
export async function googleJson(relative,{key,body,fetcher=fetch}){
 if(!/^(models\/[a-z0-9.-]+:(generateContent|predictLongRunning)|models\/[a-z0-9.-]+\/operations\/[A-Za-z0-9_-]+|operations\/[A-Za-z0-9_-]+)$/.test(relative))throw new Error('INVALID_OPERATION');
 const r=await fetcher(ROOT+relative,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(120000),headers:{'x-goog-api-key':key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw new Error(r.status===429?'PROVIDER_BUSY':'PROVIDER_ERROR');
 return r.json();
}
export async function generateGoogle(request,{key,fetcher=fetch}){
 const model=request.model?MODEL_CATALOG.find(m=>m.id===request.model&&m.kind===request.kind&&m.adapter):MODELS[request.kind];
 if(!model||(model.provider&&model.provider!=='Google'))throw new Error('MODEL_NOT_CONNECTED');
 if(request.kind==='video'){
  const ref=request.references[0];
  const data=await googleJson(`models/${model.id}:predictLongRunning`,{key,fetcher,body:{instances:[{prompt:request.prompt,...(ref?{image:{bytesBase64Encoded:ref.data,mimeType:ref.mimeType}}:{})}],parameters:{aspectRatio:request.ratio,resolution:'720p',durationSeconds:8,sampleCount:1}}});
  if(typeof data.name!=='string')throw new Error('EMPTY_OPERATION');
  return {operation:data.name};
 }
 const prompt=request.kind==='music'?`${request.musicMode==='instrumental'?'Instrumental only, no vocals.':'Create a song with vocals.'}\n${request.prompt}`:request.prompt;
 const data=await googleJson(`models/${model.id}:generateContent`,{key,fetcher,body:{contents:[{parts:[{text:prompt},...request.references.map(inlineData=>({inlineData}))]}],...(request.kind==='image'?{generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:request.ratio,imageSize:'1K'}}}:{})}});
 const parts=data.candidates?.[0]?.content?.parts||[];
 const media=parts.map(p=>p.inlineData||p.inline_data).find(p=>p?.data&&String(p.mimeType||p.mime_type).startsWith(request.kind==='image'?'image/':'audio/'));
 if(!media)throw new Error('EMPTY_GENERATION');
 const mime=media.mimeType||media.mime_type;
 if(!['image/png','image/jpeg','audio/mpeg','audio/mp3','audio/wav'].includes(mime))throw new Error('UNSUPPORTED_PROVIDER_MEDIA');
 const bytes=Buffer.from(media.data,'base64');if(!bytes.length||bytes.length>30*1024*1024)throw new Error('INVALID_PROVIDER_MEDIA');
 return {mime,bytes,text:parts.map(p=>p.text||'').join('\n').slice(0,12000)};
}
export async function pollGoogle(operation,{key,fetcher=fetch}){
 const d=await googleJson(operation,{key,fetcher});if(!d.done)return {pending:true};
 if(d.error)throw new Error('PROVIDER_ERROR');
 const uri=d.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
 if(!uri)throw new Error('EMPTY_GENERATION');
 const r=await fetcher(safeGoogleUrl(uri),{redirect:'error',signal:AbortSignal.timeout(120000),headers:{'x-goog-api-key':key}});
 if(!r.ok)throw new Error('VIDEO_DOWNLOAD_FAILED');
 const reader=r.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>30*1024*1024)throw new Error('RESULT_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 if(!size)throw new Error('EMPTY_GENERATION');return {mime:'video/mp4',bytes:Buffer.concat(chunks),text:''};
}
