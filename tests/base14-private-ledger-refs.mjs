import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {GenerationWallet} from '../server/generation-wallet.js';
import {installGenerationBilling} from '../server/generation-billing.js';

const leak='cs_test_PRIVATE_CUSTOMER_SESSION_999';
const stored={
  id:8,kind:'purchase',reference:leak,user_id:'user-2',
  available_delta:'100',reserved_delta:'0',debt_delta:'0',
  created_at:'2026-10-16T12:00:00Z',
  payment_intent:'pi_private',internal_note:'must not be published'
};
test('BASE #14 wallet read-only history returns exactly public deltas and not Stripe reference',async()=>{
 const seen=[];
 const pool={async query(sql,args=[]){seen.push({sql,args});return {rows:[stored]}}};
 const wallet=new GenerationWallet(pool);
 wallet.initializing=Promise.resolve(); // no schema mutation required to test read path
 const rows=await wallet.history('user-2');
 assert.deepEqual(rows,[{
   kind:'purchase',available_delta:'100',reserved_delta:'0',debt_delta:'0',
   created_at:'2026-10-16T12:00:00Z'
 }]);
 assert.ok(seen[0].sql.includes('WHERE user_id=$1'));
 assert.deepEqual(seen[0].args,['user-2']);
 assert.ok(!seen[0].sql.includes('reference'));
 assert.ok(!JSON.stringify(rows).includes(leak));
});

test('both authenticated legacy and AI billing history endpoints expose credit deltas only',async()=>{
 let historyQueries=0, writes=0;
 const pool={async query(sql,args=[]){
   if(sql.includes('CREATE TABLE IF NOT EXISTS')){writes++;return {rows:[]}}
   if(sql.startsWith('SELECT kind,available_delta,reserved_delta,debt_delta,created_at')){
     historyQueries++;
     assert.deepEqual(args,['user-2']);
     return {rows:[stored]};
   }
   throw new Error('Unexpected database operation in read-only history');
 }};
 const app=express();app.use(express.json());
 const auth=(req,_res,next)=>{req.user={id:'user-2'};next()};
 installGenerationBilling(app,{auth,pool,stripe:{},appUrl:'https://example.invalid',env:{
   DATABASE_URL:'not-connected',APP_JWT_SECRET:'not-real',AI_BILLING_ENABLED:'true',
   AI_BILLING_MODE:'test',STRIPE_SECRET_KEY:'sk_test_placeholder'
 }});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});
 try{
  const root='http://127.0.0.1:'+server.address().port;
  for(const route of ['/api/ai-wallet/history','/api/ai-billing/history']){
   const response=await fetch(root+route);
   assert.equal(response.status,200,route);
   const json=await response.json();
   assert.equal(json.items?.[0]?.kind,'purchase');
   assert.equal(json.items?.[0]?.available_delta,'100');
   for(const forbidden of ['reference','user_id','payment_intent','internal_note','session_id'])
    assert.equal(Object.hasOwn(json.items[0],forbidden),false,route+': '+forbidden);
   assert.ok(!JSON.stringify(json).includes(leak));
   assert.ok(!JSON.stringify(json).includes('pi_private'));
  }
  assert.equal(historyQueries,2);
  assert.equal(writes,1,'existing wallet schema init only; no purchase/refund mutations');
 } finally {await new Promise(resolve=>server.close(resolve))}
});
