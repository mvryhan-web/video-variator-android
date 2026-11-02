import {createHash,createHmac,randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {inspectStudioReferenceMedia,STUDIO_REFERENCE_MEDIA_LIMITS} from './generation-reference-media.js';

const MIME_EXT=new Map([['image/png','png'],['image/jpeg','jpg'],['video/mp4','mp4'],['audio/mpeg','mp3'],['audio/mp3','mp3'],['audio/wav','wav']]);
const sha=value=>createHash('sha256').update(value).digest('hex');
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest();

function validEndpoint(value){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname.replace(/\/+$/,'')==='';
 }catch(_){return false;}
}
function validBucket(v){return typeof v==='string'&&/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(v);}
function validRegion(v){return typeof v==='string'&&/^[a-z0-9-]{1,32}$/.test(v);}
function safeKey(v){return typeof v==='string'&&v.length>0&&v.length<=900&&!v.startsWith('/')&&!v.includes('..')&&/^[A-Za-z0-9/_.,=-]+$/.test(v);}
function encPath(value){return value.split('/').map(x=>encodeURIComponent(x).replace(/%2F/gi,'/')).join('/');}

export function objectStorageConfig(env={}){
 const enabled=env.AI_OBJECT_STORAGE_ENABLED==='true';
 const endpoint=String(env.AI_OBJECT_STORAGE_ENDPOINT||'').replace(/\/+$/,'');
 const bucket=String(env.AI_OBJECT_STORAGE_BUCKET||'');
 const region=String(env.AI_OBJECT_STORAGE_REGION||'auto');
 const accessKeyId=String(env.AI_OBJECT_STORAGE_ACCESS_KEY_ID||'');
 const secretAccessKey=String(env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY||'');
 const prefix=String(env.AI_OBJECT_STORAGE_PREFIX||'deepsyq').replace(/^\/+|\/+$/g,'');
 const configured=enabled&&validEndpoint(endpoint)&&validBucket(bucket)&&validRegion(region)&&accessKeyId.length>=8&&secretAccessKey.length>=16&&safeKey(prefix||'deepsyq');
 return {enabled,configured,endpoint,bucket,region,accessKeyId,secretAccessKey,prefix:prefix||'deepsyq'};
}

function amzDate(now){
 const d=now instanceof Date?now:new Date(now);
 const iso=d.toISOString().replace(/[:-]|\.\d{3}/g,'');
 return {full:iso,day:iso.slice(0,8)};
}
function signingKey(secret,day,region){
 const date=hmac('AWS4'+secret,day),reg=hmac(date,region),service=hmac(reg,'s3');
 return hmac(service,'aws4_request');
}
// AWS SigV4 query authentication for a future server-private, short-lived S3 GET.
// DO NOT place presigned URLs in HTTP responses, logs, job history or browser state.
const sigV4Encode=s=>encodeURIComponent(String(s)).replace(/[!'()*]/g,ch=>'%'+ch.charCodeAt(0).toString(16).toUpperCase());
function presignedGet({url,region,accessKeyId,secretAccessKey,issuedAt,seconds}){
 const u=new URL(url),stamp=amzDate(issuedAt),scope=stamp.day+'/'+region+'/s3/aws4_request';
 const params=[
  ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
  ['X-Amz-Credential',accessKeyId+'/'+scope],
  ['X-Amz-Date',stamp.full],
  ['X-Amz-Expires',String(seconds)],
  ['X-Amz-SignedHeaders','host']
 ];
 const query=params.sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>sigV4Encode(k)+'='+sigV4Encode(v)).join('&');
 const canonical=['GET',u.pathname,query,'host:'+u.host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const toSign=['AWS4-HMAC-SHA256',stamp.full,scope,sha(canonical)].join('\n');
 const signature=createHmac('sha256',signingKey(secretAccessKey,stamp.day,region)).update(toSign).digest('hex');
 return u.origin+u.pathname+'?'+query+'&X-Amz-Signature='+signature;
}
function approvedReferenceHost(cfg,env){
 const url=new URL(cfg.endpoint),hostname=url.hostname.toLowerCase();
 const approved=String(env.AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 // Reject hostnames that are private, unresolved, wildcarded, IP literals or not
 // exactly owner-approved; this is not an SSRF check and makes no network request.
 const publicDns=/^(?=.{4,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(hostname)&&
  !/(?:\.local|\.internal|\.localhost|\.invalid|\.test)$/.test(hostname);
 return publicDns&&!isIP(hostname)&&!url.port&&approved.length>0&&approved.every(h=>h===hostname);
}

function signedRequest({method,url,region,accessKeyId,secretAccessKey,body=Buffer.alloc(0),mime,now=new Date()}){
 const u=new URL(url),payload=Buffer.isBuffer(body)?body:Buffer.from(body||'');
 const payloadHash=sha(payload),date=amzDate(now),headers={host:u.host,'x-amz-content-sha256':payloadHash,'x-amz-date':date.full};
 if(mime)headers['content-type']=mime;
 const names=Object.keys(headers).sort(),canonicalHeaders=names.map(k=>`${k}:${String(headers[k]).trim()}\n`).join('');
 const canonical=[method,u.pathname||'/',u.searchParams.toString(),canonicalHeaders,names.join(';'),payloadHash].join('\n');
 const scope=`${date.day}/${region}/s3/aws4_request`,toSign=['AWS4-HMAC-SHA256',date.full,scope,sha(canonical)].join('\n');
 const signature=createHmac('sha256',signingKey(secretAccessKey,date.day,region)).update(toSign).digest('hex');
 const auth=`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
 const requestHeaders={'x-amz-content-sha256':payloadHash,'x-amz-date':date.full,Authorization:auth};
 if(mime)requestHeaders['Content-Type']=mime;
 return {headers:requestHeaders,body:payload};
}

async function readLimited(response,maxBytes){
 if(!response.body?.getReader)throw Error('OBJECT_STORAGE_INVALID_RESPONSE');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw Error('OBJECT_STORAGE_RESULT_TOO_LARGE');chunks.push(Buffer.from(value));}
 }finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks);
}

export function createObjectStorage({env=process.env,fetcher=fetch,now=()=>new Date()}={}){
 const cfg=objectStorageConfig(env);
 const requireReady=()=>{if(!cfg.configured)throw Error('OBJECT_STORAGE_NOT_CONFIGURED');};
 const urlFor=key=>{if(!safeKey(key))throw Error('OBJECT_STORAGE_INVALID_KEY');return `${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}/${encPath(key)}`;};
 async function request(method,key,{bytes=Buffer.alloc(0),mime}={}){
  requireReady();const url=urlFor(key),signed=signedRequest({method,url,region:cfg.region,accessKeyId:cfg.accessKeyId,secretAccessKey:cfg.secretAccessKey,body:bytes,mime,now:now()});
  const r=await fetcher(url,{method,redirect:'error',signal:AbortSignal.timeout(120000),headers:signed.headers,...(method==='PUT'?{body:signed.body}:{})});
  if(!r.ok)throw Error('OBJECT_STORAGE_REQUEST_FAILED');
  return r;
 }
 const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
 function stagedReferenceKey({userId,mime,assetId}){
  requireReady();
  if(env.AI_STUDIO_REFERENCE_STAGING_ENABLED!=='true')throw Error('REFERENCE_STAGING_DISABLED');
  if(env.AI_STUDIO_REFERENCE_CLEANUP_ENABLED!=='true')throw Error('REFERENCE_CLEANUP_DISABLED');
  if(typeof userId!=='string'||!userId||userId.length>256||
     !Object.hasOwn(STUDIO_REFERENCE_MEDIA_LIMITS,mime)||!uuidPattern.test(assetId))throw Error('REFERENCE_MEDIA_INVALID');
  const owner=sha(userId).slice(0,24);
  return `${cfg.prefix}/references/users/${owner}/${assetId}.${mime==='video/mp4'?'mp4':'wav'}`;
 }
 return {
  configured:cfg.configured,
  stagedReferenceKey,
  // Sensitive, optional server-only S3 presigned GET for a future consented
  // ModelArk dispatch. Caller MUST verify the owner/expiry in the ledger,
  // inspect actual media bytes, and approve the paid job separately.
  presignStagedReferenceRead({userId,key,expiresAt,seconds=30}={}){
   requireReady();
   if(env.AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED!=='true'||
      env.AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED!=='true'||
      env.AI_STUDIO_REFERENCE_STAGING_ENABLED!=='true'||
      env.AI_STUDIO_REFERENCE_CLEANUP_ENABLED!=='true')
    throw Error('REFERENCE_VIDEO_TRANSFER_DISABLED');
   if(!approvedReferenceHost(cfg,env))throw Error('REFERENCE_PROVIDER_FETCH_HOST_NOT_APPROVED');
   if(!Number.isInteger(seconds)||seconds<15||seconds>60)
    throw Error('REFERENCE_VIDEO_URL_TTL_INVALID');
   const id=typeof key==='string'&&key.match(/\/([0-9a-f-]{36})\.mp4$/)?.[1];
   if(typeof userId!=='string'||!id||key!==stagedReferenceKey({userId,mime:'video/mp4',assetId:id}))
    throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   const issued=now(),expires=new Date(expiresAt);
   if(!(issued instanceof Date)||!Number.isFinite(issued.getTime())||
      !Number.isFinite(expires.getTime())||
      expires.getTime()<=issued.getTime()+(seconds+30)*1000)
    throw Error('REFERENCE_VIDEO_URL_EXPIRES_TOO_LATE');
   return {url:presignedGet({url:urlFor(key),region:cfg.region,accessKeyId:cfg.accessKeyId,
     secretAccessKey:cfg.secretAccessKey,issuedAt:issued,seconds}),
     expiresAt:new Date(issued.getTime()+seconds*1000).toISOString()};
  },
  async putGeneration({userId,jobId,mime,bytes}){
   requireReady();if(!MIME_EXT.has(mime)||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>50*1024*1024)throw Error('OBJECT_STORAGE_INVALID_MEDIA');
   const owner=sha(String(userId)).slice(0,24),key=`${cfg.prefix}/users/${owner}/${jobId}.${MIME_EXT.get(mime)}`;
   await request('PUT',key,{bytes,mime});
   // Immutable content digest travels with output_assets in the existing job
   // JSON, without a schema migration or exposing a signed private URL.
   return {storage:'s3',key,mime,size:bytes.length,sha256:sha(bytes)};
  },
  // Prepared for a future authenticated upload ledger. No HTTP route calls these
  // methods yet; staging is OFF unless explicitly approved after retention design.
  async putStagedReference({userId,mime,bytes,assetId=randomUUID()}){
   const inspected=inspectStudioReferenceMedia({bytes,mime});
   const key=stagedReferenceKey({userId,mime,assetId});
   await request('PUT',key,{bytes,mime});
   // Never return a public/presigned URL or provider transfer token.
   return {storage:'s3',key,...inspected};
  },
  async getStagedReference({userId,key,mime}){
   requireReady();
   if(env.AI_STUDIO_REFERENCE_STAGING_ENABLED!=='true')throw Error('REFERENCE_STAGING_DISABLED');
   const owner=sha(String(userId||'')).slice(0,24);
   const base=`${cfg.prefix}/references/users/${owner}/`;
   if(typeof key!=='string'||!key.startsWith(base)||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|wav)$/.test(key.slice(base.length))||
      !Object.hasOwn(STUDIO_REFERENCE_MEDIA_LIMITS,mime)||!key.endsWith(mime==='video/mp4'?'.mp4':'.wav'))throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   const response=await request('GET',key);
   const bytes=await readLimited(response,STUDIO_REFERENCE_MEDIA_LIMITS[mime]);
   inspectStudioReferenceMedia({bytes,mime});
   return bytes;
  },
  async deleteStagedReference({userId,key}){
   requireReady();
   // Deletion must continue after the new-upload gate is disabled.
   if(env.AI_STUDIO_REFERENCE_CLEANUP_ENABLED!=='true')throw Error('REFERENCE_CLEANUP_DISABLED');
   const owner=sha(String(userId||'')).slice(0,24);
   const base=`${cfg.prefix}/references/users/${owner}/`;
   if(typeof key!=='string'||!key.startsWith(base)||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp4|wav)$/.test(key.slice(base.length)))throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
   await request('DELETE',key);return true;
  },
  async get(key,{maxBytes=50*1024*1024,expectedSha256=null}={}){
   // Old assets without a digest stay readable, but never claim verified.
   if(expectedSha256!=null&&
      (typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256)))
    throw Error('OBJECT_STORAGE_INVALID_CHECKSUM');
   const r=await request('GET',key),bytes=await readLimited(r,maxBytes);
   if(expectedSha256!=null&&sha(bytes)!==expectedSha256)
    throw Error('OBJECT_STORAGE_CHECKSUM_MISMATCH');
   return bytes;
  },
  async delete(key){await request('DELETE',key);return true;}
 };
}
