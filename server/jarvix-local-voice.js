// Optional owner-hosted VoxCPM2 bridge. Never serve model files or credentials.
import {createJarvixTtsCache,validTtsWav} from './jarvix-tts-cache.js';
import {jarvixSessionScope} from './jarvix-session-scope.js';
export function installLocalVoice(app, {env=process.env, fetchImpl=fetch}={}) {
 const url=env.JARVIX_VOICE_URL?.replace(/\/$/, '');
 const key=env.JARVIX_VOICE_TOKEN;
 const enabled=Boolean(url && key?.length>=32);
 if(enabled && new URL(url).protocol!=='https:') throw Error('Voice worker requires HTTPS');
 const headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const cache=createJarvixTtsCache(env),inFlight=new Map();
 let busy=false;
 app.get('/api/jarvix/voice-config',async(_req,res)=>{
  let ready=false;
  if(enabled)try{
   const reply=await fetchImpl(url+'/health',{headers,redirect:'error',signal:AbortSignal.timeout(5000)});
   const data=reply.ok?await reply.json():{};
   ready=data.ready===true && data.engine==='VoxCPM2';
  }catch{}
  res.set('Cache-Control','no-store').json({ok:true,speechModelInstalled:ready,speechSource:ready?'self-hosted':'browser',
   configured:enabled,languages:['ru','en','fr','es'],engine:ready?'VoxCPM2':null});
 });
 app.post('/api/jarvix/tts',async(req,res)=>{
  if(!enabled&&!cache.enabled)return res.status(503).json({error:'VOICE_NOT_CONFIGURED'});
  const {text,language}=req.body||{};
  if(typeof text!=='string'||!text.trim()||text.length>300||!['ru','en','fr','es'].includes(language))
   return res.status(400).json({error:'INVALID_SPEECH'});
  if(req.headers.origin && !['https://deepsyq-visual-preview-20261016.onrender.com','https://deepsyq.app','https://www.deepsyq.app'].includes(req.headers.origin))
   return res.status(403).json({error:'VOICE_ORIGIN_DENIED'});
  // Cache identity is a server-issued HttpOnly visitor scope, never a caller-provided user ID.
  const subject=cache.enabled?jarvixSessionScope(req,res,'tts').privateId:null;
  const cacheKey=cache.enabled?cache.filename(text,language,subject):language+'\0'+text.trim();
  const hit=cache.enabled?await cache.read(text,language,subject):null;
  if(hit)return res.set('Cache-Control','private, no-store').set('X-Jarvix-Audio-Source','persistent-cache').type('audio/wav').send(hit);
  // Identical concurrent requests share one generation; others keep the original busy gate.
  if(inFlight.has(cacheKey)){
   try{
    const audio=await inFlight.get(cacheKey);
    return res.set('Cache-Control','private, no-store').set('X-Jarvix-Audio-Source','shared-inflight').type('audio/wav').send(audio);
   }catch{return res.status(503).json({error:'VOICE_WORKER_UNAVAILABLE'});}
  }
  if(!enabled)return res.status(503).json({error:'VOICE_NOT_CONFIGURED'});
  if(busy)return res.status(429).json({error:'VOICE_BUSY'});
  busy=true;
  const synthesis=(async()=>{
   const response=await fetchImpl(url+'/tts',{method:'POST',headers,redirect:'error',
    body:JSON.stringify({text:text.trim(),language}),signal:AbortSignal.timeout(110000)});
   if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/wav'))throw Error('Voice unavailable');
   const reader=response.body.getReader(),chunks=[];let length=0;
   while(true){
    const {done,value}=await reader.read();if(done)break;
    length+=value.length;
    if(length>12*1024*1024){await reader.cancel();throw Error('Voice too large');}
    chunks.push(Buffer.from(value));
   }
   const audio=Buffer.concat(chunks);
   if(!validTtsWav(audio))throw Error('Invalid audio');
   if(cache.enabled)await cache.write(text,language,subject,audio).catch(()=>false);
   return audio;
  })();
  inFlight.set(cacheKey,synthesis);
  try{
   const audio=await synthesis;
   res.set('Cache-Control','private, no-store').set('X-Jarvix-Audio-Source','generated').type('audio/wav').send(audio);
  }catch{res.status(503).json({error:'VOICE_WORKER_UNAVAILABLE'});}
  finally{inFlight.delete(cacheKey);busy=false;}
 });
}

