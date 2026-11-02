import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationBilling} from '../server/generation-billing.js';

const user={id:'checkout-test-user',email:'test@example.invalid'};
const requestId='11111111-1111-4111-8111-111111111111';
const pack={sku:'fixture',priceId:'price_fixture',credits:100,amount:990,currency:'eur'};

async function callCheckout(override={}){
 let order,updates=0,sessionCreates=0,priceReads=0;
 const db={
  async query(sql,args=[]){
   if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_wallet')||
      sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_order'))return {rows:[]};
   if(sql.startsWith('INSERT INTO vv_ai_order')){
    if(!order)order={id:args[0],user_id:args[1],sku:args[2],snapshot:JSON.parse(args[3]),session_id:null};
    return {rows:[]};
   }
   if(sql.startsWith('SELECT * FROM vv_ai_order'))return {rows:[order]};
   if(sql.startsWith('UPDATE vv_ai_order SET session_id')){
    updates++;
    order.session_id=args[1];
    return {rows:[]};
   }
   throw Error('Unexpected SQL: '+sql);
  }
 };
 const stripe={
  prices:{async retrieve(id){priceReads++;assert.equal(id,pack.priceId);return {id,active:true,type:'one_time',
   unit_amount:pack.amount,currency:pack.currency,livemode:false};}},
  checkout:{sessions:{async create(args){
   sessionCreates++;
   const expected={...args,id:'cs_test_created',url:'https://checkout.stripe.com/c/pay/fixture',
    livemode:false,status:'open',expires_at:Math.floor(Date.now()/1000)+3600,
    amount_total:pack.amount,currency:pack.currency};
   return {...expected,...override};
  }}}
 };
 const env={AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'test',DATABASE_URL:'mock',
  APP_JWT_SECRET:'synthetic',STRIPE_SECRET_KEY:'sk_test_mock',
  AI_CREDIT_PACKS_JSON:JSON.stringify([pack]),AI_CREDIT_RATES_JSON:'[]'};
 const app=express();app.use(express.json());
 installGenerationBilling(app,{auth:(req,_res,next)=>{req.user=user;next();},pool:db,stripe,
  appUrl:'https://example.invalid',env});
 const server=app.listen(0);await new Promise(done=>server.once('listening',done));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/ai-billing/checkout',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({sku:pack.sku,requestId})});
  return {status:response.status,body:await response.json(),updates,order,
   sessionCreates,priceReads};
 }finally{server.closeAllConnections();await new Promise(done=>server.close(done));}
}

test('BASE #16: initial valid Stripe session is persisted exactly once and honestly returned',async()=>{
 const result=await callCheckout();
 assert.equal(result.status,200);
 assert.deepEqual(result.body,{url:'https://checkout.stripe.com/c/pay/fixture',id:'cs_test_created',mode:'test'});
 assert.equal(result.updates,1);
 assert.equal(result.order.session_id,'cs_test_created');
 assert.equal(result.sessionCreates,1);
 assert.equal(result.priceReads,1);
});

test('BASE #16: malformed first-session URL, owner, mode, amount and expiry all fail before persistence',async()=>{
 const invalid=[
  {url:'http://checkout.stripe.com/c/pay/fixture'},
  {url:'https://checkout.stripe.com.attacker.invalid/pay'},
  {url:'https://attacker@checkout.stripe.com/c/pay/fixture'},
  {url:'https://checkout.stripe.com:8080/c/pay/fixture'},
  {url:'https://other.example.invalid/pay'},
  {url:'not-a-url'},
  {mode:'subscription'},
  {status:'complete'},
  {status:'expired'},
  {status:undefined},
  {client_reference_id:'another-user'},
  {metadata:{aiWallet:'v1',orderId:'another-order'}},
  {metadata:{aiWallet:'v2'}},
  {amount_total:pack.amount-1},
  {currency:'usd'},
  {livemode:true},
  {expires_at:1},
  {expires_at:undefined}
 ];
 for(const replacement of invalid){
  const result=await callCheckout(replacement);
  assert.equal(result.status,503,JSON.stringify(replacement));
  assert.equal(result.body.error,'AI_CHECKOUT_UNAVAILABLE');
  assert.equal(result.updates,0,'invalid Stripe session must never be persisted');
  assert.equal(result.order.session_id,null,'invalid Stripe session must not be linked to order');
  assert.equal(result.sessionCreates,1);
 }
});
