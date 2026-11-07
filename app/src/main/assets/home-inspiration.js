import {CREATIVE_EXAMPLES} from './home-creative-examples.js';
import {templateSupport} from './ai-template-product-name.js';
function studioKind(item){return item.kind==='video'?'video':'image';}
function studioHandoffSupport(item){
 if(item.actionTarget!=='studio')return null;
 const support=templateSupport({
  generationType:item.kind,promptTemplate:item.prompt,requiredInputTypes:item.requiredInputTypes
 });
 if(support.supported&&support.requiresProductName)
  return {supported:false,reason:'This workflow needs a product name field not available in Inspiration. Open Studio and write your prompt manually.'};
 return support;
}
function openTarget(item,mode,feedback){
 const support=studioHandoffSupport(item);
 if(support&&!support.supported){
  if(feedback){feedback.textContent=support.reason;feedback.hidden=false;}
  return;
 }
 const settings=mode==='prompt'?{}:{...(item.defaultSettings||{}),ratio:item.aspectRatio};
 const payload={id:item.id,title:item.title,generationType:item.kind,promptTemplate:item.prompt||'',defaultModel:mode==='clone'?item.defaultModel||null:null,requiredInputTypes:Array.isArray(item.requiredInputTypes)?item.requiredInputTypes:[],defaultSettings:settings,source:'inspiration',action:mode};
 let key,destination;
 if(item.actionTarget==='studio'){key='deepsyq_template_start';destination='generate-studio.html?studio='+studioKind(item)+'&from=inspiration&action='+mode;}
 else if(item.actionTarget==='agent'&&item.actionPath){key='deepsyq_agent_inspiration_start';destination=item.actionPath+'?from=inspiration&action='+encodeURIComponent(mode);}
 else{if(feedback){feedback.textContent='This inspiration action is not available yet.';feedback.hidden=false;}return;}
 try{sessionStorage.setItem(key,JSON.stringify(payload));}
 catch(_){if(feedback){feedback.textContent='Your browser could not prepare this inspiration. Check storage permissions and try again.';feedback.hidden=false;}return;}
 if(feedback){feedback.textContent='';feedback.hidden=true;}
 location.assign(destination);
}
let inspirationDetail=null;
function detailEl(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function openInspirationDetail(item,opener,{minimal=false}={}){
 for(const v of previewVideos)v.pause();
 if(inspirationDetail?.open)inspirationDetail.close();
 let currentItem=item; // Current carousel slide; source gallery data remains unchanged.
 const dialog=detailEl('dialog','inspiration-detail-dialog');
 dialog.setAttribute('aria-label',item.title+' inspiration details');
 const layout=detailEl('div','inspiration-detail-layout');
 const stage=detailEl('section','inspiration-detail-stage');
 const toolbar=detailEl('div','inspiration-detail-toolbar');
 const close=detailEl('button','inspiration-detail-close','×');
 close.type='button';close.setAttribute('aria-label','Close inspiration preview');
 close.onclick=()=>dialog.close();
 const caption=detailEl('span','inspiration-detail-caption',item.kind==='video'?'Video inspiration':'Image inspiration');
 toolbar.append(close);if(!minimal)toolbar.append(caption);
 const imageArea=detailEl('div','inspiration-detail-image-area');
 let media;
 if(item.kind==='video'){
  media=detailEl('video','inspiration-detail-media');
  media.src=item.previewUrl;media.controls=true;media.loop=true;media.playsInline=true;
  media.muted=true;media.autoplay=true;media.preload='metadata';
  media.setAttribute('aria-label',item.title+' full video preview');
  if(item.previewPosterUrl)media.poster=item.previewPosterUrl;
 }else{
  media=detailEl('img','inspiration-detail-media');
  media.src=item.previewUrl;media.alt=item.title;media.decoding='async';media.referrerPolicy='no-referrer';
 }
 imageArea.append(media);stage.append(toolbar,imageArea);
 const sidebar=detailEl('div','inspiration-detail-sidebar');
 const heading=detailEl('h2','inspiration-detail-title',item.title);
 const kindLine=detailEl('p','inspiration-detail-kind',(item.category||'Inspiration')+' · '+(item.kind==='video'?'Video':'Image'));
 const description=detailEl('p','inspiration-detail-description',item.description||'Owner-approved Deepsyq inspiration.');
 const headingPrompt=detailEl('h3','inspiration-detail-heading','Prompt');
 const prompt=detailEl('p','inspiration-detail-prompt',item.prompt||'No prompt available.');
 let promptMore=null,copyPrompt=null,promptResizeObserver=null;
 if(minimal){
  dialog.classList.add('inspiration-detail-minimal');
  prompt.id='inspiration-detail-current-prompt';
  prompt.setAttribute('aria-label','Prompt');
  promptMore=detailEl('button','inspiration-detail-more','Show more');
  promptMore.type='button';promptMore.hidden=true;
  promptMore.setAttribute('aria-controls',prompt.id);
  promptMore.setAttribute('aria-expanded','false');
  promptMore.onclick=()=>{
   const expanded=prompt.classList.toggle('is-expanded');
   promptMore.textContent=expanded?'Show less':'Show more';
   promptMore.setAttribute('aria-expanded',String(expanded));
   if(!expanded)requestAnimationFrame(refreshPromptMore);
  };
  headingPrompt.textContent='Prompt:';
  const promptControls=detailEl('div','inspiration-detail-prompt-controls');
  copyPrompt=detailEl('button','inspiration-detail-copy','Copy prompt');
  copyPrompt.type='button';copyPrompt.setAttribute('aria-label','Copy prompt');
  promptControls.append(promptMore,copyPrompt);
  sidebar.append(headingPrompt,prompt,promptControls);
 }else sidebar.append(heading,kindLine,description,headingPrompt,prompt);
 function refreshPromptMore(){
  if(!minimal||!promptMore||prompt.classList.contains('is-expanded'))return;
  promptMore.hidden=prompt.scrollHeight<=prompt.clientHeight+1;
 }
 if(item.kind==='video'&&!minimal){
  const meta=detailEl('div','inspiration-detail-parameters');
  meta.append(detailEl('h3','inspiration-detail-heading','Parameters'));
  const entries=[['Model',item.defaultModel||item.displayModel||'Choose in Studio'],['Aspect ratio',item.aspectRatio]];
  for(const key of ['resolution','duration','seed']){
   const v=item.defaultSettings?.[key];
   if(typeof v==='string'||typeof v==='number')entries.push([key[0].toUpperCase()+key.slice(1),String(v).slice(0,80)]);
  }
  for(const [label,value] of entries){
   if(!value)continue;
   const row=detailEl('div','inspiration-detail-param');
   row.append(detailEl('span','',label),detailEl('strong','',value));meta.append(row);
  }
  sidebar.append(meta);
 }
 const note=detailEl('p','inspiration-detail-note','An example, not a ready-to-run AI model. Opening Studio prepares your prompt; no generation or payment starts automatically.');
 const feedback=detailEl('p','inspiration-detail-feedback');feedback.hidden=true;feedback.setAttribute('role','alert');
 const actions=detailEl('div','inspiration-detail-actions');
 const clone=detailEl('button','inspiration-detail-clone',minimal?'Clone & Try':'✦ Clone & try');clone.setAttribute('aria-label','Clone & Try');
 const use=detailEl('button','inspiration-detail-secondary','Use this prompt');
 const create=detailEl('button','inspiration-detail-secondary','Create yours');
 const copy=detailEl('button','inspiration-detail-secondary','Copy prompt');
 for(const b of [clone,use,create,copy])b.type='button';
 const support=studioHandoffSupport(item);
 if(support&&!support.supported){
  clone.disabled=true;use.disabled=true;create.disabled=true;
  note.textContent=support.reason;
 }
 clone.onclick=()=>openTarget(currentItem,'clone',feedback);
 use.onclick=()=>openTarget(currentItem,'prompt',feedback);
 create.onclick=()=>openTarget(currentItem,'create',feedback);
 // Copy must work independently of whether a Studio provider is enabled.
 const copyCurrentPrompt=async()=>{
  const value=String(currentItem.prompt||'');
  if(!value){feedback.textContent='No prompt available to copy.';feedback.hidden=false;return;}
  let copied=false;
  try{
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);copied=true;}
  }catch(_){/* Secure-clipboard permission may be unavailable. */}
  if(!copied){
   const area=detailEl('textarea','inspiration-copy-fallback');
   area.value=value;area.readOnly=true;area.style.position='fixed';area.style.opacity='0';area.style.top='0';
   document.body.append(area);area.select();
   try{copied=document.execCommand('copy');}catch(_){copied=false;}
   area.remove();
  }
  feedback.textContent=copied?'Prompt copied to clipboard.':'Clipboard is unavailable. Select the prompt text above to copy it.';
  feedback.hidden=false;
 };
 copy.onclick=copyCurrentPrompt;
 if(copyPrompt)copyPrompt.onclick=copyCurrentPrompt;
 if(minimal){actions.append(clone);sidebar.append(feedback,actions);}
 else{actions.append(clone,use,copy,create);sidebar.append(note,feedback,actions);}
 // One carousel per media kind. The selected media, prompt and Studio handoff
 // always share currentItem. Never mix images and videos in a single sequence.
 if(minimal&&(item.kind==='image'||item.kind==='video')){
  const slides=items.filter(candidate=>candidate.kind===item.kind&&candidate.actionTarget==='studio'&&candidate.previewUrl);
  let index=slides.findIndex(candidate=>candidate.id===item.id);
  if(index>=0&&slides.length>1){
   const count=detailEl('span','inspiration-detail-count');
   count.setAttribute('role','status');count.setAttribute('aria-live','polite');
   toolbar.append(count);
   const previous=detailEl('button','inspiration-detail-arrow inspiration-detail-prev','‹');
   const next=detailEl('button','inspiration-detail-arrow inspiration-detail-next','›');
   for(const button of [previous,next])button.type='button';
   previous.setAttribute('aria-label',item.kind==='video'?'Previous video':'Previous image');
   next.setAttribute('aria-label',item.kind==='video'?'Next video':'Next image');
   imageArea.append(previous,next);
   const changeSlide=delta=>{
    index=(index+delta+slides.length)%slides.length;
    currentItem=slides[index];
    if(media.tagName==='VIDEO'){
     media.pause();
     media.removeAttribute('src');
     media.removeAttribute('poster');
     if(currentItem.previewPosterUrl)media.poster=currentItem.previewPosterUrl;
     media.src=currentItem.previewUrl;
     media.setAttribute('aria-label',currentItem.title+' full video preview');
     media.load();
     void media.play().catch(()=>{});
    }else{
     media.src=currentItem.previewUrl;media.alt=currentItem.title;
    }
    dialog.setAttribute('aria-label',currentItem.title+' inspiration details');
    prompt.textContent=currentItem.prompt||'No prompt available.';
    prompt.classList.remove('is-expanded');
    promptMore.textContent='Show more';
    promptMore.setAttribute('aria-expanded','false');
    count.textContent=(index+1)+' / '+slides.length;
    const support=studioHandoffSupport(currentItem);
    clone.disabled=Boolean(support&&!support.supported);
    feedback.textContent='';feedback.hidden=true;
    promptMore.hidden=true;
    requestAnimationFrame(refreshPromptMore);
   };
   previous.onclick=()=>changeSlide(-1);
   next.onclick=()=>changeSlide(1);
   let touchX=null,touchY=null;
   imageArea.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){touchX=null;return;}
    touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;
   },{passive:true});
   imageArea.addEventListener('touchend',event=>{
    if(touchX===null||!event.changedTouches.length)return;
    const dx=event.changedTouches[0].clientX-touchX;
    const dy=event.changedTouches[0].clientY-touchY;
    touchX=null;touchY=null;
    if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.3)changeSlide(dx<0?1:-1);
   },{passive:true});
   imageArea.addEventListener('touchcancel',()=>{touchX=null;touchY=null;},{passive:true});
   dialog.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
     event.preventDefault();changeSlide(event.key==='ArrowRight'?1:-1);
    }
   });
   count.textContent=(index+1)+' / '+slides.length;
  }
 }
 layout.append(stage,sidebar);dialog.append(layout);
 const previousOverflow=document.body.style.overflow;
 dialog.addEventListener('close',()=>{
  if(media.tagName==='VIDEO')media.pause();
  promptResizeObserver?.disconnect();
  document.body.style.overflow=previousOverflow;
  dialog.remove();if(inspirationDetail===dialog)inspirationDetail=null;
  if(opener.isConnected)opener.focus({preventScroll:true});
 },{once:true});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 document.body.append(dialog);inspirationDetail=dialog;
 dialog.showModal();document.body.style.overflow='hidden';close.focus({preventScroll:true});
 if(minimal){
  if('ResizeObserver' in window){
   promptResizeObserver=new ResizeObserver(refreshPromptMore);
   promptResizeObserver.observe(prompt);
  }
  requestAnimationFrame(refreshPromptMore);
 }
 if(media.tagName==='VIDEO')void media.play().catch(()=>{});
}


let items=[],activeKind='all',afterDraw=()=>{};
let previewObserver=null,previewVideos=[];
const finePreviewHover=typeof window!=='undefined'?window.matchMedia('(hover: hover) and (pointer: fine)'):null;
function syncPreviewPlayback(){
 const allowed=!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData;
 const hoverMode=finePreviewHover?.matches;
 const active=allowed?(hoverMode
  ? previewVideos.find(v=>v.__previewHovered&&v.__previewVisible)
  : [...previewVideos].filter(v=>v.__previewVisible).sort((a,b)=>b.__previewRatio-a.__previewRatio)[0]):null;
 for(const v of previewVideos){
  if(v!==active){
   v.pause();
   if(v.hasAttribute('src')){v.removeAttribute('src');v.load();}
  }else{
   if(v.getAttribute('src')!==v.dataset.src){v.src=v.dataset.src;v.load();}
   if(v.paused)void v.play().catch(()=>v.pause());
  }
 }
}
function attachPreviewPlayback(){
 previewObserver?.disconnect();
 previewVideos=[...document.querySelectorAll('#inspirationPreviewGrid .inspiration-preview-card video[data-src]')];
 if(!previewVideos.length)return;
 for(const v of previewVideos){
  const card=v.closest('.inspiration-preview-card');
  card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')v.__previewHovered=true;syncPreviewPlayback();});
  card.addEventListener('pointerleave',()=>{v.__previewHovered=false;syncPreviewPlayback();});
 }
 if('IntersectionObserver' in window){
  previewObserver=new IntersectionObserver(entries=>{
   for(const e of entries){
    const v=e.target.querySelector('video[data-src]');
    if(v){v.__previewRatio=e.intersectionRatio;v.__previewVisible=e.isIntersecting&&e.intersectionRatio>=.6;}
   }
   syncPreviewPlayback();
  },{threshold:[0,.6,.75,1]});
  for(const v of previewVideos)previewObserver.observe(v.closest('.inspiration-preview-card'));
 }
}
if(typeof document!=='undefined'){
 document.addEventListener('visibilitychange',syncPreviewPlayback);
 finePreviewHover?.addEventListener?.('change',syncPreviewPlayback);
}
export function renderHomeInspiration(feed,onRender=()=>{}){
 afterDraw=onRender;
 document.querySelectorAll('[data-canvas-example]').forEach(button=>{const item=feed.find(item=>item.slug===button.dataset.canvasExample||item.id===button.dataset.canvasExample);button.disabled=!item;button.onclick=item?()=>openInspirationDetail(item,button):null;});
 items=feed.filter(item=>item.actionTarget==='studio'&&['video','image'].includes(item.kind)&&!item.previewUrl?.includes('logo')&&!item.previewPosterUrl?.includes('logo'));
 const section=document.getElementById('inspirationPreview');
 section.hidden=false;
 section.querySelectorAll('[data-inspiration-kind]').forEach(button=>button.onclick=()=>{
  activeKind=button.dataset.inspirationKind;
  section.querySelectorAll('[data-inspiration-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  draw();
 });
 draw();
}
function draw(){
 const root=document.getElementById('inspirationPreviewGrid');previewObserver?.disconnect();root.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');});previewVideos=[];root.replaceChildren();
 const visible=items.filter(item=>activeKind==='all'||item.kind===activeKind);
 for(const item of visible){
  const button=detailEl('button','inspiration-preview-card');button.type='button';button.dataset.kind=item.kind;
  button.setAttribute('aria-label','View '+item.title+' inspiration');
  const dimensions=item.kind==='image'&&Array.isArray(item.previewDimensions)?item.previewDimensions:null;
  const parts=String(item.aspectRatio||'1:1').split(':').map(Number);
  const width=Number(dimensions?.[0])||parts[0],height=Number(dimensions?.[1])||parts[1];
  const ratio=Number.isFinite(width/height)&&width>0&&height>0?width/height:1;
  button.style.setProperty('--inspiration-ratio',String(ratio));
  const visual=detailEl('div','inspiration-preview-media');
  if(item.kind==='video'){
   const video=detailEl('video');video.dataset.src=item.previewUrl;video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
   if(item.previewPosterUrl)video.poster=item.previewPosterUrl;
   visual.append(video);
  }else{
   const image=detailEl('img');image.src=item.previewUrl;image.alt=item.title;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
   visual.append(image);
  }
  button.append(visual);
  button.onclick=()=>openInspirationDetail(item,button,{minimal:true});
  root.append(button);
 }
 const empty=document.getElementById('inspirationEmpty');empty.hidden=visible.length>0;
 empty.textContent=activeKind==='all'?'No inspiration yet.':activeKind==='image'?'No images yet.':'No videos yet.';
 attachPreviewPlayback();
 afterDraw();
}

// Public, owner-approved creative examples use the existing prompt dialog and Studio handoff.
document.querySelectorAll('[data-creative-example]').forEach(button=>{
 const item=CREATIVE_EXAMPLES.find(example=>example.id===button.dataset.creativeExample);
 button.disabled=!item;
 if(item)button.onclick=()=>openInspirationDetail(item,button);
});
