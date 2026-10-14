(()=>{
 'use strict';
 const $=id=>document.getElementById(id),tg=window.Telegram?.WebApp,core=window.VideoVariatorCore;
 const initData=tg?.initData||'';
 let file=null,duration=0,mode='gentle',landscape=false,remaining=0,busy=false,job=null,outputUrl=null,previewUrl=null,blob=null,filename='';
 const status=s=>{$('status').textContent=s;};
 const api=async(path,body)=>{
  const response=await fetch('/api/telegram-preview/'+path,{
   method:body?'POST':'GET',
   headers:{'X-Telegram-Init-Data':initData,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'NETWORK_ERROR');
  return data;
 };
 const render=data=>{
  remaining=Number(data.remaining||0);
  $('counter').textContent=remaining+' / 5 free';
  $('plansSection').hidden=remaining>0;
  $('start').disabled=!file||!initData||busy||remaining<1;
 };
 const message=e=>({
  TELEGRAM_SESSION_REQUIRED:'Please open this preview through @VideoUniqAppBot.',
  TELEGRAM_PREVIEW_NOT_READY:'Telegram preview is starting. Try again shortly.',
  TELEGRAM_PREVIEW_UNAVAILABLE:'Trial service temporarily unavailable.',
  VIDEO_LIMIT_45_SECONDS:'Choose a video between 1 and 45 seconds.',
  ALREADY_PROCESSING:'A video job is already running for this account.',
  FREE_TRIAL_COMPLETE:'Your five free previews are complete.'
 })[e?.message]||e?.message||'Processing failed. Please try another short video.';
 async function selectVideo(){
  const chosen=$('video').files?.[0];
  if(!chosen)return;
  file=null;duration=0;
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  $('preview').hidden=true;
  $('result').hidden=true;
  if(chosen.size>20*1024*1024){status('Maximum file size is 20 MB.');return;}
  try{
   if(!core)throw Error('Local video engine unavailable.');
   core.setFiles([chosen]);
   if(core.getFiles().length!==1)throw Error('Please choose an MP4, MOV or WebM video.');
   duration=await core.durationOf(chosen);
   if(duration<0.3||duration>45)throw Error('VIDEO_LIMIT_45_SECONDS');
   previewUrl=URL.createObjectURL(chosen);
   const v=$('preview');v.src=previewUrl;v.hidden=false;
   await new Promise((resolve,reject)=>{
    if(v.readyState>=1)return resolve();
    v.addEventListener('loadedmetadata',resolve,{once:true});
    v.addEventListener('error',()=>reject(Error('This video cannot be previewed on this phone.')),{once:true});
   });
   landscape=v.videoWidth>=v.videoHeight;
   file=chosen;$('filename').textContent=chosen.name;
   status('Video ready. Select a mode and start.');
  }catch(e){status(message(e));}
  $('start').disabled=!file||!initData||busy||remaining<1;
 }
 async function start(){
  if(busy||!file||!initData||remaining<1||!core)return;
  busy=true;$('start').disabled=true;$('result').hidden=true;
  $('progressWrap').hidden=false;$('progress').value=0;
  try{
   const reserved=await api('reserve',{mode,duration});
   job=reserved.job;render(reserved);
   status('Processing locally on your phone. Keep Telegram open.');
   core.setFiles([file]);
   const result=await core.process({mode,variants:1,resolution:landscape?'1280x720':'720x1280',fastExport:true});
   const item=result.results?.[0];
   if(!item?.blob?.size)throw Error('The video processor did not return an MP4.');
   blob=item.blob;filename=item.name||'video_uniquifier.mp4';
   if(outputUrl)URL.revokeObjectURL(outputUrl);
   outputUrl=URL.createObjectURL(blob);
   $('output').src=outputUrl;$('result').hidden=false;
   const finished=job;job=null;
   try{render(await api('finish',{job:finished}));}catch(e){console.warn('Could not report completed preview',e);}
   status('Done! Save your processed MP4 to your phone.');
   $('result').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){
   if(job){const failed=job;job=null;try{render(await api('fail',{job:failed}));}catch(_){}}
   status(message(e));
  }finally{
   busy=false;$('progressWrap').hidden=true;$('start').disabled=!file||!initData||remaining<1;
  }
 }
 async function download(){
  if(!blob)return;
  const target=new File([blob],filename,{type:'video/mp4'});
  try{if(navigator.canShare?.({files:[target]})&&navigator.share){await navigator.share({files:[target],title:'Video Uniquifier'});return;}}
  catch(e){if(e?.name==='AbortError')return;}
  const a=document.createElement('a');a.href=outputUrl;a.download=filename;a.hidden=true;document.body.append(a);a.click();a.remove();
  status('Download started. If it is not saved, use the video Share menu.');
 }
 const modes=$('modes');
 modes.addEventListener('click',event=>{
  const button=event.target.closest('button[data-mode]');
  if(!button||busy)return;
  mode=button.dataset.mode;
  modes.querySelectorAll('button[data-mode]').forEach(b=>b.classList.toggle('selected',b===button));
 });
 $('video').addEventListener('change',selectVideo);
 $('start').addEventListener('click',start);
 $('download').addEventListener('click',download);
 if(core)core.configure({onProgress:p=>{$('progress').value=Math.round(p*100)},onStage:step=>{if(step==='process')status('Processing video on this phone…')}});
 async function boot(){
  try{tg?.ready?.();tg?.expand?.();}catch(_){}
  if(!initData){status('Open this free preview from @VideoUniqAppBot inside Telegram.');return;}
  try{
   render(await api('session'));
   status(remaining?'Choose a video to try a free variation.':'Your five free previews are complete.');
  }catch(e){status(message(e));}
 }
 boot();
})();

