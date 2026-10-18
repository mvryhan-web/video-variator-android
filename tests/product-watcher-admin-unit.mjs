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

function db({paused=false,missing=false,heartbeat=null,runAt='2026-10-15T01:00:00Z'}={}){
 const seen=[];
 const query=async(sql,args)=>{
  seen.push([sql,args]);
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_admin_audit'))return{rows:[]};
  if(sql.startsWith('SELECT paused, updated_at'))return{rows:missing?[]:[{paused,updated_at:'2026-10-15T00:00:00Z'}]};
  if(sql.startsWith('SELECT heartbeat_at FROM vv_product_watcher_scheduler'))return{rows:[{heartbeat_at:heartbeat}]};
  if(sql.startsWith('SELECT id,source,code,severity'))return{rows:[]};
  if(sql.startsWith('SELECT source_key,provider,source_url,last_checked_at'))return{rows:[]};
  if(sql.startsWith('SELECT id,kind,period_key,content,created_at'))return{rows:[]};
  if(sql.startsWith('SELECT id,kind,period_key,content,created_at FROM vv_product_watcher_content_tasks'))return{rows:[]};
  if(sql.includes('FROM unnest($1::text[])'))return{rows:args[0].map(name=>({name,relation:name}))};
  if(sql.startsWith('SELECT n.id,n.status,n.created_at'))return{rows:[]};
  if(sql.startsWith('SELECT id,source_key,provider,source_url,review_status'))return{rows:[]};
  if(sql.startsWith('UPDATE vv_product_watcher_proposals'))return{rows:[{id:9}]};
  if(sql.startsWith('UPDATE vv_product_watcher_alerts'))return{rows:[{id:'9'}]};
  if(sql.startsWith('SELECT id, status, checks'))return{rows:[{id:'9',status:'warning',checks:{http:{status:'healthy'}},findings:[{code:'GENERATION_ATTENTION'}],created_at:runAt}]};
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
 const {app,call,routes}=fakeApp();
 installProductWatcher(app,{auth:(req,_res,next)=>next(),pool,env:settings,fetchFn});
 return {call,pool,routes};
}

test('strict owner policy refuses email sign-in and empty ADMIN_EMAIL',()=>{
 assert.equal(isWatcherOwner(owner,env),true);
 assert.equal(isWatcherOwner(denied,env),false);
 assert.equal(isWatcherOwner({...owner,email:''},{ADMIN_EMAIL:''}),false);
 assert.equal(isWatcherOwner({...owner,email:'not-owner@tld'},env),false);
});

test('ALL owner endpoints fail closed for anonymous, impersonating and missing-id callers',async()=>{
 const {call,pool,routes}=fixture();
 assert.equal(routes.size,11);
 for(const key of routes.keys()){
  const space=key.indexOf(' '),method=key.slice(0,space),path=key.slice(space+1);
  for(const user of [
   undefined,
   {id:'customer',provider:'google',email:'customer@example.test'},
   {id:'customer',provider:'email',email:'owner@example.test'},
   {id:'',provider:'google',email:'owner@example.test'},
   {provider:'google',email:'owner@example.test'}
  ]){
   // Explicit null: fake request helper would default undefined to owner.
   const r=await call(method,path,{user:user??null,body:{action:'resume',alertId:9,confirmAlertId:9}});
   assert.equal(r.statusCode,403,key+' must deny unauthorized identity');
   assert.equal(r.body.error,'WATCHER_OWNER_ONLY');
  }
 }
 assert.equal(pool.seen.length,0,'denied calls do not even read owner data');
});

test('separate worker heartbeat is authoritative even if web scheduler flag is OFF',async()=>{
 const workerHeartbeat=new Date(Date.now()-10000);
 const recentRun=new Date(Date.now()-60000);
 const f=fixture({pool:db({heartbeat:workerHeartbeat,runAt:recentRun}),
   settings:{...env,PRODUCT_WATCHER_SCHEDULER_ENABLED:'false'}});
 const response=await f.call('GET','/api/product-watcher/admin/status');
 assert.equal(response.statusCode,200);
 assert.equal(response.body.schedulerActive,true);
 assert.ok(response.body.nextRun,'a recent report supports a future due estimate');
 assert.equal(response.body.scheduleOverdue,false);
 const stale=fixture({pool:db({heartbeat:new Date(Date.now()-300000)}),
   settings:{...env,PRODUCT_WATCHER_SCHEDULER_ENABLED:'true'}});
 const old=await stale.call('GET','/api/product-watcher/admin/status');
 assert.equal(old.body.schedulerActive,false,'stale heartbeat cannot be masked by flag');
 assert.equal(old.body.nextRun,null);
 assert.equal(old.body.scheduleOverdue,false);
 const overdue=fixture({pool:db({heartbeat:workerHeartbeat})});
 const overdueStatus=await overdue.call('GET','/api/product-watcher/admin/status');
 assert.equal(overdueStatus.body.schedulerActive,true);
 assert.equal(overdueStatus.body.nextRun,null,'never offer a past date as next scheduled run');
 assert.equal(overdueStatus.body.scheduleOverdue,true);
 const paused=fixture({pool:db({paused:true,heartbeat:workerHeartbeat})});
 const pausedStatus=await paused.call('GET','/api/product-watcher/admin/status');
 assert.equal(pausedStatus.body.scheduleOverdue,false,'paused owner should not be warned about skipped checks');
});

test('owner policy additionally requires a valid authenticated user id',()=>{
 assert.equal(isWatcherOwner({provider:'google',email:'owner@example.test'},env),false);
 assert.equal(isWatcherOwner({id:'',provider:'google',email:'owner@example.test'},env),false);
 assert.equal(isWatcherOwner(owner,env),true);
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


test('official-source evidence is owner-only and off unless an explicit enable flag',async()=>{
 const f=fixture();const r=await f.call('GET','/api/product-watcher/admin/official-sources',{user:denied});
 assert.equal(r.statusCode,403);
 const allowed=await f.call('GET','/api/product-watcher/admin/official-sources');
 assert.equal(allowed.statusCode,200);assert.equal(allowed.body.monitoringEnabled,false);
 assert.deepEqual(allowed.body.proposals,[]);
});

test('proposal review is a logged human decision, not price/model/production application',async()=>{
 const f=fixture();
 const deny=await f.call('POST','/api/product-watcher/admin/proposals/review',{
  user:denied,body:{proposalId:9,confirmProposalId:9,decision:'reviewed'}});
 assert.equal(deny.statusCode,403);
 const invalid=await f.call('POST','/api/product-watcher/admin/proposals/review',{
  body:{proposalId:9,confirmProposalId:8,decision:'reviewed'}});
 assert.equal(invalid.statusCode,400);
 const apply=await f.call('POST','/api/product-watcher/admin/proposals/review',{
  body:{proposalId:9,confirmProposalId:9,decision:'apply'}});
 assert.equal(apply.statusCode,400);
 const ok=await f.call('POST','/api/product-watcher/admin/proposals/review',{
  body:{proposalId:9,confirmProposalId:9,decision:'reviewed'}});
 assert.equal(ok.statusCode,200);assert.equal(ok.body.applied,false);
 assert.ok(f.pool.seen.some(([sql,params])=>sql.includes('INSERT INTO vv_admin_audit')&&params[1]==='product_watcher.proposal_review'));
 assert.ok(!f.pool.seen.some(([sql])=>/UPDATE.*(vv_generation|stripe|vv_ai_wallet)/i.test(sql)));
});


test('briefs are owner-only; configured flag does not fabricate reports',async()=>{
 const f=fixture();
 const denied=await f.call('GET','/api/product-watcher/admin/briefs',{user:{id:'anon',provider:'email',email:'owner@example.test'}});
 assert.equal(denied.statusCode,403);
 const view=await f.call('GET','/api/product-watcher/admin/briefs');
 assert.equal(view.statusCode,200);assert.equal(view.body.schedulerEnabled,false);
 assert.deepEqual(view.body.items,[]);
});


test('internal content checks are owner-only and off without separate explicit flag',async()=>{
 const f=fixture(),r=await f.call('GET','/api/product-watcher/admin/content-tasks',{user:denied});
 assert.equal(r.statusCode,403);
 const view=await f.call('GET','/api/product-watcher/admin/content-tasks');
 assert.equal(view.statusCode,200);assert.equal(view.body.schedulerEnabled,false);
 assert.deepEqual(view.body.items,[]);
});


test('Telegram notifications status is owner-only and disabled by default',async()=>{
 const f=fixture();
 const deniedRequest=await f.call('GET','/api/product-watcher/admin/notifications',{user:denied});
 assert.equal(deniedRequest.statusCode,403);
 const view=await f.call('GET','/api/product-watcher/admin/notifications');
 assert.equal(view.statusCode,200);assert.equal(view.body.deliveryConfigured,false);
 assert.deepEqual(view.body.items,[]);
});


test('owner can read safe deployment preflight while disabled; public users cannot',async()=>{
 const f=fixture({settings:{...env,PRODUCT_WATCHER_ENABLED:'false'}});
 const unauthorized=await f.call('GET','/api/product-watcher/admin/readiness',{user:denied});
 assert.equal(unauthorized.statusCode,403);
 const ownerView=await f.call('GET','/api/product-watcher/admin/readiness');
 assert.equal(ownerView.statusCode,200);
 assert.ok(ownerView.body.blockers.includes('WATCHER_FEATURE_DISABLED'));
 assert.equal(ownerView.body.productionVerified,false);
 assert.equal(ownerView.body.backupVerified,false);
 assert.ok(f.pool.seen.every(([sql])=>/^\s*SELECT/i.test(sql)));
});
