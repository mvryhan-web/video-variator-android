import test from 'node:test';
import assert from 'node:assert/strict';
import {starsPlans,createStarsInvoice,starsInvoicePayload} from '../telegram-stars.js';
const keys=['TG_STARS_BASIC','TG_STARS_PRO','TG_STARS_BUSINESS','TG_STARS_LIFETIME'];
const saved=Object.fromEntries(keys.map(x=>[x,process.env[x]]));
function cleanup(){for(const name of keys){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}}
test('Telegram monthly prices mirror the existing $9, $24 and $99 buyer reference',{concurrency:false},()=>{
 try{for(const k of keys)delete process.env[k];const list=starsPlans();assert.equal(list.length,4);assert.deepEqual(list.map(p=>p.stars),[450,1200,4950,null]);}
 finally{cleanup();}
});
test('numeric Stars prices can be configured but Lifetime stays website-only',{concurrency:false},()=>{
 try{process.env.TG_STARS_BASIC='100';process.env.TG_STARS_PRO='250';process.env.TG_STARS_BUSINESS='700';process.env.TG_STARS_LIFETIME='9000';assert.deepEqual(starsPlans().map(p=>p.stars),[100,250,700,null]);}
 finally{cleanup();}
});
test('invalid Stars values do not activate checkout',{concurrency:false},()=>{
 try{process.env.TG_STARS_BASIC='0';process.env.TG_STARS_PRO='10001';process.env.TG_STARS_BUSINESS='not-a-number';process.env.TG_STARS_LIFETIME='1.5';assert.ok(starsPlans().every(p=>p.stars===null));}
 finally{cleanup();}
});
test('invalid plan and missing consents reject before invoicing',{concurrency:false},async()=>{
 try{for(const k of keys)delete process.env[k];
  assert.equal((await createStarsInvoice('bot','12345','invalid')).error,'UNKNOWN_PLAN');
  assert.equal((await createStarsInvoice('bot','12345','basic')).error,'TERMS_ACCEPTANCE_REQUIRED');
  assert.equal((await createStarsInvoice('bot','12345','lifetime')).error,'LIFETIME_STARS_UNAVAILABLE');
  assert.equal((await createStarsInvoice('bot','anonymous','basic')).error,'UNKNOWN_PLAN');
  assert.equal((await createStarsInvoice('bot','12345','basic',{termsAccepted:true,immediateAccess:true})).error,'TERMS_ACCEPTANCE_REQUIRED');
 }finally{cleanup();}
});

test('Telegram XTR invoices omit provider token, use one price and valid recurring period',()=>{
 const id='11111111-2222-3333-4444-555555555555';
 const basic=starsInvoicePayload('basic',id,100);
 assert.equal(basic.currency,'XTR');
 assert.equal(basic.subscription_period,2592000);
 assert.equal(basic.prices.length,1);
 assert.equal(basic.prices[0].amount,100);
 assert.equal(basic.provider_token,'');
 const lifetime=starsInvoicePayload('lifetime',id,10000);
 assert.equal(Object.hasOwn(lifetime,'subscription_period'),false);
 assert.equal(lifetime.provider_token,'');
 assert.throws(()=>starsInvoicePayload('lifetime',id,10001),/INVALID_STARS_INVOICE/);
 assert.throws(()=>starsInvoicePayload('basic','not-valid',100),/INVALID_STARS_INVOICE/);
});
