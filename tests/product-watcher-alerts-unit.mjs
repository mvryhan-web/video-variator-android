import test from 'node:test';
import assert from 'node:assert/strict';
import {observedWatcherAlerts,saveWatcherAlerts,listWatcherAlerts} from '../server/product-watcher/alerts.js';

const report={http:{status:'critical',code:'HTTP_UNAVAILABLE'},operations:{
 status:'warning',code:'OPERATIONAL_ATTENTION',alerts:[
 {code:'PROVIDER_HIGH_FAILURE_RATE',provider:'Google',jobs:12,failed:9,rate:0.75,internalSecret:'never-copy'},
 {code:'RECORDED_SPEND_SPIKE',currency:'usd',ratio:4.25,trackedJobsLastHour:6},
 {code:'COST_VISIBILITY_GAP',readyJobsWithoutActualCostLastHour:3}
]}};

test('sanitized per-signal alerts are stable and do not expose source payloads',()=>{
 const a=observedWatcherAlerts(report),b=observedWatcherAlerts(report);
 assert.equal(a.length,4);
 assert.deepEqual(a.map(x=>x.fingerprint),b.map(x=>x.fingerprint));
 assert.ok(a.every(x=>/^[a-f0-9]{64}$/.test(x.fingerprint)));
 assert.equal(JSON.stringify(a).includes('never-copy'),false);
 assert.ok(a.some(x=>x.source==='http'&&x.severity==='critical'));
});

test('repeat issue preserves fingerprint, new currency creates separate alert',()=>{
 const same=observedWatcherAlerts({operations:{...report.operations,alerts:[report.operations.alerts[1]]}});
 const changed=observedWatcherAlerts({operations:{...report.operations,alerts:[{...report.operations.alerts[1],currency:'eur'}]}});
 assert.notEqual(same[0].fingerprint,changed[0].fingerprint);
 assert.equal(observedWatcherAlerts({operations:{...report.operations,alerts:[report.operations.alerts[1]]}})[0].fingerprint,same[0].fingerprint);
});

test('alert persistence only uses upsert with narrow fields and never writes user data',async()=>{
 const queries=[];
 const client={query:async(sql,args)=>{queries.push({sql,args});return{rows:[]};}};
 const n=await saveWatcherAlerts(client,report);
 assert.equal(n,4);
 assert.equal(queries.length,4);
 for(const {sql,args} of queries){
  assert.match(sql,/ON CONFLICT\(fingerprint\) DO UPDATE/);
  assert.ok(!sql.includes('user_id'));
  assert.ok(!JSON.stringify(args).includes('never-copy'));
  assert.equal(args.length,7);
 }
});

test('owner triage list has capped limit and no secret/internal actor fields',async()=>{
 const queries=[];
 const pool={query:async(sql,args)=>{
  queries.push(args[0]);
  return{rows:[{id:'23',source:'operations',code:'RECORDED_SPEND_SPIKE',severity:'warning',currency:'usd',provider:null,details:{ratio:3.1},first_seen_at:'2026-10-15',last_seen_at:'2026-10-15',observations:4,acknowledged_at:null,acknowledged_by:'secret'}]};
 }};
 const result=await listWatcherAlerts(pool,{limit:99999});
 assert.deepEqual(queries,[100]);
 assert.equal(result[0].id,23);
 assert.equal(result[0].acknowledged,false);
 assert.ok(!('acknowledged_by' in result[0]));
 assert.ok(!JSON.stringify(result).includes('secret'));
});
