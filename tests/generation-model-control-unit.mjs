import test from 'node:test';
import assert from 'node:assert/strict';
import {validateModelControlPatch,applyModelControl} from '../server/generation-model-control.js';

test('model control patch accepts only bounded owner settings',()=>{
 assert.deepEqual(validateModelControlPatch({enabled:false,priority:5,markupBps:12500,internalCostMicros:123456,maintenance:true}),{enabled:false,priority:5,markupBps:12500,internalCostMicros:123456,maintenance:true});
 assert.throws(()=>validateModelControlPatch({priority:-1}),/INVALID_MODEL_CONTROL/);
 assert.throws(()=>validateModelControlPatch({secret:'x'}),/INVALID_MODEL_CONTROL/);
 assert.throws(()=>validateModelControlPatch({maintenance:'yes'}),/INVALID_MODEL_CONTROL/);
});

test('model controls can disable or maintenance-gate an otherwise enabled model',()=>{
 const model={id:'m',enabled:true};
 assert.equal(applyModelControl(model,{enabledOverride:false,priority:100,maintenance:false}).enabled,false);
 const maintained=applyModelControl(model,{enabledOverride:null,priority:7,maintenance:true,markupBps:12000});
 assert.equal(maintained.enabled,false);assert.equal(maintained.priority,7);assert.equal(maintained.markupBps,12000);
 const active=applyModelControl(model,{enabledOverride:true,priority:3,maintenance:false});
 assert.equal(active.enabled,true);assert.equal(active.priority,3);
});
