import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {installGenerationStudio} from '../server/generation-studio.js';

test('BASE 24/25: user-owned History filters bind kind=$2 and never expose another account',async()=>{
 const fixtures=[
  {id:'owner-photo',user_id:'owner-1',kind:'image',status:'ready',prompt:'Private owner photo',settings:{},deleted:false,created_at:new Date('2026-10-16T08:00:00Z')},
  {id:'owner-video',user_id:'owner-1',kind:'video',status:'processing',prompt:'Owner pending video',settings:{},deleted:false,created_at:new Date('2026-10-16T08:01:00Z')},
  {id:'owner-music',user_id:'owner-1',kind:'music',status:'ready',prompt:'Owner original audio',settings:{},deleted:false,created_at:new Date('2026-10-16T08:02:00Z')},
  {id:'owner-failed',user_id:'owner-1',kind:'image',status:'failed',prompt:'Owner failed draft',settings:{},deleted:false,created_at:new Date('2026-10-16T08:04:00Z')},
  {id:'owner-deleted',user_id:'owner-1',kind:'image',status:'ready',prompt:'PRIVATE DELETED IMAGE',settings:{},deleted:true,created_at:new Date('2026-10-16T08:05:00Z')},
  {id:'other-music',user_id:'other-2',kind:'music',status:'ready',prompt:'Private other account song',settings:{},deleted:false,created_at:new Date('2026-10-16T08:03:00Z')},
  {id:'other-photo',user_id:'other-2',kind:'image',status:'ready',prompt:'Other private prompt',settings:{},deleted:false,created_at:new Date('2026-10-16T09:00:00Z')}
 ];
 const observed=[],queryTrace=[];
 const pool={async query(sql,args=[]){
  queryTrace.push({statement:sql.slice(0,150),args:[...args]});
  if(sql.includes('CREATE TABLE')||sql.includes('ALTER TABLE')||sql.includes('CREATE INDEX'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_generation_jobs WHERE id=$1 AND user_id=$2 AND deleted=false')){
   const selected=fixtures.find(row=>row.id===args[0]&&row.user_id===args[1]&&!row.deleted);
   return {rows:selected?[{...selected,mime:'image/png',media:Buffer.from('PRIVATE '+selected.id),output_assets:[]}]:[]};
  }
  if(sql.startsWith('SELECT id,kind,status,provider,model,prompt,settings,error,result_text,mime,output_assets,created_at')){
   observed.push({sql,args:[...args]});
   assert.match(sql,/WHERE user_id=\$1 AND deleted=false/);
   assert.equal(args.length,sql.includes('kind=$2')?3:2);
   assert.match(sql,/ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET \$[23]/);
   assert.equal(args.at(-1)%50,0);
   return {rows:fixtures.filter(row=>row.user_id===args[0]&&!row.deleted
     &&(!sql.includes('kind=$2')||row.kind===args[1])
     &&(!sql.includes("status='failed'")||row.status==='failed')
     &&(!sql.includes("status IN ('queued','processing','finalizing')")||['queued','processing','finalizing'].includes(row.status))).sort((a,b)=>b.created_at-a.created_at||String(b.id).localeCompare(String(a.id)))
     .slice(args.at(-1),args.at(-1)+51)};
  }
  throw Error('Unexpected SQL in read-only History test');
 }};
 const app=express();
 const auth=(req,_res,next)=>{req.user={id:String(req.get('X-Test-User')||'owner-1'),email:'owner@example.test',provider:'google'};next();};
 // Harmless, offline config is needed to pass the Studio availability gate.
 // The injected pool is synthetic and the test invokes GET routes only: no
 // real PostgreSQL connection, credential, AI provider or paid job is used.
 installGenerationStudio(app,{auth,pool,env:{
  ADMIN_EMAIL:'owner@example.test',NODE_ENV:'test',AI_STUDIO_ENABLED:'true',
  AI_STUDIO_MAX_CALLS:'1',GEMINI_API_KEY:'OFFLINE_TEST_ONLY_NO_PROVIDER_CALLS',
  DATABASE_URL:'postgresql://offline.invalid/never_connected'
 }});
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
   assert.equal(response.headers.get('cache-control'),'private, no-store');
   const body=await response.json();
   assert.deepEqual(body.items.map(item=>item.id),kind==='image'&&user==='owner-1'?['owner-failed','owner-photo']:[expected]);
   assert.equal(body.items.find(item=>item.id===expected)?.prompt,fixtures.find(f=>f.id===expected).prompt);
  }
  const owner=await fetch(root+'/api/studio/jobs?filter=all',{headers:{'X-Test-User':'owner-1'}});
  assert.equal(owner.status,200);
  assert.equal(owner.headers.get('cache-control'),'private, no-store');
  assert.deepEqual((await owner.json()).items.map(item=>item.id),['owner-failed','owner-music','owner-video','owner-photo']);
  for(const [filter,ids] of [
   ['failed',['owner-failed']],
   ['processing',['owner-video']]
  ]){
   const response=await fetch(root+'/api/studio/jobs?filter='+filter,{headers:{'X-Test-User':'owner-1'}});
   assert.equal(response.status,200);
   const payload=await response.json();
   assert.deepEqual(payload.items.map(row=>row.id),ids);
   assert.ok(payload.items.every(row=>!row.prompt.includes('PRIVATE DELETED')));
  }
  // Cache prevention applies to user-specific metadata AND binary results; no
  // private image bytes or prompts may be reused from another signed-in owner.
  for(const [user,jobId,status] of [
   ['owner-1','owner-photo',200],
   ['other-2','owner-photo',404],
   ['other-2','other-photo',200],
   ['owner-1','other-photo',404],
   ['owner-1','owner-deleted',404]
  ]){
   for(const suffix of ['', '/media']){
    const response=await fetch(root+'/api/studio/jobs/'+jobId+suffix,{headers:{'X-Test-User':user}});
    assert.equal(response.status,status,'private saved History result '+user+'/'+jobId+suffix);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    if(status===200&&suffix==='/media'){
     assert.equal(response.headers.get('content-type'),'image/png');
     assert.equal(await response.text(),'PRIVATE '+jobId);
    }
    if(status===200&&!suffix){
     const body=await response.json();
     assert.equal(body.id,jobId);
     assert.equal(body.prompt,fixtures.find(f=>f.id===jobId).prompt);
    }
   }
  }
  const invalid=await fetch(root+'/api/studio/jobs?filter=unknown');
  assert.equal(invalid.status,400);
  for(const offset of ['-1','2','51','999999','abc','0%20OR%201=1']){
   const bad=await fetch(root+'/api/studio/jobs?filter=all&offset='+offset,{headers:{'X-Test-User':'owner-1'}});
   assert.equal(bad.status,400,'reject unbounded or non-page History offset '+offset);
   assert.equal((await bad.json()).error,'INVALID_HISTORY_OFFSET');
  }
  const older=await fetch(root+'/api/studio/jobs?filter=all&offset=50',{headers:{'X-Test-User':'owner-1'}});
  assert.equal(older.status,200);
  assert.deepEqual((await older.json()).items,[]);
  assert.ok(observed.some(q=>q.sql.includes('OFFSET $3')&&q.args[1]==='image'&&q.args[2]===0));
  assert.ok(observed.some(q=>q.sql.includes('OFFSET $2')&&q.args[1]===50));
  assert.ok(observed.some(q=>q.sql.includes('kind=$2')&&q.args[1]==='image'));
  assert.ok(observed.some(q=>q.sql.includes('kind=$2')&&q.args[1]==='video'));
  assert.ok(observed.some(q=>q.sql.includes('kind=$2')&&q.args[1]==='music'));
  assert.ok(observed.every(q=>q.args[0]==='owner-1'||q.args[0]==='other-2'));
 }finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
});
