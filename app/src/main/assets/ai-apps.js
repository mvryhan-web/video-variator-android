import {templateSupport,prepareTemplatePrompt} from './ai-template-product-name.js';
const $=id=>document.getElementById(id);
const PAGE_SIZE=12;
let all=[],shownLimit=PAGE_SIZE;

function supported(template){return templateSupport(template).supported;}
function inputHint(template){
 const info=templateSupport(template);
 if(!info.supported)return info.reason;
 if(template.requiredInputTypes?.includes?.('image'))return 'Add your own reference images in Studio. Images are not attached automatically.';
 return '';
}
function destination(template){
 return template.generationType==='image'?'image':template.generationType==='audio'?'audio':'video';
}
function templateKind(template){
 return template.generationType;
}
function useTemplate(template,productName='',feedback=null){
 if(!supported(template))return;
 let prompt;
 try{prompt=prepareTemplatePrompt(template,productName);}catch(error){if(feedback)feedback.textContent=error.message;return;}
 if(feedback)feedback.textContent='';
 const payload={
  id:template.id,title:template.title,generationType:template.generationType,
  promptTemplate:prompt,defaultModel:template.defaultModel||null,
  requiredInputTypes:Array.isArray(template.requiredInputTypes)?template.requiredInputTypes:[],
  defaultSettings:template.defaultSettings&&typeof template.defaultSettings==='object'&&!Array.isArray(template.defaultSettings)?template.defaultSettings:{}
 };
 try{
  sessionStorage.setItem('deepsyq_template_start',JSON.stringify(payload));
 }catch(_){
  if(feedback)feedback.textContent='This browser could not save the prepared template. Please check storage permissions.';
  else $('status').textContent='Your browser could not prepare this template. Check your storage permissions and try again.';
  return;
 }
 location.assign('generate-studio.html?studio='+destination(template)+'&from=template');
}
function templatePreview(template){
 const details=document.createElement('details');
 details.className='template-preview';
 const summary=document.createElement('summary');summary.textContent='Preview workflow';
 const content=document.createElement('div');content.className='template-preview-content';
 const label=(title,value)=>{
  const group=document.createElement('div');group.className='template-preview-row';
  const heading=document.createElement('strong');heading.textContent=title;
  const text=document.createElement('span');text.textContent=String(value);
  group.append(heading,text);content.append(group);
 };
 label('Create',String(template.generationType||'').replace('_',' ')||'Not specified');
 const inputs=Array.isArray(template.requiredInputTypes)?template.requiredInputTypes:[];
 label('Required inputs',inputs.length?inputs.map(x=>String(x).replaceAll('_',' ')).join(', '):'Text prompt');
 if(typeof template.defaultModel==='string'&&template.defaultModel.trim())label('Preferred model',template.defaultModel);
 const settings=template.defaultSettings&&typeof template.defaultSettings==='object'&&!Array.isArray(template.defaultSettings)?template.defaultSettings:{};
 for(const [key,title] of [['ratio','Aspect ratio'],['durationSeconds','Duration (seconds)'],['quality','Quality'],['outputFormat','Output format']]){
  if(typeof settings[key]==='string'||typeof settings[key]==='number')label(title,String(settings[key]).slice(0,60));
 }
 const promptLabel=document.createElement('strong');promptLabel.textContent='Original template prompt';
 const prompt=document.createElement('pre');prompt.textContent=String(template.promptTemplate||'');
 prompt.className='template-preview-prompt';
 content.append(promptLabel,prompt);
 const note=document.createElement('p');note.textContent='Preview only. A model or format shown here is a template preference, not proof that it is enabled. Use template to review in Studio before any paid generation.';
 content.append(note);details.append(summary,content);
 return details;
}
function empty(message,{retry=false}={}){
 const box=document.createElement('div');
 box.className='empty';
 const p=document.createElement('p');p.textContent=message;
 const a=document.createElement('a');a.href='generate-studio.html?studio=image';a.textContent='Open Image Studio ↗';
 box.append(p);
 if(retry){
  const again=document.createElement('button');again.type='button';again.className='retry-templates';
  again.textContent='Retry loading templates';
  again.addEventListener('click',()=>{again.disabled=true;load();});
  box.append(again);
 }
 box.append(a);

 $('apps').append(box);
}
function render(){
 const items=all; // Owner: show the live catalog directly, without an unused filters block.
 const root=$('apps');root.replaceChildren();
 const visible=items.slice(0,shownLimit),more=$('loadMore');
 more.hidden=items.length<=shownLimit;
 more.textContent='Load more templates ('+(items.length-visible.length)+' remaining)';
 if(!all.length){
  $('status').textContent='No active AI Apps templates are published yet.';
  empty('Browse Studio while new workflows are being prepared. No templates or results are being invented.',{});
  return;
 }
 $('status').textContent=items.length>shownLimit?
  'Showing '+visible.length+' of '+items.length+' active templates.':
  items.length+' of '+all.length+' active template'+(all.length===1?'':'s')+' shown.';
 if(!items.length){
  empty('No active templates are available. You can open Studio directly.');
  return;
 }
 for(const item of visible){
  const card=document.createElement('article');card.className='app-card';
  const visual=document.createElement('div');visual.className='app-thumb';
  if(item.thumbnail){
   const img=document.createElement('img');img.src=item.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
   img.onerror=()=>{img.remove();visual.textContent=templateKind(item)==='image'?'✧':templateKind(item)==='audio'?'♫':'▷';};
   visual.append(img);
  }else visual.textContent=templateKind(item)==='image'?'✧':templateKind(item)==='audio'?'♫':'▷';
  const body=document.createElement('div');body.className='app-body';
  const h=document.createElement('h3');h.textContent=item.title||'Untitled workflow';
  const p=document.createElement('p');p.textContent=item.description||'Open this workflow with its saved prompt and settings.';
  const meta=document.createElement('div');meta.className='app-meta';
  for(const value of [item.category,String(item.generationType||'').replace('_',' '),...(Array.isArray(item.requiredInputTypes)?item.requiredInputTypes:[]).slice(0,3)]){
   if(!value)continue;
   const span=document.createElement('span');span.textContent=value;meta.append(span);
  }
  const eligibility=templateSupport(item);
  let nameInput=null;
  if(eligibility.supported&&eligibility.requiresProductName){
   const label=document.createElement('label');label.className='product-name-field';
   const caption=document.createElement('span');caption.textContent='Product name';
   nameInput=document.createElement('input');nameInput.type='text';nameInput.maxLength=80;
   nameInput.autocomplete='off';nameInput.placeholder='Name of your product';
   label.append(caption,nameInput);body.append(h,p,label);
  }else body.append(h,p);
  const button=document.createElement('button');button.type='button';
  button.textContent=eligibility.supported?'Use template':'Workflow pending';button.disabled=!eligibility.supported;
  const feedback=document.createElement('p');feedback.className='template-error';feedback.setAttribute('role','status');
  button.addEventListener('click',()=>{
   const name=nameInput?.value||'';
   if(nameInput&&!name.trim()){feedback.textContent='Enter your product name before opening Studio.';nameInput.focus();return;}
   useTemplate(item,name,feedback);
  });
  const hint=inputHint(item);
  if(hint){const note=document.createElement('p');note.className='input-hint';note.textContent=hint;body.append(note);}
  body.append(meta,templatePreview(item),button,feedback);card.append(visual,body);root.append(card);
 }
}
async function load(){
 status.textContent='Loading active templates...';
 apps.replaceChildren();
 try{
  const response=await fetch('/api/templates',{cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('TEMPLATES_UNAVAILABLE');
  all=Array.isArray(data.items)?data.items.filter(item=>item.generationType!=='product_video'&&!item.thumbnail?.includes('logo')):[];
  if(!all.length)throw Error('EMPTY');
  shownLimit=PAGE_SIZE;render();
 }catch(_){
  try{
   const r=await fetch('media/creative/creative50-20261021/manifest.json');
   const m=await r.json();
   all=(m.items||[]).map(item=>({
    id:item.id||item.slug,title:item.title,description:item.description,category:item.category||'Creative',
    generationType:item.kind||'image',thumbnail:item.previewUrl||item.previewPosterUrl,promptTemplate:item.prompt,
    defaultModel:null,defaultSettings:item.defaultSettings||{},requiredInputTypes:item.requiredInputTypes||[],
    featured:true,active:true
   }));
   shownLimit=PAGE_SIZE;render();
  }catch(__){
   status.textContent='Active templates are temporarily unavailable.';
   apps.replaceChildren();
   empty('Please try again later, or use Studio without a template.',{retry:true});
  }
 }
}

async function loadInspirationInAiApps(){
 const grid = inspirationPreviewGrid;
 if (!grid) return;
 let items = [];
 try {
  const r = await fetch('/api/inspiration?limit=60',{cache:'no-store'});
  const d = await r.json().catch(()=>({}));
  if(r.ok && Array.isArray(d.items) && d.items.length) items = d.items;
  else throw Error();
 } catch {
  try {
   const m1 = await fetch('media/creative/creative50-20261021/manifest.json').then(r=>r.json()).catch(()=>({items:[]}));
   const m2 = await fetch('media/inspiration/owner-20261031/manifest.json').then(r=>r.json()).catch(()=>({items:[]}));
   items = [...(m1.items||[]), ...(m2.items||[])];
  } catch {}
 }
 function renderGrid(kind='all'){
  grid.replaceChildren();
  const filtered = items.filter(it => kind==='all' || it.kind===kind);
  for(const it of filtered){
   const card = document.createElement('article');
   card.className = 'inspiration-card';
   const mediaWrap = document.createElement('div');
   mediaWrap.className = 'inspiration-card-media';
   if(it.kind === 'video' && it.previewUrl?.endsWith('.mp4')){
    const v = document.createElement('video');
    v.src = it.previewUrl;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    if(it.previewPosterUrl) v.poster = it.previewPosterUrl;
    mediaWrap.onpointerenter = () => v.play().catch(()=>{});
    mediaWrap.onpointerleave = () => v.pause();
    mediaWrap.append(v);
   } else {
    const img = document.createElement('img');
    img.src = it.previewUrl || it.previewPosterUrl || it.thumbnail;
    img.alt = it.title || 'Inspiration';
    img.loading = 'lazy';
    mediaWrap.append(img);
   }
   const info = document.createElement('div');
   info.className = 'inspiration-card-info';
   const h4 = document.createElement('h4');
   h4.textContent = it.title || 'Untitled';
   const p = document.createElement('p');
   p.textContent = it.prompt || it.description || '';
   info.append(h4, p);
   card.append(mediaWrap, info);
   card.onclick = () => {
    const mode = it.kind === 'video' ? 'video' : 'image';
    location.assign('generate-studio.html?studio=' + mode + '&from=inspiration');
   };
   grid.append(card);
  }
 }
 renderGrid('all');
 document.querySelectorAll('#inspirationPreview button[data-inspiration-kind]').forEach(btn => {
  btn.onclick = () => {
   document.querySelectorAll('#inspirationPreview button[data-inspiration-kind]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
   renderGrid(btn.dataset.inspirationKind);
  };
 });
}
setTimeout(loadInspirationInAiApps, 50);
$('loadMore').addEventListener('click',()=>{
 shownLimit+=PAGE_SIZE;
 render();
});
// Existing account and billing are managed in Video Uniquifier's Profile & Settings.
// Only clear the shared account token; never invent a second billing/logout service.
const accountLogout=$('appsLogout');
if(accountLogout){
 accountLogout.hidden=!localStorage.getItem('vv_token');
 accountLogout.addEventListener('click',()=>{
  // Remove locally prepared product prompts when exiting this AI Apps account.
  // Denied tab storage must not block existing bearer-token logout.
  try{sessionStorage.removeItem('deepsyq_template_start');}catch(_){}
  localStorage.removeItem('vv_token');
  location.assign('deepsyq.html');
 });
}
load();
