import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
import {orderedGenerationCandidates} from '../server/generation-routing.js';
import {validateGeneration} from '../server/generation-provider.js';

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


test('requested extra models appear in the picker catalog but fail closed until wired',()=>{
 const requested=[
  'ChatGPT Image 2.5','ChatGPT Image 2.5 Flare','GPT Image 2',
  'Nano Banana 2.1','Nano Banana Pro','Seedream 5.0 Pro','Seedream 4.0','Seedream 3.0','Seedream 3.0 Art Edition',
  'Seedance 2.5','Seedance 2.0 Mini','Seedance 2.0 Fast','Seedance 1.5 Pro','Seedance 1.0 Pro','Seedance 1.0 Fast','Seedance 1.0 Dreamer','Arcto',
  'Seed Audio 1.0 Beta','Seedance Speed 2.0','Suno Voice'
 ];
 assert.equal(new Set(MODEL_CATALOG.map(m=>m.id)).size,MODEL_CATALOG.length,'model ids stay unique');
 for(const label of requested){
  const model=MODEL_CATALOG.find(m=>m.label===label);
  assert.ok(model,'catalog includes '+label);
  assert.equal(model.adapter,false,label+' cannot be enabled before its adapter exists');
  assert.throws(()=>validateGeneration({kind:model.kind,model:model.id,prompt:'safe test',consent:true,ratio:model.ratios[0]}),/INVALID_REQUEST/);
 }
});
