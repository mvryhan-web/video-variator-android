import test from 'node:test';
import assert from 'node:assert/strict';
import {progressView} from '../app/src/main/assets/studio-job-progress.js';

test('BASE 31: no optimistic credit reservation or charge on request submission',()=>{
 const state=progressView('submitting',{creditsReserved:999,creditsCharged:999});
 assert.equal(state.status,'submitting');
 assert.equal(state.credits,'');
 assert.match(state.hint,/until the server confirms/);
 const unknown=progressView('unconfirmed',{creditsReserved:999});
 assert.equal(unknown.credits,'');
 assert.match(unknown.hint,/before retrying/);
});

test('BASE 31: server-owned queue, processing and finalizing are distinct truthful stages',()=>{
 const expectStages={queued:'Queued',processing:'Generating',finalizing:'Finalizing'};
 for(const [status,heading] of Object.entries(expectStages)){
  const x=progressView(status,{creditsReserved:23});
  assert.equal(x.heading,heading);
  assert.match(x.credits,/23 AI credits reserved/);
  assert.doesNotMatch(x.credits,/charged/);
 }
 const missing=progressView('processing',{creditsReserved:0});
 assert.match(missing.credits,/No confirmed reservation/);
 const invalid=progressView('processing',{creditsReserved:-9});
 assert.match(invalid.credits,/No confirmed reservation/);
});

test('BASE 31: only server-confirmed ready charged amount may be called charged',()=>{
 const paid=progressView('ready',{creditsReserved:23,creditsCharged:21});
 assert.match(paid.credits,/21 AI credits charged/);
 assert.doesNotMatch(paid.credits,/23 AI credits/);
 const unsettled=progressView('ready',{creditsReserved:23});
 assert.match(unsettled.credits,/reserved/);
 assert.doesNotMatch(unsettled.credits,/charged/);
});

test('BASE 31: failed and unknown do not promise refunds or repeat paid calls',()=>{
 for(const status of ['failed','unknown','nonsense']){
  const state=progressView(status,{creditsReserved:7});
  assert.ok(['failed','unknown'].includes(state.status));
  assert.match(state.credits,/reserved/);
  assert.doesNotMatch(state.hint,/refunded|not charged|automatically retry/);
  assert.match(state.hint,/wallet/);
 }
});

test('BASE 31: Russian copy is available without assuming wallet amount',()=>{
 const state=progressView('queued',{locale:'ru-RU',creditsReserved:12});
 assert.equal(state.heading,'В очереди');
 assert.match(state.credits,/12 AI-кредитов в резерве/);
 assert.match(state.hint,/Историю/);
});
