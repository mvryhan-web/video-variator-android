import test from 'node:test';
import assert from 'node:assert/strict';
import {starsPlans,createStarsInvoice,starsInvoicePayload} from '../telegram-stars.js';
const keys=['TG_STARS_BASIC','TG_STARS_PRO','TG_STARS_BUSINESS','TG_STARS_LIFETIME'];
const saved=Object.fromEntries(keys.map(x=>[x,process.env[x]]));
function cleanup(){for(const name of keys){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}}
test('Stars prices are disabled unless explicitly configured',{concurrency:false},()=>{
 try{for(const k of keys)delete process.env[k];const list=starsPlans();assert.equal(list.length,4);assert.ok(list.every(p=>p.stars===null));}
 finally{cleanup();}
});
test('numeric Stars prices work without currency conversion',{concurrency:false},()=>{
 try{process.env.TG_STARS_BASIC='100';process.env.TG_STARS_PRO='250';process.env.TG_STARS_BUSINESS='700';process.env.TG_STARS_LIFETIME='9000';assert.deepEqual(starsPlans().map(p=>p.stars),[100,250,700,9000]);}
 finally{cleanup();}
});
test('out-of-range Stars values cannot activate checkout',{concurrency:false},()=>{
 try{process.env.TG_STARS_BASIC='0';process.env.TG_STARS_PRO='10001';process.env.TG_STARS_BUSINESS='not-a-number';process.env.TG_STARS_LIFETIME='1.5';assert.ok(starsPlans().every(p=>p.stars===null));}
 finally{cleanup();}
});
test('invalid or unconfigured plan rejects before any invoice is created',{concurrency:false},async()=>{
 try{for(const k of keys)delete process.env[k];
  assert.equal((await createStarsInvoice('bot','12345','invalid')).error,'UNKNOWN_PLAN');
  assert.equal((await createStarsInvoice('bot','12345','basic')).error,'STARS_PRICE_NOT_CONFIGURED');
  assert.equal((await createStarsInvoice('bot','anonymous','basic')).error,'UNKNOWN_PLAN');
 }finally{cleanup();}
});

test('Telegram XTR invoices omit provider token, use one price and valid recurring period',()=>{
 const id='11111111-2222-3333-4444-555555555555';
 const basic=starsInvoicePayload('basic',id,100);
 assert.equal(basic.currency,'XTR');
 assert.equal(basic.subscription_period,2592000);
 assert.equal(basic.prices.length,1);
 assert.equal(basic.prices[0].amount,100);
 assert.equal(Object.hasOwn(basic,'provider_token'),false);
 const lifetime=starsInvoicePayload('lifetime',id,10000);
 assert.equal(Object.hasOwn(lifetime,'subscription_period'),false);
 assert.equal(Object.hasOwn(lifetime,'provider_token'),false);
 assert.throws(()=>starsInvoicePayload('lifetime',id,10001),/INVALID_STARS_INVOICE/);
 assert.throws(()=>starsInvoicePayload('basic','not-valid',100),/INVALID_STARS_INVOICE/);
});
