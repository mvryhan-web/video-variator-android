import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
import {orderedGenerationCandidates} from '../server/generation-routing.js';

test('every generation model exposes one normalized capability schema',()=>{
 assert.ok(MODEL_CATALOG.length>0);
 for(const m of MODEL_CATALOG){
  const c=m.capabilities;assert.ok(c);assert.ok(Array.isArray(c.inputKinds));assert.ok(['image','video','audio'].includes(c.outputKind));
  assert.deepEqual(c.ratios,m.ratios);assert.equal(c.maxReferences,Number(m.references||0));assert.equal(c.supportsImageReferences,c.maxReferences>0);
  assert.equal(typeof c.async,'boolean');assert.equal(c.supportsPrompt,true);
  if(m.kind==='video')assert.equal(c.async,true);
 }
});

test('routing reads normalized ratio and reference capability limits',()=>{
 const catalog=MODEL_CATALOG.map((m,i)=>({...m,enabled:true,priority:i+1}));
 const video=orderedGenerationCandidates({kind:'video',ratio:'1:1',references:[{}]},catalog);
 assert.ok(video.length>0);assert.ok(video.every(m=>m.capabilities.ratios.includes('1:1')&&m.capabilities.maxReferences>=1));
 const impossible=orderedGenerationCandidates({kind:'video',ratio:'1:1',references:[{},{},{},{}]},catalog);
 assert.equal(impossible.length,0);
});
