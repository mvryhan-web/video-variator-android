// BASE Video — actual S3 protocol acceptance against an EPHEMERAL, local MinIO.
// Never point this at Render, a customer's bucket or a real production endpoint.
// The only supported URL is the CI loopback MinIO on port 9000.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createObjectStorage} from '../server/generation-storage.js';

const minio=process.env.AI_TEST_MINIO_URL||'';
const permitted=minio==='http://127.0.0.1:9000';
const keyId='DEEPSYQ_CI_KEY_12345';
const secret='deepsyq-CI-isolated-minio-secret-long-only';
const host='media.example.com';
const region='us-east-1';
const bucket='deepsyq-ci-'+randomUUID().replaceAll('-','').slice(0,20);
const prefix='ci-only';
const hash=b=>createHash('sha256').update(b).digest('hex');
const mac=(key,b)=>createHmac('sha256',key).update(b).digest();
const signingKey=(day)=>{
 const date=mac('AWS4'+secret,day);
 return mac(mac(mac(date,region),'s3'),'aws4_request');
};
function signedBucketRequest(method,path){
 const stamp=new Date().toISOString().replace(/[:-]|\.\d{3}/g,'');
 const day=stamp.slice(0,8),payload=hash(Buffer.alloc(0));
 const canonicalHeaders='host:'+host+'\n'+'x-amz-content-sha256:'+payload+'\n'+'x-amz-date:'+stamp+'\n';
 const names='host;x-amz-content-sha256;x-amz-date';
 const canonical=[method,path,'',canonicalHeaders,names,payload].join('\n');
 const scope=day+'/'+region+'/s3/aws4_request';
 const toSign=['AWS4-HMAC-SHA256',stamp,scope,hash(canonical)].join('\n');
 const signature=createHmac('sha256',signingKey(day)).update(toSign).digest('hex');
 return {'Host':host,'x-amz-content-sha256':payload,'x-amz-date':stamp,
  Authorization:'AWS4-HMAC-SHA256 Credential='+keyId+'/'+scope+
   ', SignedHeaders='+names+', Signature='+signature};
}
const storageEnv=()=>({
 AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://'+host,
 AI_OBJECT_STORAGE_BUCKET:bucket,AI_OBJECT_STORAGE_REGION:region,
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:keyId,AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:secret,
 AI_OBJECT_STORAGE_PREFIX:prefix,
 AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',
 AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',
 AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED:'true',
 AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true',
 AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:host
});
async function local(method,path,{headers={},body}={}){
 return fetch(minio+path,{method,headers:{Host:host,...headers},
  redirect:'error',signal:AbortSignal.timeout(10000),...(body?{body}:{})});
}
function proxyFetch(url,options){
 const u=new URL(url);
 assert.equal(u.origin,'https://'+host,'never fetch an external domain');
 assert.ok(u.pathname.startsWith('/'+bucket+'/'),'never call outside test bucket');
 return local(options.method,u.pathname+u.search,{headers:options.headers,body:options.body});
}
async function makeMp4(){
 const dir=await mkdtemp(join(tmpdir(),'deepsyq-minio-mp4-'));
 try{
  const file=join(dir,'sample.mp4');
  const result=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i',
   'color=c=blue:s=854x480:r=24','-t','3','-c:v','libx264','-pix_fmt','yuv420p',
   '-movflags','+faststart','-an','-y',file],{timeout:20000,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||'fixture MP4 generation failed');
  return await readFile(file);
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('real MinIO accepts correctly signed private GET, then denies forgery, expiry and deletion',async t=>{
 if(!minio){t.skip('AI_TEST_MINIO_URL was not set; external storage is never contacted');return;}
 assert.equal(permitted,true,'REFUSE any non-local S3 URL');
 const bpath='/'+bucket;
 const create=await local('PUT',bpath,{headers:signedBucketRequest('PUT',bpath)});
 assert.ok([200,201].includes(create.status),'local MinIO CreateBucket: '+create.status+' '+(await create.text()).slice(0,350));
 const env=storageEnv(),owner='fixture-owner',id=randomUUID(),bytes=await makeMp4();
 const store=createObjectStorage({env,fetcher:proxyFetch});
 const now=new Date();
 const expiresAt=new Date(now.getTime()+5*60000);
 const getKey=store.stagedReferenceKey({userId:owner,mime:'video/mp4',assetId:id});
 try{
  // A genuine MinIO independently verifies our SigV4 Authorization on PUT/GET/DELETE.
  const actual=await store.putStagedReference({userId:owner,mime:'video/mp4',assetId:id,bytes});
  assert.equal(actual.key,getKey);
  const privateRead=await store.getStagedReference({userId:owner,mime:'video/mp4',key:getKey});
  assert.deepEqual(privateRead,bytes);
  const link=store.presignStagedReferenceRead({userId:owner,key:getKey,
   expiresAt,seconds:30});
  const u=new URL(link.url);
  assert.equal(u.origin,'https://'+host);
  assert.equal(u.searchParams.get('X-Amz-Expires'),'30');

  // A true S3 server, not our own HMAC test helper, authenticates GET.
  const good=await local('GET',u.pathname+u.search);
  assert.equal(good.status,200,'MinIO must accept the query signature: '+good.status+' '+(await good.clone().text()).slice(0,350));
  assert.deepEqual(Buffer.from(await good.arrayBuffer()),bytes);

  const forged=new URL(link.url);
  forged.searchParams.set('X-Amz-Expires','60');
  const tampered=await local('GET',forged.pathname+forged.search);
  assert.equal(tampered.status,403,'altered expiry must invalidate query signature');

  const withoutSignature=new URL(link.url);
  withoutSignature.searchParams.delete('X-Amz-Signature');
  const unsigned=await local('GET',withoutSignature.pathname+withoutSignature.search);
  assert.equal(unsigned.status,403,'unauthenticated object access must remain private');

  const oldStore=createObjectStorage({env,now:()=>new Date(Date.now()-120000)});
  const expired=oldStore.presignStagedReferenceRead({userId:owner,key:getKey,
   expiresAt,seconds:30});
  const eu=new URL(expired.url);
  const expiredResponse=await local('GET',eu.pathname+eu.search);
  assert.equal(expiredResponse.status,403,'expired signed links must not be usable');
  await store.deleteStagedReference({userId:owner,key:getKey});
  const deleted=await local('GET',u.pathname+u.search);
  assert.equal(deleted.status,404,'deleting the object must revoke media availability');
 }finally{
  await store.deleteStagedReference({userId:owner,key:getKey}).catch(()=>{});
  // Delete only the unique ephemeral bucket created by this test.
  const gone=await local('DELETE',bpath,{headers:signedBucketRequest('DELETE',bpath)});
  assert.equal(gone.status,204,'remove ephemeral bucket after cleanup');
 }
});
