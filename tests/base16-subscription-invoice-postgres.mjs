import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {GenerationWallet} from '../server/generation-wallet.js';
import {installGenerationBilling} from '../server/generation-billing.js';
import {subscriptionCreditConfig,invoicePaymentIntent,grantPaidSubscriptionInvoice} from '../server/generation-subscription-credits.js';

const dsn=process.env.AI_TEST_DATABASE_URL;
const env={
 AI_SUBSCRIPTION_CREDITS_ENABLED:'true',
 AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:120}),
 STRIPE_PRICE_BASIC:'price_subfixture',
 STRIPE_PRICE_PRO:'price_profixture',
 AI_BILLING_MODE:'test'
};
const invoice=(change={})=>({
 type:'invoice.paid',livemode:false,data:{object:{
  id:'in_fixture1',status:'paid',paid:true,livemode:false,billing_reason:'subscription_cycle',
  amount_paid:900,currency:'eur',payment_intent:'pi_invoicefixture1',subscription:'sub_fixture1',customer:'cus_fixture1',
  lines:{has_more:false,data:[{price:{id:'price_subfixture'},quantity:1}]},
  ...change
 }}
});
const user={id:'subscription-fixture-user',plan:'basic',stripe_customer_id:'cus_fixture1',
 stripe_subscription_id:'sub_fixture1',subscription_status:'active'};

test('BASE #16 subscription credits disabled without explicitly approved quantities',()=>{
 assert.deepEqual(subscriptionCreditConfig({}),{enabled:false,entries:[]});
 for(const bad of [
  {...env,AI_BILLING_MODE:undefined},
  {...env,AI_BILLING_MODE:'production'},
  {...env,AI_BILLING_MODE:'TEST'},
  {...env,AI_BILLING_MODE:'test',NODE_ENV:'production'}
 ])assert.throws(()=>subscriptionCreditConfig(bad),/AI_SUBSCRIPTION_CONFIG_INVALID/);
 assert.throws(()=>subscriptionCreditConfig({AI_SUBSCRIPTION_CREDITS_ENABLED:'true'}),/AI_SUBSCRIPTION_CONFIG_INVALID/);
});

test('BASE #16 never interprets old tool credits as AI credits or uses unknown Stripe prices',()=>{
 for(const amount of [0,1.25,-1,10000001,'100',null]){
  assert.throws(()=>subscriptionCreditConfig({...env,AI_SUBSCRIPTION_CREDITS_JSON:JSON.stringify({basic:amount})}),/AI_SUBSCRIPTION_CONFIG_INVALID/);
 }
 for(const json of ['{bad','[]','{}','{"other":3}','{"basic":100,"pro":100}']){
  assert.throws(()=>subscriptionCreditConfig({...env,AI_SUBSCRIPTION_CREDITS_JSON:json,STRIPE_PRICE_PRO:''}),/AI_SUBSCRIPTION_CONFIG_INVALID/);
 }
 assert.deepEqual(subscriptionCreditConfig(env).entries,
  [{plan:'basic',credits:120,priceId:'price_subfixture'}]);
});

test('BASE #16: subscription invoice requires a real unique Stripe payment intent',()=>{
 assert.equal(invoicePaymentIntent({payment_intent:'pi_invoice1'}),'pi_invoice1');
 assert.equal(invoicePaymentIntent({payments:{data:[{payment:{
  type:'payment_intent',payment_intent:'pi_invoice2'}}]}}),'pi_invoice2');
 assert.equal(invoicePaymentIntent({payment_intent:'pi_invoice1',payments:{data:[
  {payment:{type:'payment_intent',payment_intent:'pi_invoice1'}}]}}),'pi_invoice1');
 for(const candidate of [{},{payment_intent:'a_fake'},{
   payment_intent:'pi_invoice1',payments:{data:[{payment:{type:'payment_intent',payment_intent:'pi_other'}}]}
 }]){
  assert.throws(()=>invoicePaymentIntent(candidate),/AI_SUBSCRIPTION_PAYMENT_INTENT_INVALID/);
 }
});

test('BASE #16: a signed, paid invoice grants once per invoice on disposable PostgreSQL', {skip:!dsn},async()=>{
 const url=new URL(dsn);
 if(process.env.NODE_ENV!=='test'||!['localhost','127.0.0.1'].includes(url.hostname)||
    url.pathname!=='/vv_ai_subscription_ci')throw Error('UNSAFE_TEST_DATABASE');
 const pool=new pg.Pool({connectionString:dsn,max:8});
 const wallet=new GenerationWallet(pool);
 let dbChecks=0;
 try{
  await pool.query(`CREATE TABLE vv_users(
    id TEXT PRIMARY KEY,plan TEXT,stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,subscription_status TEXT)`);
  await pool.query('INSERT INTO vv_users(id,plan,stripe_customer_id,stripe_subscription_id,subscription_status) VALUES($1,$2,$3,$4,$5)',
   [user.id,user.plan,user.stripe_customer_id,user.stripe_subscription_id,user.subscription_status]);
  const sample=invoice();
  const installed=installGenerationBilling({get(){},post(){},use(){}},{
   auth:()=>{},pool,stripe:{},appUrl:'https://example.invalid',env
  });
  // Signed webhook verification lives in server.js before this handler.
  const off=await grantPaidSubscriptionInvoice({event:sample,env:{},pool:{query(){dbChecks++;throw Error('NOT_NEEDED');}},wallet});
  assert.equal(off,false);assert.equal(dbChecks,0);
  assert.equal(await installed.handleEvent(invoice({lines:{has_more:false,data:[{price:{id:'price_another'},quantity:1}]}})),false);
  assert.deepEqual(await wallet.balance(user.id),{available:0,reserved:0,debt:0});
  const statuses=await Promise.all(Array.from({length:6},()=>installed.handleEvent(sample)));
  assert.deepEqual(statuses,[false,false,false,false,false,false],
   'legacy invoice.paid processing must continue after AI grant');
  assert.deepEqual(await wallet.balance(user.id),{available:120,reserved:0,debt:0});
  const events=await wallet.history(user.id);
  assert.equal(events.length,1);
  assert.equal(events[0].kind,'subscription_grant');
  assert.equal(Number(events[0].available_delta),120);
  const record=await pool.query('SELECT session_id,payment_intent,credits,amount,currency FROM vv_ai_purchase WHERE user_id=$1',[user.id]);
  assert.deepEqual(record.rows,[{session_id:'in_fixture1',payment_intent:'pi_invoicefixture1',credits:120,amount:900,currency:'eur'}]);

  await installed.handleEvent(invoice({id:'in_fixture2',payment_intent:'pi_invoicefixture2'}));
  assert.equal((await wallet.balance(user.id)).available,240);
  const noUser=invoice({subscription:'sub_unknown',id:'in_unknown'});
  await assert.rejects(()=>installed.handleEvent(noUser),/AI_SUBSCRIPTION_ACCOUNT_PENDING/);
  assert.equal((await wallet.balance(user.id)).available,240);
  const foreignCustomer=invoice({customer:'cus_attacker',id:'in_foreign'});
  await assert.rejects(()=>installed.handleEvent(foreignCustomer),/AI_SUBSCRIPTION_ACCOUNT_PENDING/);
  const wrongMode=invoice({livemode:true,id:'in_wrongmode'});
  await assert.rejects(()=>installed.handleEvent(wrongMode),/AI_SUBSCRIPTION_INVOICE_INVALID/);
  const zeroCharge=invoice({amount_paid:0,id:'in_zero'});
  assert.equal(await installed.handleEvent(zeroCharge),false,'free invoice must allow old subscription renewal handler');
  const prorated=invoice({id:'in_prorate',billing_reason:'subscription_update'});
  await assert.rejects(()=>installed.handleEvent(prorated),/AI_SUBSCRIPTION_INVOICE_INVALID/);
  const notApproved=invoice({id:'in_unapproved',livemode:true});
  await assert.rejects(()=>grantPaidSubscriptionInvoice({event:{...notApproved,livemode:true},env:{...env,AI_BILLING_MODE:'live'},pool,wallet}),/AI_SUBSCRIPTION_LIVE_NOT_APPROVED/);
  const ambiguous=invoice({lines:{has_more:false,data:[
    {price:{id:'price_subfixture'},quantity:1},{price:{id:'price_other'},quantity:1}]},id:'in_ambiguous'});
  await assert.rejects(()=>installed.handleEvent(ambiguous),/AI_SUBSCRIPTION_INVOICE_INVALID/);
  assert.equal((await wallet.balance(user.id)).available,240);
  assert.equal((await wallet.history(user.id)).length,2);

  const refund=(paymentIntent,cumulative)=>({
   type:'charge.refunded',livemode:false,data:{object:{
    livemode:false,payment_intent:paymentIntent,amount_refunded:cumulative
   }}
  });
  // Pack checkout remains disabled; signed subscription invoice refunds are
  // still reconciled using the existing purchase/refund ledger.
  assert.equal(await installed.handleEvent(refund('pi_invoicefixture1',450)),true);
  assert.equal((await wallet.balance(user.id)).available,180);
  assert.equal(await installed.handleEvent(refund('pi_invoicefixture1',450)),true);
  assert.equal((await wallet.balance(user.id)).available,180);
  // Charge more of the available credits before a full subscription refund:
  // the missing balance must become debt, not silently remain free AI usage.
  await wallet.reserve({userId:user.id,jobId:'job_sub_fixture',credits:150,fingerprint:'fingerprint'});
  await wallet.settle({userId:user.id,jobId:'job_sub_fixture',outcome:'success'});
  assert.equal(await installed.handleEvent(refund('pi_invoicefixture1',900)),true);
  assert.deepEqual(await wallet.balance(user.id),{available:0,reserved:0,debt:30});
  assert.equal(await installed.handleEvent(refund('pi_invoicefixture2',900)),true);
  assert.deepEqual(await wallet.balance(user.id),{available:0,reserved:0,debt:150});
  assert.equal(await installed.handleEvent(refund('pi_invoicefixture2',900)),true);
  assert.equal((await wallet.balance(user.id)).debt,150);
  const refundRows=(await wallet.history(user.id)).filter(x=>x.kind==='payment_refund');
  assert.equal(refundRows.length,3,'cumulative duplicate refunds cannot double-revoke');

  // A later approved plan credit change must not retroactively alter old
  // credited invoices or poison Stripe retries of the historical invoice.
  const changedUser='subscription-repricing-fixture';
  await pool.query('INSERT INTO vv_users(id,plan,stripe_customer_id,stripe_subscription_id,subscription_status) VALUES($1,$2,$3,$4,$5)',
   [changedUser,'basic','cus_pricechange','sub_pricechange','active']);
  const oldInvoice=invoice({id:'in_tariffone',payment_intent:'pi_tariffone',
   customer:'cus_pricechange',subscription:'sub_pricechange'});
  await installed.handleEvent(oldInvoice);
  assert.equal((await wallet.balance(changedUser)).available,120);
  env.AI_SUBSCRIPTION_CREDITS_JSON=JSON.stringify({basic:250});
  await installed.handleEvent(oldInvoice);
  assert.equal((await wallet.balance(changedUser)).available,120,'historical invoice cannot grant new tariff credits');
  const newInvoice=invoice({id:'in_tarifftwo',payment_intent:'pi_tarifftwo',
   customer:'cus_pricechange',subscription:'sub_pricechange'});
  await installed.handleEvent(newInvoice);
  assert.equal((await wallet.balance(changedUser)).available,370);
  const grants=await pool.query('SELECT session_id,credits FROM vv_ai_purchase WHERE user_id=$1 ORDER BY session_id',[changedUser]);
  assert.deepEqual(grants.rows,[{session_id:'in_tariffone',credits:120},{session_id:'in_tarifftwo',credits:250}]);
  // The historic-replay flag never allows changing the credits on a one-time pack purchase.
  await wallet.grant({userId:'pack-fixture',sessionId:'cs_test_packfixture',
    paymentIntent:'pi_packfixture',credits:20,amount:900,currency:'eur'});
  await assert.rejects(()=>wallet.grant({userId:'pack-fixture',sessionId:'cs_test_packfixture',
    paymentIntent:'pi_packfixture',credits:250,amount:900,currency:'eur',
    allowHistoricalSubscriptionReplay:true}),/PURCHASE_CONFLICT/);

 }finally{await pool.end();}
});

test('BASE #16: no inference from tool membership, refund or browser checkout redirect',async()=>{
 let dbHits=0,grantHits=0;
 const fakeDb={query(){dbHits++;throw Error('DB_SHOULD_NOT_BE_USED');}};
 const fakeWallet={grantOnce(){grantHits++;throw Error('GRANT_SHOULD_NOT_HAPPEN');}};
 for(const event of [
  {type:'checkout.session.completed',data:{object:{}}},
  {type:'customer.subscription.updated',data:{object:{}}},
  {type:'invoice.payment_failed',data:{object:{}}},
  {type:'invoice.paid',livemode:false,data:{object:{lines:{has_more:false,data:[{price:{id:'price_unmatched'},quantity:1}]}}}}
 ]){
  assert.equal(await grantPaidSubscriptionInvoice({event,env,pool:fakeDb,wallet:fakeWallet}),false);
 }
 assert.equal(dbHits,0);
 assert.equal(grantHits,0);
});
