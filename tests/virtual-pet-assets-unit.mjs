import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'app/src/main/assets/virtual-pet/pets.manifest.json'),'utf8'));
const allowed=new Set(['dog','cat','fox']);
test('F8 explicit owner THREE animals and accurate missing-asset provenance',()=>{
 assert.equal(manifest.schemaVersion,'f8-pet-assets/v1');
 assert.equal(manifest.notPublicHome,true);
 assert.deepEqual(manifest.pets.map(p=>[p.id,p.displayName]),[['dog','Луна'],['cat','Мира'],['fox','Нова']]);
 assert.equal(manifest.sourceAvailability,'user-chat-archive-not-yet-in-repo');
 for(const p of manifest.pets){
  assert.equal(allowed.has(p.id),true);assert.equal(p.species,p.id);
  assert.match(p.concept.sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual([p.concept.width,p.concept.height],[1086,1448]);
  assert.equal(p.concept.uploadedToGithub,false);
  assert.equal(p.concept.repoPath,null);
  assert.equal(p.production.status,'NOT_CREATED');
  for(const name of ['blend','glb','rig','atlasJson'])assert.equal(p.production[name],null);
  assert.deepEqual(p.production.animationsVerified,[]);
  assert.equal(p.production.publicEnabled,false);
  assert.ok(p.production.requiredAnimations.includes(p.signature));
  for(const [name,val] of Object.entries(p.palette))assert.match(val,/^#[0-9A-Fa-f]{6}$/,'palette '+name);
 }
 assert.notEqual(manifest.pets[0].palette.base,manifest.pets[1].palette.base);
 assert.notEqual(manifest.pets[1].palette.base,manifest.pets[2].palette.base);
});
test('F8 manifest never claims nonexistent asset file is valid',()=>{
 for(const pet of manifest.pets){
  for(const name of ['glb','blend','rig','atlasJson']){
   const rel=pet.production[name];
   if(rel!==null){
    assert.equal(typeof rel,'string');
    assert.ok(!rel.includes('..'));
    assert.equal(existsSync(path.join(root,'app/src/main/assets',rel)),true,'missing actual '+name+' '+rel);
   }
  }
 }
});
