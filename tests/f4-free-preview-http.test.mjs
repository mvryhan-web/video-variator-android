import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

async function availablePort() {
 return await new Promise((resolve,reject)=>{
  const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
 });
}
async function pollJob(base,id) {
 for(let n=0;n<55;n++){
  const r=await fetch(base+'/api/studio/jobs/'+id);if(!r.ok)throw Error('job status '+r.status);
  const j=await r.json();if(j.status==='ready'||j.status==='failed')return j;
  await delay(80);
 }
 throw Error('TEST preview job never settled');
}

test('isolated TEST Studio runs synthetic no-spend HTTP workflow while keeping Jarvix and payments safe',async t=>{
 const port=await availablePort(),base='http://127.0.0.1:'+port;
 const env={...process.env,PORT:String(port),NODE_ENV:'test',FREE_AI_STUDIO_ENABLED:'true',
  HF_TOKEN:'test-invalid-key-no-real-network',FAL_KEY:'test-invalid-key-no-real-network',HUGGINGFACE_API_KEY:'',
  REPLICATE_API_TOKEN:'',STRIPE_SECRET_KEY:'',BYTEPLUS_API_KEY:''};
 const proc=spawn(process.execPath,['server/deepsyq-preview.js'],{env,stdio:['ignore','pipe','pipe']});
 let output='';proc.stderr.on('data',x=>output+=String(x).slice(0,4000));proc.stdout.on('data',x=>output+=String(x).slice(0,4000));
 t.after(()=>proc.kill('SIGTERM'));
 let found=false;
 for(let n=0;n<100;n++){try{const h=await fetch(base+'/api/health');if(h.ok){found=true;break;}}catch(_){}await delay(80);}
 assert.ok(found,'preview server did not start: '+output);
 const health=await (await fetch(base+'/api/health')).json();
 assert.equal(health.paymentsEnabled,false);assert.equal(health.aiGenerationEnabled,false);
 const config=await (await fetch(base+'/api/studio/config')).json();
 assert.equal(config.enabled,true);assert.equal(config.actualAiGeneration,false);assert.equal(config.actualVideoGeneration,false);
 assert.equal(config.artifactType,'synthetic-svg-demonstration');
 const jarvix=await fetch(base+'/api/jarvix/status');assert.equal(jarvix.status,200);
 for(const kind of ['image','video']){
  const post=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,prompt:'test preview with no paid dispatch'})});
  assert.equal(post.status,200);const {jobId}=await post.json();assert.match(jobId,/^job_[a-f0-9]{16}$/);
  const job=await pollJob(base,jobId);assert.equal(job.status,'ready');
  assert.equal(job.kind,kind);assert.match(job.provider,/Deepsyq/);
  const media=await fetch(base+job.mediaUrl);assert.equal(media.status,200);
  assert.match(media.headers.get('content-type'),/image\/svg\+xml/);
  const text=await media.text();assert.match(text,/test preview with no paid dispatch/);
 }
 const publicList=await (await fetch(base+'/api/studio/jobs')).json();
 assert.deepEqual(publicList.jobs,[],'anonymous users must not read other users prompts');
 const bad=await fetch(base+'/api/studio/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'other',prompt:'bad'})});assert.equal(bad.status,400);
 const noBilling=await fetch(base+'/api/billing/checkout',{method:'POST'});assert.equal(noBilling.status,503);
});
