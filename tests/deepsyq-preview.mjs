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

  // A design preview must stay safe even after production adds new payment,
  // generation, admin or signup endpoints. Exercise representative surfaces
  // through the real isolated HTTP server (no Stripe/provider/database).
  const health=await fetch(base+'/api/health');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{
   ok:true,service:'deepsyq-design-preview',paymentsEnabled:false,aiGenerationEnabled:false
  });
  for(const route of ['/api/me','/api/ai-wallet/balance','/api/studio/admin/business',
                      '/api/studio/jobs','/api/billing/checkout','/api/auth/email/login']){
   const response=await fetch(base+route);
   assert.equal(response.status,503,'GET '+route);
   assert.equal((await response.json()).error,'PREVIEW_ONLY','GET '+route);
  }
  for(const route of ['/api/studio/generate','/api/ai-wallet/welcome',
                      '/api/studio/jobs','/api/auth/email/login',
                      '/api/billing/checkout','/api/webhooks/stripe']){
   const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
   assert.equal(response.status,503,'POST '+route);
   assert.equal((await response.json()).error,'PREVIEW_ONLY','POST '+route);
  }
  const robots=await fetch(base+'/robots.txt');
  assert.equal(robots.status,200);
  assert.match(await robots.text(),/Disallow:\s*\//);
  for(const route of ['/','/deepsyq.html','/deepsyq-logo.png','/deepsyq.webmanifest']){
   const response=await fetch(base+route);
   assert.equal(response.status,200,route);
   assert.match(response.headers.get('x-robots-tag')||'',/noindex/i,route);
   assert.equal(response.headers.get('cache-control'),'no-store',route);
   assert.equal(response.headers.get('x-content-type-options'),'nosniff',route);
  }
  const logo=await fetch(base+'/deepsyq-logo.png');
  assert.match(logo.headers.get('content-type')||'',/image\/png/);
  const magic=new Uint8Array(await logo.arrayBuffer()).slice(0,8);
  assert.deepEqual([...magic],[137,80,78,71,13,10,26,10],'approved original PNG must render');
  const manifestResponse=await fetch(base+'/deepsyq.webmanifest');
  assert.equal(manifestResponse.status,200);
  const manifest=await manifestResponse.json();
  assert.equal(manifest.short_name,'Deepsyq');
  assert.equal(manifest.start_url,'/deepsyq.html');
  for(const icon of manifest.icons){
   const response=await fetch(base+'/'+icon.src);
   assert.equal(response.status,200,'Missing PWA brand image: '+icon.src);
   assert.match(response.headers.get('content-type')||'',/image\/png/);
  }
  const legacy=await(await fetch(base+'/manifest.webmanifest')).json();
  assert.equal(legacy.short_name,'Uniquifier','existing video tool identity must not be overwritten');
  const forbidden=await fetch(base+'/.env');
  assert.equal(forbidden.status,404,'preview must not expose project-level secrets');

 }finally{
  child.kill();
  if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');
 }
});
