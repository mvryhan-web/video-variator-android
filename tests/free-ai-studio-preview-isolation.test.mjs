import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('isolated TEST keeps billing off and returns real media TYPES via fully mocked no-spend public Space transport',async()=>{
 const port=32571,base='http://127.0.0.1:'+port;
 // Preload intercepts *all* .hf.space fetches in the child. No real GPU jobs.
 const child=spawn(process.execPath,['--import','./tests/fixtures/preview-free-space-fetch.mjs','server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),NODE_ENV:'test',FREE_AI_STUDIO_ENABLED:'true',
   HF_TOKEN:'sentinel-no-network',FAL_KEY:'sentinel-no-network',
   DATABASE_URL:'',STRIPE_SECRET_KEY:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''},
  stdio:['ignore','pipe','pipe']
 });
 let errors='';child.stderr.on('data',data=>{errors+=String(data);});
 try{
  let started=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error('preview died: '+errors);
   try{const res=await fetch(base+'/api/health');if(res.ok){started=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(started,'local isolated preview must start: '+errors);
  const health=await(await fetch(base+'/api/health')).json();
  assert.equal(health.paymentsEnabled,false);
  assert.equal(health.paidAiGenerationEnabled,false);
  assert.equal(health.freeAiGenerationEnabled,true);
  const config=await(await fetch(base+'/api/studio/config')).json();
  assert.equal(config.enabled,true);
  assert.equal(config.freeTier,true);
  assert.equal(config.outputMode,'public-free-models');
  assert.deepEqual(config.models.map(m=>m.kind).sort(),['image','music','video']);
  assert.ok(config.models.every(m=>m.enabled&&m.provider==='Hugging Face ZeroGPU'));
  const access=await fetch(base+'/api/studio/access');
  assert.equal(access.status,200);
  const cookie=access.headers.get('set-cookie')?.split(';')[0];
  assert.match(cookie||'',/^ds_preview_session=[0-9a-f-]{36}$/);

  const noConsent=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({kind:'image',model:config.models[0].id,prompt:'A blue ceramic cup'})});
  assert.equal(noConsent.status,400);
  assert.equal((await noConsent.json()).error,'FREE_EXTERNAL_CONSENT_REQUIRED');
  const privateReference=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({kind:'image',model:config.models[0].id,prompt:'A blue ceramic cup',consent:true,references:[{mimeType:'image/png',data:'AAAA'}]})});
  assert.equal(privateReference.status,400);
  assert.equal((await privateReference.json()).error,'FREE_TEXT_ONLY');

  const created=[];
  for(const [kind,mime] of [['image','image/png'],['video','video/mp4'],['music','audio/wav']]){
   const model=config.models.find(m=>m.kind===kind);
   const res=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({kind,model:model.id,prompt:'A quiet ocean at sunset',consent:true})});
   assert.equal(res.status,200,kind);
   const job=(await res.json()).jobId;
   assert.match(job,/^job_[a-f0-9]{16}$/);
   let record=null;
   for(let i=0;i<40;i++){
    const status=await fetch(base+'/api/studio/jobs/'+job,{headers:{cookie}});
    assert.equal(status.status,200);
    record=await status.json();
    if(record.status==='ready'||record.status==='failed')break;
    await new Promise(resolve=>setTimeout(resolve,100));
   }
   assert.equal(record.status,'ready',JSON.stringify(record));
   assert.equal(record.mime,mime);
   const media=await fetch(base+record.mediaUrl,{headers:{cookie}});
   assert.equal(media.status,200);
   assert.match(media.headers.get('content-type')||'',new RegExp(mime.replace('/','\\/')));
   const bytes=Buffer.from(await media.arrayBuffer());assert.ok(bytes.length>44);
   assert.equal((await fetch(base+record.mediaUrl)).status,404,'unrelated visitor cannot see media');
   assert.equal((await fetch(base+'/api/studio/jobs/'+job)).status,404,'unrelated visitor cannot see job metadata');
   created.push({job,kind});
  }
  const all=(await(await fetch(base+'/api/studio/jobs',{headers:{cookie}})).json()).items;
  assert.deepEqual(all.map(x=>x.id).sort(),created.map(x=>x.job).sort());
  assert.equal((await(await fetch(base+'/api/studio/jobs')).json()).items.length,0,'visitor session boundary');
  assert.equal((await fetch(base+'/api/billing/checkout',{method:'POST'})).status,503,'Stripe remains off');
  assert.equal((await fetch(base+'/api/me')).status,503,'production accounts remain disabled');
 }finally{child.kill('SIGTERM');}
});
