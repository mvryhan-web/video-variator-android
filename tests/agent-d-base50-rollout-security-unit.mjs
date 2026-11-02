// Agent D / BASE #50 / no-spend acceptance over the EXISTING feature flag system.
// No provider, Stripe, production, user database, or actual JWT is accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {readFile} from 'node:fs/promises';
import {generationFeatureSwitches,generationFeatureEnabled} from '../server/generation-feature-flags.js';
import {platformFeatureEnabled} from '../server/platform-feature-flags.js';
import {studioConfig,installGenerationStudio} from '../server/generation-studio.js';
import {MODEL_CATALOG} from '../server/generation-provider.js';
import {generationBillingRuntime,welcomeCreditConfig} from '../server/generation-billing.js';
import {previewTrialEligibility,previewTrialWindow} from '../server/generation-trial-policy.js';
import {prepareLocalAgentDraft,executeLocalAgentDraft} from '../server/user-agent-stage1-local-draft.js';

const stage={
 NODE_ENV:'test',AI_STUDIO_ENABLED:'true',DATABASE_URL:'test-only-not-connected',
 ADMIN_EMAIL:'owner@test.invalid',AI_STUDIO_MAX_CALLS:'3',
 GEMINI_API_KEY:'fake-no-network',BYTEPLUS_API_KEY:'fake-no-network',
 AI_STUDIO_ALLOWED_KINDS:'image,video,music',
 AI_STUDIO_ALLOWED_MODELS:MODEL_CATALOG.map(x=>x.id).join(',')
};
const validModels=[
 ['AI_IMAGE_ENABLED','image','Google'],
 ['AI_VIDEO_ENABLED','video','Google'],
 ['BYTEPLUS_ENABLED','image','BytePlus']
].map(([flag,kind,provider])=>{
 const model=MODEL_CATALOG.find(x=>x.kind===kind&&x.provider===provider&&x.adapter);
 assert.ok(model,'existing connected model fixture for '+flag);
 return {flag,kind,provider,model};
});

test('D BASE50: absent retains historical image/video/provider switches but invalid explicit values fail closed',()=>{
 for(const envStage of ['development','test','staging','production']){
  assert.deepEqual(generationFeatureSwitches({NODE_ENV:envStage}),{image:true,video:true,byteplus:true});
  for(const {flag,kind,provider} of validModels){
   for(const value of ['false','0','1','TRUE','',null,undefined,'disabled']){
    const env={...stage,NODE_ENV:envStage,[flag]:value};
    assert.equal(generationFeatureEnabled(kind,provider,env),false,flag+' '+String(value)+' '+envStage);
    assert.equal(studioConfig(env).catalog.find(m=>m.id===validModels.find(x=>x.flag===flag).model.id)?.enabled,false);
   }
   assert.equal(generationFeatureEnabled(kind,provider,{...stage,[flag]:'true'}),true);
  }
 }
});

test('D BASE50: discovery flags cannot activate independently or via invalid production setting',()=>{
 const keys=['AI_APPS_ENABLED','AI_INSPIRATION_ENABLED','AI_ONBOARDING_ENABLED','AI_AGENTS_ENABLED'];
 for(const name of keys){
  for(const v of ['false','0','TRUE','',null,undefined,'on']){
   assert.equal(platformFeatureEnabled(name,{NODE_ENV:'production',[name]:v}),false,name+' '+String(v));
  }
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:'production'}),false);
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:'production',[name]:'true'}),true);
 }
 const cfg=studioConfig({...stage,AI_IMAGE_ENABLED:'false',AI_VIDEO_ENABLED:'false',BYTEPLUS_ENABLED:'false'});
 assert.equal(cfg.enabled,true,'existing pilot/history remains separate from new job switch');
 assert.equal(cfg.publicGenerationEnabled,false,'no price/credits/public launch from discovery or catalog flags');
 assert.equal(cfg.ownerOnly,true);
 for(const v of [undefined,'false','0','TRUE','']){
  const env={...stage,AI_PUBLIC_GENERATION_ENABLED:v,AI_STUDIO_WALLET_ENABLED:'false'};
  assert.equal(studioConfig(env).publicGenerationEnabled,false,'paid-public gate fail closed '+String(v));
 }
});

test('D BASE50: live Stripe and unapproved $0.99 Trial cannot be enabled by a single feature flag',()=>{
 for(const v of [undefined,'false','0','TRUE','']){
  assert.equal(generationBillingRuntime({AI_BILLING_ENABLED:v,AI_BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_live_fixture'}).livePaymentsEnabled,false);
 }
 assert.equal(generationBillingRuntime({AI_BILLING_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_fixture'}).livePaymentsEnabled,false);
 assert.equal(generationBillingRuntime({AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_live_fixture'}).livePaymentsEnabled,false);
 assert.deepEqual(welcomeCreditConfig({}),{enabled:false,credits:0},'no welcome grant at default config');
 const trial=previewTrialEligibility({userId:'account_a',accountVerified:true,paymentIdentityVerified:true,historyQueryComplete:true,priorAccountTrialPurchases:0,priorPaymentIdentityTrialPurchases:0});
 assert.equal(trial.launchApproved,false);assert.equal(trial.accessGranted,false);
 const window=previewTrialWindow({userId:'account_a',sessionId:'cs_test_fixture',paymentIntent:'pi_fixture',verifiedWebhook:true,paymentStatus:'paid',checkoutMode:'payment',amountCents:99,currency:'usd',oneTime:true,autoRenew:false,paidAtMs:1000,revoked:false,refundedCents:0},2000);
 assert.equal(window.launchApproved,false);assert.equal(window.accessGranted,false);
});

test('D BASE50: explicit consent and user identity protect local Agent (not a paid AI provider)',()=>{
 const preview=prepareLocalAgentDraft({authenticatedUserId:'user_a',workflowId:'etsy_listing',goal:'Cotton scarf'});
 assert.equal(preview.previewOnly,true);assert.equal(preview.paidOperationsEnabled,false);
 assert.equal(preview.externalWebAccess,false);
 assert.deepEqual(executeLocalAgentDraft({authenticatedUserId:'user_b',preview,confirmedPlanId:preview.planId,userConfirmed:true}),{status:'BLOCKED',reason:'INVALID_OR_CROSS_USER_PREVIEW'});
 const ok=executeLocalAgentDraft({authenticatedUserId:'user_a',preview,confirmedPlanId:preview.planId,userConfirmed:true});
 assert.equal(ok.status,'LOCAL_DRAFT_READY');
 assert.equal(ok.creditsSpent,0);assert.equal(ok.paidProviderCalls,0);
});

test('D BASE50: actual HTTP estimate/create are denied for disabled models before PostgreSQL or paid provider',async()=>{
 for(const {flag,kind,model} of validModels){
  for(const invalid of ['false','0']){
   const env={...stage,[flag]:invalid};let queryCount=0,providerCalls=0;
   const app=express();app.use(express.json());
   const auth=(req,_res,next)=>{req.user={id:'owner_a',email:env.ADMIN_EMAIL,provider:'google'};next();};
   installGenerationStudio(app,{env,auth,pool:{query:async()=>{queryCount++;throw Error('DB_PROHIBITED');}},
    provider:async()=>{providerCalls++;throw Error('PAID_PROVIDER_PROHIBITED');}});
   const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
   try{
    const base='http://127.0.0.1:'+server.address().port;
    const body={kind,model:model.id,ratio:model.ratios[0],prompt:'offline acceptance',consent:true,references:[],referenceCount:0};
    for(const endpoint of ['/api/studio/estimate','/api/studio/jobs']){
     const response=await fetch(base+endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
     assert.equal(response.status,503,endpoint+' '+flag+' '+invalid);
     assert.equal((await response.json()).error,'MODEL_NOT_ENABLED');
    }
    assert.equal(queryCount,0,'disabled model must not reach DB');
    assert.equal(providerCalls,0,'disabled model must not reach paid provider');
   }finally{await new Promise(resolve=>server.close(resolve));}
  }
 }
});

test('D BASE50: owner-only model/credit admin stays inaccessible to other identities',async()=>{
 let db=0,providerCalls=0;const app=express();app.use(express.json());
 const auth=(req,_res,next)=>{req.user={id:'user_b',email:'owner@test.invalid',provider:'email'};next();};
 installGenerationStudio(app,{env:stage,auth,pool:{query:async()=>{db++;throw Error('UNAUTHORIZED_DB');}},
  provider:async()=>{providerCalls++;throw Error('UNAUTHORIZED_PROVIDER');}});
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const [method,route] of [['GET','/api/studio/admin/models'],['GET','/api/studio/admin/users'],['GET','/api/studio/admin/purchases'],['POST','/api/studio/admin/users/user_a/credits/adjust']]){
   const response=await fetch(base+route,{method,headers:{'content-type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
   assert.equal(response.status,403,route);
  }
  assert.equal(db,0);assert.equal(providerCalls,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('D BASE50: preview anti-index and paid API barriers do not depend on discovery flags',async()=>{
 const preview=await readFile(new URL('../server/deepsyq-preview.js',import.meta.url),'utf8');
 assert.match(preview,/X-Robots-Tag','noindex, nofollow, noarchive'/);
 assert.match(preview,/User-agent: \*\\nDisallow: \/\\n/);
 assert.match(preview,/app\.use\('\/api',\(_req,res\)=>res\.status\(503\)/);
 assert.match(preview,/app\.get\(\['\/product-video','\/product-video\.html'\]/);
 const home=await readFile(new URL('../app/src/main/assets/deepsyq.html',import.meta.url),'utf8');
 assert.match(home,/<meta name="robots" content="noindex,follow">/);
});
