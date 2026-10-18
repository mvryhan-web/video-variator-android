import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import express from 'express';
import {installGenerationStudio} from '../server/generation-studio.js';
import {objectStorageConfig,createObjectStorage} from '../server/generation-storage.js';

const env={
 AI_OBJECT_STORAGE_ENABLED:'true',
 AI_OBJECT_STORAGE_ENDPOINT:'https://objects.example.test',
 AI_OBJECT_STORAGE_BUCKET:'deepsyq-media',
 AI_OBJECT_STORAGE_REGION:'auto',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'ACCESSKEY123',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'very-secret-storage-key-12345',
 AI_OBJECT_STORAGE_PREFIX:'deepsyq'
};

test('object storage stays disabled unless complete HTTPS config is present',()=>{
 assert.equal(objectStorageConfig({}).configured,false);
 assert.equal(objectStorageConfig({...env,AI_OBJECT_STORAGE_ENDPOINT:'http://objects.example.test'}).configured,false);
 assert.equal(objectStorageConfig({...env,AI_OBJECT_STORAGE_BUCKET:'BAD_BUCKET'}).configured,false);
 assert.equal(objectStorageConfig(env).configured,true);
});

test('storage signs server-side PUT and never exposes secret in URL',async()=>{
 let seen;
 const storage=createObjectStorage({env,now:()=>new Date('2026-10-15T09:00:00.000Z'),fetcher:async(url,opts)=>{seen={url,opts};return {ok:true};}});
 const asset=await storage.putGeneration({userId:'user@example.test',jobId:'123e4567-e89b-12d3-a456-426614174000',mime:'image/png',bytes:Buffer.from('png-bytes')});
 assert.equal(asset.storage,'s3');assert.equal(asset.mime,'image/png');assert.equal(asset.size,9);
 assert.equal(asset.sha256,createHash('sha256').update('png-bytes').digest('hex'));
 assert.match(asset.key,/^deepsyq\/users\/[a-f0-9]{24}\/123e4567-e89b-12d3-a456-426614174000\.png$/);
 assert.equal(seen.opts.method,'PUT');assert.equal(seen.opts.redirect,'error');assert.match(seen.opts.headers.Authorization,/AWS4-HMAC-SHA256 Credential=ACCESSKEY123\//);
 assert.ok(!seen.url.includes(env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY));assert.ok(!JSON.stringify(seen.opts.headers).includes(env.AI_OBJECT_STORAGE_SECRET_ACCESS_KEY));
});

test('storage GET enforces maximum response size and DELETE is signed',async()=>{
 const calls=[];
 const stream=bytes=>new ReadableStream({start(c){c.enqueue(bytes);c.close();}});
 const storage=createObjectStorage({env,fetcher:async(url,opts)=>{calls.push({url,opts});if(opts.method==='GET')return {ok:true,body:stream(new Uint8Array([1,2,3]))};return {ok:true};}});
 const bytes=await storage.get('deepsyq/users/abc/file.png',{maxBytes:4});assert.deepEqual([...bytes],[1,2,3]);
 await storage.delete('deepsyq/users/abc/file.png');assert.deepEqual(calls.map(x=>x.opts.method),['GET','DELETE']);
});

test('BASE #11 verified object retrieval rejects altered bytes, but preserves checksum-free legacy objects',async()=>{
 const original=Buffer.from('provider-generated-result');
 const digest=createHash('sha256').update(original).digest('hex');
 let body=Buffer.from(original),gets=0;
 const stream=bytes=>new ReadableStream({start(c){c.enqueue(bytes);c.close();}});
 const storage=createObjectStorage({env,fetcher:async(_url,opts)=>{
  if(opts.method==='GET'){gets++;return {ok:true,body:stream(body)};}
  return {ok:true};
 }});
 const key='deepsyq/users/abc/job.mp3';
 assert.deepEqual(await storage.get(key,{expectedSha256:digest}),original);
 body=Buffer.from('tampered-external-object');
 await assert.rejects(()=>storage.get(key,{expectedSha256:digest}),/OBJECT_STORAGE_CHECKSUM_MISMATCH/);
 assert.deepEqual(await storage.get(key),body); // explicitly legacy, unverified path
 await assert.rejects(()=>storage.get(key,{expectedSha256:'not-a-real-digest'}),/OBJECT_STORAGE_INVALID_CHECKSUM/);
 assert.equal(gets,3); // invalid checksum rejected before any S3 request
});

test('BASE #11 authenticated job media passes recorded checksum to S3 and refuses mismatch',async()=>{
 const digest=createHash('sha256').update('good-media').digest('hex');
 const job={id:'job-1',user_id:'owner-1',kind:'image',status:'ready',provider:'Google',
  output_assets:[{storage:'s3',key:'deepsyq/users/owner/job-1.png',mime:'image/png',sha256:digest}],
  mime:'image/png',media:null,deleted:false};
 let verify,attempts=0;
 const mock={configured:true,async get(key,opts){
  attempts++;verify={key,opts};if(opts.expectedSha256!==digest)throw Error('OBJECT_STORAGE_INVALID_CHECKSUM');
  return Buffer.from('good-media');
 }};
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_generation_jobs'))return {rows:args[0]===job.id&&args[1]===job.user_id?[job]:[]};
  throw Error('Unexpected DB query: '+sql.slice(0,80));
 }};
 const app=express();app.use(express.json());
 installGenerationStudio(app,{pool,storage:mock,env:{ADMIN_EMAIL:'owner@example.test',
  GEMINI_API_KEY:'fixture',AI_STUDIO_ENABLED:'true',AI_STUDIO_ALLOWED_KINDS:'image',
  AI_STUDIO_MAX_CALLS:'2',DATABASE_URL:'fixture'},
  auth:(req,_res,next)=>{req.user={id:'owner-1',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/studio/jobs/job-1/media';
  const r=await fetch(url);
  assert.equal(r.status,200);
  assert.equal((await r.arrayBuffer()).byteLength,10);
  assert.equal(verify.opts.expectedSha256,digest);
  assert.equal(attempts,1);
  job.output_assets[0].sha256='corrupt-hash';
  const bad=await fetch(url);
  assert.equal(bad.status,503);
  assert.equal((await bad.json()).error,'STUDIO_STORAGE_UNAVAILABLE'); // no corrupted bytes leaked
  assert.equal(attempts,2);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
