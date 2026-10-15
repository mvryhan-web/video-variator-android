import test from 'node:test';
import assert from 'node:assert/strict';
import {checkWebhookConfiguration,webhookConfigObserverEnabled} from '../server/product-watcher/webhook-config.js';

const pack=JSON.stringify([{sku:'example_fixture',priceId:'price_Fixture123',amount:100,credits:10,currency:'eur'}]);
const config={
 PRODUCT_WATCHER_ENABLED:'true',
 PRODUCT_WATCHER_WEBHOOK_CONFIG_ENABLED:'true',
 AI_BILLING_ENABLED:'true',
 AI_BILLING_MODE:'test',
 STRIPE_SECRET_KEY:'sk_test_NEVER_A_REAL_SECRET',
 STRIPE_WEBHOOK_SECRET:'whsec_NEVERAREALSECRET',
 DATABASE_URL:'postgres://person:PRIVATE_DB_PASSWORD@invalid.example/db',
 APP_JWT_SECRET:'PRIVATE_JWT_PASSWORD',
 AI_CREDIT_PACKS_JSON:pack,
 AI_CREDIT_RATES_JSON:'[]'
};
test('observer requires two separate opt-in flags',()=>{
 assert.equal(webhookConfigObserverEnabled({}),false);
 assert.equal(webhookConfigObserverEnabled({PRODUCT_WATCHER_ENABLED:'true'}),false);
 assert.equal(checkWebhookConfiguration({...config,PRODUCT_WATCHER_WEBHOOK_CONFIG_ENABLED:'false'}).code,'AI_WEBHOOK_CONFIG_OBSERVER_DISABLED');
});
test('disabled AI billing does not misdiagnose legacy subscription payments',()=>{
 const a=checkWebhookConfiguration({...config,AI_BILLING_ENABLED:'false',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:''});
 assert.equal(a.status,'healthy');assert.equal(a.code,'AI_BILLING_NOT_ACTIVATED');
 assert.equal(a.webhookDeliveryVerified,false);
 assert.equal(a.scope,'ai_credits_only');
});
test('a complete AI test configuration is only code-ready, not Stripe verified',()=>{
 const a=checkWebhookConfiguration(config);
 assert.equal(a.status,'healthy');assert.equal(a.code,'AI_STRIPE_CONFIG_READY_UNVERIFIED');
 assert.equal(a.checks.approvedPackCount,1);
 assert.equal(a.webhookDeliveryVerified,false);
 assert.equal(a.stripeApiChecked,false);
 assert.equal(a.configurationOnly,true);
});
test('AI live mode requires separate live approval even when matching key exists',()=>{
 const a=checkWebhookConfiguration({...config,AI_BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_live_TEST_NOT_LIVE'});
 assert.equal(a.status,'critical');
 assert.ok(a.blockers.some(x=>x.code==='AI_LIVE_BILLING_NOT_APPROVED'));
 assert.equal(a.checks.liveOwnerApprovalRequired,true);
});
test('missing webhook signature secret is critical configuration blocker, NOT proof of a failed event',()=>{
 const a=checkWebhookConfiguration({...config,STRIPE_WEBHOOK_SECRET:''});
 assert.equal(a.status,'critical');assert.ok(a.blockers.some(x=>x.code==='AI_STRIPE_WEBHOOK_SECRET_MISSING'));
 assert.equal(a.webhookDeliveryVerified,false);
});
test('mode mismatch and missing database are separate safe codes',()=>{
 const a=checkWebhookConfiguration({...config,STRIPE_SECRET_KEY:'sk_live_wrong_mode',DATABASE_URL:''});
 assert.ok(a.blockers.some(x=>x.code==='AI_STRIPE_KEY_MODE_MISMATCH'));
 assert.ok(a.blockers.some(x=>x.code==='AI_STRIPE_DATABASE_NOT_CONFIGURED'));
 assert.equal(a.status,'critical');
});
test('catalog gaps are warnings, never invented price figures',()=>{
 const a=checkWebhookConfiguration({...config,AI_CREDIT_PACKS_JSON:'[]'});
 assert.equal(a.status,'warning');assert.equal(a.code,'AI_STRIPE_CONFIG_REVIEW');
 assert.ok(a.blockers.some(x=>x.code==='AI_PRICE_PACK_CATALOG_NOT_READY'));
 assert.equal(a.checks.approvedPackCount,0);
});
test('secrets, dashboard URLs and invoice details cannot leak in result',()=>{
 const a=checkWebhookConfiguration(config),json=JSON.stringify(a);
 for(const secret of ['PRIVATE_DB_PASSWORD','PRIVATE_JWT_PASSWORD','sk_test_','whsec_','invalid.example','example_fixture','price_Fixture123'])assert.ok(!json.includes(secret));
 assert.deepEqual(Object.keys(a.checks).sort(),[
  'approvedPackCount','billingRequested','databaseConfigured','liveApproved','liveOwnerApprovalRequired',
  'modeKeyMatches','quoteSecretPresent','webhookSecretPresent'
 ].sort());
});
