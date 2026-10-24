import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationStudio} from '../server/generation-studio.js';

// Isolated owner-preview contract: real provider, billing and database are NEVER called.
const env={
 AI_STUDIO_ENABLED:'true',AI_STUDIO_WALLET_ENABLED:'true',
 AI_STUDIO_MAX_CALLS:'2',AI_STUDIO_ALLOWED_KINDS:'video',
 GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',ADMIN_EMAIL:'owner@example.test',
 AI_MODEL_PRICING_JSON:JSON.stringify([{model:'veo-3.1-lite-generate-preview',kind:'video',provider:'Google',credits:9,providerCostMicros:1000}])
};
async function exercise({cause='terminal',settlement='held'}){
 const job={id:'video-1',user_id:'owner',kind:'video',status:'processing',operation:'operations/video-1',deleted:false,credits_reserved:9,credits_charged:0,created_at:new Date(),error:null,error_message:null};
 let polls=0,settles=0,creates=0,mediaWrites=0;
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_generation_jobs WHERE id='))return {rows:job.deleted?[]:[{...job}]};
  if(sql.includes('SET last_polled_at=NOW()'))return {rows:[{last_polled_at:new Date()}]};
  if(sql.includes("SET status='failed',credits_reserved=CASE WHEN")){
   job.status='failed';job.credits_reserved=args[1]?0:job.credits_reserved;
   job.error=args[2];job.error_message=args[3]?'AI_WALLET_REVIEW_REQUIRED':null;
   return {rows:[]};
  }
  throw Error('Unexpected SQL in video lifecycle fixture: '+sql.slice(0,100));
 }};
 const wallet={async settle({outcome}){
  settles++;assert.equal(outcome,'confirmed_failure');
  if(settlement==='held')throw Error('fixture wallet unavailable');
  return {status:'released'};
 }};
 const poller=async()=>{
  polls++;
  if(cause==='terminal'){const e=Error('PROVIDER_TASK_FAILED');e.terminal=true;throw e;}
  return {mime:'video/mp4',bytes:Buffer.from('fixture video')};
 };
 const storage={configured:cause==='storage',async putGeneration(){mediaWrites++;throw Error('fixture storage failure');}};
 const app=express();app.use(express.json());
 installGenerationStudio(app,{pool,env,wallet,storage,poller,provider:async()=>{creates++;throw Error('Provider submission must never run');},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/api/studio/jobs/video-1');
  assert.equal(response.status,200);
  const value=await response.json();
  assert.equal(value.status,'failed');assert.equal(value.error,cause==='terminal'?'AI_GENERATION_REJECTED':'AI_STORAGE_FAILED');
  assert.equal(job.credits_reserved,settlement==='released'?0:9);
  assert.equal(job.error_message,settlement==='held'?'AI_WALLET_REVIEW_REQUIRED':null);
  assert.equal(polls,1);assert.equal(settles,1);assert.equal(creates,0);
  assert.equal(mediaWrites,cause==='storage'?1:0);
  const again=await fetch(base+'/api/studio/jobs/video-1');assert.equal((await again.json()).status,'failed');
  assert.equal(polls,1);assert.equal(settles,1);
  if(settlement==='held'){
   const deletion=await fetch(base+'/api/studio/jobs/video-1',{method:'DELETE'});
   assert.equal(deletion.status,409);assert.equal((await deletion.json()).error,'BILLING_REVIEW_REQUIRED');
  }
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}

test('terminal Veo failure retains unsettled wallet credits for owner review',()=>exercise({cause:'terminal',settlement:'held'}));
test('terminal Veo failure clears reserve only after wallet confirms release',()=>exercise({cause:'terminal',settlement:'released'}));
test('failed video storage follows the same guarded wallet and no-retry path',()=>exercise({cause:'storage',settlement:'held'}));
