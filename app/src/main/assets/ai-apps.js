import {templateSupport,prepareTemplatePrompt} from './ai-template-product-name.js';
import {renderHomeInspiration,mergeOwnerVideoInspiration} from './home-inspiration.js';
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
  const eligibility=templateSupport(item);
  let nameInput=null;
  if(eligibility.supported&&eligibility.requiresProductName){
   const label=document.createElement('label');label.className='product-name-field';
   const caption=document.createElement('span');caption.textContent='Product name';
   nameInput=document.createElement('input');nameInput.type='text';nameInput.maxLength=80;
   nameInput.autocomplete='off';nameInput.placeholder='Name of your product';
   label.append(caption,nameInput);body.append(h,label);
  }else body.append(h);
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
  body.append(templatePreview(item),button,feedback);card.append(visual,body);root.append(card);
 }
}
async function load(){
 $('status').textContent='Loading active templates…';
 $('apps').replaceChildren();
 try{
  const response=await fetch('/api/templates',{cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('TEMPLATES_UNAVAILABLE');
  all=Array.isArray(data.items)?data.items.filter(item=>item.generationType!=='product_video'&&!item.thumbnail?.includes('logo')):[]
  shownLimit=PAGE_SIZE;render();
 }catch(_){
  $('status').textContent='Active templates are temporarily unavailable. No generation was started.';
  $('apps').replaceChildren();
  empty('Please try again later, or use Studio without a template.',{retry:true});
 }
}
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


async function loadInspirationPreview(){
 try{
  const r=await fetch('/api/inspiration?limit=60',{cache:'no-store'});
  const feed=await r.json().catch(()=>({}));
  if(r.ok&&Array.isArray(feed.items)&&feed.items.length){
   renderHomeInspiration(mergeOwnerVideoInspiration(feed.items));
   return;
  }
  throw Error('FALLBACK');
 }catch(_){
  try{
   const r=await fetch('media/creative/creative50-20261021/manifest.json');
   const d=await r.json();
   renderHomeInspiration(mergeOwnerVideoInspiration((d.items||[]).map(item=>({...item,actionTarget:'studio',kind:item.kind||'image'}))));
  }catch(_){renderHomeInspiration(mergeOwnerVideoInspiration());}
 }
}
void loadInspirationPreview();
