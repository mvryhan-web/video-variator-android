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
   if(r.durationSeconds!=null&&!positive(r.durationSeconds,3600))throw Error();
   if(r.currency!=null&&!/^[a-z]{3}$/.test(r.currency))throw Error();
   return {model:r.model,provider:r.provider,kind:r.kind,credits:r.credits,providerCostMicros:r.providerCostMicros,currency:r.currency||null,ratio:r.ratio||null,quality:r.quality||null,durationSeconds:r.durationSeconds||null};
  });
  const keys=entries.map(e=>[e.model,e.kind,e.ratio||'*',e.quality||'*',e.durationSeconds||'*'].join('|'));
  if(new Set(keys).size!==keys.length)throw Error();
  return {entries,configured:entries.length>0};
 }catch(_){return {entries:[],configured:false};}
}

export function estimateGenerationPricing(request,model,env={}){
 const catalog=pricingCatalog(env);
 if(!catalog.configured||!model||request?.model!==model.id||request?.kind!==model.kind)return null;
 const durationSeconds=model.capabilities?.durationSeconds??(Number(String(model.duration||'').match(/\d+/)?.[0]||0)||null);
 const candidates=catalog.entries.filter(e=>e.model===model.id&&e.kind===model.kind&&e.provider===model.provider);
 const score=e=>{
  if(e.ratio&&e.ratio!==request.ratio)return -1;
  const quality=request.kind==='image'?(request.resolution||model.quality):(model.capabilities?.quality??model.quality);
  if(e.quality&&e.quality!==quality)return -1;
  // Higher image resolution must have an explicitly approved price row.
  // Legacy wildcard rows may price the previous default quality only.
  if(request.kind==='image'&&!e.quality&&quality!==model.quality)return -1;
  if(e.durationSeconds&&e.durationSeconds!==durationSeconds)return -1;
  return Number(!!e.ratio)+Number(!!e.quality)+Number(!!e.durationSeconds);
 };
 const match=candidates.map(e=>({e,s:score(e)})).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s)[0]?.e;
 if(!match)return null;
 return {credits:match.credits,providerCostMicros:match.providerCostMicros,currency:match.currency,model:model.id,provider:model.provider,kind:model.kind};
}
