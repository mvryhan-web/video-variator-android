import {createEngine,saveLocal} from './ai-media.js';

const $=id=>document.getElementById(id);
const lang=(navigator.language||'en-US').toLowerCase();
const dict={
 ru:{back:'← Назад',included:'Бесплатный тест 720p · Полное качество в Basic, Pro и Business',title:'Аватар-комментатор',intro:'Сверху — ваше видео, снизу — ваш фото-аватар. Добавьте текст и при желании свой голос. Монтаж выполняется локально на устройстве.',plan:'Доступ',video:'1 · Исходное видео',photo:'2 · Фото аватара',text:'3 · Текст для озвучки',deviceVoice:'Голос устройства — предпросмотр',deviceVoiceNote:'Выберите голос — он сразу произнесёт ваш текст. Если текст ещё пустой, прозвучит короткий пример. Для тестового видео запись своего голоса необязательна.',previewVoice:'Прослушать текст',stopPreview:'Остановить голос',selectVoice:'Выбрать',ownVoice:'Ваш голос для экспорта',ownVoiceNote:'Необязательно для теста. Загрузите аудио или запишите голос, если хотите, чтобы он был в готовом видео.',audio:'Загрузить аудио голоса',record:'Записать голос',stop:'Остановить запись',consent:'Я подтверждаю, что это мой голос/фото или у меня есть разрешение использовать их в этом видео.',motionNote:'Эта бесплатная локальная версия делает лёгкое движение аватара без облачного lip-sync. Более точную синхронизацию губ можно подключить позже, не меняя этот процесс.',create:'Создать видео с двумя экранами',cancel:'Отмена'},
 fr:{back:'← Retour',included:'Test gratuit 720p · Qualité complète avec Basic, Pro et Business',title:'Narrateur avatar',intro:'Votre vidéo en haut, votre avatar photo en bas. Ajoutez le texte et, si vous le souhaitez, votre propre voix. Le montage reste local.',plan:'Accès',video:'1 · Vidéo source',photo:'2 · Photo avatar',text:'3 · Texte de narration',deviceVoice:'Aperçu de la voix de l’appareil',deviceVoiceNote:'Choisissez une voix : elle lit immédiatement votre texte. Si le texte est vide, un court exemple est lu.',previewVoice:'Écouter le texte',stopPreview:'Arrêter la voix',selectVoice:'Choisir',ownVoice:'Votre voix pour l’export',ownVoiceNote:'Facultatif pour le test. Importez ou enregistrez votre voix pour l’inclure dans la vidéo finale.',audio:'Importer la voix',record:'Enregistrer la voix',stop:'Arrêter l’enregistrement',consent:'Je confirme que cette voix/photo m’appartient ou que j’ai l’autorisation de l’utiliser.',create:'Créer la vidéo',cancel:'Annuler'},
 uk:{back:'← Назад',included:'Безкоштовний тест 720p · Повна якість у Basic, Pro та Business',title:'Аватар-оповідач',intro:'Ваше відео зверху, фото-аватар знизу. Додайте текст і, за бажанням, власний голос. Монтаж виконується локально.',plan:'Доступ',video:'1 · Вихідне відео',photo:'2 · Фото аватара',text:'3 · Текст озвучення',deviceVoice:'Попередній перегляд голосу пристрою',deviceVoiceNote:'Оберіть голос — він одразу прочитає ваш текст. Якщо текст порожній, прозвучить короткий приклад.',previewVoice:'Прослухати текст',stopPreview:'Зупинити голос',selectVoice:'Обрати',ownVoice:'Ваш голос для експорту',ownVoiceNote:'Необов’язково для тесту. Завантажте або запишіть голос, щоб додати його до готового відео.',audio:'Завантажити голос',record:'Записати голос',stop:'Зупинити запис',consent:'Я підтверджую, що це мій голос/фото або маю дозвіл на їх використання.',create:'Створити відео',cancel:'Скасувати'}
};
const locale=lang.startsWith('ru')?'ru':lang.startsWith('fr')?'fr':lang.startsWith('uk')?'uk':'en';
const msg={
 en:{free:'Free test · 720p',ready:'Ready to create. Add your own voice only if you want audio in the exported video.',need:'Add a source video, avatar photo, narration text and confirm permission to enable Create.',sample:'Hello. This is a preview of the selected device voice.',selected:'Selected voice',chosen:'Voice selected',speaking:'Speaking…',stopped:'Voice preview stopped.',noSpeech:'Device speech is unavailable here.',write:'Write narration text first.',silent:'No recorded voice was added, so this test video will be exported without narration audio.'},
 ru:{free:'Бесплатный тест · 720p',ready:'Готово к созданию. Свой голос добавляйте только если хотите слышать его в готовом видео.',need:'Добавьте видео, фото аватара, текст и подтвердите разрешение — после этого кнопка создания станет активной.',sample:'Здравствуйте. Это пример выбранного голоса устройства.',selected:'Прослушивается голос',chosen:'Голос выбран',speaking:'Голос воспроизводится…',stopped:'Прослушивание остановлено.',noSpeech:'Голос устройства здесь недоступен.',write:'Сначала напишите текст для озвучки.',silent:'Свой записанный голос не добавлен — тестовое видео будет создано без озвучки.'},
 fr:{free:'Test gratuit · 720p',ready:'Prêt à créer. Ajoutez votre propre voix uniquement si vous voulez l’entendre dans la vidéo exportée.',need:'Ajoutez la vidéo, la photo, le texte et confirmez l’autorisation pour activer la création.',sample:'Bonjour. Voici un aperçu de la voix sélectionnée.',selected:'Voix en écoute',chosen:'Voix choisie',speaking:'Lecture en cours…',stopped:'Aperçu vocal arrêté.',noSpeech:'La synthèse vocale est indisponible ici.',write:'Écrivez d’abord le texte de narration.',silent:'Aucune voix enregistrée : la vidéo de test sera exportée sans narration audio.'},
 uk:{free:'Безкоштовний тест · 720p',ready:'Готово до створення. Власний голос потрібен лише якщо ви хочете чути його у готовому відео.',need:'Додайте відео, фото аватара, текст і підтвердьте дозвіл — після цього створення стане активним.',sample:'Вітаю. Це приклад вибраного голосу пристрою.',selected:'Прослуховується голос',chosen:'Голос обрано',speaking:'Голос відтворюється…',stopped:'Прослуховування зупинено.',noSpeech:'Голос пристрою тут недоступний.',write:'Спочатку напишіть текст озвучення.',silent:'Власний записаний голос не додано — тестове відео буде створено без озвучення.'}
}[locale];
if(dict[locale])document.querySelectorAll('[data-av]').forEach(el=>{const v=dict[locale][el.dataset.av];if(v)el.textContent=v;});

let plan='trial',engine=null,busy=false,cancelled=false,recordStream=null,recorder=null,recordChunks=[],recordedVoice=null,chosenDeviceVoiceIndex=null;
const urls=[];
const status=s=>$('avatarStatus').textContent=s;
const voiceStatus=s=>$('voiceStatus').textContent=s;
const u=b=>{const x=URL.createObjectURL(b);urls.push(x);return x;};
const token=localStorage.getItem('vv_token')||'';
const policy={trial:{w:720,h:1280,label:'Free test · 720p'},basic:{w:720,h:1280,label:'Basic · 720p'},pro:{w:1080,h:1920,label:'Pro · 1080p'},business:{w:2160,h:3840,label:'Business · 4K'}};

async function account(){
 if(!token){plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;updateReady();return;}
 try{
  const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token}}),d=await r.json();
  const usage=d.user?.usage||d.usage;
  if(r.ok&&usage?.active&&policy[usage.plan]){plan=usage.plan;$('avatarPlan').textContent=(d.user?.isAdmin?'Admin · ':'')+policy[plan].label+' · Avatar Narrator';$('avatarQuality').textContent=policy[plan].label;updateReady();}
  else{plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;updateReady();}
 }catch(_){plan='trial';$('avatarPlan').textContent=msg.free;$('avatarQuality').textContent=policy.trial.label;updateReady();}
}
function updateReady(){
 const ready=!!policy[plan]&&!!$('avatarVideo').files[0]&&!!$('avatarPhoto').files[0]&&!!$('avatarText').value.trim()&&$('voiceConsent').checked;
 $('avatarGenerate').disabled=busy||!ready;
 $('avatarReadyHint').textContent=ready?msg.ready:msg.need;
}
function previewFile(input,el,type){
 const file=input.files[0];if(!file){el.removeAttribute('src');updateReady();return;}
 el.src=u(file);if(type==='video')el.load();updateReady();
}
$('avatarVideo').onchange=()=>previewFile($('avatarVideo'),$('avatarVideoPreview'),'video');
$('avatarPhoto').onchange=()=>{previewFile($('avatarPhoto'),$('avatarPhotoPreview'),'image');};
$('avatarText').oninput=()=>{updateReady();};
$('avatarAudio').onchange=()=>{recordedVoice=null;voiceStatus($('avatarAudio').files[0]?.name||'');updateReady();};
$('voiceConsent').onchange=updateReady;

function selectedVoice(){
 const voices=window.speechSynthesis?.getVoices?.()||[];
 return voices[Number($('avatarVoice').value)]||voices[0]||null;
}
function chosenVoice(){
 const voices=window.speechSynthesis?.getVoices?.()||[];
 return chosenDeviceVoiceIndex===null?null:(voices[chosenDeviceVoiceIndex]||null);
}
function setSpeakState(active,label=''){
 $('avatarSpeak').disabled=active;
 $('avatarStopSpeak').disabled=!active;
 if(label)$('voicePreviewStatus').textContent=label;
}
function speakPreview(useSample=false){
 if(!('speechSynthesis'in window))return setSpeakState(false,msg.noSpeech);
 const selected=selectedVoice(),text=$('avatarText').value.trim()||(useSample?msg.sample:'');
 if(!text)return setSpeakState(false,msg.write);
 window.speechSynthesis.cancel();
 const utter=new SpeechSynthesisUtterance(text);
 if(selected)utter.voice=selected;
 utter.lang=selected?.lang||navigator.language||'en-US';
 utter.onstart=()=>setSpeakState(true,(selected?msg.selected+': '+selected.name+' · ':'')+msg.speaking);
 utter.onend=()=>setSpeakState(false,selected?msg.selected+': '+selected.name:'');
 utter.onerror=()=>setSpeakState(false,selected?msg.selected+': '+selected.name:'');
 setSpeakState(true,(selected?msg.selected+': '+selected.name+' · ':'')+msg.speaking);
 window.speechSynthesis.speak(utter);
}
function loadVoices(){
 const select=$('avatarVoice'),voices=window.speechSynthesis?.getVoices?.()||[],previous=select.value;select.replaceChildren();
 voices.forEach((v,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=v.name+' · '+v.lang+(v.default?' · Default':'');select.append(o);});
 if(!voices.length){const o=document.createElement('option');o.textContent='Default device voice';o.value='';select.append(o);}
 if(previous&&select.querySelector('option[value="'+previous+'"]'))select.value=previous;
 const chosen=selectedVoice();$('voicePreviewStatus').textContent=chosen?msg.selected+': '+chosen.name+' · '+chosen.lang:'';
}
if('speechSynthesis'in window){loadVoices();window.speechSynthesis.onvoiceschanged=loadVoices;}
$('avatarVoice').addEventListener('change',()=>{
 chosenDeviceVoiceIndex=null;
 $('avatarSelectVoice').classList.remove('selected');
 speakPreview(true);
});
$('avatarSpeak').onclick=()=>speakPreview(false);
$('avatarSelectVoice').onclick=()=>{
 const voices=window.speechSynthesis?.getVoices?.()||[],idx=Number($('avatarVoice').value),voice=voices[idx]||voices[0]||null;
 chosenDeviceVoiceIndex=voice?(voices.indexOf(voice)>=0?voices.indexOf(voice):idx):null;
 $('avatarSelectVoice').classList.toggle('selected',!!voice);
 $('voicePreviewStatus').textContent=voice?msg.chosen+': '+voice.name+' · '+voice.lang:msg.noSpeech;
};
$('avatarStopSpeak').onclick=()=>{window.speechSynthesis?.cancel?.();setSpeakState(false,msg.stopped);};

$('recordVoice').onclick=async()=>{
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return voiceStatus('Voice recording is unavailable here. Upload an audio file instead.');
 try{
  recordStream=await navigator.mediaDevices.getUserMedia({audio:true});recordChunks=[];const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));
  recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};
  recorder.onstop=()=>{const type=recorder.mimeType||recordChunks[0]?.type||'audio/webm';recordedVoice=new File(recordChunks,'VideoUniquifier-avatar-voice.'+(type.includes('mp4')?'m4a':'webm'),{type:type.split(';')[0]});recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;voiceStatus('Voice recorded locally · '+(recordedVoice.size/1048576).toFixed(2)+' MB');$('recordVoice').disabled=false;$('stopVoice').disabled=true;updateReady();};
  recorder.start(500);$('recordVoice').disabled=true;$('stopVoice').disabled=false;voiceStatus('Recording…');
 }catch(_){voiceStatus('Microphone permission was not granted. Upload an audio file instead.');}
};
$('stopVoice').onclick=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();};

function mediaDuration(file,kind){
 return new Promise((resolve,reject)=>{const el=document.createElement(kind);el.preload='metadata';el.src=u(file);el.onloadedmetadata=()=>resolve(Number(el.duration)||0);el.onerror=()=>reject(Error('MEDIA_FORMAT'));});
}
async function resultControls(file){
 const wrap=document.createElement('div'),video=document.createElement('video');video.controls=true;video.playsInline=true;video.src=u(file);video.className='ai-preview';wrap.append(video);
 const actions=document.createElement('div');actions.className='actions';
 const save=document.createElement('button');save.textContent='Download';save.onclick=()=>saveLocal(file).catch(()=>status('Could not save the video.'));
 const share=document.createElement('button');share.textContent='Share';share.onclick=()=>window.VUShareFile?.({name:file.name,blob:file});
 actions.append(save,share);wrap.append(actions);$('avatarResult').replaceChildren(wrap);
}
$('avatarCancel').onclick=()=>{cancelled=true;try{engine?.terminate();}catch(_){}engine=null;status('Canceled');};
$('avatarGenerate').onclick=async()=>{
 if(busy||!policy[plan])return;updateReady();if($('avatarGenerate').disabled)return;
 const video=$('avatarVideo').files[0],photo=$('avatarPhoto').files[0],voice=$('avatarAudio').files[0]||recordedVoice,p=policy[plan];busy=true;cancelled=false;$('avatarGenerate').disabled=true;$('avatarCancel').disabled=false;$('avatarResult').replaceChildren();
 try{
  const duration=await mediaDuration(video,'video');if(!duration||duration>600)throw Error('Keep source video at 10 minutes or less for this local version.');
  status('Preparing local split-screen composition…');engine=await createEngine();if(cancelled)throw Error('CANCELLED');
  await engine.writeFile('source',new Uint8Array(await video.arrayBuffer()));await engine.writeFile('avatar',new Uint8Array(await photo.arrayBuffer()));
  if(voice)await engine.writeFile('voice',new Uint8Array(await voice.arrayBuffer()));
  const top=Math.round(p.h*.58/2)*2,bottom=p.h-top;
  const filter=`[0:v]scale=${p.w}:${top}:force_original_aspect_ratio=increase,crop=${p.w}:${top}[top];[1:v]scale=${p.w}:${bottom}:force_original_aspect_ratio=increase,crop=${p.w}:${bottom},zoompan=z='min(zoom+0.00025,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${p.w}x${bottom}:fps=30[avatar];[top][avatar]vstack=inputs=2[v]`;
  status(voice?'Creating video locally…':msg.silent);
  const args=['-i','source','-loop','1','-framerate','30','-i','avatar'];
  if(voice)args.push('-i','voice');
  args.push('-filter_complex',filter,'-map','[v]');
  if(voice)args.push('-map','2:a:0');else args.push('-an');
  args.push('-t',String(duration),'-c:v','libx264','-preset','ultrafast','-crf',p.w>=2160?'25':p.w>=1080?'23':'22','-pix_fmt','yuv420p');
  if(voice)args.push('-c:a','aac','-b:a','160k');
  args.push('-movflags','+faststart','avatar-output.mp4');
  const rc=await engine.exec(args);
  if(rc)throw Error('ENCODE');const bytes=await engine.readFile('avatar-output.mp4'),file=new File([bytes],'VideoUniquifier-Avatar-'+Date.now()+'.mp4',{type:'video/mp4'});
  await resultControls(file);await saveLocal(file);status('Done · saved automatically to VideoUniquifier on this device.');
 }catch(e){if(!cancelled){console.warn(e);status(e.message==='CANCELLED'?'Canceled':String(e.message||'Could not create the avatar video.'));}}
 finally{try{engine?.terminate();}catch(_){}engine=null;busy=false;$('avatarCancel').disabled=true;updateReady();}
};
window.addEventListener('pagehide',()=>{window.speechSynthesis?.cancel?.();recordStream?.getTracks().forEach(t=>t.stop());try{engine?.terminate();}catch(_){}urls.splice(0).forEach(URL.revokeObjectURL);});
account();