import {saveStudioHandoff} from './studio-handoff.js';
import {extractAction} from './jarvix-action-plan.js';
import {recordedConversationReply as recordedReply,recordedExact,wasRecordedReplyUsed} from './jarvix-new-recorded-dialog.js';
import {helloRecording,smalltalkReply,smalltalkTextReply,isGreetingOnly} from './jarvix-new-smalltalk.js';
/* JARVIX NEW — voice-only mode on the OWNER'S EXISTING sphere, TEST host only.
   No new page, code form, paid API or simulated model answer. */
const HOST=location.hostname;
const production=HOST==='deepsyq.app'||HOST==='www.deepsyq.app';
const EXTRA_NAVIGATION = [
 ['ai-pricing.html', /(?:ai\s*credits?|(?:ai|ии)[-\s]*кредит|кредит[а-яё]*\s*(?:ai|ии))/iu],
 ['design-gallery.html', /(?:галере[яюи]|design gallery)/iu],
 ['contact.html', /(?:контакт|поддержк|contact|support)/iu],
 ['cookie.html', /(?:cookie|куки)/iu],
 ['terms.html', /(?:услови|terms)/iu],
 ['refund.html', /(?:возврат|refund)/iu],
 ['connect.html', /(?:подключени[ея]|connect jarvix)/iu],
 ['jarvix-download.html', /(?:скачать|загрузк|download)/iu],
 ['telegram-free-mini.html', /(?:телеграм|telegram)/iu],
 ['deepsyq-vs-deepseek.html', /(?:deepseek|дипсик|дипсик и deepsyq)/iu],
 ['mobile-utility.html?tool=pdf-merge', /(?:объедин[а-яё]*\s*(?:pdf|пдф)|merge pdf)/iu],
 ['mobile-utility.html?tool=pdf-split', /(?:раздел[а-яё]*\s*(?:pdf|пдф)|split pdf)/iu]
];
const NAVIGATION_COMMAND = /(?:^|\s)(?:открой|перейди|запусти|открыть|open|go to|navigate to|ouvre|abre|affiche|покажи|show)(?:\s|$)/iu;
const NAVIGATION_RECORDINGS_RU = Object.freeze({
 apps:'t3_ru_f559fae64a74.mp3',
 canvas:'t3_ru_d099fcb88e6b.mp3',
 tools:'t3_ru_1605028562a2.mp3',
 uniquifier:'t3_ru_9fa5da660ff3.mp3',
 inspiration:'t3_ru_2dade145e1b8.mp3',
 pricing:'t3_ru_ec7fe5d85de4.mp3'
});
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
const RESUME_KEY='jarvix-new:resume-listening';
const CONVERSATION_MEMORY='jarvix-new:conversation:v1';
function cleanTurns(saved){
 if(!Array.isArray(saved))return [];
 return saved.slice(-20).filter(turn=>turn&&
  (turn.role==='user'||turn.role==='assistant')&&typeof turn.content==='string')
  .map(({role,content})=>({role,content:content.slice(0,1200)}));
}
function loadMemory(){
 if(!production&&HOST!=='jarvis-new.deepsyq.pages.dev')return {turns:[],updatedAt:0};
 try{
  const saved=JSON.parse(sessionStorage.getItem(CONVERSATION_MEMORY)||'[]');
  return {turns:cleanTurns(Array.isArray(saved)?saved:saved?.turns),
   updatedAt:Number.isFinite(saved?.updatedAt)?saved.updatedAt:0};
 }catch{return {turns:[],updatedAt:0};}
}
const restoredMemory=loadMemory();
let turns=restoredMemory.turns,orb=null,micChip=null,micStage='idle',micFailures=0;
let memoryChannel=null,memoryUpdatedAt=restoredMemory.updatedAt;
function saveMemory(){
 try{sessionStorage.setItem(CONVERSATION_MEMORY,JSON.stringify({turns,updatedAt:memoryUpdatedAt}));}catch{}
}
function syncConversation(){
 if(production)return;
 if(typeof BroadcastChannel!=='function')return;
 try{
  memoryChannel=new BroadcastChannel(CONVERSATION_MEMORY);
  memoryChannel.onmessage=({data})=>{
   if(data?.type==='request'&&turns.length){
    memoryChannel.postMessage({type:'history',turns,updatedAt:memoryUpdatedAt});
   }else if(data?.type==='history'&&Number.isFinite(data.updatedAt)&&
            (data.updatedAt>memoryUpdatedAt||(!turns.length&&data.updatedAt===memoryUpdatedAt))){
    turns=cleanTurns(data.turns);
    memoryUpdatedAt=data.updatedAt;
    saveMemory();
   }
  };
  memoryChannel.postMessage({type:'request'});
 }catch{memoryChannel=null;}
}
function rememberTurn(message,reply){
 turns=[...turns,{role:'user',content:message.slice(0,1200)},
  {role:'assistant',content:String(reply||'').slice(0,1200)}].slice(-20);
 memoryUpdatedAt=Math.max(Date.now(),memoryUpdatedAt+1);
 saveMemory();
 try{memoryChannel?.postMessage({type:'history',turns,updatedAt:memoryUpdatedAt});}catch{}
}
let transcriptWrap=null,transcriptText=null,transcriptReply=null,heardText='',heardIsFinal=false,botReplyText='';
let micPulseRms=0,recognizedPulseTimer=null;
let monitorStream=null,monitorContext=null,monitorAnalyser=null,monitorTimer=null,monitorSamples=null;
let ownerWebSource=null,playbackAbort=null;
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
  transcriptWrap.style.top=Math.min(innerHeight-40,y+(micChip.offsetHeight||35)+5)+'px';
 }
}
function setTranscript(text='',final=false){
 heardText=String(text||'').trim().slice(0,400);
 heardIsFinal=!!final;
 if(!heardText)botReplyText='';
 renderTranscript();
}
function showTextResponse(text){
 botReplyText=String(text||'').trim().slice(0,400);
 renderTranscript();
}
function renderTranscript(){
 if(!transcriptWrap||!transcriptText)return;
 // No framed prompt. Actual recognized words and optional answer only.
 transcriptWrap.hidden=!(on&&(heardText||botReplyText));
 if(transcriptWrap.hidden)return;
 transcriptText.hidden=!heardText;
 transcriptText.textContent=heardText;
 transcriptText.dataset.actual=heardText?'true':'false';
 if(transcriptReply){
  transcriptReply.hidden=!botReplyText;
  transcriptReply.textContent=botReplyText?'JARVIX: '+botReplyText:'';
 }
 transcriptWrap.dataset.stage=micStage;
 transcriptWrap.dataset.final=heardIsFinal?'true':'false';
 positionMicChip();
}
function updateSphereFromMicrophone(rms){
 // Use real microphone amplitude, with a slight noise gate and smooth decay.
 const effective=on&&micStage==='listening'&&Number.isFinite(rms)?
   Math.max(0,Math.min(.2,rms-.012)):0;
 micPulseRms=micPulseRms*.58+effective*.42;
 const volume=Math.min(1,micPulseRms*13);
 orb?.style?.setProperty?.('--jv-mic-scale',(1+volume*.19).toFixed(3));
 orb?.style?.setProperty?.('--jv-mic-glow',(5+volume*24).toFixed(1)+'px');
 orb?.setAttribute?.('data-jv-mic-live',volume>.035?'true':'false');
}
// Unlock Web Audio in the ORIGINAL user click. Mobile browsers may block
// AudioContext.resume() when called after awaiting microphone permission.
function ensureAudioContextFromGesture(){
 const Ctx=window.AudioContext||window.webkitAudioContext;
 if(!Ctx)return null;
 try{
  if(!monitorContext||monitorContext.state==='closed')monitorContext=new Ctx();
  Promise.resolve(monitorContext.resume?.()).catch(()=>{});
  return monitorContext;
 }catch{return null;}
}
// When a mobile browser cannot expose WebAudio microphone samples,
// pulse on a REAL partial recognition result instead. Never pulse merely
// because "listening" is shown or because a timer elapsed.
function pulseOnRecognizedWords(){
 if(monitorAnalyser&&monitorContext?.state==='running')return;
 if(recognizedPulseTimer!==null){
  clearTimeout(recognizedPulseTimer);recognizedPulseTimer=null;
 }
 micPulseRms=.055;
 updateSphereFromMicrophone(.1);
 recognizedPulseTimer=setTimeout(()=>{
  recognizedPulseTimer=null;micPulseRms=0;
  updateSphereFromMicrophone(0);
 },180);
}
// The sound level is read from the local microphone stream. No raw audio
// is uploaded by this meter. Browser speech recognition is separate.
function stopMicMonitor(){
 if(recognizedPulseTimer!==null){
  clearTimeout(recognizedPulseTimer);recognizedPulseTimer=null;
 }
 micPulseRms=0;
 if(monitorTimer!==null){clearInterval(monitorTimer);monitorTimer=null;}
 if(monitorStream){
  try{monitorStream.getTracks().forEach(track=>track.stop());}catch{}
  monitorStream=null;
 }
 try{monitorContext?.close?.();}catch{}
 monitorContext=null;monitorAnalyser=null;monitorSamples=null;
 updateSphereFromMicrophone(0);
}
function startMicMonitor(stream){
 if(monitorTimer!==null){clearInterval(monitorTimer);monitorTimer=null;}
 if(monitorStream&&monitorStream!==stream){
  try{monitorStream.getTracks().forEach(t=>t.stop());}catch{}
 }
 monitorStream=stream;
 if(!monitorContext)return;
 try{
  const source=monitorContext.createMediaStreamSource(stream);
  monitorAnalyser=monitorContext.createAnalyser();
  monitorAnalyser.fftSize=512;
  source.connect(monitorAnalyser); // NOT connected to speakers.
  monitorSamples=new Uint8Array(monitorAnalyser.fftSize);
  Promise.resolve(monitorContext.resume?.()).catch(()=>{});
  monitorTimer=setInterval(()=>{
   if(!on||micStage!=='listening'||!monitorAnalyser){
    updateSphereFromMicrophone(0);
    return;
   }
   monitorAnalyser.getByteTimeDomainData(monitorSamples);
   let sum=0;
   for(const value of monitorSamples){
    const centered=(value-128)/128;
    sum+=centered*centered;
   }
   updateSphereFromMicrophone(Math.sqrt(sum/monitorSamples.length));
  },65);
 }catch{
  try{monitorContext?.close?.();}catch{}
  monitorContext=null;monitorAnalyser=null;monitorSamples=null;
 }
}
function ui(stage='idle'){
 micStage=stage;
 if(stage!=='listening')updateSphereFromMicrophone(0);
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
   const symbol=stage==='speaking'?'◖))':stage==='thinking'?'◌':stage==='listening'?'👂':'🎤';
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
 if(ownerWebSource){try{ownerWebSource.stop();}catch{}ownerWebSource=null;}
 if(playbackAbort){try{playbackAbort.abort();}catch{}playbackAbort=null;}
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
 ensureAudioContextFromGesture();
 if(ownerClip){try{ownerClip.pause();ownerClip.currentTime=0;}catch{}ownerClip=null;}
 if(ownerWebSource){try{ownerWebSource.stop();}catch{}ownerWebSource=null;}
 if(playbackAbort){try{playbackAbort.abort();}catch{}playbackAbort=null;}
 if(ownerClipDone){const finish=ownerClipDone;ownerClipDone=null;finish(false);}
 if(request){try{request.abort();}catch{}request=null;}
 cancelRecognition();
 micFailures=0;
 setTranscript('');
 // Called synchronously from a REAL touch/click: mobile recognition often
 // requires this direct user gesture after audio playback.
 listen(seq);
}
async function playOwnerUsingUnlockedAudio(record,id){
 // Reuse original MP3 if mobile browser rejects HTMLMediaElement.play().
 // This is decoding, NOT synthetic voice generation.
 const ctx=monitorContext;
 if(!ctx||typeof ctx.decodeAudioData!=='function'||
    typeof ctx.createBufferSource!=='function'||ctx.state!=='running')return false;
 const controller=new AbortController();
 playbackAbort=controller;
 const cutoff=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch(record.audioUrl,{signal:controller.signal,cache:'no-store',mode:'cors'});
  if(!response.ok||Number(response.headers.get('content-length')||0)>8_000_000)return false;
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<1000||bytes.byteLength>8_000_000)return false;
  const pcm=await ctx.decodeAudioData(bytes);
  if(!on||seq!==id||ctx.state!=='running')return false;
  return await new Promise(resolve=>{
   let node,done=false;
   const finish=ok=>{
    if(done)return;done=true;
    if(node)node.onended=null;
    if(ownerWebSource===node)ownerWebSource=null;
    if(ownerClipDone===finish)ownerClipDone=null;
    resolve(ok);
   };
   try{
    node=ctx.createBufferSource();
    ownerWebSource=node;
    ownerClipDone=finish;
    node.buffer=pcm;
    node.connect(ctx.destination);
    node.onended=()=>finish(true);
    if(Number.isFinite(record.stopAtSeconds)&&record.stopAtSeconds>0)
     node.start(0,0,Math.min(record.stopAtSeconds,pcm.duration));
    else node.start(0);
   }catch{finish(false);}
  });
 }catch{return false;}
 finally{
  clearTimeout(cutoff);
  if(playbackAbort===controller)playbackAbort=null;
 }
}
async function playOwnerRecording(record,id,timeoutMs=0,allowFallback=!timeoutMs){
 if(!record?.audioUrl||!on||seq!==id)return false;
 return new Promise(resolve=>{
  // The original hosted MP3 is used unchanged. Never synthesize or substitute text.
  const audio=new Audio(record.audioUrl);
  ownerClip=audio;
  let finished=false,timer;
  const finish=(ok,blocked=false)=>{
   if(finished)return;
   clearTimeout(timer);
   finished=true;audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;
   if(ownerClip===audio)ownerClip=null;
   if(ownerClipDone===finish)ownerClipDone=null;
   const settle=value=>{
    if(record.temporaryBlob===true)try{URL.revokeObjectURL(record.audioUrl);}catch{}
    resolve(value);
   };
   if(blocked&&on&&seq===id)
    void playOwnerUsingUnlockedAudio(record,id).then(settle,()=>settle(false));
   else settle(ok);
  };
  if(timeoutMs)timer=setTimeout(()=>{audio.pause();finish(false);},timeoutMs);
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
  try{Promise.resolve(audio.play()).catch(()=>finish(false,allowFallback));}catch{finish(false,allowFallback);}
 });
}
const recordedLanguage=()=>getLang().lang.slice(0,2);
function listen(id){
 if(!on||seq!==id)return;
 const SR=Recognition();
 if(!SR){ui('unsupported');return;}
 cancelRecognition();
 setTranscript(''); // New microphone turn: show new words, not last answer.
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
  pulseOnRecognizedWords();
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
 if(production)return null;
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
 const seen=[...turns];
 const parts=(record.parts||[record]).filter(part=>{
  if(wasRecordedReplyUsed(part.text,seen))return false;
  seen.push({role:'assistant',content:part.text});
  return true;
 });
 if(!parts.length){
  if(record.temporaryBlob)URL.revokeObjectURL(record.audioUrl);
  return false;
 }
 const spoken=[];
 for(const part of parts){
  if(!await playOwnerRecording(part,id)||!on||seq!==id)break;
  spoken.push(part.text);
 }
 if(spoken.length)rememberTurn(message,spoken.join(' '));
 if(spoken.length!==parts.length)return false;
 listen(id);
 return true;
}
async function respond(message,id){
 if(!on||seq!==id)return;
 ui('thinking');
 const lang=recordedLanguage();
 showTextResponse('');
 setTranscript(message,true);
 const extra=NAVIGATION_COMMAND.test(message)
  ? EXTRA_NAVIGATION.find(([,pattern])=>pattern.test(message))?.[0] : null;
 const command=message.replace(/^\s*(?:джарвис|джарвикс|jarvix|jarvis)[,\s:]+/iu,'');
 const action=extra?null:extractAction(command.replace(/^(?:я\s+хочу|можешь)\s+(?:создать|сделать|сгенерировать|нарисовать)\s+/iu,'Создай '))||(extra?null:extractAction(command.replace(/\bcanva\b/giu,'Canvas')));
 const imageRequest=command.replace(/^(?:(?:слушай|эй|джарвис|джарвикс|jarvix|jarvis|пожалуйста)[,\s:]+)+/iu,'').trim();
 if(/^(?:(?:ты\s+)?можешь\s+(?:создать|сделать|сгенерировать|нарисовать)|создай|сделай|сгенерируй|нарисуй)\s+(?:мне\s+)?(?:изображение|картинку|фото)[.!?…]*$/iu.test(imageRequest)){
  const confirmation='Да, конечно.';
  showTextResponse(confirmation);
  const clip=await recordedExact(confirmation,lang).catch(()=>null);
  if(clip&&on&&seq===id)await playOwnerRecording(clip,id,1500);
  if(on&&seq===id)location.assign(new URL('/jarvix-chat.html?mode=image&jarvixImage=1',location.origin));
  return;
 }
 if(action?.intent==='GENERATE_MEDIA'&&action.raw_prompt){
  try{
   await saveStudioHandoff({
    kind:action.media_type==='audio'?'music':action.media_type,
    prompt:action.raw_prompt,source:'jarvix-new-voice',
    settings:action.aspect_ratio?{ratio:action.aspect_ratio}:{}
   });
   if(on&&seq===id)location.assign(new URL(action.url,location.origin+'/'));
   return;
  }catch{
   if(on&&seq===id)listen(id);
   return;
  }
 }
 const destination=extra||(action?.intent==='NAVIGATE'
  ? (action.target==='uniquifier'?'video-uniquifier.html':action.url) : null);
 if(destination){
  const clip=lang==='ru'&&action?.target?NAVIGATION_RECORDINGS_RU[action.target]:null;
  if(clip)await playOwnerRecording({audioUrl:'/media/jarvix/tour-v3/'+clip},id,2500);
  if(!on||seq!==id)return;
  location.assign(new URL(destination,location.origin+'/'));
  return;
 }
 if(isGreetingOnly(message,lang)){
  listen(id);
  return;
 }

 const recorded=await recordedReply(command,lang,turns).catch(()=>null);
 if(!on||seq!==id)return;
 if(await playResponse(recorded,id,message))return;
 if(!on||seq!==id)return;

 const smalltalk=await smalltalkReply(message,lang,{findRecording:recordedExact}).catch(()=>null);
 if(!on||seq!==id)return;
 if(await playResponse(smalltalk,id,message))return;
 if(!on||seq!==id)return;

 // 2. Future paid voice: remains OFF until owner enables server-side
 // entitlement, real budget reserve and approved voice. Never fake it.
 const premium=production?null:await paidVoiceReply(message,lang,id);
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

 // Keep the prepared text available when its spoken equivalent is unavailable.
 const prepared=await smalltalkTextReply(message,lang).catch(()=>null);
 if(!on||seq!==id)return;
 if(prepared?.text&&!wasRecordedReplyUsed(prepared.text,turns)){
  showTextResponse(prepared.text);
  rememberTurn(message,prepared.text);
 }else ui('missing');
 const delay=botReplyText?3800:1400;
 pending=setTimeout(()=>{pending=null;if(on&&seq===id)listen(id);},delay);
}
async function start({greet=true}={}){
 if(on){stop();return;}
 if(!Recognition()){on=true;ui('unsupported');return;}
 if(!navigator.mediaDevices?.getUserMedia){on=true;ui('error');return;}
 on=true;const id=++seq;setTranscript('');ui('starting');
 ensureAudioContextFromGesture(); // synchronous mobile click, before await
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  if(!on||seq!==id){stream.getTracks().forEach(track=>track.stop());return;}
  startMicMonitor(stream);
 }catch{if(on&&seq===id)ui('error');return;}
 if(!on||seq!==id)return;
 if(greet){
  const language=recordedLanguage();
  const greeting=await helloRecording(language).catch(()=>null);
  if(on&&seq===id)await playOwnerRecording(greeting,id,3000,true);
 }
 if(on&&seq===id)listen(id);
}
export function installJarvixNewVoice(){
 if((!production&&HOST!=='jarvis-new.deepsyq.pages.dev')||window.__jarvixVoiceReady)return;
 window.__jarvixVoiceReady=true;
 syncConversation();
 orb=document.getElementById('topJarvisBtn');
 const style=document.createElement('style');style.id='jv-new-voice-style';
 style.textContent=[
 '@keyframes jvListen{0%,100%{filter:hue-rotate(-18deg) drop-shadow(0 0 9px #34dce1)}50%{filter:hue-rotate(10deg) drop-shadow(0 0 20px #4effe6)}}',
 '@keyframes jvThink{0%,100%{filter:drop-shadow(0 0 7px #f2a949)}50%{filter:drop-shadow(0 0 24px #f9d27a)}}',
 '@keyframes jvSpeak{0%,100%{filter:drop-shadow(0 0 9px #ce58d4)}50%{filter:drop-shadow(0 0 29px #ff9f41) drop-shadow(0 0 10px #bc6bfc)}}',
 '#topJarvisBtn.jv-new-voice-listening .jarvis-mini-orb{animation:none!important;transform:scale(var(--jv-mic-scale,1))!important;filter:drop-shadow(0 0 var(--jv-mic-glow,5px) #40e6d5)!important;transform-origin:center!important;transition:transform 75ms ease-out,filter 75ms linear!important;will-change:transform,filter}',
 '#topJarvisBtn.jv-new-voice-thinking .jarvis-mini-orb{animation:jvThink .95s ease-in-out infinite!important}',
 '#topJarvisBtn.jv-new-voice-speaking .jarvis-mini-orb{animation:jvSpeak .5s ease-in-out infinite!important}',
 '@media(prefers-reduced-motion:reduce){#topJarvisBtn.jv-new-voice-active .jarvis-mini-orb{animation:none!important}}',
 '#jv-new-mic-chip{position:fixed;transform:translateX(-50%);z-index:2147482001;display:flex;align-items:center;justify-content:center;white-space:nowrap;max-width:min(90vw,240px);min-height:30px;padding:5px 11px;border:1px solid #3faaa9;border-radius:999px;background:#101a28f2;color:#f0fafa;font:600 12px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px #06122166;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
 '#jv-new-mic-chip[hidden]{display:none!important}',
 '#jv-new-mic-chip[data-state="listening"]{border-color:#4dffe1;box-shadow:0 0 12px #24c7b980}',
 '#jv-new-mic-chip[data-state="speaking"]{border-color:#d790f4;box-shadow:0 0 12px #a85fe688}',
  '@keyframes jvBars{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}',
  '#jv-new-mic-chip[data-state="speaking"]::after{content:"";display:inline-block;width:21px;height:14px;margin-left:8px;background:linear-gradient(90deg,#d790f4 0 3px,transparent 3px 6px,#ff9f41 6px 9px,transparent 9px 12px,#d790f4 12px 15px,transparent 15px 18px,#ff9f41 18px 21px);animation:jvBars .6s ease-in-out infinite;transform-origin:center bottom}',
 '#jv-new-mic-chip[data-state="error"],#jv-new-mic-chip[data-state="unsupported"]{border-color:#f2a960;color:#ffda9f}',
 '#jv-new-mic-chip:disabled{opacity:.9;cursor:default}',
 '#jv-new-transcript{position:fixed;z-index:2147482000;transform:translateX(-50%);width:min(290px,calc(100vw - 24px));padding:0 2px;background:transparent;border:none;border-radius:0;color:#fff;text-shadow:0 2px 7px #0a1429,0 0 9px #071126;box-shadow:none;pointer-events:none;text-align:center;font:600 15px/1.45 system-ui,sans-serif;overflow-wrap:anywhere}',
 '#jv-new-transcript[hidden]{display:none!important}',
 '#jv-new-transcript-text[data-actual="true"]{font-weight:700;font-size:16px;color:#fff}',
 '#jv-new-transcript-reply{margin-top:5px;color:#ffe0a5;font-size:13px;font-weight:600;line-height:1.45}',
 '#jv-new-transcript-reply[hidden]{display:none!important}',
 '@media(prefers-reduced-motion:reduce){#topJarvisBtn.jv-new-voice-listening .jarvis-mini-orb{transition:none!important}}'
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
 transcriptReply=document.createElement('div');
 transcriptReply.id='jv-new-transcript-reply';
 transcriptReply.hidden=true;
 transcriptWrap.appendChild(transcriptText);
 transcriptWrap.appendChild(transcriptReply);
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
  orb=target;positionMicChip();window.__jarvixBeforeNewVoice?.();void start();
 },true);
 const resumeAfterNavigation=()=>{
  if(on)return;
  try{
   const expires=Number(sessionStorage.getItem(RESUME_KEY));
   sessionStorage.removeItem(RESUME_KEY);
   if(expires>Date.now())void start({greet:false});
  }catch{}
 };
 window.addEventListener('pagehide',()=>{
  try{
   if(on)sessionStorage.setItem(RESUME_KEY,String(Date.now()+15000));
   else sessionStorage.removeItem(RESUME_KEY);
  }catch{}
  stop();
 });
 window.addEventListener('pageshow',resumeAfterNavigation);
 resumeAfterNavigation();
 window.__jarvixNewVoiceStop=()=>stop();
}