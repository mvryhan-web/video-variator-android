import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelQueuedBytePlusVideo} from '../server/generation-video-cancel.js';

const response=(status,code=200)=>new Response(code===204?null:(status===null?'':JSON.stringify({status})),{
 status:code,headers:{'content-type':'application/json'}
});
const task='byteplus:cgt_2026-10-17_queued';

test('BASE #5: only a provider-confirmed queued cancellation is eligible for later settlement',async()=>{
 const calls=[],responses=[response('queued'),response(null,204),response('cancelled')];
 const fetcher=async(url,opts)=>{calls.push({url,opts});return responses.shift();};
 const result=await cancelQueuedBytePlusVideo(task,{key:'synthetic-key',fetcher});
 assert.deepEqual(result,{confirmed:true,status:'cancelled'});
 assert.deepEqual(calls.map(x=>x.opts.method),['GET','DELETE','GET']);
 assert.equal(calls.every(x=>x.url==='https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/cgt_2026-10-17_queued'),true);
 assert.equal(calls.every(x=>x.opts.redirect==='error'),true);
 assert.equal(calls.every(x=>x.opts.headers.Authorization==='Bearer synthetic-key'),true);
 assert.equal(calls.filter(x=>x.opts.method==='POST').length,0);
});

test('BASE #5: never delete running, succeeded, failed, expired, or already cancelled BytePlus records',async()=>{
 for(const status of ['running','succeeded','failed','expired','cancelled']){
  const calls=[];
  const result=await cancelQueuedBytePlusVideo(task,{key:'fixture',fetcher:async(_url,opt)=>{
   calls.push(opt.method);return response(status);
  }});
  assert.deepEqual(result,{confirmed:false,reason:'PROVIDER_NOT_QUEUED'});
  assert.deepEqual(calls,['GET']);
 }
});

test('BASE #5: provider race rejects queued DELETE and never reports cancellation proof',async()=>{
 const calls=[],responses=[response('queued'),response('running',409)];
 const result=await cancelQueuedBytePlusVideo(task,{key:'fixture',fetcher:async(_url,opt)=>{
  calls.push(opt.method);return responses.shift();
 }});
 assert.deepEqual(result,{confirmed:false,reason:'CANCEL_NOT_ACCEPTED'});
 assert.deepEqual(calls,['GET','DELETE']);
});

test('BASE #5: a DELETE 2xx does not prove cancellation without fresh GET confirmation',async()=>{
 for(const status of ['queued','running','succeeded','failed']){
  const replies=[response('queued'),response(null,204),response(status)];
  const result=await cancelQueuedBytePlusVideo(task,{key:'fixture',fetcher:async()=>replies.shift()});
  assert.deepEqual(result,{confirmed:false,reason:'CANCEL_NOT_CONFIRMED'});
 }
});

test('BASE #5: invalid task identifiers and missing credentials are rejected before any network',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('NETWORK_MUST_NOT_RUN');};
 for(const op of ['byteplus:../anything','byteplus:cgt/other','byteplus:', 'operations/something',
  'byteplus:cgt?token=secret','byteplus:'+('x'.repeat(161)),null])
  await assert.rejects(()=>cancelQueuedBytePlusVideo(op,{key:'fixture',fetcher}),/INVALID_OPERATION/);
 await assert.rejects(()=>cancelQueuedBytePlusVideo(task,{key:'',fetcher}),/PROVIDER_KEY_REQUIRED/);
 assert.equal(calls,0);
});

test('BASE #5: unknown first provider status or malformed body never attempts destructive DELETE',async()=>{
 const bad=[response(null,502),new Response('<html>oops</html>'),response('other'),
  new Response(JSON.stringify({status:'queued',extra:'x'.repeat(70000)}))];
 for(const r of bad){
  let count=0;
  await assert.rejects(()=>cancelQueuedBytePlusVideo(task,{key:'fixture',fetcher:async()=>{
   count++;if(count>1)throw Error('UNEXPECTED_DELETE');return r;
  }}),/CANCEL_STATUS_UNVERIFIED/);
  assert.equal(count,1);
 }
});

test('BASE #5: verification GET errors fail closed after accepted DELETE (no refund proof)',async()=>{
 const replies=[response('queued'),response(null,204),response(null,404)];
 await assert.rejects(()=>cancelQueuedBytePlusVideo(task,{key:'fixture',fetcher:async()=>replies.shift()}),/CANCEL_STATUS_UNVERIFIED/);
});
