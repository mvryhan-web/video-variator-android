// BASE Video #5: an OPTIONAL, manual, isolated S3-compatibility acceptance
// harness. No HTTP route or worker imports this module. There are NO network
// operations in the preflight; execution requires an independently approved,
// dedicated fixture bucket and credentials, NEVER the production media bucket.
import {randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {createObjectStorage,objectStorageConfig} from './generation-storage.js';
import {inspectStudioReferenceMedia} from './generation-reference-media.js';

export const REFERENCE_S3_TEST_CONSENT='I_APPROVE_ISOLATED_REFERENCE_S3_TEST';
const bucketPattern=/^deepsyq-ref-accept-[a-z0-9]{8,24}$/;
const publicHost=/^(?=.{4,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const unsafeSuffix=/\.(?:local|localhost|internal|invalid|test|example)$/;
const checks=[
 'NO_PRODUCTION_RUNTIME','EXPLICIT_ISOLATED_CONSENT','ISOLATED_BUCKET',
 'SEPARATE_TEST_CREDENTIALS','HTTPS_APPROVED_PUBLIC_HOST','COMPLETE_S3_CONFIGURATION'
];
const keys={
 endpoint:'AI_REFERENCE_S3_TEST_ENDPOINT',
 bucket:'AI_REFERENCE_S3_TEST_BUCKET',
 region:'AI_REFERENCE_S3_TEST_REGION',
 key:'AI_REFERENCE_S3_TEST_ACCESS_KEY_ID',
 secret:'AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY',
 host:'AI_REFERENCE_S3_TEST_APPROVED_HOST'
};
function makeTestEnv(e){
 return {
  AI_OBJECT_STORAGE_ENABLED:'true',
  AI_OBJECT_STORAGE_ENDPOINT:e[keys.endpoint],
  AI_OBJECT_STORAGE_BUCKET:e[keys.bucket],
  AI_OBJECT_STORAGE_REGION:e[keys.region],
  AI_OBJECT_STORAGE_ACCESS_KEY_ID:e[keys.key],
  AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:e[keys.secret],
  AI_OBJECT_STORAGE_PREFIX:'ref-acceptance',
  AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',
  AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',
  AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED:'true',
  AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true',
  AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:e[keys.host]
 };
}
export function assessReferenceS3CloudAcceptance(env={}){
 const failed=[];
 const bad=check=>failed.push(check);
 if(env.NODE_ENV==='production'||env.RENDER==='true'||env.RENDER_SERVICE_ID||
    env.AI_PUBLIC_GENERATION_ENABLED==='true'||env.AI_BILLING_ENABLED==='true')
  bad(checks[0]);
 if(env.AI_REFERENCE_S3_TEST_CONSENT!==REFERENCE_S3_TEST_CONSENT)bad(checks[1]);
 const bucket=env[keys.bucket];
 if(typeof bucket!=='string'||!bucketPattern.test(bucket)||
    bucket===env.AI_OBJECT_STORAGE_BUCKET)bad(checks[2]);
 const access=env[keys.key],secret=env[keys.secret];
 if(typeof access!=='string'||access.length<8||typeof secret!=='string'||secret.length<16||
    (env.AI_OBJECT_STORAGE_ACCESS_KEY_ID&&access===env.AI_OBJECT_STORAGE_ACCESS_KEY_ID)||
    (env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY&&secret===env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY))
  bad(checks[3]);
 let host=null,valid=false;
 try{
  const url=new URL(String(env[keys.endpoint]||''));
  host=url.hostname.toLowerCase();
  const approved=String(env[keys.host]||'').toLowerCase();
  valid=url.protocol==='https:'&&!url.username&&!url.password&&
   !url.search&&!url.hash&&!url.port&&!url.pathname.replace(/\/+$/,'')&&
   publicHost.test(host)&&!unsafeSuffix.test(host)&&!isIP(host)&&
   approved===host&&approved.length>0;
 }catch(_){/* fail closed */ }
 if(!valid)bad(checks[4]);
 if(!objectStorageConfig(makeTestEnv(env)).configured)bad(checks[5]);
 // Deliberately NO endpoint, bucket, object path, credential or URL in output.
 return {mode:'offline-readiness',readyForManualExecution:failed.length===0,
  blockerCodes:failed,networkRequests:0,providerRequests:0};
}
const deny=(code)=>{throw Error(code);};
async function limitedDownload(response,maxBytes){
 if(!response?.ok||response.status!==200)deny('REFERENCE_S3_ACCEPTANCE_GET_FAILED');
 if(!response.body?.getReader)deny('REFERENCE_S3_ACCEPTANCE_GET_FAILED');
 const reader=response.body.getReader(),parts=[];let length=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.length;
   if(length>maxBytes)deny('REFERENCE_S3_ACCEPTANCE_RESPONSE_TOO_LARGE');
   parts.push(Buffer.from(value));
  }
 }finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(parts);
}
export async function executeReferenceS3CloudAcceptance({
 env=process.env,fixture,storageFactory=createObjectStorage,httpFetch=fetch,
 now=()=>new Date()
}={}){
 const preflight=assessReferenceS3CloudAcceptance(env);
 if(!preflight.readyForManualExecution)deny('REFERENCE_S3_ACCEPTANCE_BLOCKED');
 if(typeof fixture!=='function')deny('REFERENCE_S3_ACCEPTANCE_FIXTURE_REQUIRED');
 const isolated=makeTestEnv(env),storage=storageFactory({env:isolated,now});
 if(!storage?.configured)deny('REFERENCE_S3_ACCEPTANCE_STORAGE_NOT_CONFIGURED');
 const bytes=await fixture();
 if(!Buffer.isBuffer(bytes)||bytes.length>5*1024*1024)deny('REFERENCE_S3_ACCEPTANCE_FIXTURE_INVALID');
 const inspected=inspectStudioReferenceMedia({mime:'video/mp4',bytes});
 if(inspected.durationSeconds<0.1||inspected.durationSeconds>5)deny('REFERENCE_S3_ACCEPTANCE_FIXTURE_INVALID');
 const id=randomUUID(),userId='test-fixture-'+randomUUID(),key=storage.stagedReferenceKey({userId,mime:'video/mp4',assetId:id});
 const host=String(env[keys.host]).toLowerCase(),endpoint=new URL(String(env[keys.endpoint]));
 let cleanupNeeded=true;
 const readSigned=async(url)=>{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!==host||u.host!==endpoint.host||
     !u.pathname.startsWith('/'+env[keys.bucket]+'/'))deny('REFERENCE_S3_ACCEPTANCE_URL_OUT_OF_SCOPE');
  return httpFetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),cache:'no-store'});
 };
 try{
  const put=await storage.putStagedReference({userId,mime:'video/mp4',bytes,assetId:id});
  if(put.key!==key)deny('REFERENCE_S3_ACCEPTANCE_WRONG_OBJECT');
  const verified=await storage.getStagedReference({userId,mime:'video/mp4',key});
  if(!verified.equals(bytes))deny('REFERENCE_S3_ACCEPTANCE_BYTES_DIFFER');
  const expiresAt=new Date(now().getTime()+5*60000);
  const link=storage.presignStagedReferenceRead({userId,key,expiresAt,seconds:30});
  const publicRead=await readSigned(link.url);
  if(!(await limitedDownload(publicRead,5*1024*1024)).equals(bytes))
   deny('REFERENCE_S3_ACCEPTANCE_BYTES_DIFFER');
  const altered=new URL(link.url);altered.searchParams.set('X-Amz-Expires','60');
  const modified=await readSigned(altered.toString());
  if(modified.status<400||modified.status>=500)deny('REFERENCE_S3_ACCEPTANCE_TAMPER_ACCEPTED');
  const unsigned=new URL(link.url);unsigned.searchParams.delete('X-Amz-Signature');
  const unsignedRead=await readSigned(unsigned.toString());
  if(unsignedRead.status<400||unsignedRead.status>=500)deny('REFERENCE_S3_ACCEPTANCE_UNSIGNED_ACCEPTED');
  const oldStorage=storageFactory({env:isolated,now:()=>new Date(now().getTime()-120000)});
  const expired=oldStorage.presignStagedReferenceRead({userId,key,expiresAt,seconds:30});
  const expiredRead=await readSigned(expired.url);
  if(expiredRead.status<400||expiredRead.status>=500)deny('REFERENCE_S3_ACCEPTANCE_EXPIRED_ACCEPTED');
  await storage.deleteStagedReference({userId,key});
  const deleted=await readSigned(link.url);
  if(deleted.status!==404)deny('REFERENCE_S3_ACCEPTANCE_DELETE_UNCONFIRMED');
  cleanupNeeded=false;
  return {status:'isolated-fixture-verified',checks:[
   'SIGNED_PUT','PRIVATE_GET','SHORT_SIGNED_GET','TAMPER_DENIED',
   'UNSIGNED_DENIED','EXPIRED_DENIED','SIGNED_DELETE','READ_AFTER_DELETE_404'
  ],providerRequests:0,modelArkFetchVerified:false,commercialReady:false};
 }finally{
  if(cleanupNeeded){
   try{await storage.deleteStagedReference({userId,key});}
   catch(_){deny('REFERENCE_S3_ACCEPTANCE_CLEANUP_UNCONFIRMED');}
  }
 }
}
