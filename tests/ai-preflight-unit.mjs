import test from 'node:test';
import assert from 'node:assert/strict';
import {runAiPreflight} from '../server/ai-preflight.js';

const ready=()=>({launchReady:true,blockers:[]});
const applied=[{name:'migration.sql',applied:true,checksumMatches:true}];
function fixture(rows=applied){
 const state={closed:0,queries:0,options:null};
 return {state,deps:{readiness:ready,createPool:options=>{
  state.options=options;return {end:async()=>{state.closed++;}};
 },migrationStatus:async()=>{state.queries++;return rows;}}};
}
test('missing database is blocked without connecting or claiming live verification',async()=>{
 const f=fixture();const {report,exitCode}=await runAiPreflight({},f.deps);
 assert.equal(exitCode,2);assert.equal(report.launchReady,false);assert.equal(f.state.queries,0);
 assert.equal(report.verificationScope,'configuration-and-migration-ledger');
 assert.ok(report.externalVerificationRequired.includes('provider-generation'));
});
test('matching nonempty migration ledger succeeds with bounded DB timeouts',async()=>{
 const f=fixture();const {report,exitCode}=await runAiPreflight({DATABASE_URL:'postgres://private',DATABASE_SSL:'false'},f.deps);
 assert.equal(exitCode,0);assert.equal(report.launchReady,true);assert.equal(f.state.closed,1);
 assert.equal(f.state.options.ssl,false);assert.equal(f.state.options.connectionTimeoutMillis,10000);
 assert.equal(f.state.options.statement_timeout,10000);assert.equal(f.state.options.query_timeout,12000);
 assert.equal(JSON.stringify(report).includes('postgres://private'),false);
});
test('pending, drifted and empty ledgers fail closed',async()=>{
 for(const rows of [[],[{applied:false,checksumMatches:true}],[{applied:true,checksumMatches:false}]]){
  const f=fixture(rows);const result=await runAiPreflight({DATABASE_URL:'private'},f.deps);
  assert.equal(result.exitCode,2);assert.equal(result.report.migrationReady,false);assert.equal(f.state.closed,1);
 }
});
test('database failures cannot expose secrets and still close the pool',async()=>{
 const f=fixture();f.deps.migrationStatus=async()=>{throw Error('postgres://user:secret@host private SQL');};
 const {report,exitCode}=await runAiPreflight({DATABASE_URL:'private'},f.deps);
 assert.equal(exitCode,3);assert.equal(report.error,'PREFLIGHT_CHECK_FAILED');assert.equal(f.state.closed,1);
 assert.doesNotMatch(JSON.stringify(report),/secret|private SQL|postgres:\/\//);
});
test('configuration failures are also sanitized',async()=>{
 const {report,exitCode}=await runAiPreflight({}, {readiness:()=>{throw Error('sk_live_private');}});
 assert.equal(exitCode,3);assert.equal(report.launchReady,false);assert.doesNotMatch(JSON.stringify(report),/sk_live/);
});
test('cleanup failure cannot leave a successful report or leak its error',async()=>{
 const f=fixture();f.deps.createPool=()=>({end:async()=>{throw Error('private-key');}});
 const {report,exitCode}=await runAiPreflight({DATABASE_URL:'private'},f.deps);
 assert.equal(exitCode,3);assert.equal(report.launchReady,false);assert.equal(report.error,'PREFLIGHT_CLEANUP_FAILED');
 assert.doesNotMatch(JSON.stringify(report),/private-key/);
});
