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
function openInspirationDetail(item,opener){
 if(inspirationDetail?.open)inspirationDetail.close();
 const dialog=detailEl('dialog','inspiration-detail-dialog');
 dialog.setAttribute('aria-label',item.title+' inspiration details');
 const layout=detailEl('div','inspiration-detail-layout');
 const stage=detailEl('section','inspiration-detail-stage');
 const toolbar=detailEl('div','inspiration-detail-toolbar');
 const close=detailEl('button','inspiration-detail-close','×');
 close.type='button';close.setAttribute('aria-label','Close inspiration preview');
 close.onclick=()=>dialog.close();
 const caption=detailEl('span','inspiration-detail-caption',item.kind==='video'?'Video inspiration':'Image inspiration');
 toolbar.append(close,caption);
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
 sidebar.append(heading,kindLine,description,headingPrompt,prompt);
 if(item.kind==='video'){
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
 const clone=detailEl('button','inspiration-detail-clone','✦ Clone & try');clone.setAttribute('aria-label','Clone & Try');
 const use=detailEl('button','inspiration-detail-secondary','Use this prompt');
 const create=detailEl('button','inspiration-detail-secondary','Create yours');
 const copy=detailEl('button','inspiration-detail-secondary','Copy prompt');
 for(const b of [clone,use,create,copy])b.type='button';
 const support=studioHandoffSupport(item);
 if(support&&!support.supported){
  clone.disabled=true;use.disabled=true;create.disabled=true;
  note.textContent=support.reason;
 }
 clone.onclick=()=>openTarget(item,'clone',feedback);
 use.onclick=()=>openTarget(item,'prompt',feedback);
 create.onclick=()=>openTarget(item,'create',feedback);
 // Copy must work independently of whether a Studio provider is enabled.
 copy.onclick=async()=>{
  const value=String(item.prompt||'');
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
 actions.append(clone,use,copy,create);
 sidebar.append(note,feedback,actions);
 layout.append(stage,sidebar);dialog.append(layout);
 const previousOverflow=document.body.style.overflow;
 dialog.addEventListener('close',()=>{
  if(media.tagName==='VIDEO')media.pause();
  document.body.style.overflow=previousOverflow;
  dialog.remove();if(inspirationDetail===dialog)inspirationDetail=null;
  if(opener.isConnected)opener.focus({preventScroll:true});
 },{once:true});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 document.body.append(dialog);inspirationDetail=dialog;
 dialog.showModal();document.body.style.overflow='hidden';close.focus({preventScroll:true});
 if(media.tagName==='VIDEO')void media.play().catch(()=>{});
}


let items=[],activeKind='all',afterDraw=()=>{};
export function renderHomeInspiration(feed,onRender=()=>{}){
 afterDraw=onRender;
 document.querySelectorAll('[data-canvas-example]').forEach(button=>{const item=feed.find(item=>item.slug===button.dataset.canvasExample||item.id===button.dataset.canvasExample);button.disabled=!item;button.onclick=item?()=>openInspirationDetail(item,button):null;});
 items=feed.filter(item=>item.actionTarget==='studio'&&['video','image'].includes(item.kind));
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
 const root=document.getElementById('inspirationPreviewGrid');root.querySelectorAll('video').forEach(v=>v.pause());root.replaceChildren();
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
   const video=detailEl('video');video.src=item.previewUrl;video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
   if(item.previewPosterUrl)video.poster=item.previewPosterUrl;
   visual.append(video);
  }else{
   const image=detailEl('img');image.src=item.previewUrl;image.alt=item.title;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
   visual.append(image);
  }
  button.append(visual);
  button.onclick=()=>openInspirationDetail(item,button);
  root.append(button);
 }
 const empty=document.getElementById('inspirationEmpty');empty.hidden=visible.length>0;
 empty.textContent=activeKind==='all'?'No inspiration yet.':activeKind==='image'?'No images yet.':'No videos yet.';
 afterDraw();
}

// Public, owner-approved creative examples use the existing prompt dialog and Studio handoff.
document.querySelectorAll('[data-creative-example]').forEach(button=>{
 const item=CREATIVE_EXAMPLES.find(example=>example.id===button.dataset.creativeExample);
 button.disabled=!item;
 if(item)button.onclick=()=>openInspirationDetail(item,button);
});
