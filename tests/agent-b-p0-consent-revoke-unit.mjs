import test from 'node:test';
import assert from 'node:assert/strict';
import {withCurrentGenerationConsent,hasStoredGenerationConsent} from '../server/generation-consent.js';
import {submitPurchasedProviderRequest,PurchasedDispatchDenied} from '../server/generation-purchased-provider-boundary.js';

// In-memory cooperative advisory-lock mock: no database, network, real payment,
// or provider calls. The real PostgreSQL fence is separately reviewed by B+D.
const VERSION='2026-10-20';
function mockConsentPool(){
 let granted=true,terms=VERSION,privacy=VERSION,providerVersion=VERSION;
 let active=false;
 const queue=[];
 let unlocks=0,acquisitions=0;
 const begin=()=>new Promise(resolve=>{
  function lock(){if(!active){active=true;acquisitions++;resolve();}else queue.push(lock);}
  lock();
 });
 const pool={async connect(){return {
  async query(sql){
   if(sql.startsWith('SELECT pg_advisory_lock')){await begin();return {rows:[]};}
   if(sql.startsWith('SELECT pg_advisory_unlock')){
    unlocks++;active=false;queue.shift()?.();return {rows:[{pg_advisory_unlock:true}]};
   }
   if(sql.startsWith('SELECT terms_version'))return {rows:[{terms_version:terms,privacy_version:privacy,provider_data_version:providerVersion,provider_data_accepted:granted}]};
   return {rows:[]};
  },release(){}
 };}};
 return {pool,revoke:()=>{granted=false;providerVersion=null;},grant:()=>{granted=true;providerVersion=VERSION;},
  versionMismatch:()=>{privacy='old';},stats:()=>({unlocks,acquisitions})};
}
test('no current, user-bound, versioned consent => deny before dispatch',async()=>{
 const db=mockConsentPool();db.revoke();
 assert.equal(await hasStoredGenerationConsent(await db.pool.connect(),'account-A'),false);
 let called=0;
 await assert.rejects(withCurrentGenerationConsent(db.pool,'account-A',async()=>{called++;}),/PROVIDER_CONSENT_REQUIRED/);
 assert.equal(called,0);
 db.grant();db.versionMismatch();
 await assert.rejects(withCurrentGenerationConsent(db.pool,'account-A',async()=>{called++;}),/PROVIDER_CONSENT_REQUIRED/);
 assert.equal(called,0);
});
test('revoke ACK cannot pass a previously admitted, still-running provider call',async()=>{
 const db=mockConsentPool();let start;
 const running=new Promise(resolve=>{start=resolve;});
 let sent=0,ack=false;
 const first=withCurrentGenerationConsent(db.pool,'account-A',async()=>{sent++;await running;});
 await new Promise(resolve=>setImmediate(resolve));
 const revoke=(async()=>{await withCurrentGenerationConsent(db.pool,'account-A',async()=>{db.revoke();});ack=true;})();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent,1);assert.equal(ack,false);
 start();await first;await revoke;
 assert.equal(ack,true);
 let after=0;
 await assert.rejects(withCurrentGenerationConsent(db.pool,'account-A',async()=>{after++;}),/PROVIDER_CONSENT_REQUIRED/);
 assert.equal(after,0);assert.equal(db.stats().unlocks,3);
});
test('provider exception after transport admission stays ambiguous (not a safe credit refund)',async()=>{
 const db=mockConsentPool(),err=Error('remote may have accepted request');
 await assert.rejects(withCurrentGenerationConsent(db.pool,'account-A',async()=>{throw err;}),e=>e===err);
 assert.equal(db.stats().unlocks,1);
});
