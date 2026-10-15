import test from 'node:test';
import assert from 'node:assert/strict';
import { installProductWatcher, isWatcherOwner } from '../server/product-watcher/admin-api.js';

const env = {PRODUCT_WATCHER_ENABLED:'true',NODE_ENV:'production',APP_URL:'https://deepsyq.example/',ADMIN_EMAIL:'owner@example.test'};
const owner={id:'owner-1',provider:'google',email:'OWNER@example.test'};
const denied={id:'visitor',provider:'email',email:'owner@example.test'};

function fakeApp(){
 const routes=new Map();
 const app={get:(path,...fns)=>routes.set('GET '+path,fns),post:(path,...fns)=>routes.set('POST '+path,fns)};
 async function call(method,path,{user=owner,body={}}={}){
  const handlers=routes.get(method+' '+path);
  assert.ok(handlers,method+' '+path+' exists');
  const req={user,body},res={statusCode:200,body:null,status(n){this.statusCode=n;return this;},json(data){this.body=data;return data;}};
  async function dispatch(index=0){ if(index>=handlers.length)return;return handlers[index](req,res,()=>dispatch(index+1));}
  await dispatch();return res;
 }
 return {app,call,routes};
}

function db({paused=false,missing=false}={}){
 const seen=[];
 const query=async(sql,args)=>{
  seen.push([sql,args]);
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_admin_audit'))return{rows:[]};
  if(sql.startsWith('SELECT paused, updated_at'))return{rows:missing?[]:[{paused,updated_at:'2026-10-15T00:00:00Z'}]};
  if(sql.startsWith('SELECT heartbeat_at FROM vv_product_watcher_scheduler'))return{rows:[{heartbeat_at:null}]};
  if(sql.startsWith('SELECT id,source,code,severity'))return{rows:[]};
  if(sql.startsWith('UPDATE vv_product_watcher_alerts'))return{rows:[{id:'9'}]};
  if(sql.startsWith('SELECT id, status, checks'))return{rows:[{id:'9',status:'warning',checks:{http:{status:'healthy'}},findings:[{code:'GENERATION_ATTENTION'}],created_at:'2026-10-15T01:00:00Z'}]};
  if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return{rows:[]};
  if(sql.startsWith('UPDATE vv_product_watcher_control')){paused=args[0];return{rows:missing?[]:[{paused,updated_at:'2026-10-15T02:00:00Z'}]};}
  if(sql.startsWith('INSERT INTO vv_admin_audit'))return{rows:[]};
  if(sql.includes('pg_try_advisory_lock'))return{rows:[{acquired:true}]};
  if(sql.includes('pg_advisory_unlock'))return{rows:[{pg_advisory_unlock:true}]};
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:missing?[]:[{paused}]};
  if(sql==='SELECT 1 AS alive')return{rows:[{alive:1}]};
  if(sql.includes('to_regclass'))return{rows:[{table_name:'vv_generation_jobs'}]};
  if(sql.includes('FROM vv_generation_jobs'))return{rows:[{}]};
  if(sql.startsWith('INSERT INTO vv_product_watcher_alerts'))return{rows:[]};
  if(sql.startsWith('INSERT INTO vv_product_watcher_runs'))return{rows:[{id:'10'}]};
  throw Error('UNKNOWN_SQL: '+sql);
 };
 return {seen,query,connect:async()=>({query,release:()=>seen.push(['RELEASE'])})};
}

function fixture({settings=env,pool=db(),fetchFn=async()=>({ok:true,status:200,headers:{get:()=>null},json:async()=>({ok:true})})}={}){
 const {app,call}=fakeApp();
 installProductWatcher(app,{auth:(req,_res,next)=>next(),pool,env:settings,fetchFn});
 return {call,pool};
}

test('strict owner policy refuses email sign-in and empty ADMIN_EMAIL',()=>{
 assert.equal(isWatcherOwner(owner,env),true);
 assert.equal(isWatcherOwner(denied,env),false);
 assert.equal(isWatcherOwner({...owner,email:''},{ADMIN_EMAIL:''}),false);
 assert.equal(isWatcherOwner({...owner,email:'not-owner@tld'},env),false);
});

test('non-owner cannot read logs, pause or trigger checks',async()=>{
 const {call,pool}=fixture();
 for(const [method,path] of [
  ['GET','/api/product-watcher/admin/status'],
  ['POST','/api/product-watcher/admin/control'],
  ['POST','/api/product-watcher/admin/run']]){
  const res=await call(method,path,{user:denied,body:{action:'pause'}});
  assert.equal(res.statusCode,403);assert.equal(res.body.error,'WATCHER_OWNER_ONLY');
 }
 assert.equal(pool.seen.length,0);
});

test('feature-off status is honest and control/write are gated',async()=>{
 const f=fixture({settings:{...env,PRODUCT_WATCHER_ENABLED:'false'}});
 const status=await f.call('GET','/api/product-watcher/admin/status');
 assert.equal(status.body.enabled,false);
 assert.equal(status.body.schedulerActive,false);
 for(const path of ['/api/product-watcher/admin/control','/api/product-watcher/admin/run']){
  const res=await f.call('POST',path,{body:{action:'resume'}});
  assert.equal(res.statusCode,503);assert.equal(res.body.error,'WATCHER_DISABLED');
 }
 assert.equal(f.pool.seen.length,0);
});

test('owner reads sanitized bounded history, never a fake active scheduler',async()=>{
 const f=fixture();const r=await f.call('GET','/api/product-watcher/admin/status');
 assert.equal(r.statusCode,200);assert.equal(r.body.enabled,true);
 assert.equal(r.body.paused,false);assert.equal(r.body.schedulerActive,false);
 assert.equal(r.body.nextRun,null);assert.equal(r.body.runs[0].id,9);
 assert.equal(r.body.lastRun.status,'warning');
});

test('owner control rejects invalid action without database writes',async()=>{
 const f=fixture();const r=await f.call('POST','/api/product-watcher/admin/control',{body:{action:'wipe'}});
 assert.equal(r.statusCode,400);assert.equal(f.pool.seen.length,0);
});

test('pause/resume are persisted and audited together in a transaction',async()=>{
 const f=fixture();
 let r=await f.call('POST','/api/product-watcher/admin/control',{body:{action:'pause'}});
 assert.equal(r.statusCode,200);assert.equal(r.body.paused,true);
 const writes=f.pool.seen.filter(([s])=>s.startsWith('INSERT INTO vv_admin_audit'));
 assert.equal(writes.length,1);assert.equal(writes[0][1][1],'product_watcher.pause');
 assert.ok(f.pool.seen.some(([s])=>s==='COMMIT'));
 r=await f.call('POST','/api/product-watcher/admin/control',{body:{action:'resume'}});
 assert.equal(r.body.paused,false);assert.equal(f.pool.seen.filter(([s])=>s.startsWith('INSERT INTO vv_admin_audit')).length,2);
});

test('owner run is paused until resumed, no network or paid request',async()=>{
 let calls=0;const f=fixture({pool:db({paused:true}),fetchFn:async()=>{calls++;throw Error('unexpected call')}});
 const r=await f.call('POST','/api/product-watcher/admin/run');
 assert.equal(r.statusCode,202);assert.equal(r.body.status,'paused');assert.equal(calls,0);
 assert.ok(!f.pool.seen.some(([s])=>s.includes('INSERT INTO vv_product_watcher_runs')));
});

test('owner explicit run after resume appends one report; schema absent fails closed',async()=>{
 const f=fixture();
 const ok=await f.call('POST','/api/product-watcher/admin/run');
 assert.equal(ok.statusCode,200);assert.equal(ok.body.runId,10);assert.equal(ok.body.status,'healthy');
 assert.equal(f.pool.seen.filter(([s])=>s.includes('INSERT INTO vv_product_watcher_runs')).length,1);
 const missing=fixture({pool:db({missing:true})});
 const status=await missing.call('GET','/api/product-watcher/admin/status');
 assert.equal(status.statusCode,503);
 const noRun=await missing.call('POST','/api/product-watcher/admin/run');
 assert.equal(noRun.statusCode,503);assert.equal(noRun.body.error,'WATCHER_RUN_FAILED');
});


test('private alert queue rejects non-owner and returns safe metadata',async()=>{
 const f=fixture();
 let r=await f.call('GET','/api/product-watcher/admin/alerts',{user:denied});
 assert.equal(r.statusCode,403);
 r=await f.call('GET','/api/product-watcher/admin/alerts');
 assert.equal(r.statusCode,200);assert.deepEqual(r.body.items,[]);
});

test('acknowledgement requires explicit matching ID and a logged owner action',async()=>{
 const f=fixture();
 let r=await f.call('POST','/api/product-watcher/admin/alerts/ack',{body:{alertId:9,confirmAlertId:10}});
 assert.equal(r.statusCode,400);
 assert.equal(f.pool.seen.filter(([q])=>q.includes('UPDATE vv_product_watcher_alerts')).length,0);
 r=await f.call('POST','/api/product-watcher/admin/alerts/ack',{body:{alertId:9,confirmAlertId:9}});
 assert.equal(r.statusCode,200);assert.equal(r.body.acknowledged,true);
 assert.ok(f.pool.seen.some(([q,args])=>q.includes('INSERT INTO vv_admin_audit')&&args[1]==='product_watcher.alert_ack'));
});
