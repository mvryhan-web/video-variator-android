import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import express from 'express';
import {ownerProviderTaskId} from '../server/generation-provider-task-id.js';
import {installGenerationStudio} from '../server/generation-studio.js';

test('BASE #10 owner provider task IDs allow native IDs only',()=>{
 assert.equal(ownerProviderTaskId('BytePlus','task_123-abc'),'task_123-abc');
 assert.equal(ownerProviderTaskId('Google','operations/sample_01'),'operations/sample_01');
 assert.equal(ownerProviderTaskId('Google','models/veo-3.1-lite-generate-preview/operations/abc'),'models/veo-3.1-lite-generate-preview/operations/abc');
 for(const [provider,id] of [
  ['BytePlus','https://private.example.test/?key=secret'],['Google','operations/../../foo'],
  ['Google','operations/foo?token=abc'],['BytePlus','foo/bar'],
  ['Unknown','operations/foo'],['Google','operations/'+('x'.repeat(600))]
 ])assert.equal(ownerProviderTaskId(provider,id),null);
});

test('BASE #10 existing SQL column retains task references after terminal jobs',async()=>{
 const [src,schema]=await Promise.all([
  readFile(new URL('../server/generation-studio.js',import.meta.url),'utf8'),
  readFile(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8')
 ]);
 assert.match(schema,/provider_task_id TEXT GENERATED ALWAYS AS/);
 assert.match(src,/SELECT id,user_id,operation FROM vv_generation_jobs WHERE status='processing' AND operation IS NOT NULL/);
 assert.match(src,/SET status='ready',mime=\$2/);
 assert.match(src,/SET status='finalizing',mime=\$2/);
 assert.doesNotMatch(src,/SET status='ready',operation=null/);
 assert.doesNotMatch(src,/SET status='finalizing',operation=null/);
});

test('BASE #10 only authenticated owner sees provider ID; History does not expose it',async()=>{
 const env={ADMIN_EMAIL:'owner@example.test',AI_STUDIO_ENABLED:'true',GEMINI_API_KEY:'fixture',DATABASE_URL:'fixture',AI_STUDIO_MAX_CALLS:'2',AI_STUDIO_ALLOWED_KINDS:'video'};
 const jobs=[
  {id:'j1',user_id:'owner',kind:'video',status:'ready',provider:'BytePlus',provider_task_id:'task_1',model:'byteplus-seedance-2'},
  {id:'j2',user_id:'owner',kind:'video',status:'ready',provider:'Google',provider_task_id:'operations/task_2',model:'veo-3.1-lite-generate-preview'},
  {id:'j3',user_id:'owner',kind:'video',status:'failed',provider:'Google',provider_task_id:'https://evil.test/?token=secret',model:'veo-3.1-lite-generate-preview'}
 ].map(x=>({...x,created_at:new Date(),settings:{},output_assets:[],credits_reserved:0,credits_charged:0}));
 let paidCalls=0;
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_generation_jobs'))return {rows:[]};
  if(sql.startsWith('SELECT j.id,j.user_id')){assert.match(sql,/j.provider_task_id/);return {rows:jobs};}
  if(sql.startsWith('SELECT id,kind,status'))return {rows:jobs.filter(x=>x.user_id===args[0])};
  throw Error('Unexpected SQL: '+sql.slice(0,100));
 }};
 const app=express();app.use(express.json());
 installGenerationStudio(app,{pool,env,provider:async()=>{paidCalls++;throw Error('no provider calls');},auth:(req,_res,next)=>{
  req.user=req.headers['x-not-owner']?{id:'other',provider:'email',email:'other@example.test'}:
   {id:'owner',provider:'google',email:'owner@example.test'};next();
 }});
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  let r=await fetch(base+'/api/studio/admin/jobs');assert.equal(r.status,200);
  const owner=await r.json();
  assert.deepEqual(owner.items.map(x=>x.providerTaskId),['task_1','operations/task_2',null]);
  assert.equal(JSON.stringify(owner).includes('secret'),false);
  r=await fetch(base+'/api/studio/admin/jobs',{headers:{'x-not-owner':'true'}});assert.equal(r.status,403);
  r=await fetch(base+'/api/studio/jobs');assert.equal(r.status,200);
  const history=await r.json();assert.equal(JSON.stringify(history).includes('providerTaskId'),false);
  assert.equal(JSON.stringify(history).includes('task_1'),false);
  assert.equal(paidCalls,0);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
