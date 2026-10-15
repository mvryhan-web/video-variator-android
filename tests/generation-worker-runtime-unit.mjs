import test from 'node:test';
import assert from 'node:assert/strict';
import {generationWorkerReady,generationWorkerPlan,referenceCleanupMigrationReady} from '../server/generation-worker-runtime.js';

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
