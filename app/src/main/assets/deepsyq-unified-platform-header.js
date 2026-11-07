/* Owner 2026-11-07: single DEEPSYQ chrome on secondary pages.
 * Called AFTER the existing site-shell/mobile-shell. Never replace its handlers.
 * Home is already approved; original Video Uniquifier keeps its own new
 * DEEPSYQ-only wrapper from #601. Preserve all inner-page features as-is.
 */
const labels={
 en:{credits:'AI Credits',login:'Log in'},
 ru:{credits:'AI Credits',login:'Войти'},
 fr:{credits:'Crédits IA',login:'Connexion'},
 es:{credits:'Créditos IA',login:'Acceder'}
};
const locale=()=>{
 try{return (localStorage.getItem('deepsyq_home_language')||localStorage.getItem('deepsyq_lang')||document.documentElement.lang||'en').slice(0,2).toLowerCase();}
 catch{return 'en';}
};
const dictionary=()=>labels[locale()]||labels.en;
function link(text,href,cls){
 const el=document.createElement('a');el.textContent=text;el.href=href;el.className=cls;return el;
}
export function installUnifiedPlatformHeader(){
 // Approved Home and the VU-specific platform wrapper are never restructured.
 if(document.body.classList.contains('home-neon')||document.body.classList.contains('ds-embedded-uniquifier'))return;
 // On a narrow viewport the already approved mobile shell owns the controls.
 // On widening, allow its media-query change handler to restore controls first.
 if(matchMedia('(max-width:760px)').matches){
  const onWiden=()=>{
   if(matchMedia('(max-width:760px)').matches)return;
   window.removeEventListener('resize',onWiden);
   requestAnimationFrame(()=>installUnifiedPlatformHeader());
  };
  window.addEventListener('resize',onWiden);
  return;
 }
 if(document.body.dataset.dsUnifiedPlatform==='ready')return;
 const header=document.querySelector('header.ds-stable-header');
 const sidebar=document.querySelector('#dsSiteSidebar.ds-stable-sidebar');
 const toggle=document.querySelector('.ds-site-mobile-toggle');
 const orb=document.getElementById('topJarvisBtn');
 const tour=document.getElementById('dsTakeTour');
 const tools=header?.querySelector('.ds-header-tools');
 const pricing=document.getElementById('topPricing');
 const login=document.getElementById('topLogin');
 if(!header||!sidebar||!toggle||!orb||!tour||!tools||!pricing||!login)return;
 // All actions are the ORIGINAL buttons with their ORIGINAL event handlers.
 // Only move DOM nodes, never clone or replace a handler.
 const group=document.createElement('div');group.className='ds-unified-actions';
 const left=document.createElement('div');left.className='ds-unified-actions-left';
 const right=document.createElement('div');right.className='ds-unified-actions-right';
 left.append(tour,tools);
 let credit=header.querySelector('.ds-header-credit');
 if(!credit){
  credit=link('⚡ '+dictionary().credits+': —','pricing.html#credits','ds-header-credit ds-unified-credit');
  const readBalance=async()=>{
   let token='';try{token=localStorage.getItem('vv_token')||'';}catch{}
   credit.textContent='⚡ '+dictionary().credits+': —';
   if(!token)return;
   try{
    const response=await fetch('/api/ai-wallet/balance',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json();
    if(token===localStorage.getItem('vv_token')&&Number.isSafeInteger(data.available)&&data.available>=0)
      credit.textContent='⚡ '+dictionary().credits+': '+data.available.toLocaleString(locale());
   }catch{}
  };
  void readBalance();
  window.addEventListener('storage',event=>{if(event.key==='vv_token')void readBalance();});
  window.addEventListener('deepsyq:lang',()=>void readBalance());
 }
 let language=header.querySelector('#dsUnifiedLanguage');
 if(!language){
  language=document.createElement('select');language.id='dsUnifiedLanguage';
  language.setAttribute('aria-label','DEEPSYQ language');
  for(const l of ['en','ru','fr','es']){
   const option=document.createElement('option');option.value=l;option.textContent=l.toUpperCase();language.append(option);
  }
  language.addEventListener('change',()=>{
   try{localStorage.setItem('deepsyq_home_language',language.value);}catch{}
   window.dispatchEvent(new Event('deepsyq:lang'));
  });
  window.addEventListener('deepsyq:lang',()=>{language.value=locale();});
 }
 language.value=locale();
 const languageWrap=document.createElement('label');languageWrap.className='ds-unified-language';
 languageWrap.append(language);
 right.append(credit,pricing,languageWrap,login);
 group.append(left,right);header.append(group);
 header.classList.add('ds-unified-header');
 document.body.classList.add('ds-unified-platform');
 document.body.dataset.dsUnifiedPlatform='ready';
 const updateToggle=()=>{
  if(matchMedia('(max-width:900px)').matches)return;
  const rightEdge=document.body.classList.contains('ds-unified-nav-collapsed')?0:sidebar.getBoundingClientRect().right;
  toggle.style.setProperty('--ds-unified-menu-left',Math.round(rightEdge+22)+'px');
 };
 toggle.addEventListener('click',()=>{
  if(matchMedia('(max-width:900px)').matches)return;
  document.body.classList.toggle('ds-unified-nav-collapsed');
  updateToggle();
  // Existing pin measurements respond to resize, preserving the original
  // fixed-header implementation instead of introducing a second fixed bar.
  window.dispatchEvent(new Event('resize'));
 });
 window.addEventListener('resize',updateToggle);
 updateToggle();
 window.dispatchEvent(new Event('resize'));
}
