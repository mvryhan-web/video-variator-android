import {getJarvixLanguage,stopAllSpeech,pauseJarvisRecognition,updateJarvisState} from './jarvis-core.js';
import {TOUR_KEY,tourPlan,tourAction} from './jarvix-tour-plan.js';
let audio=null,turn=0,bar=null,state=null;
const read=()=>{try{const s=JSON.parse(sessionStorage.getItem(TOUR_KEY)||'null');return s&&Number.isInteger(s.index)&&s.index>=0&&s.index<8&&['playing','paused'].includes(s.phase)?s:null;}catch{return null;}};
function save(){try{state?sessionStorage.setItem(TOUR_KEY,JSON.stringify(state)):sessionStorage.removeItem(TOUR_KEY);}catch{}}
export function isTourActive(){return !!state||!!read();}
function clearAudio(){turn++;if(audio){audio.onended=null;audio.onplay=null;audio.onerror=null;audio.pause();audio.remove();audio=null;}}
function spotlight(step){document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));const targets=[...document.querySelectorAll(step.target)];targets.forEach(e=>e.classList.add('jarvis-tour-spotlight'));targets[0]?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
function render(){
 if(!state){bar?.remove();bar=null;document.getElementById('topJarvisBtn')?.classList.remove('ds-tour-speaking');return;}
 if(!bar){bar=document.createElement('section');bar.className='ds-tour-controls';bar.setAttribute('aria-label','JARVIX tour controls');bar.innerHTML='<span class="ds-tour-label" aria-live="polite"></span><button type="button" data-tour="pause">Pause</button><button type="button" data-tour="continue">Continue</button><button type="button" data-tour="stop">Stop</button>';bar.querySelector('[data-tour="pause"]').onclick=pauseJarvixGuidedTour;bar.querySelector('[data-tour="continue"]').onclick=continueJarvixGuidedTour;bar.querySelector('[data-tour="stop"]').onclick=stopJarvixGuidedTour;document.body.append(bar);}
 bar.querySelector('.ds-tour-label').textContent=`JARVIX · ${tourPlan(state.language)[state.index].title} · ${state.index+1}/8${state.error?' · '+state.error:''}`;
 bar.querySelector('[data-tour="pause"]').hidden=state.phase==='paused';bar.querySelector('[data-tour="continue"]').hidden=state.phase!=='paused';
 document.getElementById('topJarvisBtn')?.classList.toggle('ds-tour-speaking',state.phase==='playing');
}
async function play(){
 if(!state)return;clearAudio();const step=tourPlan(state.language)[state.index];const target=new URL(step.url,location.href);
 render();
 if(target.pathname!==location.pathname||target.search!==location.search){save();location.assign(target.href);return;}
 spotlight(step);pauseJarvisRecognition();
 if(state.phase==='paused')return;
 const current=turn;audio=new Audio(step.audio);const clip=audio;clip.id='dsTourAudio';clip.hidden=true;document.body.append(clip);clip.playbackRate=1;
 clip.onloadedmetadata=()=>{if(state&&state.position)clip.currentTime=Math.min(state.position,Number.isFinite(clip.duration)?Math.max(0,clip.duration-.1):state.position);};
 clip.onplay=()=>{pauseJarvisRecognition();updateJarvisState('speaking');};
 clip.onended=()=>{if(current!==turn||!state)return;state=tourAction(state,'ended');save();if(state)void play();else{clearAudio();spotlight({target:'#homeQuickBar'});document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));updateJarvisState('idle');render();}};
 const blocked=()=>{if(current!==turn||!state)return;state={...state,phase:'paused',error:clip.error?'Audio unavailable':'Press Continue'};save();render();updateJarvisState('idle');};
 clip.onerror=blocked;
 try{await clip.play();}catch{blocked();}
}
export function startJarvixGuidedTour(){
 if(state||read()){state=state||read();render();return;}
 stopAllSpeech();pauseJarvisRecognition();state={index:0,phase:'playing',position:0,language:getJarvixLanguage()};save();void play();
}
export function pauseJarvixGuidedTour(){if(!state)return;state={...tourAction(state,'pause'),position:audio?.currentTime||state.position||0};audio?.pause();save();updateJarvisState('idle');render();}
export function continueJarvixGuidedTour(){if(!state)return;state={...tourAction(state,'continue'),error:null};save();void play();}
export function stopJarvixGuidedTour(){clearAudio();state=null;save();stopAllSpeech();pauseJarvisRecognition();window.dispatchEvent(new Event('jarvix:tour-ended'));document.querySelectorAll('.jarvis-tour-spotlight').forEach(e=>e.classList.remove('jarvis-tour-spotlight'));updateJarvisState('idle');render();}
export function resumeJarvixGuidedTour(){state=read();if(!state)return false;void play();return true;}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&isTourActive())stopJarvixGuidedTour();});
 window.addEventListener('pagehide',()=>{if(state){state.position=audio?.currentTime||0;save();audio?.pause();}});
 const resume=()=>{if(read())resumeJarvixGuidedTour();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resume,{once:true});else queueMicrotask(resume);
}
