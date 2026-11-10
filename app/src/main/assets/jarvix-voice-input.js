import {createSpeechDraft} from './jarvix-speech-draft.js';

// Isolated browser dictation controller for the existing JARVIX text composer.
// Stop keeps the draft; Send awaits final speech results before the caller submits.
export function bindVoiceInput({mic,input,form,onError,getRecognizer=()=>window.SpeechRecognition||window.webkitSpeechRecognition,getLanguage=()=>document.documentElement.lang.slice(0,2)}){
 const wave=document.createElement('span');
 wave.className='j-voice-waves';
 wave.hidden=true;
 wave.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++){const bar=document.createElement('span');wave.append(bar);}
 mic.before(wave);
 const initialRequired=input.required;
 let active=null;
 const labels={
  ru:{start:'Включить микрофон',stop:'Остановить запись, оставить текст'},
  en:{start:'Start voice dictation',stop:'Stop recording and keep text'},
  fr:{start:'Démarrer la dictée',stop:'Arrêter et garder le texte'},
  es:{start:'Iniciar dictado',stop:'Detener y conservar texto'}
 };
 const language=()=>{
  const code=String(getLanguage()||'').slice(0,2);
  if(labels[code])return code;
  const nav=((navigator.languages&&navigator.languages[0])||navigator.language||'').slice(0,2);
  return labels[nav]?nav:'ru';
 };
 function display(listening){
  wave.hidden=!listening;
  form.classList.toggle('j-voice-recording',listening);
  mic.dataset.voiceRecording=String(listening);
  mic.setAttribute('aria-pressed',String(listening));
  mic.setAttribute('aria-label',labels[language()][listening?'stop':'start']);
  mic.title=labels[language()][listening?'stop':'start'];
  // Allow Send to stop and collect final text even before a first interim result.
  input.required=listening?false:initialRequired;
 }
 function finished(current){
  if(active!==current)return;
  clearTimeout(current.timeout);
  active=null;
  display(false);
  current.resolve();
 }
 function stop({abort=false}={}){
  const current=active;
  if(!current)return Promise.resolve();
  if(!current.stopping){
   current.stopping=true;
   display(false);
   // SpeechRecognition.stop() may emit one last onresult before onend.
   // Do not discard that final transcript or submit before it arrives.
   current.timeout=setTimeout(()=>finished(current),1700);
   try{if(abort)current.recognition.abort();else current.recognition.stop();}
   catch{finished(current);}
  }
  return current.ended;
 }
 mic.onclick=()=>{
  if(active){void stop();return;}
  const Recognition=getRecognizer();
  if(!Recognition){onError('Voice input is unavailable in this browser.');return;}
  let recognition;
  try{recognition=new Recognition();}
  catch{onError('Microphone could not be started.');return;}
  const current={recognition,stopping:false,timeout:null,resolve:null,ended:null};
  current.ended=new Promise(resolve=>{current.resolve=resolve;});
  active=current;
  const base=input.value, draft=createSpeechDraft(base);
  recognition.lang=({ru:'ru-RU',en:'en-US',fr:'fr-FR',es:'es-ES'})[language()]||'ru-RU';
  recognition.interimResults=true;
  recognition.continuous=true;
  recognition.onresult=e=>{
   if(active!==current)return;
   input.value=draft(e);
   input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  recognition.onend=()=>finished(current);
  recognition.onerror=e=>{
   if(active!==current)return;
   onError('Microphone: '+(e?.error||'unavailable'));
   finished(current);
  };
  try{recognition.start();display(true);}
  catch{finished(current);onError('Microphone could not be started.');}
 };
 display(false);
 return {stop:()=>stop(),abort:()=>stop({abort:true})};
}
