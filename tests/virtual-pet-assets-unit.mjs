import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'app/src/main/assets/virtual-pet/pets.manifest.json'),'utf8'));
const allowed=new Set(['dog','cat','fox']);
function pngInfo(filepath){
 const b=readFileSync(filepath);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`invalid PNG ${filepath}`);
 return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),colorType:b[25],bytes:b.length};
}

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
  assert.ok(statSync(glbFull).size > 300000, 'glb file must contain the full skinned model and animation payload');
  const glb=readFileSync(glbFull);
  assert.equal(glb.toString('ascii',0,4),'glTF','invalid GLB magic');
  assert.equal(glb.readUInt32LE(4),2,'GLB must use glTF 2');
  const jsonLength=glb.readUInt32LE(12);
  const gltf=JSON.parse(glb.toString('utf8',20,20+jsonLength));
  const jointCount=gltf.skins?.[0]?.joints?.length||0;
  assert.ok(jointCount>=14,`${pet.key} rig must include the quadruped joints`);
  const clips=new Set((gltf.animations||[]).map(animation=>animation.name));
  for(const required of pet.production.requiredAnimations){
   assert.ok(clips.has(required),`${pet.key} GLB is missing animation ${required}`);
  }
  for(const [field,filepath] of [['blend',blendFull],['glb',glbFull]]){
   const digest=createHash('sha256').update(readFileSync(filepath)).digest('hex');
   assert.equal(digest,pet.production[field+'Sha256'],`${pet.key} ${field} manifest hash is stale`);
  }

  // Check atlas
  const atlasFull = path.join(root,'app/src/main/assets',pet.production.atlasJson);
  assert.equal(existsSync(atlasFull),true,'missing atlas JSON '+atlasFull);
  const atlasData = JSON.parse(readFileSync(atlasFull, 'utf8'));
  assert.ok(Object.keys(atlasData.frames).length >= 16, 'atlas must contain at least 16 frames');

  // Check 5 turnaround renders (front, side, back, three_quarter, face_closeup) on dark and light
  const renderDir = path.join(root,'app/src/main/assets/virtual-pet',pet.key,'renders');
  for(const view of ['front','side','back','three_quarter','face_closeup']){
   const transparent=path.join(renderDir, `${view}.png`);
   assert.equal(existsSync(transparent), true, `missing ${view}.png`);
   assert.deepEqual([pngInfo(transparent).width,pngInfo(transparent).height],[256,256],`${pet.key} ${view} render size`);
   assert.equal(existsSync(path.join(renderDir, `${view}_dark.png`)), true, `missing ${view}_dark.png`);
   assert.equal(existsSync(path.join(renderDir, `${view}_light.png`)), true, `missing ${view}_light.png`);
  }
  for(const animation of ['idle_breathe','walk_loop']){
   const hashes=[];
   for(let frame=0;frame<8;frame++){
    const file=path.join(root,'app/src/main/assets/virtual-pet',pet.key,'sprites',`${animation}_${String(frame).padStart(2,'0')}.png`);
    assert.equal(existsSync(file),true,`missing ${pet.key} ${animation} frame ${frame}`);
    const info=pngInfo(file);
    assert.deepEqual([info.width,info.height],[168,168],`${pet.key} ${animation} frame ${frame} size`);
    hashes.push(createHash('sha256').update(readFileSync(file)).digest('hex'));
   }
   assert.ok(new Set(hashes).size>1,`${pet.key} ${animation} frames must actually move`);
  }
 }
});

test('F8 movement uses fresh generated sprite assets on its supported pages',()=>{
 const assets=path.join(root,'app/src/main/assets');
 for(const page of ['deepsyq.html','index.html','generate-studio.html','virtual-pet.html','my-creations.html','compare-ai.html','ai-agents.html']){
  const html=readFileSync(path.join(assets,page),'utf8');
  assert.match(html,/src="virtual-pet\.js\?v=f8-sprite-preload-20261103-1"/,`${page} must load the refreshed companion code`);
 }
 const petPage=readFileSync(path.join(assets,'virtual-pet.html'),'utf8');
 assert.match(petPage,/playSpriteLoop\('idle_breathe'\)/,'the preview should move as soon as a pet is selected');
 assert.match(petPage,/previewImg\.alt = `Animated \$\{d\.accessibilityName\} preview`/,'the preview description should follow the selected pet');
 assert.match(petPage,/prefers-reduced-motion: reduce/,'the pet preview must respect reduced-motion preference');
 assert.match(petPage,/sprites\/\$\{animName\}_0\$\{frame\}\.png\?v=\$\{assetVersion\}/,'preview controls should use regenerated animation frames');
 const runtime=readFileSync(path.join(assets,'virtual-pet.js'),'utf8');
 assert.match(runtime,/startPetSpriteAnimation\(petKey\)/,'the page companion should display the generated animation');
 assert.match(runtime,/Array\.from\(\{length: 8\}/,'the companion should preload all eight frames before playback');
 assert.match(runtime,/Promise\.all\(frameUrls\.map/,'the visible image must wait for frame loading instead of cycling through pending network requests');
 assert.match(runtime,/loadToken !== this\.spriteLoadToken/,'a stale pet preload must not replace the newly selected animal');
 assert.match(runtime,/\}, 210\)/,'frame timing should leave enough time for browser painting');
 assert.match(runtime,/prefers-reduced-motion: reduce/,'the companion must respect the user motion preference');
});
