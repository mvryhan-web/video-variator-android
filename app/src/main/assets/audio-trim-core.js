// Deepsyq Everyday Tools: private, local audio trimming.
// No backend, AI-provider calls, wallet charges, or server-side uploads.
const ALLOWED=/\.(?:mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i;
const MAX_BYTES=50*1024*1024;
const MAX_SECONDS=600;
const reject=code=>{throw Error(code);};
export function audioTrimSettings(file,start,end){
 if(!file||typeof file.name!=='string'||!ALLOWED.test(file.name)||
   typeof file.size!=='number'||file.size<=0||file.size>MAX_BYTES)
  reject('AUDIO_TRIM_FILE_UNSUPPORTED');
 const begin=Number(start),finish=Number(end);
 if(start===''||end===''||!Number.isFinite(begin)||!Number.isFinite(finish)||
   begin<0||finish<=begin||finish>MAX_SECONDS||finish-begin<0.1)
  reject('AUDIO_TRIM_RANGE_INVALID');
 const extension=file.name.split('.').pop().toLowerCase();
 const raw=file.name.slice(0,-extension.length-1);
 const safeBase=raw.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,45).replace(/^-+|-+$/g,'')||'audio';
 return {begin,seconds:finish-begin,input:'source.'+extension,output:'Deepsyq-'+safeBase+'-trimmed.mp3'};
}
export async function trimAudioLocal(file,{start,end,createEngine,onEngine=()=>{},signal}={}){
 const params=audioTrimSettings(file,start,end);
 if(typeof createEngine!=='function')reject('AUDIO_TRIM_UNAVAILABLE');
 if(signal?.aborted)reject('AUDIO_TRIM_CANCELLED');
 let engine;
 try{
  engine=await createEngine();
  if(signal?.aborted)reject('AUDIO_TRIM_CANCELLED');
  onEngine(engine);
  await engine.writeFile(params.input,new Uint8Array(await file.arrayBuffer()));
  if(signal?.aborted)reject('AUDIO_TRIM_CANCELLED');
  // Re-encode to portable MP3 rather than copy codec/container timestamps.
  const code=await engine.exec(['-ss',params.begin.toFixed(3),'-i',params.input,
   '-t',params.seconds.toFixed(3),'-vn','-c:a','libmp3lame','-b:a','128k','-y','output.mp3']);
  if(signal?.aborted)reject('AUDIO_TRIM_CANCELLED');
  if(code)reject('AUDIO_TRIM_FAILED');
  const bytes=await engine.readFile('output.mp3');
  if(!bytes?.length)reject('AUDIO_TRIM_FAILED');
  if(signal?.aborted)reject('AUDIO_TRIM_CANCELLED');
  return new File([bytes],params.output,{type:'audio/mpeg'});
 }finally{try{engine?.terminate();}catch(_){/* cancelled worker */}}
}
