// Isolated BASE Video acceptance: real PostgreSQL + fake private S3, never production.
// Uses only AI_TEST_DATABASE_URL=postgres://...@127.0.0.1:5432/vv_ai_test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import pg from 'pg';
import express from 'express';
import {createObjectStorage} from '../server/generation-storage.js';
import {createGenerationReferenceLedger} from '../server/generation-reference-ledger.js';
import {installGenerationReferenceUpload} from '../server/generation-reference-upload.js';
import {createSeedanceStagedReferenceInspector} from '../server/generation-reference-inspector.js';
import {createSeedanceAudioPayloadPreparer} from '../server/generation-reference-audio-payload.js';
import {createSeedanceVideoTransferPlanner} from '../server/generation-reference-video-transfer.js';

const url=process.env.AI_TEST_DATABASE_URL||'';
function localFixtureDatabase(){
 try{
  const u=new URL(url);
  return u.protocol==='postgres:'&&['127.0.0.1','localhost'].includes(u.hostname)&&u.pathname==='/vv_ai_test';
 }catch(_){return false;}
}
function wav(seconds=1){
 const samples=Buffer.alloc(16000*seconds),fmt=Buffer.alloc(16);
 fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(8000,4);
 fmt.writeUInt32LE(16000,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 const sub=Buffer.alloc(8);sub.write('data');sub.writeUInt32LE(samples.length,4);
 const riff=Buffer.concat([Buffer.from('WAVEfmt '),Buffer.from([16,0,0,0]),fmt,sub,samples]);
 const header=Buffer.alloc(8);header.write('RIFF');header.writeUInt32LE(riff.length,4);
 return Buffer.concat([header,riff]);
}
const fixtureEnv=()=>({
 AI_STUDIO_ENABLED:'true',
 AI_STUDIO_REFERENCE_UPLOAD_ENABLED:'true',
 AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',
 AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',
 AI_STUDIO_REFERENCE_TTL_MINUTES:'5',
 AI_OBJECT_STORAGE_ENABLED:'true',
 AI_OBJECT_STORAGE_ENDPOINT:'https://private-storage.example.com',
 AI_OBJECT_STORAGE_BUCKET:'deepsyq-ci-private',
 AI_OBJECT_STORAGE_REGION:'auto',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'REFERENCE_FIXTURE_KEY',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'reference-fixture-only-not-a-real-secret',
 AI_OBJECT_STORAGE_PREFIX:'deepsyq-ci'
});
test('private media lifecycle: real isolated PostgreSQL, HTTP admission and fake signed S3',async t=>{
 if(!url){t.skip('AI_TEST_DATABASE_URL unavailable: no persistent database is used');return;}
 assert.equal(localFixtureDatabase(),true,'REFUSING to connect to a non-fixture database');
 const schema='ref_ci_'+randomUUID().replaceAll('-','');
 const admin=new pg.Pool({connectionString:url});
 let pool,server;
 try{
  await admin.query('CREATE SCHEMA '+schema);
  pool=new pg.Pool({connectionString:url,options:'-c search_path='+schema});
  const searchPath=(await pool.query('SHOW search_path')).rows[0].search_path;
  assert.equal(searchPath,schema,'test connections must use their own schema');
  const migration=await readFile(new URL('../server/migrations/20261015-generation-reference-assets.sql',import.meta.url),'utf8');
  await pool.query(migration);
  await pool.query(migration); // repeatable migration, no edits to checksummed source
  const env=fixtureEnv(),objects=new Map(),calls=[];
  let failDelete=0,failPut=0;
  const storage=createObjectStorage({env,fetcher:async (url,opts)=>{
   const target=String(url);
   assert.ok(target.startsWith('https://private-storage.example.com/deepsyq-ci-private/'));
   assert.match(String(opts.headers?.Authorization),/^AWS4-HMAC-SHA256 /);
   assert.equal(opts.redirect,'error');
   calls.push({method:opts.method,url:target});
   if(opts.method==='PUT'){
    objects.set(target,Buffer.from(opts.body));
    if(failPut-->0)throw Error('AMBIGUOUS_S3_PUT_AFTER_WRITING');
    return new Response(null,{status:200});
   }
   if(opts.method==='GET'){
    const bytes=objects.get(target);
    return bytes?new Response(bytes,{status:200}):new Response(null,{status:404});
   }
   if(opts.method==='DELETE'){
    if(failDelete-->0)throw Error('TRANSIENT_S3_DELETE_FAILURE');
    objects.delete(target);
    return new Response(null,{status:204});
   }
   throw Error('UNEXPECTED_STORAGE_METHOD');
  }});
  assert.equal(storage.configured,true);
  const ledger=createGenerationReferenceLedger({pool,storage,env,maxActiveUploads:2});
  const app=express();
  const auth=(req,res,next)=>{
   const token=String(req.headers.authorization||'');
   if(!token.startsWith('Bearer '))return res.status(401).json({error:'AUTH_REQUIRED'});
   req.user={id:token.slice(7),provider:'google'};next();
  };
  const owner=(req,res,next)=>req.user.id==='alice'?next():res.status(403).json({error:'OWNER_PILOT_ONLY'});
  installGenerationReferenceUpload(app,{auth,owner,pool,storage,env,ledger});
  server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const endpoint='http://127.0.0.1:'+server.address().port+'/api/studio/references';
  const upload=(who='alice')=>fetch(endpoint,{method:'POST',
   headers:{Authorization:'Bearer '+who,'Content-Type':'audio/wav'},body:wav()});

  await t.test('route accepts verified WAV, stores owner-specific file; other owners cannot read it',async()=>{
   assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'audio/wav'},body:wav()})).status,401);
   assert.equal((await upload('mallory')).status,403);
   const response=await upload();
   assert.equal(response.status,201);
   const data=await response.json();
   assert.equal(data.stagedOnly,true);assert.equal(data.providerReady,false);
   assert.equal(data.asset.mime,'audio/wav');assert.equal(data.asset.url,undefined);
   const bytes=await ledger.get({userId:'alice',id:data.asset.id});
   assert.deepEqual(bytes,wav());
   await assert.rejects(()=>ledger.get({userId:'mallory',id:data.asset.id}),/REFERENCE_MEDIA_ACCESS_DENIED/);
   const row=(await pool.query('SELECT status,user_id,storage_key FROM vv_generation_reference_assets WHERE id=$1',[data.asset.id])).rows[0];
   assert.equal(row.status,'ready');assert.equal(row.user_id,'alice');
   assert.ok(!row.storage_key.includes('alice'),'object key must use hashed owner');
   assert.equal(objects.size,1);
  });
  await t.test('model preflight re-reads actual private bytes and refuses too-short WAV',async()=>{
   const row=(await pool.query("SELECT id FROM vv_generation_reference_assets WHERE status='ready' LIMIT 1")).rows[0];
   assert.ok(row?.id);
   const inspector=createSeedanceStagedReferenceInspector({ledger});
   const result=await inspector.inspect({userId:'alice',model:'byteplus-seedance-2',imageCount:1,audioAssetIds:[row.id]});
   assert.deepEqual(result,{compatible:false,reason:'REFERENCE_AUDIO_INCOMPATIBLE'});
   await assert.rejects(()=>inspector.inspect({userId:'mallory',model:'byteplus-seedance-2',imageCount:1,audioAssetIds:[row.id]}),/REFERENCE_MEDIA_ACCESS_DENIED/);
  });
  await t.test('parallel owner uploads obey a transactional two-slot quota',async()=>{
   const outcomes=await Promise.all([upload(),upload(),upload()]);
   assert.deepEqual(outcomes.map(r=>r.status).sort((a,b)=>a-b),[201,429,429]);
   const count=(await pool.query('SELECT COUNT(*)::int AS n FROM vv_generation_reference_assets')).rows[0].n;
   assert.equal(count,2);
   assert.equal(objects.size,2);
  });
  await t.test('cleanup continues when intake is switched OFF; retries a failed S3 delete',async()=>{
   env.AI_STUDIO_REFERENCE_STAGING_ENABLED='false';
   const off=await upload();assert.equal(off.status,503);
   await pool.query("UPDATE vv_generation_reference_assets SET created_at=NOW()-INTERVAL '1 hour',expires_at=NOW()-INTERVAL '1 minute'");
   failDelete=1;
   const first=await ledger.cleanupExpired();
   assert.deepEqual(first,{claimed:2,deleted:1,failed:1});
   assert.equal(objects.size,1);
   const retry=await ledger.cleanupExpired();
   assert.deepEqual(retry,{claimed:1,deleted:1,failed:0});
   assert.equal(objects.size,0);
   assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM vv_generation_reference_assets')).rows[0].n,0);
  });
  await t.test('ambiguous PUT remains recorded and can be cleaned after its expiry',async()=>{
   env.AI_STUDIO_REFERENCE_STAGING_ENABLED='true';
   failPut=1;
   const failed=await upload();
   assert.equal(failed.status,503);
   assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM vv_generation_reference_assets WHERE status='failed'")).rows[0].n,1);
   assert.equal(objects.size,1,'failed response may still leave S3 bytes that need cleanup');
   await pool.query("UPDATE vv_generation_reference_assets SET created_at=NOW()-INTERVAL '1 hour',expires_at=NOW()-INTERVAL '1 minute'");
   env.AI_STUDIO_REFERENCE_STAGING_ENABLED='false';
   assert.deepEqual(await ledger.cleanupExpired(),{claimed:1,deleted:1,failed:0});
   assert.equal(objects.size,0);
   assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM vv_generation_reference_assets')).rows[0].n,0);
  });
  await t.test('real private S3 WAV round trip builds bounded offline ModelArk audio, not a paid request',async()=>{
   env.AI_STUDIO_REFERENCE_STAGING_ENABLED='true';
   const original=wav(3);
   const staged=await ledger.stage({userId:'alice',mime:'audio/wav',bytes:original});
   const payloadEnv={...env,AI_STUDIO_REFERENCE_AUDIO_PAYLOAD_ENABLED:'true',
    AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true'};
   const preparer=createSeedanceAudioPayloadPreparer({ledger,env:payloadEnv,
    verifyVisualContext:async({userId,model})=>{
     assert.equal(typeof userId,'string');assert.equal(model,'byteplus-seedance-2');return 1;
    }});
   const data=await preparer.prepare({userId:'alice',model:'byteplus-seedance-2',audioAssetIds:[staged.id]});
   assert.equal(data.providerSubmitted,false);assert.equal(data.content.length,1);
   assert.equal(data.content[0].role,'reference_audio');
   assert.deepEqual(Buffer.from(data.content[0].audio_url.url.split(',')[1],'base64'),original);
   await assert.rejects(()=>preparer.prepare({userId:'mallory',model:'byteplus-seedance-2',audioAssetIds:[staged.id]}),/REFERENCE_MEDIA_ACCESS_DENIED/);
   await pool.query("UPDATE vv_generation_reference_assets SET created_at=NOW()-INTERVAL '1 hour',expires_at=NOW()-INTERVAL '1 minute'");
   env.AI_STUDIO_REFERENCE_STAGING_ENABLED='false';
   assert.deepEqual(await ledger.cleanupExpired(),{claimed:1,deleted:1,failed:0});
   assert.equal(objects.size,0);
  });
  await t.test('real stored H264 MP4 yields owner-only, 30-second signed GET but no provider dispatch',async()=>{
   env.AI_STUDIO_REFERENCE_STAGING_ENABLED='true';
   env.AI_STUDIO_REFERENCE_VIDEO_PRESIGN_ENABLED='true';
   env.AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED='true';
   env.AI_STUDIO_REFERENCE_PROVIDER_FETCH_HOSTS='private-storage.example.com';
   const tmp=await mkdtemp(join(tmpdir(),'deepsyq-mp4-ci-'));
   try{
    const file=join(tmp,'reference.mp4');
    const ff=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=854x480:r=24',
     '-t','3','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',file],
     {timeout:20000,encoding:'utf8'});
    assert.equal(ff.status,0,ff.stderr||'ffmpeg unavailable');
    const original=await readFile(file);
    const staged=await ledger.stage({userId:'alice',mime:'video/mp4',bytes:original});
    const inspector=createSeedanceStagedReferenceInspector({ledger});
    const planner=createSeedanceVideoTransferPlanner({ledger,storage,inspector,env});
    const result=await planner.prepare({userId:'alice',model:'byteplus-seedance-2',videoAssetIds:[staged.id]});
    assert.equal(result.providerSubmitted,false);
    assert.equal(result.content[0].role,'reference_video');
    const signed=new URL(result.content[0].video_url.url);
    assert.equal(signed.hostname,'private-storage.example.com');
    assert.equal(signed.searchParams.get('X-Amz-Expires'),'30');
    assert.ok(signed.searchParams.get('X-Amz-Signature'));
    assert.equal(result.content.length,1);
    await assert.rejects(()=>ledger.getForVideoTransfer({userId:'mallory',id:staged.id}),/REFERENCE_MEDIA_ACCESS_DENIED/);
    // Once the row expires, another signed candidate must never be issued.
    await pool.query("UPDATE vv_generation_reference_assets SET created_at=NOW()-INTERVAL '1 hour',expires_at=NOW()-INTERVAL '1 minute'");
    await assert.rejects(()=>ledger.getForVideoTransfer({userId:'alice',id:staged.id}),/REFERENCE_MEDIA_ACCESS_DENIED/);
    env.AI_STUDIO_REFERENCE_STAGING_ENABLED='false';
    assert.deepEqual(await ledger.cleanupExpired(),{claimed:1,deleted:1,failed:0});
    assert.equal(objects.size,0);
   }finally{await rm(tmp,{recursive:true,force:true});}
  });
  await t.test('reference transport never used provider/wallet and only private S3 verbs',()=>{
   assert.ok(calls.some(x=>x.method==='PUT'));
   assert.ok(calls.some(x=>x.method==='GET'));
   assert.ok(calls.some(x=>x.method==='DELETE'));
   assert.ok(calls.every(x=>['PUT','GET','DELETE'].includes(x.method)));
  });
 }finally{
  if(server)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  if(pool)await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
