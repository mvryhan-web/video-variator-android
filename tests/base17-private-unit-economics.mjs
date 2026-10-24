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
  model:'gemini-3.1-flash-image',prompt:'portrait',settings:{ratio:'1:1'},
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
  const historySql=seen.find(x=>x.startsWith('SELECT id,kind,status,provider,model,prompt,settings'));
  assert.ok(historySql);
  assert.ok(!historySql.includes('actual_cost')&&!historySql.includes('estimated_cost')&&!historySql.includes('cost_currency'));
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
