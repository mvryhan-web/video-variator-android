export function generationWorkerReady(env={},pool=null){
 if(!pool)return {ready:false,reason:'DATABASE_NOT_CONFIGURED'};
 if(env.AI_STUDIO_ENABLED!=='true')return {ready:false,reason:'AI_STUDIO_DISABLED'};
 if(env.AI_STUDIO_BACKGROUND_POLLING!=='true')return {ready:false,reason:'BACKGROUND_POLLING_DISABLED'};
 if(!(env.GEMINI_API_KEY||env.BYTEPLUS_API_KEY))return {ready:false,reason:'NO_AI_PROVIDER_KEY'};
 return {ready:true,reason:null};
}
