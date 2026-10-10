// Telegram video processor running on user's Windows PC. Video never travels through Render.
// Requires Node 20+, ffmpeg & ffprobe in PATH, and telegram-video-worker.env (local, gitignored).
import {readFile,writeFile,mkdtemp,stat,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {Readable,Transform} from 'node:stream';
import {spawn} from 'node:child_process';
import {VIDEO_MAX_BYTES,VIDEO_MAX_DURATION,WORKER_NEXT,WORKER_REPORT,workerSignature,videoArguments} from '../server/telegram-video-core.js';
const here=dirname(fileURLToPath(import.meta.url));
const envFile=resolve(here,'telegram-video-worker.env');
try{
 const env=await readFile(envFile,'utf8');
 for(const line of env.split(/\r?\n/)){
  const match=line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*?)\s*$/);
  if(match&&!line.trim().startsWith('#')&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
 }
}catch(e){if(e.code!=='ENOENT')throw e}
const token=process.env.TELEGRAM_BOT_TOKEN||'';
const base=(process.env.TELEGRAM_APP_URL||'https://video-variator-android.onrender.com').replace(/\/$/,'');
if(!token||token.includes('PASTE')||!base.startsWith('https://')){
 console.error('Configure TELEGRAM_BOT_TOKEN in scripts/telegram-video-worker.env. Use HTTPS TELEGRAM_APP_URL.');process.exit(1);
}
const botApi='https://api.telegram.org/bot'+token+'/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(method,body){
 const r=await fetch(botApi+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25_000)});
 const d=await r.json();if(!r.ok||!d.ok)throw Error(`Telegram ${method} HTTP ${r.status}`);return d.result;
}
async function request(path,body={}){
 const time=String(Date.now()),sig=workerSignature(token,'POST',path,time,body);
 const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-tg-worker-time':time,'x-tg-worker-signature':sig},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000)});
 if(r.status===204)return null;
 if(!r.ok)throw Error(`Render worker HTTP ${r.status}: ${(await r.text()).slice(0,100)}`);
 return r.json();
}
async function execBinary(program,args,timeoutMs=240_000){
 return new Promise((resolve,reject)=>{
  const proc=spawn(program,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let output='',settled=false;
  const timer=setTimeout(()=>proc.kill('SIGKILL'),timeoutMs);
  proc.stderr.on('data',d=>{output=(output+d.toString()).slice(-2200)});
  proc.on('error',e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e)});
  proc.on('close',code=>{if(settled)return;settled=true;clearTimeout(timer);code===0?resolve(output):reject(Error(`${program} exit ${code}: ${output.slice(-500)}`))});
 });
}
async function downloadVideo(fileId,target){
 const file=await api('getFile',{file_id:fileId});
 if(!file.file_path||Number(file.file_size)>VIDEO_MAX_BYTES)throw Error('SOURCE_TOO_LARGE');
 const url=`https://api.telegram.org/file/bot${token}/${file.file_path}`;
 const r=await fetch(url,{signal:AbortSignal.timeout(60_000)});
 if(!r.ok||!r.body)throw Error('TELEGRAM_DOWNLOAD_FAILED');
 let total=0;
 const limiter=new Transform({transform(chunk,enc,cb){total+=chunk.length;cb(total>VIDEO_MAX_BYTES?Error('SOURCE_TOO_LARGE'):null,chunk)}});
 await pipeline(Readable.fromWeb(r.body),limiter,createWriteStream(target));
}
async function inspectVideo(input){
 let output='';
 const probe=spawn('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',input],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 output=await new Promise((resolve,reject)=>{let s='';probe.stdout.on('data',d=>s+=d);probe.on('error',reject);probe.on('close',code=>code?reject(Error('FFPROBE_FAILED')):resolve(s))});
 const duration=Number(output.trim());if(!Number.isFinite(duration)||duration<=0||duration>VIDEO_MAX_DURATION)throw Error('MAX_DURATION_60_SECONDS');
}
async function uploadVideo(chatId,output){
 const meta=await stat(output);
 if(meta.size>50*1024*1024)throw Error('OUTPUT_EXCEEDS_TELEGRAM_LIMIT');
 const form=new FormData();form.set('chat_id',String(chatId));
 form.set('supports_streaming','true');
 form.set('caption','✅ Processed by Video Uniquifier');
 form.set('video',new Blob([await readFile(output)],{type:'video/mp4'}),'video_processed.mp4');
 const response=await fetch(botApi+'sendVideo',{method:'POST',body:form,signal:AbortSignal.timeout(180_000)});
 const result=await response.json();if(!response.ok||!result.ok)throw Error(`TELEGRAM_UPLOAD_${response.status}`);
}
async function run(job){
 const folder=await mkdtemp(join(tmpdir(),'vv-telegram-'));
 const input=join(folder,'source-video'),output=join(folder,'video-processed.mp4');
 try{
  await downloadVideo(job.fileId,input);
  await inspectVideo(input);
  await execBinary('ffmpeg',videoArguments(job.mode,input,output),240_000);
  await uploadVideo(job.chatId,output);
  console.log(`[worker] Delivered ${job.id} (${job.mode})`);
  try{await request(WORKER_REPORT,{id:job.id,ok:true})}catch(e){console.error(`[worker] Delivered but reporting failed for ${job.id}: ${e.message}`)}
 }catch(e){
  console.error(`[worker] Job ${job.id} failed: ${e.message}`);
  try{await request(WORKER_REPORT,{id:job.id,ok:false,error:e.message})}catch(reportError){console.error('[worker] Error reporting failure:',reportError.message)}
 }finally{await rm(folder,{recursive:true,force:true})}
}
console.log('[worker] Video Uniquifier Telegram worker started. Keep this window and computer running.');
let failures=0;
for(;;){
 try{
  const result=await request(WORKER_NEXT);
  failures=0;
  if(result?.job)await run(result.job);else await sleep(4000);
 }catch(e){failures++;console.error('[worker] Connection:',e.message);await sleep(Math.min(30_000,4000*failures))}
}
