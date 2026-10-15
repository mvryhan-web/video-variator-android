import {createHash,createHmac} from 'node:crypto';

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
 return {
  configured:cfg.configured,
  async putGeneration({userId,jobId,mime,bytes}){
   requireReady();if(!MIME_EXT.has(mime)||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>50*1024*1024)throw Error('OBJECT_STORAGE_INVALID_MEDIA');
   const owner=sha(String(userId)).slice(0,24),key=`${cfg.prefix}/users/${owner}/${jobId}.${MIME_EXT.get(mime)}`;
   await request('PUT',key,{bytes,mime});return {storage:'s3',key,mime,size:bytes.length};
  },
  async get(key,{maxBytes=50*1024*1024}={}){const r=await request('GET',key);return readLimited(r,maxBytes);},
  async delete(key){await request('DELETE',key);return true;}
 };
}
