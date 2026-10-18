import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedGenerationCandidates,resolveGenerationModel,mayUsePreDispatchFallback} from '../server/generation-routing.js';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';

const catalog=[
 {id:'expensive',kind:'video',enabled:true,maintenance:false,ratios:['16:9'],references:1,control:{priority:20,internalCostMicros:5000}},
 {id:'preferred',kind:'video',enabled:true,maintenance:false,ratios:['16:9'],references:1,control:{priority:10,internalCostMicros:9000}},
 {id:'cheap-same-priority',kind:'video',enabled:true,maintenance:false,ratios:['16:9'],references:1,control:{priority:10,internalCostMicros:3000}},
 {id:'maintenance',kind:'video',enabled:true,maintenance:true,ratios:['16:9'],references:1,control:{priority:1,internalCostMicros:1}},
 {id:'image',kind:'image',enabled:true,maintenance:false,ratios:['1:1'],references:3,control:{priority:1,internalCostMicros:1}}
];

test('smart routing chooses only compatible enabled model by priority then internal cost',()=>{
 const body={kind:'video',ratio:'16:9',references:[]};
 assert.deepEqual(orderedGenerationCandidates(body,catalog).map(x=>x.id),['cheap-same-priority','preferred','expensive']);
 const r=resolveGenerationModel({...body,model:'smart'},catalog,{AI_SMART_ROUTING_ENABLED:'true'});
 assert.equal(r.model.id,'cheap-same-priority');assert.equal(r.smart,true);
});

test('explicit model never silently falls back',()=>{
 const body={kind:'video',ratio:'16:9',references:[],model:'expensive'};
 const r=resolveGenerationModel(body,catalog,{AI_SMART_ROUTING_ENABLED:'true'});
 assert.equal(r.model.id,'expensive');assert.equal(r.candidates.length,1);assert.equal(r.smart,false);
 assert.throws(()=>resolveGenerationModel({...body,model:'maintenance'},catalog,{AI_SMART_ROUTING_ENABLED:'true'}),/MODEL_MAINTENANCE/);
});

test('fallback is permitted only before provider execution for known preflight failures',()=>{
 assert.equal(mayUsePreDispatchFallback({smart:true,providerStarted:false,error:new Error('MODEL_NOT_CONNECTED')}),true);
 assert.equal(mayUsePreDispatchFallback({smart:true,providerStarted:true,error:new Error('MODEL_NOT_CONNECTED')}),false);
 assert.equal(mayUsePreDispatchFallback({smart:true,providerStarted:false,error:new Error('PROVIDER_ERROR')}),false);
});


test('BASE #7: smart video routing excludes providers lacking requested native input modes and duration',()=>{
 const videoModels=[
  {id:'veo',provider:'Google',kind:'video',enabled:true,quality:'720p',ratios:['16:9'],references:1,priority:1,
   capabilities:{videoInputModes:['text','first_frame'],resolutions:['720p','1080p'],durations:[4,6,8],durationSeconds:8,maxReferences:1}},
  {id:'seedance',provider:'BytePlus',kind:'video',enabled:true,quality:'720p',ratios:['16:9'],references:3,priority:9,
   capabilities:{videoInputModes:['text','first_frame','first_last','reference_image'],resolutions:['720p','1080p'],durations:[4,5,8,10,15],durationSeconds:5,maxReferences:3}}
 ];
 const smart={AI_SMART_ROUTING_ENABLED:'true'};
 const firstLast={kind:'video',ratio:'16:9',videoInputMode:'first_last',videoDuration:8,videoResolution:'1080p',
  references:[{},{ }],model:'smart'};
 assert.deepEqual(orderedGenerationCandidates(firstLast,videoModels).map(m=>m.id),['seedance']);
 assert.equal(resolveGenerationModel(firstLast,videoModels,smart).model.id,'seedance');
 const longText={...firstLast,videoInputMode:'text',videoDuration:15,references:[]};
 assert.deepEqual(orderedGenerationCandidates(longText,videoModels).map(m=>m.id),['seedance']);
 assert.deepEqual(orderedGenerationCandidates({...firstLast,videoInputMode:'reference_image',references:[{},{},{}]},videoModels).map(m=>m.id),['seedance']);
 assert.deepEqual(orderedGenerationCandidates({...firstLast,videoInputMode:'first_frame',references:[{}],videoDuration:6,videoResolution:'1080p'},videoModels).map(m=>m.id),[]);
 assert.deepEqual(orderedGenerationCandidates({...firstLast,videoInputMode:'text',references:[],videoDuration:6,videoResolution:'720p'},videoModels).map(m=>m.id),['veo']);
 assert.throws(()=>resolveGenerationModel({...firstLast,videoDuration:16},videoModels,smart),/NO_COMPATIBLE_MODEL/);
 assert.throws(()=>resolveGenerationModel({...firstLast,model:'veo'},videoModels,smart),/MODEL_NOT_ENABLED/);
});

test('BASE #7: credit estimate referenceCount and generate reference arrays route consistently',()=>{
 const models=[
  {id:'veo',provider:'Google',kind:'video',enabled:true,quality:'720p',ratios:['16:9'],references:1,priority:1,
   capabilities:{videoInputModes:['text','first_frame'],resolutions:['720p'],durations:[8],durationSeconds:8,maxReferences:1}},
  {id:'seedance',provider:'BytePlus',kind:'video',enabled:true,quality:'720p',ratios:['16:9'],references:3,priority:2,
   capabilities:{videoInputModes:['text','first_frame','first_last','reference_image'],resolutions:['720p'],durations:[8,15],durationSeconds:8,maxReferences:3}}
 ];
 const options={kind:'video',ratio:'16:9',videoDuration:15,videoResolution:'720p',videoInputMode:'first_last'};
 const quote=orderedGenerationCandidates({...options,referenceCount:2},models);
 const create=orderedGenerationCandidates({...options,references:[{},{}]},models);
 assert.deepEqual(quote.map(m=>m.id),['seedance']);
 assert.deepEqual(create.map(m=>m.id),quote.map(m=>m.id));
 for(const invalid of [{...options,referenceCount:3},{...options,referenceCount:2.5},{...options,referenceCount:-1}]){
  assert.deepEqual(orderedGenerationCandidates(invalid,models),[]);
 }
});

test('BASE #7: routes actual Google and BytePlus capability catalog, not only mock models',()=>{
 const videoModels=MODEL_CATALOG.filter(m=>m.kind==='video').map(m=>({...m,enabled:true,priority:m.provider==='Google'?1:10}));
 const firstLast={kind:'video',ratio:'16:9',videoInputMode:'first_last',videoResolution:'1080p',videoDuration:15,references:[{},{}]};
 assert.deepEqual(orderedGenerationCandidates(firstLast,videoModels).map(m=>m.id),['byteplus-seedance-2']);
 const veoTooShort={kind:'video',ratio:'16:9',videoInputMode:'first_frame',videoResolution:'1080p',videoDuration:6,references:[{}]};
 assert.deepEqual(orderedGenerationCandidates(veoTooShort,videoModels),[]);
 const veoText={kind:'video',ratio:'16:9',videoInputMode:'text',videoResolution:'720p',videoDuration:6,references:[]};
 assert.ok(orderedGenerationCandidates(veoText,videoModels).some(m=>m.provider==='Google'));
});

test('BASE #40: non-smart route fails closed rather than dispatching incompatible default model',()=>{
 const models=[
  {id:'first-model',kind:'video',provider:'Google',enabled:true,maintenance:false,
   ratios:['16:9'],references:1,quality:'720p',
   capabilities:{maxReferences:1,videoInputModes:['text','first_frame'],resolutions:['720p'],durations:[8],durationSeconds:8}},
  {id:'supported-model',kind:'video',provider:'BytePlus',enabled:true,maintenance:false,
   ratios:['16:9'],references:3,quality:'720p',
   capabilities:{maxReferences:3,videoInputModes:['text','first_frame','first_last'],resolutions:['720p','1080p'],durations:[5,8,15],durationSeconds:5}}
 ];
 const request={kind:'video',ratio:'16:9',videoInputMode:'first_last',
  videoDuration:15,videoResolution:'1080p',references:[{},{}]};
 const disabled={AI_SMART_ROUTING_ENABLED:'false'};
 assert.throws(()=>resolveGenerationModel(request,models,disabled),/MODEL_NOT_ENABLED/);
 assert.equal(resolveGenerationModel(request,models,{AI_SMART_ROUTING_ENABLED:'true'}).model.id,'supported-model');
 assert.equal(resolveGenerationModel({...request,videoInputMode:'text',videoDuration:8,videoResolution:'720p',references:[]},models,disabled).model.id,'first-model');
 assert.throws(()=>resolveGenerationModel({...request,videoInputMode:'first_frame',references:[{}],videoDuration:6,videoResolution:'720p'},models,disabled),/MODEL_NOT_ENABLED/);
 assert.throws(()=>resolveGenerationModel({...request,videoInputMode:'text',references:[],videoDuration:8,videoResolution:'720p'},[{...models[0],maintenance:true},models[1]],disabled),/MODEL_MAINTENANCE/);
});

test('BASE #40: explicit paid model ID must uniquely identify a concrete provider',()=>{
 const model={id:'shared-id',kind:'video',provider:'Google',enabled:true,
  ratios:['16:9'],references:0,capabilities:{maxReferences:0,videoInputModes:['text'],resolutions:['720p'],durations:[8],durationSeconds:8}};
 const other={...model,provider:'BytePlus'};
 const request={kind:'video',ratio:'16:9',references:[],videoInputMode:'text',videoResolution:'720p',videoDuration:8,model:'shared-id'};
 assert.throws(()=>resolveGenerationModel(request,[model,other],{AI_SMART_ROUTING_ENABLED:'true'}),/MODEL_AMBIGUOUS/);
 assert.equal(resolveGenerationModel(request,[model],{AI_SMART_ROUTING_ENABLED:'true'}).model.provider,'Google');
 assert.throws(()=>resolveGenerationModel({...request,model:'missing'},[model],{}),/MODEL_NOT_FOUND/);
});

test('BASE #40: duplicates fail closed in Smart Routing quote and dispatch paths',()=>{
 const video={id:'same-video-id',kind:'video',enabled:true,provider:'Google',
  ratios:['16:9'],references:0,capabilities:{maxReferences:0,videoInputModes:['text'],resolutions:['720p'],durations:[8],durationSeconds:8}};
 const fallback={...video,provider:'BytePlus'};
 const req={kind:'video',ratio:'16:9',videoInputMode:'text',videoResolution:'720p',videoDuration:8,references:[],model:'smart'};
 assert.throws(()=>orderedGenerationCandidates(req,[video,fallback]),/MODEL_AMBIGUOUS/);
 assert.throws(()=>resolveGenerationModel(req,[video,fallback],{AI_SMART_ROUTING_ENABLED:'true'}),/MODEL_AMBIGUOUS/);
 assert.throws(()=>resolveGenerationModel(req,[video,fallback],{AI_SMART_ROUTING_ENABLED:'false'}),/MODEL_AMBIGUOUS/);
 assert.throws(()=>resolveGenerationModel({...req,model:video.id},[video,fallback],{}),/MODEL_AMBIGUOUS/);
 // Identical IDs across different generation kinds do not represent ambiguity.
 const otherKind={...video,kind:'image'};
 assert.deepEqual(orderedGenerationCandidates(req,[video,otherKind]).map(m=>m.provider),['Google']);
});
