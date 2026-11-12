import {recordedReply} from './jarvix-new-recorded-dialog.js';
import {helloRecording,smalltalkReply} from './jarvix-new-smalltalk.js';
/* JARVIX NEW — voice-only mode on the OWNER'S EXISTING sphere, TEST host only.
   No new page, code form, paid API or simulated model answer. */
const HOST='jarvis-new.deepsyq.pages.dev';
const VOICE_LIBRARY='http://127.0.0.1:8770/v1/find';
const PAID_ROUTE='/api/jarvix-new/paid/';
let paidStatusOnce=null;
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
let on=false,seq=0,rec=null,request=null,pending=null,ownerClip=null,ownerClipDone=null;
let turns=[],orb=null,micChip=null,micStage='idle',micFailures=0;
let transcriptWrap=null,transcriptText=null,meterFill=null,heardText='',heardIsFinal=false;
let monitorStream=null,monitorContext=null,monitorAnalyser=null,monitorTimer=null,monitorSamples=null;
const Recognition=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
const MICROPHONE_STATES={
 ru:{starting:'Включаю микрофон…',listening:'Слушаю вас',thinking:'Обрабатываю…',
  speaking:'Говорю',ready:'Нажмите 🎤',error:'Микрофон недоступен · нажмите 🎤',
  unsupported:'Голосовой ввод недоступен',missing:'Пока нет голосового ответа',idle:''},
 en:{starting:'Starting microphone…',listening:'Listening',thinking:'Thinking…',
  speaking:'Speaking',ready:'Tap 🎤 to speak',error:'Microphone unavailable · tap 🎤',
  unsupported:'Speech recognition unavailable',missing:'No recorded reply yet',idle:''},
 fr:{starting:'Activation du micro…',listening:'Je vous écoute',thinking:'Je réfléchis…',
  speaking:'Je parle',ready:'Touchez 🎤 pour parler',error:'Micro indisponible · touchez 🎤',
  unsupported:'Reconnaissance vocale indisponible',missing:'Pas encore de réponse enregistrée',idle:''},
 es:{starting:'Activando micrófono…',listening:'Te escucho',thinking:'Pensando…',
  speaking:'Hablando',ready:'Toca 🎤 para hablar',error:'Micrófono no disponible · toca 🎤',
  unsupported:'Reconocimiento de voz no disponible',missing:'Aún no hay respuesta grabada',idle:''}
};
function positionMicChip(){
 if(!micChip||!orb)return;
 const rect=orb.getBoundingClientRect();
 // The label is anchored to the existing sphere, never a floating footer.
 const x=Math.max(75,Math.min(innerWidth-75,rect.left+rect.width/2));
 const y=Math.max(38,Math.min(innerHeight-38,rect.bottom+7));
 micChip.style.left=x+'px';
 micChip.style.top=y+'px';
 if(transcriptWrap){
  transcriptWrap.style.left=x+'px';
  transcriptWrap.style.top=Math.min(innerHeight-84,y+(micChip.offsetHeight||35)+7)+'px';
 }
}
function setTranscript(text='',final=false){
 heardText=String(text||'').trim().slice(0,400);
 heardIsFinal=!!final;
 renderTranscript();
}
function renderTranscript(){
 if(!transcriptWrap||!transcriptText)return;
 const active=on&&(micStage==='listening'||micStage==='starting'||
   micStage==='thinking'||micStage==='speaking'||micStage==='missing'||micStage==='ready');
 transcriptWrap.hidden=!active;
 if(!active)return;
 const lang=recordedLanguage();
 const hint={
  ru:'Скажите что-нибудь — здесь появятся распознанные слова',
  en:'Speak now — recognized words will appear here',
  fr:'Parlez — les mots reconnus apparaîtront ici',
  es:'Habla — aquí aparecerán las palabras reconocidas'
 }[lang]||'Speak now';
 transcriptText.textContent=heardText||((micStage==='listening'||micStage==='starting')?hint:'');
 transcriptText.dataset.actual=heardText?'true':'false';
 transcriptWrap.dataset.stage=micStage;
 transcriptWrap.dataset.final=heardIsFinal?'true':'false';
 positionMicChip();
}
// The sound level is read from the local microphone stream. No raw audio
// is uploaded by this meter. Browser speech recognition is separate.
function stopMicMonitor(){
 if(monitorTimer!==null){clearInterval(monitorTimer);monitorTimer=null;}
 if(monitorStream){
  try{monitorStream.getTracks().forEach(track=>track.stop());}catch{}
  monitorStream=null;
 }
 try{monitorContext?.close?.();}catch{}
 monitorContext=null;monitorAnalyser=null;monitorSamples=null;
 if(meterFill)meterFill.style.transform='scaleX(.05)';
}
function startMicMonitor(stream){
 stopMicMonitor();
 monitorStream=stream;
 const Ctx=window.AudioContext||window.webkitAudioContext;
 if(!Ctx)return;
 try{
  monitorContext=new Ctx();
  const source=monitorContext.createMediaStreamSource(stream);
  monitorAnalyser=monitorContext.createAnalyser();
  monitorAnalyser.fftSize=512;
  source.connect(monitorAnalyser); // NOT connected to speakers.
  monitorSamples=new Uint8Array(monitorAnalyser.fftSize);
  Promise.resolve(monitorContext.resume?.()).catch(()=>{});
  monitorTimer=setInterval(()=>{
   if(!on||micStage!=='listening'||!monitorAnalyser||!meterFill){
    if(meterFill)meterFill.style.transform='scaleX(.05)';
    return;
   }
   monitorAnalyser.getByteTimeDomainData(monitorSamples);
   let sum=0;
   for(const value of monitorSamples){
    const centered=(value-128)/128;
    sum+=centered*centered;
   }
   const rms=Math.sqrt(sum/monitorSamples.length);
   // Visible response is actual microphone amplitude, not fake animation.
   const level=Math.max(.05,Math.min(1,rms*10));
   meterFill.style.transform='scaleX('+level.toFixed(2)+')';
  },120);
 }catch{
  try{monitorContext?.close?.();}catch{}
  monitorContext=null;monitorAnalyser=null;monitorSamples=null;
 }
}
function ui(stage='idle'){
 micStage=stage;
 if(orb){
  orb.classList.toggle('jv-new-voice-active',on);
  orb.classList.remove('jv-new-voice-speaking','jv-new-voice-listening','jv-new-voice-thinking');
  if(on&&['speaking','listening','thinking'].includes(stage))
   orb.classList.add('jv-new-voice-'+stage);
  orb.setAttribute('aria-pressed',String(on));
  orb.title='JARVIX NEW';
  orb.setAttribute('aria-label',on?(stage==='speaking'?'JARVIX говорит':stage==='listening'?'Микрофон включён — JARVIX слушает':'JARVIX ожидает голос'):'Начать разговор с JARVIX');
 }
 if(micChip){
  micChip.hidden=!on;
  if(on){
   const labels=MICROPHONE_STATES[recordedLanguage()]||MICROPHONE_STATES.en;
   const symbol=stage==='speaking'?'◖))':stage==='thinking'?'◌':stage==='listening'?'🎙':'🎤';
   micChip.textContent=symbol+' '+(labels[stage]||labels.ready);
   micChip.dataset.state=stage;
   micChip.setAttribute('aria-label',stage==='listening'?labels.listening:labels.ready);
   micChip.disabled=stage==='thinking';
   positionMicChip();
  }
 }
 renderTranscript();
}
function cancelRecognition(){
 if(pending){clearTimeout(pending);pending=null;}
 if(rec){
  const old=rec;rec=null;
  try{old.onend=null;old.onerror=null;old.onresult=null;old.abort();}catch{}
 }
}
function stop(){
 on=false;seq++;
 cancelRecognition();
 if(ownerClip){try{ownerClip.pause();ownerClip.currentTime=0;}catch{}ownerClip=null;}
 if(ownerClipDone){const finish=ownerClipDone;ownerClipDone=null;finish(false);}
 if(request){try{request.abort();}catch{}request=null;}
 micFailures=0;
 stopMicMonitor();
 setTranscript('');
 ui('idle');
}
function resumeMicrophone(){
 if(!on)return void start();
 if(micStage==='listening')return;
 if(ownerClip){try{ownerClip.pause();ownerClip.currentTime=0;}catch{}ownerClip=null;}
 if(ownerClipDone){const finish=ownerClipDone;ownerClipDone=null;finish(false);}
 if(request){try{request.abort();}catch{}request=null;}
 cancelRecognition();
 micFailures=0;
 setTranscript('');
 // Called synchronously from a REAL touch/click: mobile recognition often
 // requires this direct user gesture after audio playback.
 listen(seq);
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
   finished=true;audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;
   if(ownerClip===audio)ownerClip=null;
   if(ownerClipDone===finish)ownerClipDone=null;
   if(record.temporaryBlob===true)try{URL.revokeObjectURL(record.audioUrl);}catch{}
   resolve(ok);
  };
  ownerClipDone=finish;
  audio.onended=()=>finish(true);
  audio.onerror=()=>finish(false);
  // Older Tour V3 MP3 fallback: stop at the pause after "Я JARVIX",
  // before any phrase about "Смотрите, что я умею".
  if(Number.isFinite(record.stopAtSeconds)&&record.stopAtSeconds>0){
   audio.ontimeupdate=()=>{
    if(audio.currentTime>=record.stopAtSeconds){
     audio.pause();finish(true);
    }
   };
  }
  ui('speaking',getLang().speak);
  try{Promise.resolve(audio.play()).catch(()=>finish(false));}catch{finish(false);}
 });
}
const recordedLanguage=()=>getLang().lang.slice(0,2);
function listen(id){
 if(!on||seq!==id)return;
 const SR=Recognition();
 if(!SR){ui('unsupported');return;}
 cancelRecognition();
 const r=new SR();rec=r;
 r.lang=getLang().lang;
 r.interimResults=true;
 r.continuous=false;
 r.maxAlternatives=1;
 let processed=false,interim='',restarting=false;
 const retry=(manual=false)=>{
  if(!on||seq!==id||processed||restarting)return;
  restarting=true;
  if(rec===r)rec=null;
  if(interim.trim().length>=2){
   processed=true;
   setTranscript(interim.trim(),true);
   void respond(interim.trim(),id);
   return;
  }
  if(manual||micFailures>=3){ui('ready');return;}
  ui('starting');
  pending=setTimeout(()=>{
   pending=null;
   if(on&&seq===id)listen(id);
  },Math.min(1200,350+200*micFailures));
 };
 r.onstart=()=>{
  if(!on||seq!==id||rec!==r)return;
  ui('listening'); // Native recognition onstart, not just mic permission.
 };
 r.onspeechstart=()=>{if(on&&seq===id&&rec===r)ui('listening');};
 r.onresult=event=>{
  if(!on||seq!==id||processed||rec!==r)return;
  const results=Array.from(event.results||[]);
  const pieces=[];
  let hasFinal=false;
  let allFinal=true;
  for(const result of results){
   const phrase=result?.[0]?.transcript?.trim();
   if(!phrase)continue;
   pieces.push(phrase);
   if(result.isFinal)hasFinal=true;
   else allFinal=false;
  }
  const combined=pieces.join(' ').replace(/\s+/g,' ').trim();
  if(!combined)return;
  interim=combined;
  micFailures=0; // Actual recognized words, not merely recognition startup.
  // Show exactly the live partial transcript received from the browser.
  // It may arrive word by word, or in longer chunks depending on the phone.
  setTranscript(combined,hasFinal&&allFinal);
  if(!hasFinal||!allFinal)return;
  processed=true;
  r.onend=null;
  try{r.stop();}catch{}
  if(rec===r)rec=null;
  void respond(combined,id);
 };
 r.onerror=event=>{
  if(!on||seq!==id||processed||rec!==r)return;
  const err=String(event.error||'');
  if(err==='aborted')return;
  if(err==='no-speech'){micFailures++;return;}
  if(err==='not-allowed'||err==='service-not-allowed'||
     err==='audio-capture'||err==='network'){
   // Do not spin in an error loop; leave a clear tap target on phones.
   r.onend=null;rec=null;ui(err==='network'?'ready':'error');
   return;
  }
  micFailures++;
 };
 r.onend=()=>{
  if(!on||seq!==id||processed||rec!==r)return;
  if(interim.trim().length>=2){
   processed=true;rec=null;
   setTranscript(interim.trim(),true);
   void respond(interim.trim(),id);
   return;
  }
  retry(false);
 };
 ui('starting');
 try{
  r.start();
 }catch{
  if(rec===r)rec=null;
  micFailures++;
  ui('ready');
 }
}
async function ownerLibraryReply(question,language){
 // Optional owner's local Windows library; it remains strictly on loopback.
 // Regular site visitors continue to use the already hosted MP3 catalog.
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),650);
 try{
  const response=await fetch(VOICE_LIBRARY,{
   method:'POST',mode:'cors',targetAddressSpace:'loopback',cache:'no-store',
   signal:controller.signal,headers:{'Content-Type':'application/json'},
   body:JSON.stringify({question:question.slice(0,1000),language})
  });
  if(!response.ok)return null;
  const data=await response.json();
  if(!data.found||typeof data.text!=='string'||!data.text.trim()||
      !/^[a-f0-9]{64}$/.test(data.id||''))return null;
  const expected='http://127.0.0.1:8770/v1/audio?id='+data.id;
  if(data.audio_url!==expected)return null;
  return {id:data.id,text:data.text,audioUrl:expected,source:'local-voice-library'};
 }catch{return null;}finally{clearTimeout(timeout);}
}
async function paidModeReady(){
 // No provider calls at all for anonymous users or when the owner feature is OFF.
 if(paidStatusOnce===null)paidStatusOnce=fetch(PAID_ROUTE+'status',
   {method:'GET',cache:'no-store'})
   .then(async r=>r.ok && (await r.json())?.enabled===true)
   .catch(()=>false);
 return paidStatusOnce;
}
async function paidVoiceReply(message,language,id){
 let token='';
 try{token=localStorage.getItem('vv_token')||'';}catch{}
 if(!/^[A-Za-z0-9._~-]{20,4096}$/.test(token))return null;
 if(!(await paidModeReady())||!on||seq!==id)return null;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),65000);
 request=abort;
 try{
  // TEST backend verifies the session and active paid tier; never trust
  // a plan selected in the browser, localStorage or payload.
  const headers={Authorization:'Bearer '+token};
  const access=await fetch(PAID_ROUTE+'access',{headers,signal:abort.signal,cache:'no-store'});
  if(!access.ok||!(await access.json())?.allowed)return null;
  if(!on||seq!==id)return null;
  const response=await fetch(PAID_ROUTE+'turn',{
   method:'POST',cache:'no-store',signal:abort.signal,
   headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify({message:message.slice(0,1200),language,
    history:turns.slice(-6).map(({role,content})=>({role,content:content.slice(0,1200)}))})
  });
  if(!response.ok)return null;
  const reply=await response.json();
  if(reply?.ok!==true||reply.voice!=='jarvix-owner'||reply.audioMime!=='audio/mpeg'||
     typeof reply.text!=='string'||!reply.text.trim()||
     typeof reply.audioBase64!=='string'||reply.audioBase64.length<1334||
     reply.audioBase64.length>2700000)return null;
  const raw=atob(reply.audioBase64);
  if(raw.length<1000||raw.length>2000000)return null;
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  if(!(bytes[0]===73&&bytes[1]===68&&bytes[2]===51) &&
     !(bytes[0]===255&&(bytes[1]&224)===224))return null;
  if(!on||seq!==id)return null;
  const url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));
  return {text:reply.text,audioUrl:url,source:'paid-jarvix-owner-voice',temporaryBlob:true};
 }catch{return null;}finally{
  clearTimeout(timer);
  if(request===abort)request=null;
 }
}
async function playResponse(record,id,message){
 if(!record||!on||seq!==id)return false;
 const ok=await playOwnerRecording(record,id);
 if(!ok||!on||seq!==id)return false;
 turns.push({role:'user',content:message.slice(0,1200)},
            {role:'assistant',content:String(record.text||'').slice(0,1200)});
 turns=turns.slice(-8);
 listen(id);
 return true;
}
async function respond(message,id){
 if(!on||seq!==id)return;
 ui('thinking');
 const lang=recordedLanguage();
 setTranscript(message,true);

 // 1. Human conversation first — not a broken 500-scenario manifest.
 // Matching existing V3 owner MP3 is instant and does not use local network.
 const smalltalk=await smalltalkReply(message,lang).catch(()=>null);
 if(!on||seq!==id)return;
 if(await playResponse(smalltalk,id,message))return;
 if(!on||seq!==id)return;

 // 2. Future paid voice: remains OFF until owner enables server-side
 // entitlement, real budget reserve and approved voice. Never fake it.
 const premium=await paidVoiceReply(message,lang,id);
 if(!on||seq!==id){
  if(premium?.temporaryBlob)URL.revokeObjectURL(premium.audioUrl);
  return;
 }
 if(await playResponse(premium,id,message))return;
 if(!on||seq!==id)return;

 // 3. Owner-approved local Windows recording, when paired and running.
 const local=await ownerLibraryReply(message,lang);
 if(!on||seq!==id)return;
 if(await playResponse(local,id,message))return;
 if(!on||seq!==id)return;

 // 4. Other real, verified, existing MP3 from the tour/catalog.
 const recorded=await recordedReply(message,lang).catch(()=>null);
 if(!on||seq!==id)return;
 if(await playResponse(recorded,id,message))return;
 if(!on||seq!==id)return;

 // No recorded answer exists yet. Never repeat the generic "tell me
 // what you want to create" after EVERY unrelated question.
 // Keep the microphone live for the next phrase; show an honest state.
 if(!on||seq!==id)return;
 ui('missing');
 pending=setTimeout(()=>{pending=null;if(on&&seq===id)listen(id);},1200);
}
async function start(){
 if(on){stop();return;}
 if(!Recognition()){on=true;ui('unsupported');return;}
 if(!navigator.mediaDevices?.getUserMedia){on=true;ui('error');return;}
 on=true;const id=++seq;setTranscript('');ui('starting');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  if(!on||seq!==id){stream.getTracks().forEach(track=>track.stop());return;}
  startMicMonitor(stream);
 }catch{if(on&&seq===id)ui('error');return;}
 if(!on||seq!==id)return;
 const intro=await helloRecording(recordedLanguage()).catch(()=>null);
 if(!on||seq!==id)return;
 if(intro)await playOwnerRecording(intro,id);
 if(on&&seq===id)listen(id);
}
export function installJarvixNewVoice(){
 if(location.hostname!==HOST||window.__jarvixVoiceReady)return;
 window.__jarvixVoiceReady=true;
 orb=document.getElementById('topJarvisBtn');
 const style=document.createElement('style');style.id='jv-new-voice-style';
 style.textContent=[
 '@keyframes jvListen{0%,100%{filter:hue-rotate(-18deg) drop-shadow(0 0 9px #34dce1)}50%{filter:hue-rotate(10deg) drop-shadow(0 0 20px #4effe6)}}',
 '@keyframes jvThink{0%,100%{filter:drop-shadow(0 0 7px #f2a949)}50%{filter:drop-shadow(0 0 24px #f9d27a)}}',
 '@keyframes jvSpeak{0%,100%{filter:drop-shadow(0 0 9px #ce58d4)}50%{filter:drop-shadow(0 0 29px #ff9f41) drop-shadow(0 0 10px #bc6bfc)}}',
 '#topJarvisBtn.jv-new-voice-listening .jarvis-mini-orb{animation:jvListen 1.8s ease-in-out infinite!important}',
 '#topJarvisBtn.jv-new-voice-thinking .jarvis-mini-orb{animation:jvThink .95s ease-in-out infinite!important}',
 '#topJarvisBtn.jv-new-voice-speaking .jarvis-mini-orb{animation:jvSpeak .5s ease-in-out infinite!important}',
 '@media(prefers-reduced-motion:reduce){#topJarvisBtn.jv-new-voice-active .jarvis-mini-orb{animation:none!important}}',
 '#jv-new-mic-chip{position:fixed;transform:translateX(-50%);z-index:2147482001;display:flex;align-items:center;justify-content:center;white-space:nowrap;max-width:min(90vw,240px);min-height:30px;padding:5px 11px;border:1px solid #3faaa9;border-radius:999px;background:#101a28f2;color:#f0fafa;font:600 12px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px #06122166;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
 '#jv-new-mic-chip[hidden]{display:none!important}',
 '#jv-new-mic-chip[data-state="listening"]{border-color:#4dffe1;box-shadow:0 0 12px #24c7b980}',
 '#jv-new-mic-chip[data-state="speaking"]{border-color:#d790f4;box-shadow:0 0 12px #a85fe688}',
 '#jv-new-mic-chip[data-state="error"],#jv-new-mic-chip[data-state="unsupported"]{border-color:#f2a960;color:#ffda9f}',
 '#jv-new-mic-chip:disabled{opacity:.9;cursor:default}',
 '#jv-new-transcript{position:fixed;z-index:2147482000;transform:translateX(-50%);width:min(312px,calc(100vw - 24px));padding:10px 12px 9px;background:#0c1828f5;border:1px solid #3c6e7b;border-radius:12px;color:#f7fafd;box-shadow:0 10px 26px #07111e77;pointer-events:none;text-align:center;font:500 14px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}',
 '#jv-new-transcript[hidden]{display:none!important}',
 '#jv-new-transcript-text[data-actual="true"]{font-weight:700;font-size:16px;line-height:1.45;color:#fff}',
 '#jv-new-transcript-text[data-actual="false"]{font-size:12px;color:#9eb4be}',
 '#jv-new-transcript[data-stage="listening"]{border-color:#29c6ba}',
 '#jv-new-transcript[data-final="true"]{border-color:#ddaa68}',
 '#jv-new-audio-meter{height:3px;border-radius:4px;background:#284a55;margin:8px auto 0;overflow:hidden;width:74%}',
 '#jv-new-audio-fill{display:block;background:linear-gradient(90deg,#28b8a2,#63f2cf);height:100%;width:100%;transform:scaleX(.05);transform-origin:left;transition:transform 90ms linear}',
 '@media(prefers-reduced-motion:reduce){#jv-new-audio-fill{transition:none!important}}'
 ].join('');
 document.head.append(style);
 // Remove old bottom error/status captions, including those left by an
 // earlier TEST version. The sphere alone indicates the conversation state.
 document.getElementById('jv-new-live-voice-status')?.remove();
 document.getElementById('jv-new-mic-chip')?.remove();
 micChip=document.createElement('button');
 micChip.id='jv-new-mic-chip';
 micChip.type='button';
 micChip.hidden=true;
 micChip.setAttribute('aria-live','polite');
 micChip.setAttribute('aria-label','Микрофон JARVIX');
 micChip.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  resumeMicrophone();
 });
 document.body.appendChild(micChip);
 document.getElementById('jv-new-transcript')?.remove();
 transcriptWrap=document.createElement('div');
 transcriptWrap.id='jv-new-transcript';
 transcriptWrap.hidden=true;
 transcriptWrap.setAttribute('role','status');
 transcriptWrap.setAttribute('aria-live','polite');
 transcriptText=document.createElement('div');
 transcriptText.id='jv-new-transcript-text';
 const level=document.createElement('div');
 level.id='jv-new-audio-meter';
 level.setAttribute('aria-hidden','true');
 meterFill=document.createElement('span');
 meterFill.id='jv-new-audio-fill';
 level.appendChild(meterFill);
 transcriptWrap.appendChild(transcriptText);
 transcriptWrap.appendChild(level);
 document.body.appendChild(transcriptWrap);
 window.addEventListener('resize',positionMicChip,{passive:true});
 window.addEventListener('scroll',positionMicChip,{passive:true});
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
  orb=target;positionMicChip();void start();
 },true);
 window.addEventListener('pagehide',()=>stop());
 window.__jarvixNewVoiceStop=()=>stop();
}