// F1 / Block 1 — Smart Model Decision Engine (BASE #7, #8, #18, #40, #41).
//
// Pure, deterministic, server-side decision logic. This module NEVER calls a
// provider, never reserves credits and never dispatches a job. It only ranks
// catalog models that are provably compatible AND carry a trusted, fresh,
// server-issued quote, then binds the selection to that exact quote.
//
// Disabled by default: callers must check isSmartDecisionEnabled(env). The
// existing router (generation-routing.js) is used read-only as the
// authoritative capability backstop and is not modified.
import {createHash} from 'node:crypto';
import {orderedGenerationCandidates,mayUsePreDispatchFallback} from './generation-routing.js';

export const SMART_DECISION_VERSION='f1-smart-decision-v1';

export const REJECT=Object.freeze({
 NOT_ENABLED:'NOT_ENABLED',
 MAINTENANCE:'MAINTENANCE',
 KIND_MISMATCH:'KIND_MISMATCH',
 PROVIDER_PAUSED:'PROVIDER_PAUSED',
 ADAPTER_MISSING:'ADAPTER_MISSING',
 REFERENCE_COUNT_UNSUPPORTED:'REFERENCE_COUNT_UNSUPPORTED',
 REFERENCE_ORDER_UNSUPPORTED:'REFERENCE_ORDER_UNSUPPORTED',
 VIDEO_INPUT_MODE_UNSUPPORTED:'VIDEO_INPUT_MODE_UNSUPPORTED',
 VIDEO_DURATION_UNSUPPORTED:'VIDEO_DURATION_UNSUPPORTED',
 VIDEO_RESOLUTION_UNSUPPORTED:'VIDEO_RESOLUTION_UNSUPPORTED',
 IMAGE_OUTPUT_UNSUPPORTED:'IMAGE_OUTPUT_UNSUPPORTED',
 INCOMPATIBLE_CAPABILITIES:'INCOMPATIBLE_CAPABILITIES',
 PROVIDER_AVAILABILITY_UNVERIFIED:'PROVIDER_AVAILABILITY_UNVERIFIED',
 PROVIDER_UNAVAILABLE:'PROVIDER_UNAVAILABLE',
 EXCLUDED_BY_USER:'EXCLUDED_BY_USER',
 PRICE_MISSING:'PRICE_MISSING',
 PRICE_AMBIGUOUS:'PRICE_AMBIGUOUS',
 PRICE_UNTRUSTED:'PRICE_UNTRUSTED',
 PRICE_INVALID:'PRICE_INVALID',
 PRICE_STALE:'PRICE_STALE',
 PRICE_CURRENCY_MISMATCH:'PRICE_CURRENCY_MISMATCH',
 PRICE_UNAVAILABLE:'PRICE_UNAVAILABLE',
 OVER_BUDGET:'OVER_BUDGET',
 UNRELIABLE:'UNRELIABLE'
});

const PRICE_REASONS=new Set([REJECT.PRICE_MISSING,REJECT.PRICE_AMBIGUOUS,REJECT.PRICE_UNTRUSTED,
 REJECT.PRICE_INVALID,REJECT.PRICE_STALE,REJECT.PRICE_CURRENCY_MISMATCH,REJECT.PRICE_UNAVAILABLE]);

// Weights per user strategy. Each row sums to 1. No provider is favoured by name.
const PROFILES=Object.freeze({
 balanced:Object.freeze({price:.30,reliability:.30,latency:.10,quality:.15,priority:.15}),
 cheapest:Object.freeze({price:.55,reliability:.25,latency:.05,quality:.05,priority:.10}),
 fastest:Object.freeze({price:.15,reliability:.25,latency:.40,quality:.05,priority:.15}),
 quality:Object.freeze({price:.15,reliability:.25,latency:.05,quality:.40,priority:.15})
});

export const DEFAULT_SMART_POLICY=Object.freeze({
 maxCatalogSize:200,
 maxQuoteAgeMs:10*60*1000,
 clockSkewMs:60*1000,
 requireVerifiedAvailability:true,
 maxAvailabilityAgeMs:15*60*1000,
 maxMetricsAgeMs:7*24*60*60*1000,
 minReliabilitySamples:30,
 minReliabilityLowerBound:.5,
 minLatencySamples:30,
 minQualityEvaluations:20,
 qualityShrinkage:20,
 priorityScale:10
});

const VIDEO_MODES=['text','first_frame','first_last','reference_image'];
const QUOTE_ID=/^[A-Za-z0-9._:-]{8,128}$/;
const CURRENCY=/^[a-z]{3}$/;
const own=(o,k)=>o!=null&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k);
const isObj=v=>v!=null&&typeof v==='object'&&!Array.isArray(v);
const safeInt=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const cmpStr=(a,b)=>a<b?-1:a>b?1:0; // code-point order: locale-independent and deterministic

export function isSmartDecisionEnabled(env={}){
 // Requires BOTH the legacy router switch and a dedicated F1 switch.
 return env?.AI_SMART_ROUTING_ENABLED==='true'&&env?.AI_SMART_DECISION_ENABLED==='true';
}

function sha256(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}

// ---------- request normalisation ----------
function normalizeRequest(request){
 if(!isObj(request)||!['image','video'].includes(request.kind))return {error:'INVALID_REQUEST_KIND'};
 const refs=Array.isArray(request.references)?request.references.length:(request.referenceCount??0);
 if(!safeInt(refs)||refs>16)return {error:'INVALID_REFERENCES'};
 if(request.ratio!=null&&(typeof request.ratio!=='string'||request.ratio.length>16))return {error:'INVALID_RATIO'};
 const strictOrder=request.referenceOrder==='strict';
 if(request.referenceOrder!=null&&!['strict','any'].includes(request.referenceOrder))return {error:'INVALID_REFERENCE_ORDER'};
 const base={kind:request.kind,ratio:request.ratio??null,referenceCount:refs,referenceOrder:strictOrder?'strict':'any'};
 if(request.kind==='video'){
  const mode=request.videoInputMode||(refs?'first_frame':'text');
  // Comparing prices across models is meaningful only for one identical job.
  // Model defaults would let each candidate be quoted for a different video.
  if(!VIDEO_MODES.includes(mode))return {error:'INVALID_VIDEO_MODE'};
  if(!safeInt(request.videoDuration,1)||request.videoDuration>120)return {error:'VIDEO_DURATION_REQUIRED'};
  if(typeof request.videoResolution!=='string'||!/^[0-9]{3,4}p$/.test(request.videoResolution))return {error:'VIDEO_RESOLUTION_REQUIRED'};
  return {value:{...base,videoInputMode:mode,videoDuration:request.videoDuration,videoResolution:request.videoResolution}};
 }
 if(request.resolution!=null&&(typeof request.resolution!=='string'||request.resolution.length>16))return {error:'INVALID_RESOLUTION'};
 if(request.outputFormat!=null&&(typeof request.outputFormat!=='string'||request.outputFormat.length>16))return {error:'INVALID_OUTPUT_FORMAT'};
 return {value:{...base,resolution:request.resolution??null,outputFormat:request.outputFormat??null}};
}

export function requestFingerprint(request){
 const n=normalizeRequest(request);
 return n.error?null:sha256(['req',n.value]);
}

function normalizePreferences(preferences={}){
 if(preferences==null)preferences={};
 if(!isObj(preferences))return {error:'INVALID_PREFERENCES'};
 const strategy=preferences.strategy??'balanced';
 if(!own(PROFILES,strategy))return {error:'INVALID_STRATEGY'};
 const maxCredits=preferences.maxCredits??null;
 if(maxCredits!==null&&!safeInt(maxCredits,1))return {error:'INVALID_MAX_CREDITS'};
 const exclude=preferences.excludeProviders??[];
 if(!Array.isArray(exclude)||exclude.length>20||exclude.some(p=>typeof p!=='string'))return {error:'INVALID_EXCLUDED_PROVIDERS'};
 return {value:{strategy,maxCredits,excludeProviders:new Set(exclude)}};
}

// ---------- eligibility (before any scoring or pricing) ----------
function capabilityReason(model,req){
 if(model?.kind!==req.kind)return REJECT.KIND_MISMATCH;
 if(!model.enabled)return REJECT.NOT_ENABLED;
 if(model.maintenance)return REJECT.MAINTENANCE;
 if(model.control?.paused===true||model.providerPaused===true)return REJECT.PROVIDER_PAUSED;
 if(model.adapter===false)return REJECT.ADAPTER_MISSING;
 const caps=isObj(model.capabilities)?model.capabilities:{};
 const maxRefs=Number(caps.maxReferences??model.references??0);
 if(!(req.referenceCount<=maxRefs))return REJECT.REFERENCE_COUNT_UNSUPPORTED;
 const orderDependent=req.referenceCount>1&&(req.referenceOrder==='strict'||req.videoInputMode==='first_last');
 if(orderDependent&&req.videoInputMode!=='first_last'&&caps.preservesReferenceOrder!==true)return REJECT.REFERENCE_ORDER_UNSUPPORTED;
 if(req.kind==='video'){
  if(Array.isArray(caps.videoInputModes)&&!caps.videoInputModes.includes(req.videoInputMode))return REJECT.VIDEO_INPUT_MODE_UNSUPPORTED;
  if(Array.isArray(caps.durations)&&caps.durations.length&&!caps.durations.includes(req.videoDuration))return REJECT.VIDEO_DURATION_UNSUPPORTED;
  if(Array.isArray(caps.resolutions)&&caps.resolutions.length&&!caps.resolutions.includes(req.videoResolution))return REJECT.VIDEO_RESOLUTION_UNSUPPORTED;
 }else{
  if(req.resolution&&!(Array.isArray(caps.resolutions)&&caps.resolutions.includes(req.resolution)))return REJECT.IMAGE_OUTPUT_UNSUPPORTED;
  if(req.outputFormat&&!(Array.isArray(caps.outputFormats)&&caps.outputFormats.includes(req.outputFormat)))return REJECT.IMAGE_OUTPUT_UNSUPPORTED;
 }
 // Authoritative backstop: the existing production router must also accept it.
 const routed={kind:req.kind,ratio:req.ratio??undefined,referenceCount:req.referenceCount,
  ...(req.kind==='video'?{videoInputMode:req.videoInputMode,videoDuration:req.videoDuration,videoResolution:req.videoResolution}:{})};
 if(!orderedGenerationCandidates(routed,[model]).length)return REJECT.INCOMPATIBLE_CAPABILITIES;
 return null;
}

function availabilityReason(model,availability,now,policy){
 if(!policy.requireVerifiedAvailability)return null;
 const entry=own(availability,model.provider)?availability[model.provider]:null;
 if(!isObj(entry)||!finite(entry.checkedAt))return REJECT.PROVIDER_AVAILABILITY_UNVERIFIED;
 if(entry.checkedAt>now+policy.clockSkewMs||now-entry.checkedAt>policy.maxAvailabilityAgeMs)return REJECT.PROVIDER_AVAILABILITY_UNVERIFIED;
 if(entry.status!=='available')return REJECT.PROVIDER_UNAVAILABLE;
 return null;
}

// ---------- trusted pricing ----------
// Missing/ambiguous/invalid/stale evidence is a rejection, never "zero cost".
export function validateQuote(quote,{modelId,currency,now,policy=DEFAULT_SMART_POLICY}){
 if(quote==null)return {reason:REJECT.PRICE_MISSING};
 if(typeof quote.then==='function')return {reason:REJECT.PRICE_UNTRUSTED};
 if(Array.isArray(quote))return {reason:REJECT.PRICE_AMBIGUOUS};
 if(!isObj(quote))return {reason:REJECT.PRICE_INVALID};
 if(quote.modelId!==modelId)return {reason:REJECT.PRICE_AMBIGUOUS};
 if(quote.source!=='server')return {reason:REJECT.PRICE_UNTRUSTED};
 if(!safeInt(quote.credits,1)||!safeInt(quote.providerCostMicros,1)||
    typeof quote.quoteId!=='string'||!QUOTE_ID.test(quote.quoteId)||
    typeof quote.currency!=='string'||!CURRENCY.test(quote.currency)||
    !finite(quote.issuedAt)||!finite(quote.expiresAt)||quote.expiresAt<=quote.issuedAt)return {reason:REJECT.PRICE_INVALID};
 if(quote.currency!==currency)return {reason:REJECT.PRICE_CURRENCY_MISMATCH};
 if(quote.expiresAt<=now||quote.issuedAt>now+policy.clockSkewMs||now-quote.issuedAt>policy.maxQuoteAgeMs)return {reason:REJECT.PRICE_STALE};
 return {quote:{modelId,quoteId:quote.quoteId,credits:quote.credits,currency:quote.currency,
  providerCostMicros:quote.providerCostMicros,issuedAt:quote.issuedAt,expiresAt:quote.expiresAt}};
}

function priceFor(model,req,quoteFor,currency,now,policy){
 let raw;
 try{raw=quoteFor(model,Object.freeze({...req}));}catch{return {reason:REJECT.PRICE_UNAVAILABLE};}
 return validateQuote(raw,{modelId:model.id,currency,now,policy});
}

// ---------- evidence-backed metrics (conservative) ----------
function wilsonLowerBound(successes,total,z=1.96){
 if(!total)return 0;
 const p=successes/total,z2=z*z;
 return Math.max(0,(p+z2/(2*total)-z*Math.sqrt(p*(1-p)/total+z2/(4*total*total)))/(1+z2/total));
}
function fresh(updatedAt,now,policy){
 return finite(updatedAt)&&updatedAt<=now+policy.clockSkewMs&&now-updatedAt<=policy.maxMetricsAgeMs;
}
function readMetrics(raw,now,policy){
 const m=isObj(raw)?raw:{};
 const out={reliability:{evidence:'missing',lowerBound:0},latency:{evidence:'missing',p50Ms:null},quality:{evidence:'missing',score:0}};
 const r=m.reliability;
 if(isObj(r)){
  if(!safeInt(r.successes)||!safeInt(r.failures)||r.successes+r.failures>1e9)out.reliability.evidence='invalid';
  else if(!fresh(r.updatedAt,now,policy))out.reliability.evidence='stale';
  else{
   const n=r.successes+r.failures;
   out.reliability={evidence:n>=policy.minReliabilitySamples?'measured':'insufficient',samples:n,
    lowerBound:wilsonLowerBound(r.successes,n)};
  }
 }
 const l=m.latency;
 if(isObj(l)){
  if(!finite(l.p50Ms)||l.p50Ms<=0||l.p50Ms>3_600_000||!safeInt(l.samples))out.latency.evidence='invalid';
  else if(!fresh(l.updatedAt,now,policy))out.latency.evidence='stale';
  else if(l.samples<policy.minLatencySamples)out.latency={evidence:'insufficient',p50Ms:null};
  else out.latency={evidence:'measured',p50Ms:l.p50Ms};
 }
 const q=m.quality;
 if(isObj(q)){
  if(!finite(q.score)||q.score<0||q.score>1||!safeInt(q.evaluations)||typeof q.source!=='string'||!q.source.trim())out.quality.evidence='invalid';
  else if(!fresh(q.updatedAt,now,policy))out.quality.evidence='stale';
  else if(q.evaluations<policy.minQualityEvaluations)out.quality={evidence:'insufficient',score:0};
  // Shrink toward zero: few evaluations cannot outrank broad evidence.
  else out.quality={evidence:'measured',score:q.score*q.evaluations/(q.evaluations+policy.qualityShrinkage)};
 }
 return out;
}

function operatorPriority(model){
 const p=Number(model.control?.priority??model.priority??100);
 return Number.isFinite(p)?Math.min(1000,Math.max(0,p)):100;
}

function bindingFor(fingerprint,sel){
 return sha256([SMART_DECISION_VERSION,fingerprint,sel.modelId,sel.provider,sel.quoteId,sel.credits,sel.currency,sel.quoteExpiresAt]);
}

function explain(state,selected,ranked,prefs){
 if(state!=='SELECTED'){
  const text={NO_COMPATIBLE_MODEL:'No available model supports this exact request.',
   NO_SAFE_PRICED_MODEL:'No compatible model has a confirmed price right now. Nothing was charged.',
   NO_MODEL_WITHIN_BUDGET:'No compatible model fits your credit limit. Nothing was charged.',
   NO_RELIABLE_MODEL:'No compatible model currently meets the reliability standard. Nothing was charged.'}[state]||'The request could not be routed. Nothing was charged.';
  return Object.freeze({code:state,text});
 }
 const top=ranked[0],c=top.components,factors=['compatible','confirmed_price'];
 if(prefs.maxCredits!=null)factors.push('within_budget');
 if(c.price===1)factors.push('lowest_price');
 if(top.evidence.reliability==='measured')factors.push('proven_reliability');
 if(top.evidence.latency==='measured'&&c.latency===1)factors.push('fastest_measured');
 if(top.evidence.quality==='measured')factors.push('evaluated_quality');
 const text=`Selected ${selected.modelId} for ${selected.credits} credits: it supports your request`+
  (prefs.maxCredits!=null?`, fits your ${prefs.maxCredits}-credit limit`:'')+
  ` and has the best overall balance for the "${prefs.strategy}" preference.`;
 return Object.freeze({code:'SELECTED',factors:Object.freeze(factors),text});
}

function result(state,extra={}){
 return Object.freeze({version:SMART_DECISION_VERSION,state,selected:null,ranked:Object.freeze([]),
  rejected:Object.freeze([]),explanation:explain(state),...extra});
}

/**
 * Rank eligible models for one request. Pure and deterministic for equal inputs.
 * @param {object} args
 * @param {object} args.request   generation request (image/video)
 * @param {object[]} args.catalog server model catalog (with control overrides applied)
 * @param {Function} args.quoteFor synchronous trusted server quote: (model, request) => quote
 * @param {object} args.currency  required ISO-like lowercase currency of every quote
 * @param {object} [args.metrics] {[modelId]: {reliability, latency, quality}}
 * @param {object} [args.availability] {[provider]: {status:'available', checkedAt}}
 * @param {object} [args.preferences] {strategy, maxCredits, excludeProviders}
 * @param {number} args.now       epoch ms supplied by the server clock
 */
export function decideSmartModel({request,catalog,quoteFor,currency,metrics={},availability={},preferences={},now,policy={}}={}){
 const pol={...DEFAULT_SMART_POLICY,...(isObj(policy)?policy:{})};
 const req=normalizeRequest(request);
 if(req.error)return result('INVALID_REQUEST',{error:req.error});
 const prefs=normalizePreferences(preferences);
 if(prefs.error)return result('INVALID_PREFERENCES',{error:prefs.error});
 if(!Array.isArray(catalog)||catalog.length>pol.maxCatalogSize)return result('INVALID_REQUEST',{error:'INVALID_CATALOG'});
 if(typeof quoteFor!=='function')return result('INVALID_REQUEST',{error:'QUOTE_SOURCE_MISSING'});
 if(typeof currency!=='string'||!CURRENCY.test(currency))return result('INVALID_REQUEST',{error:'CURRENCY_REQUIRED'});
 if(!finite(now))return result('INVALID_REQUEST',{error:'CLOCK_REQUIRED'});
 try{orderedGenerationCandidates({kind:req.value.kind},catalog);}
 catch{return result('CATALOG_AMBIGUOUS',{error:'MODEL_AMBIGUOUS'});}

 const r=req.value,fingerprint=sha256(['req',r]);
 const rejected=[],priced=[];
 let compatibleCount=0,pricedCount=0,budgetCount=0;
 for(const model of catalog){
  if(!isObj(model)||typeof model.id!=='string'||!model.id||model.kind!==r.kind)continue;
  const reject=reason=>rejected.push(Object.freeze({modelId:model.id,reason}));
  let reason=capabilityReason(model,r)||availabilityReason(model,availability,now,pol);
  if(reason){reject(reason);continue;}
  compatibleCount++;
  if(prefs.value.excludeProviders.has(model.provider)){reject(REJECT.EXCLUDED_BY_USER);continue;}
  // quoteFor is only consulted for capability-eligible models.
  const price=priceFor(model,r,quoteFor,currency,now,pol);
  if(price.reason){reject(price.reason);continue;}
  pricedCount++;
  if(prefs.value.maxCredits!=null&&price.quote.credits>prefs.value.maxCredits){reject(REJECT.OVER_BUDGET);continue;}
  budgetCount++;
  const metric=readMetrics(own(metrics,model.id)?metrics[model.id]:null,now,pol);
  if(metric.reliability.evidence==='measured'&&metric.reliability.lowerBound<pol.minReliabilityLowerBound){reject(REJECT.UNRELIABLE);continue;}
  priced.push({model,quote:price.quote,metric,priority:operatorPriority(model)});
 }

 if(!priced.length){
  const state=!compatibleCount?'NO_COMPATIBLE_MODEL':!pricedCount?'NO_SAFE_PRICED_MODEL':
   !budgetCount?'NO_MODEL_WITHIN_BUDGET':'NO_RELIABLE_MODEL';
  return result(state,{rejected:Object.freeze(rejected),requestFingerprint:fingerprint});
 }

 const w=PROFILES[prefs.value.strategy];
 const minCredits=Math.min(...priced.map(c=>c.quote.credits));
 const measuredLat=priced.filter(c=>c.metric.latency.p50Ms!=null).map(c=>c.metric.latency.p50Ms);
 const minLat=measuredLat.length?Math.min(...measuredLat):null;
 const minPri=Math.min(...priced.map(c=>c.priority));
 const ranked=priced.map(c=>{
  const components={
   price:minCredits/c.quote.credits,
   reliability:c.metric.reliability.lowerBound,
   latency:c.metric.latency.p50Ms!=null?minLat/c.metric.latency.p50Ms:0,
   quality:c.metric.quality.score,
   priority:1/(1+(c.priority-minPri)/pol.priorityScale)
  };
  // Integer score removes floating-point ordering noise across platforms.
  const score=Math.round(1e6*(w.price*components.price+w.reliability*components.reliability+
   w.latency*components.latency+w.quality*components.quality+w.priority*components.priority));
  return {modelId:c.model.id,provider:c.model.provider,kind:c.model.kind,score,
   credits:c.quote.credits,currency:c.quote.currency,quoteId:c.quote.quoteId,quoteExpiresAt:c.quote.expiresAt,
   providerCostMicros:c.quote.providerCostMicros,priority:c.priority,
   components:Object.freeze(Object.fromEntries(Object.entries(components).map(([k,v])=>[k,Math.round(v*1e6)/1e6]))),
   evidence:Object.freeze({reliability:c.metric.reliability.evidence,latency:c.metric.latency.evidence,quality:c.metric.quality.evidence})};
 }).sort((a,b)=>b.score-a.score||a.credits-b.credits||a.priority-b.priority||cmpStr(a.modelId,b.modelId))
   .map(Object.freeze);

 const top=ranked[0];
 const selected={modelId:top.modelId,provider:top.provider,kind:top.kind,credits:top.credits,currency:top.currency,
  quoteId:top.quoteId,quoteExpiresAt:top.quoteExpiresAt,score:top.score};
 const decisionId=bindingFor(fingerprint,selected);
 return Object.freeze({version:SMART_DECISION_VERSION,state:'SELECTED',decisionId,requestFingerprint:fingerprint,
  selected:Object.freeze(selected),ranked:Object.freeze(ranked),rejected:Object.freeze(rejected),
  pricing:Object.freeze({currency,selectedQuoteId:top.quoteId,credits:top.credits,providerCostMicros:top.providerCostMicros}),
  explanation:explain('SELECTED',selected,ranked,prefs.value),decidedAt:now});
}

/**
 * Approval gate: the quote the user confirms must be exactly the bound quote.
 * Any change (model, quote id, price, currency, request, expiry) requires a
 * fresh decision and a fresh user confirmation — never a silent switch.
 */
export function verifyDecisionForApproval(decision,{quote,request,now,policy={}}={}){
 const pol={...DEFAULT_SMART_POLICY,...(isObj(policy)?policy:{})};
 const deny=reason=>Object.freeze({approved:false,reason});
 if(!isObj(decision)||decision.version!==SMART_DECISION_VERSION)return deny('DECISION_INVALID');
 if(decision.state!=='SELECTED'||!isObj(decision.selected))return deny('NO_SELECTION');
 const sel=decision.selected;
 if(bindingFor(decision.requestFingerprint,sel)!==decision.decisionId)return deny('DECISION_TAMPERED');
 if(requestFingerprint(request)!==decision.requestFingerprint)return deny('REQUEST_CHANGED');
 if(!finite(now))return deny('CLOCK_REQUIRED');
 if(isObj(quote)&&quote.modelId!==sel.modelId)return deny('MODEL_CHANGED');
 const v=validateQuote(quote,{modelId:sel.modelId,currency:sel.currency,now,policy:pol});
 if(v.reason)return deny(v.reason===REJECT.PRICE_CURRENCY_MISMATCH?'PRICE_CHANGED':v.reason);
 if(v.quote.credits>sel.credits)return deny('PRICE_INCREASED');
 if(v.quote.credits!==sel.credits)return deny('PRICE_CHANGED');
 if(v.quote.quoteId!==sel.quoteId)return deny('QUOTE_CHANGED');
 return Object.freeze({approved:true,reason:'APPROVED',decisionId:decision.decisionId,modelId:sel.modelId,
  quoteId:sel.quoteId,credits:sel.credits,currency:sel.currency});
}

/**
 * Reselection PLAN only (never a dispatcher or retry).
 * - After dispatch began, or after an ambiguous provider outcome: never.
 * - Before dispatch: only for known pre-flight failures, only to an already
 *   ranked alternative that is not more expensive for the user and not more
 *   costly internally; after approval the credits must be identical.
 */
const PHASES=['quoted','approved','dispatching','dispatched','ambiguous'];
export function planSmartReselection({decision,phase,error}={}){
 const deny=reason=>Object.freeze({allowed:false,reason});
 if(!PHASES.includes(phase))return deny('INVALID_PHASE');
 if(phase==='ambiguous')return deny('AMBIGUOUS_OUTCOME_NO_RETRY');
 if(phase==='dispatching'||phase==='dispatched')return deny('PROVIDER_ALREADY_STARTED');
 if(!isObj(decision)||decision.state!=='SELECTED'||!Array.isArray(decision.ranked))return deny('NO_SELECTION');
 if(bindingFor(decision.requestFingerprint,decision.selected)!==decision.decisionId)return deny('DECISION_TAMPERED');
 if(!mayUsePreDispatchFallback({smart:true,providerStarted:false,error}))return deny('ERROR_NOT_PREFLIGHT');
 const sel=decision.ranked.find(c=>c.modelId===decision.selected.modelId);
 if(!sel)return deny('NO_SELECTION');
 const next=decision.ranked.find(c=>c.modelId!==sel.modelId&&c.provider!==sel.provider&&c.currency===sel.currency&&
  (phase==='approved'?c.credits===sel.credits:c.credits<=sel.credits)&&c.providerCostMicros<=sel.providerCostMicros);
 if(!next)return deny(phase==='approved'?'NO_EQUAL_PRICE_ALTERNATIVE':'NO_EQUAL_OR_CHEAPER_ALTERNATIVE');
 // The alternative's quote may have expired: caller must re-quote and re-verify.
 return Object.freeze({allowed:true,reason:'PRE_DISPATCH_ALTERNATIVE',nextModelId:next.modelId,
  requiresFreshQuote:true,requiresUserConfirmation:phase==='quoted'&&next.credits!==sel.credits});
}

/** Client-safe projection: no internal provider costs, priorities, raw metrics or provider names. */
export function publicDecisionView(decision){
 if(!isObj(decision))return Object.freeze({state:'INVALID_REQUEST'});
 const view={version:decision.version,state:decision.state,explanation:decision.explanation,
  unavailable:(decision.rejected||[]).map(r=>({modelId:r.modelId,reason:r.reason}))};
 if(decision.state==='SELECTED'){
  view.decisionId=decision.decisionId;
  view.selected={modelId:decision.selected.modelId,credits:decision.selected.credits,
   currency:decision.selected.currency,quoteExpiresAt:decision.selected.quoteExpiresAt};
  view.alternatives=decision.ranked.slice(1).map(c=>({modelId:c.modelId,credits:c.credits,currency:c.currency}));
 }
 return JSON.parse(JSON.stringify(view));
}

export {PRICE_REASONS};
