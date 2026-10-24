import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {bytePlusPublicDurableStorageReady} from '../server/generation-byteplus-storage-gate.js';
import {studioConfig,installGenerationStudio} from '../server/generation-studio.js';
import {applyModelControl} from '../server/generation-model-control.js';
import {orderedGenerationCandidates,resolveGenerationModel} from '../server/generation-routing.js';

const byteplus={kind:'video',provider:'BytePlus',id:'byteplus-seedance-2'};
const google={kind:'video',provider:'Google',id:'veo-3.1-lite-generate-preview'};
const image={kind:'image',provider:'BytePlus',id:'byteplus-seedream-4-5'};
const videoModel='byteplus-seedance-2';
const env={
 AI_PUBLIC_GENERATION_ENABLED:'true',AI_STUDIO_ENABLED:'true',
 BYTEPLUS_API_KEY:'mock-never-used',GEMINI_API_KEY:'mock-never-used',
 DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test',AI_STUDIO_MAX_CALLS:'3',
 AI_STUDIO_ALLOWED_KINDS:'video',AI_STUDIO_ALLOWED_MODELS:videoModel,
 BYTEPLUS_MEDIA_HOSTS:'media.volces.com'
};
const storage={
 AI_OBJECT_STORAGE_ENABLED:'true',
 AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',
 AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',AI_OBJECT_STORAGE_REGION:'auto',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'ACCESSKEY123',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'very-secret-storage-key-12345'
};
const available=c=>c.catalog.find(m=>m.id===videoModel)?.enabled;

test('BASE #42 public BytePlus video fails closed without durable S3 configuration',()=>{
 assert.equal(bytePlusPublicDurableStorageReady(byteplus,env),false);
 assert.equal(available(studioConfig(env)),false);
 for(const name of ['AI_OBJECT_STORAGE_ENABLED','AI_OBJECT_STORAGE_ENDPOINT','AI_OBJECT_STORAGE_BUCKET','AI_OBJECT_STORAGE_ACCESS_KEY_ID','AI_OBJECT_STORAGE_SECRET_ACCESS_KEY']){
  const incomplete={...env,...storage};delete incomplete[name];
  assert.equal(bytePlusPublicDurableStorageReady(byteplus,incomplete),false,name);
  assert.equal(available(studioConfig(incomplete)),false,name);
 }
});

test('BASE #42 configured private S3 keeps existing BytePlus adapter available, no outbound calls',()=>{
 const ready={...env,...storage};
 assert.equal(bytePlusPublicDurableStorageReady(byteplus,ready),true);
 assert.equal(available(studioConfig(ready)),true);
 assert.equal(bytePlusPublicDurableStorageReady(google,env),true);
 assert.equal(bytePlusPublicDurableStorageReady(image,env),true);
 assert.equal(bytePlusPublicDurableStorageReady(byteplus,{...env,AI_PUBLIC_GENERATION_ENABLED:'false'}),true);
 // Configured is NOT proof that the cloud bucket really exists or may be used in production.
});

test('BASE #42 owner admin override cannot bypass missing S3 durability prerequisite',()=>{
 const model=studioConfig(env).catalog.find(m=>m.id===videoModel);
 assert.equal(model.enabled,false);
 const overridden=applyModelControl(model,{enabledOverride:true,priority:0,maintenance:false});
 assert.equal(overridden.enabled,false);
 assert.equal(overridden.priority,0);
 const enabled=studioConfig({...env,...storage}).catalog.find(m=>m.id===videoModel);
 assert.equal(applyModelControl(enabled,{enabledOverride:true,priority:0,maintenance:false}).enabled,true);
 assert.equal(applyModelControl(enabled,{enabledOverride:false,priority:0,maintenance:false}).enabled,false);
});

test('BASE #42 explicit and smart routing cannot choose a BytePlus video model that lacks durable S3',()=>{
 const request={kind:'video',model:videoModel,ratio:'16:9',videoResolution:'720p',videoDuration:5,
  videoInputMode:'text',references:[]};
 const onlyBytePlus=studioConfig(env).catalog.filter(m=>m.id===videoModel);
 assert.equal(onlyBytePlus.length,1);
 assert.deepEqual(orderedGenerationCandidates(request,onlyBytePlus),[]);
 assert.throws(()=>resolveGenerationModel(request,onlyBytePlus,{AI_SMART_ROUTING_ENABLED:'true'}),/MODEL_NOT_ENABLED/);
 assert.throws(()=>resolveGenerationModel({...request,model:'smart'},onlyBytePlus,{AI_SMART_ROUTING_ENABLED:'true'}),/NO_COMPATIBLE_MODEL/);
 const ready=studioConfig({...env,...storage}).catalog.filter(m=>m.id===videoModel);
 assert.equal(orderedGenerationCandidates(request,ready).length,1);
});

test('BASE #42 a public-mode owner quote rejects absent S3 before any provider or credit action',async()=>{
 let calls=0;
 const app=express();app.use(express.json());
 installGenerationStudio(app,{env,pool:{query:async()=>{calls++;throw Error('DB should not be used');}},
  provider:async()=>{calls++;throw Error('provider must not run');},
  auth:(req,_res,next)=>{req.user={id:'owner-1',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(done=>server.once('listening',done));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/studio/estimate';
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({kind:'video',model:videoModel,prompt:'A starry night',
    ratio:'16:9',videoDuration:5,videoResolution:'720p',videoInputMode:'text',referenceCount:0})});
  assert.equal(r.status,503);assert.equal((await r.json()).error,'MODEL_NOT_ENABLED');
  const job=await fetch('http://127.0.0.1:'+server.address().port+'/api/studio/jobs',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({kind:'video',model:videoModel,prompt:'A starry night',
    ratio:'16:9',videoDuration:5,videoResolution:'720p',videoInputMode:'text',
    references:[],consent:true,requestId:'00000000-0000-4000-8000-000000000042'})});
  assert.equal(job.status,503);
  assert.equal((await job.json()).error,'MODEL_NOT_ENABLED');
  assert.equal(calls,0); // no DB, wallet, provider or existing job created
 }finally{server.closeAllConnections();await new Promise(done=>server.close(done));}
});
