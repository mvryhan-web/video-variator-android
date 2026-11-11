// Video Uniquifier only: render actual FFmpeg jobs, never decorative fake progress.
// Consumes read-only events emitted by app-v4.js; owns no billing or media processor.
export function bindVideoUniquifierQueue({queue,lines,clear}){
 if(!queue||!lines||queue.dataset.liveQueue==='1')return;
 queue.dataset.liveQueue='1';
 const core=()=>window.VideoVariatorCore;
 const $=id=>document.getElementById(id);
 const isRu=()=>document.getElementById('homeLanguage')?.value==='ru'||(navigator.languages?.[0]||navigator.language||'').toLowerCase().startsWith('ru');
 const t=(ru,en)=>isRu()?ru:en;
 const clamp=n=>Math.min(1,Math.max(0,Number(n)||0));
 const heading=queue.querySelector('.vu-output-head p');
 const jobs=[],objectURLs=new Set();
 let running=false;
 const style=document.createElement('style');style.id='vu-real-queue-style';
 style.textContent=`
 body.vu-reference .vu-output-row.vu-real-row{grid-template-columns:38px minmax(60px,1fr) 14px minmax(48px,1fr) 38px auto;min-height:42px}
 body.vu-reference .vu-real-row .vu-progress-line{display:block;overflow:hidden;min-width:38px}
 body.vu-reference .vu-progress-fill{display:block;height:100%;width:0;background:linear-gradient(90deg,#2ec3ff,#66a6ff);border-radius:5px;transition:width .22s linear}
 body.vu-reference .vu-real-row[data-state="ready"] .vu-progress-fill{background:#49c791}
 body.vu-reference .vu-real-row .vu-output-dash{font-size:10px;white-space:nowrap}
 body.vu-reference .vu-real-row .vu-output-thumb video{display:block;width:100%;height:100%;object-fit:cover}
 body.vu-reference .vu-queue-empty{padding:12px;color:#aac0da;font-size:12px}
 @media(max-width:590px){body.vu-reference .vu-output-row.vu-real-row{grid-template-columns:38px minmax(80px,1fr) 42px;grid-template-rows:auto auto;column-gap:8px;row-gap:6px}
 body.vu-reference .vu-real-row .vu-output-thumb{grid-column:1;grid-row:1/3}
 body.vu-reference .vu-real-row b{grid-column:2;grid-row:1}
 body.vu-reference .vu-real-row .vu-output-dash:nth-child(3){grid-column:3;grid-row:1;text-align:right}
 body.vu-reference .vu-real-row .vu-progress-line{grid-column:2;grid-row:2}
 body.vu-reference .vu-real-row .vu-output-dash:nth-child(5){grid-column:3;grid-row:2;text-align:right}
 body.vu-reference .vu-real-row button{grid-column:2/4;grid-row:3;justify-self:stretch;min-height:32px}
 }`;
 if(!document.getElementById(style.id))document.head.append(style);
 const release=()=>{for(const url of objectURLs)URL.revokeObjectURL(url);objectURLs.clear();};
 function status(){
  if(!heading)return;
  if(!jobs.length){heading.textContent=t('Выберите видео и количество вариантов.','Choose a video and the number of variants.');return;}
  const ready=jobs.filter(job=>job.ready).length;
  heading.textContent=t(`Готово ${ready} из ${jobs.length} · осталось ${jobs.length-ready}`,`Done ${ready} of ${jobs.length} · ${jobs.length-ready} remaining`);
 }
 function update(job,progress,state){
  if(!job||job.ready)return;
  const p=clamp(progress);
  job.progress=p;
  job.track.setAttribute('aria-valuenow',String(Math.round(p*100)));
  job.percent.textContent=Math.round(p*100)+'%';
  job.fill.style.width=Math.round(p*100)+'%';
  job.indicator.textContent=state==='error'?'!':state==='saving'?'↓':p>0?'▶':'–';
  job.row.dataset.state=state||'waiting';
 }
 function makeJob(filename,variant,index){
  const row=document.createElement('div');row.className='vu-output-row vu-real-row';row.dataset.state='waiting';
  row.dataset.queueIndex=String(index);row.title=filename;
  const thumb=document.createElement('span');thumb.className='vu-output-thumb';
  const label=document.createElement('b');label.textContent=t('Вариант ','Variant ')+variant;
  const indicator=document.createElement('span');indicator.className='vu-output-dash';indicator.textContent='–';
  const track=document.createElement('span');track.className='vu-progress-line';track.setAttribute('role','progressbar');
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow','0');
  const fill=document.createElement('span');fill.className='vu-progress-fill';track.append(fill);
  const percent=document.createElement('span');percent.className='vu-output-dash';percent.textContent='0%';
  const download=document.createElement('button');download.type='button';download.disabled=true;download.textContent=t('↓ Скачать','↓ Download');
  row.append(thumb,label,indicator,track,percent,download);lines.append(row);
  return{row,thumb,label,indicator,track,fill,percent,download,filename,variant,ready:false,progress:0};
 }
 function prepare(names=null,variants=null){
  if(running)return;
  release();jobs.length=0;lines.replaceChildren();
  const files=Array.isArray(names)?names:(core()?.getFiles?.()||[]).map(f=>f.name);
  const count=Math.max(1,Math.min(15,Number(variants??$('variantCount')?.value)||1));
  files.forEach(file=>{for(let variant=1;variant<=count;variant++)jobs.push(makeJob(file,variant,jobs.length));});
  if(!jobs.length){const p=document.createElement('p');p.className='vu-queue-empty';p.textContent=t('Здесь появятся результаты обработки.','Your processed variants will appear here.');lines.append(p);}
  status();
 }
 window.addEventListener('vu:queue-start',event=>{
  running=false;prepare(event.detail?.files||[],event.detail?.variants);running=true;
  jobs.forEach(job=>update(job,0,'waiting'));
  clear.disabled=true;queue.classList.add('has-outputs');
 });
 window.addEventListener('vu:queue-progress',event=>{
  if(!running)return;
  const progress=clamp(event.detail?.progress),total=jobs.length;
  jobs.forEach((job,i)=>{if(!job.ready){const p=clamp(progress*total-i);update(job,p,p>0?'processing':'waiting');job.track.setAttribute('aria-valuenow',String(Math.round(p*100)));}});
 });
 window.addEventListener('vu:queue-stage',event=>{
  if(!running)return;
  const detail=event.detail||{};
  if(['process','save'].includes(detail.stage)){
   const job=jobs[Number(detail.job)-1];
   if(job&&!job.ready){job.indicator.textContent=detail.stage==='save'?'↓':'▶';job.row.dataset.state=detail.stage==='save'?'saving':'processing';job.row.title=job.filename+' · '+(detail.stage==='save'?'Saving':'Processing');}
  }else if(detail.stage==='load'&&jobs[0])jobs[0].row.title=t('Загрузка видеодвижка','Loading video engine');
 });
 window.addEventListener('vu:queue-result',event=>{
  const result=event.detail?.result;if(!(result?.blob instanceof Blob))return;
  const job=jobs.find(x=>!x.ready&&x.filename===result.sourceName&&x.variant===result.variant)||jobs.find(x=>!x.ready);
  if(!job)return;
  job.ready=true;job.fill.style.width='100%';job.percent.textContent='100%';job.indicator.textContent='✓';
  job.track.setAttribute('aria-valuenow','100');job.row.dataset.state='ready';
  const url=URL.createObjectURL(result.blob);objectURLs.add(url);
  const video=document.createElement('video');video.src=url;video.preload='metadata';video.muted=true;video.playsInline=true;video.setAttribute('aria-label',result.name||'Video variant');
  job.thumb.replaceChildren(video);
  job.download.disabled=false;job.download.title=result.name||'Download video';
  job.download.onclick=()=>{const a=document.createElement('a');a.href=url;a.download=result.name||'variant.mp4';document.body.append(a);a.click();a.remove();};
  status();
 });
 window.addEventListener('vu:queue-complete',()=>{running=false;clear.disabled=false;status();});
 window.addEventListener('vu:queue-failed',event=>{
  running=false;clear.disabled=false;
  const message=String(event.detail?.message||'Processing failed').slice(0,180);
  const job=jobs.find(x=>!x.ready&&x.row.dataset.state==='processing')||jobs.find(x=>!x.ready);
  if(job){update(job,job.progress,'error');job.row.title=message;job.indicator.textContent='!';}
  status();
 });
 $('fileInput')?.addEventListener('change',()=>{if(!running)prepare();});
 $('variantCount')?.addEventListener('change',()=>{if(!running)prepare();});
 clear.addEventListener('click',()=>{if(running)return;prepare();});
 prepare();
}
