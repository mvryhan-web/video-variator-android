import test from 'node:test';
import assert from 'node:assert/strict';
import {watcherDeploymentConfiguration,watcherDeploymentReadiness,WATCHER_REQUIRED_TABLES} from '../server/product-watcher/readiness.js';

const flags={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_SCHEDULER_ENABLED:'true',
  PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED:'true',
  NODE_ENV:'production',APP_URL:'https://deepsyq.example/',
  DATABASE_URL:'postgres://private:secret@database/production',
  TELEGRAM_BOT_TOKEN:'private:bot',PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID:'123456789',
  PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED:'true'};
const instant=()=>new Date('2026-10-15T18:00:00Z');
function pool({schema=true,base=true,paused=true,heartbeat=null,broken=false}={}){
 const statements=[];
 const q=async(sql,args=[])=>{
  statements.push({sql,args});
  if(broken)throw Error('postgres://customer:SECRET@database/production');
  if(sql.includes('FROM unnest($1::text[])'))return{rows:args[0].map(name=>({
    name,relation:name==='vv_generation_jobs'?(base?'vv_generation_jobs':null):
      schema?name:null
  }))};
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:[{paused}]};
  if(sql==='SELECT heartbeat_at FROM vv_product_watcher_scheduler WHERE id=1')return{rows:[{heartbeat_at:heartbeat}]};
  throw Error('UNEXPECTED_SQL');
 };
 return{query:q,statements};
}
test('disabled-by-default config reports only booleans/codes, never secrets',()=>{
 const a=watcherDeploymentConfiguration({});
 assert.ok(a.blockers.includes('WATCHER_FEATURE_DISABLED'));
 assert.ok(a.blockers.includes('WATCHER_DATABASE_NOT_CONFIGURED'));
 const b=watcherDeploymentConfiguration(flags),str=JSON.stringify(b);
 assert.equal(b.healthUrlValid,true);assert.equal(b.telegramReady,true);
 for(const secret of ['secret','private:bot','123456789','deepsyq.example'])assert.ok(!str.includes(secret));
 assert.equal(b.blockers.length,0);
});

test('empty/malformed Telegram destination blocks optional notifications',()=>{
 const r=watcherDeploymentConfiguration({...flags,PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID:'-400'});
 assert.ok(r.blockers.includes('OWNER_TELEGRAM_NOT_CONFIGURED'));
 assert.equal(r.telegramReady,false);
 const invalid=watcherDeploymentConfiguration({...flags,APP_URL:'http://private:pw@localhost/private'});
 assert.equal(invalid.healthUrlValid,false);
});

test('read-only preflight reports required schema and owner pause without migration',async()=>{
 const p=pool({schema:false,base:true}),status=await watcherDeploymentReadiness(p,{env:flags,now:instant});
 assert.equal(status.requiredTables.length,WATCHER_REQUIRED_TABLES.length);
 assert.ok(status.blockers.includes('WATCHER_MIGRATION_REQUIRED'));
 assert.equal(status.productionVerified,false);assert.equal(status.backupVerified,false);
 assert.equal(status.readyForOwnerReview,false);
 assert.ok(p.statements.every(x=>/^\s*SELECT/i.test(x.sql)));
 assert.ok(p.statements.every(x=>!x.sql.includes('CREATE TABLE')));
});

test('unpaused + fresh real heartbeat can pass code preflight but is never production-certified',async()=>{
 const p=pool({schema:true,paused:false,heartbeat:new Date('2026-10-15T17:59:00Z')});
 const r=await watcherDeploymentReadiness(p,{env:flags,now:instant});
 assert.deepEqual(r.blockers,[]);
 assert.equal(r.readyForOwnerReview,true);
 assert.equal(r.productionVerified,false);
 assert.equal(r.workerDeployedVerified,false);
 assert.ok(p.statements.length>=3);
});
test('owner pause and stale heartbeat remain explicit blockers',async()=>{
 const p=pool({schema:true,paused:true,heartbeat:new Date('2026-10-15T17:55:00Z')});
 const r=await watcherDeploymentReadiness(p,{env:flags,now:instant});
 assert.ok(r.blockers.includes('WATCHER_OWNER_PAUSED'));
 assert.ok(r.blockers.includes('WATCHER_WORKER_NOT_SEEN'));
 assert.equal(r.paused,true);assert.equal(r.schedulerHeartbeatFresh,false);
});
test('PostgreSQL failures do not leak credentials or imply a healthy deployment',async()=>{
 const db=pool({broken:true}),r=await watcherDeploymentReadiness(db,{env:flags,now:instant});
 assert.ok(r.blockers.includes('WATCHER_PREFLIGHT_DB_UNAVAILABLE'));
 assert.equal(JSON.stringify(r).includes('SECRET'),false);
 assert.equal(r.readyForOwnerReview,false);
});
