import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createObjectStorage} from '../server/generation-storage.js';
import {createSeedanceVideoTransferPlanner,referenceVideoTransferEnabled} from '../server/generation-reference-video-transfer.js';

const now=()=>new Date('2026-10-15T18:55:00.000Z');
const ID='123e4567-e89b-42d3-a456-426614174000';
const ID2='123e4567-e89b-42d3-a456-426614174001';
const secret='STORAGE_TEST_SECRET_KEY_NOT_LIVE_12345';
const execFileAsync=promisify(execFile);
async function actualMp4(seconds){
 const dir=await mkdtemp(join(tmpdir(),'deepsyq-transfer-proof-'));
 try{
  const filename=join(dir,'real-reference.mp4');
  await execFileAsync('ffmpeg',['-v','error','-f','lavfi','-i',
   'color=c=blue:s=854x480:r=24','-t',String(seconds),'-c:v','libx264',
   '-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',filename],
   {timeout:25000,maxBuffer:32*1024,windowsHide:true});
  return readFile(filename);
 }finally{await rm(dir,{recursive:true,force:true});}
}
let readyMp4,tooLongMp4;
const validMp4=()=>readyMp4??=actualMp4(3);
const invalidDurationMp4=()=>tooLongMp4??=actualMp4(16);
const env=()=>({
 AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://media.example.com',
 AI_OBJECT_STORAGE_BUCKET:'deepsyq-fixture',AI_OBJECT_STORAGE_REGION:'ap-southeast-1',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'EXAMPLEKEYID',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:secret,
 AI_OBJECT_STORAGE_PREFIX:'deepsyq',
 AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',
 AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED:'true',
 AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true',
 AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:'media.example.com'
});
function storageAndAsset(e=env()){
 const storage=createObjectStorage({env:e,now});
 const key=storage.stagedReferenceKey({userId:'owner',mime:'video/mp4',assetId:ID});
 return {storage,key};
}
function independentlyComputeQuerySig(url){
 const u=new URL(url),qs=[...u.searchParams.entries()].filter(([k])=>k!=='X-Amz-Signature')
  .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
 const stamp=u.searchParams.get('X-Amz-Date'),day=stamp.slice(0,8),region='ap-southeast-1';
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const mac=(k,d)=>createHmac('sha256',k).update(d).digest();
 const scope=day+'/'+region+'/s3/aws4_request';
 const request=['GET',u.pathname,qs,'host:'+u.host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const stringToSign=['AWS4-HMAC-SHA256',stamp,scope,hash(request)].join('\n');
 const signing=mac(mac(mac(mac('AWS4'+secret,day),region),'s3'),'aws4_request');
 return createHmac('sha256',signing).update(stringToSign).digest('hex');
}
test('presigning is doubly OFF by default and cannot outlive the ledger',()=>{
 assert.equal(referenceVideoTransferEnabled({}),false);
 assert.equal(referenceVideoTransferEnabled({AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED:'true'}),false);
 const e=env(),{key}=storageAndAsset(e);
 for(const setting of ['AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED','AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED']){
  const variant={...e,[setting]:'false'};
  const storage=createObjectStorage({env:variant,now});
  assert.throws(()=>storage.presignStagedReferenceRead({userId:'owner',key,expiresAt:'2026-10-15T19:00:00Z'}),/REFERENCE_VIDEO_TRANSFER_DISABLED/);
 }
 const storage=createObjectStorage({env:e,now});
 assert.throws(()=>storage.presignStagedReferenceRead({userId:'owner',key,expiresAt:'2026-10-15T18:56:00Z',seconds:60}),/REFERENCE_VIDEO_URL_EXPIRES_TOO_LATE/);
 assert.throws(()=>storage.presignStagedReferenceRead({userId:'owner',key,expiresAt:'2026-10-15T19:00:00Z',seconds:600}),/REFERENCE_VIDEO_URL_TTL_INVALID/);
});
test('signed GET uses SigV4 query authentication with exact host, owner path, TTL and no network',()=>{
 let requests=0;const e=env();
 const storage=createObjectStorage({env:e,now,fetcher:async()=>{requests++;throw Error('NO_NETWORK_PERMITTED');}});
 const key=storage.stagedReferenceKey({userId:'owner',mime:'video/mp4',assetId:ID});
 const r=storage.presignStagedReferenceRead({userId:'owner',key,expiresAt:'2026-10-15T19:00:00.000Z',seconds:30});
 const u=new URL(r.url);
 assert.equal(u.host,'media.example.com');assert.equal(u.protocol,'https:');
 assert.equal(u.searchParams.get('X-Amz-Algorithm'),'AWS4-HMAC-SHA256');
 assert.equal(u.searchParams.get('X-Amz-Expires'),'30');
 assert.equal(u.searchParams.get('X-Amz-SignedHeaders'),'host');
 assert.equal(u.searchParams.get('X-Amz-Date'),'20261015T185500Z');
 assert.equal(u.searchParams.get('X-Amz-Signature'),independentlyComputeQuerySig(r.url));
 assert.equal(r.expiresAt,'2026-10-15T18:55:30.000Z');
 assert.ok(u.pathname.includes('/references/users/'));
 assert.ok(!u.pathname.includes('owner'),'object path must not expose user ID');
 assert.equal(u.pathname.includes('%2F'),false);
 assert.equal(r.url.includes(secret),false);
 assert.equal(requests,0,'presigning cannot fetch or publish media');
});
test('unapproved/private/IP/wildcard/extra-port hostnames fail closed',()=>{
 const variants=[
  {AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:'elsewhere.example.com'},
  {AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:'*.example.com'},
  {AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:'media.example.com,elsewhere.example.com'},
  {AI_OBJECT_STORAGE_ENDPOINT:'https://127.0.0.1'},
  {AI_OBJECT_STORAGE_ENDPOINT:'https://media.example.local',AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:'media.example.local'},
  {AI_OBJECT_STORAGE_ENDPOINT:'https://media.example.com:8443'}
 ];
 const {key}=storageAndAsset();
 for(const change of variants){
  const e={...env(),...change};
  const storage=createObjectStorage({env:e,now});
  assert.throws(()=>storage.presignStagedReferenceRead({userId:'owner',key,expiresAt:'2026-10-15T19:00:00Z'}),/REFERENCE_PROVIDER_FETCH_HOST_NOT_APPROVED/);
 }
});
test('another owner, spoofed extension or arbitrary S3 key cannot be presigned',()=>{
 const {storage,key}=storageAndAsset();
 for(const other of [
  {userId:'mallory',key},
  {userId:'owner',key:key.replace('.mp4','.wav')},
  {userId:'owner',key:'deepsyq/users/owner/public.mp4'},
  {userId:'owner',key:key.replace(ID,'../../secret')}
 ]){
  assert.throws(()=>storage.presignStagedReferenceRead({...other,expiresAt:'2026-10-15T19:00:00Z'}),/REFERENCE_MEDIA_ACCESS_DENIED|REFERENCE_MEDIA_INVALID/);
 }
});
test('video planning always reads owner-scoped actual MP4 bytes and runs real ffprobe before presigning',async()=>{
 const {storage}=storageAndAsset(),events=[],bytes=await validMp4();
 const ledger={
  async get({userId,id}){
   events.push(['get',userId,id]);
   if(userId!=='owner')throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   return bytes;
  },
  async getForVideoTransfer({userId,id}){
   events.push(['candidate',userId,id]);
   if(userId!=='owner')throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   return {key:storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id}),
    mime:'video/mp4',expiresAt:'2026-10-15T19:00:00Z'};
  }
 };
 let forgeryCalled=false;
 // Deliberate extra property must be IGNORED, not trusted.
 const inspector={async inspect(){forgeryCalled=true;return {compatible:false,reason:'FORGED'};}};
 const planner=createSeedanceVideoTransferPlanner({ledger,storage,inspector,env:env()});
 const result=await planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID,ID2]});
 assert.equal(forgeryCalled,false,'planner must never consult injected inspector');
 assert.equal(result.providerSubmitted,false);
 assert.equal(result.content.length,2);
 assert.equal(result.content[0].type,'video_url');
 assert.equal(result.content[0].role,'reference_video');
 assert.equal(new URL(result.content[0].video_url.url).searchParams.get('X-Amz-Expires'),'30');
 assert.equal(result.expiresAt,'2026-10-15T18:55:30.000Z');
 assert.deepEqual(events,[
  ['get','owner',ID],['get','owner',ID2],
  ['candidate','owner',ID],['get','owner',ID],
  ['candidate','owner',ID2],['get','owner',ID2]
 ]);
 assert.equal(result.providerRequest,undefined);
 assert.equal(result.submittedJob,undefined);
});
test('fake compatible verdict cannot bypass malformed or incompatible video bytes',async()=>{
 const {storage}=storageAndAsset();
 let candidateReads=0,inspectOverrideCalls=0,signedCount=0;
 const ledger={
  async get(){return Buffer.from('not a real MP4 file');},
  async getForVideoTransfer(){candidateReads++;throw Error('SHOULD_NOT_READ_CANDIDATE');}
 };
 const planner=createSeedanceVideoTransferPlanner({
  ledger,storage:{presignStagedReferenceRead(){signedCount++;throw Error('SHOULD_NOT_SIGN');}},
  inspector:{async inspect(){inspectOverrideCalls++;return {compatible:true};}},
  env:env()
 });
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),
  /REFERENCE_MEDIA_INVALID/);
 assert.equal(inspectOverrideCalls,0);
 assert.equal(candidateReads,0);
 assert.equal(signedCount,0);
});
test('real ffprobe metadata incompatible with Seedance duration refuses signed video URL',async()=>{
 const {storage}=storageAndAsset(),bytes=await invalidDurationMp4();
 let candidates=0;
 const planner=createSeedanceVideoTransferPlanner({
  ledger:{
   async get(){return bytes;},
   async getForVideoTransfer(){candidates++;throw Error('NEVER_SIGN');}
  },storage,env:env()
 });
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),
  /REFERENCE_VIDEO_INCOMPATIBLE/);
 assert.equal(candidates,0);
});
test('no video plan can bypass model, duplicate IDs, actual reinspection or transfer flags',async()=>{
 const {storage}=storageAndAsset();
 let reads=0;
 const ledger={
  async get(){reads++;return Buffer.alloc(0);},
  async getForVideoTransfer(){throw Error('NEVER_SIGN');}
 };
 const planner=createSeedanceVideoTransferPlanner({ledger,storage,env:env()});
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),
  /REFERENCE_MEDIA_INVALID/);
 for(const videoAssetIds of [[],[ID,ID],['https://evil.test/secret.mp4'],[ID,ID2,ID,ID2]]){
  await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds}),
   /REFERENCE_MEDIA_INVALID/);
 }
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'other-model',videoAssetIds:[ID]}),
  /REFERENCE_MODEL_NOT_SUPPORTED/);
 assert.equal(reads,1,'invalid requests should not run ffprobe or touch stored media');
 const disabled=createSeedanceVideoTransferPlanner({ledger,storage,env:{}});
 await assert.rejects(()=>disabled.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),
  /REFERENCE_VIDEO_TRANSFER_DISABLED/);
 assert.equal(reads,1);
});

test('all owner DB lookups finish before first 30-second link is minted',async()=>{
 const bytes=await validMp4(),actualStorage=storageAndAsset().storage;
 let secondLookupStarted,continueSecondLookup;
 const waiting=new Promise(resolve=>{secondLookupStarted=resolve;});
 const gate=new Promise(resolve=>{continueSecondLookup=resolve;});
 const events=[];
 const ledger={
  async get({id}){events.push('inspect:'+id);return bytes;},
  async getForVideoTransfer({userId,id}){
   events.push('candidate:'+id);
   if(id===ID2){secondLookupStarted();await gate;}
   return {mime:'video/mp4',expiresAt:'2026-10-15T19:00:00Z',
    key:actualStorage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id})};
  }
 };
 const storage={
  presignStagedReferenceRead(input){
   events.push('sign:'+input.key.slice(-40,-4));
   return actualStorage.presignStagedReferenceRead(input);
  }
 };
 const pending=createSeedanceVideoTransferPlanner({ledger,storage,env:env()})
  .prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID,ID2]});
 try{
  await Promise.race([waiting,new Promise((_,reject)=>setTimeout(()=>reject(Error('second candidate did not start')),10000))]);
  assert.equal(events.some(x=>x.startsWith('sign:')),false,
   'no signed bearer URL may be issued before final candidate lookup finishes');
 }finally{continueSecondLookup();}
 const result=await pending;
 assert.equal(result.content.length,2);
 assert.deepEqual(events.slice(0,6),[
  'inspect:'+ID,'inspect:'+ID2,
  'candidate:'+ID,'inspect:'+ID,'candidate:'+ID2,'inspect:'+ID2
 ]);
 assert.equal(events.filter(x=>x.startsWith('sign:')).length,2);
});
test('late rejected owner candidate mints zero links, even if previous candidates were valid',async()=>{
 const bytes=await validMp4();let signingCalls=0;
 const ledger={
  async get(){return bytes;},
  async getForVideoTransfer({id}){
   if(id===ID2)throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   return {mime:'video/mp4',key:'unused',expiresAt:'2026-10-15T19:00:00Z'};
  }
 };
 const planner=createSeedanceVideoTransferPlanner({
  ledger,
  storage:{presignStagedReferenceRead(){signingCalls++;throw Error('NEVER_SIGN');}},
  env:env()
 });
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID,ID2]}),
  /REFERENCE_MEDIA_ACCESS_DENIED/);
 assert.equal(signingCalls,0);
});
test('an invalid link expiry is rejected, never returned as a transfer plan',async()=>{
 const bytes=await validMp4(),storage=storageAndAsset().storage;
 const ledger={
  async get(){return bytes;},
  async getForVideoTransfer({userId,id}){
   return {mime:'video/mp4',key:storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id}),
    expiresAt:'2026-10-15T19:00:00Z'};
  }
 };
 const planner=createSeedanceVideoTransferPlanner({ledger,env:env(),storage:{
  presignStagedReferenceRead:()=>({url:'https://media.example.com/fixture',expiresAt:'not-a-date'})
 }});
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),
  /REFERENCE_VIDEO_URL_UNAVAILABLE/);
});

test('rewritten private MP4 after trusted FFprobe blocks ALL temporary S3 URLs',async()=>{
 const approved=await validMp4(),rewritten=Buffer.from(approved);
 rewritten[rewritten.length-1]^=0x01;
 let reads=0,lookup=0,signed=0;
 const ledger={
  async get(){
   reads++;
   return reads===1?approved:rewritten;
  },
  async getForVideoTransfer({userId,id}){
   lookup++;
   return {key:storageAndAsset().storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id}),
    mime:'video/mp4',expiresAt:'2026-10-15T19:00:00Z'};
  }
 };
 const planner=createSeedanceVideoTransferPlanner({ledger,env:env(),
  storage:{presignStagedReferenceRead(){signed++;throw Error('NEVER_SIGN');}}});
 await assert.rejects(
  ()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),
  /REFERENCE_VIDEO_CONTENT_CHANGED/
 );
 assert.equal(reads,2,'must actually re-fetch object before signing');
 assert.equal(lookup,1);
 assert.equal(signed,0,'no bearer link minted for rewritten object');
});

test('change in second inspected private MP4 prevents URLs for either asset',async()=>{
 const original=await validMp4(),changed=Buffer.from(original);
 changed[changed.length-1]^=0x01;
 let secondReads=0,signs=0;
 const ledger={
  async get({id}){
   if(id===ID2){secondReads++;return secondReads===1?original:changed;}
   return original;
  },
  async getForVideoTransfer({userId,id}){
   return {key:storageAndAsset().storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id}),
    mime:'video/mp4',expiresAt:'2026-10-15T19:00:00Z'};
  }
 };
 const planner=createSeedanceVideoTransferPlanner({ledger,env:env(),storage:{
  presignStagedReferenceRead(){signs++;throw Error('NEVER_SIGN');}
 }});
 await assert.rejects(
  ()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID,ID2]}),
  /REFERENCE_VIDEO_CONTENT_CHANGED/
 );
 assert.equal(secondReads,2);
 assert.equal(signs,0,'batch must fail before any link signing');
});

test('video asset ID input is snapshotted and cannot be mutated during async inspection',async()=>{
 const original=await validMp4(),ids=[ID],seen=[];
 let unblock,signal;
 const gate=new Promise(resolve=>{unblock=resolve;});
 const entered=new Promise(resolve=>{signal=resolve;});
 const ledger={
  async get({id}){
   seen.push(['read',id]);if(seen.length===1){signal();await gate;}
   return original;
  },
  async getForVideoTransfer({userId,id}){
   seen.push(['candidate',id]);
   return {mime:'video/mp4',expiresAt:'2026-10-15T19:00:00Z',
    key:storageAndAsset().storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id})};
  }
 };
 const planner=createSeedanceVideoTransferPlanner({ledger,storage:storageAndAsset().storage,env:env()});
 const pending=planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:ids});
 try{
  await Promise.race([entered,new Promise((_,reject)=>setTimeout(()=>reject(Error('ledger never started')),10000))]);
  ids[0]=ID2;
  ids.push(ID2);
 }finally{unblock();}
 const result=await pending;
 assert.equal(result.content.length,1);
 assert.deepEqual(seen,[['read',ID],['candidate',ID],['read',ID]]);
});
