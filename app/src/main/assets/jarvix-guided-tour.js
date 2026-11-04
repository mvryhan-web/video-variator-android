// Owner-controlled showcase: every page action precedes its own narration.
// Until the NEW voice pack is published, use the previously approved greeting only.
import {getJarvixLanguage, speakJarvis, stopAllSpeech, applySiteTheme, pauseJarvisRecognition, updateJarvisState, resumeJarvisRecognition} from './jarvis-core.js';
import {OWNER_GREETING_TEXT} from './jarvix-owner-speech.js';
const KEY='jarvix_showcase_v2';
let running=false, audio=null, version=0;
export function isTourActive(){return running;}
function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{return null;}}
function write(state){try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function restore(state){if(state)applySiteTheme(state.originalTheme||'default');}
function clear(){try{sessionStorage.removeItem(KEY);}catch{}}
function finish(state){running=false;clear();restore(state);updateJarvisState('listening');resumeJarvisRecognition();}
async function playStep(state){
 const turn=++version;running=true;stopAllSpeech();pauseJarvisRecognition();
 const step=state.steps[state.index];
 if(!step){finish(state);return;}
 if(step.url){
  const target=new URL(step.url,location.href);
  if(target.pathname!==location.pathname||target.search!==location.search){write(state);location.assign(target.href);return;}
 }
 if(step.restore)restore(state);else if(step.theme)applySiteTheme(step.theme);
 const clip=new Audio(step.audio);audio=clip;
 // No speed/pitch/effects processing. Voice production belongs to AntiGravity.
 clip.playbackRate=1;clip.preservesPitch=true;
 const next=()=>{if(turn!==version||!running)return;audio=null;state.index++;write(state);playStep(state);};
 clip.onplay=()=>{if(turn===version&&running)updateJarvisState('speaking');};
 clip.onended=next;
 clip.onerror=()=>{if(turn===version)finish(state);};
 try{await clip.play();}catch{if(turn===version)finish(state);}
}
export async function startJarvixGuidedTour(){
 if(running)return;
 stopAllSpeech();running=true;const turn=++version;
 let pack=null;
 try{const response=await fetch('media/jarvix/jarvix-showcase-v2.json',{cache:'no-cache'});if(response.ok)pack=await response.json();}catch{}
 if(turn!==version||!running)return;
 const language=getJarvixLanguage();
 const steps=pack?.languages?.[language];
 if(pack?.ready!==true||!Array.isArray(steps)||!steps.length||steps.some(s=>!/^media\/jarvix\/clips\/jarvix_showcase_(ru|en|fr|es)_\d{2}\.mp3$/.test(s.audio))){
  running=false;
  // Roll back to the earlier, owner-approved, natural introduction recording.
  speakJarvis(OWNER_GREETING_TEXT[language]||OWNER_GREETING_TEXT.en);
  return;
 }
 let originalTheme=null;try{originalTheme=localStorage.getItem('deepsyq_site_theme');}catch{}
 const state={steps,index:0,language,originalTheme};write(state);playStep(state);
}
export function resumeJarvixGuidedTour(){
 const state=read();if(!state?.steps?.length)return false;
 playStep(state);return true;
}
export function stopJarvixGuidedTour(){
 version++;running=false;
 if(audio){audio.onended=null;audio.onerror=null;audio.onplay=null;audio.pause();audio=null;}
 const state=read();clear();restore(state);stopAllSpeech();
}
