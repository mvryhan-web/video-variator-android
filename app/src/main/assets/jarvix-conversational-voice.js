// ONE conversational voice mode for the existing JARVIX Chat.
// Reuses the current Chat/AI/session, browser speech recognition and owner TTS.
// No recording/upload here, second assistant, credential or billable provider.
const labels = {
 ru: {start:'Разговор с JARVIX',stop:'Завершить разговор',listening:'Слушаю…',thinking:'Думаю…',speaking:'Отвечаю…',error:'Голосовой режим недоступен'},
 en: {start:'Talk to JARVIX',stop:'End voice conversation',listening:'Listening…',thinking:'Thinking…',speaking:'Speaking…',error:'Voice mode unavailable'},
 fr: {start:'Parler à JARVIX',stop:'Terminer la conversation',listening:'Je vous écoute…',thinking:'Je réfléchis…',speaking:'Je réponds…',error:'Mode vocal indisponible'},
 es: {start:'Hablar con JARVIX',stop:'Terminar conversación',listening:'Escuchando…',thinking:'Pensando…',speaking:'Hablando…',error:'Modo de voz no disponible'}
};
const languageCode = language => {
 const code = String(language || 'en').toLowerCase().slice(0,2);
 return labels[code] ? code : 'en';
};
const normalize = text => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export function isSpokenEcho(heard, spoken) {
 const h=normalize(heard),s=normalize(spoken);
 if(!h || !s)return false;
 if(s.includes(h) && h.length>=3)return true;
 const words=h.split(' ').filter(w=>w.length>2),answer=new Set(s.split(' '));
 return words.length>=2 && words.filter(w=>answer.has(w)).length/words.length>=0.7;
}
export function createJarvixVoiceSession({getRecognizer, getLanguage=()=> 'en', onTurn, speak, stopSpeech, onPhase=()=>{}, onError=()=>{}, deactivateSphere=()=>{}, win, doc}) {
 if(typeof getRecognizer!=='function'||typeof onTurn!=='function'||typeof speak!=='function')throw Error('VOICE_DEPENDENCY_MISSING');
 let active=false,phase='idle',recognition=null,recognitionStarted=false,sequence=0;
 let pendingText='',pendingTimer=null,restartTimer=null,restartCount=0,lastText='',lastAt=0,spoken='',speakingDone=null;
 const clock=()=>win?.performance?.now?.() ?? Date.now();
 const clearPending=()=>{if(pendingTimer!==null)win.clearTimeout(pendingTimer);pendingTimer=null;pendingText='';};
 const clearRestart=()=>{if(restartTimer!==null)win.clearTimeout(restartTimer);restartTimer=null;};
 const mark=(next)=>{phase=next;onPhase(next,labels[languageCode(getLanguage())]);};
 const fail=error=>{
   const code=error?.error||error?.message||'SPEECH_UNAVAILABLE';
   stop();
   onError(code);
 };
 function startRecognizer(){
   if(!active||recognitionStarted||phase==='thinking')return;
   try {recognition.start();recognitionStarted=true;restartCount=0;}catch(error){
     // Some browsers still have an old recognizer finishing when restart is requested.
     if(++restartCount>3){fail(error);return;}
     clearRestart();
     restartTimer=win.setTimeout(()=>{restartTimer=null;startRecognizer();},400);
   }
 }
 function closeRecognizer(){
   clearRestart();
   if(recognition){recognition.onresult=null;recognition.onend=null;recognition.onerror=null;recognition.onstart=null;
     try{recognition.abort();}catch{} }
   recognition=null;recognitionStarted=false;
 }
 function stop(){
   if(!active&&phase==='idle')return;
   active=false;sequence++;clearPending();closeRecognizer();
   const done=speakingDone;speakingDone=null;
   try{stopSpeech?.();}catch{}
   spoken='';
   mark('idle');
   // Never invoke stale speech-complete callbacks after stop.
   void done;
 }
 function resume(){
   if(!active)return;
   spoken='';speakingDone=null;mark('listening');startRecognizer();
 }
 async function submitPhrase(text){
   if(!active||phase==='thinking')return;
   const phrase=String(text||'').trim();
   if(!phrase)return;
   const now=clock();
   if(normalize(phrase)===lastText && now-lastAt<1400)return;
   lastText=normalize(phrase);lastAt=now;
   const turn=sequence;
   if(phase==='speaking'){
     if(isSpokenEcho(phrase,spoken))return;
     try{stopSpeech?.();}catch{}
     speakingDone=null;
     if(/^(?:стоп|стой|тихо|замолчи|хватит|stop|quiet|silence|cancel|arrête|silencio)\s*[!.?]*$/iu.test(phrase)){
       resume();return;
     }
   }
   mark('thinking');
   try{
     const result=await onTurn(phrase);
     if(!active||turn!==sequence)return;
     if(result?.navigation){stop();return;}
     const reply=typeof result==='string'?result:result?.reply || result?.text;
     if(typeof reply!=='string'||!reply.trim()){resume();return;}
     spoken=reply.trim();
     mark('speaking');
     startRecognizer(); // Enables user speech interruption, with echo rejection.
     const complete=()=>{if(active&&sequence===turn&&phase==='speaking')resume();};
     speakingDone=complete;
     try{speak(spoken,complete);}catch(error){fail(error);}
   }catch(error){
     if(!active||turn!==sequence)return;
     onError(error?.message||'VOICE_TURN_FAILED');
     resume();
   }
 }
 function flush(){
   pendingTimer=null;
   const text=pendingText.trim();pendingText='';
   if(text)void submitPhrase(text);
 }
 function onResult(event){
   if(!active||phase==='thinking')return;
   const results=event?.results||[];
   for(let i=event?.resultIndex||0;i<results.length;i++){
     const entry=results[i],part=entry?.[0]?.transcript?.trim();
     if(!entry?.isFinal||!part)continue;
     // On a barge-in, discard transcripts which merely echo spoken JARVIX audio.
     if(phase==='speaking'&&isSpokenEcho(part,spoken))continue;
     pendingText=(pendingText+' '+part).trim().slice(0,2000);
   }
   if(!pendingText)return;
   if(pendingTimer!==null)win.clearTimeout(pendingTimer);
   pendingTimer=win.setTimeout(flush,250);
 }
 function start(){
   if(active)return true;
   let Constructor;
   try{Constructor=getRecognizer();}catch(error){onError(error?.message||'SPEECH_UNAVAILABLE');return false;}
   if(typeof Constructor!=='function'){onError('SPEECH_UNSUPPORTED');return false;}
   try{deactivateSphere();}catch{}
   try{stopSpeech?.();}catch{}
   const turn=++sequence;
   try{
     recognition=new Constructor();
     recognition.continuous=true;recognition.interimResults=true;
     const language=languageCode(getLanguage());
     recognition.lang={ru:'ru-RU',en:'en-US',fr:'fr-FR',es:'es-ES'}[language];
     recognition.onresult=onResult;
     recognition.onstart=()=>{if(active&&sequence===turn)recognitionStarted=true;};
     recognition.onend=()=>{
       recognitionStarted=false;
       if(!active||sequence!==turn||phase==='thinking')return;
       clearRestart();
       restartTimer=win.setTimeout(()=>{restartTimer=null;startRecognizer();},300);
     };
     recognition.onerror=event=>{
       if(!active||sequence!==turn)return;
       if(['no-speech','aborted'].includes(event?.error))return;
       fail(event);
     };
     active=true;mark('listening');startRecognizer();
     return active;
   }catch(error){fail(error);return false;}
 }
 const onHidden=()=>{if(doc?.visibilityState==='hidden')stop();};
 const onAccount=event=>{if(event?.key==='vv_token')stop();};
 const onUnavailable=()=>{if(active)fail({message:'VOICE_SERVER_UNAVAILABLE'});};
 if(win&&doc){
   win.addEventListener('pagehide',stop);
   win.addEventListener('storage',onAccount);
   win.addEventListener('jarvix:voice-unavailable',onUnavailable);
   doc.addEventListener('visibilitychange',onHidden);
 }
 return {start,stop,toggle:()=>active?(stop(),false):start(),isActive:()=>active,phase:()=>phase,
   receive:submitPhrase,
   destroy(){stop();if(win&&doc){win.removeEventListener('pagehide',stop);win.removeEventListener('storage',onAccount);
     win.removeEventListener('jarvix:voice-unavailable',onUnavailable);doc.removeEventListener('visibilitychange',onHidden);}}};
}
export function bindJarvixConversationalVoice({form,input,onTurn,speak,stopSpeech,deactivateSphere,onError=()=>{},getLanguage=()=>document.documentElement.lang,getRecognizer=()=>window.SpeechRecognition||window.webkitSpeechRecognition,win=window,doc=document}){
 const mic=form?.querySelector('#jMic');
 if(!mic)throw Error('JARVIX_COMPOSER_MISSING');
 const button=doc.createElement('button');
 button.type='button';button.id='jTalk';button.className='j-talk';button.setAttribute('aria-pressed','false');
 button.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6M8 5v14M12 2v20M16 5v14M20 9v6"/></svg>';
 const session=createJarvixVoiceSession({getRecognizer,getLanguage,onTurn,speak,stopSpeech,deactivateSphere,onError,win,doc,
   onPhase(phase,locale){
     button.dataset.voicePhase=phase;
     button.setAttribute('aria-pressed',String(phase!=='idle'));
     button.setAttribute('aria-label',phase==='idle'?locale.start:locale.stop);
     button.title=phase==='idle'?locale.start:locale.stop;
     if(phase!=='idle')onError(phase==='listening'?locale.listening:phase==='thinking'?locale.thinking:locale.speaking);
   }
 });
 button.onclick=()=>session.toggle();
 mic.after(button);
 button.dataset.voicePhase='idle';
 const startText=labels[languageCode(getLanguage())].start;
 button.setAttribute('aria-label',startText);button.title=startText;
 return { ...session,destroy(){session.destroy();button.remove();} };
}
