// Server-side pre-dispatch routing only. Never starts or retries a provider call.
function compatible(model,body){
 if(!model?.enabled||model.maintenance||model.kind!==body?.kind)return false;
 const caps=model.capabilities||{},ratios=Array.isArray(caps.ratios)?caps.ratios:model.ratios||[],maxReferences=Number(caps.maxReferences??model.references??0);
 if(ratios.length&&body?.ratio&&!ratios.includes(body.ratio))return false;
 const refs=Array.isArray(body?.references)?body.references.length:body?.referenceCount??0;
 if(!Number.isInteger(refs)||refs<0||refs>maxReferences)return false;
 // Provider choice must respect the actual VIDEO request, not just aspect ratio
 // and total references. Otherwise an inexpensive but incompatible model may
 // be selected before the paid-job reservation and then rejected downstream.
 if(body?.kind==='video'){
  const mode=body?.videoInputMode||(refs?'first_frame':'text');
  const modes=caps.videoInputModes;
  if(Array.isArray(modes)&&!modes.includes(mode))return false;
  if(mode==='text'&&refs!==0||mode==='first_frame'&&refs!==1||
     mode==='first_last'&&refs!==2||mode==='reference_image'&&(refs<1||refs>3)||
     !['text','first_frame','first_last','reference_image'].includes(mode))return false;
  const resolution=body?.videoResolution??model.quality??caps.quality;
  const duration=body?.videoDuration??caps.durationSeconds;
  if(Array.isArray(caps.resolutions)&&caps.resolutions.length&&
     !caps.resolutions.includes(resolution))return false;
  if(Array.isArray(caps.durations)&&caps.durations.length&&
     !caps.durations.includes(duration))return false;
  // Veo reference images and 1080p require eight seconds, even though
  // text-only 720p calls may support shorter durations.
  if(model.provider==='Google'&&(refs>0||resolution==='1080p')&&duration!==8)return false;
 }
 return true;
}
// The public model id must identify exactly one provider per generation kind.
// Check before both quote candidate discovery and any paid dispatch route.
function requireUniqueModelRegistry(catalog,kind){
 const ids=new Set();
 for(const model of catalog){
  if(model?.kind!==kind||typeof model?.id!=='string'||!model.id)continue;
  if(ids.has(model.id))throw Error('MODEL_AMBIGUOUS');
  ids.add(model.id);
 }
}
export function orderedGenerationCandidates(body,catalog=[]){
 requireUniqueModelRegistry(catalog,body?.kind);
 return catalog.filter(m=>compatible(m,body)).sort((a,b)=>{
  const pa=Number(a.control?.priority??a.priority??100),pb=Number(b.control?.priority??b.priority??100);
  if(pa!==pb)return pa-pb;
  const ca=Number(a.control?.internalCostMicros??Number.MAX_SAFE_INTEGER),cb=Number(b.control?.internalCostMicros??Number.MAX_SAFE_INTEGER);
  if(ca!==cb)return ca-cb;
  return String(a.id).localeCompare(String(b.id));
 });
}
export function resolveGenerationModel(body,catalog=[],env={}){
 requireUniqueModelRegistry(catalog,body?.kind);
 const explicit=typeof body?.model==='string'&&body.model&&body.model!=='smart'?body.model:null;
 if(explicit){
  // Model IDs identify one concrete paid provider. Never guess if an
  // accidentally duplicated registry ID could charge the wrong provider.
  const matches=catalog.filter(m=>m.id===explicit&&m.kind===body?.kind);
  if(!matches.length)throw Error('MODEL_NOT_FOUND');
  if(matches.length!==1)throw Error('MODEL_AMBIGUOUS');
  const model=matches[0];
  if(!compatible(model,body))throw Error(model.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED');
  return {model,candidates:[model],smart:false};
 }
 if(env.AI_SMART_ROUTING_ENABLED!=='true'){
  // Disabled Smart Routing deliberately does NOT switch to another model;
  // however the first configured model must still accept this exact input.
  // Previously an incompatible model could reach the paid provider step.
  const model=catalog.find(m=>m.kind===body?.kind&&m.enabled);
  if(!model||!compatible(model,body))throw Error(model?.maintenance?'MODEL_MAINTENANCE':'MODEL_NOT_ENABLED');
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
