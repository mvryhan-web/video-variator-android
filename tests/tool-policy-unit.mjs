import {test} from 'node:test';
import assert from 'node:assert/strict';
import {includedTool,toolAccess,validateToolRun} from '../server/tool-policy.js';
const user=(plan,active=true)=>({usage:{plan,active,allFeatures:plan==='lifetime'}});
test('three free tools and unchanged Basic/Pro/Business inheritance',()=>{
 for(const tool of ['photo','audio','prompter'])assert.equal(includedTool(null,tool),true);
 for(const tool of ['photo_batch','video'])assert.equal(includedTool(user('basic'),tool),true);
 for(const tool of ['clips','motion','tts','stt']){assert.equal(includedTool(user('basic'),tool),false);for(const plan of ['pro','business','lifetime'])assert.equal(includedTool(user(plan),tool),true);}
 assert.equal(includedTool(user('pro',false),'clips'),false);assert.equal(includedTool({isAdmin:true},'tts'),true);
});
test('one shared five-task trial includes pending reservations and never negative remaining',()=>{
 const state=toolAccess(user('trial',false),{used:3,pending:2});assert.deepEqual(state.trial,{limit:5,used:3,pending:2,remaining:0});
 assert.equal(toolAccess(user('business'),{used:5}).tools.tts.included,true);
 assert.equal(toolAccess(null,{used:10,pending:10}).trial.remaining,0);
});
test('only known tool ids and UUID request ids can reserve access',()=>{
 assert.deepEqual(validateToolRun({tool:'photo_batch',requestId:'5c5f45bf-671e-4a73-a0b2-90633de60050'}),{tool:'photo_batch',requestId:'5c5f45bf-671e-4a73-a0b2-90633de60050'});
 for(const body of [null,[],undefined,{tool:'__proto__',requestId:'bad'},{tool:'video',requestId:'bad'},{tool:'price',requestId:'5c5f45bf-671e-4a73-a0b2-90633de60050'}])assert.throws(()=>validateToolRun(body),/INVALID_TOOL_RUN/);
});
