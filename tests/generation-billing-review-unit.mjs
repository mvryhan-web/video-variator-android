import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationStudio} from '../server/generation-studio.js';

test('owner billing review requires explicit job confirmation and only releases held credits',async()=>{
 const settlements=[],updates=[];
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_admin_audit'))return {rows:[]};
  if(sql.startsWith('INSERT INTO vv_admin_audit('))return {rows:[]};
  if(sql.includes("FROM vv_ai_reservation r JOIN vv_generation_jobs j")&&sql.includes("ORDER BY j.created_at"))return {rows:[{job_id:'job-1',user_id:'user-1',credits:17,kind:'video',provider:'BytePlus',model:'byteplus-seedance-2',status:'failed',error:'GENERATION_FAILED_NO_AUTOMATIC_RETRY',error_message:'AI_WALLET_REVIEW_REQUIRED',created_at:new Date('2026-10-15T08:00:00Z')}]};
  if(sql.includes("WHERE r.job_id=$1")&&sql.includes("AI_WALLET_REVIEW_REQUIRED"))return {rows:args[0]==='job-1'?[{job_id:'job-1',user_id:'user-1',credits:17}]:[]};
  if(sql.startsWith('UPDATE vv_generation_jobs SET credits_reserved=0')){updates.push(args);return {rows:[]};}
  throw new Error(sql);
 }};
 const wallet={async init(){},async settle(v){settlements.push(v);return {status:'released'};}};
 const env={ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationStudio(app,{env,pool,wallet,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(base+'/api/studio/admin/billing-review');assert.equal(r.status,200);let d=await r.json();assert.equal(d.items.length,1);assert.equal(d.items[0].credits,17);
  r=await fetch(base+'/api/studio/admin/billing-review/job-1/release',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmJobId:'wrong',note:'provider did not accept the task'})});assert.equal(r.status,400);assert.equal(settlements.length,0);
  r=await fetch(base+'/api/studio/admin/billing-review/job-1/release',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmJobId:'job-1',note:'provider did not accept the task'})});assert.equal(r.status,200);d=await r.json();assert.equal(d.releasedCredits,17);
  assert.deepEqual(settlements,[{userId:'user-1',jobId:'job-1',outcome:'confirmed_failure'}]);assert.equal(updates.length,1);assert.equal(updates[0][0],'job-1');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
