import {renderHomeInspiration} from './home-inspiration.js';
import {renderHomeCarousel} from './home-experience.js';
import {MODEL_CATALOG} from './generate-models.js';
import {authorizedOnboardingOptions,onboardingResponseTarget} from './onboarding-options.js';
const $=id=>document.getElementById(id);
let base='';try{base=window.AndroidBridge?.getApiBase?.()||'';}catch(_){}base=String(base||window.VV_API_BASE||location.origin).replace(/\/$/,'');
async function api(path,options={}){const token=localStorage.getItem('vv_token');const r=await fetch(base+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}});const d=await r.json();if(!r.ok)throw Error(d.error||'REQUEST_FAILED');return d;}
// Deepsyq creator navigation: icon-only collapse on desktop, drawer on mobile.
const mobileMenu=matchMedia('(max-width:760px)');
const SIDEBAR_STATE_KEY='deepsyq_sidebar_collapsed_v1';
let collapsedSidebar=false;
try{collapsedSidebar=localStorage.getItem(SIDEBAR_STATE_KEY)==='1';}catch(_){}
document.body.classList.toggle('sidebar-collapsed',collapsedSidebar);
function syncMenu(){
 const mobile=mobileMenu.matches,expanded=mobile?document.body.classList.contains('menu-open'):!collapsedSidebar;
 if(!mobile)document.body.classList.remove('menu-open');
 document.body.classList.toggle('sidebar-collapsed',!mobile&&collapsedSidebar);
 $('sidebar').inert=mobile&&!expanded;
 for(const button of [$('menu')]){
  button.setAttribute('aria-expanded',String(expanded));
  button.setAttribute('aria-label',mobile?(expanded?'Close navigation':'Open navigation'):(expanded?'Collapse sidebar':'Expand sidebar'));
  button.title=button.getAttribute('aria-label');
 }
 closeModelFlyout();
}
function closeMobileDrawer(restoreFocus=false){
 if(!mobileMenu.matches||!document.body.classList.contains('menu-open'))return false;
 // A hidden inert rail must never retain keyboard focus after dismissal.
 const wasInside=$('sidebar').contains(document.activeElement);
 document.body.classList.remove('menu-open');
 syncMenu();
 if(restoreFocus||wasInside)$('menu').focus();
 return true;
}
function drawerTabStops(){
 return [...$('sidebar').querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')]
  .filter(el=>el.getClientRects().length>0&&!el.hidden&&getComputedStyle(el).visibility!=='hidden');
}
function toggleSidebar(event){
 if(mobileMenu.matches){
  // The header button is always visible; the rail button exists only inside
  // the open drawer. Return keyboard focus to the visible header on close.
  if(!closeMobileDrawer(true)){
   document.body.classList.add('menu-open');
   syncMenu();
   // Place first keyboard focus inside the only exposed mobile navigation.
   drawerTabStops()[0]?.focus({preventScroll:true});
  }
 }else{
  collapsedSidebar=!collapsedSidebar;
  try{localStorage.setItem(SIDEBAR_STATE_KEY,collapsedSidebar?'1':'0');}catch(_){}
  syncMenu();
 }
}
mobileMenu.addEventListener('change',syncMenu);
$('menu').onclick=toggleSidebar;

document.addEventListener('keydown',event=>{
 if(!mobileMenu.matches||!document.body.classList.contains('menu-open')||
  !$('authModal').hidden||document.querySelector('dialog[open]'))return;
 if(event.key==='Escape'){
  event.preventDefault();
  closeMobileDrawer(true);
 }else if(event.key==='Tab'){
  // Keep keyboard focus within the current mobile drawer until it closes.
  const nodes=drawerTabStops(),first=nodes[0],last=nodes.at(-1);
  if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!$('sidebar').contains(document.activeElement))){
   event.preventDefault();last.focus();
  }else if(!event.shiftKey&&(document.activeElement===last||!$('sidebar').contains(document.activeElement))){
   event.preventDefault();first.focus();
  }
 }
});
// An outside tap closes the open mobile drawer, without toggling it back open
// when the tap was on the real header menu button.
document.querySelector('.content').addEventListener('pointerdown',event=>{
 if(!event.target.closest('#menu'))closeMobileDrawer();
});
document.querySelectorAll('#sidebar nav a').forEach(a=>a.addEventListener('click',()=>{
 if(mobileMenu.matches)closeMobileDrawer();
 else syncMenu();
}));

// Model options are discovered from the existing Studio config. Prepared or disabled models
// are visible but cannot be selected as if they were live integrations.
let studioModelMenuConfig=null,openModelsKind=null;
function closeModelFlyout(){
 const panel=$('modelFlyout');
 if(panel.open)panel.close();
 panel.hidden=true;openModelsKind=null;
 document.querySelectorAll('[data-open-models]').forEach(b=>b.setAttribute('aria-expanded','false'));
}
function renderModelFlyout(kind){
 const list=$('modelFlyoutList');list.replaceChildren();
 const configured=Array.isArray(studioModelMenuConfig?.catalog)?studioModelMenuConfig.catalog:MODEL_CATALOG;
 const models=configured.filter(m=>m.kind===(kind==='audio'?'music':kind));
 const allowedIds=new Set((studioModelMenuConfig?.models||[]).filter(m=>m.enabled===true).map(m=>m.id));
 const studioActive=studioModelMenuConfig?.enabled===true;
 const note=$('modelFlyoutNote');
 note.textContent=!studioModelMenuConfig?'Checking model availability…':studioActive?'Choose a connected model; review access and settings in Studio.':'Models are preview-only until Studio is enabled.';
 for(const model of models){
  const usable=studioActive&&allowedIds.has(model.id)&&model.enabled!==false;
  const b=document.createElement('button');b.type='button';b.className='model-flyout-option';b.disabled=!usable;
  const title=document.createElement('strong');title.textContent=model.label;
  const details=document.createElement('span');details.textContent=[model.provider,usable?(studioModelMenuConfig.ownerOnly?'Owner preview':'Open in Studio'):'Not connected'].filter(Boolean).join(' · ');
  b.append(title,details);
  if(usable)b.onclick=()=>{
   try{sessionStorage.setItem('deepsyq_template_start',JSON.stringify({generationType:kind,defaultModel:model.id,promptTemplate:'',defaultSettings:{},source:'model-menu'}));}
   catch(_){/* Direct Studio navigation remains available. */}
   location.assign('generate-studio.html?studio='+kind+'&from=model-menu');
  };
  list.append(b);
 }
 if(!models.length){const msg=document.createElement('p');msg.textContent='No models listed yet. Open Studio for updates.';list.append(msg);}
 if(kind==='audio'){const voice=document.createElement('a');voice.className='model-flyout-all';voice.href='audio-studio.html';voice.textContent='Voiceovers & transcription →';list.append(voice);}
 const go=document.createElement('a');go.className='model-flyout-all';go.href='generate-studio.html?studio='+kind;go.textContent='View all in Studio →';list.append(go);
}
function showModelFlyout(kind){
 if(!['image','video','audio'].includes(kind))return;
 const panel=$('modelFlyout');
 openModelsKind=kind;
 $('modelFlyoutTitle').textContent={image:'Image models',video:'Video models',audio:'Audio models'}[kind];
 renderModelFlyout(kind);panel.hidden=false;
 if(!panel.open)panel.showModal();
 document.querySelectorAll('[data-open-models]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.openModels===kind)));
}
for(const btn of document.querySelectorAll('[data-open-models]')){
 btn.onclick=()=>showModelFlyout(btn.dataset.openModels);
}
$('modelFlyoutClose').onclick=closeModelFlyout;
$('modelFlyout').addEventListener('close',closeModelFlyout);
syncMenu();

$('navShare').onclick=async()=>{
 const url=new URL('deepsyq.html',location.href).href;
 try{
  if(navigator.share)await navigator.share({title:'Deepsyq',url});
  else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);$('navShareStatus').textContent='Deepsyq link copied.';}
  else $('navShareStatus').textContent='Copy this link: '+url;
 }catch(e){if(e.name!=='AbortError')$('navShareStatus').textContent='Sharing is unavailable. Copy the page address instead.';}
};

// Sharing actions never impersonate an official Deepsyq social account.
document.querySelectorAll('[data-social]').forEach(button=>button.addEventListener('click',async()=>{
 const kind=button.dataset.social,url=new URL('deepsyq.html',location.href).href;
 if(kind==='x'){window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent('Create with Deepsyq')+'&url='+encodeURIComponent(url),'_blank','noopener,noreferrer');return;}
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);$('navShareStatus').textContent='Link copied. Paste it into '+(kind==='discord'?'Discord':'Instagram')+' to share.';}else{$('navShareStatus').textContent='Copy this link to share: '+url;}}
 catch(_){$('navShareStatus').textContent='Copy this link to share: '+url;}
 window.open(kind==='discord'?'https://discord.com/channels/@me':'https://www.instagram.com/','_blank','noopener,noreferrer');
}));
let authOpener;function openAuth(){if(window.AndroidBridge){location.assign('index.html#signin');return;}authOpener=document.activeElement;$('authModal').hidden=false;setTimeout(()=>$('emailAuthEmail')?.focus(),0);initGoogle();}function closeAuth(){$('authModal').hidden=true;authOpener?.focus();}
$('accountButton').onclick=()=>{closeMobileDrawer(true);openAuth();};document.querySelectorAll('[data-close-auth]').forEach(b=>b.onclick=closeAuth);
document.addEventListener('keydown',e=>{if($('authModal').hidden)return;if(e.key==='Escape')closeAuth();if(e.key==='Tab'){const items=[...$('authModal').querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(e=>e.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
$('logout').onclick=()=>{clearRecentCreations('Sign in to see your saved Studio creations.');localStorage.removeItem('vv_token');sessionStorage.removeItem('vu_generation_job');location.reload();};
let config;let googleReady=false;
function initGoogle(){if(googleReady||!config)return;if(!config.googleClientId){$('googleButton').textContent='Google sign-in is currently unavailable. Use email below.';return;}if(!window.google?.accounts?.id)return;googleReady=true;google.accounts.id.initialize({client_id:config.googleClientId,callback:async({credential})=>{try{const d=await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential})});localStorage.setItem('vv_token',d.token);if(d.newAccount===true)localStorage.setItem('deepsyq_onboarding_pending','1');location.reload();}catch(_){$('paymentStatus').textContent='Sign-in could not complete. Please try again.';}}});$('googleButton').replaceChildren();google.accounts.id.renderButton($('googleButton'),{theme:'outline',size:'large',width:280,text:'continue_with'});}
let pending=false;
async function checkout(plan){if(pending)return;if(!localStorage.getItem('vv_token')){openAuth();return;}pending=true;$('paymentStatus').textContent='Opening secure checkout…';try{const d=await api('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})});const u=new URL(d.url);if(u.protocol!=='https:'||!['checkout.stripe.com','buy.stripe.com'].includes(u.hostname))throw Error('INVALID_CHECKOUT');location.assign(u.href);}catch(e){$('paymentStatus').textContent=({AUTH_REQUIRED:'Please sign in to continue.',INVALID_SESSION:'Please sign in again.',ADMIN_ACCESS_ALREADY_UNLIMITED:'Your administrator account already has tool access.',LIFETIME_ALREADY_ACTIVE:'Lifetime is already active on this account.'})[e.message]||'Checkout is currently unavailable. No payment was taken.';if(e.message==='INVALID_SESSION')openAuth();}finally{pending=false;}}
// The homepage's feature media is selected ONLY from the same owner-approved
// featured API records as the existing gallery. Never invent preview assets.
function updateInspirationHero(items){renderHomeCarousel(items);}

// Owner-approved Home enhancements: no extra provider/credit/auth APIs are created.
const homeLang=$('homeLanguage');const homeI18n={
 en:{hero:'Create<br><em>beyond limits.</em>',canvas:'Canvas',agent:'AI Agent',apps:'AI Apps',inspiration:'Inspiration'},
 fr:{hero:'Créez<br><em>sans limites.</em>',canvas:'Canvas',agent:'AI Agent',apps:'AI Apps',inspiration:'Inspiration'},
 ru:{hero:'Создавайте<br><em>без границ.</em>',canvas:'Canvas',agent:'AI Agent',apps:'AI Apps',inspiration:'Вдохновение'}
};
function applyHomeLanguage(code){const v=homeI18n[code]||homeI18n.en;const hero=document.querySelector('.hero-stage-copy h1');if(hero)hero.innerHTML=v.hero;for(const [id,key] of [['canvasFeatureTitle','canvas'],['agentFeatureTitle','agent'],['appsFeatureTitle','apps'],['inspirationPreviewTitle','inspiration']]){const el=$(id);if(el)el.textContent=v[key];}if(homeLang)homeLang.value=homeI18n[code]?code:'en';}
if(homeLang){const saved=localStorage.getItem('deepsyq_home_language');applyHomeLanguage(saved||'en');homeLang.onchange=()=>{localStorage.setItem('deepsyq_home_language',homeLang.value);applyHomeLanguage(homeLang.value);};}
const promo=$('promoDialog');$('topPromo')?.addEventListener('click',()=>promo?.showModal());$('promoShare')?.addEventListener('click',()=>{$('navShare')?.click();promo?.close();});$('topInvite')?.addEventListener('click',()=>$('navShare')?.click());
// Header sign-in must not depend on dispatching a click to the inert,
// off-canvas mobile sidebar account button.
$('topLogin')?.addEventListener('click',()=>{
 if(localStorage.getItem('vv_token'))location.assign('index.html#profile');
 else openAuth();
});
function markHomeLogin(){const b=$('topLogin');if(b)b.textContent=localStorage.getItem('vv_token')?'Account':'Log in';}
markHomeLogin();
// Real owner-approved media only. Playback is disabled for reduced motion/data saver.
let inspirationVideoObserver=null;
function showInspirationVideos(root){
 inspirationVideoObserver?.disconnect();inspirationVideoObserver=null;
 if(!('IntersectionObserver' in window)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||navigator.connection?.saveData)return;
 inspirationVideoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){const v=entry.target;if(entry.isIntersecting&&!document.hidden){void v.play().catch(()=>{});}else v.pause();}
 },{threshold:.4});
 for(const v of root.querySelectorAll('video'))inspirationVideoObserver.observe(v);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('#inspirationPreview video').forEach(v=>v.pause());});
async function loadInspirationPreview(){
 const section=$('inspirationPreview'),root=$('inspirationPreviewGrid'),agentSection=$('agentExamples'),agentRoot=$('agentExamplesGrid');if(!section||config?.features?.inspiration===false){updateInspirationHero([]);return;}
 try{
  // Hero and the inspiration mosaic are independent reads: a slow mosaic must
  // not withhold a published, rights-cleared playable featured Studio film.
  // The owner-locked carousel never promotes Agent-only entries into a Studio CTA.
  void fetch(base+'/api/inspiration?featured=true&kind=video&target=studio&limit=13',{cache:'no-store'})
   .then(async response=>response.ok?response.json():null)
   .then(feed=>updateInspirationHero(Array.isArray(feed?.items)?feed.items:[]))
   .catch(()=>updateInspirationHero([]));
  const d=await fetch(base+'/api/inspiration?featured=true&limit=60',{cache:'no-store'}).then(async response=>response.ok?response.json():({items:[]})).catch(()=>({items:[]}));const studio=(Array.isArray(d.items)?d.items:[]).filter(x=>x.actionTarget==='studio'&&['video','image'].includes(x.kind));renderHomeInspiration(studio,()=>showInspirationVideos(root));const ad=await fetch(base+'/api/inspiration?featured=true&target=agent&limit=3',{cache:'no-store'}).then(async response=>response.ok?response.json():({items:[]})).catch(()=>({items:[]}));const agents=Array.isArray(ad.items)?ad.items:[];agentRoot.replaceChildren();for(const item of agents){const card=document.createElement(item.actionPath?'a':'article');card.className='inspiration-preview-card agent-example';if(item.actionPath){card.href=item.actionPath+'?from=inspiration';card.onclick=()=>sessionStorage.setItem('deepsyq_agent_inspiration_start',JSON.stringify({id:item.id,title:item.title,generationType:item.kind,promptTemplate:item.prompt||'',defaultModel:item.defaultModel||null,requiredInputTypes:Array.isArray(item.requiredInputTypes)?item.requiredInputTypes:[],defaultSettings:{...(item.defaultSettings||{}),ratio:item.aspectRatio},source:'inspiration',action:'create'}));}const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;const desc=document.createElement('span');desc.textContent=item.description||item.prompt;copy.append(title,desc);card.append(copy);agentRoot.append(card);}agentSection.hidden=!agents.length;}catch(_){section.hidden=true;agentSection.hidden=true;}
}

async function loadFeaturedWorkflows(){
 const section=$('featuredWorkflows'),root=$('featuredWorkflowGrid');if(!section||config?.features?.aiApps===false)return;
 try{
  const r=await fetch(base+'/api/templates?featured=true',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok||!Array.isArray(d.items)||!d.items.length)return;
  const liveItems=d.items.filter(item=>item.generationType!=='product_video').slice(0,8);
  if(!liveItems.length){section.hidden=true;return;}
  root.replaceChildren();for(const t of liveItems){const a=document.createElement('a');a.className='featured-workflow-card';const type=t.generationType;
 const supportedType=['image','video','audio'].includes(type)?type:null;
 // AI Apps already understands q/type/category. Carry the selected use case
 // so similarly named Image and Video featured cards do not get mixed up.
 a.href='ai-apps.html?q='+encodeURIComponent(String(t.title||'').slice(0,100))+
   (supportedType?'&type='+encodeURIComponent(supportedType):'')+
   (typeof t.category==='string'&&t.category.trim()?'&category='+encodeURIComponent(t.category.slice(0,80)):'');const visual=document.createElement('div');visual.className='featured-workflow-visual';if(t.thumbnail){const img=document.createElement('img');img.src=t.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';visual.append(img);}else visual.textContent=t.generationType==='image'?'✧':t.generationType==='audio'?'♫':'▷';const copy=document.createElement('div');copy.className='featured-workflow-copy';const title=document.createElement('strong');title.textContent=t.title;copy.append(title);a.append(visual,copy);root.append(a);}section.hidden=false;
 }catch(_){section.hidden=true;}
}

function applyPlatformFeatures(){for(const el of document.querySelectorAll('[data-feature]')){const key=el.dataset.feature;if(config?.features&&config.features[key]===false)el.hidden=true;}}
async function renderPlans(){
  const aiConfig=await api('/api/ai-billing/config').catch(()=>({}));
  $('plans').replaceChildren();
  const toolBenefits={
    basic:[
      'Video Uniquifier — Gentle, Balanced and Dynamic',
      'Batch photo compression and video compression',
      'Free tools: one-photo compression, video-to-audio and teleprompter'
    ],
    pro:[
      'Video Uniquifier — Gentle, Balanced and Dynamic',
      'All Basic Everyday Tools',
      'Short clips and photo-to-video motion',
      'Text-to-voice and recording-to-text (cloud limits apply)'
    ],
    business:[
      'Video Uniquifier — Gentle, Balanced and Dynamic',
      'All Pro Everyday Tools',
      'Highest monthly Video Uniquifier allowance',
      'Cloud voice limits still apply'
    ]
  };
  for(const key of ['basic','pro','business']){
    const p=config.plans?.[key];if(!p)continue;
    const card=document.createElement('article');card.className='plan'+(key==='pro'?' featured-plan':'');
    const heading=document.createElement('h3');heading.textContent=key[0].toUpperCase()+key.slice(1);
    const price=document.createElement('div');price.className='price';price.textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(p.price);
    const period=document.createElement('small');period.textContent=' / month';price.append(period);
    const usage=document.createElement('div');usage.className='credit-panel';
    const unit=document.createElement('span');unit.textContent='Video Uniquifier · monthly credits';
    const limit=Number(p.limit);
    const total=document.createElement('strong');total.textContent=Number.isSafeInteger(limit)&&limit>=0?limit.toLocaleString('en-US')+' credits':'See plan details';
    usage.append(unit,total);
    const benefits=document.createElement('ul');benefits.className='plan-benefits';
    const items=[...toolBenefits[key]];
    const aiCredits=aiConfig.subscriptionCredits?.[key];
    if(Number.isSafeInteger(aiCredits)&&aiCredits>0)items.push(aiCredits.toLocaleString('en-US')+' AI credits per paid invoice');
    else items.push('AI generation uses separate prepaid credits');
    for(const copy of items){const li=document.createElement('li');li.textContent=copy;benefits.append(li);}
    const b=document.createElement('button');b.type='button';b.textContent='Choose '+heading.textContent;b.onclick=()=>checkout(key);
    card.append(heading,price,usage,benefits,b);$('plans').append(card);
  }
  const p=config.plans?.lifetime;if(p){$('lifetimePrice').textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:p.currency||'EUR',maximumFractionDigits:0}).format(p.price)+' · one payment';$('lifetimeCheckout').disabled=false;$('lifetimeCheckout').onclick=()=>checkout('lifetime');}
}
async function loadPlanModelCatalog(){
 const root=$('homeModelCatalog');if(!root)return;
 try{
  const data=await api('/api/studio/config');
  const models=[...(Array.isArray(data.models)?data.models:[]),...(Array.isArray(data.catalog)?data.catalog:[])].filter((m,i,all)=>m?.enabled===true&&all.findIndex(other=>other?.id===m.id)===i);
  root.replaceChildren();
  if(!models.length){const note=document.createElement('span');note.textContent='No AI generation models are enabled in this preview. Check Studio for current availability.';root.append(note);return;}
  for(const model of models){const chip=document.createElement('span');chip.className='home-model-chip';chip.textContent=(model.label||model.id)+' · '+String(model.kind||'AI').toUpperCase();root.append(chip);}
 }catch(_){root.textContent='Current model availability could not be loaded. Check Studio before choosing a model.';}
}
try{config=await api('/api/config');applyPlatformFeatures();void renderPlans();initGoogle();await Promise.all([loadFeaturedWorkflows(),loadInspirationPreview()]);}catch(_){updateInspirationHero([]);$('paymentStatus').textContent='Plans could not load. Please try again later.';}
window.addEventListener('load',initGoogle);
try{const c=await api('/api/studio/config');studioModelMenuConfig=c;if(openModelsKind)renderModelFlyout(openModelsKind);$('studioStatus').textContent=c.ownerOnly?'AI generation is in owner preview. Explore the studios; existing tools remain available.':c.enabled?'Open a studio to see the available models.':'AI generation is not available yet. Existing tools remain available.';}catch(_){$('studioStatus').textContent='Studio availability could not be checked. Existing tools remain available.';}
// Read-only dashboard overview. Backend user_id scope is authoritative;
// never render a late private response after a session/account switch.
let recentCreationsEpoch=0,recentRenderedOwnerToken=null;
const recentAccountChanged='Account changed. Reload to view creations for the current account.';
function clearRecentCreations(message){
 recentRenderedOwnerToken=null;
 ++recentCreationsEpoch;
 $('recentCreationsGrid')?.replaceChildren();
 const status=$('recentCreationsStatus');if(status)status.textContent=message;
}
window.addEventListener('storage',event=>{
 if(event.key==='vv_token'){
  clearRecentCreations(event.newValue?recentAccountChanged:'Sign in to see your saved Studio creations.');
 }
});
// A same-tab token change does NOT fire a native storage event. Clear
// private prompt cards before the next user interaction, even if that click
// immediately navigates to the saved result. Do not alter other Studio state.
function protectRecentCreationsAccount(){
 if(recentRenderedOwnerToken===null||recentRenderedOwnerToken===localStorage.getItem('vv_token'))return false;
 clearRecentCreations(localStorage.getItem('vv_token')?recentAccountChanged:'Sign in to see your saved Studio creations.');
 return true;
}
for(const eventName of ['click','keydown','focusin'])
 document.addEventListener(eventName,event=>{
  // Remember origin BEFORE clearing: removing the card detaches its parent
  // and closest('#recentCreationsGrid a') could then no longer find the link.
  const fromRecentCard=!!event.target?.closest?.('#recentCreationsGrid a');
  if(protectRecentCreationsAccount()&&fromRecentCard){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
window.addEventListener('focus',protectRecentCreationsAccount);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)protectRecentCreationsAccount();});
async function loadRecentCreations(){
 const status=$('recentCreationsStatus'),grid=$('recentCreationsGrid');if(!status||!grid)return;
 const requestedToken=localStorage.getItem('vv_token'),epoch=++recentCreationsEpoch;
 const isCurrent=()=>epoch===recentCreationsEpoch&&requestedToken===localStorage.getItem('vv_token');
 grid.replaceChildren();
 if(!requestedToken){status.textContent='Sign in to see your saved Studio creations.';return;}
 status.textContent='Loading your recent creations…';
 try{
  const response=await api('/api/studio/jobs?filter=all');
  // A token rotation can occur before the fetch settles; no old prompts may
  // be inserted for a new account, even if an earlier server response is valid.
  if(!isCurrent()){
   if(epoch===recentCreationsEpoch)clearRecentCreations(recentAccountChanged);
   return;
  }
  const items=Array.isArray(response.items)?response.items.slice(0,4):[];
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
  recentRenderedOwnerToken=grid.childElementCount?requestedToken:null;
  status.textContent=grid.childElementCount?'Select a creation to open your Studio history.':'No saved creations yet.';
 }catch(_){
  if(isCurrent())status.textContent='Studio history is not available for this account right now.';
  else if(epoch===recentCreationsEpoch)clearRecentCreations(recentAccountChanged);
 }
}
// A stale credit balance must never render under a later account.
async function loadAIWallet(){
 const chip=$('aiWalletLink');if(!chip)return;
 const requestedToken=localStorage.getItem('vv_token');
 const isCurrent=()=>!!requestedToken&&requestedToken===localStorage.getItem('vv_token');
 if(!requestedToken){chip.hidden=true;return;}
 try{
  const [billing,welcome]=await Promise.all([api('/api/ai-billing/config').catch(()=>({enabled:false})),api('/api/ai-wallet/config').catch(()=>({welcomeEnabled:false}))]);
  if(!isCurrent()||(!billing.enabled&&!welcome.welcomeEnabled)){chip.hidden=true;return;}
  const balance=await api('/api/ai-wallet/balance');
  if(!isCurrent()){chip.hidden=true;return;}
  const available=Number(balance.available||0),reserved=Number(balance.reserved||0),debt=Number(balance.debt||0);
  $('aiWalletAvailable').textContent=available.toLocaleString();$('aiWalletHeld').textContent=debt>0?`${debt.toLocaleString()} debt`:reserved>0?`${reserved.toLocaleString()} held`:'available';chip.dataset.debt=String(debt>0);chip.hidden=false;
 }catch(_){if(isCurrent())chip.hidden=true;}
}

let onboardingModalOwnerToken=null;
async function maybeShowOnboarding(){
 if(config?.features?.onboarding===false)return;
 const requestedToken=localStorage.getItem('vv_token');
 if(localStorage.getItem('deepsyq_onboarding_pending')!=='1'||!requestedToken)return;
 const sameAccount=()=>requestedToken===localStorage.getItem('vv_token');
 try{
  const state=await api('/api/onboarding');
  if(!sameAccount())return; // A different login must fetch its own first-run state.
  if(state.completed){localStorage.removeItem('deepsyq_onboarding_pending');return;}
  // Show only server-authorized workflows with recognized local routes.
  const authorized=authorizedOnboardingOptions(state.options);
  if(!authorized.length)return;
  const modal=$('onboardingModal'),choices=modal.querySelector('.onboardingChoices');
  choices.replaceChildren();
  for(const option of authorized){
   const button=document.createElement('button');button.type='button';button.dataset.onboardingGoal=option.id;
   const title=document.createElement('strong');title.textContent=option.label;
   const detail=document.createElement('span');detail.textContent=option.description;
   button.append(title,detail);
   button.addEventListener('click',async()=>{
    if(!sameAccount()){
     closeOnboarding();
     return;
    }
    const status=$('onboardingStatus'),buttons=[...choices.querySelectorAll('button')];
    buttons.forEach(b=>b.disabled=true);status.textContent='Saving your starting point…';
    try{
     const response=await api('/api/onboarding',{method:'POST',body:JSON.stringify({goal:option.id})});
     if(!sameAccount()){closeOnboarding();return;}
     const target=onboardingResponseTarget(response,option.id,authorized);
     if(!target)throw Error('ONBOARDING_TARGET_NOT_AUTHORIZED');
     localStorage.removeItem('deepsyq_onboarding_pending');
     location.assign(target);
    }catch(e){
     if(!sameAccount()){closeOnboarding();return;}
     status.textContent=e.message==='ONBOARDING_UNAVAILABLE'?
      'Onboarding is temporarily unavailable. You can still use the studios from the dashboard.':
      'Could not save your choice. Please try again.';
     buttons.forEach(b=>b.disabled=false);
    }
   });
   choices.append(button);
  }
  if(!sameAccount())return; // A logout while building buttons must not expose prior state.
  $('onboardingStatus').textContent='';
  onboardingModalOwnerToken=requestedToken;
  modal.hidden=false;
  setTimeout(()=>{if(sameAccount()&&!modal.hidden)choices.querySelector('button')?.focus();},0);
 }catch(_){/* Keep pending marker so setup can be retried later. */}
}
function closeOnboarding(){
 const modal=$('onboardingModal');if(modal)modal.hidden=true;
 onboardingModalOwnerToken=null;
}
function dismissOnboarding(){
 // A stale previous-user modal must not delete a freshly signed-in user's
 // pending setup marker when the token rotates silently within this tab.
 if(onboardingModalOwnerToken===localStorage.getItem('vv_token'))
  localStorage.removeItem('deepsyq_onboarding_pending');
 closeOnboarding();
}
window.addEventListener('storage',event=>{
 if(event.key==='vv_token'&&onboardingModalOwnerToken&&
    event.newValue!==onboardingModalOwnerToken)closeOnboarding();
});
// A same-tab login does not emit 'storage'. No previous account's authorized
// choices may remain interactive (or visible after tab focus) for a new user.
function scrubStaleOnboardingOwner(){
 if(!onboardingModalOwnerToken||onboardingModalOwnerToken===localStorage.getItem('vv_token'))return false;
 closeOnboarding();return true;
}
for(const type of ['click','keydown','focusin'])document.addEventListener(type,event=>{
 const staleModalAction=!!event.target?.closest?.('#onboardingModal');
 if(scrubStaleOnboardingOwner()&&staleModalAction){
  event.preventDefault();
  event.stopImmediatePropagation();
 }
},true);
window.addEventListener('focus',scrubStaleOnboardingOwner);
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)scrubStaleOnboardingOwner();
});
document.querySelectorAll('[data-close-onboarding]').forEach(b=>b.onclick=dismissOnboarding);
$('onboardingLater').onclick=dismissOnboarding;

// Bind the displayed identity to the exact authenticated token that /api/me
// answered. Same-tab changes do not dispatch the storage event.
let dashboardAccountOwnerToken=null;
function scrubStaleDashboardAccount(){
 if(!dashboardAccountOwnerToken||dashboardAccountOwnerToken===localStorage.getItem('vv_token'))return false;
 dashboardAccountOwnerToken=null;
 $('accountLabel').textContent='Your workspace';
 $('accountButton').textContent='Reload for current account';
 $('accountButton').onclick=()=>location.reload();
 $('logout').hidden=true;
 document.getElementById('adminAiControl')?.remove();
 const chip=$('aiWalletLink');if(chip){chip.hidden=true;chip.removeAttribute('data-debt');}
 const available=$('aiWalletAvailable'),held=$('aiWalletHeld');if(available)available.textContent='—';if(held)held.textContent='—';
 return true;
}
document.addEventListener('click',event=>{
 const stale=!!dashboardAccountOwnerToken&&dashboardAccountOwnerToken!==localStorage.getItem('vv_token');
 if(stale){
  const protectedAction=!!event.target?.closest?.('#adminAiControl,#aiWalletLink,#accountButton,#logout');
  scrubStaleDashboardAccount();
  if(protectedAction){event.preventDefault();event.stopImmediatePropagation();}
 }
},true);
for(const type of ['keydown','focusin'])document.addEventListener(type,scrubStaleDashboardAccount,true);
window.addEventListener('focus',scrubStaleDashboardAccount);
window.addEventListener('storage',event=>{if(event.key==='vv_token')scrubStaleDashboardAccount();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scrubStaleDashboardAccount();});
const requestedIdentityToken=localStorage.getItem('vv_token');
if(requestedIdentityToken)try{
 const {user}=await api('/api/me');
 if(requestedIdentityToken===localStorage.getItem('vv_token')){
  dashboardAccountOwnerToken=requestedIdentityToken;
  $('accountLabel').textContent=user.name||'Your workspace';
  $('accountButton').textContent='Account settings';
  $('accountButton').onclick=()=>location.assign('index.html#profile');
  $('logout').hidden=false;
  if(user.isAdmin&&!document.getElementById('adminAiControl')){
   const a=document.createElement('a');a.id='adminAiControl';a.href='deepsyq-admin.html';a.textContent='Owner AI Control';document.querySelector('.sidebar-bottom').prepend(a);
  }
  await Promise.all([maybeShowOnboarding(),loadAIWallet(),loadRecentCreations()]);
 }
}catch(e){
 if(requestedIdentityToken===localStorage.getItem('vv_token')&&
  (e.message==='INVALID_SESSION'||e.message==='USER_NOT_FOUND')){
  localStorage.removeItem('vv_token');localStorage.removeItem('deepsyq_onboarding_pending');
 }
}
if(new URLSearchParams(location.search).get('checkout')==='success')$('paymentStatus').textContent='Your checkout has returned. Access is updated only after Stripe confirms payment. Open your account to see its current status.';
