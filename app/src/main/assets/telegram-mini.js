(() => {
'use strict';
const $=id=>document.getElementById(id),tg=window.Telegram?.WebApp;
const core=window.VideoVariatorCore;
const initData=tg?.initData||'';
let file=null,mode='gentle',job=null,doneBlob=null,doneName='',previewUrl=null,outputUrl=null,remaining=5,busy=false,authenticated=false,landscape=false;
const status=(msg)=>{$('status').textContent=msg;};
const api=async(path,body)=>{
 const r=await fetch('/api/telegram-mini/'+path,{
  method:body?'POST':'GET',
  headers:{'X-Telegram-Init-Data':initData,'Content-Type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await r.json().catch(()=>({error:'NETWORK_ERROR'}));
 if(!r.ok)throw Object.assign(Error(data.error||'NETWORK_ERROR'),{status:r.status});
 return data;
};
function showPlans(plans){
 const section=$('plansSection'),root=$('plans');
 section.hidden=false;
 root.replaceChildren();
 for(const p of plans||[]){
  const row=document.createElement('div');row.className='plan';
  const label=document.createElement('div'),name=document.createElement('b'),sub=document.createElement('small');
  name.textContent=p.name;sub.textContent=p.price+(p.credits==null?' · Unlimited':' · '+p.credits+' credits');
  sub.style.display='block';label.append(name,sub);
  const button=document.createElement('button');button.type='button';button.textContent='Buy subscription';
  button.textContent='Stars checkout · soon';button.disabled=true;button.title='Telegram Stars pricing needs to be configured';
  row.append(label,button);root.append(row);
 }
 if(!busy)section.scrollIntoView({behavior:'smooth',block:'start'});
}
function applySession(data){
 if(!data)return;
 remaining=Number(data.remaining??0);
 $('counter').textContent=remaining+' / 5 free';
 $('start').disabled=!authenticated||!file||busy||remaining<1;
 if(remaining<=0)showPlans(data.plans||[]);
}
function localeError(error){
 const dict={
  TELEGRAM_MINI_NOT_READY:'Telegram Studio is starting. Try again shortly.',
  INVALID_TELEGRAM_SESSION:'Please open this tool from @VideoUniqAppBot in Telegram.',
  TRIAL_EXHAUSTED:'Your 5 free videos are used. See subscriptions below.',
  VIDEO_ALREADY_PROCESSING:'You already have a processing session. Please wait.',
  VIDEO_LIMIT_45_SECONDS:'Maximum duration is 45 seconds.',
  TELEGRAM_MINI_UNAVAILABLE:'The service is temporarily unavailable.',
 };
 return dict[error?.message]||error?.message||'Something went wrong. Please retry.';
}
async function onFile(){
 const incoming=$('video').files?.[0];
 if(!incoming)return;
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
 $('preview').hidden=true;file=null;
 if(incoming.size>20*1024*1024){status('Choose a video up to 20 MB.');return;}
 try{
  core.setFiles([incoming]);
  if(core.getFiles().length!==1)throw Error('Please select a video file.');
  const length=await core.durationOf(incoming);
  if(length>45||length<.3)throw Error('Choose a video between 1 and 45 seconds.');
  file=incoming; // Local metadata only; video is not uploaded.
  $('filename').textContent=incoming.name;
  previewUrl=URL.createObjectURL(incoming);const preview=$('preview');preview.src=previewUrl;preview.hidden=false;
  await new Promise((resolve,reject)=>{if(preview.readyState>=1)return resolve();preview.addEventListener('loadedmetadata',resolve,{once:true});preview.addEventListener('error',()=>reject(Error('Unable to preview this video.')),{once:true});});
  landscape=preview.videoWidth>=preview.videoHeight;
  status('Ready. Choose a mode and press Start processing.');
 }catch(e){status(localeError(e));}
 $('start').disabled=!authenticated||!file||busy||remaining<1;
}
async function start(){
 if(!authenticated||!file||busy||!core)return;
 busy=true;doneBlob=null;$('result').hidden=true;
 $('start').disabled=true;
 $('progress').value=0;$('progressWrap').hidden=false;
 try{
  const reserved=await api('reserve',{mode,duration:await core.durationOf(file)});
  job=reserved.job;applySession(reserved);
  status('Preparing video engine on your phone…');
  const resolution=landscape?'1280x720':'720x1280';
  const output=await core.process({mode,variants:1,resolution,fastExport:true});
  const result=output.results?.[0];
  if(!result?.blob?.size)throw Error('No output was produced.');
  doneBlob=result.blob;doneName=result.name||'video_variation.mp4';
  if(outputUrl)URL.revokeObjectURL(outputUrl);
  outputUrl=URL.createObjectURL(doneBlob);
  $('output').src=outputUrl;
  $('result').hidden=false;
  const reportJob=job;job=null;
  try{applySession(await api('finish',{job:reportJob}));}catch(e){console.warn('Could not report completion',e);}
  status('Your video is ready! Tap Save to download it.');
  $('result').scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){
  if(job){const id=job;job=null;try{applySession(await api('fail',{job:id}));}catch(_){}}
  status(localeError(e));
  if(e.status===402){try{showPlans((await api('session')).plans);}catch(_){}}
 }finally{
  busy=false;$('progressWrap').hidden=true;
  $('start').disabled=!authenticated||!file||remaining<1;
 }
}
async function download(){
 if(!doneBlob)return;
 const f=new File([doneBlob],doneName,{type:'video/mp4'});
 try{
  if(navigator.canShare?.({files:[f]})&&navigator.share){
   await navigator.share({files:[f],title:'Video Uniquifier'});return;
  }
 }catch(e){if(e.name==='AbortError')return;}
 const a=document.createElement('a');a.download=doneName;a.href=outputUrl;a.style.display='none';document.body.append(a);a.click();a.remove();
 status('Download requested. If it does not appear, use the share menu on the video.');
}
async function init(){
 try{tg?.ready?.();tg?.expand?.();}catch(_){}
 if(!tg||!initData){status('Open from the Video Uniquifier bot in Telegram to start.');return;}
 try{
  const data=await api('session');
  authenticated=true;applySession(data);
  if(data.remaining>0)status('Ready. Choose a video from your phone.');
  else status('Your free trial has ended. Plans are shown below.');
 }catch(e){status(localeError(e));}
}
$('video').addEventListener('change',onFile);
$('modes').addEventListener('click',e=>{
 const b=e.target.closest('button[data-mode]');if(!b||busy)return;
 mode=b.dataset.mode;for(const x of document.querySelectorAll('[data-mode]'))x.classList.toggle('selected',x===b);
});
$('start').addEventListener('click',start);
$('download').addEventListener('click',download);
if(core)core.configure({onProgress:v=>{$('progress').value=Math.round(v*100)},onStage:(s)=>{if(s==='process')status('Processing your video…')}});else status('Local video engine is unavailable. Please reopen Telegram.');
init();
})();
