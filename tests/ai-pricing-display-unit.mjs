import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validPlanPrice,validToolLimit,validLifetimeCurrency,
  validAiPack,validWalletAmount,aiCheckoutMode,checkoutErrorMessage,approvedGenerationEstimates
} from '../app/src/main/assets/ai-pricing-display.js';

test('BASE #43: configured tool plan prices are passed through, never guessed',()=>{
  assert.equal(validPlanPrice({price:9}),9);
  assert.equal(validPlanPrice({price:0}),0);
  for(const price of [undefined,null,'', '9',NaN,Infinity,-1])
    assert.equal(validPlanPrice({price}),null);
});

test('BASE #43: invalid or missing tool allowances never render as zero or NaN',()=>{
  assert.equal(validToolLimit({limit:300}),300);
  assert.equal(validToolLimit({limit:0}),0);
  for(const limit of [undefined,null,NaN,-10,1.5,'300',Infinity,Number.MAX_SAFE_INTEGER+1])
    assert.equal(validToolLimit({limit}),null);
});

test('BASE #43: lifetime amount uses declared currency only',()=>{
  assert.equal(validLifetimeCurrency({currency:'eur'}),'EUR');
  assert.equal(validLifetimeCurrency({currency:'USD'}),'USD');
  for(const currency of [undefined,null,'', 'JPY','<script>alert(1)</script>'])
    assert.equal(validLifetimeCurrency({currency}),null);
});

test('BASE #43: AI packs are strict copies of configured valid server data',()=>{
  const original={sku:'p_small',credits:120,amount:990,currency:'eur'};
  assert.equal(validAiPack(original),true);
  for(const change of [
    {credits:0},{credits:'120'},{credits:NaN},{credits:-100},
    {amount:0},{amount:'990'},{amount:Infinity},
    {currency:'EURO'},{currency:'usd '},{currency:null},
    {sku:''},{sku:'<img src=x>'}
  ]) assert.equal(validAiPack({...original,...change}),false,JSON.stringify(change));
  assert.equal(validAiPack(null),false);
  assert.equal(validAiPack([]),false);
});

test('BASE #43: missing wallet totals are unknown, never zero',()=>{
  assert.equal(validWalletAmount(0),0);
  assert.equal(validWalletAmount(123),123);
  for(const total of [undefined,null,'0',NaN,Infinity,-3,0.3,Number.MAX_SAFE_INTEGER+1])
    assert.equal(validWalletAmount(total),null);
});

test('BASE #43: test/live checkout mode must be explicit and enabled',()=>{
  assert.equal(aiCheckoutMode({enabled:true,mode:'test'}),'test');
  assert.equal(aiCheckoutMode({enabled:true,mode:'live'}),'live');
  for(const x of [{},{enabled:true},{enabled:false,mode:'live'},
    {enabled:true,mode:'production'},{enabled:true,mode:'LIVE'}])
    assert.equal(aiCheckoutMode(x),null);
});

test('BASE #16: checkout failures never assert an uncertain payment was not made',()=>{
 const cases=['CHECKOUT_SESSION_NOT_REUSABLE','CHECKOUT_REQUEST_CONFLICT','AI_CHECKOUT_UNAVAILABLE',
  'PAYMENTS_NOT_ACTIVATED','UNSAFE_CHECKOUT_URL','REQUEST_FAILED'];
 for(const code of cases){
  const msg=checkoutErrorMessage(code);
  assert.equal(typeof msg,'string');
  assert.ok(msg.length>25);
  assert.doesNotMatch(msg,/no payment was completed|payment was not made|no charge occurred/i);
 }
 assert.match(checkoutErrorMessage('CHECKOUT_SESSION_NOT_REUSABLE'),/wallet.*payment history/i);
 assert.match(checkoutErrorMessage('CHECKOUT_REQUEST_CONFLICT'),/refresh/i);
 assert.match(checkoutErrorMessage('AI_CHECKOUT_UNAVAILABLE'),/temporarily unavailable/i);
});

test('BASE #43 generation estimates use ONLY approved server Image/Video rates',()=>{
 const approved={rates:[{kind:'image',credits:10},{kind:'video',credits:35}]};
 assert.deepEqual(approvedGenerationEstimates(approved,100),[{kind:'image',count:10},{kind:'video',count:2}]);
 assert.deepEqual(approvedGenerationEstimates(approved,9),[],'insufficient prepaid credits never imply a full generation');
 assert.deepEqual(approvedGenerationEstimates({rates:[{kind:'video',credits:25}]},100),[{kind:'video',count:4}]);
 for(const config of [null,{}, {rates:[]},{rates:'image:10'},
  {rates:[{kind:'video',credits:0}]}, {rates:[{kind:'video',credits:'10'}]},
  {rates:[{kind:'image',credits:12},{kind:'image',credits:15}]}])
  assert.deepEqual(approvedGenerationEstimates(config,100),[],'never guess a missing/invalid/ambiguous kind rate');
});

test('BASE #43 invalid pack balances and irrelevant rate kinds do not invent generations',()=>{
 const config={rates:[{kind:'music',credits:10},{kind:'voice',credits:12}]};
 for(const credits of [undefined,null,'100',0,-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER,10_000_001])
  assert.deepEqual(approvedGenerationEstimates({rates:[{kind:'image',credits:10}]},credits),[]);
 assert.deepEqual(approvedGenerationEstimates(config,1000),[]);
 assert.deepEqual(approvedGenerationEstimates({rates:[{kind:'image',credits:1},{kind:'video',credits:1}]},10_000_000),
  [{kind:'image',count:10_000_000},{kind:'video',count:10_000_000}]);
});
