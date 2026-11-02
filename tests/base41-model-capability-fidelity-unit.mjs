import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';

const video=MODEL_CATALOG.filter(m=>m.kind==='video');
const get=(id)=>MODEL_CATALOG.find(m=>m.id===id);

test('BASE #41: every catalog model has immutable, explicit supported capability contract',()=>{
 assert.ok(MODEL_CATALOG.length>=8);
 assert.equal(new Set(MODEL_CATALOG.map(m=>m.id)).size,MODEL_CATALOG.length);
 for(const model of MODEL_CATALOG){
  const c=model.capabilities;
  assert.ok(Object.isFrozen(model));
  assert.ok(Object.isFrozen(c));
  for(const name of ['inputKinds','ratios','resolutions','durations','videoInputModes','outputFormats','watermarkOptions']){
   assert.ok(Array.isArray(c[name]),name+' '+model.id);
   assert.ok(Object.isFrozen(c[name]),name+' '+model.id);
  }
  assert.equal(c.maxReferences,model.references);
  assert.equal(typeof c.supportsTextToVideo,'boolean');
  assert.equal(typeof c.supportsImageToVideo,'boolean');
 }
});

test('BASE #41: actual text-to-video and image-to-video capability matches usable input modes',()=>{
 assert.ok(video.length>=3);
 for(const model of video){
  const c=model.capabilities;
  assert.equal(c.supportsTextToVideo,c.videoInputModes.includes('text'));
  const imageModes=c.videoInputModes.filter(x=>['first_frame','first_last','reference_image'].includes(x));
  assert.equal(c.supportsImageToVideo,c.maxReferences>0&&imageModes.length>0);
  assert.equal(c.supportsImageReferences,c.maxReferences>0);
  assert.ok(c.inputKinds.includes('text'));
  if(c.supportsImageToVideo)assert.ok(c.inputKinds.includes('image'));
 }
});

test('BASE #41: never advertise reference-video, reference-audio or watermark transport not wired in Studio',()=>{
 for(const m of MODEL_CATALOG){
  const c=m.capabilities;
  assert.equal(c.supportsVideoReferences,false,m.id);
  assert.equal(c.supportsAudioReferences,false,m.id);
  assert.deepEqual(c.watermarkOptions,[],m.id);
  assert.equal(c.supportsWatermarkControl,false,m.id);
  assert.equal(c.supportsSeed,false,m.id);
  assert.equal(c.supportsNegativePrompt,false,m.id);
 }
});

test('BASE #41: max video duration reports a declared supported duration and does not invent 4K',()=>{
 for(const m of video){
  const c=m.capabilities;
  assert.ok(c.durations.length>0,m.id);
  assert.ok(c.durations.every(n=>Number.isSafeInteger(n)&&n>0));
  assert.equal(c.maxDurationSeconds,Math.max(...c.durations));
  assert.ok(c.durations.includes(c.durationSeconds));
  assert.ok(c.resolutions.every(r=>['720p','1080p'].includes(r)),m.id);
  assert.ok(!c.resolutions.includes('4K'));
 }
 assert.equal(get('byteplus-seedance-2').capabilities.maxDurationSeconds,15);
 assert.equal(get('veo-3.1-lite-generate-preview').capabilities.maxDurationSeconds,8);
});

test('BASE #41: video roles precisely reflect real advertised provider setup, not generic feature claims',()=>{
 for(const m of video){
  const c=m.capabilities;
  assert.ok(c.videoInputModes.every(x=>['text','first_frame','first_last','reference_image'].includes(x)));
  if(m.provider==='Google'){
   assert.equal(c.maxReferences,1);
   assert.deepEqual(c.videoInputModes,['text','first_frame']);
   assert.equal(c.supportsImageToVideo,true);
  }
 }
 const b=get('byteplus-seedance-2').capabilities;
 assert.equal(b.maxReferences,3);
 assert.deepEqual(b.videoInputModes,['text','first_frame','first_last','reference_image']);
});

test('BASE #41: still-unwired speech provider entries never claim functioning video or reference inputs',()=>{
 for(const m of MODEL_CATALOG.filter(m=>m.kind==='voice')){
  assert.equal(m.adapter,false);
  assert.equal(m.capabilities.outputKind,'audio');
  assert.equal(m.capabilities.supportsTextToVideo,false);
  assert.equal(m.capabilities.supportsImageToVideo,false);
  assert.equal(m.capabilities.maxDurationSeconds,null);
  assert.equal(m.capabilities.maxReferences,0);
 }
});

test('BASE #41: image/music types do not masquerade as video and music exposes real declared duration',()=>{
 for(const m of MODEL_CATALOG.filter(m=>m.kind==='image')){
  const c=m.capabilities;
  assert.equal(c.outputKind,'image');
  assert.equal(c.maxDurationSeconds,null);
  assert.equal(c.supportsTextToVideo,false);
  assert.equal(c.supportsImageToVideo,false);
  assert.ok(c.resolutions.length>0);
 }
 const music=get('lyria-3-clip-preview');
 assert.equal(music.capabilities.outputKind,'audio');
 assert.equal(music.capabilities.maxDurationSeconds,30);
 assert.equal(music.capabilities.supportsTextToVideo,false);
 assert.equal(music.capabilities.supportsImageToVideo,false);
});
