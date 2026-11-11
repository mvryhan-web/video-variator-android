import {createSpeechDraft} from './jarvix-speech-draft.js';
import {pauseJarvisRecognition, resumeJarvisRecognition, deactivateJarvisVoice, isJarvisVoiceActive} from './jarvis-core.js';

// Isolated browser dictation controller for the JARVIX text composer.
// Rebuilt from A to Z: robust silence handling, mobile auto-restart, touch debounce.
export function bindVoiceInput({mic,input,form,onError,getRecognizer=()=>window.SpeechRecognition||window.webkitSpeechRecognition,getLanguage=()=>document.documentElement.lang.slice(0,2),onStatus=()=>{}}){
 const wave=document.createElement('span');
 wave.className='j-voice-waves';
 wave.hidden=true;
 wave.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++){const bar=document.createElement('span');wave.append(bar);}
 mic.before(wave);
 const initialRequired=input.required;
 let active=null;
 let liveActive=isJarvisVoiceActive();
 const liveStopLabels={ru:'Остановить разговор с JARVIX',en:'Stop JARVIX voice conversation',fr:'Arrêter la conversation vocale JARVIX',es:'Detener la conversación de voz JARVIX'};
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
  const live=liveActive&&!listening;
  wave.hidden=!listening;
  form.classList.toggle('j-voice-recording',listening);
  mic.dataset.voiceRecording=String(listening);
  mic.dataset.jarvixLive=String(live);
  mic.setAttribute('aria-pressed',String(listening||live));
  const label=live?liveStopLabels[language()]:labels[language()][listening?'stop':'start'];
  mic.setAttribute('aria-label',label);
  mic.title=label;
  input.required=listening?false:initialRequired;
 }
 function finished(current){
  if(active!==current)return;
  clearTimeout(current.timeout);
  active=null;
  display(false);
  current.resolve();
  if(liveActive) setTimeout(() => resumeJarvisRecognition(), 200);
 }
 function stop({abort=false}={}){
  const current=active;
  if(!current)return Promise.resolve();
  if(!current.stopping){
   current.stopping=true;
   display(false);
   current.timeout=setTimeout(()=>finished(current),1500);
   try{if(abort)current.recognition.abort();else current.recognition.stop();}
   catch{finished(current);}
  }
  return current.ended;
 }

 window.addEventListener('jarvix:voice-state', event=>{
  liveActive=event.detail?.active===true;
  if(liveActive&&active)void stop();
  display(Boolean(active));
 });

 let lastToggleTime=0;
 mic.onclick=()=>{
  const now=Date.now();
  if(now-lastToggleTime<300)return;
  lastToggleTime=now;

  // If live sphere was running, stop it cleanly and return to regular mic icon
  if(liveActive){
   if(active)void stop({abort:true});
   deactivateJarvisVoice();
   liveActive=false;
   display(false);
   return;
  }

  // If already dictating, second tap stops and keeps the text
  if(active){void stop();return;}

  const Recognition=getRecognizer();
  if(!Recognition){
   onError(({ru:'Голосовой ввод не поддерживается в этом браузере.',en:'Voice input is unavailable in this browser.'})[language()]);
   return;
  }

  let recognition;
  try{
   recognition=new Recognition();
  }catch{
   onError(({ru:'Не удалось запустить микрофон.',en:'Microphone could not be started.'})[language()]);
   return;
  }

  const current={recognition,stopping:false,timeout:null,resolve:null,ended:null,seen:false,failed:false};
  current.ended=new Promise(resolve=>{current.resolve=resolve;});
  active=current;

  const base=input.value, draft=createSpeechDraft(base);
  recognition.lang=({ru:'ru-RU',en:'en-US',fr:'fr-FR',es:'es-ES'})[language()]||'ru-RU';
  recognition.interimResults=true;
  recognition.continuous=true;
  recognition.maxAlternatives=1;

  recognition.onstart=()=>{
   if(active!==current)return;
   onStatus(({ru:'Слушаю… Говорите.',en:'Listening… Speak now.',fr:'Écoute… Parlez.',es:'Escuchando… Hable.'})[language()]);
  };

  recognition.onresult=e=>{
   if(active!==current)return;
   const transcript=draft(e);
   if(transcript&&transcript.trim()){
    current.seen=true;
    input.value=transcript;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    onStatus('');
   }
  };

  recognition.onend=()=>{
   if(active!==current)return;
   // Seamless auto-restart if user hasn't explicitly stopped dictation
   if(!current.stopping&&!current.failed){
    try{
     recognition.start();
     return;
    }catch(_){}
   }
   finished(current);
  };

  recognition.onerror=e=>{
   if(active!==current)return;
   const kind=e?.error||'unavailable';
   // 'no-speech' and 'aborted' are normal silence events, NOT fatal errors
   if(kind==='no-speech'||kind==='aborted')return;

   current.failed=true;
   const messages={
    'not-allowed':'Chrome заблокировал микрофон: разрешите доступ для deepsyq.app.',
    'service-not-allowed':'Служба распознавания речи браузера недоступна.',
    'audio-capture':'Микрофон не обнаружен или занят другим приложением.',
    'network':'Нет связи со службой распознавания речи браузера.',
    'language-not-supported':'Выбранный язык не поддерживается системой распознавания.'
   };
   onError(messages[kind]||('Распознавание речи: '+kind));
   finished(current);
  };

  try{
   pauseJarvisRecognition();
   recognition.start();
   display(true);
   onStatus(({ru:'Подключаю микрофон…',en:'Starting microphone…',fr:'Activation du micro…',es:'Iniciando micrófono…'})[language()]);
  }catch{
   finished(current);
   onError(({ru:'Не удалось включить микрофон. Разрешите доступ в браузере.',en:'Microphone could not be started.'})[language()]);
  }
 };

 display(false);
 return {stop:()=>stop(),abort:()=>stop({abort:true})};
}
