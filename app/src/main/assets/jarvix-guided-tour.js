import {getJarvixLanguage,stopAllSpeech,pauseJarvisRecognition,updateJarvisState,suspendJarvisForTour} from './jarvis-core.js';
import {speakOwnerSpeech,stopOwnerSpeech,unlockOwnerSpeech} from './jarvix-owner-speech.js';
import {TOUR_KEY,tourPlan,tourAction,tourCues,cueAt,tourNavigationClip,planNarrationBeats,sectionNarrationBeats} from './jarvix-tour-plan.js';
let audio=null,turn=0,bar=null,state=null,navTimer=null,waitTimer=null,stepWaitKey=null,stepWaitStart=0,activeFocus='',tourSettingsOpened=false;
let transcriptPromise=null;
const clipTranscript=file=>{
 transcriptPromise ||= fetch('media/jarvix/clips/manifest.json',{signal:AbortSignal.timeout(5000)})
  .then(r=>r.ok?r.json():null).then(data=>new Map((data?.clips||[]).map(item=>[item.url.split('/').pop().split('?')[0],item.text]))).catch(()=>new Map());
 return transcriptPromise.then(map=>map.get(file.split('/').pop())||'');
};
function caption(text){const el=bar?.querySelector('.ds-tour-caption');if(el)el.textContent=text||'';}
function captionForClip(file,current){caption('');void clipTranscript(file).then(text=>{if(current===turn&&state)caption(text);});}
const read=()=>{try{const s=JSON.parse(sessionStorage.getItem(TOUR_KEY)||'null');return s&&Number.isInteger(s.index)&&s.index>=0&&s.index<tourPlan(s.language).length&&['playing','paused'].includes(s.phase)?s:null;}catch{return null;}};
function save(){try{state?sessionStorage.setItem(TOUR_KEY,JSON.stringify(state)):sessionStorage.removeItem(TOUR_KEY);}catch{}}
export function isTourActive(){return !!state||!!read();}
function clearAudio(){turn++;clearTimeout(navTimer);clearTimeout(waitTimer);stopOwnerSpeech();if(audio){audio.onended=null;audio.onplay=null;audio.onerror=null;audio.ontimeupdate=null;audio.pause();audio.remove();audio=null;}}
const navElements=()=>({sidebar:document.querySelector('#sidebar,#dsSiteSidebar,.shell>.sidebar'),toggle:document.querySelector('#menu,.ds-site-mobile-toggle,.vu-nav-toggle,#menuBtn')});
function menuOpen(){return document.body.classList.contains('ds-mobile-drawer-open')||document.body.classList.contains('ds-site-nav-open')||document.body.classList.contains('menu-open')||document.body.classList.contains('vu-nav-open');}
function showNavigation(url){
 const {sidebar,toggle}=navElements();
 if(document.body.classList.contains('ds-mobile-layout')){if(!menuOpen())toggle?.click();}
 else if(document.body.classList.contains('sidebar-collapsed'))toggle?.click();
 document.querySelectorAll('.ds-tour-drawer-target').forEach(e=>e.classList.remove('ds-tour-drawer-target'));
 const target=new URL(url,location.href);
 const link=[...(sidebar?.querySelectorAll('a[href]')||[])].find(a=>{const u=new URL(a.href);return u.pathname===target.pathname&&u.search===target.search;});
 link?.classList.add('ds-tour-drawer-target');link?.scrollIntoView({block:'nearest'});return link;
}
function closeNavigation(){if(document.body.classList.contains('ds-mobile-layout')&&menuOpen())navElements().toggle?.click();document.querySelectorAll('.ds-tour-drawer-target').forEach(e=>e.classList.remove('ds-tour-drawer-target'));}
function closeTourSettings(){
 if(!tourSettingsOpened)return;
 const hub=document.getElementById('studioSettingsHub');if(hub?.open)hub.close();
 tourSettingsOpened=false;
}
function spotlight(step){
 if(step.action==='showSettings'){
  const hub=document.getElementById('studioSettingsHub');
  // show(), not showModal(): Pause/Stop remain accessible during the read-only demonstration.
  if(hub&&!hub.open){hub.show();tourSettingsOpened=true;}
 }else if(step.action==='hideSettings')closeTourSettings();
 const targets=[...document.querySelectorAll(step.target||'')].filter(el=>el.getClientRects().length);
 if(!targets.length&&step.action==='showSettings')return spotlight({target:'#studioSettingsToggle'});
 if(!targets.length)return false;
 if(activeFocus===step.target&&targets[0].classList.contains('jarvis-tour-spotlight'))return true;
 document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));
 targets.forEach(e=>e.classList.add('jarvis-tour-spotlight'));activeFocus=step.target;
 targets[0].scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
 return true;
}
function render(){
 if(!state){bar?.remove();bar=null;document.getElementById('topJarvisBtn')?.classList.remove('ds-tour-speaking');return;}
 const lang=state.language;const texts={ru:['Пауза','Продолжить','Стоп'],en:['Pause','Continue','Stop'],fr:['Pause','Continuer','Arrêter'],es:['Pausa','Continuar','Parar']}[lang]||['Pause','Continue','Stop'];
 if(!bar){bar=document.createElement('section');bar.className='ds-tour-controls';bar.setAttribute('aria-label','JARVIX tour controls');bar.innerHTML='<span class="ds-tour-label" aria-live="polite"></span><span class="ds-tour-caption" aria-live="off"></span><button type="button" data-tour="pause"></button><button type="button" data-tour="continue"></button><button type="button" data-tour="stop"></button>';bar.querySelector('[data-tour="pause"]').onclick=pauseJarvixGuidedTour;bar.querySelector('[data-tour="continue"]').onclick=continueJarvixGuidedTour;bar.querySelector('[data-tour="stop"]').onclick=stopJarvixGuidedTour;document.body.append(bar);}
 bar.querySelector('.ds-tour-label').textContent=`JARVIX · ${tourPlan(lang)[state.index].title} · ${state.index+1}/${tourPlan(lang).length}${state.error?' · '+state.error:''}`;
 for(const [i,key]of ['pause','continue','stop'].entries()){const b=bar.querySelector(`[data-tour="${key}"]`);b.textContent=texts[i];b.title=state.error||texts[i];}
 bar.querySelector('[data-tour="pause"]').hidden=state.phase==='paused';bar.querySelector('[data-tour="continue"]').hidden=state.phase!=='paused';
 bar.dataset.error=state.error||'';document.getElementById('topJarvisBtn')?.classList.toggle('ds-tour-speaking',state.phase==='playing');
}
function advance(current){if(current!==turn||!state||state.phase!=='playing')return;closeTourSettings();state=tourAction(state,'ended');save();if(state)void play();else{clearAudio();document.querySelectorAll('.jarvis-tour-spotlight,.ds-tour-drawer-target').forEach(e=>e.classList.remove('jarvis-tour-spotlight','ds-tour-drawer-target'));activeFocus='';updateJarvisState('idle');render();window.dispatchEvent(new Event('jarvix:tour-ended'));}}
function blocked(current,message='Audio unavailable'){if(current!==turn||!state)return;state={...state,phase:'paused',error:message};save();render();updateJarvisState('idle');}

function speakNavigation(step,target,current){
 closeTourSettings();
 const link=showNavigation(step.url);
 const file=tourNavigationClip(step.title,state.index,state.language);
 let clip=null;
 const navigate=()=>{
  if(current!==turn||!state||state.phase!=='playing')return;
  if(clip){clip.onended=null;clip.pause();clip.remove();if(audio===clip)audio=null;}
  state.navAnnounced=state.index;state.position=0;save();
  navTimer=setTimeout(()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   if(link&&new URL(link.href).pathname===target.pathname&&new URL(link.href).search===target.search)link.click();
   else location.assign(target.href);
  },350);
 };
 if(!file){navTimer=setTimeout(navigate,1100);return;}
 audio=new Audio(file);clip=audio;clip.id='dsTourAudio';clip.hidden=true;document.body.append(clip);
 clip.onloadedmetadata=()=>{if(state?.position)clip.currentTime=Math.min(state.position,Math.max(0,(clip.duration||0)-.1));};
 clip.onplay=()=>{pauseJarvisRecognition();updateJarvisState('speaking');};
 clip.onended=navigate;clip.onerror=()=>blocked(current,'Navigation voice unavailable');
 captionForClip(file,current);
 void clip.play().catch(()=>blocked(current,'Press Continue'));
}
function speakBeats(beats,current){
 let index=Math.min(state?.beat||0,Math.max(0,beats.length-1));
 const next=()=>{
  if(current!==turn||!state||state.phase!=='playing')return;
  const beat=beats[index];
  if(!beat){advance(current);return;}
  caption(beat.text);
  // Highlight the precise control only when its associated phrase starts playing.
  void speakOwnerSpeech(beat.text,state.language,{
   phase:phase=>{if(current===turn&&phase==='playing')spotlight(beat);if(current===turn&&bar)bar.dataset.narration=phase;},
   start:()=>{if(current===turn)updateJarvisState('speaking');},
   complete:()=>{if(current!==turn||!state||state.phase!=='playing')return;state.beat=++index;save();next();},
   fallback:()=>blocked(current,'Voice service unavailable'),
   error:()=>blocked(current,'Voice service unavailable')
  });
 };
 next();
}
async function play(){
 if(!state)return;clearAudio();activeFocus='';const current=turn,step=tourPlan(state.language)[state.index],target=new URL(step.url,location.href);render();
 if(target.pathname!==location.pathname||target.search!==location.search){
  if(state.phase==='paused')return;
  if(state.navAnnounced!==state.index){speakNavigation(step,target,current);return;}
  const link=showNavigation(step.url);
  navTimer=setTimeout(()=>{if(current!==turn||!state||state.phase!=='playing')return;link?link.click():location.assign(target.href);},350);return;
 }
 closeNavigation();
 pauseJarvisRecognition();if(state.phase==='paused')return;
 const waitKey=location.pathname+location.search+':'+state.index;if(stepWaitKey!==waitKey){stepWaitKey=waitKey;stepWaitStart=Date.now();}
 if(!document.querySelector(step.target)){
  if(Date.now()-stepWaitStart<5000){waitTimer=setTimeout(()=>{if(current===turn&&state)void play();},150);return;}
  blocked(current,'Tour control unavailable');return;
 }
 if(step.narration==='section'){
  speakBeats(sectionNarrationBeats(step.title,state.language),current);return;
 }
 if(step.narration==='plan'){
  const card=document.querySelector(step.target);
  const data={
   name:card.querySelector('h3')?.textContent,
   price:[...(card.querySelector('.price-plan-price')?.children||[])].map(e=>e.textContent).join(' '),
   summary:card.querySelector('.price-plan-summary')?.textContent,
   billingNotice:card.querySelector('.price-plan-facts > span:last-child')?.textContent,
   features:[...card.querySelectorAll('.price-features li')].map(e=>e.querySelector('span:last-child')?.textContent||e.textContent),
   note:card.querySelector('.price-plan-note')?.textContent
  };
  const beats=planNarrationBeats(data).map(beat=>({...beat,target:step.target+' '+beat.target}));
  speakBeats(beats,current);return;
 }
 const cues=tourCues(step.title);
 const started=performance.now();let lastCue=-1;
 audio=new Audio(step.audio);const clip=audio;clip.id='dsTourAudio';clip.hidden=true;document.body.append(clip);clip.playbackRate=1;
 const sync=()=>{if(current!==turn||!state||state.phase!=='playing')return;
  const index=cueAt(cues,clip.currentTime,clip.duration);
  if(index!==lastCue){lastCue=index;spotlight(cues[index]);}
 };
 clip.onloadedmetadata=()=>{if(state?.position)clip.currentTime=Math.min(state.position,Number.isFinite(clip.duration)?Math.max(0,clip.duration-.1):state.position);sync();};
 clip.ontimeupdate=sync;
 clip.onplay=()=>{pauseJarvisRecognition();updateJarvisState('speaking');sync();};
 clip.onended=()=>{const delay=state?.index===0?Math.max(0,3000-(performance.now()-started)):0;waitTimer=setTimeout(()=>advance(current),delay);};
 clip.onerror=()=>blocked(current,'Recorded narration unavailable');
 captionForClip(step.audio,current);
 try{await clip.play();}catch{blocked(current,'Press Continue');}
}
export function startJarvixGuidedTour(){
 if(state||read()){state=state||read();render();return;}
 unlockOwnerSpeech();suspendJarvisForTour();
 // Tour never restores a previously active microphone over its own narration.
 try{sessionStorage.removeItem('jarvix_active');sessionStorage.setItem('jarvix_tour_seen','1');}catch{}
 state={index:0,phase:'playing',position:0,language:getJarvixLanguage()};save();void play();
}
export function pauseJarvixGuidedTour(){if(!state)return;state={...tourAction(state,'pause'),position:audio?.currentTime||state.position||0};clearAudio();save();updateJarvisState('idle');render();}
export function continueJarvixGuidedTour(){if(!state)return;unlockOwnerSpeech();state={...tourAction(state,'continue'),error:null};save();void play();}
export function stopJarvixGuidedTour(){closeTourSettings();clearAudio();state=null;save();stopAllSpeech();pauseJarvisRecognition();closeNavigation();activeFocus='';window.dispatchEvent(new Event('jarvix:tour-ended'));document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));updateJarvisState('idle');render();}
export function resumeJarvixGuidedTour(){state=read();if(!state)return false;void play();return true;}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&isTourActive())stopJarvixGuidedTour();});
 window.addEventListener('pagehide',()=>{if(state){state.position=audio?.currentTime||0;save();audio?.pause();}});
 const resume=()=>{if(location.pathname.endsWith('/jarvix-chat.html')){if(read())stopJarvixGuidedTour();return;}if(read())resumeJarvixGuidedTour();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resume,{once:true});else queueMicrotask(resume);
}
