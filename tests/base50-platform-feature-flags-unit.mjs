import test from 'node:test';
import assert from 'node:assert/strict';
import {platformFeatureEnabled} from '../server/platform-feature-flags.js';
const flags=['AI_APPS_ENABLED','AI_INSPIRATION_ENABLED','AI_ONBOARDING_ENABLED'];
test('BASE 50 explicitly invalid public feature flags fail closed in every environment',()=>{
 for(const name of flags)for(const stage of ['development','test','staging','production']){
  for(const value of ['false','0','','TRUE','1','on','garbage',null])
   assert.equal(platformFeatureEnabled(name,{NODE_ENV:stage,[name]:value}),false,name+':'+String(value)+':'+stage);
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:stage,[name]:'true'}),true);
 }
});
test('BASE 50 absent flag retains legacy dev preview default but production blocks',()=>{
 for(const name of flags){
  for(const stage of ['development','test','staging'])assert.equal(platformFeatureEnabled(name,{NODE_ENV:stage}),true);
  assert.equal(platformFeatureEnabled(name,{NODE_ENV:'production'}),false);
 }
});
test('BASE 50 independent platform flags cannot enable another route',()=>{
 const env={NODE_ENV:'staging',AI_APPS_ENABLED:'true',AI_INSPIRATION_ENABLED:'0',AI_ONBOARDING_ENABLED:''};
 assert.equal(platformFeatureEnabled('AI_APPS_ENABLED',env),true);
 for(const name of flags.slice(1))assert.equal(platformFeatureEnabled(name,env),false);
});
