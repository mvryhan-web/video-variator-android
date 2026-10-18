// Server-side AI pricing registry. No invented defaults: empty config means pricing is not approved.
const MAX_CREDITS=10_000_000;
const MAX_MICROS=1_000_000_000;
const id=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{1,120}$/.test(v);
const positive=(v,max)=>Number.isSafeInteger(v)&&v>0&&v<=max;

export function pricingCatalog(env={}){
 try{
  const rows=JSON.parse(env.AI_MODEL_PRICING_JSON||'[]');
  if(!Array.isArray(rows)||rows.length>100)throw Error();
  const entries=rows.map(r=>{
   if(!r||!id(r.model)||!id(r.provider)||!['image','video','music','voice'].includes(r.kind)||!positive(r.credits,MAX_CREDITS)||!positive(r.providerCostMicros,MAX_MICROS))throw Error();
   if(r.ratio!=null&&typeof r.ratio!=='string')throw Error();
   if(r.quality!=null&&typeof r.quality!=='string')throw Error();
   if(r.outputFormat!=null&&(!['auto','png','jpeg'].includes(r.outputFormat)||r.kind!=='image'))throw Error();
   if(r.videoInputMode!=null&&(!['text','first_frame','first_last','reference_image'].includes(r.videoInputMode)||r.kind!=='video'))throw Error();
   if(r.referenceCount!=null&&(!Number.isSafeInteger(r.referenceCount)||r.referenceCount<0||r.referenceCount>3||r.kind!=='video'))throw Error();
   if(r.durationSeconds!=null&&!positive(r.durationSeconds,3600))throw Error();
   if(r.currency!=null&&!/^[a-z]{3}$/.test(r.currency))throw Error();
   return {model:r.model,provider:r.provider,kind:r.kind,credits:r.credits,providerCostMicros:r.providerCostMicros,currency:r.currency||null,ratio:r.ratio||null,quality:r.quality||null,outputFormat:r.outputFormat||null,videoInputMode:r.videoInputMode||null,referenceCount:r.referenceCount??null,durationSeconds:r.durationSeconds||null};
  });
  const keys=entries.map(e=>[e.model,e.kind,e.ratio||'*',e.quality||'*',e.outputFormat||'*',e.videoInputMode||'*',e.referenceCount??'*',e.durationSeconds||'*'].join('|'));
  if(new Set(keys).size!==keys.length)throw Error();
  return {entries,configured:entries.length>0};
 }catch(_){return {entries:[],configured:false};}
}

export function estimateGenerationPricing(request,model,env={}){
 const catalog=pricingCatalog(env);
 if(!catalog.configured||!model||request?.model!==model.id||request?.kind!==model.kind)return null;
 const defaultDurationSeconds=model.capabilities?.durationSeconds??(Number(String(model.duration||'').match(/\d+/)?.[0]||0)||null);
 const durationSeconds=request.kind==='video'?(request.videoDuration??defaultDurationSeconds):defaultDurationSeconds;
 const candidates=catalog.entries.filter(e=>e.model===model.id&&e.kind===model.kind&&e.provider===model.provider);
 const inputMode=request.kind==='video'?(request.videoInputMode||((request.referenceCount??request.references?.length??0)?'first_frame':'text')):null;
 const referenceCount=request.kind==='video'?(request.referenceCount??request.references?.length??0):0;
 const score=e=>{
  if(e.ratio&&e.ratio!==request.ratio)return -1;
  const quality=request.kind==='image'?(request.resolution||model.quality):request.kind==='video'?(request.videoResolution||model.quality):(model.capabilities?.quality??model.quality);
  if(e.quality&&e.quality!==quality)return -1;
  // Higher image resolution must have an explicitly approved price row.
  // Legacy wildcard rows may price the previous default quality only.
  if(request.kind==='image'&&!e.quality&&quality!==model.quality)return -1;
  if(request.kind==='video'&&!e.quality&&quality!==model.quality)return -1;
  const outputFormat=request.kind==='image'?(request.outputFormat||model.capabilities?.outputFormats?.[0]||'auto'):null;
  if(e.outputFormat&&e.outputFormat!==outputFormat)return -1;
  // Switching from the default image encoding requires explicit format-specific pricing.
  if(request.kind==='image'&&!e.outputFormat&&outputFormat!==(model.capabilities?.outputFormats?.[0]||'auto'))return -1;
  if(request.kind==='video'){
   if(e.videoInputMode&&e.videoInputMode!==inputMode)return -1;
   if(e.referenceCount!=null&&e.referenceCount!==referenceCount)return -1;
   // First+last and reference-image mode require an explicit mode-specific approved rate.
   if(!['text','first_frame'].includes(inputMode)&&(!e.videoInputMode||e.referenceCount==null))return -1;
  }
  if(e.durationSeconds&&e.durationSeconds!==durationSeconds)return -1;
  if(request.kind==='video'&&!e.durationSeconds&&durationSeconds!==defaultDurationSeconds)return -1;
  return Number(!!e.ratio)+Number(!!e.quality)+Number(!!e.outputFormat)+Number(!!e.videoInputMode)+Number(e.referenceCount!=null)+Number(!!e.durationSeconds);
 };
 const match=candidates.map(e=>({e,s:score(e)})).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s)[0]?.e;
 if(!match)return null;
 return {credits:match.credits,providerCostMicros:match.providerCostMicros,currency:match.currency,model:model.id,provider:model.provider,kind:model.kind};
}
