import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSeedanceStagedReferenceInspector} from '../server/generation-reference-inspector.js';

const ONE='123e4567-e89b-42d3-a456-426614174000';
const TWO='123e4567-e89b-42d3-a456-426614174001';
const THREE='123e4567-e89b-42d3-a456-426614174002';
const videoMeta={kind:'video',videoCodec:'h264',width:1280,height:720,frameRate:24,durationSeconds:5,audioCodec:'aac'};
const audioMeta={kind:'audio',audioCodec:'pcm_s16le',sampleRate:16000,channels:1,durationSeconds:4};
function fixture(){
 const calls=[],objects=new Map([[ONE,Buffer.alloc(100)],[TWO,Buffer.alloc(300)],[THREE,Buffer.alloc(700)]]);
 const ledger={async get({userId,id}){
  calls.push({op:'get',userId,id});
  if(userId!=='owner'||!objects.has(id))throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
  return objects.get(id);
 }};
 const probe=async({mime,bytes})=>{
  calls.push({op:'probe',mime,length:bytes.length});
  return mime==='video/mp4'?(bytes.length===700?{...videoMeta,durationSeconds:7}:videoMeta):audioMeta;
 };
 return {inspector:createSeedanceStagedReferenceInspector({ledger,probe}),calls,objects};
}
test('server reinspection uses only owner-scoped opaque IDs and real retrieved bytes',async()=>{
 const x=fixture();
 const result=await x.inspector.inspect({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ONE],audioAssetIds:[TWO]});
 assert.deepEqual(result,{compatible:true,reason:null,referenceVideos:1,referenceAudio:1,
  referenceImages:0,videoDurationSeconds:5,audioDurationSeconds:4});
 assert.deepEqual(x.calls,[
  {op:'get',userId:'owner',id:ONE},
  {op:'probe',mime:'video/mp4',length:100},
  {op:'get',userId:'owner',id:TWO},
  {op:'probe',mime:'audio/wav',length:300}
 ]);
 assert.equal(JSON.stringify(result).includes(ONE),false);
 assert.equal(result.url,undefined);assert.equal(result.providerPayload,undefined);
});
test('wrong owner, expired or missing asset never becomes provider-compatible',async()=>{
 const x=fixture();
 await assert.rejects(()=>x.inspector.inspect({userId:'intruder',model:'byteplus-seedance-2',videoAssetIds:[ONE]}),/REFERENCE_MEDIA_ACCESS_DENIED/);
 x.objects.delete(ONE);
 await assert.rejects(()=>x.inspector.inspect({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ONE]}),/REFERENCE_MEDIA_ACCESS_DENIED/);
});
test('reject malformed, duplicate, extra and unsafely supplied asset IDs before GET',async()=>{
 const x=fixture();
 for(const change of [
  {videoAssetIds:[ONE,ONE]},
  {videoAssetIds:['https://example.com/movie.mp4']},
  {videoAssetIds:[ONE,TWO,THREE,ONE]},
  {videoAssetIds:[ONE],audioAssetIds:[ONE]},
  {audioAssetIds:[]},
  {videoAssetIds:[ONE],imageCount:8}
 ]){
  await assert.rejects(()=>x.inspector.inspect({userId:'owner',model:'byteplus-seedance-2',...change}),/REFERENCE_MEDIA_INVALID/);
 }
 assert.equal(x.calls.length,0);
});
test('unsupported model is rejected without touching owner files',async()=>{
 const x=fixture();
 assert.deepEqual(await x.inspector.inspect({userId:'owner',model:'unconnected-model',videoAssetIds:[ONE]}),
  {compatible:false,reason:'REFERENCE_MODEL_NOT_SUPPORTED'});
 assert.equal(x.calls.length,0);
});
test('provider limits are checked again after trusted byte inspection',async()=>{
 const x=fixture();
 const result=await x.inspector.inspect({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[TWO],imageCount:1});
 assert.equal(result.compatible,true);
 const fail=await x.inspector.inspect({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ONE,TWO,THREE]});
 assert.equal(fail.reason,'REFERENCE_VIDEO_DURATION_TOTAL');
});

test('internal presign snapshot holds deterministic SHA256 without exposing it in normal inspection',async()=>{
 const x=fixture(),bytes=x.objects.get(ONE);
 const regular=await x.inspector.inspect({userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ONE]});
 assert.equal(regular.compatible,true);
 assert.equal(regular.videoDigests,undefined);
 assert.equal(JSON.stringify(regular).includes(createHash('sha256').update(bytes).digest('hex')),false);
 const snapshot=await x.inspector.inspectVideoSnapshot({
  userId:'owner',model:'byteplus-seedance-2',videoAssetIds:[ONE]
 });
 assert.deepEqual(snapshot.verdict,regular);
 assert.deepEqual(snapshot.videoDigests,[createHash('sha256').update(bytes).digest('hex')]);
 assert.equal(JSON.stringify(snapshot).includes('owner'),false);
 assert.equal(JSON.stringify(snapshot).includes(ONE),false);
});
