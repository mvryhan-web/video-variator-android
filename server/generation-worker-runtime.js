export function generationWorkerReady(env={},pool=null){
 if(!pool)return {ready:false,reason:'DATABASE_NOT_CONFIGURED'};
 if(env.AI_STUDIO_ENABLED!=='true')return {ready:false,reason:'AI_STUDIO_DISABLED'};
 if(env.AI_STUDIO_BACKGROUND_POLLING!=='true')return {ready:false,reason:'BACKGROUND_POLLING_DISABLED'};
 if(!(env.GEMINI_API_KEY||env.BYTEPLUS_API_KEY))return {ready:false,reason:'NO_AI_PROVIDER_KEY'};
 return {ready:true,reason:null};
}


/**
 * Plan the two independent work modes. The expiry cleaner must keep running
 * when owner disables AI generation / provider polling after staged uploads.
 * Does not enable intake or AI traffic; configuration is purely read-only.
 */
export function generationWorkerPlan(env={},pool=null,{storageConfigured=false}={}){
 if(!pool)return {ready:false,recovery:false,cleanup:false,reason:'DATABASE_NOT_CONFIGURED'};
 const cleanupRequested=env.AI_STUDIO_REFERENCE_CLEANUP_ENABLED==='true';
 // A requested cleaner must not silently fail while allowing the worker up.
 if(cleanupRequested&&!storageConfigured)
  return {ready:false,recovery:false,cleanup:false,reason:'REFERENCE_STORAGE_NOT_CONFIGURED'};
 const recovery=generationWorkerReady(env,pool).ready;
 const cleanup=cleanupRequested&&storageConfigured;
 const reason=recovery||cleanup?null:env.AI_STUDIO_REFERENCE_CLEANUP_ENABLED==='true'
  ?'REFERENCE_STORAGE_NOT_CONFIGURED':generationWorkerReady(env,pool).reason;
 return {ready:recovery||cleanup,recovery,cleanup,reason};
}

/** Read-only migration gate. Never auto-apply schemas in a worker. */
export function referenceCleanupMigrationReady(items){
 if(!Array.isArray(items))return false;
 const migration=items.find(row=>row?.name==='20261015-generation-reference-assets.sql');
 return migration?.applied===true&&migration?.checksumMatches===true;
}


/**
 * Serialize cleanup work across startup and interval ticks. A repeated call
 * reuses the in-flight promise rather than starting another storage/DB batch.
 * drain() lets shutdown wait for the existing batch; it never starts a batch.
 */
export function createCoalescingWorkerTask(work){
 if(typeof work!=='function')throw TypeError('WORKER_TASK_REQUIRED');
 let active=null;
 return {
  run(){
   if(active)return active;
   const started=Promise.resolve().then(work);
   const tracked=started.finally(()=>{if(active===tracked)active=null;});
   active=tracked;
   return tracked;
  },
  drain(){return active||Promise.resolve();}
 };
}

/**
 * Bounded best-effort shutdown drain. A stalled network delete cannot prevent
 * the process supervisor from terminating the worker indefinitely.
 */
export async function drainWorkerTask(task,{timeoutMs=5000}={}){
 const limit=Number.isSafeInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=10000?timeoutMs:5000;
 let timer;
 try{
  return await Promise.race([
   Promise.resolve().then(()=>task.drain()).then(()=>true,()=>false),
   new Promise(resolve=>{timer=setTimeout(()=>resolve(false),limit);})
  ]);
 }finally{clearTimeout(timer);}
}

// DB connection close can also hang when a previously issued query or socket
// never finishes. Supervisor shutdown must not wait on pool.end() indefinitely.
// An unresolved promise is safely abandoned only when the process exits.
export async function closeWorkerDatabasePool(pool,{timeoutMs=5000}={}){
 if(!pool||typeof pool.end!=='function')return false;
 return drainWorkerTask({drain:()=>pool.end()},{timeoutMs});
}

// Supervisor restarts are critical after fatal asynchronous code errors. A
// successful operator stop remains 0; a fatal runtime exit must not look clean.
export function workerExitCode(signal,previous=0){
 // A fatal error arriving while graceful async drains are still running must
 // upgrade (never downgrade) the supervisor exit status to nonzero.
 return previous===1||signal==='uncaughtException'||signal==='unhandledRejection'?1:0;
}
