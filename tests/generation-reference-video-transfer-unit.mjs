import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {createObjectStorage} from '../server/generation-storage.js';
import {createSeedanceVideoTransferPlanner,referenceVideoTransferEnabled} from '../server/generation-reference-video-transfer.js';

const now=()=>new Date('2026-10-15T18:55:00.000Z');
const ID='123e4567-e89b-42d3-a456-426614174000';
const ID2='123e4567-e89b-42d3-a456-426614174001';
const secret='STORAGE_TEST_SECRET_KEY_NOT_LIVE_12345';
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
test('future provider video plan is offline and requires trusted reinspection, owner and remaining TTL',async()=>{
 const {storage,key}=storageAndAsset(),events=[];
 const ledger={
  async get(){throw Error('NOT_USED_WHEN_INSPECTOR_INJECTED');},
  async getForVideoTransfer({userId,id}){
   events.push(['candidate',userId,id]);
   if(userId!=='owner')throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   return {key:storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id}),mime:'video/mp4',expiresAt:'2026-10-15T19:00:00Z'};
  }
 };
 const inspector={async inspect({userId,model,videoAssetIds}){events.push(['inspect',userId,model,...videoAssetIds]);return {compatible:true,reason:null};}};
 const planner=createSeedanceVideoTransferPlanner({ledger,storage,inspector,env:env()});
 const result=await planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID,ID2]});
 assert.equal(result.providerSubmitted,false);
 assert.equal(result.content.length,2);
 assert.equal(result.content[0].type,'video_url');
 assert.equal(result.content[0].role,'reference_video');
 assert.equal(new URL(result.content[0].video_url.url).searchParams.get('X-Amz-Expires'),'30');
 assert.equal(result.expiresAt,'2026-10-15T18:55:30.000Z');
 assert.deepEqual(events,[['inspect','owner','byteplus-seedance-2',ID,ID2],['candidate','owner',ID],['candidate','owner',ID2]]);
 assert.equal(result.providerRequest,undefined);assert.equal(result.submittedJob,undefined);
});
test('no media plan can bypass model, replay/duplicate IDs, reinspection or transfer flags',async()=>{
 const {storage}=storageAndAsset();
 const ledger={get:async()=>Buffer.alloc(0),getForVideoTransfer:async()=>{throw Error('NEVER') }};
 const deny={inspect:async()=>({compatible:false,reason:'REFERENCE_VIDEO_DURATION_TOTAL'})};
 const planner=createSeedanceVideoTransferPlanner({ledger,storage,inspector:deny,env:env()});
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),/REFERENCE_VIDEO_DURATION_TOTAL/);
 for(const videoAssetIds of [[],[ID,ID],['https://evil.test/secret.mp4'],[ID,ID2,ID,ID2]]){
  await assert.rejects(()=>planner.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds}),/REFERENCE_MEDIA_INVALID/);
 }
 await assert.rejects(()=>planner.prepare({userId:'owner',model:'other-model',videoAssetIds:[ID]}),/REFERENCE_MODEL_NOT_SUPPORTED/);
 const disabled=createSeedanceVideoTransferPlanner({ledger,storage,inspector:deny,env:{}});
 await assert.rejects(()=>disabled.prepare({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ID]}),/REFERENCE_VIDEO_TRANSFER_DISABLED/);
});
