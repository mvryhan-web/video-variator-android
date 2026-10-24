// Independent in-process S3-like HTTP verifier. This is NOT proof of a real
// S3 provider: the official MinIO image was unavailable on GitHub Actions.
// No network outside 127.0.0.1, no S3 credentials, no AI jobs, no billable calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {once} from 'node:events';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {createObjectStorage} from '../server/generation-storage.js';

const owner='owner-fixture',bucket='deepsyq-fixture',hostname='media.example.com';
const accessKey='EXAMPLEKEYID',secret='fixture-long-s3-secret-not-real';
const region='us-east-1',clockStart='2026-10-15T18:55:00.000Z';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hmac=(key,text)=>createHmac('sha256',key).update(text).digest();
function compare(actual,expected){
 if(!/^[a-f\d]{64}$/.test(actual||''))return false;
 return timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
}
function expectedSig({method,path,query='',headers,stamp,scope,payloadHash,signedNames}){
 const [day,scopeRegion,service,terminal]=scope.split('/');
 if(day!==stamp.slice(0,8)||scopeRegion!==region||service!=='s3'||terminal!=='aws4_request')return null;
 const names=signedNames.split(';');
 if(!names.includes('host')||names.some((v,i)=>i&&names[i-1]>=v)||names.some(n=>!headers[n]))return null;
 const canonicalHeaders=names.map(name=>name+':'+String(headers[name]).trim()+'\n').join('');
 const canonical=[method,path,query,canonicalHeaders,signedNames,payloadHash].join('\n');
 const digest=sha(canonical),toSign=['AWS4-HMAC-SHA256',stamp,scope,digest].join('\n');
 const key=hmac(hmac(hmac(hmac('AWS4'+secret,day),region),'s3'),'aws4_request');
 return createHmac('sha256',key).update(toSign).digest('hex');
}
function isAuthorized(req,body,now){
 const original=new URL(req.url,'http://'+hostname),u=original;
 const params=u.searchParams;
 const bearer=params.get('X-Amz-Signature');
 if(bearer!==null){
  const key=params.get('X-Amz-Credential'),date=params.get('X-Amz-Date');
  const names=params.get('X-Amz-SignedHeaders'),ttl=Number(params.get('X-Amz-Expires'));
  if(params.get('X-Amz-Algorithm')!=='AWS4-HMAC-SHA256'||!key?.startsWith(accessKey+'/')||
   names!=='host'||!/^\d{8}T\d{6}Z$/.test(date||'')||
   !Number.isInteger(ttl)||ttl<1||ttl>60)return false;
  const dt=Date.parse(date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T'+date.slice(9,11)+':'+date.slice(11,13)+':'+date.slice(13,15)+'Z');
  if(!Number.isFinite(dt)||now.getTime()>dt+ttl*1000||dt-now.getTime()>30000)return false;
  const canonical=[...params.entries()].filter(([key])=>key!=='X-Amz-Signature')
   .sort(([a],[b])=>a<b?-1:a>b?1:0)
   .map(([a,b])=>encodeURIComponent(a)+'='+encodeURIComponent(b)).join('&');
  const expected=expectedSig({method:req.method,path:u.pathname,query:canonical,
   headers:req.headers,stamp:date,scope:key.slice(accessKey.length+1),payloadHash:'UNSIGNED-PAYLOAD',signedNames:names});
  return compare(bearer,expected);
 }
 const auth=req.headers.authorization||'';
 const m=/^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8}\/[^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth);
 if(!m||m[1]!==accessKey||!/^\d{8}T\d{6}Z$/.test(req.headers['x-amz-date']||''))return false;
 if(req.headers['x-amz-content-sha256']!==sha(body))return false;
 const expected=expectedSig({method:req.method,path:u.pathname,headers:req.headers,
  stamp:req.headers['x-amz-date'],scope:m[2],payloadHash:sha(body),signedNames:m[3]});
 return compare(m[4],expected);
}
function box(type,data=Buffer.alloc(0)){
 const b=Buffer.alloc(8);b.writeUInt32BE(data.length+8);b.write(type,4);return Buffer.concat([b,data]);
}
function mp4(){
 const brand=Buffer.alloc(8);brand.write('isom');
 const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(5000,16);
 const hdlr=Buffer.alloc(12);hdlr.write('vide',8);
 return Buffer.concat([box('ftyp',brand),box('moov',Buffer.concat([box('mvhd',mvhd),box('trak',box('mdia',box('hdlr',hdlr)))])),box('mdat',Buffer.from([0,1,2,3]))]);
}
test('local HTTP verifies SigV4 GET and rejects unsigned, altered, expired and deleted media',async()=>{
 let clock=new Date(clockStart),remoteCalls=0;
 const objects=new Map(),log=[];
 const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const bytes=Buffer.concat(chunks),url=new URL(req.url,'http://'+hostname);
  const validHost=req.headers.host===hostname;
  const auth=validHost&&isAuthorized(req,bytes,clock);
  log.push({method:req.method,authorized:auth});
  if(!auth){res.writeHead(403);res.end('AccessDenied');return;}
  if(!url.pathname.startsWith('/'+bucket+'/')){res.writeHead(404);res.end();return;}
  const key=url.pathname;
  if(req.method==='PUT'){objects.set(key,bytes);res.writeHead(200);res.end();return;}
  if(req.method==='GET'){
   const value=objects.get(key);
   if(!value){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':'video/mp4'});res.end(value);return;
  }
  if(req.method==='DELETE'){objects.delete(key);res.writeHead(204);res.end();return;}
  res.writeHead(405);res.end();
 });
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 const port=server.address().port;
 async function localUrl(input,options={}){
  const url=new URL(input);
  assert.equal(url.hostname,hostname,'never fetch an unapproved host');
  remoteCalls++;
  // Undici/fetch rewrites Host to 127.0.0.1. S3 signs the ORIGINAL Host.
  // Node http.request allows the exact canonical Host while binding loopback.
  return new Promise((resolve,reject)=>{
   const req=httpRequest({
    hostname:'127.0.0.1',port,path:url.pathname+url.search,
    method:options.method||'GET',headers:{...options.headers,Host:hostname},
    signal:options.signal
   },res=>{
    const chunks=[];
    res.on('data',piece=>chunks.push(piece));
    res.on('error',reject);
    res.on('end',()=>{
     const data=Buffer.concat(chunks),status=res.statusCode;
     resolve(new Response(data.length?data:null,{status,headers:res.headers}));
    });
   });
   req.on('error',reject);
   if(options.body)req.write(options.body);
   req.end();
  });
 }
 const env={
  AI_OBJECT_STORAGE_ENABLED:'true',AI_OBJECT_STORAGE_ENDPOINT:'https://'+hostname,
  AI_OBJECT_STORAGE_BUCKET:bucket,AI_OBJECT_STORAGE_REGION:region,
  AI_OBJECT_STORAGE_ACCESS_KEY_ID:accessKey,AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:secret,
  AI_OBJECT_STORAGE_PREFIX:'ci-only',
  AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',
  AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED:'true',
  AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true',
  AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS:hostname
 };
 const store=createObjectStorage({env,now:()=>clock,fetcher:localUrl});
 const id=randomUUID(),data=mp4(),key=store.stagedReferenceKey({userId:owner,mime:'video/mp4',assetId:id});
 try{
  await store.putStagedReference({userId:owner,assetId:id,mime:'video/mp4',bytes:data});
  assert.deepEqual(await store.getStagedReference({userId:owner,key,mime:'video/mp4'}),data);
  const expiry=new Date(clock.getTime()+300000);
  const signed=store.presignStagedReferenceRead({userId:owner,key,expiresAt:expiry,seconds:30});
  assert.equal(remoteCalls,2,'presigning must not make another request');
  const ok=await localUrl(signed.url);
  assert.equal(ok.status,200);assert.deepEqual(Buffer.from(await ok.arrayBuffer()),data);
  const forged=new URL(signed.url);forged.searchParams.set('X-Amz-Expires','60');
  assert.equal((await localUrl(forged.toString())).status,403);
  const unsigned=new URL(signed.url);unsigned.searchParams.delete('X-Amz-Signature');
  assert.equal((await localUrl(unsigned.toString())).status,403);
  clock=new Date(clock.getTime()+31000);
  assert.equal((await localUrl(signed.url)).status,403,'expired signature must stop access');
  const renewed=store.presignStagedReferenceRead({userId:owner,key,expiresAt:expiry,seconds:30});
  assert.equal((await localUrl(renewed.url)).status,200,'only a new fresh signature restores access');
  await store.deleteStagedReference({userId:owner,key});
  assert.equal((await localUrl(renewed.url)).status,404,'deleting object stops even signed access');
  assert.equal(objects.size,0);
  assert.ok(log.some(x=>x.method==='PUT'&&x.authorized));
  assert.ok(log.some(x=>x.method==='GET'&&x.authorized));
  assert.ok(log.some(x=>x.method==='DELETE'&&x.authorized));
  assert.ok(log.filter(x=>x.method==='GET'&&!x.authorized).length>=3);
 }finally{
  await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
 }
});
