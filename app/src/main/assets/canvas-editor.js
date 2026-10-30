import {MODEL_CATALOG} from './generate-models.js';
import {saveStudioHandoff} from './studio-handoff.js';
import {CREATIVE_EXAMPLES} from './home-creative-examples.js';
const $=id=>document.getElementById(id);
const quickCreateForm=$('quickCreateForm');
const quickCreateDropzone=$('quickCreateDropzone');
// Offer only ratios advertised by at least one model of this type.
// The chosen model in Studio remains authoritative and validates the preference.
function allowedQuickRatios(kind){
 return [...new Set(MODEL_CATALOG.filter(model=>model.kind===kind).flatMap(model=>model.capabilities?.ratios||model.ratios||[]))];
}
function populateQuickRatios(preferred=''){
 const kind=$('quickCreateKind').value,ratios=allowedQuickRatios(kind),select=$('quickCreateRatio');
 select.replaceChildren(new Option('Let Studio decide',''),...ratios.map(ratio=>new Option(ratio,ratio)));
 select.value=ratios.includes(preferred)?preferred:'';
}
// Draft-only examples. These do not represent connected AI workflows or spend credits.
const quickPromptStarters={
 'product-image':{kind:'image',prompt:'Create a polished editorial product photograph with soft studio light and a clean background. Keep any supplied reference product accurate, including its shape, color and branding. Do not invent product features or text.'},
 'social-video':{kind:'video',prompt:'Create a short, engaging social video with clear visual storytelling, natural motion and a strong opening frame. Keep any reference subject recognizable; avoid fabricated product claims or logos.'},
 portrait:{kind:'image',prompt:'Create an elegant editorial portrait with natural skin texture, soft directional lighting and a carefully composed background. Respect any supplied reference photo and avoid unwanted text or logos.'}
};
document.querySelectorAll('[data-quick-starter]').forEach(button=>button.addEventListener('click',()=>{
 const starter=quickPromptStarters[button.dataset.quickStarter];if(!starter)return;
 const prompt=$('quickCreatePrompt'),existing=prompt.value.trim();
 if(existing&&existing!==starter.prompt&&!confirm('Replace your current description with this starter?'))return;
 $('quickCreateKind').value=starter.kind;populateQuickRatios();prompt.value=starter.prompt;
 saveQuickDraft();
 $('quickCreateStatus').textContent='Editable starter loaded. Nothing has been uploaded or generated.';
 prompt.focus();
}));

let quickReferences=[],quickPreviewUrls=[];
// Canvas drafts are local-only and private to the account that wrote them.
// Never store a bearer token (or uploaded files) in the draft key or payload.
const QUICK_DRAFT_LEGACY_KEY='deepsyq_quick_canvas_draft_v1';
const quickDraftOwner=localStorage.getItem('vv_token')||'guest';
let quickDraftEpoch=0;
const quickDraftKeyPromise=(async()=>{
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(quickDraftOwner));
  return 'deepsyq_quick_canvas_draft_v2_'+Array.from(new Uint8Array(digest).slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');
 }catch(_){return null;} // No Web Crypto: editing stays available, no unsafe fallback storage.
})();
function sameQuickDraftAccount(){return (localStorage.getItem('vv_token')||'guest')===quickDraftOwner;}
function saveQuickDraft(){
 const draft={prompt:$('quickCreatePrompt').value.slice(0,2000),kind:$('quickCreateKind').value,ratio:$('quickCreateRatio').value};
 const epoch=++quickDraftEpoch;
 void quickDraftKeyPromise.then(key=>{
  if(!key||epoch!==quickDraftEpoch||!sameQuickDraftAccount())return;
  try{sessionStorage.setItem(key,JSON.stringify(draft));}catch(_){/* Keep in-memory editor usable. */}
 });
}
// Browser session/history restoration can prefill a textarea from a DIFFERENT
// signed-in user. The hashed current-account session draft is the only trusted
// source on load or pageshow. Reset synchronously before awaiting Web Crypto.
function clearVisibleQuickDraft(){
 $('quickCreatePrompt').value='';
 $('quickCreateKind').value='image';
 populateQuickRatios();
 $('quickCreateFiles').value='';
 const quickBarPrompt=$('homeQuickPrompt');if(quickBarPrompt)quickBarPrompt.value='';
 quickReferences=[];renderQuickReferences();
}
async function restoreQuickDraft(){
 const epoch=++quickDraftEpoch;
 clearVisibleQuickDraft();
 try{sessionStorage.removeItem(QUICK_DRAFT_LEGACY_KEY);}catch(_){}
 const key=await quickDraftKeyPromise;
 if(!key||epoch!==quickDraftEpoch||!sameQuickDraftAccount()||$('quickCreatePrompt').value)return;
 try{
  const draft=JSON.parse(sessionStorage.getItem(key)||'null');
  if(!draft||typeof draft.prompt!=='string'||!['image','video'].includes(draft.kind))return;
  $('quickCreatePrompt').value=draft.prompt.slice(0,2000);
  $('quickCreateKind').value=draft.kind;
  populateQuickRatios(typeof draft.ratio==='string'?draft.ratio:'');
 }catch(_){/* Ignore corrupt or inaccessible account-scoped draft. */}
}
let exampleLoaded=false;
async function restoreCanvasPage(){
 await restoreQuickDraft();
 if(exampleLoaded)return;
 exampleLoaded=true;
 const id=new URLSearchParams(location.search).get('example');
 const item=CREATIVE_EXAMPLES.find(x=>x.placement==='canvas'&&x.id===id);
 if(item&&sameQuickDraftAccount()){
  $('quickCreatePrompt').value=String(item.prompt).slice(0,2000);
  $('quickCreateKind').value='image';
  populateQuickRatios(item.aspectRatio);
  saveQuickDraft();
  $('quickCreateStatus').textContent=item.title+' example loaded. Edit before opening Studio.';
 }
}
void restoreCanvasPage();
let firstPageShow=true;
window.addEventListener('pageshow',()=>{
 if(firstPageShow){firstPageShow=false;return;}
 void restoreQuickDraft();
});
$('quickCreatePrompt').addEventListener('input',saveQuickDraft);
$('quickCreateKind').addEventListener('change',()=>{populateQuickRatios();saveQuickDraft();});
$('quickCreateRatio').addEventListener('change',saveQuickDraft);
$('quickCreateClear').addEventListener('click',()=>{
 const hasDraft=!!$('quickCreatePrompt').value.trim()||quickReferences.length>0;
 if(hasDraft&&!confirm('Clear this Canvas draft and remove its selected reference photos?'))return;
 $('quickCreatePrompt').value='';$('quickCreateKind').value='image';populateQuickRatios();
 quickReferences=[];$('quickCreateFiles').value='';renderQuickReferences();
 ++quickDraftEpoch;
  void quickDraftKeyPromise.then(key=>{if(key&&sameQuickDraftAccount())try{sessionStorage.removeItem(key);}catch(_){}});
  try{sessionStorage.removeItem(QUICK_DRAFT_LEGACY_KEY);}catch(_){}
 $('quickCreateStatus').textContent='Canvas draft cleared. No files were uploaded.';
 $('quickCreatePrompt').focus();
});

const QUICK_MAX_FILES=4,QUICK_MAX_BYTES=1024*1024;
function renderQuickReferences(){
 for(const url of quickPreviewUrls)URL.revokeObjectURL(url);
 quickPreviewUrls=[];const previews=$('quickCreatePreviews');previews.replaceChildren();
 quickReferences.forEach((file,index)=>{
  const item=document.createElement('div');item.className='quick-reference';
  const img=document.createElement('img'),url=URL.createObjectURL(file);
  quickPreviewUrls.push(url);img.src=url;img.alt='Reference '+(index+1);
  const name=document.createElement('span');name.textContent=file.name;name.title=file.name;
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove reference '+(index+1));
  remove.onclick=()=>{quickReferences.splice(index,1);renderQuickReferences();};
  item.append(img,name,remove);previews.append(item);
 });
}
// Other-tab logout/account replacement must remove old private prompt and unsent
// reference photos from this open page, not merely from the next reload.
function guardQuickDraftAccount(){
 if(sameQuickDraftAccount())return;
 ++quickDraftEpoch;
 clearVisibleQuickDraft();
 $('quickCreateStatus').textContent='Account changed. Reload to start a private draft for this account.';
}
// Same-tab localStorage changes do NOT trigger a native storage event.
// Scrub before the next user interaction, focus return, or visibility change.
for(const type of ['pointerdown','keydown','focusin']){
 document.addEventListener(type,guardQuickDraftAccount,true);
}
window.addEventListener('focus',guardQuickDraftAccount);
document.addEventListener('visibilitychange',guardQuickDraftAccount);
window.addEventListener('storage',event=>{
 if(event.key==='vv_token')guardQuickDraftAccount();
});
function setQuickReferences(files,{append=false}={}){
 // File-change/drop need their own owner check; no pointer event is guaranteed.
 if(!sameQuickDraftAccount()){guardQuickDraftAccount();return;}
 const candidates=[...(append?quickReferences:[]),...Array.from(files||[])];
 if(candidates.length>QUICK_MAX_FILES||candidates.some(file=>!['image/png','image/jpeg'].includes(file.type)||file.size>QUICK_MAX_BYTES||file.size===0)){
  $('quickCreateStatus').textContent='Use up to 4 nonempty PNG/JPG photos, each no larger than 1 MB.';
  return;
 }
 quickReferences=candidates;renderQuickReferences();
 $('quickCreateStatus').textContent=quickReferences.length?quickReferences.length+' photo(s) prepared locally. Nothing has been uploaded.':'';
}
$('quickCreateFiles').addEventListener('change',event=>{
 setQuickReferences(event.target.files);event.target.value='';
});
quickCreateDropzone.addEventListener('dragover',event=>{event.preventDefault();quickCreateDropzone.classList.add('drag-over');});
quickCreateDropzone.addEventListener('dragleave',()=>quickCreateDropzone.classList.remove('drag-over'));
quickCreateDropzone.addEventListener('drop',event=>{
 event.preventDefault();quickCreateDropzone.classList.remove('drag-over');
 setQuickReferences(event.dataTransfer?.files,{append:true});
});
window.addEventListener('pagehide',()=>{for(const url of quickPreviewUrls)URL.revokeObjectURL(url);quickPreviewUrls=[];});
quickCreateForm?.addEventListener('submit',async event=>{
 event.preventDefault();
 // requestSubmit() bypasses the document pointer/focus/keyboard guards.
 if(!sameQuickDraftAccount()){guardQuickDraftAccount();return;}
 const prompt=$('quickCreatePrompt').value.trim(),kind=$('quickCreateKind').value;
 const status=$('quickCreateStatus'),button=$('quickCreateSubmit');
 if(!prompt||prompt.length>2000||!['image','video'].includes(kind)){status.textContent='Enter a description (up to 2,000 characters).';return;}
 button.disabled=true;status.textContent='Preparing your Studio draft locally…';
 try{
  const ratio=$('quickCreateRatio').value;
  await saveStudioHandoff({kind,prompt,settings:ratio?{ratio}:{},files:quickReferences,source:'canvas-quick-create'});
  location.assign('generate-studio.html?studio='+kind+'&from=canvas');
 }catch(_){
  status.textContent='This browser could not save the draft. Your text and references are still here; try again or open Studio directly.';
  button.disabled=false;
 }
});

document.querySelectorAll('#canvasExampleGrid [data-creative-example]').forEach(button=>{
 const item=CREATIVE_EXAMPLES.find(x=>x.placement==='canvas'&&x.id===button.dataset.creativeExample);
 button.disabled=!item;
 button.addEventListener('click',()=>{
  if(!item||!sameQuickDraftAccount()){guardQuickDraftAccount();return;}
  const prompt=$('quickCreatePrompt');
  if(prompt.value.trim()&&prompt.value!==item.prompt&&!confirm('Replace your current Canvas description with this example?'))return;
  prompt.value=String(item.prompt).slice(0,2000);
  $('quickCreateKind').value='image';populateQuickRatios(item.aspectRatio);saveQuickDraft();
  $('quickCreateStatus').textContent=item.title+' example loaded. Edit before opening Studio.';
  $('quickCreateForm').scrollIntoView({behavior:'smooth',block:'start'});prompt.focus({preventScroll:true});
 });
});
