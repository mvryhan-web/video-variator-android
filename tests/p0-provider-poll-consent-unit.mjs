import test from 'node:test';
import assert from 'node:assert/strict';
import {pollWithCurrentGenerationConsent} from '../server/generation-consent-poll.js';
const accepted={terms_version:'2026-10-20',privacy_version:'2026-10-20',provider_data_version:'2026-10-20',provider_data_accepted:true};
function fixture(allowed=true){
 const order=[];let current=allowed;
 const client={
  async query(sql){
   if(sql.includes('pg_try_advisory_lock'))return {rows:[{acquired:true}]};
   if(sql.includes('pg_advisory_unlock')){order.push('unlock');return {rows:[{pg_advisory_unlock:true}]};}
   if(sql.startsWith('SELECT terms_version'))return {rows:[current?accepted:{provider_data_accepted:false}]};
   throw Error('UNEXPECTED_SQL');
  },release(){order.push('release');}
 };
 return {pool:{connect:async()=>client},order,revoke:()=>{current=false;}};
}
test('P0 after revoke, consent fence denies ANY new polling HTTP',async()=>{
 const f=fixture(false);let called=0;
 await assert.rejects(pollWithCurrentGenerationConsent({pool:f.pool,userId:'A',poll:async()=>{
  called++;return {pending:true};
 }}),/PROVIDER_CONSENT_REQUIRED/);
 assert.equal(called,0);assert.deepEqual(f.order,['unlock','release']);
});
test('P0 accepted poll uses single PG lease and unlocks before DB settlement',async()=>{
 const f=fixture();let seen=0;
 const r=await pollWithCurrentGenerationConsent({pool:f.pool,userId:'A',poll:async({client,signal})=>{
  assert.ok(client);signal.throwIfAborted();seen++;return {pending:true};
 }});
 assert.equal(r.pending,true);assert.equal(seen,1);assert.deepEqual(f.order,['unlock','release']);
});
test('P0 stalled poll aborts and drains before per-user consent unlock',async()=>{
 const f=fixture(),order=f.order;
 await assert.rejects(pollWithCurrentGenerationConsent({
  pool:f.pool,userId:'A',timeoutMs:120,poll:async({signal})=>new Promise((_,reject)=>{
   signal.addEventListener('abort',()=>{
    order.push('aborted');
    setTimeout(()=>{order.push('transport-closed');reject(signal.reason);},20);
   },{once:true});
  })
 }),/PROVIDER_POLL_TIMEOUT_UNCERTAIN/);
 assert.deepEqual(order,['aborted','transport-closed','unlock','release']);
});
