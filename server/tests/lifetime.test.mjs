import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import Stripe from 'stripe';
import {isPaidLifetimeSession} from '../lifetime.js';
const linkId='plink_lifetime_fixture',config={paymentLinkId:linkId};
const paid={id:'cs_fixture',mode:'payment',payment_status:'paid',currency:'eur',amount_total:299900,payment_link:linkId,metadata:{plan:'lifetime'}};
test('only a paid full-price Lifetime payment from the configured link qualifies',()=>{
 assert.equal(isPaidLifetimeSession(paid,config),true);
 for(const change of [{payment_status:'unpaid'},{mode:'subscription'},{currency:'usd'},{amount_total:299},{payment_link:'plink_other'},{metadata:{plan:'pro'}}])assert.equal(isPaidLifetimeSession({...paid,...change},config),false);
 assert.equal(isPaidLifetimeSession(paid,{}),false);
});
test('signed webhook persists Lifetime in PostgreSQL, survives restart and cannot be downgraded',{skip:!process.env.DATABASE_URL,timeout:60000},async()=>{
 const base='http://127.0.0.1:3109',secret='whsec_local_fixture_only',stripe=new Stripe('sk_test_fixture_only');let server;
 async function start(){server=spawn(process.execPath,['server/server.js'],{env:{...process.env,PORT:'3109',NODE_ENV:'test',APP_URL:base,APP_JWT_SECRET:'local-lifetime-test-secret-at-least-32-characters',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:secret,STRIPE_PAYMENT_LINK_LIFETIME:'https://buy.stripe.com/fixture',STRIPE_PAYMENT_LINK_LIFETIME_ID:linkId},stdio:['ignore','pipe','pipe']});server.stdout.resume();server.stderr.resume();for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch(_){}await new Promise(r=>setTimeout(r,100));}throw Error('Server failed to start');}
 async function stop(){if(server&&server.exitCode===null){const done=once(server,'exit');server.kill();await done;}}
 async function post(path,body,token){return fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});}
 async function event(session,type='checkout.session.completed'){const payload=JSON.stringify({id:'evt_fixture',type,data:{object:session}}),signature=stripe.webhooks.generateTestHeaderString({payload,secret});return fetch(base+'/api/webhooks/stripe',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature},body:payload});}
 try{await start();const email='lifetime-'+Date.now()+'@example.invalid';const registered=await post('/api/auth/email/register',{email,password:'local-test-password-123',name:'Lifetime test'});assert.equal(registered.status,201);const {user,token}=await registered.json();const me=async()=>{const r=await fetch(base+'/api/me',{headers:{authorization:'Bearer '+token}});return (await r.json()).user;};
 const checkout=await post('/api/billing/checkout',{plan:'lifetime'},token);assert.equal(checkout.status,200);const url=new URL((await checkout.json()).url);assert.equal(url.origin,'https://buy.stripe.com');assert.equal(url.searchParams.get('client_reference_id'),user.id);
 const session={...paid,client_reference_id:user.id};assert.equal((await event({...session,payment_status:'unpaid'})).status,200);assert.equal((await me()).usage.plan,'trial');assert.equal((await event({...session,amount_total:299})).status,200);assert.equal((await me()).usage.plan,'trial');
 const bad=await post('/api/webhooks/stripe',{type:'checkout.session.completed',data:{object:session}});assert.equal(bad.status,400);assert.equal((await me()).usage.plan,'trial');
 assert.equal((await event(session,'checkout.session.async_payment_succeeded')).status,200);assert.equal((await event(session)).status,200);let u=await me();assert.equal(u.usage.plan,'lifetime');assert.equal(u.usage.unlimited,true);assert.equal(u.usage.allFeatures,true);assert.equal(u.usage.currentPeriodEnd,null);
 assert.equal((await post('/api/usage/consume',{seconds:9999999,sourceCount:100},token)).status,200);assert.equal((await me()).usage.used,0);assert.equal((await post('/api/billing/checkout',{plan:'lifetime'},token)).status,409);
 assert.equal((await event({id:'sub_old',metadata:{userId:user.id,plan:'basic'},status:'active'},'customer.subscription.updated')).status,200);assert.equal((await me()).usage.plan,'lifetime');
 await stop();await start();u=await me();assert.equal(u.usage.plan,'lifetime');assert.equal(u.usage.allFeatures,true);
 }finally{await stop();}
});
