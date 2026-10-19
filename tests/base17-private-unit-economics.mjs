import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationStudio} from '../server/generation-studio.js';

// BASE §17: private per-job economics must remain visible to the owner but
// never be serialized in an authenticated customer's History JSON.
test('owner retains internal costs; same generation is credit-only in customer History',async()=>{
 const seen=[];
 const row={
  id:'job-1',user_id:'account-1',kind:'image',status:'ready',provider:'Google',
  model:'gemini-3.1-flash-image',prompt:'portrait',settings:{
   ratio:'1:1',resolution:'2K',outputFormat:'png',videoResolution:'1080p',
   videoDuration:8,videoInputMode:'first_frame',musicMode:'song',referenceCount:1,
   purchasedQuote:{model:'gemini-3.1-flash-image',provider:'Google',kind:'image',credits:7,providerCostMicros:987654321,currency:'SECRET_MARGIN_CURRENCY'},
   routing:{internal:'SECRET_ROUTER_DIAGNOSTIC'},dispatchConsent:true,
   resolutionPrivate:{providerCostMicros:222222222},secretMetadata:'SECRET_SYSTEM'
  },
  error:null,result_text:'done',mime:'image/png',output_assets:[],
  created_at:new Date('2026-10-15T12:00:00.000Z'),started_at:new Date('2026-10-15T12:00:00.000Z'),
  completed_at:new Date('2026-10-15T12:00:03.000Z'),failed_at:null,
  credits_reserved:7,credits_charged:7,estimated_cost:'0.08',actual_cost:'0.09',cost_currency:'usd',
  email:'owner@example.invalid'
 };
 const pool={async query(sql,args=[]){
  seen.push(sql);
  if(sql.includes('CREATE TABLE IF NOT EXISTS'))return {rows:[]};
  if(sql.includes('FROM vv_generation_jobs')||sql.includes('FROM vv_users'))return {rows:[row]};
  throw Error('UNEXPECTED_DATABASE_QUERY');
 }};
 const env={
  AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'mock-only',DATABASE_URL:'mock-only',
  ADMIN_EMAIL:row.email,AI_STUDIO_MAX_CALLS:'3',AI_STUDIO_ALLOWED_KINDS:'image'
 };
 const auth=(req,_res,next)=>{req.user={id:row.user_id,email:row.email,provider:'google'};next()};
 const app=express();
 app.use(express.json());
 installGenerationStudio(app,{auth,pool,env,provider:async()=>{throw Error('PAID_PROVIDER_CALL_UNEXPECTED')}});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
 const root='http://127.0.0.1:'+server.address().port;
 try{
  const listRes=await fetch(root+'/api/studio/jobs');
  assert.equal(listRes.status,200);
  const list=await listRes.json();
  assert.equal(list.items.length,1);
  assert.equal(list.items[0].creditsCharged,7);
  assert.equal(list.items[0].creditsReserved,7);
  for(const field of ['estimatedCost','actualCost','costCurrency','providerCostMicros','grossMargin'])
   assert.equal(Object.hasOwn(list.items[0],field),false,field+' must not be returned to customers');
  assert.ok(!JSON.stringify(list).includes('0.09'));
  assert.ok(!JSON.stringify(list).includes('usd'));
  const publicItem=list.items[0],publicJson=JSON.stringify(list);
  assert.deepEqual(publicItem.settings,{
   ratio:'1:1',resolution:'2K',outputFormat:'png',videoResolution:'1080p',
   videoInputMode:'first_frame',musicMode:'song',videoDuration:8,referenceCount:1
  },'History must retain only supported Image/Video/Audio UI fields');
  for(const secret of ['987654321','222222222','providerCostMicros','purchasedQuote',
   'SECRET_MARGIN_CURRENCY','SECRET_ROUTER_DIAGNOSTIC','SECRET_SYSTEM','dispatchConsent','routing'])
   assert.equal(publicJson.includes(secret),false,'private job settings leaked to customer: '+secret);
  assert.equal(row.settings.purchasedQuote.providerCostMicros,987654321,
   'durable purchased quote remains unmodified for one-use dispatch');
  // Locate the customer-facing History projection by its query identity,
  // not the position of private operational fields used for safe Video polling.
  const historySql=seen.find(sql=>{
   const normalized=sql.replace(/\s+/g,' ').trim();
   return /^SELECT\s+id\s*,\s*kind\s*,\s*status\s*,/i.test(normalized)&&
    /\bFROM\s+vv_generation_jobs\b/i.test(normalized)&&
    /\bORDER\s+BY\s+created_at\s+DESC\b/i.test(normalized);
  });
  assert.ok(historySql,'customer History SELECT must exist');
  const projection=historySql.split(/\bFROM\s+vv_generation_jobs\b/i)[0];
  for(const field of ['estimated_cost','actual_cost','cost_currency'])
   assert.doesNotMatch(projection,new RegExp('\\b'+field+'\\b','i'),field+' must not be selected for customer History');
  const detailRes=await fetch(root+'/api/studio/jobs/job-1');
  assert.equal(detailRes.status,200);
  const detail=await detailRes.json();
  assert.equal(detail.creditsCharged,7);
  assert.equal(Object.hasOwn(detail,'actualCost'),false);
  assert.equal(Object.hasOwn(detail,'estimatedCost'),false);
  const adminRes=await fetch(root+'/api/studio/admin/jobs');
  assert.equal(adminRes.status,200);
  const admin=await adminRes.json();
  assert.equal(admin.items[0].actualCost,0.09);
  assert.equal(admin.items[0].estimatedCost,0.08);
  assert.equal(admin.items[0].costCurrency,'usd');
  assert.equal(admin.items[0].creditsCharged,7);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
