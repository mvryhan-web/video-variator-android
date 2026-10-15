import {saveStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id);
const quickCreateForm=$('quickCreateForm');
const quickCreateDropzone=$('quickCreateDropzone');
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
 $('quickCreateKind').value=starter.kind;prompt.value=starter.prompt;
 $('quickCreateStatus').textContent='Editable starter loaded. Nothing has been uploaded or generated.';
 prompt.focus();
}));

let quickReferences=[],quickPreviewUrls=[];
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
  await saveStudioHandoff({kind,prompt,files:quickReferences,source:'dashboard-quick-create'});
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
async function loadFeaturedWorkflows(){
 const section=$('featuredWorkflows'),root=$('featuredWorkflowGrid');if(!section||config?.features?.aiApps===false)return;
 try{
  const r=await fetch(base+'/api/templates?featured=true',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!Array.isArray(d.items)||!d.items.length)return;
  root.replaceChildren();for(const t of d.items.slice(0,6)){const a=document.createElement('a');a.className='featured-workflow-card';a.href='ai-apps.html';const visual=document.createElement('div');visual.className='featured-workflow-visual';if(t.thumbnail){const img=document.createElement('img');img.src=t.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';visual.append(img);}else visual.textContent=t.generationType==='image'?'✧':t.generationType==='audio'?'♫':'▷';const copy=document.createElement('div');copy.className='featured-workflow-copy';const title=document.createElement('strong');title.textContent=t.title;const desc=document.createElement('p');desc.textContent=t.description||'Open this active workflow in Deepsyq.';const meta=document.createElement('div');meta.className='featured-workflow-meta';for(const value of [t.category,String(t.generationType||'').replace('_',' ')].filter(Boolean)){const span=document.createElement('span');span.textContent=value;meta.append(span);}copy.append(title,desc,meta);a.append(visual,copy);root.append(a);}section.hidden=false;
 }catch(_){section.hidden=true;}
}

function applyPlatformFeatures(){for(const el of document.querySelectorAll('[data-feature]')){const key=el.dataset.feature;if(config?.features&&config.features[key]===false)el.hidden=true;}}
function renderPlans(){const descriptions={basic:'For occasional video projects.',pro:'For a regular creator workflow.',business:'For a high-volume video workflow.'};$('plans').replaceChildren();for(const key of ['basic','pro','business']){const p=config.plans?.[key];if(!p)continue;const card=document.createElement('article');card.className='plan';const heading=document.createElement('h3');heading.textContent=key[0].toUpperCase()+key.slice(1);const price=document.createElement('div');price.className='price';price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(p.price);const period=document.createElement('small');period.textContent=' / month';price.append(period);const desc=document.createElement('p');desc.textContent=descriptions[key];const usage=document.createElement('p');usage.textContent=`${Number(p.limit).toLocaleString('en-US')} video credits per month. Existing tool access applies.`;const b=document.createElement('button');b.textContent='Choose '+heading.textContent;b.onclick=()=>checkout(key);card.append(heading,price,desc,usage,b);$('plans').append(card);}const p=config.plans?.lifetime;if(p){$('lifetimePrice').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency||'EUR',maximumFractionDigits:0}).format(p.price)+' · one payment';$('lifetimeCheckout').disabled=false;$('lifetimeCheckout').onclick=()=>checkout('lifetime');}}
try{config=await api('/api/config');applyPlatformFeatures();renderPlans();initGoogle();await loadFeaturedWorkflows();}catch(_){$('paymentStatus').textContent='Plans could not load. Please try again later.';}
window.addEventListener('load',initGoogle);
try{const c=await api('/api/studio/config');$('studioStatus').textContent=c.ownerOnly?'AI generation is in owner preview. Explore the studios; existing tools remain available.':c.enabled?'Open a studio to see the available models.':'AI generation is not available yet. Existing tools remain available.';}catch(_){$('studioStatus').textContent='Studio availability could not be checked. Existing tools remain available.';}
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

if(localStorage.getItem('vv_token'))try{const {user}=await api('/api/me');$('accountLabel').textContent=user.name||'Your workspace';$('accountButton').textContent='Account settings';$('accountButton').onclick=()=>location.assign('index.html#profile');$('logout').hidden=false;if(user.isAdmin&&!document.getElementById('adminAiControl')){const a=document.createElement('a');a.id='adminAiControl';a.href='deepsyq-admin.html';a.textContent='Owner AI Control';document.querySelector('.sidebar-bottom').prepend(a);}await Promise.all([maybeShowOnboarding(),loadAIWallet()]);}catch(e){if(e.message==='INVALID_SESSION'||e.message==='USER_NOT_FOUND'){localStorage.removeItem('vv_token');localStorage.removeItem('deepsyq_onboarding_pending');}}
if(new URLSearchParams(location.search).get('checkout')==='success')$('paymentStatus').textContent='Your checkout has returned. Access is updated only after Stripe confirms payment. Open your account to see its current status.';
