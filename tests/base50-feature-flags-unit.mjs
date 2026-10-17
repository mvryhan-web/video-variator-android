import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {MODELS,MODEL_CATALOG} from '../server/generation-provider.js';
import {generationFeatureSwitches,generationFeatureEnabled} from '../server/generation-feature-flags.js';
import {platformFeatureEnabled} from '../server/platform-feature-flags.js';
import {studioConfig,installGenerationStudio} from '../server/generation-studio.js';

const base={
 AI_STUDIO_ENABLED:'true',DATABASE_URL:'unused',ADMIN_EMAIL:'owner@test.invalid',
 AI_STUDIO_MAX_CALLS:'3',GEMINI_API_KEY:'mock-key',BYTEPLUS_API_KEY:'mock-key',
 AI_STUDIO_ALLOWED_KINDS:'image,video,music',
 AI_STUDIO_ALLOWED_MODELS:MODEL_CATALOG.map(m=>m.id).join(',')
};

test('BASE #50 kill-switch policy: absent retains working integrations, configured invalid fails closed',()=>{
 assert.deepEqual(generationFeatureSwitches({}),{image:true,video:true,byteplus:true});
 assert.deepEqual(generationFeatureSwitches({AI_IMAGE_ENABLED:'false',AI_VIDEO_ENABLED:'0',BYTEPLUS_ENABLED:'TRUE'}),
  {image:false,video:false,byteplus:false});
 assert.equal(generationFeatureEnabled('music','Google',{AI_IMAGE_ENABLED:'false',AI_VIDEO_ENABLED:'false'}),true);
 assert.equal(generationFeatureEnabled('image','BytePlus',{BYTEPLUS_ENABLED:'false'}),false);
 assert.equal(generationFeatureEnabled('image','Google',{BYTEPLUS_ENABLED:'false'}),true);
 assert.equal(generationFeatureEnabled('video','Google',{AI_VIDEO_ENABLED:'false'}),false);
});

test('model controls work on existing Studio catalog, with no duplicate provider or paid calls',()=>{
 const before=studioConfig(base);
 const googleImage=before.catalog.find(m=>m.kind==='image'&&m.provider==='Google'&&m.adapter);
 const googleVideo=before.catalog.find(m=>m.kind==='video'&&m.provider==='Google'&&m.adapter);
 const byteplusImage=before.catalog.find(m=>m.kind==='image'&&m.provider==='BytePlus'&&m.adapter);
 assert.ok(googleImage?.enabled,'Google image fixture connected');
 assert.ok(googleVideo?.enabled,'Google video fixture connected');
 assert.ok(byteplusImage?.enabled,'BytePlus image fixture connected');
 const imageOff=studioConfig({...base,AI_IMAGE_ENABLED:'false'});
 assert.equal(imageOff.catalog.find(m=>m.id===googleImage.id).enabled,false);
 assert.equal(imageOff.catalog.find(m=>m.id===byteplusImage.id).enabled,false);
 assert.equal(imageOff.catalog.find(m=>m.id===googleVideo.id).enabled,true);
 const videoOff=studioConfig({...base,AI_VIDEO_ENABLED:'false'});
 assert.equal(videoOff.catalog.find(m=>m.id===googleVideo.id).enabled,false);
 assert.equal(videoOff.catalog.find(m=>m.id===googleImage.id).enabled,true);
 const providerOff=studioConfig({...base,BYTEPLUS_ENABLED:'false'});
 assert.equal(providerOff.catalog.find(m=>m.id===byteplusImage.id).enabled,false);
 assert.equal(providerOff.catalog.find(m=>m.id===googleImage.id).enabled,true);
 assert.equal(providerOff.enabled,true,'switch must not disable the whole Studio or History');
 assert.deepEqual(providerOff.featureSwitches,{image:true,video:true,byteplus:false});
 assert.ok(!JSON.stringify(providerOff).includes('mock-key'));
});

test('disabled Video quote and create return 503 before DB write or paid provider dispatch',async()=>{
 let queryCount=0,providers=0;
 const app=express();app.use(express.json({limit:'1mb'}));
 const env={...base,AI_VIDEO_ENABLED:'false'};
 const auth=(req,_res,next)=>{req.user={id:'owner',provider:'google',email:env.ADMIN_EMAIL};next()};
 installGenerationStudio(app,{auth,env,pool:{query:async()=>{queryCount++;throw Error('NO_WRITES_ALLOWED');}},
   provider:async()=>{providers++;throw Error('MUST_NOT_DISPATCH');}});
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s))});
 try {
  const uri='http://127.0.0.1:'+server.address().port;
  const model=MODEL_CATALOG.find(m=>m.id===MODELS.video.id&&m.kind==='video');
  assert.ok(model,'Video model fixture');
  const quote=await fetch(uri+'/api/studio/estimate',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({kind:'video',model:model.id,ratio:model.ratios[0],referenceCount:0})});
  const quoteBody=await quote.json();
  assert.equal(quote.status,503);
  assert.equal(quoteBody.error,'MODEL_NOT_ENABLED');
  const created=await fetch(uri+'/api/studio/jobs',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({kind:'video',model:model.id,ratio:model.ratios[0],prompt:'Ocean sunset',
    consent:true,references:[]})});
  const createBody=await created.json();
  assert.equal(created.status,503);
  assert.equal(createBody.error,'MODEL_NOT_ENABLED');
  assert.equal(queryCount,0,'must block before touching PostgreSQL');
  assert.equal(providers,0,'must block before any charge/provider');
 } finally {await new Promise(r=>server.close(r))}
});


test('BASE #50 public discovery flags fail closed in non-production for explicit invalid values',()=>{
 const names=['AI_APPS_ENABLED','AI_INSPIRATION_ENABLED','AI_PRODUCT_VIDEO_ENABLED','AI_ONBOARDING_ENABLED'];
 for(const name of names){
  for(const value of ['false','0','TRUE','', 'disabled']){
   assert.equal(platformFeatureEnabled(name,{NODE_ENV:'staging',[name]:value}),false,name+' = '+value);
  }
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:'staging'}),true,'unset preview stays visible');
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:'production'}),false,'unset production stays blocked');
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:'production',[name]:'true'}),true);
 }
});
