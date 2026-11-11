import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pricingJs = readFileSync('app/src/main/assets/pricing-page.js', 'utf-8');
const workerJs = readFileSync('app/src/main/assets/_worker.js', 'utf-8');

test('PERMANENT SEAL: pricing plan checkout buttons are active and trigger Stripe', () => {
  assert.ok(pricingJs.includes('checkoutPlan(p.key)'), 'plan button must trigger checkoutPlan');
  assert.ok(!pricingJs.includes('button.disabled=!valid'), 'credit button must not be blocked');
  assert.ok(pricingJs.includes('checkoutCredit(pack)'), 'credit button must trigger checkoutCredit');
  assert.ok(pricingJs.includes('/api/ai-billing/checkout'), 'must call ai-billing checkout');
});

test('PERMANENT SEAL: AI credit buttons support guest and direct Stripe checkout', () => {
  assert.ok(workerJs.includes('/api/ai-billing/checkout'), 'worker must handle ai billing checkout');
  const aiBlock = workerJs.slice(workerJs.indexOf("pathname === '/api/ai-billing/checkout'"), workerJs.indexOf("pathname === '/api/ai-billing/checkout'") + 1000);
  assert.ok(!aiBlock.includes("AUTH_REQUIRED"), 'ai checkout must allow guest checkout without auth block');
  assert.ok(aiBlock.includes('userId'), 'worker must use safe guest or user ID');
  assert.ok(workerJs.includes('LIVE_CREDIT_PACKS'), 'worker must configure live credit packs');
});
