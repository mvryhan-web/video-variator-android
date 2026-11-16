/* DEEPSYQ Account Appearance — site-wide, production-scoped, visual only.
   Exactly one persisted choice; keeps existing authentication/billing/creator logic. */
(() => {
 'use strict';
 const root=document.documentElement;
 const key='deepsyq_site_theme';
 const variants=new Set(['brown','soft-dark','christmas']);
 const classic=new Set(['light','dark','system']);
 const media=matchMedia('(prefers-color-scheme: light)');
 const holidayCSS=[
  'deepsyq-christmas.css','deepsyq-christmas-v2.css',
  'deepsyq-christmas-v3.css','deepsyq-christmas-v4.css'
 ];
 const holidayJS=[
  'deepsyq-christmas.js','deepsyq-christmas-v2.js','deepsyq-christmas-v4.js'
 ];
 let holidayPromise=null;
 const asset=(path)=>'/'+path+'?v='+(path==='deepsyq-christmas-v4.js'||path==='deepsyq-christmas-v4.css'?'20261115-mobile-sync-v2':'20261115-prod-theme-v1');
 const ensureStyle=(name)=>new Promise(resolve=>{
  const id='ds-appearance-'+name.replace(/[^\w-]/g,'-');
  if(document.getElementById(id)){resolve();return}
  const el=document.createElement('link');el.id=id;el.rel='stylesheet';el.href=asset(name);
  el.addEventListener('load',resolve,{once:true});
  el.addEventListener('error',()=>{console.warn('Appearance stylesheet unavailable:',name);resolve()},{once:true});
  document.head.append(el);
 });
 const ensureScript=(name)=>new Promise((resolve,reject)=>{
  const id='ds-appearance-'+name.replace(/[^\w-]/g,'-');
  if(document.getElementById(id)){resolve();return}
  const el=document.createElement('script');el.id=id;el.src=asset(name);el.async=false;
  el.addEventListener('load',resolve,{once:true});
  el.addEventListener('error',()=>reject(new Error('Appearance script unavailable: '+name)),{once:true});
  document.head.append(el);
 });
 const ensureHoliday=()=>{
  if(holidayPromise)return holidayPromise;
  holidayPromise=(async()=>{
   for(const name of holidayCSS)await ensureStyle(name);
   for(const name of holidayJS)await ensureScript(name);
  })().catch(error=>{console.warn('Christmas appearance unavailable:',error.message);});
  return holidayPromise;
 };
 const selected=()=>{
  try{return localStorage.getItem(key)||''}catch{return ''}
 };
 const legacyTheme=()=>{
  try{return localStorage.getItem('vu_theme')||'dark'}catch{return 'dark'}
 };
 const emit=value=>window.dispatchEvent(new CustomEvent('deepsyq:appearance',{detail:{theme:value}}));
 const apply=(value,persist=false)=>{
  if(classic.has(value)){
   // Keep the native Light/Dark/System semantics, including OS switching.
   root.dataset.theme=value==='system'?(media.matches?'light':'dark'):value;
   root.removeAttribute('data-site-theme');
   if(persist){
    try{
     localStorage.setItem('vu_theme',value);
     localStorage.removeItem(key);
    }catch{}
   }
   emit(value);
   return true;
  }
  if(!variants.has(value))return false;
  root.dataset.siteTheme=value;
  root.dataset.theme='dark';
  if(persist){try{localStorage.setItem(key,value)}catch{}}
  if(value==='christmas')ensureHoliday();
  emit(value);
  return true;
 };
 window.deepsyqSetAppearance=value=>apply(value,true);
 // The original Dark appearance is the default for new visitors.
 // Christmas remains opt-in from Account > App Preferences > Appearance.
 // Never overwrite or persist a user's explicit theme choice.
 const defaultAppearance='dark';
 const previousChoice=()=>{
  let value=null;
  try{value=localStorage.getItem('vu_theme')}catch{}
  return value;
 };
 const reconcileAppearance=()=>{
  const saved=selected(),previousClassic=previousChoice();
  if(variants.has(saved))apply(saved,false);
  else if(classic.has(previousClassic))apply(previousClassic,false);
  else if(!saved&&previousClassic===null)apply(defaultAppearance,false);
  else if(classic.has(legacyTheme()))apply(legacyTheme(),false);
 };
 reconcileAppearance();
 ensureStyle('deepsyq-theme-styles.css');
 media.addEventListener('change',()=>{
  if(!variants.has(selected())&&legacyTheme()==='system')apply('system',false);
 });
 new MutationObserver(()=>{if(root.dataset.siteTheme==='christmas')ensureHoliday();})
  .observe(root,{attributes:true,attributeFilter:['data-site-theme']});
 // Keep unsaved visitors on the original appearance after a tab resumes;
 // explicit saved choices are always respected.
 window.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&!selected()&&previousChoice()===null)apply(defaultAppearance,false);
 });
 window.addEventListener('storage',event=>{
  if(event.key!==key&&event.key!=='vu_theme')return;
  reconcileAppearance();
 });
})();