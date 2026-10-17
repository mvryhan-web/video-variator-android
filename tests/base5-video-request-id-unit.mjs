import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {claimVideoRequestId,acknowledgeVideoRequestId} from '../app/src/main/assets/studio-video-request-id.mjs';

function storage(){const saved=new Map();return {
 saved,getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),
 removeItem:k=>saved.delete(k)
};}
const payload=()=>({kind:'video',model:'byteplus-seedance-2',prompt:'Original product photo',
 ratio:'16:9',videoDuration:5,videoResolution:'720p',references:[{mimeType:'image/png',data:'fake-private-base64'}],consent:true});
const cryptoApi=webcrypto;

test('BASE #5: first video submission stores an ID and SHA-256 digest, never source media/prompt/token',async()=>{
 const s=storage(),body=payload();
 const result=await claimVideoRequestId({payload:body,token:'private-login-token',storage:s,cryptoApi});
 assert.equal(result.reused,false);
 assert.match(result.requestId,/^[0-9a-f-]{36}$/);
 assert.equal(s.saved.size,1);
 const [key,raw]=[...s.saved.entries()][0];
 assert.match(key,/^deepsyq_video_pending_request_v1_[0-9a-f]{32}$/);
 assert.ok(!raw.includes(body.prompt)&&!raw.includes(body.references[0].data)&&
  !raw.includes('private-login-token'));
 assert.deepEqual(Object.keys(JSON.parse(raw)).sort(),['fingerprint','requestId']);
});

test('BASE #5: ambiguous lost HTTP response and page refresh reuse the SAME request ID',async()=>{
 const s=storage(),p=payload();
 const original=await claimVideoRequestId({payload:p,token:'person-A',storage:s,cryptoApi});
 const afterRefresh=await claimVideoRequestId({payload:structuredClone(p),token:'person-A',storage:s,cryptoApi});
 assert.equal(original.requestId,afterRefresh.requestId);
 assert.equal(afterRefresh.reused,true);
 assert.equal(s.saved.size,1);
});

test('BASE #5: changing prompt, refs or video settings before resolving original submission FAILS CLOSED',async()=>{
 const s=storage(),p=payload();
 const orig=await claimVideoRequestId({payload:p,token:'person-A',storage:s,cryptoApi});
 for(const changed of [
  {...p,prompt:'a different scene'},
  {...p,videoDuration:8},
  {...p,references:[{mimeType:'image/png',data:'different-photo'}]},
  {...p,model:'veo-3.1-lite-generate-preview'}
 ]){
  await assert.rejects(()=>claimVideoRequestId({payload:changed,token:'person-A',storage:s,cryptoApi}),
   /VIDEO_SUBMISSION_UNRESOLVED/);
 }
 assert.deepEqual(await claimVideoRequestId({payload:p,token:'person-A',storage:s,cryptoApi}),
  {...orig,reused:true});
});

test('BASE #5: independent authenticated users get different pending keys with no token leak',async()=>{
 const s=storage(),p=payload();
 const a=await claimVideoRequestId({payload:p,token:'account-A',storage:s,cryptoApi});
 const b=await claimVideoRequestId({payload:p,token:'account-B',storage:s,cryptoApi});
 assert.notEqual(a.key,b.key);
 assert.notEqual(a.requestId,b.requestId);
 assert.equal(s.saved.size,2);
 assert.ok([...s.saved.keys()].every(k=>!k.includes('account-')));
});

test('BASE #5: confirmed original job ID clears only the matching request, not another one',async()=>{
 const s=storage(),p=payload();
 const a=await claimVideoRequestId({payload:p,token:'account-A',storage:s,cryptoApi});
 const b=await claimVideoRequestId({payload:p,token:'account-B',storage:s,cryptoApi});
 assert.equal(acknowledgeVideoRequestId({storage:s,...a,requestId:b.requestId,jobId:'job-one'}),false);
 assert.equal(acknowledgeVideoRequestId({storage:s,...a,jobId:''}),false);
 assert.equal(s.saved.size,2);
 assert.equal(acknowledgeVideoRequestId({storage:s,...a,jobId:'original-video-job'}),true);
 assert.equal(s.saved.size,1);
 assert.equal(s.saved.has(b.key),true);
 const next=await claimVideoRequestId({payload:{...p,prompt:'new'},token:'account-A',storage:s,cryptoApi});
 assert.notEqual(next.requestId,a.requestId);
});

test('BASE #5: malformed pending record never rotates ID into a second chargeable request',async()=>{
 const s=storage(),p=payload();
 const original=await claimVideoRequestId({payload:p,token:'account-A',storage:s,cryptoApi});
 for(const raw of ['not-json','{}','{"requestId":"not-uuid","fingerprint":"f"}','x'.repeat(350)]){
  s.setItem(original.key,raw);
  await assert.rejects(()=>claimVideoRequestId({payload:p,token:'account-A',storage:s,cryptoApi}),
   /VIDEO_SUBMISSION_UNRESOLVED/);
 }
});

test('BASE #5: session storage or webcrypto failure prevents POST rather than silently choosing a fresh request ID',async()=>{
 const p=payload();
 const broken={getItem(){return null;},setItem(){throw Error('quota');}};
 await assert.rejects(()=>claimVideoRequestId({payload:p,token:'account-A',storage:broken,cryptoApi}),
  /VIDEO_SUBMISSION_SAFETY_UNAVAILABLE/);
 await assert.rejects(()=>claimVideoRequestId({payload:p,token:'',storage:storage(),cryptoApi}),
  /VIDEO_SUBMISSION_SAFETY_UNAVAILABLE/);
 await assert.rejects(()=>claimVideoRequestId({payload:p,token:'account-A',storage:storage(),cryptoApi:{}}),
  /VIDEO_SUBMISSION_SAFETY_UNAVAILABLE/);
});

test('BASE #5: non-Video request cannot enter video-only idempotency store',async()=>{
 const s=storage();
 await assert.rejects(()=>claimVideoRequestId({payload:{...payload(),kind:'image'},token:'person',storage:s,cryptoApi}),
  /VIDEO_SUBMISSION_SAFETY_UNAVAILABLE/);
 assert.equal(s.saved.size,0);
});
