// Fail-closed media inspection for BASE #5. No provider/media URLs or generation.
// ffprobe checks codecs/dimensions/duration; this is NOT malware scanning.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectStudioReferenceMedia} from './generation-reference-media.js';

const execFileAsync=promisify(execFile);
const finite=(value,min,max)=>{
 const n=Number(value);
 return value!==null&&value!==undefined&&value!==''&&Number.isFinite(n)&&n>=min&&n<=max;
};
const bad=()=>{throw Error('REFERENCE_MEDIA_CODEC_UNSUPPORTED');};
function fps(value){
 if(typeof value!=='string'||!/^\d+(?:\/\d+)?$/.test(value))return NaN;
 const [a,b='1']=value.split('/').map(Number);
 return b>0?a/b:NaN;
}
export function validateStudioReferenceProbe({mime,report,structural}={}){
 if(!report||typeof report!=='object'||Array.isArray(report)||!Array.isArray(report.streams)||!report.format)bad();
 if(report.streams.length<1||report.streams.length>2)bad();
 const {streams,format}=report;
 const formatName=String(format.format_name||'').split(',');
 if(mime==='video/mp4'){
  if(!formatName.includes('mp4')&&!formatName.includes('mov'))bad();
  const videos=streams.filter(s=>s?.codec_type==='video');
  const audios=streams.filter(s=>s?.codec_type==='audio');
  if(videos.length!==1||audios.length>1||videos.length+audios.length!==streams.length)bad();
  const v=videos[0];
  if(v.codec_name!=='h264'||v.pix_fmt!=='yuv420p')bad();
  if(!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width<16||v.height<16||v.width>3840||v.height>2160||v.width*v.height>8294400)bad();
  if(!finite(fps(String(v.avg_frame_rate||'')),1,60))bad();
  if(audios.some(a=>a.codec_name!=='aac'||!finite(a.sample_rate,8000,96000)||!finite(a.channels,1,2)))bad();
  if(!finite(format.duration,0.001,30))bad();
  for(const stream of streams)if(stream.duration!=null&&!finite(stream.duration,0.001,30))bad();
  if(structural&&!finite(structural.durationSeconds,0.001,30))bad();
  return {kind:'video',videoCodec:'h264',width:v.width,height:v.height,frameRate:fps(String(v.avg_frame_rate)),durationSeconds:Number(format.duration),audioCodec:audios[0]?.codec_name||null};
 }
 if(mime==='audio/wav'){
  if(!formatName.includes('wav')||streams.length!==1)bad();
  const a=streams[0];
  if(a.codec_type!=='audio'||!['pcm_s16le','pcm_s24le'].includes(a.codec_name)||!finite(a.channels,1,2)||!finite(a.sample_rate,8000,96000)||!finite(format.duration,0.001,60))bad();
  if(structural&&!finite(structural.durationSeconds,0.001,60))bad();
  return {kind:'audio',audioCodec:a.codec_name,sampleRate:Number(a.sample_rate),channels:Number(a.channels),durationSeconds:Number(format.duration)};
 }
 bad();
}
export async function probeStudioReferenceMedia({bytes,mime,run=execFileAsync}={}){
 const structural=inspectStudioReferenceMedia({bytes,mime});
 let dir=null;
 try{
  dir=await mkdtemp(join(tmpdir(),'deepsyq-ref-'));
  const filename=join(dir,mime==='video/mp4'?'input.mp4':'input.wav');
  await writeFile(filename,bytes,{mode:0o600,flag:'wx'});
  // Local regular file only. No remote protocol, shell, stdout media or network URLs.
  const args=['-v','error','-protocol_whitelist','file','-probesize','2097152','-analyzeduration','5000000','-show_entries',
   'format=format_name,duration:stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,sample_rate,channels,duration',
   '-of','json',filename];
  const {stdout}=await run('ffprobe',args,{timeout:10000,maxBuffer:128*1024,windowsHide:true});
  let report;
  try{report=JSON.parse(stdout);}catch(_){bad();}
  return validateStudioReferenceProbe({mime,report,structural});
 }catch(e){
  if(e?.message==='REFERENCE_MEDIA_CODEC_UNSUPPORTED'||e?.message==='REFERENCE_MEDIA_INVALID')throw e;
  if(e?.code==='ENOENT'||e?.code==='EACCES'||e?.code==='ETIMEDOUT'||e?.killed)throw Error('REFERENCE_MEDIA_PROBE_UNAVAILABLE');
  // ffprobe exited after inspecting malformed media: reject as unsupported.
  if(Number.isInteger(e?.code)&&e.code!==0)throw Error('REFERENCE_MEDIA_CODEC_UNSUPPORTED');
  throw Error('REFERENCE_MEDIA_PROBE_UNAVAILABLE');
 }finally{if(dir)await rm(dir,{recursive:true,force:true}).catch(()=>{});}
}
