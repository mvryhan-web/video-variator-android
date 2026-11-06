import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('unified chat uses existing zero-spend handlers, private media and idempotent jobs',async()=>{
 const base='http://127.0.0.1:32606';const child=spawn(process.execPath,['server/deepsyq-preview.js'],{env:{...process.env,PORT:'32606',NODE_ENV:'test',OPENAI_API_KEY:'',FAL_KEY:'',HF_TOKEN:'',STRIPE_SECRET_KEY:'',DATABASE_URL:''},stdio:['ignore','pipe','pipe']});
 try{await new Promise((yes,no)=>{child.stdout.on('data',d=>{if(String(d).includes('design preview running'))yes();});child.on('exit',()=>no(Error('Preview exited')));});
  let cookie='';async function api(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});for(const c of r.headers.getSetCookie()){const part=c.split(';')[0];cookie=[...cookie.split('; ').filter(x=>x&&!x.startsWith(part.split('=')[0]+'=')),part].join('; ');}return r;}
  const config=await(await api('/api/studio/config')).json();assert.equal(config.previewOnly,true);assert.equal(config.outputMode,'local-demo');
  const first=await(await api('/api/jarvix/chat',{sessionId:'unified-test',message:'Хочу изображение Порше',language:'ru'})).json();assert.equal(first.provider,'jarvix-mock-brain');
  const second=await(await api('/api/jarvix/chat',{sessionId:'unified-test',message:'Сделай его чёрным',language:'ru'})).json();assert.match(second.compiledPrompt,/Porsche/);assert.equal(second.entities.color,'black');
  for(const kind of ['image','video','music']){
   const model=config.models.find(m=>m.kind===kind&&m.enabled).id,body={kind,model,prompt:'A calm forest',requestId:'chat-test-'+kind};
   const quote=await(await api('/api/studio/estimate',{kind,model,quantity:1})).json();assert.equal(quote.credits,0);assert.equal(quote.cost,0);
   const job=await(await api('/api/studio/jobs',body)).json();const duplicate=await(await api('/api/studio/jobs',body)).json();assert.equal(duplicate.jobId,job.jobId);assert.equal(duplicate.reused,true);
   let result;for(let i=0;i<40;i++){result=await(await api('/api/studio/jobs/'+job.jobId)).json();if(['ready','failed'].includes(result.status))break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(result.status,'ready');const media=await api(result.mediaUrl);assert.equal(media.status,200);assert.match(media.headers.get('content-type'),kind==='video'?/^video\//:kind==='music'?/^audio\//:/^image\//);assert.ok((await media.arrayBuffer()).byteLength>40);
   assert.equal((await fetch(base+result.mediaUrl)).status,404,'another visitor cannot read the media');
  }
 }finally{child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');}
});
