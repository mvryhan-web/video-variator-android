import {createEngine,saveLocal} from './ai-media.js';
import {voices as googleVoices,languages as googleLanguages,synthesize} from './speech-client.js';
import {buildAvatarFilter,envelopeFromSamples} from './avatar-motion.js';

const $=id=>document.getElementById(id);
const lang=(navigator.language||'en-US').toLowerCase();
const locale=lang.startsWith('ru')?'ru':lang.startsWith('fr')?'fr':lang.startsWith('uk')?'uk':'en';
const dict={
 en:{back:'← Back',included:'Free 720p test · Full quality in Basic, Pro & Business',title:'Avatar Narrator',intro:'Put your video on top and your photo avatar below. Choose one narration source: a device voice or your own voice.',plan:'Access',video:'1 · Source video',photo:'2 · Your avatar photo',voiceSource:'3 · Choose one voice option',voiceSourceNote:'Use either a device voice or your own voice. You do not need both.',deviceOption:'Device voice',deviceOptionNote:'English, French and other installed voices',ownOption:'My voice',ownOptionNote:'Upload audio or record directly',text:'4 · Narration text',textNote:'Device voice reads this text. With My voice, keep it as your script/reference.',deviceVoice:'Device voice',deviceVoiceNote:'Open the list and tap any voice to hear it. Press Select on the voice you want to use in the finished video.',chooseVoice:'Choose a voice',useVoice:'Select',ownVoice:'My voice',ownVoiceNote:'Choose one: upload an existing audio file or record your narration here.',audio:'Upload voice audio',record:'Record voice',stop:'Stop recording',consent:'I confirm this is my voice/photo, or I have permission to use them for this video.',motionNote:'The local avatar reacts to narration loudness and pauses, so the mouth area moves with the voice. It is not phoneme-level cloud lip-sync.',create:'Create split-screen video',cancel:'Cancel',recent:'Recent Avatar videos',recentNote:'Saved projects and completed videos remain available after you reopen the app.',fullHistory:'Full history',progress:'Creating video'},
 ru:{back:'← Назад',included:'Бесплатный тест 720p · Полное качество в Basic, Pro и Business',title:'Аватар-комментатор',intro:'Сверху — ваше видео, снизу — фото-аватар. Выберите один вариант озвучки: голос устройства или свой голос.',plan:'Доступ',video:'1 · Исходное видео',photo:'2 · Фото аватара',voiceSource:'3 · Выберите один вариант голоса',voiceSourceNote:'Используйте либо голос устройства, либо свой голос. Оба сразу не нужны.',deviceOption:'Голос устройства',deviceOptionNote:'Английский, французский и другие установленные голоса',ownOption:'Мой голос',ownOptionNote:'Загрузить аудио или записать прямо здесь',text:'4 · Текст для озвучки',textNote:'Голос устройства читает этот текст. Для своего голоса текст можно использовать как сценарий.',deviceVoice:'Голос устройства',deviceVoiceNote:'Откройте список и нажимайте на любой голос — он сразу проигрывается. Нажмите «Выбрать» у нужного голоса, чтобы использовать его в готовом видео.',chooseVoice:'Выберите голос',useVoice:'Выбрать',ownVoice:'Мой голос',ownVoiceNote:'Выберите одно: загрузите готовое аудио или запишите озвучку прямо здесь.',audio:'Загрузить аудио голоса',record:'Записать голос',stop:'Остановить запись',consent:'Я подтверждаю, что это мой голос/фото или у меня есть разрешение использовать их в этом видео.',motionNote:'Локальная версия реагирует на громкость речи и паузы: область рта двигается вместе с голосом. Это не облачный lip-sync по фонемам.',create:'Создать видео с двумя экранами',cancel:'Отмена',recent:'История Avatar',recentNote:'Проекты и готовые видео сохраняются и остаются после повторного входа в приложение.',fullHistory:'Вся история',progress:'Создание видео'},
 fr:{back:'← Retour',included:'Test gratuit 720p · Qualité complète avec Basic, Pro et Business',title:'Narrateur avatar',intro:'Votre vidéo en haut, votre avatar photo en bas. Choisissez une seule source de narration : une voix de l’appareil ou votre propre voix.',plan:'Accès',video:'1 · Vidéo source',photo:'2 · Photo avatar',voiceSource:'3 · Choisissez une option de voix',voiceSourceNote:'Utilisez soit une voix de l’appareil, soit votre propre voix. Les deux ne sont pas nécessaires.',deviceOption:'Voix de l’appareil',deviceOptionNote:'Voix anglaises, françaises et autres installées',ownOption:'Ma voix',ownOptionNote:'Importer un audio ou enregistrer directement',text:'4 · Texte de narration',textNote:'La voix de l’appareil lit ce texte. Avec votre propre voix, gardez-le comme script/référence.',deviceVoice:'Voix de l’appareil',deviceVoiceNote:'Ouvrez la liste et touchez une voix pour l’écouter. Appuyez sur Choisir pour l’utiliser dans la vidéo finale.',chooseVoice:'Choisir une voix',useVoice:'Choisir',ownVoice:'Ma voix',ownVoiceNote:'Choisissez une option : importez un fichier audio existant ou enregistrez votre narration ici.',audio:'Importer la voix',record:'Enregistrer la voix',stop:'Arrêter l’enregistrement',consent:'Je confirme que cette voix/photo m’appartient ou que j’ai l’autorisation de l’utiliser.',motionNote:'La version locale réagit au volume de la narration et aux pauses : la zone de la bouche bouge avec la voix. Ce n’est pas un lip-sync cloud phonème par phonème.',create:'Créer la vidéo',cancel:'Annuler',recent:'Vidéos Avatar récentes',recentNote:'Les projets et vidéos terminées restent disponibles après la réouverture de l’application.',fullHistory:'Historique complet',progress:'Création de la vidéo'},
 uk:{back:'← Назад',included:'Безкоштовний тест 720p · Повна якість у Basic, Pro та Business',title:'Аватар-оповідач',intro:'Ваше відео зверху, фото-аватар знизу. Оберіть один варіант озвучення: голос пристрою або власний голос.',plan:'Доступ',video:'1 · Вихідне відео',photo:'2 · Фото аватара',voiceSource:'3 · Оберіть один варіант голосу',voiceSourceNote:'Використовуйте або голос пристрою, або власний голос. Обидва одночасно не потрібні.',deviceOption:'Голос пристрою',deviceOptionNote:'Англійські, французькі та інші встановлені голоси',ownOption:'Мій голос',ownOptionNote:'Завантажити аудіо або записати прямо тут',text:'4 · Текст озвучення',textNote:'Голос пристрою читає цей текст. Для власного голосу текст можна використовувати як сценарій.',deviceVoice:'Голос пристрою',deviceVoiceNote:'Відкрийте список і натискайте на будь-який голос для прослуховування. Натисніть «Обрати» біля потрібного голосу, щоб використати його в готовому відео.',chooseVoice:'Оберіть голос',useVoice:'Обрати',ownVoice:'Мій голос',ownVoiceNote:'Оберіть одне: завантажте готове аудіо або запишіть озвучення прямо тут.',audio:'Завантажити голос',record:'Записати голос',stop:'Зупинити запис',consent:'Я підтверджую, що це мій голос/фото або маю дозвіл на їх використання.',motionNote:'Локальна версія реагує на гучність мовлення та паузи: область рота рухається разом із голосом. Це не хмарний lip-sync за фонемами.',create:'Створити відео',cancel:'Скасувати',recent:'Історія Avatar',recentNote:'Проєкти та готові відео зберігаються після повторного входу в застосунок.',fullHistory:'Уся історія',progress:'Створення відео'}
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
const policy={trial:{w:720,h:1280,label:'Free test · 720p'},basic:{w:720,h:1280,label:'Basic · 720p'},pro:{w:1080,h:1920,label:'Pro · 1080p'},business:{w:2160,h:3840,label:'Business · 4K'},lifetime:{w:2160,h:3840,label:'Lifetime · 4K · all features'}};
const inputIds={video:'avatarVideo',photo:'avatarPhoto',voice:'avatarAudio'};
const savedIds={video:'avatarVideoSaved',photo:'avatarPhotoSaved',voice:'avatarAudioSaved'};
let googleEnabled=false,googlePreviewUrl=null,googlePreviewAbort=null;
let plan='trial',engine=null,busy=false,cancelled=false,leaving=false,activeJobId=null,recordStream=null,recorder=null,recordChunks=[],recordedVoice=null,recordStartedAt=0,recordTimer=null,voiceMode=null;
let restored={video:null,photo:null,voice:null},chosenVoiceMeta=null,currentProgress=0;
const urls=[];
const token=localStorage.getItem('vv_token')||'';
const status=s=>$('avatarStatus').textContent=s;
const voiceStatus=s=>$('voiceStatus').textContent=s;
function setProgress(value,visible=true){
 const n=Math.max(0,Math.min(100,Math.round(Number(value)||0))),box=$('avatarProgress');
 currentProgress=n;if(!box)return;
 box.hidden=!visible;$('avatarProgressPercent').textContent=n+'%';$('avatarProgressBar').style.width=n+'%';
}
const u=b=>{const x=URL.createObjectURL(b);urls.push(x);return x;};
const readJson=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f));}catch(_){return f;}};
const writeJson=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const jobs=()=>readJson(JOBS_KEY,[]).slice(0,30);
function saveJobs(list){writeJson(JOBS_KEY,list.slice(0,30));}
function upsertJob(job){const list=jobs(),i=list.findIndex(x=>x.id===job.id);if(i>=0)list[i]=job;else list.unshift(job);saveJobs(list);renderAvatarHistory();return job;}
function patchJob(id,patch){const list=jobs(),i=list.findIndex(x=>x.id===id);if(i<0)return null;list[i]={...list[i],...patch,updatedAt:new Date().toISOString()};saveJobs(list);renderAvatarHistory();return list[i];}
function draft(){return readJson(DRAFT_KEY,{text:'',consent:false,files:{},voice:null,voiceMode:null,updatedAt:null});}
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
 const inferred=d.voiceMode||((restored.voice||d.files?.voice)?'own':(chosenVoiceMeta?'device':null));
 setVoiceMode(inferred,false);
 updateReady();renderVoicePicker();
}
async function account(){
 if(!token){plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;updateReady();return;}
 try{
  const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token}}),d=await r.json(),usage=d.user?.usage||d.usage,effectivePlan=usage?.active&&usage?.allFeatures?'lifetime':usage?.plan;
  if(r.ok&&usage?.active&&policy[effectivePlan]){plan=effectivePlan;$('avatarPlan').textContent=(d.user?.isAdmin?'Admin · ':'')+policy[plan].label+' · Avatar Narrator';$('avatarQuality').textContent=policy[plan].label;}
  else{plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;}
 }catch(_){plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;}
 updateReady();
}
function updateReady(){
 const base=!!policy[plan]&&!!fileFor('video')&&!!fileFor('photo')&&!!$('avatarText').value.trim()&&$('voiceConsent').checked;
 const deviceReady=voiceMode==='device'&&!!chosenVoiceMeta&&!!window.AndroidBridge?.synthesizeTtsVoice;
 const ownReady=voiceMode==='own'&&!!fileFor('voice');
 const googleReady=voiceMode==='google'&&googleEnabled&&!!token&&$('googleTextConsent').checked&&$('avatarText').value.length<=1000;
 const ready=base&&(deviceReady||ownReady||googleReady);
 $('avatarGenerate').disabled=busy||!ready;
 let hint=msg.need;
 if(base&&voiceMode==='device'&&!chosenVoiceMeta)hint=msg.needDevice;
 else if(base&&voiceMode==='device'&&chosenVoiceMeta&&!window.AndroidBridge?.synthesizeTtsVoice)hint=msg.deviceUnsupported;
 else if(base&&voiceMode==='own'&&!fileFor('voice'))hint=msg.needOwn;
 else if(base&&voiceMode==='google')hint=!googleEnabled?$('googleVoiceNotice').textContent:!token?(locale==='ru'?'Сначала войдите в аккаунт на главной.':'Sign in from the home page first.'):$('avatarText').value.length>1000?(locale==='ru'?'Для Google используйте до 1 000 символов.':'Google narration supports up to 1,000 characters.'):(locale==='ru'?'Подтвердите отправку текста в Google.':'Confirm sending the script to Google.');
 if(ready)hint=msg.ready;
 $('avatarReadyHint').textContent=hint;
}
function setVoiceMode(mode,persist=true){
 voiceMode=['device','own','google'].includes(mode)?mode:null;
 $('voiceModeGoogle').checked=voiceMode==='google';$('googleVoicePanel').hidden=voiceMode!=='google';
 $('voiceModeDevice').checked=voiceMode==='device';$('voiceModeOwn').checked=voiceMode==='own';
 $('deviceVoicePanel').hidden=voiceMode!=='device';$('ownVoicePanel').hidden=voiceMode!=='own';
 document.querySelectorAll('.voice-source-card').forEach(card=>card.classList.toggle('selected',card.querySelector('input')?.checked));
 if(persist)saveDraft({voiceMode});stopVoicePreview();closeVoicePicker();updateReady();
}
$('voiceModeGoogle').addEventListener('change',()=>{if($('voiceModeGoogle').checked)setVoiceMode('google');});
$('googleTextConsent').onchange=()=>{updateReady();$('googlePreview').disabled=!googleEnabled||!$('googleTextConsent').checked;};
$('voiceModeDevice').addEventListener('change',()=>{if($('voiceModeDevice').checked)setVoiceMode('device');});
$('voiceModeOwn').addEventListener('change',()=>{if($('voiceModeOwn').checked)setVoiceMode('own');});

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
function stopVoicePreview(){googlePreviewAbort?.abort();$('googleAudioPreview')?.pause();try{window.AndroidBridge?.stopTtsVoice?.();}catch(_){}window.speechSynthesis?.cancel?.();}
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
 saveDraft({voice:chosenVoiceMeta,voiceMode:'device'});voiceMode='device';$('voiceModeDevice').checked=true;$('voiceModeOwn').checked=false;$('deviceVoicePanel').hidden=false;$('ownVoicePanel').hidden=true;document.querySelectorAll('.voice-source-card').forEach(card=>card.classList.toggle('selected',card.querySelector('input')?.checked));$('voicePickerLabel').textContent=chosenVoiceMeta.name+' · '+chosenVoiceMeta.lang;$('voicePreviewStatus').textContent=msg.chosen+': '+chosenVoiceMeta.name;stopVoicePreview();closeVoicePicker();renderVoicePicker();updateReady();
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
$('avatarAudio').onchange=async()=>{recordedVoice=null;const f=$('avatarAudio').files[0];if(f){voiceMode='own';$('voiceModeOwn').checked=true;$('voiceModeDevice').checked=false;$('ownVoicePanel').hidden=false;$('deviceVoicePanel').hidden=true;document.querySelectorAll('.voice-source-card').forEach(card=>card.classList.toggle('selected',card.querySelector('input')?.checked));restored.voice=f;voiceStatus(f.name);saveDraft({voiceMode:'own'});await persistDraftFile('voice',f);}updateReady();};

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
   recordedVoice=new File(recordChunks,'VideoUniquifier-avatar-voice.'+(type.includes('mp4')?'m4a':'webm'),{type:type.split(';')[0]});voiceMode='own';$('voiceModeOwn').checked=true;$('voiceModeDevice').checked=false;$('ownVoicePanel').hidden=false;$('deviceVoicePanel').hidden=true;document.querySelectorAll('.voice-source-card').forEach(card=>card.classList.toggle('selected',card.querySelector('input')?.checked));saveDraft({voiceMode:'own'});restored.voice=recordedVoice;
   voiceStatus(msg.recorded+' · '+(recordedVoice.size/1048576).toFixed(2)+' MB');await persistDraftFile('voice',recordedVoice);updateReady();
  };
  recorder.start(250);recordStartedAt=Date.now();$('stopVoice').disabled=false;
  recordTimer=setInterval(()=>{const sec=Math.max(0,Math.floor((Date.now()-recordStartedAt)/1000)),m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');voiceStatus(msg.recording+' '+m+':'+s);},500);
 }catch(_){clearInterval(recordTimer);recordTimer=null;recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$('recordVoice').disabled=false;$('stopVoice').disabled=true;voiceStatus(msg.micDenied);}
};
$('stopVoice').onclick=()=>{if(recorder&&recorder.state!=='inactive'){$('stopVoice').disabled=true;recorder.stop();}};

function mediaDuration(file,kind='video'){return new Promise((resolve,reject)=>{const el=document.createElement(kind);el.preload='metadata';el.src=u(file);el.onloadedmetadata=()=>resolve(Number(el.duration)||0);el.onerror=()=>reject(Error('MEDIA_FORMAT'));});}
async function resultControls(file,job){
 const wrap=document.createElement('div'),video=document.createElement('video');
 video.controls=true;video.playsInline=true;video.autoplay=true;video.preload='auto';video.src=u(file);video.className='ai-preview';wrap.append(video);
 const actions=document.createElement('div');actions.className='actions';
 const save=document.createElement('button');save.textContent=msg.download;save.onclick=()=>saveLocal(file).catch(()=>status('Could not save the video.'));
 const share=document.createElement('button');share.textContent=msg.share;share.onclick=()=>window.VUShareFile?.({name:file.name,blob:file});
 actions.append(save,share);if(job&&window.VUResultDelete)actions.append(window.VUResultDelete.button(job,()=>{video.pause();video.removeAttribute('src');wrap.remove();renderAvatarHistory();}));wrap.append(actions);$('avatarResult').replaceChildren(wrap);
 const play=()=>video.play().catch(()=>{});
 if(video.readyState>=2)play();else video.addEventListener('canplay',play,{once:true});
}
async function addGlobalHistory(job,file){
 const list=readJson('vv_history',[]),item={id:job.id,name:file.name,sourceName:job.sourceName,createdAt:job.createdAt,resolution:job.resolution,aspectRatio:'9:16',durationSeconds:job.durationSeconds||0,credits:0,saved:true,path:null,type:'avatar',mediaCacheKey:job.outputKey};
 const filtered=list.filter(x=>x.id!==item.id);filtered.unshift(item);writeJson('vv_history',filtered.slice(0,100));
 if(token)fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({items:[item]})}).catch(()=>{});
}
const ttsWaiters=new Map();
window.vuNativeTtsReady=(requestId,ok)=>{
 const waiter=ttsWaiters.get(requestId);if(!waiter)return;
 ttsWaiters.delete(requestId);ok?waiter.resolve(true):waiter.reject(Error('DEVICE_TTS_FAILED'));
};
function decodeBase64Chunk(value){
 const raw=atob(value||''),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;
}
async function synthesizeDeviceVoice(meta,text){
 const bridge=window.AndroidBridge;
 if(!bridge?.synthesizeTtsVoice||!bridge?.getTtsAudioSize||!bridge?.getTtsAudioChunk)throw Error(msg.deviceUnsupported);
 const requestId='tts-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{ttsWaiters.delete(requestId);reject(Error('DEVICE_TTS_TIMEOUT'));},45000);
  ttsWaiters.set(requestId,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
 });
 status(msg.synthesizing);setProgress(Math.max(currentProgress,7),true);
 if(!bridge.synthesizeTtsVoice(meta.voiceURI||meta.name,text,requestId)){ttsWaiters.delete(requestId);throw Error('DEVICE_TTS_FAILED');}
 await ready;
 const size=Math.max(0,Number(bridge.getTtsAudioSize(requestId))||0);if(!size)throw Error('DEVICE_TTS_EMPTY');
 const chunks=[];for(let offset=0;offset<size;offset+=65536){
  const b64=bridge.getTtsAudioChunk(requestId,offset,Math.min(65536,size-offset));if(!b64)throw Error('DEVICE_TTS_READ');
  chunks.push(decodeBase64Chunk(b64));
 }
 try{bridge.releaseTtsAudio?.(requestId);}catch(_){}
 return new File(chunks,'VideoUniquifier-device-voice.wav',{type:'audio/wav'});
}

async function analyzeVoiceEnvelope(file){
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx||!file?.arrayBuffer)return null;
 let ctx=null;
 try{
  try{ctx=new AudioCtx({sampleRate:16000});}catch(_){ctx=new AudioCtx();}
  const buffer=await ctx.decodeAudioData((await file.arrayBuffer()).slice(0));
  const duration=Number(buffer.duration)||0;if(!duration||!buffer.length)return null;
  const bins=Math.max(12,Math.min(240,Math.ceil(duration*10))),raw=[];
  const channelCount=Math.min(2,buffer.numberOfChannels||1),channels=[];
  for(let ch=0;ch<channelCount;ch++)channels.push(buffer.getChannelData(ch));
  for(let b=0;b<bins;b++){
   const start=Math.floor(buffer.length*b/bins),end=Math.max(start+1,Math.floor(buffer.length*(b+1)/bins)),stride=Math.max(1,Math.floor((end-start)/500));
   let sum=0,count=0;
   for(let i=start;i<end;i+=stride){
    for(const data of channels){const sample=data[i]||0;sum+=sample*sample;count++;}
   }
   raw.push(Math.sqrt(sum/Math.max(1,count)));
  }
  const sorted=raw.slice().sort((a,b)=>a-b),noise=sorted[Math.floor(sorted.length*.18)]||0,peak=sorted[Math.floor(sorted.length*.92)]||Math.max(...raw)||1,range=Math.max(.00001,peak-Math.min(noise,peak*.15));
  const normalized=raw.map((v,i)=>{
   const prev=raw[Math.max(0,i-1)],next=raw[Math.min(raw.length-1,i+1)],smooth=(prev+v*2+next)/4;
   const n=Math.max(0,Math.min(1,(smooth-Math.min(noise,peak*.15))/range));
   return n<.08?0:n<.28?.28:n<.52?.52:n<.76?.76:1;
  });
  const step=duration/bins,segments=[];
  for(let i=0;i<normalized.length;i++){
   const amp=normalized[i],end=(i+1)*step,last=segments[segments.length-1];
   if(last&&last.amp===amp)last.end=end;else segments.push({end,amp});
  }
  return {duration,segments};
 }catch(_){return null;}
 finally{try{await ctx?.close?.();}catch(_){}}
}
function mouthAmplitudeExpression(envelope){
 if(!envelope?.segments?.length)return '1';
 let expr='0';
 for(let i=envelope.segments.length-1;i>=0;i--){
  const seg=envelope.segments[i],end=Math.max(0,Number(seg.end)||0).toFixed(3),amp=Math.max(0,Math.min(1,Number(seg.amp)||0)).toFixed(2);
  expr=`if(lt(t\\,${end})\\,${amp}\\,${expr})`;
 }
 return expr;
}

async function createJob(){
 const video=fileFor('video'),photo=fileFor('photo'),ownVoice=voiceMode==='own'?fileFor('voice'):null,id='avatar-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),p=policy[plan]||policy.trial;
 const job={googleVoice:$('googleVoice').value,googleLanguage:$('googleLanguage').value,googleConsent:$('googleTextConsent').checked,mouth:{x:Number($('mouthX').value),y:Number($('mouthY').value),width:Number($('mouthWidth').value)},id,status:'queued',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sourceName:video.name||'source-video',photoName:photo.name||'avatar-photo',voiceMode,voiceName:ownVoice?.name||null,text:$('avatarText').value.trim(),selectedDeviceVoice:voiceMode==='device'?chosenVoiceMeta:null,plan,resolution:p.w+'×'+p.h,sourceKey:id+'/source',photoKey:id+'/photo',voiceKey:ownVoice?id+'/voice':null,outputKey:id+'/output'};
 try{
  await media.put(job.sourceKey,video);await media.put(job.photoKey,photo);if(ownVoice)await media.put(job.voiceKey,ownVoice);
 }catch(_){throw Error(msg.storageFail);}
 upsertJob(job);return job;
}
async function loadJobFile(job,key,name,type){const blob=await media?.get(job[key]);return blob?new File([blob],name,{type:blob.type||type}):null;}
async function processJob(job){
 if(busy)return;busy=true;cancelled=false;leaving=false;activeJobId=job.id;patchJob(job.id,{status:'processing'});$('avatarGenerate').disabled=true;$('avatarCancel').disabled=false;$('avatarResult').replaceChildren();setProgress(0,true);status(msg.preparing);
 let progressTimer=null;
 try{
  const video=await loadJobFile(job,'sourceKey',job.sourceName,'video/mp4'),photo=await loadJobFile(job,'photoKey',job.photoName,'image/png');
  let voice=job.voiceMode==='own'&&job.voiceKey?await loadJobFile(job,'voiceKey',job.voiceName||'voice','audio/webm'):null;
  if(!video||!photo)throw Error('Saved project media is unavailable.');
  if(job.voiceMode==='google'){if(!job.googleConsent)throw Error('GOOGLE_TEXT_CONSENT_REQUIRED');voice=await synthesize(job.text,job.googleVoice||'Kore',job.googleLanguage||'en-US',true);}
  if(job.voiceMode==='device'){
   if(!job.selectedDeviceVoice)throw Error(msg.needDevice);
   voice=await synthesizeDeviceVoice(job.selectedDeviceVoice,job.text||'');
  }
  if(!voice)throw Error(job.voiceMode==='device'?msg.needDevice:msg.needOwn);
  const duration=await mediaDuration(video);if(!duration||duration>600)throw Error('Keep source video at 10 minutes or less for this local version.');
  const p=policy[job.plan]||policy.trial;patchJob(job.id,{durationSeconds:Math.ceil(duration),resolution:p.w+'×'+p.h});setProgress(Math.max(currentProgress,8),true);
  engine=await createEngine();
  engine.on?.('progress',({progress})=>{const pct=10+Math.max(0,Math.min(1,Number(progress)||0))*84;if(pct>currentProgress)setProgress(pct,true);status(msg.processing+' '+Math.round(Math.max(pct,currentProgress))+'%');});
  if(cancelled)throw Error('CANCELLED');
  await engine.writeFile('source',new Uint8Array(await video.arrayBuffer()));
  await engine.writeFile('avatar',new Uint8Array(await photo.arrayBuffer()));
  await engine.writeFile('voice',new Uint8Array(await voice.arrayBuffer()));setProgress(10,true);

  const top=Math.round(p.h*.58/2)*2,bottom=p.h-top,fps=24;
  let envelope=await analyzeVoiceEnvelope(voice);
  if(!envelope){
   const rc=await engine.exec(['-i','voice','-vn','-ac','1','-ar','16000','-f','s16le','voice-envelope.pcm']);
   if(!rc){const bytes=await engine.readFile('voice-envelope.pcm'),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),samples=new Float32Array(Math.floor(bytes.byteLength/2));for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;envelope=envelopeFromSamples(samples);}
  }
  const filter=buildAvatarFilter({w:p.w,h:p.h,fps,envelope,mouth:job.mouth});

  const estimatedSeconds=Math.max(18,duration*(p.w>=2160?9:p.w>=1080?5:2.8)),started=Date.now();
  progressTimer=setInterval(()=>{if(!busy)return;const elapsed=(Date.now()-started)/1000,estimated=10+Math.min(80,elapsed/estimatedSeconds*80);if(estimated>currentProgress)setProgress(estimated,true);status(msg.processing+' '+currentProgress+'%');},900);

  const args=['-i','source','-loop','1','-framerate',String(fps),'-i','avatar','-i','voice','-filter_complex',filter,'-map','[v]','-map','2:a:0','-t',String(duration),'-c:v','libx264','-preset','ultrafast','-crf',p.w>=2160?'25':p.w>=1080?'23':'22','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','avatar-output.mp4'];
  const rc=await engine.exec(args);clearInterval(progressTimer);progressTimer=null;if(rc)throw Error('ENCODE');
  setProgress(95,true);const bytes=await engine.readFile('avatar-output.mp4'),file=new File([bytes],'VideoUniquifier-Avatar-'+Date.now()+'.mp4',{type:'video/mp4'});
  await media.put(job.outputKey,file);setProgress(98,true);await addGlobalHistory({...job,durationSeconds:Math.ceil(duration),resolution:p.w+'×'+p.h},file);patchJob(job.id,{status:'done',outputName:file.name,durationSeconds:Math.ceil(duration),resolution:p.w+'×'+p.h,finishedAt:new Date().toISOString()});
  await resultControls(file,job);try{await saveLocal(file);}catch(e){console.warn('[avatar autosave]',e);}setProgress(100,true);status(msg.done);
 }catch(e){
  clearInterval(progressTimer);
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

let historyRender=0;
async function renderAvatarHistory(){
 const render=++historyRender;
 const box=$('avatarHistory');if(!box)return;box.replaceChildren();const list=jobs().slice(0,10);if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent='—';box.append(p);return;}
 for(const job of list){
  const row=document.createElement('article');row.className='avatar-history-row';const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('small');name.textContent=job.outputName||job.sourceName||'Avatar project';
  const stateText=job.status==='done'?msg.historyDone:job.status==='processing'?msg.historyProcessing:job.status==='queued'?msg.historyQueued:job.status==='error'?msg.historyError:job.status;meta.textContent=new Date(job.createdAt).toLocaleString()+' · '+stateText;info.append(name,meta);row.append(info);
  if(job.status==='done'&&job.outputKey&&media){const blob=await media.get(job.outputKey);if(blob){const file=new File([blob],job.outputName||'VideoUniquifier-Avatar.mp4',{type:'video/mp4'}),actions=document.createElement('div');actions.className='actions';const d=document.createElement('button');d.textContent=msg.download;d.onclick=()=>saveLocal(file);const s=document.createElement('button');s.textContent=msg.share;s.onclick=()=>window.VUShareFile?.({name:file.name,blob:file});actions.append(d,s);row.append(actions);}}
  if(window.VUResultDelete){const del=window.VUResultDelete.button(job,()=>{$('avatarResult').replaceChildren();renderAvatarHistory();});del.disabled=job.id===activeJobId;row.append(del);}
  if(render!==historyRender)return;box.append(row);
 }
}
async function showLatestDone(){
 const job=jobs().find(j=>j.status==='done'&&j.outputKey);if(!job||!media)return;const blob=await media.get(job.outputKey);if(blob)await resultControls(new File([blob],job.outputName||'VideoUniquifier-Avatar.mp4',{type:'video/mp4'}),job);
}
window.addEventListener('pagehide',()=>{leaving=true;stopVoicePreview();clearInterval(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());if(activeJobId)patchJob(activeJobId,{status:'queued'});try{engine?.terminate();}catch(_){}urls.splice(0).forEach(URL.revokeObjectURL);});



const gc={en:['Natural Google narration','Language','Voice','I agree to send the script to Google for narration. Video and photo stay on my device. Maximum 1,000 characters; free quota applies.','Preview voice','Stop','Google voices await owner setup. Use your own voice below in the meantime.','Google AI voices · sign-in required · up to 3 requests/day. Preview also uses a request.'],ru:['Естественная озвучка Google','Язык','Голос','Я согласен отправить текст в Google для озвучки. Видео и фото останутся на устройстве. До 1 000 символов, действует бесплатный лимит.','Прослушать','Стоп','Голоса Google ожидают настройки владельцем. Пока используйте свой голос.','Голоса Google AI · нужен вход · до 3 запросов в день. Прослушивание тоже расходует запрос.'],fr:['Narration naturelle Google','Langue','Voix','J’accepte d’envoyer le texte à Google. Vidéo et photo restent sur l’appareil. 1 000 caractères maximum ; quota gratuit.','Écouter','Arrêter','Les voix Google attendent la configuration du propriétaire. Utilisez votre voix en attendant.','Voix Google AI · connexion requise · 3 requêtes/jour. L’aperçu utilise une requête.'],uk:['Природне озвучення Google','Мова','Голос','Погоджуюсь надіслати текст до Google. Відео й фото залишаться на пристрої. До 1 000 символів; діє ліміт.','Прослухати','Стоп','Голоси Google очікують налаштування власником. Поки використовуйте свій голос.','Google AI · потрібен вхід · до 3 запитів на день. Прослуховування також витрачає запит.']}[locale];
['googleVoiceSummary','googleLanguageLabel','googleVoiceLabel','googleConsentCopy','googlePreview','googleStop','googleVoiceNotice'].forEach((id,i)=>$(id).textContent=gc[i]);
for(const v of googleVoices){const o=document.createElement('option');o.value=v;o.textContent=v;$('googleVoice').append(o);}
for(const [v,n]of Object.entries(googleLanguages)){const o=document.createElement('option');o.value=v;o.textContent=n;$('googleLanguage').append(o);}
fetch('/api/speech/config').then(r=>r.json()).then(c=>{googleEnabled=!!c.enabled;$('googleVoiceNotice').textContent=gc[googleEnabled?7:6];if(googleEnabled){$('voiceModeDevice').closest('label').hidden=true;if(voiceMode==='device')setVoiceMode('google');}updateReady();}).catch(()=>{});
$('googleStop').onclick=stopVoicePreview;
$('googlePreview').onclick=async()=>{if(!googleEnabled||!$('googleTextConsent').checked)return;stopVoicePreview();googlePreviewAbort=new AbortController();$('googlePreview').disabled=true;try{const text=$('avatarText').value.trim();if(!text)throw Error(msg.need);const file=await synthesize(text.slice(0,200),$('googleVoice').value,$('googleLanguage').value,true,googlePreviewAbort.signal);if(googlePreviewUrl)URL.revokeObjectURL(googlePreviewUrl);$('googleAudioPreview').src=googlePreviewUrl=URL.createObjectURL(file);$('googleAudioPreview').hidden=false;await $('googleAudioPreview').play();}catch(e){if(e.name!=='AbortError')$('googleVoiceNotice').textContent=String(e.message);}finally{googlePreviewAbort=null;$('googlePreview').disabled=!googleEnabled||!$('googleTextConsent').checked;}};

const motionCopy={en:['Mouth position','Move the marker onto the lips in the cropped portrait below. Use a front-facing photo. This is simple audio-reactive motion, not realistic lip-sync.','Horizontal','Vertical','Mouth width'],ru:['Положение рта','Совместите метку с губами на портрете ниже. Лучше фото анфас. Это простая реакция на звук, а не реалистичная синхронизация речи.','По горизонтали','По вертикали','Ширина рта'],fr:['Position de la bouche','Placez le repère sur les lèvres du portrait recadré. Utilisez une photo de face. Animation simple, sans lip-sync réaliste.','Horizontal','Vertical','Largeur'],uk:['Положення рота','Сумістіть позначку з губами на портреті. Оберіть фото анфас. Це проста реакція на звук, не реалістична синхронізація.','По горизонталі','По вертикалі','Ширина рота']}[locale];
$('motionTitle').textContent=motionCopy[0];$('motionHelp').textContent=motionCopy[1];
['mouthX','mouthY','mouthWidth'].forEach((id,i)=>{const input=$(id);input.previousElementSibling.textContent=motionCopy[i+2];input.value=draft().mouth?.[i]??input.value;input.oninput=()=>{saveDraft({mouth:['mouthX','mouthY','mouthWidth'].map(k=>Number($(k).value))});syncMouthMarker();};});
function syncMouthMarker(){const m=$('mouthMarker');m.style.left=$('mouthX').value+'%';m.style.top=$('mouthY').value+'%';m.style.width=$('mouthWidth').value+'%';}
syncMouthMarker();

(async()=>{
 media?.persist?.().catch(()=>{});
 await Promise.all([restoreDraft(),account()]);
 await renderAvatarHistory();await showLatestDone();await resumePending();
})();