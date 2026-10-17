import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {claimVideoRequestId,acknowledgeVideoRequestId,releaseRejectedVideoRequestId,videoOwnerScopeFromClaim,videoResumeScopeMatches} from '../app/src/main/assets/studio-video-request-id.mjs';

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

test('BASE #5: saved Video job-owner scope is token-hash only and rejects a changed account',async()=>{
 const shared=storage(),original=await claimVideoRequestId({
  payload:payload(),token:'private-login-token',storage:shared,cryptoApi
 });
 const scope=videoOwnerScopeFromClaim(original);
 assert.match(scope,/^[0-9a-f]{32}$/);
 assert.ok(!scope.includes('private-login-token'));
 assert.equal(videoResumeScopeMatches(scope,'deepsyq_video_draft_v1_'+scope),true);
 const changed=await claimVideoRequestId({
  payload:payload(),token:'different-account',storage:shared,cryptoApi
 });
 const newScope=videoOwnerScopeFromClaim(changed);
 assert.notEqual(scope,newScope);
 assert.equal(videoResumeScopeMatches(scope,'deepsyq_video_draft_v1_'+newScope),false);
 assert.equal(videoResumeScopeMatches(scope,null),false);
});

test('BASE #5: corrupted saved Video scope fails closed while old unscoped session uses authenticated GET',()=>{
 assert.equal(videoResumeScopeMatches('invalid','deepsyq_video_draft_v1_invalid'),false);
 assert.equal(videoResumeScopeMatches('f'.repeat(32),'wrong-prefix'+('f'.repeat(32))),false);
 assert.equal(videoResumeScopeMatches(null,'deepsyq_video_draft_v1_'+('f'.repeat(32))),true);
 assert.throws(()=>videoOwnerScopeFromClaim({key:'unsafe-path'}),/VIDEO_SUBMISSION_SAFETY_UNAVAILABLE/);
});

async function videoWatcherHarness({jobState='processing',switchAfter='wait'}={}){
 const source=await readFile(new URL('../app/src/main/assets/generate-studio.js',import.meta.url),'utf8');
 const start=source.indexOf('async function watch(id,epoch,videoAccountToken=null){');
 const stop=source.indexOf("$('backgroundVideo').onclick=",start);
 assert.ok(start>=0&&stop>start,'Find exact Video watcher from current Studio source');
 const body=source.slice(start,stop);
 let account='original',reads=0,cleared=0,availabilityCalls=0;
 const current={getItem:()=>account};
 const api=async path=>{
  reads++;
  if(path.endsWith('/media')){
   if(switchAfter==='media')account='second-user';
   return {blob:async()=>new Blob(['fake-video'],{type:'video/mp4'})};
  }
  if(jobState==='ready')return {json:async()=>({
   id:'job-1',kind:'video',status:'ready',mime:'video/mp4'
  })};
  return {json:async()=>({id:'job-1',kind:'video',status:'processing',retryAfterSeconds:3})};
 };
 const immediate=(cb)=>{if(switchAfter==='wait')account='second-user';cb();};
 const fn=new Function('api','localStorage','availability','generation','setTimeout','clearResult',
   'let activeVideoWatchId=null;'+body+';return watch;')(
    api,current,()=>{availabilityCalls++},42,immediate,()=>{cleared++});
 let rejection;
 try{await fn('job-1',42,'original');}catch(e){rejection=e;}
 return {rejection,reads,cleared,availabilityCalls};
}

test('BASE #5: active Video watcher stops before polling twice after account changes',async()=>{
 const result=await videoWatcherHarness({switchAfter:'wait'});
 assert.equal(result.rejection?.message,'VIDEO_ACCOUNT_CHANGED');
 assert.equal(result.reads,1);
 assert.equal(result.cleared,0);
});

test('BASE #5: authenticated Video media response cannot be shown after account changed during download',async()=>{
 const result=await videoWatcherHarness({jobState:'ready',switchAfter:'media'});
 assert.equal(result.rejection?.message,'VIDEO_ACCOUNT_CHANGED');
 assert.equal(result.reads,2);
 assert.equal(result.cleared,0);
});


test('BASE #5: rejected video input frees only definitively pre-dispatch-invalid request IDs',async()=>{
 for(const code of ['INVALID_VIDEO_REFERENCES','UNSUPPORTED_VIDEO_RESOLUTION',
   'UNSUPPORTED_VIDEO_DURATION','UNSUPPORTED_VIDEO_SETTINGS','UNSUPPORTED_VIDEO_INPUT_MODE',
   'INVALID_REQUEST','INVALID_REFERENCES','UNSUPPORTED_VIDEO_CONTROL']){
  const s=storage(),p=payload(),old=await claimVideoRequestId({payload:p,token:'user-A',storage:s,cryptoApi});
  assert.equal(releaseRejectedVideoRequestId({storage:s,...old,errorCode:code}),true);
  assert.equal(s.saved.size,0);
  const revised=await claimVideoRequestId({payload:{...p,prompt:'corrected input'},token:'user-A',storage:s,cryptoApi});
  assert.notEqual(revised.requestId,old.requestId);
 }
});

test('BASE #5: ambiguous provider/DB/status, rate limits and conflicts preserve original request ID',async()=>{
 const s=storage(),p=payload(),claim=await claimVideoRequestId({payload:p,token:'user-A',storage:s,cryptoApi});
 for(const code of ['AI_PROVIDER_TIMEOUT','STUDIO_STORAGE_UNAVAILABLE',
  'STATUS_UNKNOWN_NO_AUTOMATIC_RETRY','REQUEST_FAILED','AI_PRICING_NOT_APPROVED',
  'GENERATION_REQUEST_CONFLICT','AI_RATE_LIMIT','AI_WALLET_UNAVAILABLE','VALIDATION_ERROR',
  undefined,'']){
  assert.equal(releaseRejectedVideoRequestId({storage:s,...claim,errorCode:code}),false);
  assert.equal(s.saved.size,1);
  const same=await claimVideoRequestId({payload:p,token:'user-A',storage:s,cryptoApi});
  assert.equal(same.requestId,claim.requestId);
 }
 assert.equal(releaseRejectedVideoRequestId({storage:s,key:claim.key,requestId:'00000000-0000-4000-8000-000000000000',errorCode:'INVALID_REFERENCES'}),false);
 assert.equal(s.saved.size,1);
});
