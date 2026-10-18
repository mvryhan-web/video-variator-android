import 'dotenv/config';
import express from 'express';
import {pool} from './db.js';
import {GenerationWallet} from './generation-wallet.js';
import {installGenerationStudio} from './generation-studio.js';
import {createObjectStorage} from './generation-storage.js';
import {createGenerationReferenceLedger} from './generation-reference-ledger.js';
import {generationWorkerPlan,referenceCleanupMigrationReady,createCoalescingWorkerTask,drainWorkerTask,closeWorkerDatabasePool,workerExitCode} from './generation-worker-runtime.js';
import {aiMigrationStatus} from './ai-migrations.js';

const storage=createObjectStorage({env:process.env});
const state=generationWorkerPlan(process.env,pool,{storageConfigured:storage.configured});
if(!state.ready){console.error('[generation worker]',state.reason);process.exit(1);}
if(state.cleanup){
 // Never auto-apply an unapproved production migration from a long-running worker.
 let migrationReady=false;
 try{migrationReady=referenceCleanupMigrationReady(await aiMigrationStatus(pool));}catch(_){}
 if(!migrationReady){
  console.error('[generation worker] REFERENCE_MIGRATION_NOT_APPLIED');
  await pool.end().catch(()=>{});
  process.exit(1);
 }
}
let studio=null;
if(state.recovery){
 // Legacy provider recovery is started ONLY when its original gates are satisfied.
 const app=express(),wallet=new GenerationWallet(pool);
 await wallet.init();
 studio=installGenerationStudio(app,{auth:(_req,_res,next)=>next(),pool,wallet,env:process.env});
 if(!studio.startRecovery()){console.error('[generation worker] recovery did not start');await pool.end();process.exit(1);}
 console.log('[generation worker] recovery loop started');
} else console.log('[generation worker] cleanup-only: no provider, wallet or AI job initialization');

let stopping=false;
let shutdownExitCode=0;
// The expiry worker must remain available even if intake is disabled for rollback.
const references=state.cleanup?createGenerationReferenceLedger({pool,storage,env:process.env}):null;
const cleanupTask=createCoalescingWorkerTask(async()=>{
 try{
  const result=await references.cleanupExpired({batchSize:20});
  if(result.deleted||result.failed)console.log('[generation worker] expired reference cleanup',result);
 }catch(_){console.error('[generation worker] reference cleanup unavailable; check migration, storage and flags');}
});
function cleanupReferenceBatch(){
 if(!references||stopping)return;
 return cleanupTask.run();
}
const referenceCleanupTimer=references?setInterval(()=>void cleanupReferenceBatch(),10*60*1000):null;
if(references)void cleanupReferenceBatch();

const heartbeat=setInterval(()=>{},60_000);
async function shutdown(signal){
 // A late fatal event during a SIGTERM drain must never exit as success.
 shutdownExitCode=workerExitCode(signal,shutdownExitCode);
 if(stopping)return;stopping=true;console.log('[generation worker] stopping:',signal);
 clearInterval(heartbeat);
 if(referenceCleanupTimer)clearInterval(referenceCleanupTimer);
 studio?.stopRecovery();
 // Do not close the DB pool in the middle of an in-flight S3/ledger cleanup.
 // A stalled external S3 call must also not hang process termination forever.
 if(references&&!await drainWorkerTask(cleanupTask,{timeoutMs:5000}))
  console.error('[generation worker] cleanup still active at shutdown deadline');
 if(!await closeWorkerDatabasePool(pool,{timeoutMs:5000}))
  console.error('[generation worker] DB pool close incomplete at shutdown deadline');
 process.exit(shutdownExitCode);
}
process.once('SIGTERM',()=>void shutdown('SIGTERM'));
process.once('SIGINT',()=>void shutdown('SIGINT'));
// Fatal errors can contain prompts, reference URLs or credentials supplied by SDKs.
// The worker exits; keep stable event labels without serializing rejection reasons.
process.on('uncaughtException',()=>{console.error('[generation worker] uncaught exception (details redacted)');void shutdown('uncaughtException');});
process.on('unhandledRejection',()=>{console.error('[generation worker] unhandled rejection (details redacted)');void shutdown('unhandledRejection');});
