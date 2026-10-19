import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import {installGenerationReferenceUpload} from '../server/generation-reference-upload.js';
import {createGenerationReferenceLedger} from '../server/generation-reference-ledger.js';

function wav(){
 const samples=Buffer.alloc(16000),fmt=Buffer.alloc(16);
 fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(8000,4);
 fmt.writeUInt32LE(16000,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 const bytes=Buffer.concat([Buffer.from('WAVEfmt '),Buffer.from([16,0,0,0]),fmt,Buffer.from('data'),Buffer.from([128,62,0,0]),samples]);
 const header=Buffer.alloc(8);header.write('RIFF',0);header.writeUInt32LE(bytes.length,4);
 return Buffer.concat([header,bytes]);
}
async function webServer({enabled=true,stage=async()=>({id:'test-id',size:16044,mime:'audio/wav',durationSeconds:1}),probe=async()=>({audioCodec:'pcm_s16le'})}={}){
 const app=express(),calls=[];
 const auth=(req,res,next)=>{
  const who=String(req.headers.authorization||'');
  if(!who)return res.status(401).json({error:'AUTH_REQUIRED'});
  req.user={id:who,provider:'google'};next();
 };
 const owner=(req,res,next)=>req.user.id==='owner'?next():res.status(403).json({error:'OWNER_PILOT_ONLY'});
 installGenerationReferenceUpload(app,{auth,owner,env:{
  AI_STUDIO_ENABLED:'true',AI_STUDIO_REFERENCE_UPLOAD_ENABLED:enabled?'true':'false'
 },probe,ledger:{async stage(args){calls.push(args);return stage(args);}}});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`http://127.0.0.1:${server.address().port}/api/studio/references`;
 return {url,calls,close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
test('upload is off by default and cannot bypass auth/owner checks',async()=>{
 const x=await webServer({enabled:false});
 try{
  const unauth=await fetch(x.url,{method:'POST',headers:{'Content-Type':'audio/wav'},body:wav()});
  assert.equal(unauth.status,401);
  const other=await fetch(x.url,{method:'POST',headers:{Authorization:'someone','Content-Type':'audio/wav'},body:wav()});
  assert.equal(other.status,403);
  const disabled=await fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body:wav()});
  assert.equal(disabled.status,503);
  assert.equal(x.calls.length,0);
 }finally{await x.close();}
});
test('owner raw uploader rejects unapproved MIME, compression, and malformed data before staging',async()=>{
 const x=await webServer();
 try{
  for(const [type,body,extra,expected] of [
   ['application/json','{}',{},415],
   ['video/webm','fake',{},415],
   ['audio/wav',wav(),{'Content-Encoding':'gzip'},415],
   ['audio/wav',Buffer.from('not a WAV'),{},400]
  ]){
   const r=await fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':type,...extra},body});
   assert.equal(r.status,expected,`unexpected status for ${type}`);
  }
  assert.equal(x.calls.length,0);
 }finally{await x.close();}
});
test('owner reference upload returns only private metadata, never starts generation',async()=>{
 const x=await webServer();
 try{
  const bytes=wav();
  const r=await fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body:bytes});
  assert.equal(r.status,201);
  const body=await r.json();
  assert.equal(body.stagedOnly,true);assert.equal(body.providerReady,false);
  assert.equal(body.asset.id,'test-id');
  assert.equal(body.asset.url,undefined);
  assert.equal(x.calls.length,1);
  assert.equal(x.calls[0].userId,'owner');
  assert.deepEqual(x.calls[0].bytes,bytes);
 }finally{await x.close();}
});
test('pilot quota exhaustion fails closed without creating another asset',async()=>{
 const x=await webServer({stage:async()=>{throw Error('REFERENCE_UPLOAD_LIMIT');}});
 try{
  const r=await fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body:wav()});
  assert.equal(r.status,429);
  assert.equal((await r.json()).error,'REFERENCE_UPLOAD_LIMIT');
 }finally{await x.close();}
});
test('ledger enforces active-slot admission through a transaction-scoped advisory lock',async()=>{
 const rows=[],queries=[],env={
  AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',
  AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',AI_STUDIO_REFERENCE_TTL_MINUTES:'10'
 };
 const client={
  async query(sql,args=[]){
   queries.push(sql.trim().slice(0,55));
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql.includes('pg_advisory_xact_lock'))return {rows:[]};
   if(sql.includes('COUNT(*)::int AS active'))return {rows:[{active:rows.filter(x=>['ready','uploading','failed'].includes(x.status)).length}]};
   if(sql.includes('INSERT INTO vv_generation_reference_assets')){rows.push({id:args[0],user_id:args[1],status:'uploading',mime:args[3],byte_size:args[4],duration_seconds:args[5],expires_at:args[6]});return {rows:[]};}
   throw Error('Unexpected transaction SQL');
  },release(){}
 };
 const pool={
  async connect(){return client;},
  async query(sql,args=[]){
   if(sql.includes("SET status='ready'")){
    const r=rows.find(x=>x.id===args[0]&&x.user_id===args[1]);r.status='ready';return {rows:[r]};
   }
   throw Error('Unexpected post-upload SQL');
  }
 };
 const storage={configured:true,stagedReferenceKey:({userId,assetId})=>`private/${userId}/${assetId}.wav`,
  async putStagedReference({userId,assetId}){return {key:`private/${userId}/${assetId}.wav`};}};
 const ledger=createGenerationReferenceLedger({pool,storage,env,maxActiveUploads:1});
 const first=await ledger.stage({userId:'owner',mime:'audio/wav',bytes:wav()});
 assert.ok(first.id);assert.equal(rows.length,1);
 await assert.rejects(()=>ledger.stage({userId:'owner',mime:'audio/wav',bytes:wav()}),/REFERENCE_UPLOAD_LIMIT/);
 assert.equal(rows.length,1);
 assert.equal(queries.filter(x=>x==='BEGIN').length,2);
 assert.ok(queries.some(x=>x.includes('pg_advisory_xact_lock')));
});

test('ffprobe unavailable blocks intake before any ledger or S3 write',async()=>{
 const x=await webServer({probe:async()=>{throw Error('REFERENCE_MEDIA_PROBE_UNAVAILABLE');}});
 try{
  const r=await fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body:wav()});
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'REFERENCE_UPLOAD_UNAVAILABLE');
  assert.equal(x.calls.length,0);
 }finally{await x.close();}
});

test('unsupported codec maps to 415 before any private upload',async()=>{
 const x=await webServer({probe:async()=>{throw Error('REFERENCE_MEDIA_CODEC_UNSUPPORTED');}});
 try{
  const r=await fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body:wav()});
  assert.equal(r.status,415);assert.equal((await r.json()).error,'REFERENCE_MEDIA_CODEC_UNSUPPORTED');
  assert.equal(x.calls.length,0);
 }finally{await x.close();}
});

test('owner upload admits at most 2 concurrent bodies/probes before PostgreSQL; releases slots on completion',async()=>{
 let resolveBoth,releaseStage,entered=0,probeCount=0;
 const both=new Promise(resolve=>{resolveBoth=resolve;});
 const held=new Promise(resolve=>{releaseStage=resolve;});
 const x=await webServer({probe:async()=>{probeCount++;return {audioCodec:'pcm_s16le'};},
  stage:async()=>{entered++;if(entered===2)resolveBoth();await held;
   return {id:'fixture',size:16044,mime:'audio/wav',durationSeconds:1};}});
 const send=()=>fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body:wav()});
 try{
  const first=send(),second=send();
  await Promise.race([both,new Promise((_,reject)=>setTimeout(()=>reject(Error('owner staging not reached')),5000))]);
  assert.equal(entered,2);assert.equal(probeCount,2);
  const denied=await send();
  assert.equal(denied.status,429);
  assert.equal((await denied.json()).error,'REFERENCE_UPLOAD_BUSY');
  assert.equal(entered,2,'third request must not reach the staging ledger');
  assert.equal(probeCount,2,'third request must not invoke expensive ffprobe');
  releaseStage();
  assert.deepEqual([(await first).status,(await second).status],[201,201]);
  assert.equal((await send()).status,201,'finished owner upload releases the slot');
  assert.equal(entered,3);
 }finally{releaseStage();await x.close();}
});

test('owner admission is released after probe failures and malformed bodies',async()=>{
 let n=0;
 const x=await webServer({probe:async()=>{n++;if(n<=2)throw Error('REFERENCE_MEDIA_PROBE_UNAVAILABLE');return {audioCodec:'pcm_s16le'};}});
 const send=body=>fetch(x.url,{method:'POST',headers:{Authorization:'owner','Content-Type':'audio/wav'},body});
 try{
  assert.equal((await send(wav())).status,503);
  assert.equal((await send(wav())).status,503);
  assert.equal((await send(Buffer.from('not wav'))).status,400);
  assert.equal((await send(wav())).status,201,'probe errors and raw parser denial must release admission');
  assert.equal(n,3);
  assert.equal(x.calls.length,1);
 }finally{await x.close();}
});
