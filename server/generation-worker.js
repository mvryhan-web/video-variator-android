import 'dotenv/config';
import express from 'express';
import {pool} from './db.js';
import {GenerationWallet} from './generation-wallet.js';
import {installGenerationStudio} from './generation-studio.js';
import {createObjectStorage} from './generation-storage.js';
import {createGenerationReferenceLedger} from './generation-reference-ledger.js';
import {generationWorkerPlan} from './generation-worker-runtime.js';

const storage=createObjectStorage({env:process.env});
const state=generationWorkerPlan(process.env,pool,{storageConfigured:storage.configured});
if(!state.ready){console.error('[generation worker]',state.reason);process.exit(1);}
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
// The expiry worker must remain available even if intake is disabled for rollback.
const references=state.cleanup?createGenerationReferenceLedger({pool,storage,env:process.env}):null;
let cleaning=false;
async function cleanupReferenceBatch(){
 if(!references||cleaning||stopping)return;
 cleaning=true;
 try{
  const result=await references.cleanupExpired({batchSize:20});
  if(result.deleted||result.failed)console.log('[generation worker] expired reference cleanup',result);
 }catch(_){console.error('[generation worker] reference cleanup unavailable; check migration, storage and flags');}
 finally{cleaning=false;}
}
const referenceCleanupTimer=references?setInterval(()=>void cleanupReferenceBatch(),10*60*1000):null;
if(references)void cleanupReferenceBatch();

const heartbeat=setInterval(()=>{},60_000);
async function shutdown(signal){
 if(stopping)return;stopping=true;console.log('[generation worker] stopping:',signal);
 clearInterval(heartbeat);if(referenceCleanupTimer)clearInterval(referenceCleanupTimer);studio?.stopRecovery();await pool.end().catch(()=>{});process.exit(0);
}
process.once('SIGTERM',()=>void shutdown('SIGTERM'));
process.once('SIGINT',()=>void shutdown('SIGINT'));
process.on('uncaughtException',e=>{console.error('[generation worker] uncaught exception',e?.message||e);void shutdown('uncaughtException');});
process.on('unhandledRejection',e=>{console.error('[generation worker] unhandled rejection',e?.message||e);void shutdown('unhandledRejection');});
