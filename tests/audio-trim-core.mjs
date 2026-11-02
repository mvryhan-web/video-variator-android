import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {audioTrimSettings,trimAudioLocal} from '../app/src/main/assets/audio-trim-core.js';

const input=()=>new File([Buffer.from([0x52,0x49,0x46,0x46])],'voice recording.wav',{type:'audio/wav'});
test('audio trimmer validates a bounded local range and produces a safe MP3 name',()=>{
 const options=audioTrimSettings(input(),'1.2','4.6');
 assert.equal(options.input,'source.wav');
 assert.equal(options.begin,1.2);
 assert.ok(Math.abs(options.seconds-3.4)<0.00001);
 assert.equal(options.output,'Deepsyq-voice-recording-trimmed.mp3');
 for(const [start,end] of [[-1,2],[5,5],[6,4],[0,601],['','3'],['nope','5']])
  assert.throws(()=>audioTrimSettings(input(),start,end),/AUDIO_TRIM_RANGE_INVALID/);
 assert.throws(()=>audioTrimSettings(new File([Buffer.from('bad')],'evil.exe'),0,2),/AUDIO_TRIM_FILE_UNSUPPORTED/);
 assert.throws(()=>audioTrimSettings({name:'long.mp3',size:51*1024*1024},0,2),/AUDIO_TRIM_FILE_UNSUPPORTED/);
});
test('rejects whitespace-only, non-numeric types, booleans, arrays, and objects for start and end',()=>{
 const rejectedValues=['   ','\t','\n',null,undefined,false,true,[],[0],{},{start:0}];
 for(const val of rejectedValues){
  assert.throws(()=>audioTrimSettings(input(),val,5),/AUDIO_TRIM_RANGE_INVALID/);
  assert.throws(()=>audioTrimSettings(input(),0,val),/AUDIO_TRIM_RANGE_INVALID/);
 }
});
test('accepts valid numbers and numeric strings including 0 and "0"',()=>{
 const validCases=[
  [0,2,0,2],
  ['0','2',0,2],
  ['0','4.6',0,4.6],
  ['1.2','4.6',1.2,3.4],
  [1.5,4.5,1.5,3.0]
 ];
 for(const [start,end,expectedBegin,expectedSeconds] of validCases){
  const res=audioTrimSettings(input(),start,end);
  assert.equal(res.begin,expectedBegin);
  assert.ok(Math.abs(res.seconds-expectedSeconds)<0.00001);
 }
});
test('local audio trim writes source, encodes exactly selected interval and terminates worker',async()=>{
 const calls=[],encoded=new Uint8Array([73,68,51,3,0,0]);
 let terminated=false;
 const fake={async writeFile(name,bytes){calls.push(['input',name,bytes.length]);},
 async exec(args){calls.push(['cmd',args]);return 0;},
 async readFile(name){assert.equal(name,'output.mp3');return encoded;},
 terminate(){terminated=true;}};
 const result=await trimAudioLocal(input(),{start:1,end:3,
  createEngine:async()=>fake,onEngine:engine=>assert.equal(engine,fake)});
 assert.equal(result.name,'Deepsyq-voice-recording-trimmed.mp3');
 assert.equal(result.type,'audio/mpeg');
 assert.equal(result.size,encoded.length);
 assert.equal(terminated,true);
 const args=calls.find(x=>x[0]==='cmd')[1];
 assert.deepEqual(args.slice(0,2),['-ss','1.000']);
 assert.equal(args[args.indexOf('-t')+1],'2.000');
 assert.ok(args.includes('libmp3lame'));
});
test('cancelled, failed and interrupted audio trim releases FFmpeg worker',async()=>{
 for(const scenario of ['cancel-before','cancel-after','encoder-fails']){
  let terminated=false,invocations=0;
  const abort=new AbortController();
  if(scenario==='cancel-before')abort.abort();
  const fake={async writeFile(){invocations++;if(scenario==='cancel-after')abort.abort();},
   async exec(){return 1;},async readFile(){return new Uint8Array([73,68,51]);},
   terminate(){terminated=true;}};
  await assert.rejects(()=>trimAudioLocal(input(),{start:0,end:2,signal:abort.signal,
   createEngine:async()=>{invocations++;return fake;}}),
   /AUDIO_TRIM_CANCELLED|AUDIO_TRIM_FAILED/);
  assert.equal(terminated,scenario!=='cancel-before');
  assert.equal(invocations,scenario==='cancel-before'?0:2);
 }
});
