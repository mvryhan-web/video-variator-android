// Deepsyq Everyday Tools — client-only Video → MP3 conversion.
// No server upload, AI provider, model keys, storage ledger or wallet calls.
const MAX_SOURCE_BYTES=80*1024*1024;
const SUPPORTED_VIDEO=/\.(mp4|m4v|mov|webm|mkv)$/i;
const error=code=>{throw Error(code);};

export function videoToAudioSettings(file){
 if(!file||typeof file.name!=='string'||!SUPPORTED_VIDEO.test(file.name)||
  !Number.isFinite(file.size)||file.size<1||file.size>MAX_SOURCE_BYTES)
  error('VIDEO_AUDIO_FILE_UNSUPPORTED');
 if(file.type&&!file.type.startsWith('video/')&&file.type!=='application/octet-stream')
  error('VIDEO_AUDIO_FILE_UNSUPPORTED');
 const ext=file.name.split('.').pop().toLowerCase();
 const base=file.name.slice(0,-ext.length-1).replace(/[^a-zA-Z0-9_-]/g,'-')
  .replace(/^-+|-+$/g,'').slice(0,45)||'video';
 return Object.freeze({source:'source.'+ext,output:'Deepsyq-'+base+'-audio.mp3'});
}

export async function videoToMp3Local(file,{createEngine,onEngine=()=>{},signal}={}){
 const settings=videoToAudioSettings(file);
 if(typeof createEngine!=='function')error('VIDEO_AUDIO_UNAVAILABLE');
 if(signal?.aborted)error('VIDEO_AUDIO_CANCELLED');
 let engine;
 try{
  engine=await createEngine();
  if(signal?.aborted)error('VIDEO_AUDIO_CANCELLED');
  onEngine(engine);
  await engine.writeFile(settings.source,new Uint8Array(await file.arrayBuffer()));
  if(signal?.aborted)error('VIDEO_AUDIO_CANCELLED');
  // Map only the first actual audio stream: silently generating an empty MP3
  // when a video has no sound is a failure, never a successful conversion.
  const exitCode=await engine.exec(['-i',settings.source,'-map','0:a:0','-vn',
   '-c:a','libmp3lame','-b:a','192k','-y','extracted.mp3']);
  if(signal?.aborted)error('VIDEO_AUDIO_CANCELLED');
  if(exitCode)error('VIDEO_AUDIO_NO_AUDIO_OR_UNSUPPORTED');
  const bytes=await engine.readFile('extracted.mp3');
  if(!bytes?.length||bytes.length>MAX_SOURCE_BYTES)error('VIDEO_AUDIO_FAILED');
  if(signal?.aborted)error('VIDEO_AUDIO_CANCELLED');
  return new File([bytes],settings.output,{type:'audio/mpeg'});
 }finally{try{engine?.terminate();}catch(_){/* already terminated by cancel */}}
}
