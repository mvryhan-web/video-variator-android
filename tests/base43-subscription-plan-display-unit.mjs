import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import express from 'express';
import {subscriptionCreditConfig,publicSubscriptionCreditGrants} from '../server/generation-subscription-credits.js';
import {approvedSubscriptionCredits} from '../app/src/main/assets/ai-pricing-display.js';
import {installGenerationBilling} from '../server/generation-billing.js';

const configured={
 AI_SUBSCRIPTION_CREDITS_ENABLED:'true',
 AI_SUBSCRIPTION_CREDITS_JSON:'{"basic":120,"pro":450}',
 STRIPE_PRICE_BASIC:'price_basicfixture',
 STRIPE_PRICE_PRO:'price_profixture',
 AI_BILLING_MODE:'test'
};

test('BASE #43: disabled/invalid subscription credits never appear in Pricing',()=>{
 for(const env of [
  {},{...configured,AI_SUBSCRIPTION_CREDITS_ENABLED:'false'},
  {...configured,AI_SUBSCRIPTION_CREDITS_JSON:'{}'},
  {...configured,AI_SUBSCRIPTION_CREDITS_JSON:'{"basic":"120"}'},
  {...configured,AI_SUBSCRIPTION_CREDITS_JSON:'{"basic":50000000}'},
  {...configured,AI_BILLING_MODE:'live',AI_LIVE_BILLING_APPROVED:'false'},
  {...configured,AI_BILLING_MODE:undefined},
  {...configured,AI_BILLING_MODE:'test',NODE_ENV:'production'}
 ])assert.equal(publicSubscriptionCreditGrants(env),null);
 for(const invalid of [null,undefined,0,'120',-1,NaN,Infinity,10000001]){
  assert.equal(approvedSubscriptionCredits({subscriptionCredits:{basic:invalid}},'basic'),null);
 }
 assert.equal(approvedSubscriptionCredits({subscriptionCredits:{basic:500}},'lifetime'),null);
});

test('BASE #43: approved plan credit count matches server, never exposes private Stripe price IDs',()=>{
 assert.deepEqual(subscriptionCreditConfig(configured).entries,[
  {plan:'basic',credits:120,priceId:'price_basicfixture'},
  {plan:'pro',credits:450,priceId:'price_profixture'}]);
 const projection=publicSubscriptionCreditGrants(configured);
 assert.deepEqual(projection,{basic:120,pro:450});
 assert.equal(approvedSubscriptionCredits({subscriptionCredits:projection},'basic'),120);
 assert.equal(approvedSubscriptionCredits({subscriptionCredits:projection},'pro'),450);
 assert.equal(approvedSubscriptionCredits({subscriptionCredits:projection},'business'),null);
 assert.doesNotMatch(JSON.stringify(projection),/price_|secret|stripe/i);
 assert.deepEqual(publicSubscriptionCreditGrants({...configured,AI_BILLING_MODE:'live',
  AI_LIVE_BILLING_APPROVED:'true'}),projection);
});

test('BASE #43: existing billing config remains public safely even when one-time packs are OFF',async()=>{
 const app=express(),env={...configured,AI_BILLING_ENABLED:'false'};
 const fakePool={query(){throw Error('MUST_NOT_READ_DATABASE');}};
 installGenerationBilling(app,{auth:()=>{},pool:fakePool,stripe:null,appUrl:'https://example.invalid',env});
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/ai-billing/config');
  const json=await response.json();
  assert.equal(response.status,200);
  assert.equal(json.enabled,false);
  assert.equal(json.livePaymentsEnabled,false);
  assert.deepEqual(json.subscriptionCredits,{basic:120,pro:450});
  assert.doesNotMatch(JSON.stringify(json),/price_basicfixture|price_profixture|STRIPE_SECRET_KEY|APP_JWT_SECRET/);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('BASE #43: existing subscription cards only append AI-credit copy after approved config',async()=>{
 const js=await readFile(new URL('../app/src/main/assets/ai-pricing.js',import.meta.url),'utf8');
 assert.match(js,/approvedSubscriptionCredits\(subscriptionConfig,key\)/);
 assert.match(js,/monthlyAiCredits===null\?'':/);
 assert.match(js,/after each paid subscription invoice/);
 assert.match(js,/existing video-tool credits per month/);
 assert.doesNotMatch(js,/subscriptionCredits\?\?100|monthlyAiCredits\|\|100/);
});
