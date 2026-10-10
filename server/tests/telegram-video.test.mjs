import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {workerSignature,verifyWorkerSignature,acceptedTelegramVideo,videoFilters,videoArguments,VIDEO_MAX_BYTES,VIDEO_MODES} from '../telegram-video-core.js';

test('Windows worker signatures are strict, time-limited and reject changed bodies',()=>{
 const token='very_private_dummy_test_token';const ts=String(Date.now()),method='POST',path='/api/telegram/worker/next',body={};
 const sig=workerSignature(token,method,path,ts,body);
 assert.equal(verifyWorkerSignature(token,method,path,ts,body,sig),true);
 assert.equal(verifyWorkerSignature(token,method,path,ts,{other:1},sig),false);
 assert.equal(verifyWorkerSignature(token,method,'/api/telegram/worker/report',ts,body,sig),false);
 assert.equal(verifyWorkerSignature('not_the_token',method,path,ts,body,sig),false);
 assert.equal(verifyWorkerSignature(token,method,path,ts,body,sig,Date.now()+91_000),false);
});
test('Telegram input only accepts video under 20MiB and 60s',()=>{
 const video={file_id:'ABC',file_size:VIDEO_MAX_BYTES,duration:60};
 assert.deepEqual(acceptedTelegramVideo({video}),{fileId:'ABC',fileSize:VIDEO_MAX_BYTES,duration:60});
 assert.equal(acceptedTelegramVideo({video:{...video,file_size:VIDEO_MAX_BYTES+1}}).error,'SIZE');
 assert.equal(acceptedTelegramVideo({video:{...video,duration:61}}).error,'DURATION');
 assert.equal(acceptedTelegramVideo({document:{file_id:'ABC',mime_type:'application/pdf',file_size:10}}).error,'NOT_VIDEO');
 assert.equal(acceptedTelegramVideo({document:{file_id:'ABC',mime_type:'video/mp4',file_size:100}}).fileId,'ABC');
});
test('all three FFmpeg modes only use fixed approved transformations',()=>{
 assert.deepEqual(VIDEO_MODES,['gentle','balanced','dynamic']);
 for(const mode of VIDEO_MODES){
  const args=videoArguments(mode,'any;name.mp4','result.mp4');
  assert.equal(args.includes('-i'),true);
  assert.equal(args.includes('-vf'),true);
  assert.ok(args.includes('-threads'));
  assert.ok(videoFilters(mode).includes('scale='));
 }
 assert.throws(()=>videoArguments('evil','source','out'),/INVALID_MODE/);
});
test('FFmpeg generates a decodable MP4 for every mode', {skip:spawnSync('ffmpeg',['-version']).status!==0||spawnSync('ffprobe',['-version']).status!==0,timeout:60000}, async()=>{
 const folder=await mkdtemp(join(tmpdir(),'vv-tg-ffmpeg-test-'));
 try{
  const input=join(folder,'input.mp4');
  let r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=15','-t','1','-c:v','mpeg4','-y',input],{timeout:15000});
  assert.equal(r.status,0,r.stderr?.toString());
  for(const mode of VIDEO_MODES){
   const output=join(folder,mode+'.mp4');
   r=spawnSync('ffmpeg',['-loglevel','error',...videoArguments(mode,input,output)],{timeout:25000});
   assert.equal(r.status,0,`${mode}: ${r.stderr?.toString()}`);
   const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,codec_name','-of','default=noprint_wrappers=1',output],{timeout:10000});
   assert.equal(probe.status,0);
   assert.match(probe.stdout.toString(),/codec_name=h264/);
  }
 }finally{await rm(folder,{recursive:true,force:true})}
});
