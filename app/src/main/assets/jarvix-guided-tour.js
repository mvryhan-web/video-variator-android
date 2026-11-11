import {getJarvixLanguage,stopAllSpeech,pauseJarvisRecognition,updateJarvisState,suspendJarvisForTour} from './jarvis-core.js';
import {speakOwnerSpeech,stopOwnerSpeech,unlockOwnerSpeech,TOUR_GREETING_TEXT} from './jarvix-owner-speech.js';
import {TOUR_KEY,tourAction,tourCues,cueAt,tourNavigationClip,planNarrationBeats,sectionNarrationBeats} from './jarvix-tour-plan.js';
import {tourV3Plan as tourPlan} from './jarvix-tour-v3-script.js';
import {getTourV3Recording} from './jarvix-tour-v3-audio.js';
import {getTourV4Recording,v4BeatId} from './jarvix-tour-v4-audio.js';
import {installTourFocus,showTourElement,performTourDemo,endTourFocus} from './jarvix-tour-choreography.js';
let audio=null,turn=0,bar=null,state=null,navTimer=null,waitTimer=null,stepWaitKey=null,stepWaitStart=0,activeFocus='',tourSettingsOpened=false;
let transcriptPromise=null,tourSpeaking=false,cueTimer=null,narrationTimer=null;
const pauseFrame=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function speakOptionalTourV4(id,current){
 const approved=await getTourV4Recording(id,state?.language||'ru');
 if(!approved||current!==turn||state?.phase!=='playing')return false;
 caption(approved.text);
 const player=new Audio(approved.url);audio=player;player.id='dsTourAudio';player.hidden=true;document.body.append(player);
 let finished=false;
 await new Promise(resolve=>{
  let timeout=null;
  const finish=()=>{if(finished)return;finished=true;clearTimeout(timeout);setTourSpeaking(false);player.pause();player.remove();if(audio===player)audio=null;resolve();};
  player.onplaying=()=>{if(current===turn&&state?.phase==='playing')setTourSpeaking(true);};
  player.onended=finish;player.onerror=finish;
  timeout=setTimeout(finish,45000);
  void player.play().catch(finish);
 });
 return current===turn&&state?.phase==='playing';
}
const clipTranscript=file=>{
 transcriptPromise ||= fetch('/media/jarvix/clips/manifest.json',{signal:AbortSignal.timeout(5000)})
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
function clearAudio(){turn++;clearTimeout(navTimer);clearTimeout(waitTimer);clearTimeout(cueTimer);clearTimeout(narrationTimer);endTourFocus();setTourSpeaking(false);stopOwnerSpeech();if(audio){audio.onended=null;audio.onplay=null;audio.onplaying=null;audio.onwaiting=null;audio.onpause=null;audio.onerror=null;audio.ontimeupdate=null;audio.pause();audio.remove();audio=null;}}
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
 // A paused tour used to look like it had silently stopped. Show the exact
 // playback/navigation problem above the existing Pause/Continue controls.
 let errorNotice=bar.querySelector('.ds-tour-error');
 if(!errorNotice){
  errorNotice=document.createElement('span');
  errorNotice.className='ds-tour-error';
  errorNotice.setAttribute('role','status');
  errorNotice.style.cssText='position:absolute;bottom:calc(100% + 8px);left:0;right:0;max-width:min(92vw,430px);margin:auto;padding:8px 11px;border:1px solid #825d91;border-radius:10px;background:#15192d;color:#f5e7ff;font:500 12px/1.4 system-ui,sans-serif;text-align:center;white-space:normal;';
  bar.append(errorNotice);
 }
 errorNotice.hidden=!state.error;
 errorNotice.textContent=state.error||'';
 for(const [i,key]of ['pause','continue','stop'].entries()){const b=bar.querySelector(`[data-tour="${key}"]`);b.textContent=texts[i];b.title=state.error||texts[i];}
 bar.querySelector('[data-tour="pause"]').hidden=state.phase==='paused';bar.querySelector('[data-tour="continue"]').hidden=state.phase!=='paused';
 bar.dataset.error=state.error||'';
 if(!bar.querySelector('.ds-tour-caption')){
  const line=document.createElement('p');line.className='ds-tour-caption';line.setAttribute('aria-live','polite');
  line.style.cssText='position:absolute;bottom:calc(100% + 8px);left:0;right:0;margin:auto;max-width:min(92vw,550px);padding:10px 12px;background:rgba(11,17,32,.94);border:1px solid rgba(245,181,81,.55);border-radius:10px;color:#fff;font:500 13px/1.5 system-ui,sans-serif;text-align:center;';
  bar.append(line);
 }
 bar.querySelector('.ds-tour-caption').hidden=!!state.error;
 document.getElementById('topJarvisBtn')?.classList.toggle('ds-tour-speaking',state.phase==='playing'&&tourSpeaking);
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
const homeMediaCards={Image:'.tile-image',Video:'.tile-video',Audio:'.tile-audio'};
function homeMediaTourStep(step){
 const card=homeMediaCards[step.title];
 if(!card)return step;
 const targets=[`#homeCreativeTools ${card},#homeQuickBar`,'#studioSettingsBtn','#studioSettingsBtn','#homeQuickSubmit'];
 return {...step,url:'deepsyq.html',beats:step.beats.map((beat,index)=>({
  ...beat,target:targets[index]||'#homeQuickBar',action:'focus'
 }))};
}
async function cueV3(beat){
 const initial=turn;
 const canContinue=()=>initial===turn&&state?.phase==='playing';
 installTourFocus();
 const first=beat.action==='openModel'?'#modelButton':beat.action==='openSettings'?'#settingsButton':beat.target;
 await showTourElement(first,canContinue,1250);
 if(!canContinue())return;
 if(beat.action==='openModel'||beat.action==='openSettings'){
  closeV3Dialogs();
  const name=beat.action==='openModel'?'modelButton':'settingsButton';
  const button=document.getElementById(name);
  const expected=beat.action==='openModel'?'modelDialog':'settingsDialog';
  // Studio keeps its native controls inside a closed settings dialog.
  if(button&&!button.disabled){
   const dialog=document.getElementById(expected);
   if(dialog&&!dialog.open)v3DialogsOpened.add(expected);
   button.click();
   if(dialog?.open&&dialog.matches(':modal')){dialog.close();dialog.show();}
  }
 }else if(beat.action==='closeSettings')closeV3Dialogs();
 spotlight(beat);
 await pauseFrame(1200);
}
async function speakV3(text,current,complete,beat=null){
 try{
  // Keep the original Home greeting. The final upgrade plays once after the closing beat.
  const firstWelcome=state?.index===0 && (state?.beat||0)===0;
  const step=tourPlan(state.language)[state.index];
  const v4id=!firstWelcome&&beat?v4BeatId(step.title,state.beat||0):null;
  const v4=v4id?await getTourV4Recording(v4id,state.language):null;
  const narration=firstWelcome?TOUR_GREETING_TEXT[state.language]:v4?.text||text;
  let voice=firstWelcome
   ? (state.language==='ru'?step.audio+'?v=20261111-v4b':step.audio)
   : v4?.url||await getTourV3Recording(text,state?.language||'en');
  if(voice&&!voice.startsWith('/')&&!voice.startsWith('http'))voice='/'+voice;
  if(current!==turn||!state||state.phase!=='playing')return;
  let spoken=false,ended=false,cueWork=Promise.resolve();
  const began=()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   setTourSpeaking(true);
   if(spoken)return;
   spoken=true;
   caption(narration); // Actual approved V4 line when recorded; otherwise matching V3.
   if(beat){
    const title=tourPlan(state.language)[state.index]?.title;
    const idx=state.beat||0;
    cueWork=(async()=>{
     await cueV3(beat);
     if(current!==turn||state?.phase!=='playing')return;
     // The Clone handoff is a post-narration action so no MP3 is cut off
     // when the existing Inspiration button changes the page.
     if(!(title==='Inspiration'&&idx===1))
      await performTourDemo(title,idx,()=>current===turn&&state?.phase==='playing');
    })().catch(()=>{});
   }
  };
  const done=()=>{
   if(ended||current!==turn||!state||state.phase!=='playing')return;
   ended=true;clearTimeout(narrationTimer);setTourSpeaking(false);
   void (async()=>{
    await cueWork;
    if(current!==turn||state?.phase!=='playing')return;
    const step=tourPlan(state.language)[state.index];
    if(step?.title==='Inspiration'&&(state.beat||0)===1){
     await performTourDemo('Inspiration',1,()=>current===turn&&state?.phase==='playing',{
      beforeClone:()=>{
       if(current!==turn||state?.phase!=='playing')return false;
       state.beat=2;state.cloneHandoff=true;save();return true;
      }
     });
    }
    await pauseFrame(600);
    if(current===turn&&state?.phase==='playing')complete();
   })();
  };
  const showWithoutAudio=()=>{
   if(ended||current!==turn||state?.phase!=='playing')return;
   if(firstWelcome){clearTimeout(narrationTimer);blocked(current,'Owner greeting could not play. Press Continue to retry.');return;}
   if(!spoken){
    began();
    setTourSpeaking(false);
    cueWork=Promise.all([cueWork,pauseFrame(2200)]);
   }
   done();
  };
  narrationTimer=setTimeout(showWithoutAudio,35000);
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
   clip.onerror=showWithoutAudio;
   void clip.play().catch(async error=>{
    if(ended||current!==turn||state?.phase!=='playing')return;
    if(error?.name==='AbortError'){
     await pauseFrame(250);
     if(ended||current!==turn||state?.phase!=='playing')return;
     try{await clip.play();return;}catch{}
    }
    showWithoutAudio();
   });
  }else{
   // The existing pinned VoxCPM2 narrator is the ONLY permitted live fallback.
   // Missing voice service must not silently switch to an unrelated system voice.
   void speakOwnerSpeech(text,state.language,{
    // A TTS preflight is not sound; light the sphere only while audio is playing.
    start:()=>{},
    phase:phase=>{if(phase==='playing')began();else if(phase==='generating')setTourSpeaking(false);},
    complete:done,
    fallback:showWithoutAudio,
    error:showWithoutAudio
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
 if(!isSamePage(target.pathname,location.pathname)||target.search!==location.search){
  // Navigate FIRST: title MP3 must not announce a section on the previous page.
  closeV3Dialogs();
  showNavigation(step.url);
  // At most ONE full-page navigation for this stage. A stale route, redirect,
  // or intercepted sidebar handler must not cause a reload loop.
  if(state.pendingRoute?.index===state.index&&state.pendingRoute?.href===target.href){
   blocked(current,'Tour page could not be opened. Press Continue to retry.');
   return;
  }
  state.pendingRoute={index:state.index,href:target.href};
  save();
  navTimer=setTimeout(()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   try{location.assign(target.href);}catch{blocked(current,'Tour page could not be opened.');}
  },120);
  return;
 }
 if(state.pendingRoute?.index===state.index){
  // Let the newly opened page settle before the next introduction.
  state.pendingRoute=null;save();
  waitTimer=setTimeout(()=>{if(current===turn&&state?.phase==='playing')void play();},1150);
  return;
 }
 closeNavigation();pauseJarvisRecognition();
 const index=Math.min(state.beat||0,step.beats.length);
 if(index===step.beats.length){
  closeV3Dialogs();
  // Do not play the obsolete Trial recording saying it is unavailable:
  // the owner's current plans are active.
  if(step.title==='Home'&&state.index===tourPlan(state.language).length-1){
   const closing={
    ru:'Это была бесплатная демонстрация JARVIX. Basic, Pro и Business помогут выбрать возможности под ваши задачи. Посмотрите тарифы и начните создавать больше.',
    en:'This was a free JARVIX tour. Explore Basic, Pro and Business to find the right tools for your projects.',
    fr:'Cette visite gratuite de JARVIX est terminée. Découvrez Basic, Pro et Business pour choisir les outils adaptés à vos projets.',
    es:'Esta visita gratuita de JARVIX ha terminado. Descubre Basic, Pro y Business para elegir las herramientas para tus proyectos.'
   }[state.language];
   void (async()=>{
    const line=await getTourV4Recording('final-upgrade',state.language);
    caption(line?.text||closing);
    await showTourElement('#topPricing,[href="pricing.html"]',()=>current===turn&&state?.phase==='playing',2200);
    if(current!==turn||state?.phase!=='playing')return;
    const spoken=await speakOptionalTourV4('final-upgrade',current);
    if(!spoken)await pauseFrame(4300); // Text only until matching VoxCPM2 file is delivered.
    if(current===turn&&state?.phase==='playing')advance(current);
   })().catch(()=>{if(current===turn&&state?.phase==='playing')advance(current);});
   return;
  }
  advance(current);return;
 }
 if(step.title==='trial'){
  // The old speech explicitly says Trial cannot be purchased, which is
  // no longer true. Show the live card without playing a false statement.
  caption({ru:'Trial — ознакомительный план. Актуальные условия смотрите на этой странице.',en:'Trial — introductory plan. See the current terms on this page.',fr:'Trial — offre de découverte. Consultez les conditions sur cette page.',es:'Trial — plan introductorio. Consulta las condiciones actuales en esta página.'}[state.language]);
  void showTourElement('.price-plan.price-trial',()=>current===turn&&state?.phase==='playing',1600)
   .then(()=>{if(current===turn&&state?.phase==='playing')advance(current);});
  return;
 }
 const beat=step.beats[index];
 // Destination title waits for visible content, then the beat matches its control.
 if(step.navText&&state.navAnnounced!==state.index){
  const key=location.pathname+location.search+':v3:nav:'+state.index;
  if(![...document.querySelectorAll(step.beats[0].target)].some(el=>el.getClientRects().length)){
   if(stepWaitKey!==key){stepWaitKey=key;stepWaitStart=Date.now();}
   if(Date.now()-stepWaitStart<1800){
    waitTimer=setTimeout(()=>{if(current===turn&&state)void play();},150);
    return;
   }
   // The site's control may have been renamed. Keep the original recorded
   // narration and continue on the existing page instead of stalling.
  }
  void speakV3(step.navText,current,()=>{
   if(current!==turn||!state||state.phase!=='playing')return;
   state.navAnnounced=state.index;state.position=0;save();void play();
  });
  return;
 }
 let actualBeat=beat;
 if(!document.querySelector(beat.target)){
  const key=location.pathname+location.search+':v3:'+state.index+':'+index;
  if(stepWaitKey!==key){stepWaitKey=key;stepWaitStart=Date.now();}
  if(Date.now()-stepWaitStart<1800){
   waitTimer=setTimeout(()=>{if(current===turn&&state)void play();},150);
   return;
  }
  // Avoid clicking a nonexistent button or substituting a different action.
  // A read-only spotlight on the existing page is safe and keeps the tour going.
  actualBeat={...beat,target:document.querySelector('main')?'main':'body',action:'focus'};
 }
 void speakV3(beat.text,current,()=>{
  if(current!==turn||!state||state.phase!=='playing')return;
  state.beat=index+1;state.position=0;save();void play();
 },actualBeat);
}
async function play(){
 if(!state)return;clearAudio();activeFocus='';const current=turn,step=homeMediaTourStep(tourPlan(state.language)[state.index]),target=new URL(step.url,location.href);render();
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
export function continueJarvixGuidedTour(){if(!state)return;unlockOwnerSpeech();state={...tourAction(state,'continue'),error:null,pendingRoute:null};save();void play();}
export function stopJarvixGuidedTour(){closeV3Dialogs();clearAudio();state=null;save();stopAllSpeech();pauseJarvisRecognition();closeNavigation();activeFocus='';window.dispatchEvent(new Event('jarvix:tour-ended'));document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));updateJarvisState('idle');render();}
export function resumeJarvixGuidedTour(){if(state)return true;state=read();if(!state)return false;void play();return true;}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&isTourActive())stopJarvixGuidedTour();});
 window.addEventListener('pagehide',()=>{if(state){state.position=audio?.currentTime||0;save();audio?.pause();}});
 const resume=()=>{
  if(location.pathname.endsWith('/jarvix-chat.html')){
   const checkpoint=read();
   if(!checkpoint?.cloneHandoff){if(checkpoint)stopJarvixGuidedTour();return;}
   // Only the explicit Inspiration Clone & Try handoff may temporarily
   // show the guided overlay in JARVIX Chat. No chat handlers are changed.
   state=checkpoint;state.cloneHandoff=false;save();render();
   void (async()=>{
    const active=()=>!!state&&state.phase==='playing'&&state.index===11;
    const captionText={
     ru:'Здесь вы можете создать собственное изображение или видео по понравившемуся примеру.',
     en:'Here you can create your own image or video based on the example you liked.',
     fr:'Vous pouvez créer ici une image ou une vidéo à partir de votre exemple préféré.',
     es:'Aquí puedes crear tu propia imagen o vídeo a partir del ejemplo elegido.'
    }[state.language]||'Create your own image or video here.';
    await pauseFrame(650);
    if(!active())return;
    await showTourElement('#jMessages',active,1700);
    if(!active())return;
    const recorded=await speakOptionalTourV4('clone-arrival',turn);
    if(!recorded){caption(captionText);await pauseFrame(3000);}
    // No JARVIX Chat source modifications or chat actions.
    if(!active())return;
    state=tourAction(state,'ended');
    save();if(state)void play();else{clearAudio();render();}
   })().catch(()=>{if(state)blocked(turn,'Inspiration handoff unavailable');});
   return;
  }
  if(read())resumeJarvixGuidedTour();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resume,{once:true});else queueMicrotask(resume);
}
