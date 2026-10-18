import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeedanceAudioPayloadPreparer,seedanceAudioPayloadEnabled} from '../server/generation-reference-audio-payload.js';
const IDS=['123e4567-e89b-42d3-a456-426614174000','123e4567-e89b-42d3-a456-426614174001','123e4567-e89b-42d3-a456-426614174002'];
const readyEnv=()=>({AI_STUDIO_REFERENCE_AUDIO_PAYLOAD_ENABLED:'true',AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true'});
const pcm=({seconds=3,rate=8000}={})=>{
 const samples=Buffer.alloc(seconds*rate*2),fmt=Buffer.alloc(16),dataHead=Buffer.alloc(8);
 fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(rate,4);
 fmt.writeUInt32LE(rate*2,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 dataHead.write('data');dataHead.writeUInt32LE(samples.length,4);
 const payload=Buffer.concat([Buffer.from('WAVEfmt '),Buffer.from([16,0,0,0]),fmt,dataHead,samples]);
 const head=Buffer.alloc(8);head.write('RIFF');head.writeUInt32LE(payload.length,4);
 return Buffer.concat([head,payload]);
};
const audioProbe=({bytes})=>({audioCodec:'pcm_s16le',sampleRate:8000,channels:1,durationSeconds:(bytes.length-44)/16000,kind:'audio'});
function fixture({env=readyEnv(),bytes=new Map(IDS.map(id=>[id,pcm()])),visualCount=1,probe=audioProbe}={}){
 const calls=[];
 const ledger={async get({userId,id}){calls.push({op:'get',userId,id});
  if(userId!=='owner'||!bytes.has(id))throw Error('REFERENCE_MEDIA_ACCESS_DENIED');
  return bytes.get(id);
 }};
 const preparer=createSeedanceAudioPayloadPreparer({
  ledger,probe:async arg=>{calls.push({op:'probe',mime:arg.mime});return probe(arg);},
  verifyVisualContext:async({userId,model})=>{calls.push({op:'visual',userId,model});return visualCount;},env
 });
 return {preparer,calls};
}
test('private audio preparation stays OFF without BOTH review flags',async()=>{
 assert.equal(seedanceAudioPayloadEnabled({}),false);
 assert.equal(seedanceAudioPayloadEnabled({AI_STUDIO_REFERENCE_AUDIO_PAYLOAD_ENABLED:'true'}),false);
 assert.equal(seedanceAudioPayloadEnabled({AI_STUDIO_REFERENCE_TRANSFER_REVIEW_APPROVED:'true'}),false);
 const x=fixture({env:{}});
 await assert.rejects(()=>x.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]}),/REFERENCE_AUDIO_PAYLOAD_DISABLED/);
 assert.equal(x.calls.length,0);
});
test('WAV payload uses server-verified owner and exact ModelArk role; never calls provider',async()=>{
 const x=fixture(),result=await x.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]});
 assert.equal(result.providerSubmitted,false);assert.equal(result.transport,'server-only-base64');
 assert.equal(result.content.length,1);const item=result.content[0];
 assert.equal(item.role,'reference_audio');assert.equal(item.type,'audio_url');
 assert.ok(item.audio_url.url.startsWith('data:audio/wav;base64,'));
 assert.deepEqual(Buffer.from(item.audio_url.url.split(',')[1],'base64'),pcm());
 assert.ok(result.estimatedJsonBytes<5*1024*1024);
 assert.deepEqual(x.calls,[{op:'visual',userId:'owner',model:'byteplus-seedance-2'},
  {op:'get',userId:'owner',id:IDS[0]},{op:'probe',mime:'audio/wav'}]);
 assert.equal(result.publicUrl,undefined);assert.equal(result.providerRequest,undefined);
});
test('missing server-derived visual proof blocks even an otherwise valid audio input',async()=>{
 const x=fixture({visualCount:0});
 await assert.rejects(()=>x.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]}),/REFERENCE_VISUAL_PROOF_REQUIRED/);
 assert.equal(x.calls.filter(x=>x.op==='get').length,0);
});
test('preparation never reads another user, duplicate UUID or unsupported model',async()=>{
 const x=fixture();
 await assert.rejects(()=>x.preparer.prepare({userId:'intruder',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]}),/REFERENCE_MEDIA_ACCESS_DENIED/);
 await assert.rejects(()=>x.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0],IDS[0]]}),/REFERENCE_MEDIA_INVALID/);
 await assert.rejects(()=>x.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:['https://evil.test/audio.wav']}),/REFERENCE_MEDIA_INVALID/);
 await assert.rejects(()=>x.preparer.prepare({userId:'owner',model:'other-model',audioAssetIds:[IDS[0]]}),/REFERENCE_MODEL_NOT_SUPPORTED/);
});
test('storage acceptance is not provider acceptance: short or over-budget WAV rejected',async()=>{
 const short=fixture({bytes:new Map([[IDS[0],pcm({seconds:1})]])});
 await assert.rejects(()=>short.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]}),/REFERENCE_AUDIO_INCOMPATIBLE/);
 const long=fixture({bytes:new Map([[IDS[0],pcm({seconds:16})]])});
 await assert.rejects(()=>long.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]}),/REFERENCE_AUDIO_INCOMPATIBLE/);
 const tooMany=fixture({bytes:new Map(IDS.map(id=>[id,pcm({seconds:6})]))});
 await assert.rejects(()=>tooMany.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:IDS}),/REFERENCE_AUDIO_DURATION_TOTAL/);
 const big=fixture({bytes:new Map([[IDS[0],Buffer.alloc(1024*1024+1)]])});
 await assert.rejects(()=>big.preparer.prepare({userId:'owner',model:'byteplus-seedance-2',audioAssetIds:[IDS[0]]}),/REFERENCE_AUDIO_TOO_LARGE_FOR_BASE64/);
});
test('provider payload preparation refuses absent server visual-verification implementation',()=>{
 assert.throws(()=>createSeedanceAudioPayloadPreparer({ledger:{get:async()=>pcm()}}),/REFERENCE_AUDIO_PREPARER_NOT_CONFIGURED/);
});
