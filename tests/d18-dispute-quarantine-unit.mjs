import test from 'node:test';
import assert from 'node:assert/strict';
import {installGenerationBilling} from '../server/generation-billing.js';
import {stripeDisputeData,quarantineSignedDispute} from '../server/generation-dispute-quarantine.js';
const event=(type='charge.dispute.created',change={})=>({id:'evt_fixture',type,livemode:true,
 data:{object:{id:'du_fixture',charge:'ch_fixture',payment_intent:'pi_fixture',livemode:true,
 amount:50,currency:'eur',...change}}});
test('D18 signed dispute references bind mode, charge, payment and amount; malformed input cannot write',async()=>{
 const good=stripeDisputeData(event());assert.equal(good.paymentIntent,'pi_fixture');
 assert.equal(stripeDisputeData({type:'invoice.paid'}),null);
 for(const change of [{id:'bad'},{charge:'ch_bad_suffix'},{payment_intent:null},{amount:0},{amount:1.5},
  {currency:'EU'},{livemode:false}]){
  let writes=0;
  await assert.rejects(quarantineSignedDispute({event:event(undefined,change),
   pool:{query(){writes++}},wallet:{init(){writes++}}}),/AI_DISPUTE_EVIDENCE_INVALID/);
  assert.equal(writes,0);
 }
 assert.throws(()=>stripeDisputeData({...event(),id:'bad'}),/AI_DISPUTE_EVIDENCE_INVALID/);
});
test('D18 duplicate, closed/won and reinstated events never restore credit or clear quarantine',async()=>{
 let init=0,writes=0;const statements=[];
 const pool={async query(sql,args){writes++;statements.push(sql);assert.equal(args[0],'pi_fixture');return {rows:[{payment_intent:args[0]}]};}};
 const wallet={async init(){init++},grant(){assert.fail('dispute must not grant credit')},refund(){assert.fail('dispute is not a refund')}};
 for(const type of ['charge.dispute.created','charge.dispute.created','charge.dispute.updated',
  'charge.dispute.closed','charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'])
  assert.equal(await quarantineSignedDispute({event:event(type,{status:'won'}),pool,wallet}),true);
 assert.equal(init,6);assert.equal(writes,6);
 for(const sql of statements){assert.match(sql,/GREATEST/);assert.doesNotMatch(sql,/DELETE|vv_ai_ledger|vv_ai_wallet/);}
});
test('D18 conflicting charge/mode/currency evidence rejects instead of overwriting quarantine',async()=>{
 await assert.rejects(quarantineSignedDispute({event:event(),wallet:{async init(){}},
 pool:{async query(){return {rows:[]}}}}),/AI_DISPUTE_EVIDENCE_CONFLICT/);
 await assert.rejects(quarantineSignedDispute({event:event()}),/AI_DISPUTE_DATABASE_UNAVAILABLE/);
});

test('D18 signed disputes reconcile with new sales OFF and use no Stripe/provider API',async()=>{
 let writes=0;
 const pool={async query(sql){if(sql.includes('INSERT INTO vv_ai_dispute_quarantine')){writes++;return {rows:[{payment_intent:'pi_fixture'}]};}return {rows:[]};}};
 const {handleEvent}=installGenerationBilling({get(){},post(){},use(){}},{pool,stripe:null,env:{},auth(){}});
 assert.equal(await handleEvent(event()),true);
 assert.equal(writes,1);
});
