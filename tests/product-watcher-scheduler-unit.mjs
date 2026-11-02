import test from 'node:test';
import assert from 'node:assert/strict';
import { productWatcherTick, WATCHER_INTERVAL_MS } from '../server/product-watcher/scheduler.js';

const now=()=>new Date('2026-10-15T12:00:00Z');
const env={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_SCHEDULER_ENABLED:'true',
  NODE_ENV:'production',APP_URL:'https://deepsyq.example/'};
function db({paused=false,last=null,lock=true,missing=false}={}){
 const seen=[];
 const query=async(sql,params)=>{
  seen.push([sql,params]);
  if(sql.startsWith('SELECT c.paused'))return{rows:missing?[]:[{paused}]};
  if(sql.startsWith('UPDATE vv_product_watcher_scheduler'))return{rows:[]};
  if(sql.startsWith('SELECT created_at FROM vv_product_watcher_runs'))return{rows:last?[{created_at:last}]:[]};
  if(sql==='SELECT created_at FROM vv_product_watcher_runs ORDER BY id DESC LIMIT 1')return{rows:last?[{created_at:last}]:[]};
  if(sql.includes('pg_try_advisory_lock'))return{rows:[{acquired:lock}]};
  if(sql.includes('pg_advisory_unlock'))return{rows:[{}]};
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:[{paused}]};
  if(sql==='SELECT 1 AS alive')return{rows:[{alive:1}]};
  if(sql.includes('to_regclass'))return{rows:[{table_name:'vv_generation_jobs'}]};
  if(sql.includes('FROM vv_generation_jobs'))return{rows:[{}]};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return{rows:[]};
  if(sql.includes('INSERT INTO vv_product_watcher_alerts'))return{rows:[]};
  if(sql.includes('INSERT INTO vv_product_watcher_runs'))return{rows:[{id:27}]};
  throw Error('UNEXPECTED_SQL:'+sql);
 };
 return {seen,connect:async()=>({query,release:()=>seen.push(['RELEASE'])})};
}
const fetchFn=async()=>({ok:true,status:200,headers:{get:()=>null},json:async()=>({ok:true})});

test('private scheduler is off by default, no queries',async()=>{
 const pool=db();
 const r=await productWatcherTick({pool,env:{...env,PRODUCT_WATCHER_SCHEDULER_ENABLED:'false'},now,fetchFn});
 assert.equal(r.status,'disabled');assert.equal(pool.seen.length,0);
});

test('paused worker emits a real heartbeat but no external request',async()=>{
 const pool=db({paused:true});let calls=0;
 const r=await productWatcherTick({pool,env,now,fetchFn:async()=>{calls++;throw Error('never')}});
 assert.equal(r.status,'paused');assert.equal(r.checked,false);assert.equal(calls,0);
 assert.ok(pool.seen.some(([s])=>s.includes('SET heartbeat_at=NOW()')));
 assert.ok(!pool.seen.some(([s])=>s.includes('INSERT INTO vv_product_watcher_runs')));
});

test('first scheduled tick checks and persists one report',async()=>{
 const pool=db();
 const r=await productWatcherTick({pool,env,now,fetchFn});
 assert.equal(r.status,'healthy');assert.equal(r.checked,true);assert.equal(r.runId,27);
 assert.equal(pool.seen.filter(([s])=>s.includes('INSERT INTO vv_product_watcher_runs')).length,1);
});

test('recent saved report prevents duplicate work across restarts',async()=>{
 const pool=db({last:new Date(now().getTime()-WATCHER_INTERVAL_MS+1000)});
 const r=await productWatcherTick({pool,env,now,fetchFn:async()=>{throw Error('not due')}});
 assert.equal(r.status,'not_due');assert.equal(r.checked,false);
 assert.ok(!pool.seen.some(([s])=>s.includes('pg_try_advisory_lock')));
});

test('stale old report is due, advisory lock prevents parallel execution',async()=>{
 const pool=db({last:new Date(now().getTime()-WATCHER_INTERVAL_MS-1000),lock:false});
 const r=await productWatcherTick({pool,env,now,fetchFn});
 assert.equal(r.status,'skipped');assert.equal(r.checked,false);
});

test('missing scheduler schema fails closed without network call',async()=>{
 const pool=db({missing:true});
 await assert.rejects(productWatcherTick({pool,env,now,fetchFn:async()=>{throw Error('must not')}}),/WATCHER_SCHEMA_NOT_READY/);
 assert.ok(!pool.seen.some(([s])=>s.includes('INSERT INTO vv_product_watcher_runs')));
});
