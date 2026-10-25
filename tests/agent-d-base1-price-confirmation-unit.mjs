import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';

// Agent D / BASE 1-D5: execute the ACTUAL existing Studio POST handler with
// inert purchase, DB, and provider stubs. No network, secrets or real charges.
// This is a regression gate, not a replacement router, wallet or endpoint.
// Until B/admin installs the mandatory server price check, negative cases
// MUST FAIL (old source silently accepts missing expectedCredits).
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const server=await readFile(resolve(root,'server/generation-studio.js'),'utf8');
const path="app.post('/api/studio/jobs',auth,generationUser,async(req,res)=>{";
const start=server.indexOf(path);
const end=server.indexOf(' // Read-only recovery of a Video POST',start);
assert.ok(start>=0&&end>start,'Extract real server POST /api/studio/jobs, never a replica');
const actualHandler=server.slice(start,end);
const client=await readFile(resolve(root,'app/src/main/assets/generate-studio.js'),'utf8');

function studio({kind='image',expectedCredits,quantity,serverCredits=7}={}){
 const counters={dbInit:0,dbConnect:0,dbWrites:0,walletReserve:0,providerDispatch:0,statements:[]};
 let handler;
 const request={kind,model:'provider-model',prompt:'Only a synthetic no-charge fixture',
  ratio:kind==='video'?'16:9':'1:1',references:[],consent:true,
  videoDuration:8,videoResolution:'720p',videoInputMode:'text',musicMode:'song'};
 const selected={id:'provider-model',kind,provider:'Google',quality:'720p',
  capabilities:{durationSeconds:8}};
 const quote={kind,model:selected.id,provider:selected.provider,credits:serverCredits,
  providerCostMicros:150000,currency:'usd'};
 const ctx={
  app:{post:(route,...chain)=>{assert.equal(route,'/api/studio/jobs');handler=chain.at(-1);}},
  auth(){},generationUser(){},
  resolveRequest:async()=>({request,selected,routing:{smart:false}}),
  generationRequestId:()=> 'e64cd4ba-67c2-46a2-ade6-2d98c7e00e88',
  estimateGenerationPricing:()=>quote,
  walletEnabled:()=>true,
  wallet:{
   purchasedDispatchVerifier:()=>async()=>({source:'mock-only-never-dispatched'}),
   reserve:async()=>{counters.walletReserve++},
   settle:async()=>{throw Error('SETTLEMENT_NOT_EXPECTED')}
  },
  env:{AI_PURCHASED_ONLY_DISPATCH_ENABLED:'true'},
  hasStoredGenerationConsent:async()=>true, // no-spend, currently-versioned server row mock
  isOwner:()=>false,requestFingerprint:()=> 'fixture-fingerprint',
  randomUUID:()=> 'fixture-job-id',
  init:async()=>{counters.dbInit++},
  pool:{
   connect:async()=>{
    counters.dbConnect++;
    return {query:async(sql,args=[])=>{
     counters.statements.push({sql,args});
     if(/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(sql))counters.dbWrites++;
     return {rows:[],rowCount:1};
    },release(){}};
   },
   query:async(sql,args=[])=>{
    counters.statements.push({sql,args});
    if(/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(sql))counters.dbWrites++;
    return {rows:[],rowCount:1};
   }
  },
  findGenerationRequest:async()=>null,
  enforceGenerationPolicy:async()=>{},
  run:async()=>{counters.providerDispatch++;return null;}
 };
 vm.runInNewContext(actualHandler,ctx,{timeout:1500,filename:'real-generation-jobs-handler.js'});
 assert.equal(typeof handler,'function');
 const body={kind,consent:true,...(expectedCredits!==undefined?{expectedCredits}:{}),
  ...(quantity!==undefined?{quantity}:{})};
 const req={user:{id:'fixture-purchaser',email:'buyer@example.invalid',provider:'email'},
  generationAccess:{scope:'public'},body};
 const response={statusCode:200,payload:null,status(n){this.statusCode=n;return this;},
  json(payload){this.payload=payload;return this;}};
 return {counters,run:async()=>{await handler(req,response);return response;}};
}

// Strictly-positive owner requirement also applies when an upstream pricing
// configuration accidentally returns zero: never infer zero-price authorization.
for(const kind of ['image','video','music']){
 test('BASE1-D5 '+kind+' refuses even a matching zero-credit server quote',async()=>{
  const t=studio({kind,expectedCredits:0,serverCredits:0});
  const res=await t.run();
  assert.equal(res.statusCode,409,'zero price can never authorize purchased dispatch');
  assert.equal(res.payload?.error,'AI_ESTIMATE_CHANGED');
  assert.equal(t.counters.dbInit,0);
  assert.equal(t.counters.dbConnect,0);
  assert.equal(t.counters.dbWrites,0);
  assert.equal(t.counters.walletReserve,0);
  assert.equal(t.counters.providerDispatch,0);
 });
}

const denied=[
 ['missing',undefined],['null',null],['zero',0],['negative',-1],
 ['fraction',3.5],['numeric string','7'],['boolean',true],
 ['non-numeric string','bad'],['NaN',Number.NaN],['Infinity',Infinity],
 ['unsafe integer',Number.MAX_SAFE_INTEGER+1],['previous quote now stale',8]
];
for(const kind of ['image','video','music']){
 test('BASE1-D5 '+kind+' rejects every unaccepted/mismatched price before ANY DB or paid work',async()=>{
  for(const [description,expectedCredits] of denied){
   const t=studio({kind,expectedCredits});
   const res=await t.run();
   assert.equal(res.statusCode,409,kind+' / '+description+' MUST fail before job creation');
   assert.equal(res.payload?.error,'AI_ESTIMATE_CHANGED',
    kind+' / '+description+' must use agreed stable API error');
   assert.deepEqual(Object.keys(res.payload||{}),['error'],
    kind+' / '+description+' error payload must expose only public code');
   assert.deepEqual(t.counters,{dbInit:0,dbConnect:0,dbWrites:0,walletReserve:0,
    providerDispatch:0,statements:[]},kind+' / '+description+' must not touch SQL, credits or provider');
  }
 });
 test('BASE1-D5 '+kind+' accepts correct fresh per-job server price exactly once',async()=>{
  const t=studio({kind,expectedCredits:7});
  const res=await t.run();
  assert.equal(res.statusCode,202);
  assert.equal(res.payload.creditsReserved,7);
  assert.equal(t.counters.dbWrites,2,'one inserted job plus its reservation-state update');
  assert.equal(t.counters.walletReserve,1);
  assert.equal(t.counters.providerDispatch,1,'inert mock called once only');
 });
}
test('BASE1-D5 existing batch image per-item credit contract is left intact',async()=>{
 // Existing 2-4 Image batch is already split into distinct single-job POSTS.
 assert.match(client,/async function createImageBatch\(\)/);
 assert.match(client,/expectedCredits:perImage/);
 assert.match(client,/crypto\.randomUUID\(\)/);
 assert.match(client,/imageBatchQuantity\(\)>1/);
 const t=studio({kind:'image',expectedCredits:7,quantity:1});
 const res=await t.run();
 assert.equal(res.statusCode,202);
 assert.equal(t.counters.walletReserve,1);
 assert.equal(t.counters.providerDispatch,1);
});


// D7: exercise the genuine B single-create event handler, not a mock clone.
// All estimate/job responses and checkout/provider actions are local stubs.
// A mismatch or mutation must abort BEFORE POST; successful batch tests above
// remain wholly unchanged.
function clientSubmitProbe({quoteModel='fixture-model',mutateModelAfterEstimate=false}={}){
 const ui=new Map();
 const field=(id)=>{
  if(!ui.has(id)){
   const values={generate:{disabled:false},ratio:{value:'1:1'},
    imageResolution:{value:'2K'},imageOutputFormat:{value:'png'},
    musicMode:{value:'song'},videoResolution:{value:'720p'},
    videoDuration:{value:'8'},videoInputMode:{value:'text'},
    prompt:{value:'Synthetic prompt with no real input data'},
    consent:{checked:true},status:{textContent:''}};
   ui.set(id,values[id]||{value:''});
  }
  return ui.get(id);
 };
 const calls={estimate:0,post:0,submitted:[]};
 const first=client.indexOf("$('creator').onsubmit=async e=>{");
 const last=client.indexOf('// Continue from an existing image',first);
 assert.ok(first>=0&&last>first,'Extract the actual single-create handler from B client source');
 const singleHandler=client.slice(first,last);
 let accepted=0;
 const scope={
  $:field,kind:'image',modelId:'fixture-model',refs:[],busy:false,
  generation:0,job:null,config:{imageBatchEnabled:true},
  catalog:[{id:'fixture-model',label:'Approved Fixture Model'},
   {id:'wrong-model',label:'Different model with identical AI credit price'}],
  imageBatchQuantity:()=>1,
  availability:()=>{},setHistory:()=>{},clearResult:()=>{},
  updateJobProgress:()=>{},watch:async()=>{},say:s=>s,
  confirm:()=>{accepted++;return true;},
  crypto:{randomUUID:()=> 'e64cd4ba-67c2-46a2-ade6-2d98c7e00e88'},
  sessionStorage:{setItem:()=>{}},
  api:async(url,init={})=>{
   if(url==='/api/studio/estimate'){
    calls.estimate++;
    const input=JSON.parse(init.body);
    assert.equal(input.model,'fixture-model','quote must initially address clicked model');
    if(mutateModelAfterEstimate)scope.modelId='wrong-model';
    return {json:async()=>({kind:'image',model:quoteModel,credits:7,
      perImageCredits:7,quantity:1})};
   }
   if(url==='/api/studio/jobs'){
    calls.post++;calls.submitted.push(JSON.parse(init.body));
    return {json:async()=>({id:'fake-no-cost-job',status:'processing',creditsReserved:7})};
   }
   throw Error('NO_UNEXPECTED_NETWORK_OR_PAYMENT');
  }
 };
 vm.runInNewContext(singleHandler,scope,{timeout:1500,filename:'real-studio-single-submit.js'});
 const trigger=field('creator').onsubmit;
 assert.equal(typeof trigger,'function');
 return {run:async()=>trigger({preventDefault(){}}),calls,accepted};
}

test('BASE1-D7 estimate for DIFFERENT model cannot be confirmed and sent to another model',async()=>{
 const h=clientSubmitProbe({quoteModel:'wrong-model'});
 await h.run();
 assert.equal(h.calls.estimate,1);
 assert.equal(h.calls.post,0,'mismatched server model must never submit a paid job');
});

test('BASE1-D7 state changed while awaiting fresh estimate cannot reuse old accepted quote',async()=>{
 const h=clientSubmitProbe({mutateModelAfterEstimate:true});
 await h.run();
 assert.equal(h.calls.estimate,1);
 assert.equal(h.calls.post,0,'changed model cannot be submitted using original quote');
});
