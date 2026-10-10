import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

export const VIDEO_MAX_BYTES=20*1024*1024;
export const VIDEO_MAX_DURATION=60;
export const VIDEO_MODES=Object.freeze(['gentle','balanced','dynamic']);
export const WORKER_NEXT='/api/telegram/worker/next';
export const WORKER_REPORT='/api/telegram/worker/report';

export function videoFilters(mode){
  if(!VIDEO_MODES.includes(mode))throw Error('INVALID_MODE');
  // Scale down, but never upscale; keep orientation, even dimensions and original sound.
  const sizing='scale=if(gte(iw\\,ih)\\,min(iw\\,1280)\\,-2):if(gte(iw\\,ih)\\,-2\\,min(ih\\,1280)):flags=bicubic';
  const transforms={
    gentle:'crop=trunc(iw*0.995/2)*2:trunc(ih*0.995/2)*2,eq=brightness=0.004:saturation=1.02:contrast=1.008',
    balanced:'crop=trunc(iw*0.987/2)*2:trunc(ih*0.987/2)*2,eq=brightness=0.009:saturation=1.07:contrast=1.025',
    dynamic:'crop=trunc(iw*0.97/2)*2:trunc(ih*0.97/2)*2,eq=brightness=0.015:saturation=1.13:contrast=1.06'
  };
  return `${transforms[mode]},${sizing},setsar=1`;
}
export function videoArguments(mode,input,output){
  return ['-hide_banner','-nostdin','-y','-i',input,'-map','0:v:0','-map','0:a?','-vf',videoFilters(mode),'-c:v','libx264','-preset','veryfast','-crf','27','-pix_fmt','yuv420p','-threads','2','-c:a','aac','-b:a','96k','-movflags','+faststart','-t',String(VIDEO_MAX_DURATION),output];
}
export function workerSignature(token,method,path,ts,body={}){
  const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return createHmac('sha256',token).update(`${method}\n${path}\n${ts}\n${hash}`).digest('hex');
}
export function verifyWorkerSignature(token,method,path,ts,body,signature,now=Date.now()){
  if(typeof ts!=='string'||!/^[0-9]{13}$/.test(ts)||Math.abs(now-Number(ts))>90_000||typeof signature!=='string'||!/^[0-9a-f]{64}$/i.test(signature))return false;
  const actual=Buffer.from(signature,'hex');
  const expected=Buffer.from(workerSignature(token,method,path,ts,body),'hex');
  return timingSafeEqual(actual,expected);
}
export function acceptedTelegramVideo(message){
  const video=message?.video||(message?.document?.mime_type?.startsWith('video/')?message.document:null);
  if(!video?.file_id)return {error:'NOT_VIDEO'};
  if(!Number.isFinite(video.file_size)||video.file_size<=0||video.file_size>VIDEO_MAX_BYTES)return {error:'SIZE'};
  if(Number.isFinite(video.duration)&&video.duration>VIDEO_MAX_DURATION)return {error:'DURATION'};
  return {fileId:video.file_id,fileSize:video.file_size,duration:Number(video.duration)||null};
}
