import test from 'node:test';
import assert from 'node:assert/strict';
import {seedance20ReferenceCompatibility as assess} from '../server/generation-reference-compatibility.js';

const video=(durationSeconds=5)=>({
 mime:'video/mp4',videoCodec:'h264',audioCodec:'aac',size:1800000,
 durationSeconds,width:1280,height:720,frameRate:24
});
const audio=(durationSeconds=4)=>({
 mime:'audio/wav',audioCodec:'pcm_s16le',size:128000,
 durationSeconds,sampleRate:16000,channels:1
});
const model='byteplus-seedance-2';

test('Seedance reference preflight is model-specific and requires visual input',()=>{
 assert.equal(assess({model:'another-model',videos:[video()]}).reason,'REFERENCE_MODEL_NOT_SUPPORTED');
 assert.equal(assess({model,audios:[audio()]}).reason,'REFERENCE_VISUAL_REQUIRED');
 assert.equal(assess({model,videos:[video()]}).compatible,true);
 assert.equal(assess({model,imageCount:1,audios:[audio()]}).compatible,true);
 assert.equal(assess({model,imageCount:4}).reason,'REFERENCE_COUNT_UNSUPPORTED');
 assert.equal(assess({model,videos:[video(),video(),video(),video()]}).reason,'REFERENCE_COUNT_UNSUPPORTED');
 assert.equal(assess({model,videos:[video()],audios:[audio(),audio(),audio(),audio()]}).reason,'REFERENCE_COUNT_UNSUPPORTED');
});
test('official Seedance 2.0 duration budgets are stricter than S3 staging',()=>{
 assert.equal(assess({model,videos:[video(15)]}).compatible,true);
 assert.equal(assess({model,videos:[video(16)]}).reason,'REFERENCE_VIDEO_INCOMPATIBLE');
 assert.equal(assess({model,videos:[video(1.5)]}).reason,'REFERENCE_VIDEO_INCOMPATIBLE');
 assert.equal(assess({model,videos:[video(8),video(8)]}).reason,'REFERENCE_VIDEO_DURATION_TOTAL');
 assert.equal(assess({model,imageCount:1,audios:[audio(8),audio(8)]}).reason,'REFERENCE_AUDIO_DURATION_TOTAL');
 assert.equal(assess({model,imageCount:1,audios:[audio(16)]}).reason,'REFERENCE_AUDIO_INCOMPATIBLE');
 assert.equal(assess({model,videos:[video(5)],audios:[audio(5)]}).compatible,true);
});
test('Seedance video metadata checks prevent false provider-ready claims',()=>{
 for(const changes of [
  {videoCodec:'hevc'}, {width:320,height:240}, {frameRate:15},
  {width:8000}, {width:1200,height:200}, {audioCodec:'mp3'},
  {size:20*1024*1024+1}, {durationSeconds:0}
 ]){
  const item={...video(),...changes};
  assert.equal(assess({model,videos:[item]}).reason,'REFERENCE_VIDEO_INCOMPATIBLE');
 }
});
test('Seedance audio metadata checks are bounded and require real PCM format',()=>{
 for(const changes of [
  {audioCodec:'mp3'}, {channels:8},{sampleRate:4000},
  {durationSeconds:30},{size:8*1024*1024+1},{durationSeconds:0}
 ]){
  assert.equal(assess({model,imageCount:1,audios:[{...audio(),...changes}]}).reason,'REFERENCE_AUDIO_INCOMPATIBLE');
 }
});
test('compatibility is read-only and does not construct URLs, credentials or send files',()=>{
 const v=video(3),a=audio(5);
 const input={model,imageCount:1,videos:[v],audios:[a]};
 const before=JSON.stringify(input),result=assess(input);
 assert.deepEqual(result,{compatible:true,reason:null,referenceVideos:1,referenceAudio:1,
  referenceImages:1,videoDurationSeconds:3,audioDurationSeconds:5});
 assert.equal(JSON.stringify(input),before);
 assert.equal(result.url,undefined);assert.equal(result.providerRequest,undefined);
});
