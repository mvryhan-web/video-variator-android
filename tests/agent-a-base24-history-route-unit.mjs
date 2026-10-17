import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationStudio} from '../server/generation-studio.js';

test('BASE 24/25: user-owned History filters bind kind=$2 and never expose another account',async()=>{
 const fixtures=[
  {id:'owner-photo',user_id:'owner-1',kind:'image',status:'ready',prompt:'Private owner photo',settings:{},deleted:false,created_at:new Date('2026-10-16T08:00:00Z')},
  {id:'owner-video',user_id:'owner-1',kind:'video',status:'processing',prompt:'Owner pending video',settings:{},deleted:false,created_at:new Date('2026-10-16T08:01:00Z')},
  {id:'owner-music',user_id:'owner-1',kind:'music',status:'ready',prompt:'Owner original audio',settings:{},deleted:false,created_at:new Date('2026-10-16T08:02:00Z')},
  {id:'other-music',user_id:'other-2',kind:'music',status:'ready',prompt:'Private other account song',settings:{},deleted:false,created_at:new Date('2026-10-16T08:03:00Z')},
  {id:'other-photo',user_id:'other-2',kind:'image',status:'ready',prompt:'Other private prompt',settings:{},deleted:false,created_at:new Date('2026-10-16T09:00:00Z')}
 ];
 const observed=[],queryTrace=[];
 const pool={async query(sql,args=[]){
  queryTrace.push({statement:sql.slice(0,150),args:[...args]});
  if(sql.includes('CREATE TABLE')||sql.includes('ALTER TABLE')||sql.includes('CREATE INDEX'))return {rows:[]};
  if(sql.startsWith('SELECT id,kind,status,provider,model,prompt,settings,error,result_text,mime,output_assets,created_at')){
   observed.push({sql,args:[...args]});
   assert.match(sql,/WHERE user_id=\$1 AND deleted=false/);
   assert.equal(args.length,sql.includes('kind=$2')?2:1);
   return {rows:fixtures.filter(row=>row.user_id===args[0]&&!row.deleted
     &&(!sql.includes('kind=$2')||row.kind===args[1])
     &&(!sql.includes("status='failed'")||row.status==='failed')
     &&(!sql.includes("status IN ('queued','processing','finalizing')")||['queued','processing','finalizing'].includes(row.status)))};
  }
  throw Error('Unexpected SQL in read-only History test');
 }};
 const app=express();
 const auth=(req,_res,next)=>{req.user={id:String(req.get('X-Test-User')||'owner-1'),email:'owner@example.test',provider:'google'};next();};
 installGenerationStudio(app,{auth,pool,env:{ADMIN_EMAIL:'owner@example.test',NODE_ENV:'test'}});
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const root='http://127.0.0.1:'+server.address().port;
 try{
  for(const [user,kind,expected] of [
   ['owner-1','image','owner-photo'],
   ['owner-1','video','owner-video'],
   ['owner-1','music','owner-music'],
   ['other-2','music','other-music'],
   ['other-2','image','other-photo']
  ]){
   const response=await fetch(root+'/api/studio/jobs?filter='+kind,{headers:{'X-Test-User':user}});
   assert.equal(response.status,200,'History route status; synthetic SQL trace: '+JSON.stringify(queryTrace)+'; body: '+await response.clone().text());
   const body=await response.json();
   assert.deepEqual(body.items.map(item=>item.id),[expected]);
   assert.equal(body.items[0].prompt,fixtures.find(f=>f.id===expected).prompt);
  }
  const owner=await fetch(root+'/api/studio/jobs?filter=all',{headers:{'X-Test-User':'owner-1'}});
  assert.equal(owner.status,200);
  assert.deepEqual((await owner.json()).items.map(item=>item.id),['owner-photo','owner-video','owner-music']);
  const invalid=await fetch(root+'/api/studio/jobs?filter=unknown');
  assert.equal(invalid.status,400);
  assert.ok(observed.some(q=>q.sql.includes('kind=$2')&&q.args[1]==='image'));
  assert.ok(observed.some(q=>q.sql.includes('kind=$2')&&q.args[1]==='video'));
  assert.ok(observed.some(q=>q.sql.includes('kind=$2')&&q.args[1]==='music'));
  assert.ok(observed.every(q=>q.args[0]==='owner-1'||q.args[0]==='other-2'));
 }finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
});
