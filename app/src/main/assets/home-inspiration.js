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
   if(v.dataset.ownerPreview!=='true'&&v.hasAttribute('src')){v.removeAttribute('src');v.load();}
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
    if(v){v.__previewRatio=e.intersectionRatio;v.__previewVisible=e.isIntersecting&&e.intersectionRatio>=.6;
     if(v.dataset.ownerPreview==='true'&&e.isIntersecting&&!v.hasAttribute('src')){v.src=v.dataset.src+'#t=0.12';v.load();}
    }
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
   if(item.source==='owner-uploaded-2026-11-10'){video.dataset.ownerPreview='true';video.preload='metadata';}
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

// One owner video collection used by Home and AI Apps.
const ownerMediaBase="https://d2ol7oe51mr4n9.cloudfront.net/user_3DohHzQ92OwE6TBQr5M2fYm2CwS/";
const ownerVideoSource=[
  {"id":"owner-20261110-antique-ocean","slug":"owner-20261110-antique-ocean","title":"Ocean Rising From an Antique Book","kind":"video","category":"Cinematic inspiration","previewUrl":"7721a721-33c2-4d5d-9117-7dc3dbac2c5b","prompt":"A six-second photorealistic vertical cinematic video inside a warm, dim antique library. On a dark oak reading table, an enormous open illustrated book shows an engraved sailing ship on a stormy sea. Begin with a steady eye-level view and slow push-in. Its flat monochrome waves gradually become real deep-teal water: a small wooden ship rises from the ink, then a towering foamy wave curls upright out of the page, water droplets spraying naturally. The swell reaches its peak and collapses back into the illustration as the heavy book closes softly by itself. Keep the bookshelves and camera perspective consistent, believable paper and liquid physics, tactile period atmosphere, no captions or logos, one seamless transformation.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":0,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-shadow-doorway","slug":"owner-20261110-shadow-doorway","title":"Doorway Into a Rainy Night","kind":"video","category":"Cinematic inspiration","previewUrl":"2494befa-59e7-4daa-a691-0ebc18237fd9","prompt":"Create a six-second vertical cinematic tracking shot through a quiet sunlit limestone interior with polished pale floors and a sequence of aligned doors. At first each doorway opens onto another warm minimalist hallway. As the camera glides smoothly forward, the farthest open doorway becomes a portal to a wet city street at night: blue-black sky, street lamps, gleaming rain-soaked asphalt and distant car lights. Keep the architecture fixed while the visible environment beyond the door changes from daylight to rainy night. Continue moving through the portal until the cold nocturnal street fills the frame, rain reflections convincing and atmospheric. A single continuous forward dolly move, physically coherent transitions, no cuts, text or signage.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":1,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-city-in-coffee","slug":"owner-20261110-city-in-coffee","title":"City Growing Inside a Coffee Cup","kind":"video","category":"Cinematic inspiration","previewUrl":"41b610b2-38b7-4323-98c6-e558952af11c","prompt":"Six-second photorealistic vertical macro video of a white porcelain cappuccino cup on a black marble café table, shallow depth of field, softly blurred customers and warm café lighting. Start on the creamy latte art seen from a gentle three-quarter angle. Tiny architectural foundations emerge from the coffee crema and grow into a detailed golden miniature European city: rooftops, narrow towers, lit windows and streets fitting naturally within the cup rim. Wisps of steam drift like weather clouds between the tiny buildings. The camera slowly pushes closer as the city expands but remains entirely inside the cup; preserve cup size, table composition and realistic coffee texture. Whimsical impossible scale executed as luxury practical-effects photography, no lettering or logos.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":2,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-hypercar-viaduct","slug":"owner-20261110-hypercar-viaduct","title":"Hypercar Above the Alpine Valley","kind":"video","category":"Cinematic inspiration","previewUrl":"bae58813-06ab-4cb4-8c37-1842ddf22f3e","prompt":"A six-second photorealistic vertical luxury automotive film. Track a sleek original unbranded silver hypercar from a slightly elevated rear three-quarter angle as it drives briskly along a narrow winding mountain road through dramatic Alpine peaks. Roadside stones and grass move with convincing parallax. The road curves sharply and unexpectedly extends into a majestic high concrete sky bridge suspended above a deep green valley. The car follows the curve onto the viaduct while the camera rises and widens to reveal the enormous drop, distant snowy mountains and clear pale sky. Smooth continuous tracking motion, believable wheel rotation, road geometry, realistic daylight reflections, no traffic hazards, no emblems, advertisements or text.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":3,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-emerald-handbag","slug":"owner-20261110-emerald-handbag","title":"Butterflies From an Emerald Handbag","kind":"video","category":"Cinematic inspiration","previewUrl":"9a90c913-9397-4596-82a0-4fe2ae0a1783","prompt":"Create a six-second vertical premium studio product-film shot of an unbranded emerald-green structured leather handbag with a small gold-tone clasp and rounded top handle, standing on a white sculptural pedestal against a pale architectural backdrop. Begin close and steady. A realistic hand briefly approaches and touches the clasp; the closed bag gently opens and delicate emerald butterflies made of living leaves unfold from within. Several butterflies rise and flutter around the handle in slow elegant arcs, catching soft directional daylight, then disperse as the handbag returns to its original clean silhouette. Preserve stitching, leather grain and bag proportions throughout; natural hand anatomy and insect wing motion, no visible branding, text or cuts.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":4,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-cloud-letterpress","slug":"owner-20261110-cloud-letterpress","title":"A Cloud Printed by an Antique Press","kind":"video","category":"Cinematic inspiration","previewUrl":"18870477-ef45-4d16-9331-7e3c417886a3","prompt":"Six-second vertical surreal-realism video in an old brick industrial print workshop under a large glass skylight. An antique iron letterpress with turning metal rollers feeds a smooth pale blue sheet forward. Begin on the rollers and moving material. As the sheet advances, a small perfect white cumulus cloud begins to form above it, growing from soft vapor into tangible billowing cotton-like volume. The printing mechanism continues rotating and seems to push out more bright fluffy cloud mass, gently rising and spilling into the air above the machine. Slowly widen the camera to show the towering cloud and surrounding authentic workshop. Realistic mechanical motion, daylight, volumetric cloud shadows, no text or logos.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":5,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-woven-pine-forest","slug":"owner-20261110-woven-pine-forest","title":"A Living Pine Forest Woven on a Loom","kind":"video","category":"Cinematic inspiration","previewUrl":"9ef55ed5-6887-44ae-8eab-44526986a09b","prompt":"Create a six-second widescreen 16:9 cinematic macro video in a historic textile mill. An old wooden and metal loom moves rhythmically as deep sage-green fabric emerges over the rollers. Instead of a flat pattern, a miniature living pine forest gradually grows from the woven surface: tiny trunks rise one after another, dense green needles fill out, moss spreads between stones and small earth mounds appear. The camera tracks slowly along the loom at a shallow angle, ending near the lush miniature woodland in the foreground while the mechanical shuttle continues behind it. Photorealistic tactile threads, miniature bark and foliage, plausible organic growth animation, warm side lighting, no labels, words or jump cuts.","aspectRatio":"16:9","defaultSettings":{"ratio":"16:9","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":6,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-piano-miniature-city","slug":"owner-20261110-piano-miniature-city","title":"A City Awakens on Piano Keys","kind":"video","category":"Cinematic inspiration","previewUrl":"00704d56-664e-404c-8931-c6324671d255","prompt":"Six-second widescreen photorealistic cinematic shot of a polished black grand piano inside a moody dark recital room, lit by warm pools of amber light. Begin with a slow lateral camera slide along the pristine black-and-white keys. Miniature stone buildings begin emerging between keys like a growing European street: small illuminated windows, balconies, bridges and a slender landmark tower. The city spreads gradually across the keyboard as the camera moves closer and lowers to street level, revealing exquisite tiny architectural detail. Keep the piano stationary, the keys accurately shaped and the scale consistently miniature; subtle reflections on the glossy lacquer, gently atmospheric haze, no people, writing, brand marks or artificial overlays.","aspectRatio":"16:9","defaultSettings":{"ratio":"16:9","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":7,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-crimson-lipstick","slug":"owner-20261110-crimson-lipstick","title":"Crimson Silk From a Lipstick Gesture","kind":"video","category":"Cinematic inspiration","previewUrl":"d02f4c1d-a2da-4da1-bc65-0fdce4fbee9f","prompt":"Create a six-second vertical high-fashion beauty film of an adult model with natural skin, dark styled hair, elegant earrings and an opaque black off-shoulder gown against a very dark studio background. Start in an intimate portrait as she raises a vivid crimson lipstick close to her face and makes one controlled gesture. A narrow red satin ribbon materializes from the motion, spiraling around her shoulders in a widening elegant helix. The camera slowly pulls back to reveal waves of glossy scarlet fabric and sculptural rose-like folds blooming around her, framing rather than obscuring her face. End in a composed editorial tableau with suspended crimson silk. Strong red-and-black contrast, cinematic soft rim light, realistic fabric physics, consistent facial features and hands, no text.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":8,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-golden-elevator","slug":"owner-20261110-golden-elevator","title":"Elevator Doors Into a Dream City","kind":"video","category":"Cinematic inspiration","previewUrl":"82fd2e70-1eb6-4031-a0c4-e9a97052d108","prompt":"Six-second vertical magical-realism fashion film. An adult red-haired woman wearing an elegant full-length black evening gown stands in a brass-and-wood vintage elevator. The camera faces her symmetrically from the hallway. The metallic elevator doors glide open and, instead of a normal corridor, reveal a glowing sunlit city of ornate golden buildings and arched architecture floating above soft clouds. The woman steps forward slightly, maintaining the same face, dress and position as a gentle breeze moves her hair. The camera inches toward the threshold while warm mist rolls across the floor and tiny floating petals drift through the daylight. Smooth door mechanics, convincing depth and reflections, no hard edits, logos or titles.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":9,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-paper-rose-couture","slug":"owner-20261110-paper-rose-couture","title":"Paper Roses Become a Couture Gown","kind":"video","category":"Cinematic inspiration","previewUrl":"28ba9b4d-4790-49c2-8b90-4db923fbdb2b","prompt":"Create a six-second vertical editorial fashion transformation on the broad cream-stone staircase of a grand classical building. An original adult model stands facing camera in a simple opaque ivory mini dress, wearing understated jewelry. Small champagne-gold paper roses and folded origami petals appear around her waist and forearms, then unfurl into long ribbons of sculptural satin and paper-like fabric. The ribbons rotate gently around her body and assemble an elaborate asymmetric high-fashion gown with broad folded shoulder detailing and a dramatic flowing overskirt, still revealing the original short dress beneath. Maintain the model's face, pose, anatomy, staircase and warm natural daylight; one continuous elegant metamorphosis, rich real fabric texture, no captions or logos.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":10,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-four-seasons","slug":"owner-20261110-four-seasons","title":"Four Seasons Around a White Gown","kind":"video","category":"Cinematic inspiration","previewUrl":"42a4027e-c028-4472-8f35-ee7b00a79e72","prompt":"A six-second seamless vertical cinematic sequence of an adult brunette model in the same long flowing ivory gown standing in the center of a formal garden walkway. Camera locked at full-body eye level and subject perfectly continuous. Start with spring: white flowering trees, fresh soft light. Around the stationary model the environment flows into summer, turning intensely green with vivid blossoms; next into autumn with amber leaves and warm low sunlight; finally into quiet winter as branches become bare and clean snow covers the same hedges and stone path. Let each season transition organically over roughly one and a half seconds, with delicate leaves or snow particles moving naturally. Keep her identity, gown, position, framing and path geometry unchanged, no words or abrupt cuts.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":11,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-bridge-from-shadow","slug":"owner-20261110-bridge-from-shadow","title":"A Steel Bridge Grows From Its Shadow","kind":"video","category":"Cinematic inspiration","previewUrl":"8baebfe6-4dda-4851-af3d-65b7f3421b49","prompt":"Create a six-second cinematic widescreen 16:9 aerial shot across a vast sunlit sandstone canyon. At first, only the long dark shadow of an impossible bridge is cast on the rugged canyon wall and river gorge, while the gap above remains empty. A slender dark steel structure begins physically materializing from the edge of the shadow: support beams extrude over the abyss, trusses connect in sequence and a narrow deck spans the opening. The camera glides sideways to reveal the steel bridge growing in place until it becomes complete, with tiny human figures for scale. Preserve realistic engineering, coherent sunlight and casting shadows, expansive desert rock textures, natural perspective, no magic sparkles, text or logos.","aspectRatio":"16:9","defaultSettings":{"ratio":"16:9","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":12,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-runway-three-looks","slug":"owner-20261110-runway-three-looks","title":"Three Looks in One Runway Walk","kind":"video","category":"Cinematic inspiration","previewUrl":"afee22d6-c468-4643-b3a2-803bbb339965","prompt":"Six-second vertical luxury runway fashion video, full-body front view of one adult female supermodel walking confidently toward camera along a minimalist cream-colored catwalk, soft out-of-focus audience on either side. Begin with a structured black long-sleeve evening gown. While she continues the same uninterrupted stride, the gown transforms smoothly into a sharply tailored white double-breasted trouser suit; after another step it changes into a draped one-shoulder emerald-green evening dress. Each outfit should be briefly fully visible, with anatomically consistent face, hands, legs and walk cycle. Locked forward tracking camera, polished fashion-week lighting, believable moving fabric and seamless garment morphing, no cuts, titles, labels or logos.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":13,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-vinyl-railway","slug":"owner-20261110-vinyl-railway","title":"A Train Journey Inside a Vinyl Record","kind":"video","category":"Cinematic inspiration","previewUrl":"7853eab7-7f78-4ca1-8fd4-3b128c8df3fa","prompt":"Create a six-second widescreen photorealistic fantasy macro film. Start with a black vinyl LP rotating on a vintage turntable in warm daylight. The inner record grooves gradually open into a miniature rocky canyon cut directly into the disc's dark surface. A tiny red passenger train appears on tracks winding through stone cliffs inside the spinning record. The camera pushes down and seamlessly transitions from macro view into a miniature aerial tracking perspective, following the train as it approaches and enters a dark tunnel between the rock walls. Maintain convincing scale, rotating vinyl texture at the beginning, accurate rail motion and natural rock detail; one coherent continuous camera move, no visible record labels, words or branding.","aspectRatio":"16:9","defaultSettings":{"ratio":"16:9","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":14,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-instant-luxury-outfits","slug":"owner-20261110-instant-luxury-outfits","title":"Instant Outfit Changes in a Living Room","kind":"video","category":"Cinematic inspiration","previewUrl":"5cd3b58d-0daa-468a-9375-fd99203adaea","prompt":"Six-second vertical photorealistic fashion transformation, an adult brunette woman standing full-body in the same softly lit neutral luxury living room with pale sofas and tall windows. Start in an elegant cream tailored pantsuit and blouse. She makes a subtle finger gesture and the outfit morphs instantly, without changing her hair, body or pose, into a fitted emerald-teal knee-length dress. On her next small hand movement it smoothly changes to a sleek opaque black evening dress. Finish with the model centered and composed. Keep the camera stationary, lighting and background constant, realistic cloth movement and natural hands, crisp editorial styling, no hard cuts, text or logos.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":15,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-floating-cherries","slug":"owner-20261110-floating-cherries","title":"Floating Cherries at the Restaurant","kind":"video","category":"Cinematic inspiration","previewUrl":"a6b48e76-e177-4c1a-b31b-292f13e9b417","prompt":"Create a six-second vertical luxury restaurant fantasy scene at blue hour. An elegant adult woman in a deep burgundy sleeveless dress sits at a dark wood dining table beside floor-to-ceiling windows overlooking a glowing city. A waiter serves an artfully plated small dessert. As she lowers her gaze toward the plate, glossy red cherries and tiny dessert elements begin to float slowly upward around the table and across the room, followed by a subtle wider reveal of suspended dishes under the restaurant lights. The camera moves smoothly backward from a medium close-up to show more of the dining room. Realistic tableware, reflective glass, gentle levitation physics, sophisticated cinematic lighting, unchanged faces and hands, no captions or branding.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":16,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-book-to-coast","slug":"owner-20261110-book-to-coast","title":"Stepping From a Book to the Coast","kind":"video","category":"Cinematic inspiration","previewUrl":"cfbfed56-aa1c-4d67-91a7-62e50f2eceb8","prompt":"Six-second vertical cinematic magical realism in a tall antique library. An adult brunette woman in an opaque flowing black dress opens a large illustrated storybook on an oak desk. The printed seaside village lifts from the pages into a finely detailed miniature landscape. The book's standing pages stretch upward into a full-size doorway with glowing edges. The woman walks naturally through the doorway, and the setting seamlessly becomes a windswept golden-hour coastal cliff above the sea. The camera follows the same woman from the library to the ocean vista in a single dreamlike movement. Preserve her face and dress, plausible page-fold motion, wind in hair and realistic natural light; no text, logos or jump cuts.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":17,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-ocean-glass","slug":"owner-20261110-ocean-glass","title":"An Ocean Behind the Glass","kind":"video","category":"Cinematic inspiration","previewUrl":"b0615da7-cb43-4f93-ac4d-667d66355403","prompt":"Create a six-second vertical photorealistic architecture-fantasy video. An adult woman wearing an elegant full-length ivory slip dress walks barefoot through a bright modern coastal living room toward panoramic floor-to-ceiling glass. Initially a calm sunlit blue sea is visible outside. As she approaches and raises her hand to the window, the exterior water rises into a wall of crystal-clear underwater ocean, revealing schools of silvery fish, a distant large ray and shifting turquoise light. She lightly touches the glass; soft aquatic caustics ripple across the interior floor while all windows remain intact. Camera gently tracks behind and to her side, consistent architecture, realistic fish and refraction, no captions or logos.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":18,"source":"owner-uploaded-2026-11-10"},
  {"id":"owner-20261110-aquarium-floor","slug":"owner-20261110-aquarium-floor","title":"Walking Over a Transparent Ocean Floor","kind":"video","category":"Cinematic inspiration","previewUrl":"174bc94f-da29-4f07-9303-98ea5b304791","prompt":"Six-second vertical cinematic fashion-architecture shot following the lower half and full figure of an adult woman wearing a long flowing black silk dress and pointed black heels as she walks across a sunlit pale marble hall with tall classical columns. Start with opaque cream stone beneath her feet. As she takes the next steps, a rectangular section of the floor becomes perfectly transparent glass, revealing luminous turquoise seawater, small fish and soft moving aquatic patterns beneath. The reveal spreads panel by panel along her path while the stone frame remains stable. Slow low-angle trailing camera, natural heel contacts, believable glass reflections, realistic fabric movement and underwater depth, no typography, logos or cuts.","aspectRatio":"9:16","defaultSettings":{"ratio":"9:16","durationSeconds":6},"requiredInputTypes":[],"actionTarget":"studio","featured":true,"active":true,"sortOrder":19,"source":"owner-uploaded-2026-11-10"}
];
export const OWNER_VIDEO_INSPIRATION=Object.freeze(ownerVideoSource.map(item=>Object.freeze({...item,previewUrl:ownerMediaBase+item.previewUrl+'.mp4'})));
export function mergeOwnerVideoInspiration(feed){
 const existing=Array.isArray(feed)?feed:[];
 const ids=new Set(OWNER_VIDEO_INSPIRATION.map(item=>item.id));
 return [...OWNER_VIDEO_INSPIRATION,...existing.filter(item=>item&&!ids.has(item.id))];
}
