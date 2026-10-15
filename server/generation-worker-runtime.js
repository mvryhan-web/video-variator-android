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
