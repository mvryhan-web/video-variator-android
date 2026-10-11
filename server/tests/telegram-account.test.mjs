import test from 'node:test';
import assert from 'node:assert/strict';
import {stripeIsActive} from '../telegram-account.js';

test('Stripe active or lifetime subscription can be shared with Telegram',()=>{
 assert.equal(stripeIsActive({plan:'basic',subscription_status:'active'}),true);
 assert.equal(stripeIsActive({plan:'pro',subscription_status:'trialing'}),true);
 assert.equal(stripeIsActive({plan:'lifetime',subscription_status:'lifetime'}),true);
});
test('inactive, canceled and incomplete Stripe subscriptions do not become paid Telegram access',()=>{
 for(const status of ['inactive','canceled','past_due','incomplete']){
  assert.equal(stripeIsActive({plan:'basic',subscription_status:status}),false);
 }
 assert.equal(stripeIsActive({plan:'lifetime',subscription_status:'inactive'}),false);
 assert.equal(stripeIsActive(null),false);
});
