import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBytePlusVideoCancellation} from '../server/generation-video-cancel.js';

const mock=status=>new Response(JSON.stringify({status}),{headers:{'content-type':'application/json'}});
const operation='byteplus:cgt_2026-10-17_queued';

test('BASE #5: even a confirmed queued BytePlus task CANNOT be safely cancelled by a racy GET→DELETE',async()=>{
 const calls=[];
 const result=await inspectBytePlusVideoCancellation(operation,{key:'synthetic-key',fetcher:async(url,opts)=>{
  calls.push({url,opts});return mock('queued');
 }});
 assert.deepEqual(result,{canCancel:false,status:'queued',reason:'PROVIDER_DELETE_NOT_ATOMIC'});
 assert.deepEqual(calls.map(c=>c.opts.method),['GET']);
 assert.equal(calls[0].url,'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/cgt_2026-10-17_queued');
 assert.equal(calls[0].opts.redirect,'error');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer synthetic-key');
});

test('BASE #5: provider running/succeeded/failed/cancelled/expired states never trigger DELETE',async()=>{
 for(const status of ['running','succeeded','failed','cancelled','expired']){
  const calls=[];
  const result=await inspectBytePlusVideoCancellation(operation,{key:'fixture',fetcher:async(_,opts)=>{
   calls.push(opts.method);return mock(status);
  }});
  assert.deepEqual(result,{canCancel:false,status,reason:'PROVIDER_NOT_QUEUED'});
  assert.deepEqual(calls,['GET']);
 }
});

test('BASE #5: no request may DELETE a task when a queued task may finish between calls',async()=>{
 let queries=0,deleted=0;
 const fetcher=async(_url,opts)=>{
  if(opts.method==='DELETE'){deleted++;throw Error('DESTRUCTIVE_DELETE_BUG');}
  queries++;return mock('queued');
 };
 const result=await inspectBytePlusVideoCancellation(operation,{key:'fixture',fetcher});
 assert.equal(result.canCancel,false);
 assert.equal(queries,1);
 assert.equal(deleted,0);
});

test('BASE #5: invalid operation IDs and missing provider keys never reach the network',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('NETWORK_MUST_NOT_RUN');};
 for(const op of ['byteplus:../anything','byteplus:cgt/other','byteplus:','operations/x',
  'byteplus:id?access_key=secret','byteplus:'+('x'.repeat(161)),null]){
  await assert.rejects(()=>inspectBytePlusVideoCancellation(op,{key:'fixture',fetcher}),/INVALID_OPERATION/);
 }
 await assert.rejects(()=>inspectBytePlusVideoCancellation(operation,{key:'',fetcher}),/PROVIDER_KEY_REQUIRED/);
 assert.equal(calls,0);
});

test('BASE #5: malformed, oversized or unsupported provider state fails closed, never DELETE',async()=>{
 const replies=[
  new Response(null,{status:502}),
  new Response('<html>provider error</html>'),
  mock('done'),
  new Response(JSON.stringify({status:'queued',token:'x'.repeat(70000)}))
 ];
 for(const reply of replies){
  let calls=0;
  await assert.rejects(()=>inspectBytePlusVideoCancellation(operation,{key:'fixture',fetcher:async(_url,opts)=>{
   calls++;assert.equal(opts.method,'GET');return reply;
  }}),/CANCEL_STATUS_UNVERIFIED/);
  assert.equal(calls,1);
 }
});

test('BASE #5: provider never supplies its own safe atomic cancel/delete condition in the result',async()=>{
 const calls=[];
 const response=()=>new Response(JSON.stringify({status:'queued',id:'cgt_xyz',can_cancel:true}));
 const decision=await inspectBytePlusVideoCancellation(operation,{key:'fixture',fetcher:async(url,opts)=>{
  calls.push({url,opts});return response();
 }});
 assert.deepEqual(decision,{canCancel:false,status:'queued',reason:'PROVIDER_DELETE_NOT_ATOMIC'});
 assert.equal(calls.length,1);
 assert.equal(calls[0].opts.method,'GET');
});

test('BASE #5: read-only cancellation preflight has no provider POST, DELETE, wallet, credit or storage side effects',async()=>{
 let writes=0;
 const result=await inspectBytePlusVideoCancellation(operation,{key:'fixture',fetcher:async(_url,opts)=>{
  if(opts.method!=='GET')writes++;
  return mock('queued');
 }});
 assert.equal(result.canCancel,false);
 assert.equal(writes,0);
 assert.equal(Object.keys(result).sort().join(','),'canCancel,reason,status');
});
