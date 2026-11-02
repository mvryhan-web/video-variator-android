import test from 'node:test';
import assert from 'node:assert/strict';
import {
 decideSmartModel,verifyDecisionForApproval,planSmartReselection,publicDecisionView,
 isSmartDecisionEnabled,requestFingerprint,REJECT,SMART_DECISION_VERSION
} from '../server/generation-smart-decision.js';
import {resolveGenerationModel,orderedGenerationCandidates} from '../server/generation-routing.js';

const NOW=1_800_000_000_000;
const MIN=60_000,DAY=86_400_000;
const AVAIL={Google:{status:'available',checkedAt:NOW-MIN},BytePlus:{status:'available',checkedAt:NOW-MIN},
 OpenAI:{status:'available',checkedAt:NOW-MIN},Kling:{status:'available',checkedAt:NOW-MIN}};

const vcaps=(extra={})=>({videoInputModes:['text','first_frame','first_last','reference_image'],
 resolutions:['720p','1080p'],durations:[5,8,10],durationSeconds:8,maxReferences:3,...extra});
const video=(id,provider,extra={})=>({id,provider,kind:'video',enabled:true,maintenance:false,ratios:['16:9'],
 references:3,quality:'720p',capabilities:vcaps(extra.capabilities),...extra,capabilities:vcaps(extra.capabilities)});
const image=(id,provider,extra={})=>({id,provider,kind:'image',enabled:true,maintenance:false,ratios:['1:1'],references:4,
 capabilities:{maxReferences:4,resolutions:['1k','2k'],outputFormats:['png','jpeg'],...(extra.capabilities||{})},...extra,
 capabilities:{maxReferences:4,resolutions:['1k','2k'],outputFormats:['png','jpeg'],...(extra.capabilities||{})}});

const VREQ={kind:'video',ratio:'16:9',videoInputMode:'text',videoDuration:8,videoResolution:'720p',references:[]};

function quotes(table,{calls}={}){
 return (model,req)=>{
  if(calls)calls.push(model.id);
  const t=table[model.id];
  if(t===undefined)return null;
  if(typeof t==='function')return t(model,req);
  return {modelId:model.id,source:'server',quoteId:`q-${model.id}-0001`,currency:'usd',
   issuedAt:NOW-MIN,expiresAt:NOW+5*MIN,providerCostMicros:t*1000,credits:t};
 };
}
const reliable=(s=980,f=20,extra={})=>({reliability:{successes:s,failures:f,updatedAt:NOW-DAY},...extra});
const decide=(o)=>decideSmartModel({request:VREQ,currency:'usd',availability:AVAIL,now:NOW,...o});

test('F1: disabled by default; requires both routing and decision switches',()=>{
 assert.equal(isSmartDecisionEnabled({}),false);
 assert.equal(isSmartDecisionEnabled({AI_SMART_ROUTING_ENABLED:'true'}),false);
 assert.equal(isSmartDecisionEnabled({AI_SMART_DECISION_ENABLED:'true'}),false);
 assert.equal(isSmartDecisionEnabled({AI_SMART_ROUTING_ENABLED:'true',AI_SMART_DECISION_ENABLED:'true'}),true);
});

test('F1: eligibility is enforced before pricing — disabled, maintenance, paused, adapter, availability',()=>{
 const calls=[];
 const catalog=[video('ok','Google'),video('off','BytePlus',{enabled:false}),video('maint','OpenAI',{maintenance:true}),
  video('paused','Kling',{control:{paused:true}}),video('noadapter','Kling',{adapter:false}),
  video('down','Down'),video('unverified','Mystery')];
 const d=decide({catalog,quoteFor:quotes({ok:40,off:1,maint:1,paused:1,noadapter:1,down:1,unverified:1},{calls}),
  availability:{...AVAIL,Down:{status:'unavailable',checkedAt:NOW-MIN},Mystery:{status:'available',checkedAt:NOW-DAY}}});
 assert.equal(d.state,'SELECTED');assert.equal(d.selected.modelId,'ok');
 const reasons=Object.fromEntries(d.rejected.map(r=>[r.modelId,r.reason]));
 assert.deepEqual(reasons,{off:REJECT.NOT_ENABLED,maint:REJECT.MAINTENANCE,paused:REJECT.PROVIDER_PAUSED,
  noadapter:REJECT.ADAPTER_MISSING,down:REJECT.PROVIDER_UNAVAILABLE,unverified:REJECT.PROVIDER_AVAILABILITY_UNVERIFIED});
 assert.deepEqual(calls,['ok'],'quote source must not be consulted for ineligible models');
});

test('F1: incompatible reference modes, order-dependent references, duration and resolution',()=>{
 const catalog=[video('textonly','Google',{capabilities:{videoInputModes:['text','first_frame'],maxReferences:1}}),
  video('short','OpenAI',{capabilities:{durations:[5]}}),video('lowres','Kling',{capabilities:{resolutions:['720p']}}),
  video('full','BytePlus')];
 const req={...VREQ,videoInputMode:'first_last',videoResolution:'1080p',references:[{},{}]};
 const d=decide({request:req,catalog,quoteFor:quotes({textonly:1,short:1,lowres:1,full:50})});
 assert.equal(d.selected.modelId,'full');
 const reasons=Object.fromEntries(d.rejected.map(r=>[r.modelId,r.reason]));
 assert.equal(reasons.textonly,REJECT.REFERENCE_COUNT_UNSUPPORTED);
 assert.equal(reasons.short,REJECT.VIDEO_DURATION_UNSUPPORTED);
 assert.equal(reasons.lowres,REJECT.VIDEO_RESOLUTION_UNSUPPORTED);
 // Image with strict reference order needs explicit order-preservation capability.
 const imgs=[image('unordered','OpenAI'),image('ordered','Google',{capabilities:{preservesReferenceOrder:true}})];
 const ireq={kind:'image',ratio:'1:1',references:[{},{},{}],referenceOrder:'strict',resolution:'2k',outputFormat:'png'};
 const di=decideSmartModel({request:ireq,catalog:imgs,quoteFor:quotes({unordered:5,ordered:9}),currency:'usd',availability:AVAIL,now:NOW});
 assert.equal(di.selected.modelId,'ordered');
 assert.deepEqual(di.rejected,[{modelId:'unordered',reason:REJECT.REFERENCE_ORDER_UNSUPPORTED}]);
 const webp=decideSmartModel({request:{...ireq,referenceOrder:'any',outputFormat:'webp'},catalog:imgs,quoteFor:quotes({unordered:5,ordered:9}),currency:'usd',availability:AVAIL,now:NOW});
 assert.equal(webp.state,'NO_COMPATIBLE_MODEL');
 assert.ok(webp.rejected.every(r=>r.reason===REJECT.IMAGE_OUTPUT_UNSUPPORTED));
});

test('F1: existing router remains the capability backstop (Veo references require 8 s)',()=>{
 const veo=video('veo','Google',{capabilities:{durations:[4,6,8]}});
 const req={...VREQ,videoInputMode:'first_frame',videoDuration:6,videoResolution:'720p',references:[{}]};
 const d=decide({request:req,catalog:[veo],quoteFor:quotes({veo:10})});
 assert.equal(d.state,'NO_COMPATIBLE_MODEL');
 assert.deepEqual(d.rejected,[{modelId:'veo',reason:REJECT.INCOMPATIBLE_CAPABILITIES}]);
});

test('F1: missing, ambiguous, untrusted, invalid, zero and stale prices fail closed — never assumed free',()=>{
 const base={modelId:'x',source:'server',quoteId:'q-valid-0001',currency:'usd',issuedAt:NOW-MIN,expiresAt:NOW+MIN,providerCostMicros:1000,credits:10};
 const cases={
  missing:()=>null,
  ambiguousArray:()=>[{...base,modelId:'ambiguousArray'},{...base,modelId:'ambiguousArray'}],
  wrongModel:()=>({...base,modelId:'someone-else'}),
  client:m=>({...base,modelId:m.id,source:'client'}),
  zero:m=>({...base,modelId:m.id,credits:0}),
  nanCost:m=>({...base,modelId:m.id,providerCostMicros:NaN}),
  fractional:m=>({...base,modelId:m.id,credits:9.5}),
  eur:m=>({...base,modelId:m.id,currency:'eur'}),
  expired:m=>({...base,modelId:m.id,expiresAt:NOW-1}),
  old:m=>({...base,modelId:m.id,issuedAt:NOW-60*MIN,expiresAt:NOW+MIN}),
  future:m=>({...base,modelId:m.id,issuedAt:NOW+10*MIN,expiresAt:NOW+20*MIN}),
  asyncQuote:m=>Promise.resolve({...base,modelId:m.id}),
  throws:()=>{throw Error('pricing db down');}
 };
 const providers=['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13'];
 const catalog=Object.keys(cases).map((id,i)=>video(id,providers[i]));
 const availability=Object.fromEntries(providers.map(p=>[p,{status:'available',checkedAt:NOW-MIN}]));
 const d=decide({catalog,quoteFor:quotes(cases),availability});
 assert.equal(d.state,'NO_SAFE_PRICED_MODEL');
 assert.equal(d.selected,null);
 const reasons=Object.fromEntries(d.rejected.map(r=>[r.modelId,r.reason]));
 assert.deepEqual(reasons,{missing:'PRICE_MISSING',ambiguousArray:'PRICE_AMBIGUOUS',wrongModel:'PRICE_AMBIGUOUS',
  client:'PRICE_UNTRUSTED',zero:'PRICE_INVALID',nanCost:'PRICE_INVALID',fractional:'PRICE_INVALID',
  eur:'PRICE_CURRENCY_MISMATCH',expired:'PRICE_STALE',old:'PRICE_STALE',future:'PRICE_STALE',
  asyncQuote:'PRICE_UNTRUSTED',throws:'PRICE_UNAVAILABLE'});
 assert.match(publicDecisionView(d).explanation.text,/Nothing was charged/);
});

test('F1: user credit ceiling rejects high-performance but overpriced models',()=>{
 const metrics={premium:reliable(5000,10,{quality:{score:.98,evaluations:500,source:'owner-eval-2026-10',updatedAt:NOW-DAY},
   latency:{p50Ms:20_000,samples:500,updatedAt:NOW-DAY}}),
  budget:reliable(950,50,{latency:{p50Ms:30_000,samples:200,updatedAt:NOW-DAY}})};
 const catalog=[video('premium','Google'),video('budget','BytePlus')];
 const d=decide({catalog,quoteFor:quotes({premium:400,budget:60}),metrics,preferences:{strategy:'quality',maxCredits:100}});
 assert.equal(d.selected.modelId,'budget');
 assert.deepEqual(d.rejected,[{modelId:'premium',reason:REJECT.OVER_BUDGET}]);
 assert.ok(d.explanation.factors.includes('within_budget'));
 const none=decide({catalog,quoteFor:quotes({premium:400,budget:60}),preferences:{maxCredits:10}});
 assert.equal(none.state,'NO_MODEL_WITHIN_BUDGET');
 // Without a ceiling, quality strategy may legitimately pick the evidence-backed premium model.
 assert.equal(decide({catalog,quoteFor:quotes({premium:400,budget:60}),metrics,preferences:{strategy:'quality'}}).selected.modelId,'premium');
 // Balanced strategy does not pay 6.7x for marginal gains.
 assert.equal(decide({catalog,quoteFor:quotes({premium:400,budget:60}),metrics}).selected.modelId,'budget');
});

test('F1: stale, low-sample and invalid metrics are treated conservatively, never as fabricated quality',()=>{
 const catalog=[video('proven','Google'),video('newcomer','BytePlus'),video('stale','OpenAI'),video('liar','Kling')];
 const metrics={
  proven:reliable(970,30),
  newcomer:{reliability:{successes:5,failures:0,updatedAt:NOW-DAY},quality:{score:1,evaluations:3,source:'self-reported',updatedAt:NOW-DAY}},
  stale:{reliability:{successes:99999,failures:0,updatedAt:NOW-30*DAY},latency:{p50Ms:1,samples:9999,updatedAt:NOW-30*DAY}},
  liar:{reliability:{successes:-5,failures:Infinity,updatedAt:NOW},latency:{p50Ms:-1,samples:1e6,updatedAt:NOW},
   quality:{score:99,evaluations:1e6,source:'x',updatedAt:NOW}}
 };
 const d=decide({catalog,quoteFor:quotes({proven:50,newcomer:50,stale:50,liar:50}),metrics});
 assert.equal(d.selected.modelId,'proven');
 const ev=Object.fromEntries(d.ranked.map(c=>[c.modelId,c.evidence]));
 assert.equal(ev.newcomer.reliability,'insufficient');assert.equal(ev.newcomer.quality,'insufficient');
 assert.equal(ev.stale.reliability,'stale');assert.equal(ev.stale.latency,'stale');
 assert.deepEqual(ev.liar,{reliability:'invalid',latency:'invalid',quality:'invalid'});
 const liar=d.ranked.find(c=>c.modelId==='liar');
 assert.equal(liar.components.quality,0);assert.equal(liar.components.latency,0);assert.equal(liar.components.reliability,0);
 for(const c of d.ranked)assert.ok(Number.isSafeInteger(c.score)&&c.score>=0&&c.score<=1e6);
 // Prototype-pollution style keys in metrics are ignored safely.
 const poisoned=JSON.parse('{"__proto__":{"reliability":{"successes":1e6,"failures":0}}}');
 assert.equal(decide({catalog:[video('proven','Google')],quoteFor:quotes({proven:50}),metrics:poisoned}).state,'SELECTED');
});

test('F1: measured unreliable models are rejected with a stable reason',()=>{
 const catalog=[video('flaky','Google'),video('steady','BytePlus')];
 const d=decide({catalog,quoteFor:quotes({flaky:10,steady:90}),metrics:{flaky:reliable(300,700),steady:reliable()}});
 assert.equal(d.selected.modelId,'steady');
 assert.deepEqual(d.rejected,[{modelId:'flaky',reason:REJECT.UNRELIABLE}]);
 assert.equal(decide({catalog:[catalog[0]],quoteFor:quotes({flaky:10}),metrics:{flaky:reliable(300,700)}}).state,'NO_RELIABLE_MODEL');
});

test('F1: ranking is deterministic, input-order independent, and ties are broken by price, priority, id',()=>{
 const catalog=[video('b-model','Google',{priority:10}),video('a-model','BytePlus',{priority:10}),video('c-model','OpenAI',{priority:5})];
 const args={quoteFor:quotes({'a-model':50,'b-model':50,'c-model':50})};
 const one=decide({...args,catalog});
 const two=decide({...args,catalog:[...catalog].reverse()});
 assert.deepEqual(one.ranked.map(c=>c.modelId),two.ranked.map(c=>c.modelId));
 assert.equal(one.decisionId,two.decisionId);
 assert.deepEqual(one.ranked.map(c=>c.modelId),['c-model','a-model','b-model'],'operator priority, then id code-point order');
 // Fully equal candidates: identical scores resolve by id deterministically.
 const twins=[video('zeta','Google'),video('alpha','BytePlus')];
 assert.deepEqual(decide({catalog:twins,quoteFor:quotes({zeta:20,alpha:20})}).ranked.map(c=>c.modelId),['alpha','zeta']);
 // Cheaper model wins under the cheapest strategy without any provider bias.
 assert.equal(decide({catalog:twins,quoteFor:quotes({zeta:19,alpha:20}),preferences:{strategy:'cheapest'}}).selected.modelId,'zeta');
});

test('F1: selection is bound to the quote; changed price or model requires new approval',()=>{
 const catalog=[video('m1','Google'),video('m2','BytePlus')];
 const d=decide({catalog,quoteFor:quotes({m1:30,m2:45})});
 assert.equal(d.selected.modelId,'m1');
 const same={modelId:'m1',source:'server',quoteId:'q-m1-0001',currency:'usd',issuedAt:NOW-MIN,expiresAt:NOW+5*MIN,providerCostMicros:30000,credits:30};
 const ok=verifyDecisionForApproval(d,{quote:same,request:VREQ,now:NOW+MIN});
 assert.equal(ok.approved,true);assert.equal(ok.quoteId,'q-m1-0001');assert.equal(ok.decisionId,d.decisionId);
 const check=(patch,reason,extra={})=>assert.equal(verifyDecisionForApproval(d,{quote:{...same,...patch},request:VREQ,now:NOW+MIN,...extra}).reason,reason);
 check({credits:31},'PRICE_INCREASED');
 check({credits:29},'PRICE_CHANGED');
 check({currency:'eur'},'PRICE_CHANGED');
 check({quoteId:'q-m1-0002'},'QUOTE_CHANGED');
 check({modelId:'m2'},'MODEL_CHANGED');
 check({},'PRICE_STALE',{now:NOW+10*MIN});
 check({},'REQUEST_CHANGED',{request:{...VREQ,videoDuration:10}});
 const tampered={...d,selected:{...d.selected,credits:1}};
 assert.equal(verifyDecisionForApproval(tampered,{quote:{...same,credits:1},request:VREQ,now:NOW}).reason,'DECISION_TAMPERED');
 assert.equal(verifyDecisionForApproval({...d,state:'NO_SAFE_PRICED_MODEL'},{quote:same,request:VREQ,now:NOW}).reason,'NO_SELECTION');
});

test('F1: reselection is a plan only — never after dispatch, never after ambiguous outcome, never pricier',()=>{
 const catalog=[video('m1','Google'),video('same','BytePlus'),video('pricier','OpenAI'),video('cheaper','Kling')];
 const q=quotes({m1:40,same:40,pricier:80,cheaper:41});
 const d=decide({catalog,quoteFor:q,preferences:{strategy:'balanced'}});
 assert.equal(d.selected.modelId,'m1');
 const err=new Error('MODEL_NOT_CONNECTED');
 assert.deepEqual(planSmartReselection({decision:d,phase:'dispatching',error:err}),{allowed:false,reason:'PROVIDER_ALREADY_STARTED'});
 assert.deepEqual(planSmartReselection({decision:d,phase:'dispatched',error:err}),{allowed:false,reason:'PROVIDER_ALREADY_STARTED'});
 assert.deepEqual(planSmartReselection({decision:d,phase:'ambiguous',error:new Error('TIMEOUT')}),{allowed:false,reason:'AMBIGUOUS_OUTCOME_NO_RETRY'});
 assert.equal(planSmartReselection({decision:d,phase:'approved',error:new Error('PROVIDER_ERROR')}).reason,'ERROR_NOT_PREFLIGHT');
 const plan=planSmartReselection({decision:d,phase:'approved',error:err});
 assert.equal(plan.allowed,true);assert.equal(plan.nextModelId,'same');assert.equal(plan.requiresFreshQuote,true);
 // Only a strictly more expensive alternative exists: blocked.
 const d2=decide({catalog:[catalog[0],catalog[2]],quoteFor:q});
 assert.equal(planSmartReselection({decision:d2,phase:'approved',error:err}).reason,'NO_EQUAL_PRICE_ALTERNATIVE');
 assert.equal(planSmartReselection({decision:d2,phase:'quoted',error:err}).reason,'NO_EQUAL_OR_CHEAPER_ALTERNATIVE');
 assert.equal(planSmartReselection({decision:d,phase:'bogus',error:err}).reason,'INVALID_PHASE');
});

test('F1: invalid input fails closed with explicit states',()=>{
 const catalog=[video('m','Google')],quoteFor=quotes({m:10});
 assert.equal(decide({request:null,catalog,quoteFor}).state,'INVALID_REQUEST');
 assert.equal(decide({request:{...VREQ,kind:'audio'},catalog,quoteFor}).state,'INVALID_REQUEST');
 assert.equal(decide({request:{...VREQ,videoDuration:undefined},catalog,quoteFor}).error,'VIDEO_DURATION_REQUIRED');
 assert.equal(decide({request:{...VREQ,videoResolution:'4K<script>'},catalog,quoteFor}).error,'VIDEO_RESOLUTION_REQUIRED');
 assert.equal(decide({request:{...VREQ,referenceCount:-1,references:undefined},catalog,quoteFor}).error,'INVALID_REFERENCES');
 assert.equal(decide({catalog:'nope',quoteFor}).error,'INVALID_CATALOG');
 assert.equal(decide({catalog:Array(201).fill(catalog[0]),quoteFor}).error,'INVALID_CATALOG');
 assert.equal(decide({catalog,quoteFor:null}).error,'QUOTE_SOURCE_MISSING');
 assert.equal(decide({catalog,quoteFor,currency:'USD$'}).error,'CURRENCY_REQUIRED');
 assert.equal(decide({catalog,quoteFor,now:NaN}).error,'CLOCK_REQUIRED');
 assert.equal(decide({catalog,quoteFor,preferences:{maxCredits:0}}).error,'INVALID_MAX_CREDITS');
 assert.equal(decide({catalog,quoteFor,preferences:{strategy:'__proto__'}}).error,'INVALID_STRATEGY');
 assert.equal(decide({catalog:[video('dup','Google'),video('dup','BytePlus')],quoteFor}).state,'CATALOG_AMBIGUOUS');
 assert.equal(decide({catalog,quoteFor,preferences:{excludeProviders:['Google']}}).rejected[0].reason,REJECT.EXCLUDED_BY_USER);
 assert.equal(requestFingerprint({kind:'nope'}),null);
});

test('F1: no network and no extra paid request — exactly one quote lookup per eligible model',()=>{
 const originalFetch=globalThis.fetch;let fetches=0;
 globalThis.fetch=async()=>{fetches++;throw Error('network forbidden');};
 try{
  const calls=[];
  const catalog=[video('a','Google'),video('b','BytePlus'),video('c','OpenAI',{enabled:false})];
  const d=decide({catalog,quoteFor:quotes({a:10,b:12,c:1},{calls})});
  assert.equal(d.state,'SELECTED');
  assert.deepEqual(calls.sort(),['a','b']);
  planSmartReselection({decision:d,phase:'approved',error:new Error('MODEL_NOT_CONNECTED')});
  verifyDecisionForApproval(d,{quote:null,request:VREQ,now:NOW});
  assert.equal(calls.length,2,'reselection and approval must not request new quotes or dispatch');
  assert.equal(fetches,0);
 }finally{globalThis.fetch=originalFetch;}
});

test('F1: public view never leaks internal provider cost, priority, raw metrics or provider names',()=>{
 const catalog=[video('m1','Google',{control:{priority:3,internalCostMicros:123456}}),video('m2','BytePlus')];
 const d=decide({catalog,quoteFor:quotes({m1:30,m2:45}),metrics:{m1:reliable()}});
 assert.ok(d.pricing.providerCostMicros>0,'internal decision keeps cost for server-side guards');
 const view=publicDecisionView(d),json=JSON.stringify(view);
 for(const secret of ['providerCostMicros','internalCostMicros','priority','components','evidence','Google','BytePlus'])
  assert.ok(!json.includes(secret),`public view leaked ${secret}`);
 // Cost values as standalone numbers (timestamps may contain the same digits).
 for(const cost of [/\b30000\b/,/\b123456\b/])assert.ok(!cost.test(json),`public view leaked cost ${cost}`);
 assert.equal(view.selected.modelId,'m1');assert.equal(view.selected.credits,30);
 assert.deepEqual(view.alternatives,[{modelId:'m2',credits:45,currency:'usd'}]);
 assert.equal(view.version,SMART_DECISION_VERSION);
 assert.throws(()=>{d.selected.credits=1;},TypeError,'decision is frozen');
});

test('F1: backward compatibility — existing router behaviour is unchanged by the new engine',()=>{
 const legacy=[
  {id:'expensive',kind:'video',enabled:true,maintenance:false,ratios:['16:9'],references:1,control:{priority:20,internalCostMicros:5000}},
  {id:'preferred',kind:'video',enabled:true,maintenance:false,ratios:['16:9'],references:1,control:{priority:10,internalCostMicros:9000}},
  {id:'cheap-same-priority',kind:'video',enabled:true,maintenance:false,ratios:['16:9'],references:1,control:{priority:10,internalCostMicros:3000}}
 ];
 const body={kind:'video',ratio:'16:9',references:[]};
 assert.deepEqual(orderedGenerationCandidates(body,legacy).map(x=>x.id),['cheap-same-priority','preferred','expensive']);
 const env={AI_SMART_ROUTING_ENABLED:'true',AI_SMART_DECISION_ENABLED:'true'};
 assert.equal(resolveGenerationModel({...body,model:'smart'},legacy,env).model.id,'cheap-same-priority');
 assert.equal(resolveGenerationModel({...body,model:'expensive'},legacy,env).model.id,'expensive');
 assert.equal(resolveGenerationModel({...body,model:'smart'},legacy,{AI_SMART_DECISION_ENABLED:'true'}).smart,false);
});
