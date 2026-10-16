import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedGenerationCandidates,resolveGenerationModel,mayUsePreDispatchFallback} from '../server/generation-routing.js';

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
