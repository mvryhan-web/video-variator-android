import {createEngine,saveLocal,subtitleFiles} from './ai-media.js';
import {voices,languages,synthesize,toMp3} from './speech-client.js';
import {audioTrimSettings,trimAudioLocal} from './audio-trim-core.js';
import {videoToAudioSettings,videoToMp3Local} from './video-to-audio-core.js';
const $=id=>document.getElementById(id),lang=(navigator.language||'en').slice(0,2);
const copy={
 en:{setup:'Google voices are waiting for owner setup. Local transcription is available below.',available:'Free preview: up to 3 requests per account/day, 1,000 characters each. Shared daily quota applies. Sign in from the home page first.',working:'Processing… Keep this page open.',loading:'Downloading the speech model…',done:'Done. Review the result before using it.',cancelled:'Canceled',error:'Could not process this file. Try a shorter recording, check your connection and free device memory.',choose:'Choose a file first.',limit:'Use a recording of 5 minutes or less, up to 150 MB.',download:'Download MP3',share:'Share',delete:'Delete',copied:'Copied',login:'Sign in from the home page first.',quota:'The free voice quota is used up. Try again later.',consent:'I agree to send this text to Google to generate speech. Do not include private information.'},
 ru:{back:'← Повседневные инструменты',title:'Аудио и текст',lead:'Превратите сценарий в озвучку, а запись — в редактируемый текст.',free:'Бесплатно · без списания видеокредитов',tts:'Текст → MP3',ttsNote:'Голоса Google читают ваш текст. В Google отправляется только текст; видео остаются на устройстве.',language:'Язык',voice:'Голос',script:'Ваш текст (до 1 000 символов)',consent:'Я согласен отправить этот текст в Google для озвучки. Не добавляйте личные или секретные данные.',generate:'Создать MP3',cancel:'Отмена',stt:'Видео / MP3 → текст',sttNote:'Распознавание работает на устройстве. При первом запуске загружается языковая модель — это может занять несколько минут. Записи никуда не отправляются. Начните с короткой чёткой записи.',limits:'До 5 минут / 150 МБ. Точность зависит от языка и качества записи. Проверьте текст перед публикацией.',file:'Видео или аудиофайл',auto:'Определить автоматически',recognize:'Извлечь текст',text:'Распознанный текст — можно редактировать',copy:'Копировать текст',download:'Скачать',share:'Поделиться',delete:'Удалить',setup:'Голоса Google ожидают настройки владельцем. Локальное распознавание ниже уже доступно.',available:'Бесплатная проба: до 3 запросов на аккаунт в день, по 1 000 символов. Есть общий дневной лимит. Сначала войдите на главной.',working:'Обработка… Не закрывайте страницу.',loading:'Загрузка модели распознавания…',done:'Готово. Проверьте результат.',cancelled:'Отменено',error:'Не удалось обработать файл. Попробуйте короткую запись, проверьте интернет и свободную память.',choose:'Сначала выберите файл.',limit:'Запись должна быть не длиннее 5 минут и до 150 МБ.',copied:'Скопировано',login:'Сначала войдите в аккаунт на главной.',quota:'Бесплатный лимит озвучки исчерпан. Попробуйте позже.'},
 fr:{back:'← Outils du quotidien',title:'Audio et texte',lead:'Transformez un script en narration et un enregistrement en texte.',free:'Gratuit · sans crédits vidéo',tts:'Texte → MP3',ttsNote:'Les voix Google lisent votre texte. Seul le texte est envoyé à Google ; les vidéos restent sur votre appareil.',language:'Langue',voice:'Voix',script:'Votre texte (1 000 caractères maximum)',consent:'J’accepte d’envoyer ce texte à Google pour la narration. N’incluez pas de données privées.',generate:'Créer le MP3',cancel:'Annuler',stt:'Vidéo / MP3 → texte',sttNote:'Reconnaissance locale. La première utilisation télécharge un modèle et peut prendre plusieurs minutes. Aucun enregistrement n’est envoyé.',limits:'5 minutes / 150 Mo maximum. Vérifiez le texte avant publication.',file:'Fichier vidéo ou audio',auto:'Détection automatique',recognize:'Extraire le texte',text:'Texte reconnu — modifiable',copy:'Copier',download:'Télécharger',share:'Partager',delete:'Supprimer',setup:'Les voix Google attendent la configuration du propriétaire. La transcription locale est disponible.',working:'Traitement… Gardez la page ouverte.',loading:'Téléchargement du modèle…',done:'Terminé. Vérifiez le résultat.',cancelled:'Annulé',choose:'Choisissez un fichier.',limit:'5 minutes et 150 Mo maximum.',copied:'Copié'},
 uk:{back:'← Безкоштовні інструменти',title:'Аудіо й текст',lead:'Перетворіть сценарій на озвучення, а запис — на текст.',free:'Безкоштовно · без відеокредитів',tts:'Текст → MP3',language:'Мова',voice:'Голос',generate:'Створити MP3',cancel:'Скасувати',stt:'Відео / MP3 → текст',file:'Відео або аудіофайл',recognize:'Витягти текст',text:'Розпізнаний текст — можна редагувати',copy:'Копіювати',download:'Завантажити',share:'Поділитися',delete:'Видалити',setup:'Голоси Google очікують налаштування власником. Локальне розпізнавання доступне.',working:'Обробка… Не закривайте сторінку.',done:'Готово. Перевірте результат.',cancelled:'Скасовано'}
};
const trimCopy={
 en:{trimTitle:'Audio Trimmer',trimNote:'Cut a recording locally without uploading it. Export the selected part as an MP3.',trimFile:'Audio file (up to 50 MB)',trimStart:'Start (seconds)',trimEnd:'End (seconds)',trimGenerate:'Trim to MP3',trimInvalid:'Choose a supported audio file and a valid time range (maximum 10 minutes).'},
 ru:{trimTitle:'Обрезать аудио',trimNote:'Обрежьте аудиозапись прямо на устройстве, без загрузки на сервер. Сохраните фрагмент в MP3.',trimFile:'Аудиофайл (до 50 МБ)',trimStart:'Начало (секунды)',trimEnd:'Конец (секунды)',trimGenerate:'Обрезать в MP3',trimInvalid:'Выберите аудиофайл и правильный интервал (до 10 минут).'},
 fr:{trimTitle:'Découper un audio',trimNote:'Découpez un fichier sur votre appareil sans le téléverser. Exportez en MP3.',trimFile:'Fichier audio (50 Mo max.)',trimStart:'Début (secondes)',trimEnd:'Fin (secondes)',trimGenerate:'Découper en MP3',trimInvalid:'Choisissez un fichier audio et un intervalle valide (10 minutes max.).'},
 uk:{trimTitle:'Обрізати аудіо',trimNote:'Обрізайте запис на своєму пристрої без завантаження на сервер. Експортуйте у MP3.',trimFile:'Аудіофайл (до 50 МБ)',trimStart:'Початок (секунди)',trimEnd:'Кінець (секунди)',trimGenerate:'Обрізати у MP3',trimInvalid:'Оберіть аудіофайл і правильний інтервал (до 10 хвилин).'}
};
const videoAudioCopy={
 en:{vtaTitle:'Video → MP3',vtaNote:"Extract a video's soundtrack on this device — no upload or AI credits.",vtaFile:'Video file (MP4, MOV, WebM, MKV — max 80 MB)',vtaGenerate:'Extract MP3',vtaWorking:'Extracting audio locally…',vtaInvalid:'Choose a supported video up to 80 MB.',vtaNoAudio:'No supported audio track was found. Try another video.',vtaDone:'MP3 ready. Play or save it below.'},
 ru:{vtaTitle:'Видео → MP3',vtaNote:'Извлеките звук из видео прямо на устройстве — без загрузки на сервер и без AI-кредитов.',vtaFile:'Видеофайл (MP4, MOV, WebM, MKV — до 80 МБ)',vtaGenerate:'Извлечь MP3',vtaWorking:'Извлекаем звук на устройстве…',vtaInvalid:'Выберите поддерживаемое видео размером до 80 МБ.',vtaNoAudio:'В видео нет подходящей звуковой дорожки. Попробуйте другое видео.',vtaDone:'MP3 готов. Прослушайте или сохраните его.'},
 fr:{vtaTitle:'Vidéo → MP3',vtaNote:'Extrayez le son localement, sans téléversement ni crédits IA.',vtaFile:'Vidéo (MP4, MOV, WebM, MKV — 80 Mo max.)',vtaGenerate:'Extraire en MP3',vtaWorking:'Extraction du son sur cet appareil…',vtaInvalid:'Choisissez une vidéo prise en charge de 80 Mo maximum.',vtaNoAudio:'Aucune piste audio compatible. Essayez une autre vidéo.',vtaDone:'MP3 prêt. Écoutez-le ou enregistrez-le.'},
 uk:{vtaTitle:'Відео → MP3',vtaNote:'Витягніть звук із відео на пристрої — без завантаження та AI-кредитів.',vtaFile:'Відео (MP4, MOV, WebM, MKV — до 80 МБ)',vtaGenerate:'Витягнути MP3',vtaWorking:'Витягуємо звук на пристрої…',vtaInvalid:'Оберіть підтримуване відео до 80 МБ.',vtaNoAudio:'У відео немає сумісної звукової доріжки.',vtaDone:'MP3 готовий. Прослухайте або збережіть.'}
};
const t=k=>copy[lang]?.[k]||trimCopy[lang]?.[k]||videoAudioCopy[lang]?.[k]||copy.en[k]||trimCopy.en[k]||videoAudioCopy.en[k]||k;
document.querySelectorAll('[data-s]').forEach(el=>{const translated=copy[lang]?.[el.dataset.s]||trimCopy[lang]?.[el.dataset.s]||videoAudioCopy[lang]?.[el.dataset.s];if(translated)el.textContent=translated;});
for(const [value,name] of Object.entries(languages)){for(const id of ['speechLanguage','transcribeLanguage']){if(id==='transcribeLanguage'&&value==='en-GB')continue;const o=document.createElement('option');o.value=id==='transcribeLanguage'?value.split('-')[0]:value;o.textContent=name;$(id).append(o);}}
voices.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;$('speechVoice').append(o);});
let enabled=false,ttsAbort=null,ttsEngine=null,worker=null,sttEngine=null,sttBusy=false,sttId=0,resultURL=null,srt='';
fetch('/api/speech/config').then(r=>r.json()).then(c=>{enabled=!!c.enabled;$('speechAvailability').textContent=t(enabled?'available':'setup');ready();}).catch(()=>{$('speechAvailability').textContent=t('setup');});
function ready(){$('speechGenerate').disabled=!enabled||!!ttsAbort||!$('speechConsent').checked||!$('speechText').value.trim();}
$('speechText').oninput=ready;$('speechConsent').onchange=ready;
$('speechGenerate').onclick=async()=>{if(ttsAbort)return;ttsAbort=new AbortController();ready();$('speechCancel').disabled=false;$('speechStatus').textContent=t('working');let permit=null,settled=false;try{if(!window.VUToolAccess)throw Error('TOOLS_UNAVAILABLE');permit=await window.VUToolAccess.begin('tts');if(ttsAbort.signal.aborted)return;const wav=await synthesize($('speechText').value,$('speechVoice').value,$('speechLanguage').value,true,ttsAbort.signal);if(ttsAbort.signal.aborted)return;const file=await toMp3(wav,{onEngine:e=>ttsEngine=e});if(ttsAbort.signal.aborted)return;showAudio(file);settled=true;await permit.complete();$('speechStatus').textContent=t('done');}catch(e){$('speechStatus').textContent=ttsAbort?.signal.aborted?t('cancelled'):e.code?window.VUToolAccess.message(e):t(e.message==='SIGN_IN_REQUIRED'?'login':e.message==='FREE_SPEECH_LIMIT'?'quota':e.message==='SPEECH_NOT_ENABLED'?'setup':'error');}finally{if(permit&&!settled)try{await permit.cancel();}catch(_){}ttsAbort=null;ttsEngine=null;$('speechCancel').disabled=true;ready();}};
$('speechCancel').onclick=()=>{ttsAbort?.abort();ttsEngine?.terminate();};
function showAudio(file){if(resultURL)URL.revokeObjectURL(resultURL);const a=document.createElement('audio');a.controls=true;a.src=resultURL=URL.createObjectURL(file);const row=document.createElement('div');row.className='actions';for(const [key,fn]of [['download',()=>saveLocal(file)],['share',()=>window.VUShareFile({name:file.name,blob:file})],['delete',()=>{a.pause();a.removeAttribute('src');URL.revokeObjectURL(resultURL);resultURL=null;$('speechResult').replaceChildren();}]]){const b=document.createElement('button');b.textContent=t(key);b.onclick=async()=>{try{await fn();}catch(e){if(e.name!=='AbortError')$('speechStatus').textContent=t('error');}};row.append(b);}$('speechResult').replaceChildren(a,row);}
function editReady(){const yes=!!$('transcript').value.trim();$('copyText').disabled=!yes;$('saveText').disabled=!yes;}
$('transcript').oninput=()=>{srt='';$('saveSrt').disabled=true;editReady();};
$('transcribeStart').onclick=async()=>{
 if(sttBusy)return;const file=$('transcribeFile').files[0];if(!file)return $('transcribeStatus').textContent=t('choose');if(file.size>150*1048576)return $('transcribeStatus').textContent=t('limit');
 sttBusy=true;let permit=null,settled=false;const id=++sttId;$('transcribeStart').disabled=true;$('transcribeCancel').disabled=false;$('transcribeStatus').textContent=t('working');
 try{
  if(!window.VUToolAccess)throw Error('TOOLS_UNAVAILABLE');permit=await window.VUToolAccess.begin('stt');if(id!==sttId)return;
  sttEngine=await createEngine();if(id!==sttId)return;await sttEngine.writeFile('input',new Uint8Array(await file.arrayBuffer()));
  if(await sttEngine.exec(['-i','input','-t','301','-vn','-ac','1','-ar','16000','-f','s16le','speech.pcm']))throw Error('DECODE');
  const bytes=await sttEngine.readFile('speech.pcm');if(bytes.length>300*16000*2)throw Error('LIMIT');if(!bytes.length)throw Error('EMPTY');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),samples=new Float32Array(Math.floor(bytes.byteLength/2));for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(i*2,true)/32768;
  sttEngine.terminate();sttEngine=null;if(id!==sttId)return;
  worker=new Worker(new URL('./transcribe-worker.js',import.meta.url),{type:'module'});$('transcribeStatus').textContent=t('loading');
  const result=await new Promise((resolve,reject)=>{worker.onmessage=({data})=>{if(id!==sttId)return;if(data.type==='result')resolve(data.result);else if(data.type==='error')reject(Error(data.error));else if(data.type==='recognizing')$('transcribeStatus').textContent=t('working');else if(data.type==='progress')$('transcribeStatus').textContent=t('loading')+' '+Math.round(data.progress||0)+'%';};worker.onerror=()=>reject(Error('MODEL'));worker.postMessage({samples,language:$('transcribeLanguage').value},[samples.buffer]);cancelRecognition=()=>reject(Error('CANCELLED'));});
  if(id!==sttId)return;if(!String(result.text||'').trim())throw Error('EMPTY');$('transcript').value=result.text||'';srt=subtitleFiles(result.chunks||[],bytes.length/32000).srt;$('saveSrt').disabled=!srt;editReady();settled=true;await permit.complete();$('transcribeStatus').textContent=t('done');
 }catch(e){if(id===sttId)$('transcribeStatus').textContent=e.code?window.VUToolAccess.message(e):t(e.message==='LIMIT'?'limit':e.message==='CANCELLED'?'cancelled':'error');}
 finally{if(permit&&!settled)try{await permit.cancel();}catch(_){}sttEngine?.terminate();worker?.terminate();worker=sttEngine=null;cancelRecognition=null;sttBusy=false;$('transcribeStart').disabled=false;$('transcribeCancel').disabled=true;}
};
let cancelRecognition=null;
$('transcribeCancel').onclick=()=>{sttId++;cancelRecognition?.();sttEngine?.terminate();worker?.terminate();$('transcribeStatus').textContent=t('cancelled');};
$('copyText').onclick=async()=>{try{await navigator.clipboard.writeText($('transcript').value);$('transcribeStatus').textContent=t('copied');}catch(_){$('transcript').focus();$('transcript').select();}};
$('saveText').onclick=()=>saveLocal(new File([$ ('transcript').value],'VideoUniquifier-transcript.txt',{type:'text/plain'})).catch(()=>$('transcribeStatus').textContent=t('error'));
$('saveSrt').onclick=()=>saveLocal(new File([srt],'VideoUniquifier-subtitles.srt',{type:'text/plain'})).catch(()=>$('transcribeStatus').textContent=t('error'));
$('clearText').onclick=()=>{$('transcript').value='';srt='';$('saveSrt').disabled=true;editReady();};
// Standalone, device-local audio trimming. Reuses the existing local FFmpeg
// runtime but never calls /api/speech, ToolAccess quota, wallets or AI services.
let trimBusy=false,trimEngine=null,trimAbort=null,trimSourceURL=null,trimResultURL=null;
const trimPreview=$('trimSourcePreview');
function trimReady(){
 if(trimBusy){$('trimGenerate').disabled=true;return;}
 try{
  audioTrimSettings($('trimFile').files[0],$('trimStart').value,$('trimEnd').value);
  $('trimGenerate').disabled=false;
 }catch(_){$('trimGenerate').disabled=true;}
}
for(const id of ['trimStart','trimEnd'])$(id).addEventListener('input',trimReady);
$('trimFile').addEventListener('change',()=>{
 if(trimSourceURL){URL.revokeObjectURL(trimSourceURL);trimSourceURL=null;}
 trimPreview.pause();trimPreview.removeAttribute('src');trimPreview.hidden=true;
 const file=$('trimFile').files[0];
 if(file){
  trimSourceURL=URL.createObjectURL(file);trimPreview.src=trimSourceURL;trimPreview.hidden=false;
  trimPreview.onloadedmetadata=()=>{
   const duration=trimPreview.duration;
   if(Number.isFinite(duration)&&duration>0){
    const limited=Math.min(600,duration);
    $('trimEnd').value=String(Math.min(10,Math.round(limited*10)/10));
    trimReady();
   }
  };
 }
 trimReady();
});
$('trimGenerate').onclick=async()=>{
 if(trimBusy||sttBusy||ttsAbort)return;
 const file=$('trimFile').files[0];
 let options;
 try{options=audioTrimSettings(file,$('trimStart').value,$('trimEnd').value);}
 catch(_){$('trimStatus').textContent=t('trimInvalid');return;}
 if(trimPreview.duration&&Number.isFinite(trimPreview.duration)&&
    options.begin+options.seconds>trimPreview.duration+0.05){
  $('trimStatus').textContent=t('trimInvalid');return;
 }
 trimBusy=true;trimAbort=new AbortController();trimReady();
 $('trimCancel').disabled=false;$('trimStatus').textContent=t('working');
 try{
  const output=await trimAudioLocal(file,{start:$('trimStart').value,end:$('trimEnd').value,
   createEngine,onEngine:engine=>{trimEngine=engine;},signal:trimAbort.signal});
  if(trimAbort.signal.aborted)return;
  if(trimResultURL)URL.revokeObjectURL(trimResultURL);
  trimResultURL=URL.createObjectURL(output);
  const player=document.createElement('audio');player.controls=true;player.src=trimResultURL;
  const actions=document.createElement('div');actions.className='actions';
  for(const [name,perform]of [
   ['download',()=>saveLocal(output)],
   ['share',()=>window.VUShareFile({name:output.name,blob:output})],
   ['delete',()=>{player.pause();if(trimResultURL)URL.revokeObjectURL(trimResultURL);trimResultURL=null;$('trimResult').replaceChildren();}]
  ]){
   const btn=document.createElement('button');btn.textContent=t(name);
   btn.onclick=()=>Promise.resolve().then(perform).catch(()=>$('trimStatus').textContent=t('error'));
   actions.append(btn);
  }
  $('trimResult').replaceChildren(player,actions);
  $('trimStatus').textContent=t('done');
 }catch(_){$('trimStatus').textContent=trimAbort?.signal.aborted?t('cancelled'):t('error');}
 finally{trimBusy=false;trimEngine=null;trimAbort=null;$('trimCancel').disabled=true;trimReady();}
};
$('trimCancel').onclick=()=>{trimAbort?.abort();try{trimEngine?.terminate();}catch(_){/* cancelled worker */}};

// Everyday Tools: video soundtrack extraction, exclusively in local FFmpeg.wasm.
// Original media, prompt and output are never POSTed to Studio/Speech/providers.
let vtaBusy=false,vtaAbort=null,vtaEngine=null,vtaPreviewURL=null,vtaOutputURL=null;
const videoPreview=$('vtaPreview');
function vtaReady(){
 if(vtaBusy){$('vtaGenerate').disabled=true;return;}
 try{videoToAudioSettings($('vtaFile').files[0]);$('vtaGenerate').disabled=false;}
 catch(_){$('vtaGenerate').disabled=true;}
}
$('vtaFile').addEventListener('change',()=>{
 if(vtaPreviewURL){URL.revokeObjectURL(vtaPreviewURL);vtaPreviewURL=null;}
 videoPreview.pause();videoPreview.removeAttribute('src');videoPreview.hidden=true;
 if(vtaOutputURL){URL.revokeObjectURL(vtaOutputURL);vtaOutputURL=null;$('vtaResult').replaceChildren();}
 const file=$('vtaFile').files[0];
 try{
  videoToAudioSettings(file);
  vtaPreviewURL=URL.createObjectURL(file);videoPreview.src=vtaPreviewURL;videoPreview.hidden=false;
  $('vtaStatus').textContent='';
 }catch(_){$('vtaStatus').textContent=file?t('vtaInvalid'):'';}
 vtaReady();
});
$('vtaGenerate').onclick=async()=>{
 if(vtaBusy||trimBusy||sttBusy||ttsAbort)return;
 const file=$('vtaFile').files[0];
 try{videoToAudioSettings(file);}catch(_){$('vtaStatus').textContent=t('vtaInvalid');return;}
 vtaBusy=true;vtaAbort=new AbortController();vtaReady();$('vtaCancel').disabled=false;
 $('vtaStatus').textContent=t('vtaWorking');
 try{
  const result=await videoToMp3Local(file,{createEngine,
   onEngine:engine=>{vtaEngine=engine;},signal:vtaAbort.signal});
  if(vtaAbort.signal.aborted)return;
  if(vtaOutputURL)URL.revokeObjectURL(vtaOutputURL);
  vtaOutputURL=URL.createObjectURL(result);
  const player=document.createElement('audio');player.controls=true;player.src=vtaOutputURL;
  const actions=document.createElement('div');actions.className='actions';
  for(const [key,action]of [
   ['download',()=>saveLocal(result)],
   ['share',()=>window.VUShareFile({name:result.name,blob:result})],
   ['delete',()=>{
    player.pause();player.removeAttribute('src');
    if(vtaOutputURL)URL.revokeObjectURL(vtaOutputURL);vtaOutputURL=null;
    $('vtaResult').replaceChildren();
   }]
  ]){
   const button=document.createElement('button');button.textContent=t(key);
   button.onclick=()=>Promise.resolve().then(action).catch(()=>$('vtaStatus').textContent=t('error'));
   actions.append(button);
  }
  $('vtaResult').replaceChildren(player,actions);
  $('vtaStatus').textContent=t('vtaDone');
 }catch(e){
  $('vtaStatus').textContent=vtaAbort?.signal.aborted?t('cancelled'):
   e.message==='VIDEO_AUDIO_NO_AUDIO_OR_UNSUPPORTED'?t('vtaNoAudio'):t('error');
 }finally{
  vtaBusy=false;vtaAbort=null;vtaEngine=null;
  $('vtaCancel').disabled=true;vtaReady();
 }
};
$('vtaCancel').onclick=()=>{
 vtaAbort?.abort();try{vtaEngine?.terminate();}catch(_){/* already cancelled */}
 $('vtaStatus').textContent=t('cancelled');
};
// Keep sensitive local audio, transcripts and owner scripts out of BFCache restores.
// This is a navigation-only cleanup; do not change ToolAccess, credits or providers.
window.addEventListener('pagehide',()=>{
 // Invalidate asynchronous STT callbacks before rejecting/terminating the worker.
 sttId++;
 cancelRecognition?.();
 ttsAbort?.abort();
 trimAbort?.abort();
 vtaAbort?.abort();
 for(const engine of [ttsEngine,sttEngine,worker,trimEngine,vtaEngine]){
  try{engine?.terminate();}catch(_){/* A terminated worker must not skip private-data cleanup. */}
 }
 worker=sttEngine=trimEngine=vtaEngine=null;
 cancelRecognition=null;
 for(const url of [resultURL,trimSourceURL,trimResultURL,vtaPreviewURL,vtaOutputURL]){
  if(url)URL.revokeObjectURL(url);
 }
 resultURL=trimSourceURL=trimResultURL=vtaPreviewURL=vtaOutputURL=null;
 for(const id of ['speechResult','trimResult','vtaResult']){
  $(id).querySelectorAll('audio,video').forEach(media=>{
   try{media.pause();media.removeAttribute('src');}catch(_){}
  });
  $(id).replaceChildren();
 }
 for(const media of [trimPreview,videoPreview]){
  try{media.pause();media.removeAttribute('src');}catch(_){}
  media.hidden=true;
 }
 for(const id of ['speechText','transcript','transcribeFile','trimFile','vtaFile']){
  $(id).value='';
 }
 $('speechConsent').checked=false;
 srt='';
 $('saveSrt').disabled=true;
 for(const id of ['speechStatus','transcribeStatus','trimStatus','vtaStatus']){
  $(id).textContent='';
 }
 editReady();
 ready();
 trimReady();
 vtaReady();
});
