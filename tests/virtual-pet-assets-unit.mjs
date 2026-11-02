import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'app/src/main/assets/virtual-pet/pets.manifest.json'),'utf8'));
const allowed=new Set(['dog','cat','fox']);

test('F8 explicit owner THREE animals and verified 3D production assets',()=>{
 assert.equal(manifest.schemaVersion,'f8-pet-assets/v1');
 assert.equal(manifest.notPublicHome,true);
 assert.deepEqual(manifest.pets.map(p=>[p.id,p.displayName]),[['dog','Луна'],['cat','Мира'],['fox','Нова']]);
 assert.equal(manifest.sourceAvailability,'in-repo-verified');
 for(const p of manifest.pets){
  assert.equal(allowed.has(p.id),true);assert.equal(p.species,p.id);
  assert.match(p.concept.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual([p.concept.width,p.concept.height],[1086,1448]);
  assert.equal(p.concept.uploadedToGithub,true);
  assert.ok(p.concept.repoPath && p.concept.repoPath.endsWith('.png'));
  assert.equal(p.production.status,'READY');
  assert.ok(p.production.blend && p.production.blend.endsWith('.blend'));
  assert.ok(p.production.glb && p.production.glb.endsWith('.glb'));
  assert.ok(p.production.atlasJson && p.production.atlasJson.endsWith('.json'));
  assert.equal(p.production.publicEnabled,false);
  assert.ok(p.production.requiredAnimations.includes(p.signature));
  assert.ok(p.production.animationsVerified.includes(p.signature));
  for(const req of p.production.requiredAnimations){
   assert.ok(p.production.animationsVerified.includes(req), `missing animation ${req} in ${p.key}`);
  }
  for(const [name,val] of Object.entries(p.palette))assert.match(val,/^#[0-9A-Fa-f]{6}$/,'palette '+name);
 }
 assert.notEqual(manifest.pets[0].palette.base,manifest.pets[1].palette.base);
 assert.notEqual(manifest.pets[1].palette.base,manifest.pets[2].palette.base);
});

test('F8 manifest files physically exist, are non-empty and valid 3D models',()=>{
 for(const pet of manifest.pets){
  // Check source concept
  const refFull = path.join(root,'app/src/main/assets',pet.concept.repoPath);
  assert.equal(existsSync(refFull),true,'missing concept poster '+refFull);
  assert.ok(statSync(refFull).size > 1000000, 'concept poster must be high-res > 1MB');

  // Check .blend source
  const blendFull = path.join(root,'app/src/main/assets',pet.production.blend);
  assert.equal(existsSync(blendFull),true,'missing blend '+blendFull);
  assert.ok(statSync(blendFull).size > 500000, 'blend file must be real project > 500KB');

  // Check .glb binary
  const glbFull = path.join(root,'app/src/main/assets',pet.production.glb);
  assert.equal(existsSync(glbFull),true,'missing glb '+glbFull);
  assert.ok(statSync(glbFull).size > 400000, 'glb file must be real skinned model > 400KB');

  // Check atlas
  const atlasFull = path.join(root,'app/src/main/assets',pet.production.atlasJson);
  assert.equal(existsSync(atlasFull),true,'missing atlas JSON '+atlasFull);
  const atlasData = JSON.parse(readFileSync(atlasFull, 'utf8'));
  assert.ok(Object.keys(atlasData.frames).length >= 16, 'atlas must contain at least 16 frames');

  // Check 5 turnaround renders (front, side, back, three_quarter, face_closeup) on dark and light
  const renderDir = path.join(root,'app/src/main/assets/virtual-pet',pet.key,'renders');
  for(const view of ['front','side','back','three_quarter','face_closeup']){
   assert.equal(existsSync(path.join(renderDir, `${view}.png`)), true, `missing ${view}.png`);
   assert.equal(existsSync(path.join(renderDir, `${view}_dark.png`)), true, `missing ${view}_dark.png`);
   assert.equal(existsSync(path.join(renderDir, `${view}_light.png`)), true, `missing ${view}_light.png`);
  }
 }
});
