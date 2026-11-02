import test from 'node:test';
import assert from 'node:assert/strict';
import {retrieveStripeNetRevenue,verifyStripeNetRevenue,stripeCheckoutTaxAmount,stripeInvoiceTaxAmount} from '../server/generation-stripe-net-revenue.js';

const paymentIntent=({live=false,amount=1200,fee=55,tax=200}={})=>({
 id:'pi_fixture',status:'succeeded',livemode:live,amount_received:amount,currency:'eur',
 latest_charge:{id:'ch_fixture',payment_intent:'pi_fixture',paid:true,captured:true,disputed:false,refunded:false,amount_refunded:0,livemode:live,currency:'eur',amount_captured:amount,
  balance_transaction:{id:'txn_fixture',source:'ch_fixture',type:'charge',currency:'eur',amount,fee,net:amount-fee}}
});
const args=(overrides={})=>({paymentIntent:paymentIntent(),expectedPaymentIntentId:'pi_fixture',expectedAmount:1200,expectedCurrency:'eur',taxAmount:200,expectedLivemode:false,...overrides});

test('D18 verified Stripe settlement excludes processor fee and tax from received revenue',()=>{
 assert.deepEqual(verifyStripeNetRevenue(args()),{
  currency:'eur',processorFeeAmount:55,taxAmount:200,netRevenueMicros:9_450_000,
  stripeChargeId:'ch_fixture',stripeBalanceTransactionId:'txn_fixture',livemode:false
 });
});
test('D18 receipt verification rejects payment, mode, charge, balance transaction and tax mismatches',()=>{
 const p=paymentIntent();
 for(const change of [
  {paymentIntent:{...p,status:'processing'}},{paymentIntent:{...p,livemode:true}},
  {paymentIntent:{...p,amount_received:1199}},{paymentIntent:{...p,latest_charge:{...p.latest_charge,paid:false}}},
  {paymentIntent:{...p,latest_charge:{...p.latest_charge,balance_transaction:{...p.latest_charge.balance_transaction,fee:1201}}}},
  {taxAmount:1200},{taxAmount:-1},{expectedCurrency:'usd'}
 ])assert.throws(()=>verifyStripeNetRevenue(args(change)),/AI_SETTLEMENT_/);
});
test('D18 safely retrieves expanded or separately referenced Charge and BalanceTransaction',async()=>{
 let piCalls=0,chargeCalls=0,balanceCalls=0;
 const stripe={paymentIntents:{async retrieve(id,options){piCalls++;assert.equal(id,'pi_fixture');assert.deepEqual(options.expand,['latest_charge.balance_transaction']);return {...paymentIntent(),latest_charge:'ch_fixture'};}},
  charges:{async retrieve(id,options){chargeCalls++;assert.equal(id,'ch_fixture');assert.deepEqual(options.expand,['balance_transaction']);return {...paymentIntent().latest_charge,balance_transaction:'txn_fixture'};}},
  balanceTransactions:{async retrieve(id){balanceCalls++;assert.equal(id,'txn_fixture');return paymentIntent().latest_charge.balance_transaction;}}
 };
 const settlement=await retrieveStripeNetRevenue({stripe,paymentIntentId:'pi_fixture',expectedAmount:1200,expectedCurrency:'eur',taxAmount:200,expectedLivemode:false});
 assert.equal(settlement.netRevenueMicros,9_450_000);assert.deepEqual([piCalls,chargeCalls,balanceCalls],[1,1,1]);
});
test('D18 Checkout and Invoice tax evidence must be present and internally consistent',()=>{
 assert.equal(stripeCheckoutTaxAmount({amount_subtotal:1000,amount_total:1200,total_details:{amount_tax:200,amount_discount:0,amount_shipping:0}}),200);
 assert.equal(stripeCheckoutTaxAmount({amount_subtotal:1000,amount_total:1000,total_details:{amount_tax:0,amount_discount:0,amount_shipping:0}}),0);
 assert.equal(stripeInvoiceTaxAmount({total_taxes:[{amount:200}],total_tax_amounts:[{amount:200}]}),200);
 assert.equal(stripeInvoiceTaxAmount({total_taxes:[]}),0);
 assert.throws(()=>stripeCheckoutTaxAmount({amount_subtotal:1000,amount_total:1200,total_details:{amount_tax:0,amount_discount:0,amount_shipping:0}}),/AI_SETTLEMENT_TOTAL_MISMATCH/);
 assert.throws(()=>stripeInvoiceTaxAmount({}),/AI_SETTLEMENT_TAX_UNVERIFIED/);
 assert.throws(()=>stripeInvoiceTaxAmount({total_taxes:[{amount:1}],total_tax_amounts:[{amount:2}]}),/AI_SETTLEMENT_TAX_CONFLICT/);
});

test('D18 rejects reversed or disputed Charge even if original captured settlement still matches',()=>{
 const p=paymentIntent();
 for(const change of [{disputed:true},{refunded:true},{amount_refunded:1},{amount_refunded:1200},
  {disputed:undefined},{refunded:undefined},{amount_refunded:undefined},
  {amount_refunded:-1},{amount_refunded:'0'},{amount_refunded:0.5}])
  assert.throws(()=>verifyStripeNetRevenue(args({paymentIntent:{...p,latest_charge:{...p.latest_charge,...change}}})),
   /AI_SETTLEMENT_CHARGE_REVERSED_OR_UNVERIFIED/);
});

test('D18 retrieved settlement must belong to the requested PaymentIntent before further reads',async()=>{
 for(const returnedId of ['pi_other',undefined,null,'']){
  let reads=0;
  const stripe={paymentIntents:{async retrieve(){return {...paymentIntent(),id:returnedId,latest_charge:'ch_fixture'};}},
   charges:{async retrieve(){reads++;return paymentIntent().latest_charge;}}};
  await assert.rejects(retrieveStripeNetRevenue({stripe,paymentIntentId:'pi_fixture',expectedAmount:1200,
   expectedCurrency:'eur',taxAmount:200,expectedLivemode:false}),/AI_SETTLEMENT_PAYMENT_UNVERIFIED/);
  assert.equal(reads,0,'mismatched payment must fail before Charge retrieval');
 }
});

// Stripe documents charge.payment_intent as an expandable reference.
test('D18 Charge must explicitly reference the verified PaymentIntent',()=>{
 const p=paymentIntent();
 for(const reference of ['pi_other',null,undefined,{}, {id:'pi_other'}])
  assert.throws(()=>verifyStripeNetRevenue(args({paymentIntent:{...p,latest_charge:{...p.latest_charge,payment_intent:reference}}})),
   /AI_SETTLEMENT_CHARGE_UNVERIFIED/);
 for(const reference of ['pi_fixture',{id:'pi_fixture'}])
  assert.equal(verifyStripeNetRevenue(args({paymentIntent:{...p,latest_charge:{...p.latest_charge,payment_intent:reference}}})).netRevenueMicros,9_450_000);
});

test('D18 Stripe retrieval must reject returned Charge/BalanceTx ID mismatch',async()=>{
 const p=paymentIntent();
 function api(chargeId,transactionId){return {
  paymentIntents:{async retrieve(){return {...p,latest_charge:'ch_fixture'};}},
  charges:{async retrieve(id){assert.equal(id,'ch_fixture');return {...p.latest_charge,id:chargeId,balance_transaction:'txn_fixture'};}},
  balanceTransactions:{async retrieve(id){assert.equal(id,'txn_fixture');return {...p.latest_charge.balance_transaction,id:transactionId};}}
 };}
 const params={paymentIntentId:'pi_fixture',expectedAmount:1200,expectedCurrency:'eur',taxAmount:200,expectedLivemode:false};
 await assert.rejects(retrieveStripeNetRevenue({...params,stripe:api('ch_other','txn_fixture')}),/AI_SETTLEMENT_CHARGE_UNVERIFIED/);
 await assert.rejects(retrieveStripeNetRevenue({...params,stripe:api('ch_fixture','txn_other')}),/AI_SETTLEMENT_BALANCE_TRANSACTION_UNVERIFIED/);
 assert.equal((await retrieveStripeNetRevenue({...params,stripe:api('ch_fixture','txn_fixture')})).stripeBalanceTransactionId,'txn_fixture');
});


test('D18 fail-closed mode contract: absent or nonboolean livemode never attests Stripe test receipts',()=>{
 for(const value of [undefined,null,0,1,'false','true',{},[]]){
  assert.throws(()=>verifyStripeNetRevenue(args({expectedLivemode:value})),/AI_SETTLEMENT_MODE_UNVERIFIED/);
 }
 // Only an explicit TEST value verifies synthetic test-mode receipts.
 assert.equal(verifyStripeNetRevenue(args({expectedLivemode:false})).livemode,false);
});

test('D18 missing livemode refuses before any Stripe network read',async()=>{
 let reads=0;
 const stripe={paymentIntents:{async retrieve(){reads++;return paymentIntent();}}};
 for(const value of [undefined,null,'false',0]){
  await assert.rejects(retrieveStripeNetRevenue({
   stripe,paymentIntentId:'pi_fixture',expectedAmount:1200,expectedCurrency:'eur',
   taxAmount:200,expectedLivemode:value
  }),/AI_SETTLEMENT_MODE_UNVERIFIED/);
 }
 assert.equal(reads,0,'no Stripe request is needed to reject an omitted mode');
});

test('D18 direct verifier rejects absent order-bound PI reference and valid foreign same-price receipts',()=>{
 const p=paymentIntent();
 const other={...p,id:'pi_other',latest_charge:{...p.latest_charge,id:'ch_other',payment_intent:'pi_other',
  balance_transaction:{...p.latest_charge.balance_transaction,source:'ch_other'}}};
 for(const bad of [undefined,null,'',123,'pi-foreign','ch_other'])
  assert.throws(()=>verifyStripeNetRevenue(args({expectedPaymentIntentId:bad})),
   /AI_SETTLEMENT_PAYMENT_REFERENCE_UNVERIFIED/);
 assert.throws(()=>verifyStripeNetRevenue(args({paymentIntent:other})),/AI_SETTLEMENT_PAYMENT_UNVERIFIED/);
 // Correctly binding the reference allows the receipt itself; ownership of this id
 // must still be established independently by the account/order layer before use.
 assert.equal(verifyStripeNetRevenue(args({paymentIntent:other,expectedPaymentIntentId:'pi_other'})).netRevenueMicros,9_450_000);
});
