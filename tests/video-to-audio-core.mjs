import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {videoToAudioSettings,videoToMp3Local} from '../app/src/main/assets/video-to-audio-core.js';

const source=(name='family trip.mp4')=>new File([Buffer.from([0,0,0,18,102,116,121,112])],name,{type:'video/mp4'});
test('Video to MP3 accepts bounded local video and sanitizes the download name',()=>{
 const opts=videoToAudioSettings(source());
 assert.deepEqual(opts,{source:'source.mp4',output:'Deepsyq-family-trip-audio.mp3'});
 assert.throws(()=>videoToAudioSettings(source('photo.png')),/VIDEO_AUDIO_FILE_UNSUPPORTED/);
 assert.throws(()=>videoToAudioSettings({name:'huge.mp4',size:81*1024*1024,type:'video/mp4'}),/VIDEO_AUDIO_FILE_UNSUPPORTED/);
 assert.throws(()=>videoToAudioSettings({name:'bad.mp4',size:1024,type:'image/png'}),/VIDEO_AUDIO_FILE_UNSUPPORTED/);
 assert.throws(()=>videoToAudioSettings(null),/VIDEO_AUDIO_FILE_UNSUPPORTED/);
});
test('Video to MP3 maps only the first audio track and encodes 192k MP3',async()=>{
 const steps=[],mp3=Uint8Array.from([73,68,51,5,0,0,0,0,0]);
 let finished=false;
 const engine={
  async writeFile(name,bytes){steps.push(['write',name,bytes.length]);},
  async exec(args){steps.push(['encode',args]);return 0;},
  async readFile(path){assert.equal(path,'extracted.mp3');return mp3;},
  terminate(){finished=true;}
 };
 const result=await videoToMp3Local(source(),{createEngine:async()=>engine});
 assert.equal(result.name,'Deepsyq-family-trip-audio.mp3');
 assert.equal(result.type,'audio/mpeg');assert.equal(result.size,mp3.length);
 const args=steps.find(x=>x[0]==='encode')[1];
 assert.deepEqual(args.slice(0,4),['-i','source.mp4','-map','0:a:0']);
 assert.ok(args.includes('-vn'));
 assert.equal(args[args.indexOf('-b:a')+1],'192k');
 assert.equal(finished,true);
});
test('silent video does not create a fake MP3; FFmpeg worker is released',async()=>{
 let released=false,reads=0;
 const engine={
  async writeFile(){},async exec(){return 1;},
  async readFile(){reads++;return Uint8Array.of(0);},terminate(){released=true;}
 };
 await assert.rejects(()=>videoToMp3Local(source(),{createEngine:async()=>engine}),
  /VIDEO_AUDIO_NO_AUDIO_OR_UNSUPPORTED/);
 assert.equal(reads,0);assert.equal(released,true);
});
test('cancelled video conversion never starts audio extraction and releases worker',async()=>{
 const abort=new AbortController(),events=[];
 const engine={
  async writeFile(){events.push('write');abort.abort();},
  async exec(){events.push('exec');return 0;},
  async readFile(){events.push('read');return Uint8Array.of(1);},
  terminate(){events.push('terminate');}
 };
 await assert.rejects(()=>videoToMp3Local(source(),{signal:abort.signal,createEngine:async()=>engine}),
  /VIDEO_AUDIO_CANCELLED/);
 assert.deepEqual(events,['write','terminate']);
 abort.abort();
});
