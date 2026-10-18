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
