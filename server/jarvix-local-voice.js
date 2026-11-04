// Optional owner-hosted VoxCPM2 bridge. Never serve model files or credentials.
export function installLocalVoice(app, {env=process.env, fetchImpl=fetch}={}) {
 const url=env.JARVIX_VOICE_URL?.replace(/\/$/, '');
 const key=env.JARVIX_VOICE_TOKEN;
 const enabled=Boolean(url && key?.length>=32);
 if(enabled && new URL(url).protocol!=='https:') throw Error('Voice worker requires HTTPS');
 const headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
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
  if(!enabled)return res.status(503).json({error:'VOICE_NOT_CONFIGURED'});
  const {text,language}=req.body||{};
  if(typeof text!=='string'||!text.trim()||text.length>300||!['ru','en','fr','es'].includes(language))
   return res.status(400).json({error:'INVALID_SPEECH'});
  // No queue: protect the owner's laptop without introducing a commercial timer.
  if(busy)return res.status(429).json({error:'VOICE_BUSY'});
  if(req.headers.origin && req.headers.origin!== 'https://deepsyq-visual-preview-20261016.onrender.com')
   return res.status(403).json({error:'VOICE_ORIGIN_DENIED'});
  busy=true;
  try{
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
   if(audio.length<44||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE')throw Error('Invalid audio');
   res.set('Cache-Control','no-store').type('audio/wav').send(audio);
  }catch{res.status(503).json({error:'VOICE_WORKER_UNAVAILABLE'});}
  finally{busy=false;}
 });
}

