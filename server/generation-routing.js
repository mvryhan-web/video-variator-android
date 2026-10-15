// Server-side pre-dispatch routing only. Never starts or retries a provider call.
function compatible(model,body){
 if(!model?.enabled||model.maintenance||model.kind!==body?.kind)return false;
 const caps=model.capabilities||{},ratios=Array.isArray(caps.ratios)?caps.ratios:model.ratios||[],maxReferences=Number(caps.maxReferences??model.references??0);
 if(ratios.length&&body?.ratio&&!ratios.includes(body.ratio))return false;
 const refs=Array.isArray(body?.references)?body.references.length:0;
 if(refs>maxReferences)return false;
 return true;
}
export function orderedGenerationCandidates(body,catalog=[]){
 return catalog.filter(m=>compatible(m,body)).sort((a,b)=>{
  const pa=Number(a.control?.priority??a.priority??100),pb=Number(b.control?.priority??b.priority??100);
  if(pa!==pb)return pa-pb;
  const ca=Number(a.control?.internalCostMicros??Number.MAX_SAFE_INTEGER),cb=Number(b.control?.internalCostMicros??Number.MAX_SAFE_INTEGER);
  if(ca!==cb)return ca-cb;
  return String(a.id).localeCompare(String(b.id));
 });
}
export function resolveGenerationModel(body,catalog=[],env={}){
 const explicit=typeof body?.model==='string'&&body.model&&body.model!=='smart'?body.model:null;
 if(explicit){
  const model=catalog.find(m=>m.id===explicit&&m.kind===body.kind);
  if(!model)throw Error('MODEL_NOT_FOUND');
  if(!compatible(model,body))throw Error(model.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED');
  return {model,candidates:[model],smart:false};
 }
 if(env.AI_SMART_ROUTING_ENABLED!=='true'){
  const model=catalog.find(m=>m.kind===body?.kind&&m.enabled);
  if(!model)throw Error('MODEL_NOT_ENABLED');
  return {model,candidates:[model],smart:false};
 }
 const candidates=orderedGenerationCandidates(body,catalog);
 if(!candidates.length)throw Error('NO_COMPATIBLE_MODEL');
 return {model:candidates[0],candidates,smart:true};
}
export function mayUsePreDispatchFallback({smart,providerStarted,error}){
 if(!smart||providerStarted)return false;
 return ['MODEL_NOT_CONNECTED','PROVIDER_NOT_CONFIGURED','MODEL_NOT_ENABLED','MODEL_MAINTENANCE'].includes(error?.message);
}
