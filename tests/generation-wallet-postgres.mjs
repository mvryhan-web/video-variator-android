import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import express from 'express';
import {GenerationWallet} from '../server/generation-wallet.js';
import {installGenerationBilling} from '../server/generation-billing.js';
const db=process.env.AI_TEST_DATABASE_URL;
test('real PostgreSQL AI wallet and sandbox payment contract', {skip:!db}, async t=>{
 const url=new URL(db);
 assert.equal(process.env.NODE_ENV,'test');assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.pathname,'/vv_ai_test');
 const pool=new pg.Pool({connectionString:db}),wallet=new GenerationWallet(pool),prefix=randomUUID();
 const purchase=(u,s,credits=100)=>({userId:prefix+u,sessionId:prefix+s,paymentIntent:prefix+'pi'+s,credits,amount:100,currency:'eur'});
 try {
  await t.test('concurrent duplicate paid events grant exactly once',async()=>{
   const p=purchase('a','a');await Promise.all(Array.from({length:8},()=>wallet.grant(p)));
   assert.deepEqual(await wallet.balance(p.userId),{available:100,reserved:0,debt:0});
   assert.equal((await wallet.history(p.userId)).length,1);
   await assert.rejects(()=>wallet.grant({...p,credits:200}),/PURCHASE_CONFLICT/);
  });
  await t.test('concurrent jobs cannot overspend; balance survives a new wallet instance',async()=>{
   const p=purchase('b','b');await wallet.grant(p);
   const results=await Promise.allSettled(['1','2'].map(n=>wallet.reserve({userId:p.userId,jobId:prefix+n,credits:70,fingerprint:n})));
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(results.find(r=>r.status==='rejected').reason.message,'INSUFFICIENT_AI_CREDITS');
   assert.deepEqual(await new GenerationWallet(pool).balance(p.userId),{available:30,reserved:70,debt:0});
  });
  await t.test('duplicate job retries do not reserve twice or change the prompt',async()=>{
   const p=purchase('c','c');await wallet.grant(p);const job={userId:p.userId,jobId:prefix+'c',credits:30,fingerprint:'hash'};
   await Promise.all(Array.from({length:6},()=>wallet.reserve(job)));
   assert.deepEqual(await wallet.balance(p.userId),{available:70,reserved:30,debt:0});
   await assert.rejects(()=>wallet.reserve({...job,fingerprint:'other'}),/RESERVATION_CONFLICT/);
   await assert.rejects(()=>wallet.reserve({...job,userId:prefix+'other'}),/RESERVATION_CONFLICT/);
   await wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'unknown'});
   assert.equal((await wallet.balance(p.userId)).reserved,30);
   await Promise.all(Array.from({length:5},()=>wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'success'})));
   await wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'confirmed_failure'});
   assert.deepEqual(await wallet.balance(p.userId),{available:70,reserved:0,debt:0});
  });
  await t.test('confirmed failure refunds once; absent jobs and invalid costs roll back',async()=>{
   const p=purchase('d','d');await wallet.grant(p);const job={userId:p.userId,jobId:prefix+'d',credits:30,fingerprint:'hash'};
   await wallet.reserve(job);await Promise.all(Array.from({length:5},()=>wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'confirmed_failure'})));
   assert.deepEqual(await wallet.balance(p.userId),{available:100,reserved:0,debt:0});
   await assert.rejects(()=>wallet.reserve({...job,credits:-1}),/INVALID_CREDITS/);
   await assert.rejects(()=>wallet.settle({userId:prefix+'stranger',jobId:job.jobId,outcome:'success'}),/RESERVATION_NOT_FOUND/);
  });
  await t.test('late success after confirmed generation failure cannot capture released credits',async()=>{
   const p=purchase('releasedReplay','releasedReplay');await wallet.grant(p);
   const job={userId:p.userId,jobId:prefix+'releasedReplay',credits:45,fingerprint:'original-generation'};
   await wallet.reserve(job);
   assert.deepEqual(await wallet.balance(p.userId),{available:55,reserved:45,debt:0});
   const failed=await wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'confirmed_failure'});
   assert.equal(failed.status,'released');
   assert.deepEqual(await wallet.balance(p.userId),{available:100,reserved:0,debt:0});
   // Old (unspecified actualCredits) and usage-rated success paths must BOTH
   // reject, rather than letting Studio mark a free generation as ready.
   await assert.rejects(()=>wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'success'}),/SETTLEMENT_ALREADY_RELEASED/);
   await assert.rejects(()=>wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'success',actualCredits:20}),/SETTLEMENT_ALREADY_RELEASED/);
   const repeated=await wallet.settle({userId:p.userId,jobId:job.jobId,outcome:'confirmed_failure'});
   assert.equal(repeated.status,'released');
   assert.deepEqual(await wallet.balance(p.userId),{available:100,reserved:0,debt:0});
   assert.equal((await wallet.history(p.userId)).filter(item=>item.kind==='captured').length,0);
  });
  await t.test('payment refund removes credits; spent balance creates debt, not free usage',async()=>{
   const p=purchase('e','e');await wallet.grant(p);await wallet.reserve({userId:p.userId,jobId:prefix+'e',credits:80,fingerprint:'hash'});
   await wallet.settle({userId:p.userId,jobId:prefix+'e',outcome:'success'});
   await wallet.refund(p.paymentIntent,50);await wallet.refund(p.paymentIntent,25);await wallet.refund(p.paymentIntent,50);
   assert.deepEqual(await wallet.balance(p.userId),{available:0,reserved:0,debt:30});
   await wallet.refund(p.paymentIntent,100);assert.equal((await wallet.balance(p.userId)).debt,80);
   await wallet.grant({...purchase('e','e2'),credits:100});assert.deepEqual(await wallet.balance(p.userId),{available:20,reserved:0,debt:0});
  });
  await t.test('refund of held credits followed by generation failure does not create free credit',async()=>{
   const p=purchase('f','f');await wallet.grant(p);await wallet.reserve({userId:p.userId,jobId:prefix+'f',credits:80,fingerprint:'hash'});
   await wallet.refund(p.paymentIntent,100);await wallet.settle({userId:p.userId,jobId:prefix+'f',outcome:'confirmed_failure'});
   assert.deepEqual(await wallet.balance(p.userId),{available:0,reserved:0,debt:0});
  });
  await t.test('database rolls back a second session with same payment intent',async()=>{
   const p=purchase('g','g');await wallet.grant(p);await assert.rejects(()=>wallet.grant({...p,userId:prefix+'h',sessionId:prefix+'h'}));
   assert.equal((await wallet.balance(prefix+'h')).available,0);assert.equal((await wallet.history(prefix+'h')).length,0);
  });
  await t.test('Checkout price validation, pending payment, replay and snapshot persistence',async()=>{
   const env={AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'test',DATABASE_URL:db,APP_JWT_SECRET:'fixture',STRIPE_SECRET_KEY:'sk_test_fixture',AI_CREDIT_PACKS_JSON:'[{"sku":"fixture","priceId":"price_fixture","amount":100,"credits":100,"currency":"eur"}]'};
   let creates=0,paid=false,wrongPrice=false;const sessions=new Map();
   const stripe={prices:{retrieve:async()=>({active:true,type:'one_time',unit_amount:wrongPrice?999:100,currency:'eur',livemode:false})},checkout:{sessions:{
    create:async(args,{idempotencyKey})=>{assert.equal(args.payment_method_types,undefined);creates++;let s=sessions.get(idempotencyKey);if(!s){s={...args,id:'cs_test_'+randomUUID(),url:'https://checkout.stripe.com/c/test',livemode:false,status:'open',expires_at:Math.floor(Date.now()/1000)+3600,payment_intent:'pi_test_'+randomUUID(),amount_total:100,currency:'eur',line_items:{data:[{price:{id:'price_fixture'},quantity:1}],has_more:false}};sessions.set(idempotencyKey,s);}return s;},
    retrieve:async id=>({...[...sessions.values()].find(s=>s.id===id),payment_status:paid?'paid':'unpaid'})}}};
   const app=express();app.use(express.json());const userId=prefix+'buyer';const installed=installGenerationBilling(app,{env,pool,stripe,appUrl:'https://example.test',auth:(req,res,next)=>{if(req.headers.authorization!=='Bearer fixture')return res.sendStatus(401);req.user={id:userId,email:'fixture@example.test'};next();}});
   const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/ai-billing`;
   const post=async body=>fetch(base+'/checkout',{method:'POST',headers:{authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)});
   try {
    assert.equal((await fetch(base+'/balance')).status,401);
    const request={requestId:randomUUID(),sku:'fixture'};wrongPrice=true;assert.equal((await post(request)).status,503);assert.equal(creates,0);wrongPrice=false;
    const result=await post(request);assert.equal(result.status,200);const s=await result.json();assert.equal((await post(request)).status,200);assert.equal(creates,1);
    const stored=[...sessions.values()][0];const event={type:'checkout.session.completed',livemode:false,data:{object:stored}};
    await installed.handleEvent(event);assert.equal((await wallet.balance(userId)).available,0);
    paid=true;env.AI_CREDIT_PACKS_JSON='[]';
    await Promise.all([installed.handleEvent(event),installed.handleEvent({...event,type:'checkout.session.async_payment_succeeded'})]);
    assert.equal((await wallet.balance(userId)).available,100);assert.equal((await wallet.history(userId)).length,1);
    assert.equal(await installed.handleEvent({type:'invoice.paid',data:{object:{}}}),false);
    assert.equal(s.mode,'test');
   } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
  });
 } finally {await pool.end();}
});
