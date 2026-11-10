import {getJarvixLanguage,stopAllSpeech,pauseJarvisRecognition,updateJarvisState,suspendJarvisForTour} from './jarvis-core.js';
import {speakOwnerSpeech,stopOwnerSpeech,unlockOwnerSpeech} from './jarvix-owner-speech.js';
import {TOUR_KEY,tourAction,tourCues,cueAt,tourNavigationClip,planNarrationBeats,sectionNarrationBeats} from './jarvix-tour-plan.js';
import {tourV3Plan as tourPlan} from './jarvix-tour-v3-script.js';
import {getTourV3Recording} from './jarvix-tour-v3-audio.js';
let audio=null,turn=0,bar=null,state=null,navTimer=null,waitTimer=null,stepWaitKey=null,stepWaitStart=0,activeFocus='',tourSettingsOpened=false;
let transcriptPromise=null,tourSpeaking=false,cueTimer=null;
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
function setTourSpeaking(active){
 tourSpeaking=Boolean(active);
 const playing=tourSpeaking&&state?.phase==='playing';
 document.getElementById('topJarvisBtn')?.classList.toggle('ds-tour-speaking',Boolean(playing));
 // The original orb state, not only the Tour decoration, must be silent between clips.
 updateJarvisState(playing?'speaking':'idle');
}
function clearAudio(){turn++;clearTimeout(navTimer);clearTimeout(waitTimer);clearTimeout(cueTimer);setTourSpeaking(false);stopOwnerSpeech();if(audio){audio.onended=null;audio.onplay=null;audio.onplaying=null;audio.onwaiting=null;audio.onpause=null;audio.onerror=null;audio.ontimeupdate=null;audio.pause();audio.remove();audio=null;}}
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
 if(!state){document.body.classList.remove('ds-tour-active');bar?.remove();bar=null;document.getElementById('topJarvisBtn')?.classList.remove('ds-tour-speaking');return;}
 document.body.classList.add('ds-tour-active');
 const lang=state.language;const texts={ru:['Пауза','Продолжить','Стоп'],en:['Pause','Continue','Stop'],fr:['Pause','Continuer','Arrêter'],es:['Pausa','Continuar','Parar']}[lang]||['Pause','Continue','Stop'];
 if(!bar){bar=document.createElement('section');bar.className='ds-tour-controls';bar.setAttribute('aria-label','JARVIX tour controls');bar.innerHTML='<button type="button" data-tour="pause"></button><button type="button" data-tour="continue"></button><button type="button" data-tour="stop"></button>';bar.querySelector('[data-tour="pause"]').onclick=pauseJarvixGuidedTour;bar.querySelector('[data-tour="continue"]').onclick=continueJarvixGuidedTour;bar.querySelector('[data-tour="stop"]').onclick=stopJarvixGuidedTour;document.body.append(bar);}
 bar.setAttribute('aria-label',`JARVIX · ${tourPlan(lang)[state.index].title} · ${state.index+1}/${tourPlan(lang).length}${state.error?' · '+state.error:''}`);
 for(const [i,key]of ['pause','continue','stop'].entries()){const b=bar.querySelector(`[data-tour="${key}"]`);b.textContent=texts[i];b.title=state.error||texts[i];}
 bar.querySelector('[data-tour="pause"]').hidden=state.phase==='paused';bar.querySelector('[data-tour="continue"]').hidden=state.phase!=='paused';
 bar.dataset.error=state.error||'';document.getElementById('topJarvisBtn')?.classList.toggle('ds-tour-speaking',state.phase==='playing'&&tourSpeaking);
}
function advance(current){if(current!==turn||!state||state.phase!=='playing')return;closeTourSettings();state=tourAction(state,'ended');save();if(state)void play();else{clearAudio();document.querySelectorAll('.jarvis-tour-spotlight,.ds-tour-drawer-target').forEach(e=>e.classList.remove('jarvis-tour-spotlight','ds-tour-drawer-target'));activeFocus='';updateJarvisState('idle');render();window.dispatchEvent(new Event('jarvix:tour-ended'));}}
function blocked(current,message='Audio unavailable'){if(current!==turn||!state)return;setTourSpeaking(false);state={...state,phase:'paused',error:message};save();render();updateJarvisState('idle');}

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
// Approved V3: all speech uses the existing JARVIX owner voice, never browser TTS.
// A beat is complete only once its spoken recording ends, then the next action starts.
const v3DialogsOpened=new Set();
function closeTourChild(id){
 const dialog=document.getElementById(id);
 const wasOpen=Boolean(dialog?.open);
 if(wasOpen){
  // Close the actual child with its X while the parent is still hidden;
  // restoring a parent before its open child closes caused stacked dialogs.
  const x=dialog.querySelector('[data-close="'+id+'"]');
  x?.click();
  if(dialog.open)dialog.close();
 }
 v3DialogsOpened.delete(id);
 if(wasOpen)document.getElementById('studioSettingsHub')?.style.removeProperty('visibility');
}
function closeV3Dialogs(){
 for(const id of ['modelDialog','settingsDialog'])closeTourChild(id);
 for(const id of [...v3DialogsOpened])closeTourChild(id);
 const hub=document.getElementById('studioSettingsHub');
 if(hub?.open&&tourSettingsOpened){
  hub.style.removeProperty('visibility');
  hub.querySelector('button[aria-label]')?.click();
  if(hub.open)hub.close();
 }
 v3DialogsOpened.clear();tourSettingsOpened=false;
}
function studioTourMode(step){
 return step.title==='Video'?'video':step.title==='Audio'?'audio':null;
}
function enterStudioFromPlus(step,target,current){
 const mode=studioTourMode(step);
 if(!mode||location.pathname!==target.pathname||!location.pathname.endsWith('/generate-studio.html'))return false;
 const kind=mode==='audio'?'music':mode;
 const real=document.querySelector('.studio-nav [data-kind="'+kind+'"]');
 if(real?.getAttribute('aria-pressed')==='true'){
  // Studio's native select() changes its live state but intentionally does not
  // change the URL; keep browser back/refresh + narration route in sync.
  if(location.search!==target.search)history.replaceState(null,'',target.href);
  return false;
 }
 const plus=document.getElementById('jPlus');
 const menu=document.getElementById('jPlusMenu');
 const choice=menu?.querySelector('[data-j-mode="'+mode+'"]');
 if(!plus||!menu||!choice||!real){
  const key='studio-plus:'+step.title;
  if(stepWaitKey!==key){stepWaitKey=key;stepWaitStart=Date.now();}
  if(Date.now()-stepWaitStart<5000)
   waitTimer=setTimeout(()=>{if(current===turn&&state?.phase==='playing')void play();},150);
  else blocked(current,'Studio menu unavailable');
  return true;
 }
 closeV3Dialogs();
 spotlight({target:'#jPlus'});
 if(menu.hidden)plus.click();
 if(menu.hidden){blocked(current,'Studio menu unavailable');return true;}
 navTimer=setTimeout(()=>{
  if(current!==turn||state?.phase!=='playing')return;
  spotlight({target:'#jPlusMenu [data-j-mode="'+mode+'"]'});
  navTimer=setTimeout(()=>{
   if(current!==turn||state?.phase!=='playing')return;
   choice.click(); // Native Universal Hub selects existing Studio mode. No Generate/paid API.
   if(real.getAttribute('aria-pressed')!=='true'){blocked(current,'Studio mode unavailable');return;}
   if(location.search!==target.search)history.replaceState(null,'',target.href);
   navTimer=setTimeout(()=>{if(current===turn&&state?.phase==='playing')void play();},120);
  },180);
 },180);
 return true;
}
function cueV3(beat){
 const currentStep=state&&tourPlan(state.language)[state.index];
 if(currentStep&&studioTourMode(currentStep)){
  // Video and Audio use the REAL + menu and the REAL gear/X handlers.
  // Only one settings window is visible: the parent hub is temporarily
  // invisible while a child popover is displayed, without changing Studio UI.
  if(beat.action==='openModel'||beat.action==='openSettings'){
   closeTourChild('modelDialog');closeTourChild('settingsDialog');
   const hub=document.getElementById('studioSettingsHub'),gear=document.getElementById('studioSettingsToggle');
   if(!hub||!gear){spotlight(beat);return;}
   hub.style.removeProperty('visibility');
   spotlight({target:'#studioSettingsToggle'});
   if(!hub.open){
    gear.click();
    tourSettingsOpened=hub.open;
    if(hub.open&&hub.matches(':modal')){hub.close();hub.show();}
   }
   const id=beat.action==='openModel'?'modelDialog':'settingsDialog';
   const button=document.getElementById(beat.action==='openModel'?'modelButton':'settingsButton');
   const started=turn;
   // A short, audio-relative cue exposes the highlighted gear before the
   // native child menu appears. For tiny QA clips it stays below their duration.
   const delay=Math.min(170,Math.max(15,(Number(audio?.duration)||1)*125));
   clearTimeout(cueTimer);cueTimer=setTimeout(()=>{
    if(started!==turn||state?.phase!=='playing'||!hub.open||!button)return;
    spotlight({target:'#'+button.id});
    button.click();
    const panel=document.getElementById(id);
    if(panel?.open){
     v3DialogsOpened.add(id);
     if(panel.matches(':modal')){panel.close();panel.show();}
     // Prevent the parent and child from looking like stacked windows.
     hub.style.visibility='hidden';
     spotlight({target:'#'+id});
    }
   },delay);
   return;
  }
  if(beat.action==='closeSettings')closeV3Dialogs();
  spotlight(beat);
  return;
 }
 // Keep the previously approved Image and all other sections unchanged.
 if(beat.action==='openModel'||beat.action==='openSettings'){
  const hub=document.getElementById('studioSettingsHub');
  if(hub&&!hub.open){hub.show();tourSettingsOpened=true;}
  const name=beat.action==='openModel'?'modelButton':'settingsButton';
  const button=document.getElementById(name);
  const expected=beat.action==='openModel'?'modelDialog':'settingsDialog';
  if(button?.getClientRects().length){
   const dialog=document.getElementById(expected);
   if(dialog&&!dialog.open)v3DialogsOpened.add(expected);
   button.click();
   if(dialog?.open&&dialog.matches(':modal')){dialog.close();dialog.show();}
  }
 }else if(beat.action==='closeSettings')closeV3Dialogs();
 const shown=spotlight(beat);
 if(!shown&&beat.action==='openSettings')spotlight({target:'#studioSettingsToggle,#settingsButton'});
}
async function speakV3(text,current,complete,beat=null){
 try{
  const voice=await getTourV3Recording(text,state?.language||'en');
  if(current!==turn||!state||state.phase!=='playing')return;
  let spoken=false,ended=false;
  const began=()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   setTourSpeaking(true);
   if(spoken)return;
   spoken=true;
   if(beat)cueV3(beat);
  };
  const done=()=>{
   if(ended||current!==turn||!state||state.phase!=='playing')return;
   ended=true;setTourSpeaking(false);complete();
  };
  if(voice){
   audio=new Audio(voice);const clip=audio;clip.id='dsTourAudio';clip.hidden=true;document.body.append(clip);
   // Pause/Continue resumes the actual owner clip without replaying narration.
   clip.onloadedmetadata=()=>{
    if(current!==turn||!state)return;
    const seconds=Number(state.position)||0;
    if(seconds>0&&Number.isFinite(clip.duration)&&clip.duration>0)
     clip.currentTime=Math.min(seconds,Math.max(0,clip.duration-.05));
   };
   // `play` fires before any audible samples; `playing` only when buffered media begins.
   clip.onplaying=began;
   clip.onwaiting=()=>{if(current===turn&&state?.phase==='playing')setTourSpeaking(false);};
   clip.onpause=()=>{if(current===turn)setTourSpeaking(false);};
   clip.onended=()=>{clip.remove();if(audio===clip)audio=null;done();};
   clip.onerror=()=>blocked(current,'Owner voice recording unavailable');
   void clip.play().catch(()=>blocked(current,'Press Continue'));
  }else{
   // The existing pinned VoxCPM2 narrator is the ONLY permitted live fallback.
   // Missing voice service must not silently switch to an unrelated system voice.
   void speakOwnerSpeech(text,state.language,{
    // A TTS preflight is not sound; light the sphere only while audio is playing.
    start:()=>{},
    phase:phase=>{if(phase==='playing')began();else if(phase==='generating')setTourSpeaking(false);},
    complete:done,
    fallback:()=>blocked(current,'Owner VoxCPM2 voice unavailable'),
    error:()=>blocked(current,'Owner VoxCPM2 voice unavailable')
   });
  }
 }catch{blocked(current,'Owner voice recording unavailable');}
}
function isSamePage(p1,p2){
 const norm=p=>(p||'/').replace(/^\/(?:deepsyq|index)\.html$/,'/');
 return norm(p1)===norm(p2);
}
function playV3(step,target,current){
 if(!state||state.phase!=='playing')return;
 // Image is the original entry page. Video and Audio are demonstrated by
 // the EXISTING Universal Hub '+' and selected in-place, never by a reload
 // that could cut the final syllable of a recorded owner voice.
 if(enterStudioFromPlus(step,target,current))return;
 if(!isSamePage(target.pathname,location.pathname)||target.search!==location.search){
  // Navigate FIRST: title MP3 must not announce a section on the previous page.
  closeV3Dialogs();
  const link=showNavigation(step.url);
  navTimer=setTimeout(()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   if(link&&new URL(link.href).pathname===target.pathname&&new URL(link.href).search===target.search&&
      new URL(link.href).hash===target.hash)link.click();
   else location.assign(target.href);
  },120);
  return;
 }
 closeNavigation();pauseJarvisRecognition();
 const index=Math.min(state.beat||0,step.beats.length);
 if(index===step.beats.length){closeV3Dialogs();advance(current);return;}
 const beat=step.beats[index];
 // Destination title waits for visible content, then the beat matches its control.
 if(step.navText&&state.navAnnounced!==state.index){
  const key=location.pathname+location.search+':v3:nav:'+state.index;
  if(![...document.querySelectorAll(step.beats[0].target)].some(el=>el.getClientRects().length)){
   if(stepWaitKey!==key){stepWaitKey=key;stepWaitStart=Date.now();}
   if(Date.now()-stepWaitStart<5000)
    waitTimer=setTimeout(()=>{if(current===turn&&state)void play();},150);
   else blocked(current,'Tour section unavailable');
   return;
  }
  void speakV3(step.navText,current,()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   state.navAnnounced=state.index;state.position=0;save();void play();
  });
  return;
 }
 if(!document.querySelector(beat.target)){
  const key=location.pathname+location.search+':v3:'+state.index+':'+index;
  if(stepWaitKey!==key){stepWaitKey=key;stepWaitStart=Date.now();}
  if(Date.now()-stepWaitStart<5000){
   waitTimer=setTimeout(()=>{if(current===turn&&state)void play();},150);
  }else blocked(current,'Tour control unavailable');
  return;
 }
 void speakV3(beat.text,current,()=>{
  if(current!==turn||!state||state.phase!=='playing')return;
  state.beat=index+1;state.position=0;save();void play();
 },beat);
}
async function play(){
 if(!state)return;clearAudio();activeFocus='';const current=turn,step=tourPlan(state.language)[state.index],target=new URL(step.url,location.href);render();
 if(step.narration==='v3'){playV3(step,target,current);return;}
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
 unlockOwnerSpeech();
 suspendJarvisForTour();
 // Tour never restores a previously active microphone over its own narration.
 try{sessionStorage.removeItem('jarvix_active');sessionStorage.setItem('jarvix_tour_seen','1');}catch{}
 state={index:0,phase:'playing',position:0,beat:0,navAnnounced:-1,language:getJarvixLanguage()};
 save();
 render();
 void play();
}
export function pauseJarvixGuidedTour(){if(!state)return;state={...tourAction(state,'pause'),position:audio?.currentTime||state.position||0};clearAudio();save();updateJarvisState('idle');render();}
export function continueJarvixGuidedTour(){if(!state)return;unlockOwnerSpeech();state={...tourAction(state,'continue'),error:null};save();void play();}
export function stopJarvixGuidedTour(){closeV3Dialogs();clearAudio();state=null;save();stopAllSpeech();pauseJarvisRecognition();closeNavigation();activeFocus='';window.dispatchEvent(new Event('jarvix:tour-ended'));document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));updateJarvisState('idle');render();}
export function resumeJarvixGuidedTour(){state=read();if(!state)return false;void play();return true;}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&isTourActive())stopJarvixGuidedTour();});
 window.addEventListener('pagehide',()=>{if(state){state.position=audio?.currentTime||0;save();audio?.pause();}});
 const resume=()=>{if(location.pathname.endsWith('/jarvix-chat.html')){if(read())stopJarvixGuidedTour();return;}if(read())resumeJarvixGuidedTour();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resume,{once:true});else queueMicrotask(resume);
}
