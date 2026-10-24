import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {inspectStudioReferenceMedia} from '../server/generation-reference-media.js';
import {validateStudioReferenceProbe,probeStudioReferenceMedia} from '../server/generation-reference-probe.js';

function box(type,bytes=Buffer.alloc(0)){
 const header=Buffer.alloc(8);header.writeUInt32BE(bytes.length+8,0);header.write(type,4);
 return Buffer.concat([header,bytes]);
}
function video(){
 const brand=Buffer.alloc(8);brand.write('isom');
 const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(5000,16);
 const hdlr=Buffer.alloc(12);hdlr.write('vide',8);
 return Buffer.concat([box('ftyp',brand),box('moov',Buffer.concat([box('mvhd',mvhd),box('trak',box('mdia',box('hdlr',hdlr)))])),box('mdat',Buffer.from([0,1,2,3]))]);
}
function wav(){
 const samples=Buffer.alloc(16000),fmt=Buffer.alloc(16);
 fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(8000,4);
 fmt.writeUInt32LE(16000,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 const payload=Buffer.concat([Buffer.from('WAVEfmt '),Buffer.from([16,0,0,0]),fmt,Buffer.from('data'),Buffer.from([128,62,0,0]),samples]);
 const header=Buffer.alloc(8);header.write('RIFF');header.writeUInt32LE(payload.length,4);
 return Buffer.concat([header,payload]);
}
const validVideo={
 format:{format_name:'mov,mp4,m4a,3gp,3g2,mj2',duration:'5.000000'},
 streams:[{codec_type:'video',codec_name:'h264',pix_fmt:'yuv420p',width:1280,height:720,avg_frame_rate:'25/1',duration:'5.000000'}]
};
const validAudio={
 format:{format_name:'wav',duration:'1.000000'},
 streams:[{codec_type:'audio',codec_name:'pcm_s16le',sample_rate:'8000',channels:1,duration:'1.000000'}]
};
test('probe report accepts bounded H.264 and PCM WAV but rejects unsupported tracks',()=>{
 const v=validateStudioReferenceProbe({mime:'video/mp4',report:validVideo,structural:inspectStudioReferenceMedia({bytes:video(),mime:'video/mp4'})});
 assert.equal(v.videoCodec,'h264');assert.equal(v.width,1280);assert.equal(v.durationSeconds,5);
 assert.equal(validateStudioReferenceProbe({mime:'audio/wav',report:validAudio}).audioCodec,'pcm_s16le');
 for(const change of [
  {streams:[{...validVideo.streams[0],codec_name:'hevc'}]},
  {streams:[{...validVideo.streams[0],pix_fmt:'yuv444p'}]},
  {streams:[{...validVideo.streams[0],width:7680}]},
  {streams:[{...validVideo.streams[0],avg_frame_rate:'0/0'}]},
  {streams:[...validVideo.streams,{codec_type:'subtitle',codec_name:'mov_text'}]},
  {format:{...validVideo.format,duration:'31'}}
 ])assert.throws(()=>validateStudioReferenceProbe({mime:'video/mp4',report:{...validVideo,...change}}),/REFERENCE_MEDIA_CODEC_UNSUPPORTED/);
 for(const bad of [
  {streams:[{...validAudio.streams[0],codec_name:'mp3'}]},
  {streams:[{...validAudio.streams[0],channels:8}]},
  {format:{...validAudio.format,duration:'61'}}
 ])assert.throws(()=>validateStudioReferenceProbe({mime:'audio/wav',report:{...validAudio,...bad}}),/REFERENCE_MEDIA_CODEC_UNSUPPORTED/);
});
test('ffprobe reads a temporary private file with no remote URL and deletes it',async()=>{
 const bytes=wav();let seen=null;
 const run=async(binary,args,options)=>{
  assert.equal(binary,'ffprobe');assert.equal(options.windowsHide,true);assert.ok(options.timeout<=10000);
  assert.ok(args.includes('-protocol_whitelist'));assert.ok(args.includes('file'));
  seen=args[args.length-1];
  assert.deepEqual(await readFile(seen),bytes);
  return {stdout:JSON.stringify(validAudio)};
 };
 const result=await probeStudioReferenceMedia({bytes,mime:'audio/wav',run});
 assert.equal(result.audioCodec,'pcm_s16le');
 await assert.rejects(()=>stat(seen),{code:'ENOENT'});
});
test('missing ffprobe fails closed and removes temporary media',async()=>{
 let seen=null;
 await assert.rejects(()=>probeStudioReferenceMedia({
  mime:'audio/wav',bytes:wav(),run:async(_binary,args)=>{
   seen=args[args.length-1];const e=Error('binary missing');e.code='ENOENT';throw e;
  }
 }),/REFERENCE_MEDIA_PROBE_UNAVAILABLE/);
 await assert.rejects(()=>stat(seen),{code:'ENOENT'});
});
test('ffprobe has to confirm actual codec even if MP4 container header looks acceptable',async()=>{
 await assert.rejects(()=>probeStudioReferenceMedia({mime:'video/mp4',bytes:video(),
  run:async()=>({stdout:JSON.stringify({...validVideo,streams:[{...validVideo.streams[0],codec_name:'hevc'}]})})
 }),/REFERENCE_MEDIA_CODEC_UNSUPPORTED/);
});
const hasFfprobe=spawnSync('ffprobe',['-version'],{timeout:3000,encoding:'utf8'}).status===0;
test('real ffprobe accepts a simple uncompressed PCM WAV',{skip:!hasFfprobe},async()=>{
 const result=await probeStudioReferenceMedia({mime:'audio/wav',bytes:wav()});
 assert.equal(result.audioCodec,'pcm_s16le');assert.equal(result.durationSeconds,1);
});

const hasX264=hasFfprobe&&spawnSync('ffmpeg',['-hide_banner','-encoders'],{timeout:5000,encoding:'utf8'}).stdout?.includes('libx264');
test('real ffprobe accepts a bounded H.264 MP4 generated locally',{skip:!hasX264},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'deepsyq-probe-test-'));
 try{
  const filename=join(dir,'fixture.mp4');
  const result=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=320x240:r=24','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',filename],{timeout:15000,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const inspection=await probeStudioReferenceMedia({mime:'video/mp4',bytes:await readFile(filename)});
  assert.equal(inspection.videoCodec,'h264');assert.equal(inspection.width,320);assert.equal(inspection.height,240);
 }finally{await rm(dir,{recursive:true,force:true});}
});
