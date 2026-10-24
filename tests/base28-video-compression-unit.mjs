import test from 'node:test';
import assert from 'node:assert/strict';
import {videoCompressionArgs,videoCompressionSummary,videoCompressionInputSupported} from '../app/src/main/assets/video-compression-args.mjs';

test('BASE #28: all local FFmpeg presets map a real video and optional audio, no shell command',()=>{
 for(const [preset,crf,bitrate] of [['small','31','96k'],['balanced','27','128k'],['quality','23','160k']]){
  const argv=videoCompressionArgs(preset);
  assert.equal(argv[0],'-i');assert.equal(argv[1],'input');
  assert.deepEqual(argv.slice(2,6),['-map','0:v:0','-map','0:a:0?']);
  assert.equal(argv[argv.indexOf('-crf')+1],crf);
  assert.equal(argv[argv.indexOf('-b:a')+1],bitrate);
  assert.equal(argv.at(-1),'compressed.mp4');
  assert.ok(argv.includes('libx264'));assert.ok(argv.includes('yuv420p'));
  assert.ok(!argv.some(a=>/[;&|<>]/.test(a.replace('0:a:0?',''))),'no shell metacharacters');
 }
});
test('BASE #28: invalid preset or user-supplied file path fails closed',()=>{
 assert.throws(()=>videoCompressionArgs(';-vf evil'),/INVALID_COMPRESSION_PRESET/);
 assert.throws(()=>videoCompressionArgs('__proto__'),/INVALID_COMPRESSION_PRESET/);
 assert.throws(()=>videoCompressionArgs('balanced','../../private.mp4'),/INVALID_OUTPUT_FILENAME/);
});
test('BASE #28: report measured savings without promising smaller output',()=>{
 assert.deepEqual(videoCompressionSummary(1000,600),{savedPercent:40,smaller:true});
 assert.deepEqual(videoCompressionSummary(1000,1300),{savedPercent:-30,smaller:false});
 assert.throws(()=>videoCompressionSummary(0,100),/INVALID_VIDEO_SIZE/);
 assert.throws(()=>videoCompressionSummary(200,-3),/INVALID_VIDEO_SIZE/);
 assert.throws(()=>videoCompressionSummary(200,0),/INVALID_VIDEO_SIZE/); // Empty FFmpeg output is never 100% saved.
});
test('BASE #28: reject non-video sources before allocating browser WASM',()=>{
 assert.equal(videoCompressionInputSupported({name:'photo.png',type:'image/png'}),false);
 assert.equal(videoCompressionInputSupported({name:'document.pdf',type:'application/pdf'}),false);
 assert.equal(videoCompressionInputSupported({name:'mobile.MOV',type:''}),true);
 assert.equal(videoCompressionInputSupported({name:'clip.webm',type:'application/octet-stream'}),true);
 assert.equal(videoCompressionInputSupported({name:'unknown',type:'video/mp4'}),true);
 assert.equal(videoCompressionInputSupported(null),false);
});
