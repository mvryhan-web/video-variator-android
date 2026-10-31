import {orderedGenerationCandidates} from './generation-routing.js';

// BASE #8: a no-spend fallback *plan*, never a provider retry or dispatcher.
// Providers may be switched only BEFORE execution with a confirmed matching quote.
// An ambiguous timeout is after dispatch and must never start another paid job.
export function planPreDispatchFallback({request,primary,candidates=[],quoteFor,smart=false,providerStarted=false}={}){
 const unavailable=reason=>({eligible:[],blocked:[],reason});
 if(!smart)return unavailable('EXPLICIT_MODEL_NO_FALLBACK');
 if(providerStarted)return unavailable('PROVIDER_ALREADY_STARTED');
 if(!primary?.id||!primary?.provider||!['image','video'].includes(primary.kind)||request?.kind!==primary.kind||
    !Array.isArray(candidates)||typeof quoteFor!=='function')return unavailable('FALLBACK_UNAVAILABLE');

 const references=Array.isArray(request.references)?request.references.length:request.referenceCount??0;
 if(!Number.isSafeInteger(references)||references<0)return unavailable('INVALID_REFERENCES');
 const effective={...request,
  referenceCount:references,
  ...(primary.kind==='video'?{
   videoInputMode:request.videoInputMode||(references?'first_frame':'text'),
   videoResolution:request.videoResolution??primary.quality,
   videoDuration:request.videoDuration??primary.capabilities?.durationSeconds
  }:{
   resolution:request.resolution??primary.quality
  })};
 // Never imply a backup can safely replace a request which the primary cannot
 // represent. Image resolution/output format must be checked independently:
 // the shared router's legacy image path only checks ratio/reference count.
 if(!orderedGenerationCandidates(effective,[primary]).length||
    primary.kind==='image'&&(
     !primary.capabilities?.resolutions?.includes(effective.resolution)||
     effective.outputFormat&&!primary.capabilities?.outputFormats?.includes(effective.outputFormat)
    ))return unavailable('PRIMARY_CAPABILITIES_INVALID');
 const price=model=>{try{
  const q=quoteFor(model,effective);
  if(!q||!Number.isSafeInteger(q.credits)||q.credits<=0||
     !Number.isSafeInteger(q.providerCostMicros)||q.providerCostMicros<=0||
     typeof q.currency!=='string'||!/^[a-z]{3}$/.test(q.currency))return null;
  return q;
 }catch{return null;}};
 const base=price(primary);
 if(!base)return unavailable('PRIMARY_PRICE_NOT_APPROVED');

 const eligible=[],blocked=[];
 for(const model of candidates){
  if(!model?.id||model.id===primary.id)continue;
  let reason=null;
  if(!model.enabled||model.maintenance||model.adapter===false||
     model.kind!==primary.kind||model.provider===primary.provider)reason='PROVIDER_NOT_DISTINCT_OR_READY';
  else if(!orderedGenerationCandidates(effective,[model]).length)reason='INCOMPATIBLE_CAPABILITIES';
  else if(model.kind==='image'&&(
    !model.capabilities?.resolutions?.includes(effective.resolution)||
    effective.outputFormat&& !model.capabilities?.outputFormats?.includes(effective.outputFormat)
  ))reason='INCOMPATIBLE_IMAGE_OUTPUT';
  else{
   const q=price(model);
   if(!q)reason='FALLBACK_PRICE_NOT_APPROVED';
   else if(q.currency!==base.currency||q.credits!==base.credits)reason='CUSTOMER_PRICE_CHANGED';
   else if(q.providerCostMicros>base.providerCostMicros)reason='INTERNAL_COST_INCREASE';
  }
  if(reason)blocked.push({id:model.id,reason});
  else eligible.push({id:model.id,provider:model.provider});
 }
 return {eligible,blocked,reason:eligible.length?'READY':'NO_APPROVED_EQUIVALENT'};
}
