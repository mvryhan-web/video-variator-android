// Disposable PostgreSQL16 + actual Express GET and recoveryTick, with only
// synthetic HTTP/provider objects. No live Stripe/AI/provider/production calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import express from 'express';
import pg from 'pg';
import {installGenerationStudio} from '../server/generation-studio.js';
const url=process.env.P0_PURCHASED_TEST_DB_URL;
if(url){const u=new URL(url);if(!['127.0.0.1','localhost','::1'].includes(u.hostname)||u.pathname!=='/deepsyq_purchased_test')throw Error('DISPOSABLE_POSTGRES_ONLY');}
const jobSql=readFileSync(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8');
const consentSql=readFileSync(new URL('../server/migrations/20261020-ai-user-consent.sql',import.meta.url),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const bounded=async(p,ms=2700)=>{let timer;try{return await Promise.race([p,new Promise((_,rej)=>{timer=setTimeout(()=>rej(Error('P0_POLL_POOL_DEADLOCK')),ms);})]);}finally{clearTimeout(timer);}};
const env={AI_STUDIO_ENABLED:'true',AI_STUDIO_MAX_CALLS:'3',
 AI_STUDIO_BACKGROUND_POLLING:'true',AI_STUDIO_POLL_INTERVAL_MS:'5000',
 DATABASE_URL:'test-only-no-production',GEMINI_API_KEY:'synthetic-only',ADMIN_EMAIL:'owner@example.test'};
for(const max of [1,2])test('P0 actual GET and worker revoke polling, disposable PG16 pool.max='+max,
 {skip:!url,timeout:30000},async()=>{
 const schema='poll_p0_'+randomUUID().replaceAll('-','');
 const admin=new pg.Client({connectionString:url});await admin.connect();await admin.query('CREATE SCHEMA '+schema);
 const pool=new pg.Pool({connectionString:url,options:'-c search_path='+schema,max,connectionTimeoutMillis:2500});
 let server;
 try{
  await pool.query('CREATE TABLE vv_users(id TEXT PRIMARY KEY)');
  await pool.query(jobSql);
  await pool.query(consentSql);
  for(const id of ['a','b'])await pool.query('INSERT INTO vv_users(id) VALUES($1)',[id]);
  await pool.query("INSERT INTO vv_ai_user_consents(user_id,terms_version,privacy_version,provider_data_version,provider_data_accepted) VALUES('a','2026-10-20','2026-10-20','2026-10-20',true)");
  const job='video-'+max;
  await pool.query("INSERT INTO vv_generation_jobs(id,user_id,kind,status,provider,model,operation,prompt,credits_reserved) VALUES($1,'a','video','processing','Google','veo-3.1','operations/fake_task','local-only',7)",[job]);
  const app=express();app.use(express.json());
  let calls=0,signalCount=0,active=null;
  const poller=async(_operation,{signal})=>{
   calls++;assert.ok(signal,'poll must receive shared consent abort signal');
   signal.throwIfAborted();signalCount++;
   if(active){active.enter.resolve();await active.release.promise;signal.throwIfAborted();}
   return {pending:true};
  };
  const studio=installGenerationStudio(app,{pool,env,auth:(req,_res,next)=>{
   const id=req.headers['x-mock-user']==='b'?'b':'a';
   req.user={id,provider:'google',email:'owner@example.test'};
   next();
  },poller});
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const prefix='http://127.0.0.1:'+server.address().port+'/api/studio';
  const get=(who='a')=>fetch(prefix+'/jobs/'+job,{headers:{'x-mock-user':who}});
  const consent=async accepted=>fetch(prefix+'/consent',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({version:'2026-10-20',termsAccepted:true,privacyAcknowledged:true,providerAccepted:accepted})});
  let res=await bounded(get('b'));
  assert.equal(res.status,404,'other user may not inspect A-owned paid operation');
  assert.equal(calls,0);
  active={enter:deferred(),release:deferred()};
  const current=bounded(get());
  await bounded(active.enter.promise);
  let revokeAck=false;
  const revoke=bounded(consent(false)).then(async response=>{revokeAck=response.ok;return response;});
  await sleep(35);
  assert.equal(revokeAck,false,'revoke ACK must not overtake in-flight provider status request');
  active.release.resolve();
  res=await current;assert.equal(res.status,200);
  assert.equal((await bounded(revoke)).status,200);
  active=null;
  assert.equal(calls,1);
  res=await bounded(get());const denied=await res.json();
  assert.equal(res.status,200);assert.equal(denied.status,'unknown');
  assert.equal(denied.error,'PROVIDER_CONSENT_REQUIRED');
  assert.equal(calls,1,'HTTP GET after revoke ACK must not invoke provider polling');
  await bounded(studio.recoveryTick());
  assert.equal(calls,1,'recovery worker must not invoke provider polling after revoke');
  const preserved=(await pool.query('SELECT status,operation,credits_reserved,credits_charged FROM vv_generation_jobs WHERE id=$1',[job])).rows[0];
  assert.equal(preserved.status,'processing');assert.equal(preserved.operation,'operations/fake_task');
  assert.equal(preserved.credits_reserved,7);assert.equal(preserved.credits_charged,0);
  res=await bounded(consent(true));assert.equal(res.status,200);
  await pool.query('UPDATE vv_generation_jobs SET last_polled_at=NULL WHERE id=$1',[job]);
  res=await bounded(get());assert.equal(res.status,200);
  assert.equal((await res.json()).status,'processing');
  assert.equal(calls,2,'restored consent allows polling SAME operation, not re-submitting paid AI');
  assert.equal(signalCount,2);
  await pool.query('UPDATE vv_generation_jobs SET last_polled_at=NULL WHERE id=$1',[job]);
  await bounded(studio.recoveryTick());
  assert.equal(calls,3,'worker resumes original status operation after renewed consent');
  studio.stopRecovery();
 }finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await pool.end();
  await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE').catch(()=>{});
  await admin.end();
 }
});
