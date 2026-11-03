import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('live isolated TEST Studio creates a zero-spend preview and keeps prompts/media visitor-private',async()=>{
 const port=32571,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),NODE_ENV:'test',FREE_AI_STUDIO_ENABLED:'true',
   HF_TOKEN:'sentinel-no-network',FAL_KEY:'sentinel-no-network',
   DATABASE_URL:'',STRIPE_SECRET_KEY:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''},
  stdio:['ignore','pipe','pipe']
 });
 let errors='';
 child.stderr.on('data',data=>{errors+=String(data);});
 try{
  let started=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error('preview died: '+errors);
   try{const res=await fetch(base+'/api/health');if(res.ok){started=true;break;}}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(started,'local isolated preview must start: '+errors);
  const config=await(await fetch(base+'/api/studio/config')).json();
  assert.equal(config.enabled,true);
  const access=await fetch(base+'/api/studio/access');
  assert.equal(access.status,200);
  const cookie=access.headers.get('set-cookie')?.split(';')[0];
  assert.match(cookie||'',/^ds_preview_session=[0-9a-f-]{36}$/);
  const req=await fetch(base+'/api/studio/jobs',{method:'POST',
   headers:{'content-type':'application/json',cookie},
   body:JSON.stringify({kind:'image',prompt:'Visitor-secret-original-drawing',model:'flux-schnell'})});
  assert.equal(req.status,200);
  const created=await req.json();
  assert.match(created.jobId,/^job_[a-f0-9]{16}$/);
  let own;
  for(let i=0;i<40;i++){
   const response=await fetch(base+'/api/studio/jobs/'+created.jobId,{headers:{cookie}});
   assert.equal(response.status,200);
   own=await response.json();
   if(own.status==='ready')break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(own.status,'ready',JSON.stringify(own));
  assert.match(own.mediaUrl,/\/api\/studio\/jobs\//);
  const media=await fetch(base+own.mediaUrl,{headers:{cookie}});
  assert.equal(media.status,200);
  assert.match(media.headers.get('content-type')||'',/image\/svg\+xml/);
  assert.match(await media.text(),/Visitor-secret-original-drawing/);

  const mine=await(await fetch(base+'/api/studio/jobs',{headers:{cookie}})).json();
  assert.ok(mine.items.some(job=>job.id===created.jobId));
  const other=await(await fetch(base+'/api/studio/jobs')).json();
  assert.equal(other.items.length,0,'public list may not expose other visitors prompts');
  assert.equal((await fetch(base+'/api/studio/jobs/'+created.jobId)).status,404);
  assert.equal((await fetch(base+own.mediaUrl)).status,404);

  // Deliberately no external inference: test-only video fallback is SVG, never a fake MP4.
  const movie=await fetch(base+'/api/studio/jobs',{method:'POST',
   headers:{'content-type':'application/json',cookie},
   body:JSON.stringify({kind:'video',prompt:'Animated local demo',duration:5})});
  assert.equal(movie.status,200);
  const videoId=(await movie.json()).jobId;
  const video=await(await fetch(base+'/api/studio/jobs/'+videoId,{headers:{cookie}})).json();
  assert.equal(video.status,'ready');
  const videoMedia=await fetch(base+video.mediaUrl,{headers:{cookie}});
  assert.match(videoMedia.headers.get('content-type')||'',/image\/svg\+xml/);
 }finally{
  child.kill('SIGTERM');
 }
});
