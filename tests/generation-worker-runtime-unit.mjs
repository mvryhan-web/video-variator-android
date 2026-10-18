import test from 'node:test';
import assert from 'node:assert/strict';
import {generationWorkerReady,generationWorkerPlan,referenceCleanupMigrationReady,createCoalescingWorkerTask,drainWorkerTask,closeWorkerDatabasePool,workerExitCode} from '../server/generation-worker-runtime.js';

test('generation worker is fail-closed until DB, studio, polling and provider key are configured',()=>{
 const pool={};
 assert.equal(generationWorkerReady({},pool).ready,false);
 assert.equal(generationWorkerReady({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'true'},pool).reason,'NO_AI_PROVIDER_KEY');
 assert.deepEqual(generationWorkerReady({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'true',BYTEPLUS_API_KEY:'fixture'},pool),{ready:true,reason:null});
 assert.equal(generationWorkerReady({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'false',BYTEPLUS_API_KEY:'fixture'},pool).reason,'BACKGROUND_POLLING_DISABLED');
});

test('reference cleanup-only worker starts without provider key, studio or wallet',()=>{
 const pool={};
 const env={AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',AI_STUDIO_ENABLED:'false',AI_STUDIO_BACKGROUND_POLLING:'false'};
 assert.deepEqual(generationWorkerPlan(env,pool,{storageConfigured:true}),{
  ready:true,recovery:false,cleanup:true,reason:null
 });
 // It must NOT run without the actual configured storage.
 assert.deepEqual(generationWorkerPlan(env,pool,{storageConfigured:false}),{
  ready:false,recovery:false,cleanup:false,reason:'REFERENCE_STORAGE_NOT_CONFIGURED'
 });
 assert.deepEqual(generationWorkerPlan(env,null,{storageConfigured:true}),{
  ready:false,recovery:false,cleanup:false,reason:'DATABASE_NOT_CONFIGURED'
 });
});

test('generation polling and cleanup can coexist without changing existing recovery gates',()=>{
 const pool={};
 const env={AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',AI_STUDIO_ENABLED:'true',
  AI_STUDIO_BACKGROUND_POLLING:'true',BYTEPLUS_API_KEY:'test-only'};
 assert.deepEqual(generationWorkerPlan(env,pool,{storageConfigured:true}),{
  ready:true,recovery:true,cleanup:true,reason:null
 });
 const recoveryOnly={...env,AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'false'};
 assert.deepEqual(generationWorkerPlan(recoveryOnly,pool,{storageConfigured:false}),{
  ready:true,recovery:true,cleanup:false,reason:null
 });
 assert.equal(generationWorkerPlan({AI_STUDIO_ENABLED:'true',AI_STUDIO_BACKGROUND_POLLING:'false'},pool).ready,false);
});

test('failed cleanup configuration does not permit a fake healthy worker',()=>{
 const pool={};
 const env={AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',AI_STUDIO_ENABLED:'true',
  AI_STUDIO_BACKGROUND_POLLING:'true',BYTEPLUS_API_KEY:'test-only'};
 assert.equal(generationWorkerPlan(env,pool,{storageConfigured:false}).ready,false);
 assert.equal(generationWorkerPlan(env,pool,{storageConfigured:false}).reason,'REFERENCE_STORAGE_NOT_CONFIGURED');
});

test('cleanup worker requires verified migration; it never assumes schema exists',()=>{
 const ref='20261015-generation-reference-assets.sql';
 assert.equal(referenceCleanupMigrationReady(),false);
 assert.equal(referenceCleanupMigrationReady([]),false);
 assert.equal(referenceCleanupMigrationReady([{name:ref,applied:false,checksumMatches:true}]),false);
 assert.equal(referenceCleanupMigrationReady([{name:ref,applied:true,checksumMatches:false}]),false);
 assert.equal(referenceCleanupMigrationReady([{name:ref,applied:true,checksumMatches:true}]),true);
 assert.equal(referenceCleanupMigrationReady([{name:'unrelated.sql',applied:true,checksumMatches:true}]),false);
});


test('BASE #12: startup and timer cleanup ticks share one task and shutdown drains it',async()=>{
 let release,calls=0;
 const pending=new Promise(resolve=>{release=resolve;});
 const task=createCoalescingWorkerTask(async()=>{calls++;await pending;return {deleted:1};});
 const first=task.run(),second=task.run();
 assert.strictEqual(first,second);
 await Promise.resolve();
 assert.equal(calls,1);
 let drained=false;
 const drainedPromise=task.drain().then(()=>{drained=true;});
 await Promise.resolve();
 assert.equal(drained,false);
 release();
 assert.deepEqual(await first,{deleted:1});
 await drainedPromise;
 assert.equal(drained,true);
 await task.run();
 assert.equal(calls,2);
});

test('BASE #12: shutdown drain is bounded if external reference storage hangs',async()=>{
 const never={drain:()=>new Promise(()=>{})};
 assert.equal(await drainWorkerTask(never,{timeoutMs:10}),false);
 const quick={drain:()=>Promise.resolve()};
 assert.equal(await drainWorkerTask(quick,{timeoutMs:100}),true);
 const rejected={drain:()=>Promise.reject(Error('STORAGE_FAILED'))};
 assert.equal(await drainWorkerTask(rejected,{timeoutMs:100}),false);
});

test('BASE #12: a failed cleanup does not permanently block the next scheduled cleanup',async()=>{
 let attempts=0;
 const task=createCoalescingWorkerTask(async()=>{
  attempts++;
  if(attempts===1)throw Error('TEMPORARY_CLEANUP_FAILURE');
  return true;
 });
 await assert.rejects(task.run(),/TEMPORARY_CLEANUP_FAILURE/);
 assert.equal(await task.run(),true);
 assert.equal(attempts,2);
});

test('BASE #12: DB pool shutdown closes once, rejects failure, and times out on hung socket',async()=>{
 let calls=0;
 const quick={end:async()=>{calls++;}};
 assert.equal(await closeWorkerDatabasePool(quick,{timeoutMs:100}),true);
 assert.equal(calls,1);
 const broken={end:()=>Promise.reject(Error('DB_CLOSE_FAILED'))};
 assert.equal(await closeWorkerDatabasePool(broken,{timeoutMs:100}),false);
 let hungCalls=0;
 const hung={end:()=>{hungCalls++;return new Promise(()=>{});}};
 assert.equal(await closeWorkerDatabasePool(hung,{timeoutMs:10}),false);
 assert.equal(hungCalls,1);
 assert.equal(await closeWorkerDatabasePool(null,{timeoutMs:10}),false);
});

test('BASE #12: fatal worker errors are nonzero; ordinary shutdown is clean',()=>{
 assert.equal(workerExitCode('SIGTERM'),0);
 assert.equal(workerExitCode('SIGINT'),0);
 assert.equal(workerExitCode('uncaughtException'),1);
 assert.equal(workerExitCode('unhandledRejection'),1);
});

test('BASE #12: a fatal event DURING graceful worker shutdown remains nonzero at process exit',()=>{
 let code=workerExitCode('SIGTERM');
 assert.equal(code,0);
 // The first shutdown is awaiting an in-flight storage/DB drain when this
 // second event arrives; it must update the eventual process exit status.
 code=workerExitCode('unhandledRejection',code);
 assert.equal(code,1);
 assert.equal(workerExitCode('SIGINT',code),1);
 assert.equal(workerExitCode('uncaughtException',0),1);
 assert.equal(workerExitCode('SIGTERM',0),0);
});
