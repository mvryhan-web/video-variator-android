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
import {request as httpRequest} from 'node:http';
import {createObjectStorage} from '../server/generation-storage.js';
import {createGenerationReferenceLedger} from '../server/generation-reference-ledger.js';
import pg from 'pg';

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
 AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',AI_STUDIO_REFERENCE_TTL_MINUTES:'5',
 AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',
 AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED:'true',
 AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true',
 AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:host
});
async function local(method,path,{headers={},body}={}){
 // A real S3 signature authenticates the original Host, not the loopback host.
 assert.equal(minio,'http://127.0.0.1:9000');
 assert.ok(path.startsWith('/'+bucket),'request must stay inside unique ephemeral bucket');
 return new Promise((resolve,reject)=>{
  const req=httpRequest({hostname:'127.0.0.1',port:9000,method,path,
    headers:{...headers,Host:host,...(Buffer.isBuffer(body)?{'Content-Length':String(body.length)}:{})},
    signal:AbortSignal.timeout(10000)},res=>{
    const chunks=[];
    res.on('data',piece=>chunks.push(piece));
    res.on('error',reject);
    res.on('end',()=>{
     const bytes=Buffer.concat(chunks);
     resolve(new Response(bytes.length?bytes:null,{status:res.statusCode,headers:res.headers}));
    });
  });
  req.on('error',reject);
  if(body)req.write(body);
  req.end();
 });
}
async function proxyFetch(url,options){
 const u=new URL(url);
 assert.equal(u.origin,'https://'+host,'never fetch an external domain');
 assert.ok(u.pathname.startsWith('/'+bucket+'/'),'never call outside test bucket');
 const r=await local(options.method,u.pathname+u.search,{headers:options.headers,body:options.body});
 if(!r.ok){
  // Print only sanitized HTTP status and XML error code; never any bearer URL,
  // S3 object key, raw server XML, Authorization header or fixture credentials.
  const body=await r.clone().text();
  const code=/<Code>([A-Za-z0-9_-]{1,70})<\/Code>/.exec(body)?.[1]||'UNKNOWN';
  throw Error('MINIO_TEST_'+options.method+'_HTTP_'+r.status+'_'+code);
 }
 return r;
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
  // Never echo raw S3 XML into CI logs: it can reveal object paths and signed query details.
  assert.equal(good.status,200,'MinIO must accept authorized SigV4 GET (HTTP '+good.status+')');
  assert.deepEqual(Buffer.from(await good.arrayBuffer()),bytes);

  // Missing-signature access is tested below on the same exact signed object
  // path. Avoid a second anonymous request that older MinIO builds sometimes
  // terminate with ECONNRESET, obscuring the deterministic 400/403 denial.
  const forged=new URL(link.url);
  forged.searchParams.set('X-Amz-Expires','60');
  const tampered=await local('GET',forged.pathname+forged.search);
  assert.equal(tampered.status,403,'altered expiry must invalidate query signature');

  const withoutSignature=new URL(link.url);
  withoutSignature.searchParams.delete('X-Amz-Signature');
  const unsigned=await local('GET',withoutSignature.pathname+withoutSignature.search);
  assert.ok([400,403].includes(unsigned.status),'malformed/unsigned requests must not return media');

  const oldStore=createObjectStorage({env,now:()=>new Date(Date.now()-120000)});
  const expired=oldStore.presignStagedReferenceRead({userId:owner,key:getKey,
   expiresAt,seconds:30});
  const eu=new URL(expired.url);
  const expiredResponse=await local('GET',eu.pathname+eu.search);
  assert.equal(expiredResponse.status,403,'expired signed links must not be usable');
  await store.deleteStagedReference({userId:owner,key:getKey});
  const deleted=await local('GET',u.pathname+u.search);
  await t.test('BASE #11: real private MinIO generated output verifies bytes, detects tamper and supports legacy read',async()=>{
   // Real S3-compatible PUT/GET, but ONLY against this disposable loopback
   // bucket. No paid storage, external endpoint or provider generation.
   const jobId=randomUUID(),media=Buffer.from(bytes);
   const asset=await store.putGeneration({userId:owner,jobId,mime:'video/mp4',bytes:media});
   assert.equal(asset.sha256,hash(media));
   assert.equal(asset.mime,'video/mp4');
   try{
    assert.deepEqual(await store.get(asset.key,{expectedSha256:asset.sha256}),media);
    const changed=Buffer.concat([media,Buffer.from([0])]);
    // Independently overwrite the same key with changed bytes, keeping the
    // original recorded digest: the protected read must fail closed.
    await store.putGeneration({userId:owner,jobId,mime:'video/mp4',bytes:changed});
    await assert.rejects(()=>store.get(asset.key,{expectedSha256:asset.sha256}),/OBJECT_STORAGE_CHECKSUM_MISMATCH/);
    assert.deepEqual(await store.get(asset.key),changed); // digestless legacy mode, not verified
   }finally{await store.delete(asset.key);}
  });
  await t.test('real PostgreSQL reference ledger expires and deletes real MinIO object with intake OFF',async()=>{
   const database=process.env.AI_TEST_DATABASE_URL||'';
   const dbUrl=new URL(database);
   assert.equal(dbUrl.protocol,'postgres:');
   assert.ok(['127.0.0.1','localhost'].includes(dbUrl.hostname),'no external database');
   assert.equal(dbUrl.pathname,'/vv_ai_test','refuse production database');
   const schema='ref_s3_ci_'+randomUUID().replaceAll('-','');
   const admin=new pg.Pool({connectionString:database});
   let pool,stagedKey;
   try{
    await admin.query('CREATE SCHEMA '+schema);
    pool=new pg.Pool({connectionString:database,options:'-c search_path='+schema});
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path,schema);
    const migration=await readFile(new URL('../server/migrations/20261015-generation-reference-assets.sql',import.meta.url),'utf8');
    await pool.query(migration);
    const ledger=createGenerationReferenceLedger({pool,storage:store,env,maxActiveUploads:2});
    const staged=await ledger.stage({userId:owner,mime:'video/mp4',bytes});
    stagedKey=store.stagedReferenceKey({userId:owner,mime:'video/mp4',assetId:staged.id});
    assert.equal(staged.mime,'video/mp4');
    assert.deepEqual(await ledger.get({userId:owner,id:staged.id}),bytes);
    await assert.rejects(()=>ledger.get({userId:'different-owner',id:staged.id}),/REFERENCE_MEDIA_ACCESS_DENIED/);
    const candidate=await ledger.getForVideoTransfer({userId:owner,id:staged.id});
    assert.equal(candidate.key,stagedKey);
    const rows=(await pool.query('SELECT COUNT(*)::int AS n FROM vv_generation_reference_assets')).rows[0].n;
    assert.equal(rows,1);
    // Preserve the real DB CHECK (expires_at > created_at) when simulating expiry.
    await pool.query("UPDATE vv_generation_reference_assets SET created_at=NOW()-INTERVAL '1 hour', expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1",[staged.id]);
    await assert.rejects(()=>ledger.getForVideoTransfer({userId:owner,id:staged.id}),/REFERENCE_MEDIA_ACCESS_DENIED/);
    env.AI_STUDIO_REFERENCE_STAGING_ENABLED='false';
    assert.deepEqual(await ledger.cleanupExpired(),{claimed:1,deleted:1,failed:0});
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM vv_generation_reference_assets')).rows[0].n,0);
    // Independently authenticated S3 GET must report object not present,
    // even though new intake is switched OFF.
    const path='/'+bucket+'/'+stagedKey;
    const gone=await local('GET',path,{headers:signedBucketRequest('GET',path)});
    assert.equal(gone.status,404,'real MinIO must have deleted expired MP4');
   }finally{
    env.AI_STUDIO_REFERENCE_STAGING_ENABLED='true';
    if(stagedKey)await store.deleteStagedReference({userId:owner,key:stagedKey}).catch(()=>{});
    if(pool)await pool.end();
    await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
    await admin.end();
   }
  });

  assert.equal(deleted.status,404,'deleting the object must revoke media availability');
 }finally{
  await store.deleteStagedReference({userId:owner,key:getKey}).catch(()=>{});
  // Delete only the unique ephemeral bucket created by this test.
  const gone=await local('DELETE',bpath,{headers:signedBucketRequest('DELETE',bpath)});
  assert.equal(gone.status,204,'remove ephemeral bucket after cleanup');
 }
});
