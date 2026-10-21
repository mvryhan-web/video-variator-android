import {templateSupport} from './ai-template-product-name.js';
const $=id=>document.getElementById(id);
const inspirationGalleryStyles=document.createElement('link');inspirationGalleryStyles.rel='stylesheet';inspirationGalleryStyles.href='inspiration-gallery-detail.css';document.head.append(inspirationGalleryStyles);
const VALID_KINDS=new Set(['all','image','video']);const PAGE_SIZE=24;let timer=null,lastCategories=[],lastRatios=[],nextOffset=null,loading=false,activeRequest=null,videoObserver=null;
const initial=new URLSearchParams(location.search);let kind=VALID_KINDS.has(initial.get('kind'))?initial.get('kind'):'all';
function ratioClass(r){return 'r'+String(r||'1:1').replace(':','x');}
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
function preview(item){const wrap=document.createElement('div');wrap.className='media '+ratioClass(item.aspectRatio);if(item.kind==='video'){const v=document.createElement('video');v.src=item.previewUrl;v.controls=true;v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.setAttribute('aria-label',item.title+' preview');if(item.previewPosterUrl)v.poster=item.previewPosterUrl;wrap.append(v);}else{const img=document.createElement('img');img.src=item.previewUrl;img.alt=item.title;img.loading='lazy';img.referrerPolicy='no-referrer';wrap.append(img);}const badge=document.createElement('span');badge.className='type-badge';badge.textContent=item.kind;wrap.append(badge);return wrap;}
function card(item){const el=document.createElement('article');el.className='card';el.dataset.ratio=item.aspectRatio;el.dataset.kind=item.kind;const copy=document.createElement('div');copy.className='copy';const title=document.createElement('h2');title.textContent=item.title;const desc=document.createElement('p');desc.textContent=item.description||'Owner-approved Deepsyq inspiration.';const meta=document.createElement('div');meta.className='meta';// A preferred model is not proof that any paid model is connected or enabled.
 for(const x of [item.category,item.aspectRatio].filter(Boolean)){const s=document.createElement('span');s.textContent=x;meta.append(s);}const prompt=document.createElement('div');prompt.className='prompt';prompt.textContent=item.prompt;const note=document.createElement('p');note.className='replace-note';const handoff=studioHandoffSupport(item);note.textContent=handoff&&!handoff.supported?handoff.reason:(item.requiredInputTypes||[]).length?'Add your own source assets in Studio; inspiration assets are not copied.':'Studio opens with the prompt/settings prepared; nothing generates automatically.';const actions=document.createElement('div');actions.className='actions';const feedback=document.createElement('p');feedback.className='handoff-feedback';feedback.setAttribute('role','alert');feedback.hidden=true;const create=document.createElement('button');create.type='button';create.className='primary';create.textContent='Create yours';create.onclick=()=>openTarget(item,'create',feedback);const use=document.createElement('button');use.type='button';use.textContent='Use this prompt';use.onclick=()=>openTarget(item,'prompt',feedback);const clone=document.createElement('button');clone.type='button';clone.textContent='Clone and Try';clone.onclick=()=>openTarget(item,'clone',feedback);if(handoff&&!handoff.supported){create.disabled=true;use.disabled=true;clone.disabled=true;}actions.append(create,use,clone);copy.append(title,desc,meta,prompt,note,actions,feedback);const media=preview(item);const opener=document.createElement('button');opener.type='button';opener.className='inspiration-tile-open';opener.setAttribute('aria-label','View '+item.title+' inspiration');opener.append(detailEl('span','inspiration-tile-title',item.title));opener.onclick=()=>openInspirationDetail(item,opener);media.append(opener);el.append(media,copy);return el;}

/* Owner-requested Lumina-like behavior implemented without copying foreign assets:
   dense licensed-media gallery -> native detail dialog -> original Studio handoff. */
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
 const sidebar=detailEl('aside','inspiration-detail-sidebar');
 const heading=detailEl('h2','inspiration-detail-title',item.title);
 const kindLine=detailEl('p','inspiration-detail-kind',(item.category||'Inspiration')+' · '+(item.kind==='video'?'Video':'Image'));
 const description=detailEl('p','inspiration-detail-description',item.description||'Owner-approved Deepsyq inspiration.');
 const headingPrompt=detailEl('h3','inspiration-detail-heading','Prompt');
 const prompt=detailEl('p','inspiration-detail-prompt',item.prompt||'No prompt available.');
 const meta=detailEl('div','inspiration-detail-parameters');
 meta.append(detailEl('h3','inspiration-detail-heading','Parameters'));
 const entries=[['Aspect ratio',item.aspectRatio]];
 if(item.defaultModel)entries.push(['Preferred model',item.defaultModel]);
 for(const key of ['resolution','duration','seed']){
  const v=item.defaultSettings?.[key];
  if(typeof v==='string'||typeof v==='number')entries.push([key[0].toUpperCase()+key.slice(1),String(v).slice(0,80)]);
 }
 for(const [label,value] of entries){
  if(!value)continue;
  const row=detailEl('div','inspiration-detail-param');
  row.append(detailEl('span','',label),detailEl('strong','',value));meta.append(row);
 }
 const note=detailEl('p','inspiration-detail-note','An example, not a ready-to-run AI model. Opening Studio prepares your prompt; no generation or payment starts automatically.');
 const feedback=detailEl('p','inspiration-detail-feedback');feedback.hidden=true;feedback.setAttribute('role','alert');
 const actions=detailEl('div','inspiration-detail-actions');
 const clone=detailEl('button','inspiration-detail-clone','✦ Clone & Try');
 const use=detailEl('button','inspiration-detail-secondary','Use this prompt');
 const create=detailEl('button','inspiration-detail-secondary','Create yours');
 for(const b of [clone,use,create])b.type='button';
 const support=studioHandoffSupport(item);
 if(support&&!support.supported){
  clone.disabled=true;use.disabled=true;create.disabled=true;
  note.textContent=support.reason;
 }
 clone.onclick=()=>openTarget(item,'clone',feedback);
 use.onclick=()=>openTarget(item,'prompt',feedback);
 create.onclick=()=>openTarget(item,'create',feedback);
 actions.append(clone,use,create);
 sidebar.append(heading,kindLine,description,headingPrompt,prompt,meta,note,feedback,actions);
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

function syncSelect(id,label,values,current){const select=$(id);select.replaceChildren(new Option(label,''));for(const value of values)select.add(new Option(value,value));if(values.includes(current))select.value=current;}
// Category shortcuts are derived exclusively from published, rights-approved API data.
function renderCategoryChips(categories){
 const root=$('categoryChips');root.replaceChildren();
 for(const category of categories.slice(0,10)){
  const button=document.createElement('button');button.type='button';button.textContent=category;
  button.setAttribute('aria-pressed',String($('category').value===category));
  button.onclick=()=>{$('category').value=$('category').value===category?'':category;resetAndLoad();};root.append(button);
 }
 root.hidden=!root.childElementCount;
}
function observeGalleryVideos(){
 videoObserver?.disconnect();videoObserver=null;
 if(!('IntersectionObserver' in window)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||navigator.connection?.saveData)return;
 videoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){const video=entry.target;if(entry.isIntersecting&&!document.hidden){void video.play().catch(()=>{});}else video.pause();}
 },{threshold:.4});
 for(const video of $('gallery').querySelectorAll('video'))videoObserver.observe(video);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)$('gallery').querySelectorAll('video').forEach(video=>video.pause());});
function syncFilterOptions(data){const category=$('category').value||initial.get('category')||'',ratio=$('ratio').value||initial.get('ratio')||'';lastCategories=data.categories||lastCategories;lastRatios=data.ratios||lastRatios;syncSelect('category','All categories',lastCategories,category);syncSelect('ratio','All ratios',lastRatios,ratio);renderCategoryChips(lastCategories);}
function syncUrl(){const p=new URLSearchParams(),q=$('search').value.trim(),category=$('category').value,ratio=$('ratio').value;if(kind!=='all')p.set('kind',kind);if(category)p.set('category',category);if(ratio)p.set('ratio',ratio);if(q)p.set('q',q);history.replaceState(null,'',location.pathname+(p.size?'?'+p.toString():''));}
function params(offset){const p=new URLSearchParams({kind,limit:String(PAGE_SIZE),offset:String(offset)}),q=$('search').value.trim(),category=$('category').value||initial.get('category')||'',ratio=$('ratio').value||initial.get('ratio')||'';if(q)p.set('q',q);if(category)p.set('category',category);if(ratio)p.set('ratio',ratio);return p;}
async function load({append=false}={}){if(append&&loading)return;activeRequest?.abort();const request=new AbortController();activeRequest=request;loading=true;const offset=append&&Number.isInteger(nextOffset)?nextOffset:0;$('loadMore').disabled=true;if(!append)$('status').textContent='Loading inspiration…';try{const r=await fetch('/api/inspiration?'+params(offset),{cache:'no-store',signal:request.signal}),d=await r.json().catch(()=>({}));if(activeRequest!==request)return;if(!r.ok)throw Error(d.error||'INSPIRATION_UNAVAILABLE');syncFilterOptions(d);const root=$('gallery');if(!append)root.replaceChildren();for(const item of d.items||[])root.append(card(item));observeGalleryVideos();if(!root.childElementCount){const e=document.createElement('div');e.className='empty';e.textContent='No owner-approved inspiration matches these filters yet.';root.append(e);}nextOffset=d.pagination?.hasMore?Number(d.pagination.nextOffset):null;$('loadMore').hidden=!Number.isInteger(nextOffset);$('loadMore').disabled=false;const visible=root.querySelectorAll('.card').length;$('status').textContent=visible+' inspiration item'+(visible===1?'':'s')+(nextOffset!==null?' shown — more available.':'.');syncUrl();initial.delete('category');initial.delete('ratio');initial.delete('q');}catch(e){if(activeRequest!==request)return;if(!append)$('gallery').replaceChildren();$('status').textContent=e.message==='INSPIRATION_NOT_ENABLED'?'Inspiration is not published yet.':'Inspiration is temporarily unavailable.';$('loadMore').hidden=true;}finally{if(activeRequest===request){loading=false;activeRequest=null;$('loadMore').disabled=false;}}}
function resetAndLoad(){nextOffset=null;void load();}
for(const b of document.querySelectorAll('[data-kind]')){b.setAttribute('aria-pressed',String(b.dataset.kind===kind));b.onclick=()=>{kind=b.dataset.kind;document.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));resetAndLoad();};}
$('search').value=(initial.get('q')||'').slice(0,80);$('category').onchange=resetAndLoad;$('ratio').onchange=resetAndLoad;$('search').oninput=()=>{clearTimeout(timer);timer=setTimeout(resetAndLoad,220);};$('loadMore').onclick=()=>void load({append:true});load();
