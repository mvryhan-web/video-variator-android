import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('isolated Deepsyq preview serves the current Canvas UI and disables paid endpoints',async()=>{
 const port=31896,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server/deepsyq-preview.js'],{
  env:{...process.env,PORT:String(port),DATABASE_URL:'',APP_JWT_SECRET:'',STRIPE_SECRET_KEY:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''},
  stdio:['ignore','pipe','pipe']
 });
 let stderr='';
 child.stderr.on('data',chunk=>{stderr+=String(chunk);});
 try{
  await Promise.race([
   new Promise((resolve,reject)=>{
    child.stdout.on('data',d=>{if(String(d).includes('design preview running'))resolve();});
    child.on('exit',code=>reject(Error('Preview exited: '+code+' '+stderr)));
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Preview server startup timed out: '+stderr)),10000))
  ]);
  const home=await fetch(base+'/');
  assert.equal(home.status,200);assert.match(home.headers.get('x-robots-tag')||'',/noindex/);
  const html=await home.text();
  assert.match(html,/<title>Deepsyq/);
  assert.match(html,/id="quickCreatePrompt"/);
  assert.match(html,/id="quickCreateFiles"/);
  assert.match(html,/design preview/);
  const cfg=await(await fetch(base+'/api/config')).json();
  assert.equal(cfg.billingConfigured,false);
  assert.equal(cfg.googleClientId,'');
  assert.equal(cfg.features.aiApps,true);
  const models=await(await fetch(base+'/api/studio/config')).json();
  assert.equal(models.enabled,false);
  assert.ok(models.catalog.length>0);
  assert.ok(models.catalog.every(m=>m.enabled===false));
  assert.deepEqual((await(await fetch(base+'/api/templates')).json()).items,[]);
  assert.equal((await fetch(base+'/ai-apps.html')).status,200);
  for(const path of ['/api/billing/checkout','/api/studio/jobs','/api/auth/google']){
   const response=await fetch(base+path,{method:'POST'});
   assert.equal(response.status,503,path);
   assert.equal((await response.json()).error,'PREVIEW_ONLY');
  }
  assert.equal((await fetch(base+'/api/me')).status,503);
 }finally{
  child.kill();
  if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');
 }
});
