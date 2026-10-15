import {saveStudioHandoff} from './studio-handoff.js';
import {MODEL_CATALOG} from './generate-models.js';
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
// Small session-only Canvas draft: never stores uploaded files or sends drafts to the server.
const QUICK_DRAFT_KEY='deepsyq_quick_canvas_draft_v1';
function saveQuickDraft(){
 const draft={prompt:$('quickCreatePrompt').value.slice(0,2000),kind:$('quickCreateKind').value,ratio:$('quickCreateRatio').value};
 try{sessionStorage.setItem(QUICK_DRAFT_KEY,JSON.stringify(draft));}catch(_){/* Browsers may deny storage; creation still works. */}
}
function restoreQuickDraft(){
 try{
  const draft=JSON.parse(sessionStorage.getItem(QUICK_DRAFT_KEY)||'null');
  if(!draft||typeof draft.prompt!=='string'||!['image','video'].includes(draft.kind)){populateQuickRatios();return;}
  $('quickCreatePrompt').value=draft.prompt.slice(0,2000);
  $('quickCreateKind').value=draft.kind;
  populateQuickRatios(typeof draft.ratio==='string'?draft.ratio:'');
 }catch(_){populateQuickRatios();/* Ignore corrupt or inaccessible session data. */}
}
restoreQuickDraft();
$('quickCreatePrompt').addEventListener('input',saveQuickDraft);
$('quickCreateKind').addEventListener('change',()=>{populateQuickRatios();saveQuickDraft();});
$('quickCreateRatio').addEventListener('change',saveQuickDraft);
$('quickCreateClear').addEventListener('click',()=>{
 const hasDraft=!!$('quickCreatePrompt').value.trim()||quickReferences.length>0;
 if(hasDraft&&!confirm('Clear this Canvas draft and remove its selected reference photos?'))return;
 $('quickCreatePrompt').value='';$('quickCreateKind').value='image';populateQuickRatios();
 quickReferences=[];$('quickCreateFiles').value='';renderQuickReferences();
 try{sessionStorage.removeItem(QUICK_DRAFT_KEY);}catch(_){}
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
function setQuickReferences(files,{append=false}={}){
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
 const prompt=$('quickCreatePrompt').value.trim(),kind=$('quickCreateKind').value;
 const status=$('quickCreateStatus'),button=$('quickCreateSubmit');
 if(!prompt||prompt.length>2000||!['image','video'].includes(kind)){status.textContent='Enter a description (up to 2,000 characters).';return;}
 button.disabled=true;status.textContent='Preparing your Studio draft locally…';
 try{
  const ratio=$('quickCreateRatio').value;
  await saveStudioHandoff({kind,prompt,settings:ratio?{ratio}:{},files:quickReferences,source:'dashboard-quick-create'});
  location.assign('generate-studio.html?studio='+kind+'&from=dashboard');
 }catch(_){
  status.textContent='This browser could not save the draft. Your text and references are still here; try again or open Studio directly.';
  button.disabled=false;
 }
});
let base='';try{base=window.AndroidBridge?.getApiBase?.()||'';}catch(_){}base=String(base||window.VV_API_BASE||location.origin).replace(/\/$/,'');
async function api(path,options={}){const token=localStorage.getItem('vv_token');const r=await fetch(base+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}});const d=await r.json();if(!r.ok)throw Error(d.error||'REQUEST_FAILED');return d;}
const mobileMenu=matchMedia('(max-width:760px)');
function syncMenu(){$('sidebar').inert=mobileMenu.matches&&!document.body.classList.contains('menu-open');}
mobileMenu.addEventListener('change',syncMenu);syncMenu();
$('menu').onclick=()=>{const open=document.body.classList.toggle('menu-open');$('menu').setAttribute('aria-expanded',String(open));syncMenu();};
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('menu-open');$('menu').setAttribute('aria-expanded','false');syncMenu();}));
let authOpener;function openAuth(){if(window.AndroidBridge){location.assign('index.html#signin');return;}authOpener=document.activeElement;$('authModal').hidden=false;setTimeout(()=>$('emailAuthEmail')?.focus(),0);initGoogle();}function closeAuth(){$('authModal').hidden=true;authOpener?.focus();}
$('accountButton').onclick=openAuth;document.querySelectorAll('[data-close-auth]').forEach(b=>b.onclick=closeAuth);
document.addEventListener('keydown',e=>{if($('authModal').hidden)return;if(e.key==='Escape')closeAuth();if(e.key==='Tab'){const items=[...$('authModal').querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(e=>e.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
$('logout').onclick=()=>{localStorage.removeItem('vv_token');sessionStorage.removeItem('vu_generation_job');location.reload();};
let config;let googleReady=false;
function initGoogle(){if(googleReady||!config)return;if(!config.googleClientId){$('googleButton').textContent='Google sign-in is currently unavailable. Use email below.';return;}if(!window.google?.accounts?.id)return;googleReady=true;google.accounts.id.initialize({client_id:config.googleClientId,callback:async({credential})=>{try{const d=await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential})});localStorage.setItem('vv_token',d.token);if(d.newAccount===true)localStorage.setItem('deepsyq_onboarding_pending','1');location.reload();}catch(_){$('paymentStatus').textContent='Sign-in could not complete. Please try again.';}}});$('googleButton').replaceChildren();google.accounts.id.renderButton($('googleButton'),{theme:'outline',size:'large',width:280,text:'continue_with'});}
let pending=false;
async function checkout(plan){if(pending)return;if(!localStorage.getItem('vv_token')){openAuth();return;}pending=true;$('paymentStatus').textContent='Opening secure checkout…';try{const d=await api('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})});const u=new URL(d.url);if(u.protocol!=='https:'||!['checkout.stripe.com','buy.stripe.com'].includes(u.hostname))throw Error('INVALID_CHECKOUT');location.assign(u.href);}catch(e){$('paymentStatus').textContent=({AUTH_REQUIRED:'Please sign in to continue.',INVALID_SESSION:'Please sign in again.',ADMIN_ACCESS_ALREADY_UNLIMITED:'Your administrator account already has tool access.',LIFETIME_ALREADY_ACTIVE:'Lifetime is already active on this account.'})[e.message]||'Checkout is currently unavailable. No payment was taken.';if(e.message==='INVALID_SESSION')openAuth();}finally{pending=false;}}
async function loadInspirationPreview(){
 const section=$('inspirationPreview'),root=$('inspirationPreviewGrid'),agentSection=$('agentExamples'),agentRoot=$('agentExamplesGrid');if(!section||config?.features?.inspiration===false)return;
 try{const r=await fetch(base+'/api/inspiration?featured=true&limit=6',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!Array.isArray(d.items))return;const studio=d.items.filter(x=>x.actionTarget==='studio').slice(0,6);root.replaceChildren();for(const item of studio){const a=document.createElement('a');a.className='inspiration-preview-card';a.href='inspiration.html?kind='+encodeURIComponent(item.kind||'all')+'&category='+encodeURIComponent(item.category||'')+'&ratio='+encodeURIComponent(item.aspectRatio||'')+'&q='+encodeURIComponent(item.title||'');const visual=document.createElement('div');visual.className='inspiration-preview-media';if(item.kind==='video'){if(item.previewPosterUrl){const img=document.createElement('img');img.src=item.previewPosterUrl;img.alt='';img.loading='lazy';visual.append(img);}else visual.textContent='▷';}else{const img=document.createElement('img');img.src=item.previewUrl;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';visual.append(img);}const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;const meta=document.createElement('span');meta.textContent=[item.kind,item.category,item.aspectRatio].filter(Boolean).join(' · ');copy.append(title,meta);a.append(visual,copy);root.append(a);}section.hidden=!studio.length;const ar=await fetch(base+'/api/inspiration?featured=true&target=agent&limit=3',{cache:'no-store'}),ad=await ar.json().catch(()=>({}));const agents=ar.ok&&Array.isArray(ad.items)?ad.items:[];agentRoot.replaceChildren();for(const item of agents){const card=document.createElement(item.actionPath?'a':'article');card.className='inspiration-preview-card agent-example';if(item.actionPath){card.href=item.actionPath+'?from=inspiration';card.onclick=()=>sessionStorage.setItem('deepsyq_agent_inspiration_start',JSON.stringify({id:item.id,title:item.title,generationType:item.kind,promptTemplate:item.prompt||'',defaultModel:item.defaultModel||null,requiredInputTypes:Array.isArray(item.requiredInputTypes)?item.requiredInputTypes:[],defaultSettings:{...(item.defaultSettings||{}),ratio:item.aspectRatio},source:'inspiration',action:'create'}));}const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;const desc=document.createElement('span');desc.textContent=item.description||item.prompt;copy.append(title,desc);card.append(copy);agentRoot.append(card);}agentSection.hidden=!agents.length;}catch(_){section.hidden=true;agentSection.hidden=true;}
}

async function loadFeaturedWorkflows(){
 const section=$('featuredWorkflows'),root=$('featuredWorkflowGrid');if(!section||config?.features?.aiApps===false)return;
 try{
  const r=await fetch(base+'/api/templates?featured=true',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!Array.isArray(d.items)||!d.items.length)return;
  root.replaceChildren();for(const t of d.items.slice(0,6)){const a=document.createElement('a');a.className='featured-workflow-card';a.href='ai-apps.html';const visual=document.createElement('div');visual.className='featured-workflow-visual';if(t.thumbnail){const img=document.createElement('img');img.src=t.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';visual.append(img);}else visual.textContent=t.generationType==='image'?'✧':t.generationType==='audio'?'♫':'▷';const copy=document.createElement('div');copy.className='featured-workflow-copy';const title=document.createElement('strong');title.textContent=t.title;const desc=document.createElement('p');desc.textContent=t.description||'Open this active workflow in Deepsyq.';const meta=document.createElement('div');meta.className='featured-workflow-meta';for(const value of [t.category,String(t.generationType||'').replace('_',' ')].filter(Boolean)){const span=document.createElement('span');span.textContent=value;meta.append(span);}copy.append(title,desc,meta);a.append(visual,copy);root.append(a);}section.hidden=false;
 }catch(_){section.hidden=true;}
}

function applyPlatformFeatures(){for(const el of document.querySelectorAll('[data-feature]')){const key=el.dataset.feature;if(config?.features&&config.features[key]===false)el.hidden=true;}}
function renderPlans(){const descriptions={basic:'For occasional video projects.',pro:'For a regular creator workflow.',business:'For a high-volume video workflow.'};$('plans').replaceChildren();for(const key of ['basic','pro','business']){const p=config.plans?.[key];if(!p)continue;const card=document.createElement('article');card.className='plan';const heading=document.createElement('h3');heading.textContent=key[0].toUpperCase()+key.slice(1);const price=document.createElement('div');price.className='price';price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(p.price);const period=document.createElement('small');period.textContent=' / month';price.append(period);const desc=document.createElement('p');desc.textContent=descriptions[key];const usage=document.createElement('p');usage.textContent=`${Number(p.limit).toLocaleString('en-US')} video credits per month. Existing tool access applies.`;const b=document.createElement('button');b.textContent='Choose '+heading.textContent;b.onclick=()=>checkout(key);card.append(heading,price,desc,usage,b);$('plans').append(card);}const p=config.plans?.lifetime;if(p){$('lifetimePrice').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency||'EUR',maximumFractionDigits:0}).format(p.price)+' · one payment';$('lifetimeCheckout').disabled=false;$('lifetimeCheckout').onclick=()=>checkout('lifetime');}}
try{config=await api('/api/config');applyPlatformFeatures();renderPlans();initGoogle();await Promise.all([loadFeaturedWorkflows(),loadInspirationPreview()]);}catch(_){$('paymentStatus').textContent='Plans could not load. Please try again later.';}
window.addEventListener('load',initGoogle);
try{const c=await api('/api/studio/config');$('studioStatus').textContent=c.ownerOnly?'AI generation is in owner preview. Explore the studios; existing tools remain available.':c.enabled?'Open a studio to see the available models.':'AI generation is not available yet. Existing tools remain available.';}catch(_){$('studioStatus').textContent='Studio availability could not be checked. Existing tools remain available.';}
// Read-only dashboard overview: reuses the existing authenticated Studio history.
// Never embeds media blobs, starts jobs, or exposes another user's results.
async function loadRecentCreations(){
 const status=$('recentCreationsStatus'),grid=$('recentCreationsGrid');if(!status||!grid)return;
 grid.replaceChildren();
 if(!localStorage.getItem('vv_token')){status.textContent='Sign in to see your saved Studio creations.';return;}
 status.textContent='Loading your recent creations…';
 try{
  const response=await api('/api/studio/jobs?filter=all'),items=Array.isArray(response.items)?response.items.slice(0,4):[];
  if(!items.length){status.textContent='No saved creations yet. Start with Canvas or a Studio.';return;}
  const label={ready:'Ready',queued:'Queued',processing:'Processing',finalizing:'Finalizing',failed:'Failed'};
  for(const item of items){
   if(!item||!['image','video','music'].includes(item.kind))continue;
   const card=document.createElement('a');card.className='recent-creation';card.href='generate-studio.html?view=history';
   const head=document.createElement('div'),type=document.createElement('strong'),state=document.createElement('span');
   type.textContent=item.kind==='music'?'Audio':item.kind==='image'?'Image':'Video';
   state.textContent=label[item.status]||'In progress';state.dataset.status=String(item.status||'unknown');head.append(type,state);
   const prompt=document.createElement('p');prompt.textContent=String(item.prompt||'Untitled creation').slice(0,140);
   const date=document.createElement('small');const timestamp=new Date(item.createdAt||'');
   date.textContent=Number.isFinite(timestamp.getTime())?timestamp.toLocaleDateString():'Open in Studio';
   card.append(head,prompt,date);grid.append(card);
  }
  status.textContent=grid.childElementCount?'Select a creation to open your Studio history.':'No saved creations yet.';
 }catch(_){status.textContent='Studio history is not available for this account right now.';}
}
async function loadAIWallet(){
 const chip=$('aiWalletLink');if(!chip)return;
 if(!localStorage.getItem('vv_token')){chip.hidden=true;return;}
 try{
  const [billing,welcome]=await Promise.all([api('/api/ai-billing/config').catch(()=>({enabled:false})),api('/api/ai-wallet/config').catch(()=>({welcomeEnabled:false}))]);if(!billing.enabled&&!welcome.welcomeEnabled){chip.hidden=true;return;}
  const balance=await api('/api/ai-wallet/balance');const available=Number(balance.available||0),reserved=Number(balance.reserved||0),debt=Number(balance.debt||0);
  $('aiWalletAvailable').textContent=available.toLocaleString();$('aiWalletHeld').textContent=debt>0?`${debt.toLocaleString()} debt`:reserved>0?`${reserved.toLocaleString()} held`:'available';chip.dataset.debt=String(debt>0);chip.hidden=false;
 }catch(_){chip.hidden=true;}
}

async function maybeShowOnboarding(){
 if(config?.features?.onboarding===false)return;
 if(localStorage.getItem('deepsyq_onboarding_pending')!=='1'||!localStorage.getItem('vv_token'))return;
 try{
  const state=await api('/api/onboarding');if(state.completed){localStorage.removeItem('deepsyq_onboarding_pending');return;}
  const modal=$('onboardingModal');modal.hidden=false;setTimeout(()=>$('onboardingModal').querySelector('[data-onboarding-goal]')?.focus(),0);
 }catch(_){/* Keep pending marker so setup can be retried later. */}
}
function closeOnboarding(){const modal=$('onboardingModal');if(modal)modal.hidden=true;}
document.querySelectorAll('[data-close-onboarding]').forEach(b=>b.onclick=()=>{localStorage.removeItem('deepsyq_onboarding_pending');closeOnboarding();});
$('onboardingLater').onclick=()=>{localStorage.removeItem('deepsyq_onboarding_pending');closeOnboarding();};
document.querySelectorAll('[data-onboarding-goal]').forEach(button=>button.onclick=async()=>{
 const status=$('onboardingStatus'),buttons=[...document.querySelectorAll('[data-onboarding-goal]')];buttons.forEach(b=>b.disabled=true);status.textContent='Saving your starting point…';
 try{const d=await api('/api/onboarding',{method:'POST',body:JSON.stringify({goal:button.dataset.onboardingGoal})});localStorage.removeItem('deepsyq_onboarding_pending');location.assign(d.target);}
 catch(e){status.textContent=e.message==='ONBOARDING_UNAVAILABLE'?'Onboarding is temporarily unavailable. You can still use the studios from the dashboard.':'Could not save your choice. Please try again.';buttons.forEach(b=>b.disabled=false);}
});

if(localStorage.getItem('vv_token'))try{const {user}=await api('/api/me');$('accountLabel').textContent=user.name||'Your workspace';$('accountButton').textContent='Account settings';$('accountButton').onclick=()=>location.assign('index.html#profile');$('logout').hidden=false;if(user.isAdmin&&!document.getElementById('adminAiControl')){const a=document.createElement('a');a.id='adminAiControl';a.href='deepsyq-admin.html';a.textContent='Owner AI Control';document.querySelector('.sidebar-bottom').prepend(a);}await Promise.all([maybeShowOnboarding(),loadAIWallet(),loadRecentCreations()]);}catch(e){if(e.message==='INVALID_SESSION'||e.message==='USER_NOT_FOUND'){localStorage.removeItem('vv_token');localStorage.removeItem('deepsyq_onboarding_pending');}}
if(new URLSearchParams(location.search).get('checkout')==='success')$('paymentStatus').textContent='Your checkout has returned. Access is updated only after Stripe confirms payment. Open your account to see its current status.';
