import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {billingCatalog,makeQuote,verifyQuote,generationBillingRuntime,stripeRefundData,welcomeCreditConfig,installGenerationBilling} from '../server/generation-billing.js';
const body={kind:'video',prompt:'Ocean at sunset',ratio:'16:9',consent:true};
// Synthetic prices for code tests only, never proposed customer prices.
const env={APP_JWT_SECRET:'test-only-signing-key',AI_CREDIT_PACKS_JSON:JSON.stringify([{sku:'fixture',priceId:'price_fixture',amount:100,credits:100,currency:'eur'}]),AI_CREDIT_RATES_JSON:JSON.stringify([{kind:'video',credits:10}])};
test('no catalog or invented rates by default; reject malformed/duplicate rates',()=>{
 assert.deepEqual(billingCatalog({}).packs,[]);assert.throws(()=>makeQuote({userId:'u',body,env:{}}));
 for(const rates of [[{kind:'video',credits:0}],[{kind:'video',credits:1.5}],[{kind:'evil',credits:1}],[{kind:'video',credits:1},{kind:'video',credits:2}]]) assert.equal(billingCatalog({...env,AI_CREDIT_RATES_JSON:JSON.stringify(rates)}).revision,null);
});
test('quote binds approved price, user, model, content and reference image',()=>{
 const q=makeQuote({userId:'u',body,env,now:1000});assert.equal(q.credits,10);
 assert.equal(verifyQuote({userId:'u',body,token:q.token,env,now:2000}).credits,10);
 for(const change of [{userId:'other'},{body:{...body,prompt:'Different'}},{body:{...body,ratio:'9:16'}},{env:{...env,AI_CREDIT_RATES_JSON:'[{"kind":"video","credits":11}]'}},{token:q.token+'x'},{now:301000}]) assert.throws(()=>verifyQuote({userId:'u',body,token:q.token,env,now:2000,...change}));
});
test('quote cannot override server pricing through client credits/model',()=>{
 const q=makeQuote({userId:'u',body:{...body,credits:1},env,now:1000});assert.equal(q.credits,10);assert.equal(q.model,'veo-3.1-lite-generate-preview');
 assert.throws(()=>makeQuote({userId:'u',body:{...body,model:'cheap-fake'},env,now:1000}));
 assert.throws(()=>makeQuote({userId:'u',body:{...body,model:'veo-3.1-fast-generate-preview'},env,now:1000}),/AI_PRICING_NOT_APPROVED/);
});
test('live Stripe billing requires explicit live mode and owner approval',async()=>{
 const app=express();app.use(express.json());let reads=0;
 installGenerationBilling(app,{auth:(_r,_s,n)=>n(),pool:{query:()=>{reads++;throw Error('must not touch DB');}},stripe:{},appUrl:'https://example.test',env:{...env,AI_BILLING_ENABLED:'true',DATABASE_URL:'fixture',STRIPE_SECRET_KEY:'sk_live_fixture'}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{const url=`http://127.0.0.1:${server.address().port}/api/ai-billing`;const c=await fetch(url+'/config').then(r=>r.json());assert.equal(c.enabled,false);assert.equal(c.livePaymentsEnabled,false);assert.ok(!JSON.stringify(c).includes('price_fixture'));assert.equal((await fetch(url+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);assert.equal(reads,0);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('owner AI credit adjustment is idempotent and cannot overdraw available credits',async()=>{
 const walletRows=new Map([['user-1',{available:50,reserved:0,debt:0}]]),adjustments=new Map(),ledger=[];
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_wallet'))return {rows:[]};throw new Error(sql);},async connect(){return {async query(sql,args=[]){
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[]};
  if(sql.startsWith('INSERT INTO vv_ai_wallet')){if(!walletRows.has(args[0]))walletRows.set(args[0],{available:0,reserved:0,debt:0});return {rows:[]};}
  if(sql.startsWith('SELECT * FROM vv_ai_wallet'))return {rows:[walletRows.get(args[0])]};
  if(sql.startsWith('SELECT * FROM vv_ai_adjustment'))return {rows:adjustments.has(args[0])?[adjustments.get(args[0])]:[]};
  if(sql.startsWith('INSERT INTO vv_ai_adjustment')){adjustments.set(args[0],{id:args[0],user_id:args[1],owner_user_id:args[2],delta:args[3],reason:args[4]});return {rows:[]};}
  if(sql.startsWith('UPDATE vv_ai_wallet')){walletRows.set(args[0],{available:args[1],reserved:args[2],debt:args[3]});return {rows:[]};}
  if(sql.startsWith('INSERT INTO vv_ai_ledger')){ledger.push(args);return {rows:[]};}
  throw new Error(sql);
 },release(){}};}};
 const {GenerationWallet}=await import('../server/generation-wallet.js');const wallet=new GenerationWallet(pool);
 let b=await wallet.adjust({userId:'user-1',adjustmentId:'11111111-1111-4111-8111-111111111111',ownerUserId:'owner',delta:25,reason:'support credit correction'});assert.equal(b.available,75);assert.equal(ledger.length,1);
 b=await wallet.adjust({userId:'user-1',adjustmentId:'11111111-1111-4111-8111-111111111111',ownerUserId:'owner',delta:25,reason:'support credit correction'});assert.equal(b.duplicate,true);assert.equal(walletRows.get('user-1').available,75);assert.equal(ledger.length,1);
 await assert.rejects(()=>wallet.adjust({userId:'user-1',adjustmentId:'22222222-2222-4222-8222-222222222222',ownerUserId:'owner',delta:-100,reason:'invalid overdraw attempt'}),/INSUFFICIENT_AVAILABLE_AI_CREDITS/);assert.equal(walletRows.get('user-1').available,75);
});


test('billing runtime only enables live payments behind all explicit gates',()=>{
 assert.deepEqual(generationBillingRuntime({AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',STRIPE_SECRET_KEY:'sk_live_fixture'}),{mode:'live',livemode:true,keyMatches:true,liveApproved:true,activationRequested:true,livePaymentsEnabled:true});
 assert.equal(generationBillingRuntime({AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_live_fixture'}).livePaymentsEnabled,false);
 assert.equal(generationBillingRuntime({AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'true',STRIPE_SECRET_KEY:'sk_test_fixture'}).keyMatches,false);
 assert.equal(generationBillingRuntime({AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'test',STRIPE_SECRET_KEY:'sk_test_fixture'}).livemode,false);
});


test('Stripe refund parsing uses cumulative refunded amount and enforces billing mode',()=>{
 const event={type:'charge.refunded',livemode:true,data:{object:{livemode:true,payment_intent:'pi_fixture',amount_refunded:450}}};
 assert.deepEqual(stripeRefundData(event,{livemode:true}),{paymentIntent:'pi_fixture',cumulativeAmount:450});
 assert.throws(()=>stripeRefundData(event,{livemode:false}),/AI_PAYMENT_MODE_MISMATCH/);
 assert.throws(()=>stripeRefundData({type:'charge.refunded',livemode:true,data:{object:{livemode:true,payment_intent:'pi_fixture',amount_refunded:0}}},{livemode:true}),/INVALID_AI_REFUND_EVENT/);
 assert.equal(stripeRefundData({type:'invoice.paid'},{livemode:false}),null);
});


test('welcome AI credits are opt-in, bounded and disabled by default',()=>{
 assert.deepEqual(welcomeCreditConfig({}),{enabled:false,credits:0});
 assert.deepEqual(welcomeCreditConfig({AI_WELCOME_CREDITS_ENABLED:'true',AI_WELCOME_CREDITS:'4200'}),{enabled:true,credits:4200});
 assert.deepEqual(welcomeCreditConfig({AI_WELCOME_CREDITS_ENABLED:'true',AI_WELCOME_CREDITS:'99999999'}),{enabled:false,credits:0});
});

test('one-time welcome grant is idempotent and pays wallet debt first',async()=>{
 const walletRows=new Map([['user-1',{available:5,reserved:0,debt:7}]]),grants=new Map(),ledger=[];
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_wallet'))return {rows:[]};throw Error(sql);},async connect(){return {async query(sql,args=[]){
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[]};if(sql.startsWith('INSERT INTO vv_ai_wallet'))return {rows:[]};if(sql.startsWith('SELECT * FROM vv_ai_wallet'))return {rows:[walletRows.get(args[0])]};
  if(sql.startsWith('SELECT * FROM vv_ai_grant'))return {rows:grants.has(args[0]+'|'+args[1])?[grants.get(args[0]+'|'+args[1])]:[]};
  if(sql.startsWith('INSERT INTO vv_ai_grant')){grants.set(args[0]+'|'+args[1],{user_id:args[0],kind:args[1],credits:args[2]});return {rows:[]};}
  if(sql.startsWith('UPDATE vv_ai_wallet')){walletRows.set(args[0],{available:args[1],reserved:args[2],debt:args[3]});return {rows:[]};}
  if(sql.startsWith('INSERT INTO vv_ai_ledger')){ledger.push(args);return {rows:[]};}throw Error(sql);
 },release(){}};}};
 const {GenerationWallet}=await import('../server/generation-wallet.js');const wallet=new GenerationWallet(pool);
 let b=await wallet.grantOnce({userId:'user-1',kind:'welcome',credits:20});assert.equal(b.available,18);assert.equal(b.debt,0);assert.equal(b.granted,20);assert.equal(ledger.length,1);
 b=await wallet.grantOnce({userId:'user-1',kind:'welcome',credits:20});assert.equal(b.duplicate,true);assert.equal(walletRows.get('user-1').available,18);assert.equal(ledger.length,1);
});


test('BASE #16: explicit Stripe AI billing mode is mandatory; unknown mode cannot activate Checkout',async()=>{
 const common={AI_BILLING_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_fixture',DATABASE_URL:'fixture',APP_JWT_SECRET:'test-signing-only'};
 const explicit=generationBillingRuntime({...common,AI_BILLING_MODE:'test'});
 assert.equal(explicit.keyMatches,true);
 for(const value of [undefined,'','prod','TEST','0',null]){
  const r=generationBillingRuntime({...common,AI_BILLING_MODE:value});
  assert.equal(r.keyMatches,false,'unknown AI_BILLING_MODE='+String(value));
  assert.equal(r.livePaymentsEnabled,false);
 }
 const app=express();app.use(express.json());let dbCalls=0,stripeCalls=0;
 installGenerationBilling(app,{
  auth:(req,_res,next)=>{req.user={id:'test-owner'};next();},
  pool:{query(){dbCalls++;throw Error('DB must not be touched');}},
  stripe:{checkout:{sessions:{create(){stripeCalls++;throw Error('Stripe must not be called');}}}},
  appUrl:'https://example.invalid',env:{...common,AI_BILLING_MODE:'not-a-valid-mode'}
 });
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const config=await fetch(base+'/api/ai-billing/config').then(r=>r.json());
  assert.equal(config.enabled,false);
  const response=await fetch(base+'/api/ai-billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku:'anything',requestId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'})});
  assert.equal(response.status,503);
  assert.equal(dbCalls,0);
  assert.equal(stripeCalls,0);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
