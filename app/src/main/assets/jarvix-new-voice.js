import {getTourV3Recording} from './jarvix-tour-v3-audio.js';
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
let on=false,seq=0,rec=null,utter=null,request=null,pending=null,ownerClip=null,ownerClipDone=null;
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
 if(utter){utter.onend=null;utter.onerror=null;utter=null;}
 if(ownerClip){try{ownerClip.pause();ownerClip.currentTime=0;}catch{} ownerClip=null;}
 if(ownerClipDone){const finish=ownerClipDone;ownerClipDone=null;finish(false);}
 try{window.speechSynthesis?.cancel();}catch{}
 if(request){request.abort();request=null;}
 ui('',message);
}
function voice(){
 const speech=window.speechSynthesis;
 const language=getLang().lang;
 const options=speech?.getVoices?.()||[];
 return options.find(v=>v.lang===language && /male|dmitri|pavel|daniel|george|thomas/i.test(v.name))||
        options.find(v=>v.lang===language)||
        options.find(v=>v.lang.slice(0,2)===language.slice(0,2))||null;
}
async function playApprovedOwnerClip(text,id){
 // Use ONLY the owner's approved, exact-match VoxCPM2 recording.
 // An arbitrary LLaMA answer must never be replaced by a different recording.
 const language=getLang().lang.slice(0,2);
 let recording=null;
 try{recording=await getTourV3Recording(String(text).trim(),language);}catch{}
 if(!recording||!on||seq!==id)return false;
 return await new Promise(resolve=>{
  const audio=new Audio(recording);
  ownerClip=audio;
  let finished=false;
  const finish=ok=>{
   if(finished)return;
   finished=true;
   audio.onended=null;audio.onerror=null;
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
async function speak(text,id){
 const ownerPlayed=await playApprovedOwnerClip(text,id);
 if(ownerPlayed)return true;
 if(!on||seq!==id||!window.speechSynthesis)return false;
 return await new Promise(resolve=>{
  const u=new SpeechSynthesisUtterance(String(text).slice(0,4000));
  utter=u;u.lang=getLang().lang;u.rate=.96;u.pitch=1;
  const selected=voice();if(selected)u.voice=selected;
  ui('speaking',getLang().speak);
  let done=false;
  const complete=success=>{if(done)return;done=true;if(utter===u)utter=null;resolve(success);};
  u.onend=()=>complete(true);u.onerror=()=>complete(false);
  try{window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch{complete(false);}
 });
}
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
  await speak(answer,id);
  if(on&&seq===id)listen(id);
 }catch{
  if(!on||seq!==id)return;
  const error=getLang().offline;
  await speak(error,id);
  if(on&&seq===id)stop(error);
 }finally{clearTimeout(limit);if(request===abort)request=null;}
}
async function start(){
 if(on){stop();return;}
 if(!Recognition()||!window.speechSynthesis){ui('',getLang().unsupported);return;}
 if(!navigator.mediaDevices?.getUserMedia){ui('',getLang().deny);return;}
 on=true;const id=++seq;ui('listening',getLang().start);
 try{
  // This is the browser's normal, explicit mic permission. Never bypass it.
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  stream.getTracks().forEach(track=>track.stop());
 }catch{if(on&&seq===id)stop(getLang().deny);return;}
 if(!on||seq!==id)return;
 await speak(OWNER_INTRO[getLang().lang.slice(0,2)]||OWNER_INTRO.en,id);
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
 status.style.cssText='position:fixed;left:50%;bottom:calc(15px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483300;max-width:min(95vw,390px);padding:8px 14px;background:#101d2ce8;color:#dbeef4;border:1px solid #5c7581;border-radius:18px;text-align:center;pointer-events:none;font:600 13px/1.4 system-ui,sans-serif';
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