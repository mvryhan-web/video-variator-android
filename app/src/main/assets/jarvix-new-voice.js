import {recordedExact,recordedReply} from './jarvix-new-recorded-dialog.js';
/* JARVIX NEW — voice-only mode on the OWNER'S EXISTING sphere, TEST host only.
   No new page, code form, paid API or simulated model answer. */
const HOST='jarvis-new.deepsyq.pages.dev';
const API='http://127.0.0.1:8768/v1/voice/chat';
const WORDS={
ru:{lang:'ru-RU',hello:'Привет! Я JARVIX. Слушаю тебя.',listen:'Слушаю…',think:'Думаю…',speak:'Отвечаю…',start:'Подключаю микрофон…',deny:'Разреши микрофон в настройках браузера.',unsupported:'Голосовое распознавание здесь недоступно. Открой Chrome или Edge.',offline:'Я тебя слышу, но локальная модель ещё не подключена. Запусти JARVIX и Ollama на компьютере, затем нажми на сферу снова.'},
en:{lang:'en-US',hello:"Hi! I'm JARVIX. I'm listening.",listen:'Listening…',think:'Thinking…',speak:'Speaking…',start:'Connecting microphone…',deny:'Allow microphone access in browser settings.',unsupported:'Speech recognition is unavailable here. Try Chrome or Edge.',offline:'I hear you, but the local AI is not connected. Start JARVIX and Ollama on your computer, then press the sphere again.'},
fr:{lang:'fr-FR',hello:'Bonjour ! Je suis JARVIX. Je vous écoute.',listen:'Je vous écoute…',think:'Je réfléchis…',speak:'Je parle…',start:'Activation du micro…',deny:'Autorisez le microphone dans votre navigateur.',unsupported:'La reconnaissance vocale est indisponible. Essayez Chrome ou Edge.',offline:"Je vous entends, mais le modèle local n'est pas connecté. Lancez JARVIX et Ollama, puis appuyez de nouveau sur la sphère."},
es:{lang:'es-ES',hello:'¡Hola! Soy JARVIX. Te escucho.',listen:'Escuchando…',think:'Pensando…',speak:'Hablando…',start:'Conectando micrófono…',deny:'Permite el acceso al micrófono en el navegador.',unsupported:'Reconocimiento de voz no disponible. Usa Chrome o Edge.',offline:'Te escucho, pero la IA local no está conectada. Inicia JARVIX y Ollama, luego pulsa la esfera de nuevo.'}
};
const getLang=()=>{
 let key='en';
 try{key=localStorage.getItem('deepsyq_home_language')||localStorage.getItem('deepsyq_lang')||navigator.language||'en';}catch{}
 return WORDS[String(key).slice(0,2).toLowerCase()]||WORDS.en;
};
const OWNER_INTRO=Object.freeze({
 ru:'Привет! Я JARVIX. Смотрите, что я умею.',
 en:"Hi! I'm JARVIX. Let me show you what I can do.",
 fr:'Salut ! Je suis JARVIX. Regardez ce que je sais faire.',
 es:'¡Hola! Soy JARVIX. Mira lo que puedo hacer.'
});
let on=false,seq=0,rec=null,request=null,pending=null,ownerClip=null,ownerClipDone=null;
let turns=[],orb=null,status=null;
const Recognition=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
function ui(stage,msg=''){
 if(orb){
  orb.classList.toggle('jv-new-voice-active',on);
  orb.classList.remove('jv-new-voice-speaking','jv-new-voice-listening','jv-new-voice-thinking');
  if(on&&stage)orb.classList.add('jv-new-voice-'+stage);
  orb.setAttribute('aria-pressed',String(on));
  orb.title=on?'JARVIX NEW · '+msg:'JARVIX NEW · голосовой разговор';
 }
 if(status){status.textContent=msg;status.hidden=!msg;}
}
function stop(message=''){
 on=false;seq++;
 if(pending)clearTimeout(pending);
 if(rec){try{rec.onend=null;rec.onerror=null;rec.onresult=null;rec.abort();}catch{}rec=null;}
 if(ownerClip){try{ownerClip.pause();ownerClip.currentTime=0;}catch{} ownerClip=null;}
 if(ownerClipDone){const finish=ownerClipDone;ownerClipDone=null;finish(false);}
 if(request){request.abort();request=null;}
 ui('',message);
}
async function playOwnerRecording(record,id){
 if(!record?.audioUrl||!on||seq!==id)return false;
 return new Promise(resolve=>{
  // The original hosted MP3 is used unchanged. Never synthesize or substitute text.
  const audio=new Audio(record.audioUrl);
  ownerClip=audio;
  let finished=false;
  const finish=ok=>{
   if(finished)return;
   finished=true;audio.onended=null;audio.onerror=null;
   if(ownerClip===audio)ownerClip=null;
   if(ownerClipDone===finish)ownerClipDone=null;
   resolve(ok);
  };
  ownerClipDone=finish;
  audio.onended=()=>finish(true);
  audio.onerror=()=>finish(false);
  ui('speaking',getLang().speak);
  try{Promise.resolve(audio.play()).catch(()=>finish(false));}catch{finish(false);}
 });
}
const recordedLanguage=()=>getLang().lang.slice(0,2);
const RECORDED_WORDS={
 ru:{missing:'Для этого вопроса нет подходящей готовой MP3-записи.',unavailable:'Не удалось воспроизвести найденную MP3-запись.',textOnly:'Новой записи для ответа LLaMA нет. Ответ текстом: ',noModel:'Подходящего MP3 нет и локальная модель сейчас не отвечает.'},
 en:{missing:'No matching prerecorded MP3 for that question.',unavailable:'The selected MP3 could not be played.',textOnly:'No prerecorded audio for this Ollama reply. Text: ',noModel:'No matching MP3 and no local model response.'},
 fr:{missing:'Aucun MP3 enregistré ne correspond à la question.',unavailable:'Impossible de lire le MP3 sélectionné.',textOnly:'Pas de MP3 pour cette réponse locale. Texte : ',noModel:'Aucun MP3 trouvé et le modèle local ne répond pas.'},
 es:{missing:'No hay un MP3 grabado adecuado para esta pregunta.',unavailable:'No se pudo reproducir el MP3 seleccionado.',textOnly:'No hay MP3 para esta respuesta local. Texto: ',noModel:'No se encontró MP3 y el modelo local no responde.'}
};
const recordingsText=()=>RECORDED_WORDS[recordedLanguage()]||RECORDED_WORDS.en;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function listen(id){
 if(!on||seq!==id)return;
 const SR=Recognition();
 if(!SR){stop(getLang().unsupported);return;}
 const r=new SR();rec=r;r.lang=getLang().lang;r.interimResults=true;
 r.continuous=false;r.maxAlternatives=1;
 let finished=false;
 r.onstart=()=>{if(on&&seq===id)ui('listening',getLang().listen);};
 r.onresult=event=>{
  if(!on||seq!==id||finished)return;
  const final=Array.from(event.results).find(x=>x.isFinal);
  const text=final?.[0]?.transcript?.trim();
  if(!text)return;
  finished=true;r.onend=null;try{r.stop();}catch{}rec=null;
  void respond(text,id);
 };
 r.onerror=event=>{
  if(!on||seq!==id||finished)return;
  if(event.error==='no-speech'||event.error==='aborted')return;
  stop(event.error==='not-allowed'||event.error==='service-not-allowed'?
       getLang().deny:getLang().unsupported);
 };
 r.onend=()=>{
  if(!on||seq!==id||finished)return;
  rec=null;pending=setTimeout(()=>listen(id),320);
 };
 try{r.start();}catch{stop(getLang().unsupported);}
}
async function respond(message,id){
 if(!on||seq!==id)return;
 ui('thinking',getLang().think);
 const lang=recordedLanguage();
 let selected=null;
 try{selected=await recordedReply(message,lang);}catch{}
 if(!on||seq!==id)return;
 if(selected){
  const success=await playOwnerRecording(selected,id);
  if(!on||seq!==id)return;
  if(success){
   turns.push({role:'user',content:message.slice(0,1200)},
              {role:'assistant',content:selected.text.slice(0,1200)});
   turns=turns.slice(-8);
   listen(id);
   return;
  }
  // The index may reference an MP3 that has not been uploaded.
  // Continue with real local Ollama TEXT, not silence or unrelated speech.
  ui('thinking',recordingsText().unavailable);
 }
 // Genuine Ollama still handles novel questions, but WITHOUT making up an
 // MP3 or speaking an unrelated pre-recorded answer.
 const abort=new AbortController();request=abort;
 const limit=setTimeout(()=>abort.abort(),102000);
 try{
  const result=await fetch(API,{method:'POST',mode:'cors',targetAddressSpace:'loopback',
   cache:'no-store',signal:abort.signal,headers:{'Content-Type':'application/json'},
   body:JSON.stringify({message:message.slice(0,1200),history:turns.slice(-8)})});
  if(!result.ok)throw Error('Local Ollama unavailable');
  const data=await result.json();
  if(!data||data.provider!=='local-ollama'||typeof data.reply!=='string'||!data.reply.trim())
   throw Error('No real AI answer');
  if(!on||seq!==id)return;
  const answer=data.reply.trim();
  turns.push({role:'user',content:message.slice(0,1200)},
             {role:'assistant',content:answer.slice(0,1200)});
  turns=turns.slice(-8);
  const exact=await recordedExact(answer,lang).catch(()=>null);
  if(!on||seq!==id)return;
  if(exact) {
   const ok=await playOwnerRecording(exact,id);
   if(!ok&&on&&seq===id)ui('thinking',recordingsText().unavailable);
  } else {
   ui('thinking',recordingsText().textOnly+answer.slice(0,320));
   await sleep(4200);
  }
 }catch{
  if(!on||seq!==id)return;
  ui('thinking',recordingsText().noModel);
  await sleep(2500);
 }finally{
  clearTimeout(limit);
  if(request===abort)request=null;
 }
 if(on&&seq===id)listen(id);
}
async function start(){
 if(on){stop();return;}
 if(!Recognition()){ui('',getLang().unsupported);return;}
 if(!navigator.mediaDevices?.getUserMedia){ui('',getLang().deny);return;}
 on=true;const id=++seq;ui('listening',getLang().start);
 try{
  // This is the browser's normal, explicit mic permission. Never bypass it.
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  stream.getTracks().forEach(track=>track.stop());
 }catch{if(on&&seq===id)stop(getLang().deny);return;}
 if(!on||seq!==id)return;
 const intro=await recordedExact(OWNER_INTRO[recordedLanguage()]||OWNER_INTRO.en,recordedLanguage()).catch(()=>null);
 if(intro){const ok=await playOwnerRecording(intro,id);if(!ok&&on&&seq===id)ui('',recordingsText().unavailable);}
 else if(on&&seq===id)ui('',recordingsText().missing);
 if(on&&seq===id)listen(id);
}
export function installJarvixNewVoice(){
 if(location.hostname!==HOST||window.__jarvixVoiceReady)return;
 window.__jarvixVoiceReady=true;
 orb=document.getElementById('topJarvisBtn');
 const style=document.createElement('style');style.id='jv-new-voice-style';
 style.textContent='@keyframes jvVoiceGlow{0%,100%{filter:drop-shadow(0 0 8px #31dfdf)}50%{filter:drop-shadow(0 0 27px #e9a85a) drop-shadow(0 0 12px #b35ec5)}}'+
  '#topJarvisBtn.jv-new-voice-active .jarvis-mini-orb{animation:jvVoiceGlow 1.2s ease-in-out infinite!important}'+
  '#topJarvisBtn.jv-new-voice-speaking .jarvis-mini-orb{animation-duration:.55s!important}'+
  '@media(prefers-reduced-motion:reduce){#topJarvisBtn.jv-new-voice-active .jarvis-mini-orb{animation:none!important;outline:2px solid #51bbc8}}';
 document.head.append(style);
 status=document.createElement('div');status.id='jv-new-live-voice-status';status.hidden=true;
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.style.cssText='position:fixed;left:50%;bottom:calc(15px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483300;max-width:min(95vw,450px);max-height:32vh;overflow:hidden;overflow-wrap:anywhere;padding:8px 14px;background:#101d2ce8;color:#dbeef4;border:1px solid #5c7581;border-radius:18px;text-align:center;pointer-events:none;font:600 13px/1.4 system-ui,sans-serif';
 document.body.append(status);
 if(orb){
  orb.title='JARVIX NEW · голосовое общение';
  orb.setAttribute('aria-label','Начать или остановить голосовой разговор с JARVIX NEW');
  orb.setAttribute('aria-pressed','false');
 }
 // Capture before other legacy click listeners. Never navigate to a new page.
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('#topJarvisBtn');
  if(!target)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  orb=target;void start();
 },true);
 window.addEventListener('pagehide',()=>stop());
 window.__jarvixNewVoiceStop=()=>stop();
}