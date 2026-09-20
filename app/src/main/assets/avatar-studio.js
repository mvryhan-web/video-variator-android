import {createEngine,saveLocal} from './ai-media.js';

const $=id=>document.getElementById(id);
const lang=(navigator.language||'en-US').toLowerCase();
const locale=lang.startsWith('ru')?'ru':lang.startsWith('fr')?'fr':lang.startsWith('uk')?'uk':'en';
const dict={
 en:{back:'← Back',included:'Free 720p test · Full quality in Basic, Pro & Business',title:'Avatar Narrator',intro:'Put your video on top and your photo avatar below. Choose one narration source: a device voice or your own voice.',plan:'Access',video:'1 · Source video',photo:'2 · Your avatar photo',voiceSource:'3 · Choose one voice option',voiceSourceNote:'Use either a device voice or your own voice. You do not need both.',deviceOption:'Device voice',deviceOptionNote:'English, French and other installed voices',ownOption:'My voice',ownOptionNote:'Upload audio or record directly',text:'4 · Narration text',textNote:'Device voice reads this text. With My voice, keep it as your script/reference.',deviceVoice:'Device voice',deviceVoiceNote:'Open the list and tap any voice to hear it. Press Select on the voice you want to use in the finished video.',chooseVoice:'Choose a voice',useVoice:'Select',ownVoice:'My voice',ownVoiceNote:'Choose one: upload an existing audio file or record your narration here.',audio:'Upload voice audio',record:'Record voice',stop:'Stop recording',consent:'I confirm this is my voice/photo, or I have permission to use them for this video.',motionNote:'The local avatar uses subtle lower-face movement so the mouth area moves while narration plays. It is not full cloud lip-sync.',create:'Create split-screen video',cancel:'Cancel',recent:'Recent Avatar videos',recentNote:'Saved projects and completed videos remain available after you reopen the app.',fullHistory:'Full history',progress:'Creating video'},
 ru:{back:'← Назад',included:'Бесплатный тест 720p · Полное качество в Basic, Pro и Business',title:'Аватар-комментатор',intro:'Сверху — ваше видео, снизу — фото-аватар. Выберите один вариант озвучки: голос устройства или свой голос.',plan:'Доступ',video:'1 · Исходное видео',photo:'2 · Фото аватара',voiceSource:'3 · Выберите один вариант голоса',voiceSourceNote:'Используйте либо голос устройства, либо свой голос. Оба сразу не нужны.',deviceOption:'Голос устройства',deviceOptionNote:'Английский, французский и другие установленные голоса',ownOption:'Мой голос',ownOptionNote:'Загрузить аудио или записать прямо здесь',text:'4 · Текст для озвучки',textNote:'Голос устройства читает этот текст. Для своего голоса текст можно использовать как сценарий.',deviceVoice:'Голос устройства',deviceVoiceNote:'Откройте список и нажимайте на любой голос — он сразу проигрывается. Нажмите «Выбрать» у нужного голоса, чтобы использовать его в готовом видео.',chooseVoice:'Выберите голос',useVoice:'Выбрать',ownVoice:'Мой голос',ownVoiceNote:'Выберите одно: загрузите готовое аудио или запишите озвучку прямо здесь.',audio:'Загрузить аудио голоса',record:'Записать голос',stop:'Остановить запись',consent:'Я подтверждаю, что это мой голос/фото или у меня есть разрешение использовать их в этом видео.',motionNote:'Локальная версия слегка двигает нижнюю часть лица, чтобы область рта двигалась во время озвучки. Это не полный облачный lip-sync.',create:'Создать видео с двумя экранами',cancel:'Отмена',recent:'История Avatar',recentNote:'Проекты и готовые видео сохраняются и остаются после повторного входа в приложение.',fullHistory:'Вся история',progress:'Создание видео'},
 fr:{back:'← Retour',included:'Test gratuit 720p · Qualité complète avec Basic, Pro et Business',title:'Narrateur avatar',intro:'Votre vidéo en haut, votre avatar photo en bas. Choisissez une seule source de narration : une voix de l’appareil ou votre propre voix.',plan:'Accès',video:'1 · Vidéo source',photo:'2 · Photo avatar',voiceSource:'3 · Choisissez une option de voix',voiceSourceNote:'Utilisez soit une voix de l’appareil, soit votre propre voix. Les deux ne sont pas nécessaires.',deviceOption:'Voix de l’appareil',deviceOptionNote:'Voix anglaises, françaises et autres installées',ownOption:'Ma voix',ownOptionNote:'Importer un audio ou enregistrer directement',text:'4 · Texte de narration',textNote:'La voix de l’appareil lit ce texte. Avec votre propre voix, gardez-le comme script/référence.',deviceVoice:'Voix de l’appareil',deviceVoiceNote:'Ouvrez la liste et touchez une voix pour l’écouter. Appuyez sur Choisir pour l’utiliser dans la vidéo finale.',chooseVoice:'Choisir une voix',useVoice:'Choisir',ownVoice:'Ma voix',ownVoiceNote:'Choisissez une option : importez un fichier audio existant ou enregistrez votre narration ici.',audio:'Importer la voix',record:'Enregistrer la voix',stop:'Arrêter l’enregistrement',consent:'Je confirme que cette voix/photo m’appartient ou que j’ai l’autorisation de l’utiliser.',motionNote:'La version locale anime légèrement le bas du visage afin que la zone de la bouche bouge pendant la narration. Ce n’est pas un lip-sync cloud complet.',create:'Créer la vidéo',cancel:'Annuler',recent:'Vidéos Avatar récentes',recentNote:'Les projets et vidéos terminées restent disponibles après la réouverture de l’application.',fullHistory:'Historique complet',progress:'Création de la vidéo'},
 uk:{back:'← Назад',included:'Безкоштовний тест 720p · Повна якість у Basic, Pro та Business',title:'Аватар-оповідач',intro:'Ваше відео зверху, фото-аватар знизу. Оберіть один варіант озвучення: голос пристрою або власний голос.',plan:'Доступ',video:'1 · Вихідне відео',photo:'2 · Фото аватара',voiceSource:'3 · Оберіть один варіант голосу',voiceSourceNote:'Використовуйте або голос пристрою, або власний голос. Обидва одночасно не потрібні.',deviceOption:'Голос пристрою',deviceOptionNote:'Англійські, французькі та інші встановлені голоси',ownOption:'Мій голос',ownOptionNote:'Завантажити аудіо або записати прямо тут',text:'4 · Текст озвучення',textNote:'Голос пристрою читає цей текст. Для власного голосу текст можна використовувати як сценарій.',deviceVoice:'Голос пристрою',deviceVoiceNote:'Відкрийте список і натискайте на будь-який голос для прослуховування. Натисніть «Обрати» біля потрібного голосу, щоб використати його в готовому відео.',chooseVoice:'Оберіть голос',useVoice:'Обрати',ownVoice:'Мій голос',ownVoiceNote:'Оберіть одне: завантажте готове аудіо або запишіть озвучення прямо тут.',audio:'Завантажити голос',record:'Записати голос',stop:'Зупинити запис',consent:'Я підтверджую, що це мій голос/фото або маю дозвіл на їх використання.',motionNote:'Локальна версія трохи рухає нижню частину обличчя, щоб область рота рухалася під час озвучення. Це не повний хмарний lip-sync.',create:'Створити відео',cancel:'Скасувати',recent:'Історія Avatar',recentNote:'Проєкти та готові відео зберігаються після повторного входу в застосунок.',fullHistory:'Уся історія',progress:'Створення відео'}
};
const msg={
 en:{free:'Free test · 720p',ready:'Ready to create. Your project is saved locally.',need:'Add a video, avatar photo, choose one voice option, add narration text and confirm permission.',needDevice:'Select a device voice to use in the finished video.',needOwn:'Upload or record your own voice.',deviceUnsupported:'Device voice export is available in the Android app. Choose My voice in the browser.',sample:'Hello. This is a preview of this device voice.',listening:'Previewing',chosen:'Selected',recorded:'Voice recorded locally',recording:'Recording…',micDenied:'Microphone permission was not granted. Upload an audio file instead.',processing:'Creating video locally…',preparing:'Preparing your saved project…',synthesizing:'Creating narration from the selected device voice…',done:'Done · saved locally and added to History.',queued:'Saved. This job will resume automatically when Avatar Narrator is open again.',restored:'Restored from your last session',historyProcessing:'Processing / resumes automatically',historyQueued:'Queued / resumes automatically',historyDone:'Ready',historyError:'Needs retry',download:'Download',share:'Share',storageFail:'Could not save this project for recovery. Free some device/browser storage and try again.'},
 ru:{free:'Бесплатный тест · 720p',ready:'Готово к созданию. Проект сохранён локально.',need:'Добавьте видео, фото аватара, выберите один вариант голоса, добавьте текст и подтвердите разрешение.',needDevice:'Выберите голос устройства для готового видео.',needOwn:'Загрузите или запишите свой голос.',deviceUnsupported:'Экспорт голоса устройства работает в Android-приложении. В браузере выберите «Мой голос».',sample:'Здравствуйте. Это пример этого голоса устройства.',listening:'Прослушивается',chosen:'Выбран',recorded:'Голос записан локально',recording:'Запись…',micDenied:'Нет доступа к микрофону. Можно загрузить аудиофайл.',processing:'Создаю видео локально…',preparing:'Подготавливаю сохранённый проект…',synthesizing:'Создаю озвучку выбранным голосом устройства…',done:'Готово · видео сохранено и добавлено в Историю.',queued:'Проект сохранён. Задание автоматически продолжится, когда Avatar Narrator снова будет открыт.',restored:'Восстановлено из прошлого сеанса',historyProcessing:'Создаётся / продолжится автоматически',historyQueued:'В очереди / продолжится автоматически',historyDone:'Готово',historyError:'Нужно повторить',download:'Скачать',share:'Поделиться',storageFail:'Не удалось сохранить проект для восстановления. Освободите немного памяти и попробуйте ещё раз.'},
 fr:{free:'Test gratuit · 720p',ready:'Prêt à créer. Le projet est enregistré localement.',need:'Ajoutez une vidéo, une photo avatar, choisissez une option de voix, ajoutez le texte et confirmez l’autorisation.',needDevice:'Choisissez une voix de l’appareil pour la vidéo finale.',needOwn:'Importez ou enregistrez votre propre voix.',deviceUnsupported:'L’export avec une voix de l’appareil est disponible dans l’application Android. Dans le navigateur, choisissez Ma voix.',sample:'Bonjour. Voici un aperçu de cette voix.',listening:'Écoute',chosen:'Choisie',recorded:'Voix enregistrée localement',recording:'Enregistrement…',micDenied:'Accès au microphone refusé. Importez un fichier audio.',processing:'Création locale de la vidéo…',preparing:'Préparation du projet enregistré…',synthesizing:'Création de la narration avec la voix sélectionnée…',done:'Terminé · vidéo enregistrée et ajoutée à l’historique.',queued:'Projet enregistré. Le traitement reprendra automatiquement à la réouverture.',restored:'Restauré depuis la dernière session',historyProcessing:'Traitement / reprise automatique',historyQueued:'En attente / reprise automatique',historyDone:'Prêt',historyError:'À réessayer',download:'Télécharger',share:'Partager',storageFail:'Impossible d’enregistrer ce projet pour reprise. Libérez de l’espace et réessayez.'},
 uk:{free:'Безкоштовний тест · 720p',ready:'Готово до створення. Проєкт збережено локально.',need:'Додайте відео, фото аватара, оберіть один варіант голосу, додайте текст і підтвердьте дозвіл.',needDevice:'Оберіть голос пристрою для готового відео.',needOwn:'Завантажте або запишіть власний голос.',deviceUnsupported:'Експорт голосу пристрою працює в Android-застосунку. У браузері оберіть «Мій голос».',sample:'Вітаю. Це приклад цього голосу пристрою.',listening:'Прослуховується',chosen:'Обрано',recorded:'Голос записано локально',recording:'Запис…',micDenied:'Немає доступу до мікрофона. Можна завантажити аудіофайл.',processing:'Створюю відео локально…',preparing:'Підготовка збереженого проєкту…',synthesizing:'Створюю озвучення обраним голосом пристрою…',done:'Готово · відео збережено й додано до Історії.',queued:'Проєкт збережено. Завдання автоматично продовжиться після відкриття Avatar Narrator.',restored:'Відновлено з минулого сеансу',historyProcessing:'Створюється / продовжиться автоматично',historyQueued:'У черзі / продовжиться автоматично',historyDone:'Готово',historyError:'Потрібно повторити',download:'Завантажити',share:'Поділитися',storageFail:'Не вдалося зберегти проєкт для відновлення. Звільніть трохи пам’яті та спробуйте ще раз.'}
}[locale];
document.querySelectorAll('[data-av]').forEach(el=>{const v=(dict[locale]||dict.en)[el.dataset.av];if(v)el.textContent=v;});

const media=window.VUPersistentMedia;
const DRAFT_KEY='vu_avatar_draft_v2',JOBS_KEY='vu_avatar_jobs_v2';
const policy={trial:{w:720,h:1280,label:'Free test · 720p'},basic:{w:720,h:1280,label:'Basic · 720p'},pro:{w:1080,h:1920,label:'Pro · 1080p'},business:{w:2160,h:3840,label:'Business · 4K'}};
const inputIds={video:'avatarVideo',photo:'avatarPhoto',voice:'avatarAudio'};
const savedIds={video:'avatarVideoSaved',photo:'avatarPhotoSaved',voice:'avatarAudioSaved'};
let plan='trial',engine=null,busy=false,cancelled=false,leaving=false,activeJobId=null,recordStream=null,recorder=null,recordChunks=[],recordedVoice=null,recordStartedAt=0,recordTimer=null;
let restored={video:null,photo:null,voice:null},chosenVoiceMeta=null;
const urls=[];
const token=localStorage.getItem('vv_token')||'';
const status=s=>$('avatarStatus').textContent=s;
const voiceStatus=s=>$('voiceStatus').textContent=s;
function setProgress(value,visible=true){
 const n=Math.max(0,Math.min(100,Math.round(Number(value)||0))),box=$('avatarProgress');
 if(!box)return;
 box.hidden=!visible;$('avatarProgressPercent').textContent=n+'%';$('avatarProgressBar').style.width=n+'%';
}
const u=b=>{const x=URL.createObjectURL(b);urls.push(x);return x;};
const readJson=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f));}catch(_){return f;}};
const writeJson=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const jobs=()=>readJson(JOBS_KEY,[]).slice(0,30);
function saveJobs(list){writeJson(JOBS_KEY,list.slice(0,30));}
function upsertJob(job){const list=jobs(),i=list.findIndex(x=>x.id===job.id);if(i>=0)list[i]=job;else list.unshift(job);saveJobs(list);renderAvatarHistory();return job;}
function patchJob(id,patch){const list=jobs(),i=list.findIndex(x=>x.id===id);if(i<0)return null;list[i]={...list[i],...patch,updatedAt:new Date().toISOString()};saveJobs(list);renderAvatarHistory();return list[i];}
function draft(){return readJson(DRAFT_KEY,{text:'',consent:false,files:{},voice:null,updatedAt:null});}
function saveDraft(patch={}){const d=draft(),next={...d,...patch,files:{...(d.files||{}),...(patch.files||{})},updatedAt:new Date().toISOString()};writeJson(DRAFT_KEY,next);return next;}
function fileFor(kind){return $(inputIds[kind])?.files?.[0]||restored[kind]||null;}
function noteFile(kind,name,restoredFlag=false){const el=$(savedIds[kind]);if(el)el.textContent=name?(restoredFlag?msg.restored+' · ':'')+name:'';}
function previewBlob(kind,blob){
 if(!blob)return;
 if(kind==='video'){$('avatarVideoPreview').src=u(blob);$('avatarVideoPreview').load();}
 if(kind==='photo')$('avatarPhotoPreview').src=u(blob);
}
async function persistDraftFile(kind,file){
 if(!file||!media) return;
 const key='avatar/draft/'+kind;
 try{
  await media.put(key,file);restored[kind]=file;
  saveDraft({files:{[kind]:{key,name:file.name||kind,type:file.type||'',size:file.size||0}}});
  noteFile(kind,file.name||kind,false);
 }catch(_){status(msg.storageFail);}
}
async function restoreDraft(){
 const d=draft();$('avatarText').value=d.text||'';$('voiceConsent').checked=!!d.consent;chosenVoiceMeta=d.voice||null;
 for(const kind of ['video','photo','voice']){
  const meta=d.files?.[kind];if(!meta?.key||!media)continue;
  const blob=await media.get(meta.key);if(!blob)continue;
  const file=new File([blob],meta.name||kind,{type:meta.type||blob.type||'application/octet-stream'});
  restored[kind]=file;noteFile(kind,file.name,true);previewBlob(kind,file);
  if(kind==='voice')voiceStatus(msg.restored+' · '+file.name);
 }
 updateReady();renderVoicePicker();
}
async function account(){
 if(!token){plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;updateReady();return;}
 try{
  const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token}}),d=await r.json(),usage=d.user?.usage||d.usage;
  if(r.ok&&usage?.active&&policy[usage.plan]){plan=usage.plan;$('avatarPlan').textContent=(d.user?.isAdmin?'Admin · ':'')+policy[plan].label+' · Avatar Narrator';$('avatarQuality').textContent=policy[plan].label;}
  else{plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;}
 }catch(_){plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;}
 updateReady();
}
function updateReady(){
 const ready=!!policy[plan]&&!!fileFor('video')&&!!fileFor('photo')&&!!$('avatarText').value.trim()&&$('voiceConsent').checked;
 $('avatarGenerate').disabled=busy||!ready;
 $('avatarReadyHint').textContent=ready?msg.ready:msg.need;
}
function voiceKey(v){return v?[v.name||'',v.lang||'',v.voiceURI||''].join('|'):'';}
function nativeVoices(){
 try{
  const raw=window.AndroidBridge?.getTtsVoices?.();
  const list=raw?JSON.parse(raw):[];
  return Array.isArray(list)?list.map(v=>({...v,native:true,voiceURI:v.voiceURI||v.name||''})).filter(v=>v.name):[];
 }catch(_){return [];}
}
function allVoices(){
 const native=nativeVoices();if(native.length)return native;
 return window.speechSynthesis?.getVoices?.()||[];
}
function findChosenVoice(){
 const list=allVoices();if(!chosenVoiceMeta)return null;
 return list.find(v=>voiceKey(v)===chosenVoiceMeta.key)||list.find(v=>v.name===chosenVoiceMeta.name&&v.lang===chosenVoiceMeta.lang)||null;
}
function stopVoicePreview(){try{window.AndroidBridge?.stopTtsVoice?.();}catch(_){}window.speechSynthesis?.cancel?.();}
function closeVoicePicker(){$('voicePickerMenu').hidden=true;$('voicePickerToggle').setAttribute('aria-expanded','false');}
function speakVoice(voice,row){
 if(!voice)return;
 stopVoicePreview();document.querySelectorAll('.voice-option.previewing').forEach(x=>x.classList.remove('previewing'));row?.classList.add('previewing');
 const text=$('avatarText').value.trim()||msg.sample;
 if(voice.native&&window.AndroidBridge?.speakTtsVoice){
  const ok=window.AndroidBridge.speakTtsVoice(voice.voiceURI||voice.name,text);
  $('voicePreviewStatus').textContent=(ok?msg.listening:'Voice unavailable')+': '+voice.name;
  if(!ok)row?.classList.remove('previewing');
  return;
 }
 if(!('speechSynthesis'in window)){row?.classList.remove('previewing');return;}
 const utter=new SpeechSynthesisUtterance(text);utter.voice=voice;utter.lang=voice.lang||navigator.language||'en-US';
 utter.onstart=()=>{$('voicePreviewStatus').textContent=msg.listening+': '+voice.name;};
 utter.onend=()=>{row?.classList.remove('previewing');$('voicePreviewStatus').textContent=chosenVoiceMeta?msg.chosen+': '+chosenVoiceMeta.name:'';};
 utter.onerror=utter.onend;window.speechSynthesis.speak(utter);
}
function chooseVoice(voice){
 chosenVoiceMeta={key:voiceKey(voice),name:voice.name,lang:voice.lang||'',voiceURI:voice.voiceURI||'',native:!!voice.native};
 saveDraft({voice:chosenVoiceMeta});$('voicePickerLabel').textContent=chosenVoiceMeta.name+' · '+chosenVoiceMeta.lang;$('voicePreviewStatus').textContent=msg.chosen+': '+chosenVoiceMeta.name;stopVoicePreview();closeVoicePicker();renderVoicePicker();
}
function renderVoicePicker(){
 const menu=$('voicePickerMenu');if(!menu)return;const voices=allVoices().slice();menu.replaceChildren();
 if(chosenVoiceMeta)$('voicePickerLabel').textContent=chosenVoiceMeta.name+' · '+chosenVoiceMeta.lang;else $('voicePickerLabel').textContent=(dict[locale]||dict.en).chooseVoice;
 voices.forEach(voice=>{
  const row=document.createElement('div');row.className='voice-option';row.setAttribute('role','option');row.setAttribute('aria-selected',voiceKey(voice)===chosenVoiceMeta?.key?'true':'false');
  const preview=document.createElement('button');preview.type='button';preview.className='voice-option-preview';preview.innerHTML='<span class="voice-play" aria-hidden="true">▶</span><span><b></b><small></small></span>';preview.querySelector('b').textContent=voice.name;preview.querySelector('small').textContent=voice.lang+(voice.default?' · Default':'');preview.onclick=e=>{e.stopPropagation();speakVoice(voice,row);};
  const select=document.createElement('button');select.type='button';select.className='voice-option-select';select.textContent=(dict[locale]||dict.en).useVoice;select.onclick=e=>{e.stopPropagation();chooseVoice(voice);};
  row.append(preview,select);menu.append(row);
 });
 if(!voices.length){const p=document.createElement('p');p.className='muted';p.textContent='No device voices available yet. Tap again in a moment.';menu.append(p);}
}
window.vuNativeVoicesReady=()=>renderVoicePicker();
renderVoicePicker();
if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=renderVoicePicker;
$('voicePickerToggle').addEventListener('click',e=>{e.stopPropagation();const open=$('voicePickerMenu').hidden;$('voicePickerMenu').hidden=!open;$('voicePickerToggle').setAttribute('aria-expanded',String(open));if(open)renderVoicePicker();});
document.addEventListener('click',e=>{if(!$('voicePicker').contains(e.target))closeVoicePicker();});

$('avatarVideo').onchange=async()=>{const f=$('avatarVideo').files[0];if(f){restored.video=f;previewBlob('video',f);await persistDraftFile('video',f);}updateReady();};
$('avatarPhoto').onchange=async()=>{const f=$('avatarPhoto').files[0];if(f){restored.photo=f;previewBlob('photo',f);await persistDraftFile('photo',f);}updateReady();};
let textTimer;
$('avatarText').oninput=()=>{clearTimeout(textTimer);textTimer=setTimeout(()=>saveDraft({text:$('avatarText').value}),120);updateReady();};
$('voiceConsent').onchange=()=>{saveDraft({consent:$('voiceConsent').checked});updateReady();};
$('avatarAudio').onchange=async()=>{recordedVoice=null;const f=$('avatarAudio').files[0];if(f){restored.voice=f;voiceStatus(f.name);await persistDraftFile('voice',f);}updateReady();};

$('recordVoice').onclick=async()=>{
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return voiceStatus(msg.micDenied);
 $('recordVoice').disabled=true;voiceStatus(msg.recording);
 try{
  recordStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});recordChunks=[];const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
  recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);recorder.ondataavailable=e=>{if(e.data&&e.data.size)recordChunks.push(e.data);};
  recorder.onerror=()=>{clearInterval(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$('recordVoice').disabled=false;$('stopVoice').disabled=true;voiceStatus(msg.micDenied);};
  recorder.onstop=async()=>{
   clearInterval(recordTimer);recordTimer=null;const type=recorder.mimeType||recordChunks[0]?.type||'audio/webm';
   recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$('recordVoice').disabled=false;$('stopVoice').disabled=true;
   if(!recordChunks.length){voiceStatus(msg.micDenied);return;}
   recordedVoice=new File(recordChunks,'VideoUniquifier-avatar-voice.'+(type.includes('mp4')?'m4a':'webm'),{type:type.split(';')[0]});restored.voice=recordedVoice;
   voiceStatus(msg.recorded+' · '+(recordedVoice.size/1048576).toFixed(2)+' MB');await persistDraftFile('voice',recordedVoice);updateReady();
  };
  recorder.start(250);recordStartedAt=Date.now();$('stopVoice').disabled=false;
  recordTimer=setInterval(()=>{const sec=Math.max(0,Math.floor((Date.now()-recordStartedAt)/1000)),m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');voiceStatus(msg.recording+' '+m+':'+s);},500);
 }catch(_){clearInterval(recordTimer);recordTimer=null;recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$('recordVoice').disabled=false;$('stopVoice').disabled=true;voiceStatus(msg.micDenied);}
};
$('stopVoice').onclick=()=>{if(recorder&&recorder.state!=='inactive'){$('stopVoice').disabled=true;recorder.stop();}};

function mediaDuration(file,kind='video'){return new Promise((resolve,reject)=>{const el=document.createElement(kind);el.preload='metadata';el.src=u(file);el.onloadedmetadata=()=>resolve(Number(el.duration)||0);el.onerror=()=>reject(Error('MEDIA_FORMAT'));});}
async function resultControls(file){
 const wrap=document.createElement('div'),video=document.createElement('video');video.controls=true;video.playsInline=true;video.src=u(file);video.className='ai-preview';wrap.append(video);
 const actions=document.createElement('div');actions.className='actions';
 const save=document.createElement('button');save.textContent=msg.download;save.onclick=()=>saveLocal(file).catch(()=>status('Could not save the video.'));
 const share=document.createElement('button');share.textContent=msg.share;share.onclick=()=>window.VUShareFile?.({name:file.name,blob:file});
 actions.append(save,share);wrap.append(actions);$('avatarResult').replaceChildren(wrap);
}
async function addGlobalHistory(job,file){
 const list=readJson('vv_history',[]),item={id:job.id,name:file.name,sourceName:job.sourceName,createdAt:job.createdAt,resolution:job.resolution,aspectRatio:'9:16',durationSeconds:job.durationSeconds||0,credits:0,saved:true,path:null,type:'avatar',mediaCacheKey:job.outputKey};
 const filtered=list.filter(x=>x.id!==item.id);filtered.unshift(item);writeJson('vv_history',filtered.slice(0,100));
 if(token)fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({items:[item]})}).catch(()=>{});
}
async function createJob(){
 const video=fileFor('video'),photo=fileFor('photo'),voice=fileFor('voice'),id='avatar-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),p=policy[plan]||policy.trial;
 const job={id,status:'queued',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sourceName:video.name||'source-video',photoName:photo.name||'avatar-photo',voiceName:voice?.name||null,text:$('avatarText').value.trim(),selectedDeviceVoice:chosenVoiceMeta,plan,resolution:p.w+'×'+p.h,sourceKey:id+'/source',photoKey:id+'/photo',voiceKey:voice?id+'/voice':null,outputKey:id+'/output'};
 try{
  await media.put(job.sourceKey,video);await media.put(job.photoKey,photo);if(voice)await media.put(job.voiceKey,voice);
 }catch(_){throw Error(msg.storageFail);}
 upsertJob(job);return job;
}
async function loadJobFile(job,key,name,type){const blob=await media?.get(job[key]);return blob?new File([blob],name,{type:blob.type||type}):null;}
async function processJob(job){
 if(busy)return;busy=true;cancelled=false;leaving=false;activeJobId=job.id;patchJob(job.id,{status:'processing'});$('avatarGenerate').disabled=true;$('avatarCancel').disabled=false;$('avatarResult').replaceChildren();setProgress(0,true);status(msg.preparing);
 try{
  const video=await loadJobFile(job,'sourceKey',job.sourceName,'video/mp4'),photo=await loadJobFile(job,'photoKey',job.photoName,'image/png'),voice=job.voiceKey?await loadJobFile(job,'voiceKey',job.voiceName||'voice','audio/webm'):null;
  if(!video||!photo)throw Error('Saved project media is unavailable.');
  const duration=await mediaDuration(video);if(!duration||duration>600)throw Error('Keep source video at 10 minutes or less for this local version.');
  const p=policy[job.plan]||policy.trial;patchJob(job.id,{durationSeconds:Math.ceil(duration),resolution:p.w+'×'+p.h});setProgress(5,true);engine=await createEngine();engine.on?.('progress',({progress})=>{const pct=10+Math.max(0,Math.min(1,Number(progress)||0))*84;setProgress(pct,true);status((voice?msg.processing:msg.silent)+' '+Math.round(pct)+'%');});if(cancelled)throw Error('CANCELLED');
  await engine.writeFile('source',new Uint8Array(await video.arrayBuffer()));await engine.writeFile('avatar',new Uint8Array(await photo.arrayBuffer()));if(voice)await engine.writeFile('voice',new Uint8Array(await voice.arrayBuffer()));setProgress(10,true);
  const top=Math.round(p.h*.58/2)*2,bottom=p.h-top,filter=`[0:v]scale=${p.w}:${top}:force_original_aspect_ratio=increase,crop=${p.w}:${top}[top];[1:v]scale=${p.w}:${bottom}:force_original_aspect_ratio=increase,crop=${p.w}:${bottom},zoompan=z='min(zoom+0.00025,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${p.w}x${bottom}:fps=30[avatar];[top][avatar]vstack=inputs=2[v]`;
  status(voice?msg.processing:msg.silent);const args=['-i','source','-loop','1','-framerate','30','-i','avatar'];if(voice)args.push('-i','voice');args.push('-filter_complex',filter,'-map','[v]');if(voice)args.push('-map','2:a:0');else args.push('-an');args.push('-t',String(duration),'-c:v','libx264','-preset','ultrafast','-crf',p.w>=2160?'25':p.w>=1080?'23':'22','-pix_fmt','yuv420p');if(voice)args.push('-c:a','aac','-b:a','160k');args.push('-movflags','+faststart','avatar-output.mp4');
  const rc=await engine.exec(args);if(rc)throw Error('ENCODE');setProgress(95,true);const bytes=await engine.readFile('avatar-output.mp4'),file=new File([bytes],'VideoUniquifier-Avatar-'+Date.now()+'.mp4',{type:'video/mp4'});
  await media.put(job.outputKey,file);setProgress(98,true);await addGlobalHistory({...job,durationSeconds:Math.ceil(duration),resolution:p.w+'×'+p.h},file);patchJob(job.id,{status:'done',outputName:file.name,durationSeconds:Math.ceil(duration),resolution:p.w+'×'+p.h,finishedAt:new Date().toISOString()});
  await resultControls(file);try{await saveLocal(file);}catch(e){console.warn('[avatar autosave]',e);}setProgress(100,true);
  status(msg.done);
 }catch(e){
  if(leaving){patchJob(job.id,{status:'queued'});}
  else if(cancelled||e.message==='CANCELLED'){patchJob(job.id,{status:'canceled'});setProgress(0,false);status('Canceled');}
  else{console.warn(e);patchJob(job.id,{status:'error',error:String(e.message||e)});setProgress(0,false);status(String(e.message||'Could not create the avatar video.'));}
 }finally{
  try{engine?.terminate();}catch(_){}engine=null;busy=false;activeJobId=null;$('avatarCancel').disabled=true;updateReady();renderAvatarHistory();
 }
}
async function resumePending(){
 if(busy||!media)return;const pending=jobs().filter(j=>j.status==='queued'||j.status==='processing').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));if(pending.length)await processJob(pending[0]);
}
$('avatarGenerate').onclick=async()=>{if(busy)return;updateReady();if($('avatarGenerate').disabled)return;try{const job=await createJob();await processJob(job);}catch(e){status(String(e.message||msg.storageFail));}};
$('avatarCancel').onclick=()=>{cancelled=true;if(activeJobId)patchJob(activeJobId,{status:'canceled'});try{engine?.terminate();}catch(_){}engine=null;setProgress(0,false);status('Canceled');};

async function renderAvatarHistory(){
 const box=$('avatarHistory');if(!box)return;box.replaceChildren();const list=jobs().slice(0,10);if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent='—';box.append(p);return;}
 for(const job of list){
  const row=document.createElement('article');row.className='avatar-history-row';const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small');name.textContent=job.outputName||job.sourceName||'Avatar project';
  const stateText=job.status==='done'?msg.historyDone:job.status==='processing'?msg.historyProcessing:job.status==='queued'?msg.historyQueued:job.status==='error'?msg.historyError:job.status;meta.textContent=new Date(job.createdAt).toLocaleString()+' · '+stateText;info.append(name,meta);row.append(info);
  if(job.status==='done'&&job.outputKey&&media){const blob=await media.get(job.outputKey);if(blob){const file=new File([blob],job.outputName||'VideoUniquifier-Avatar.mp4',{type:'video/mp4'}),actions=document.createElement('div');actions.className='actions';const d=document.createElement('button');d.textContent=msg.download;d.onclick=()=>saveLocal(file);const s=document.createElement('button');s.textContent=msg.share;s.onclick=()=>window.VUShareFile?.({name:file.name,blob:file});actions.append(d,s);row.append(actions);}}
  box.append(row);
 }
}
async function showLatestDone(){
 const job=jobs().find(j=>j.status==='done'&&j.outputKey);if(!job||!media)return;const blob=await media.get(job.outputKey);if(blob)await resultControls(new File([blob],job.outputName||'VideoUniquifier-Avatar.mp4',{type:'video/mp4'}));
}
window.addEventListener('pagehide',()=>{leaving=true;stopVoicePreview();clearInterval(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());if(activeJobId)patchJob(activeJobId,{status:'queued'});try{engine?.terminate();}catch(_){}urls.splice(0).forEach(URL.revokeObjectURL);});

(async()=>{
 media?.persist?.().catch(()=>{});
 await Promise.all([restoreDraft(),account()]);
 await renderAvatarHistory();await showLatestDone();await resumePending();
})();