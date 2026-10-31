(()=>{'use strict';
const $=id=>document.getElementById(id),lang=(navigator.language||'en').slice(0,2);
const dict={ru:{portrait:'Удалить фон портрета',avatar:'Аватар-комментатор',avatarDesc:'Создайте видео с вашим аватаром и озвучкой.',back:'← Назад',title:'Повседневные инструменты',privacy:'Повседневные задачи для фото, видео и аудио. Доступ зависит от инструмента.',theme:'Тема',system:'Как на устройстве',dark:'Тёмная',light:'Светлая',files:'Фото, видео и аудио',mediaTools:'Фото, видео и аудио',mediaHint:'Выберите, что хотите сделать — нужный выбор файла откроется сразу.',operation:'Инструмент',photo:'Сжать фото (одно или несколько)',photoTitle:'Фото',photoDesc:'Сжать одно или несколько фото в JPEG меньшего размера.',video:'Сжать видео',videoTitle:'Видео',videoDesc:'Сжать одно видео и сохранить воспроизводимый MP4.',audio:'Извлечь аудио из видео',audioTitle:'Аудио',audioDesc:'Извлечь звуковую дорожку из видео в M4A.',choosePhoto:'Выбрать фото',chooseVideo:'Выбрать видео',chooseAudio:'Выбрать видео',choose:'Выбрать файлы',quality:'Качество фото (JPEG, белый фон)',limits:'Фото: до 50 файлов, до 25 МБ каждый. Видео: один файл до 150 МБ. Не закрывайте страницу во время обработки. При первом использовании аудио/видео загружается движок.',run:'Обработать',cancel:'Отмена',teleprompter:'Телесуфлёр',script:'Ваш текст (только на время этой сессии)',speed:'Скорость',font:'Размер текста',mirror:'Зеркально',play:'Начать запись',reset:'В начало',cameraOpen:'Открыть камеру',cameraClose:'Закрыть камеру',promptNote:'Камера за текстом. Старт одновременно запускает запись и прокрутку. Текст не попадёт в сохранённое видео.',download:'Скачать',share:'Поделиться',done:'Готово',cancelled:'Отменено',select:'Выберите файлы.',busy:'Дождитесь окончания обработки видео.',loading:'Загрузка локального движка…',failed:'Не удалось обработать файл. Возможно, формат не поддерживается или недостаточно памяти.',limit:'Превышен лимит файлов или размера.',smaller:'Исходный файл уже меньше — сохранён оригинал.',unsupported:'Отправка файла недоступна. Скачайте его и отправьте из галереи.',processing:'Обработка'},fr:{portrait:'Détourer un portrait',avatar:'Narrateur avatar',avatarDesc:'Créez une vidéo avec votre avatar et une narration.',back:'← Retour',title:'Outils du quotidien',privacy:'Des outils du quotidien pour vos photos, vidéos et sons.',theme:'Thème',system:'Système',dark:'Sombre',light:'Clair',files:'Photo, vidéo et audio',mediaTools:'Photo, vidéo et audio',mediaHint:'Choisissez une action : le bon sélecteur de fichier s’ouvre immédiatement.',operation:'Outil',photo:'Compresser les photos',photoTitle:'Photo',photoDesc:'Compresser une ou plusieurs photos en JPEG plus léger.',video:'Compresser une vidéo',videoTitle:'Vidéo',videoDesc:'Compresser une vidéo tout en conservant un MP4 lisible.',audio:'Extraire le son d’une vidéo',audioTitle:'Audio',audioDesc:'Extraire la piste audio d’une vidéo au format M4A.',choosePhoto:'Choisir des photos',chooseVideo:'Choisir une vidéo',chooseAudio:'Choisir une vidéo',choose:'Choisir les fichiers',quality:'Qualité photo (JPEG, fond blanc)',run:'Traiter',cancel:'Annuler',teleprompter:'Téléprompteur',script:'Votre texte (cette session uniquement)',speed:'Vitesse',font:'Taille du texte',mirror:'Miroir',play:'Démarrer l’enregistrement',cameraOpen:'Ouvrir la caméra',cameraClose:'Fermer la caméra',promptNote:'La caméra est derrière le texte. Le texte ne figure pas dans la vidéo enregistrée.',reset:'Revenir au début',download:'Télécharger',share:'Partager',done:'Terminé',cancelled:'Annulé'}};
const en={avatarDesc:'Create a split-screen video with your avatar and narration.',mediaTools:'Photo, video & audio',mediaHint:'Choose what you want to do. The correct file picker opens immediately.',photoTitle:'Photo',photoDesc:'Compress one or many photos to a smaller JPEG.',videoTitle:'Video',videoDesc:'Compress one video while keeping a playable MP4.',audioTitle:'Audio',audioDesc:'Extract the audio track from a video into M4A.',choosePhoto:'Choose photos',chooseVideo:'Choose video',chooseAudio:'Choose video',download:'Download',share:'Share',done:'Done',cancelled:'Canceled',select:'Choose files first.',busy:'Wait for video processing to finish.',loading:'Loading the local engine…',failed:'Could not process this file. The format may be unsupported or device memory insufficient.',limit:'File count or size limit exceeded.',smaller:'Original is already smaller — kept the original.',unsupported:'File sharing is unavailable. Download the file and share it from your gallery.',processing:'Processing'};
const t=k=>dict[lang]?.[k]||en[k]||k;document.querySelectorAll('[data-t]').forEach(e=>{const value=dict[lang]?.[e.dataset.t]||en[e.dataset.t];if(value)e.textContent=value;});
const audioCard=document.querySelector('.audio-launch-card');if(audioCard){const labels={ru:['Текст → MP3 · Видео / MP3 → текст','Озвучка, распознавание речи и скачивание текста.'],fr:['Texte → MP3 · Vidéo / MP3 → texte','Narration, transcription et téléchargement du texte.'],uk:['Текст → MP3 · Відео / MP3 → текст','Озвучення, розпізнавання мовлення й завантаження тексту.']}[lang];if(labels){audioCard.querySelector('strong').textContent=labels[0];audioCard.querySelector('small').textContent=labels[1];}}
let busy=false,canceled=false,engine=null,workerURL=null,pageEpoch=0;const urls=[];const status=s=>$('status').textContent=s;
$('quality').oninput=()=> $('qualityValue').textContent=$('quality').value+'%';
function syncOperation(reset=true){
 const mode=$('operation').value,photo=mode==='photo',image=photo||mode==='motion';
 window.VUCreatorTools?.sync(mode);
 $('files').accept=image?'image/jpeg,image/png,image/webp':'video/*';$('files').multiple=photo;
 if(reset){$('files').value='';$('selection').textContent='';}
 $('qualityLabel').hidden=!photo;
 document.querySelectorAll('[data-mode-card]').forEach(card=>card.classList.toggle('active',card.dataset.modeCard===mode));
}
$('operation').onchange=()=>syncOperation(true);
document.querySelectorAll('.tool-choice').forEach(button=>button.addEventListener('click',()=>{
 if(busy)return;$('operation').value=button.dataset.tool;syncOperation(true);$('files').click();
}));
$('files').onchange=()=>{$('selection').textContent=Array.from($('files').files).map(f=>f.name).join(', ');};
const requestedTool=new URLSearchParams(location.search).get('tool');if(['photo','video','audio','clips','motion'].includes(requestedTool))$('operation').value=requestedTool;
syncOperation(false);
function release(){urls.splice(0).forEach(u=>URL.revokeObjectURL(u));}
async function nativeSave(file,share){const transferEpoch=pageEpoch,bridge=window.AndroidBridge;if(!bridge?.startToolFile){if(bridge)throw Error('Update Android app to save these file types');return false;}if(!bridge.startToolFile(file.name,file.type))throw Error('Save failed');try{for(let i=0;i<file.size;i+=262144){const bytes=new Uint8Array(await file.slice(i,i+262144).arrayBuffer());if(transferEpoch!==pageEpoch)throw Error('Canceled');let binary='';for(const b of bytes)binary+=String.fromCharCode(b);if(!bridge.appendToolChunk(btoa(binary)))throw Error('Save failed');}if(transferEpoch!==pageEpoch)throw Error('Canceled');if(!bridge.finishToolFile(share))throw Error('Save failed');return true;}catch(e){bridge.cancelToolFile();throw e;}}
async function save(file){const requestEpoch=pageEpoch;if(await nativeSave(file,false))return;if(requestEpoch!==pageEpoch)return;const a=document.createElement('a'),u=URL.createObjectURL(file);urls.push(u);a.href=u;a.download=file.name;document.body.append(a);a.click();a.remove();}
async function share(file){if(window.AndroidBridge&&await nativeSave(file,true))return;if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Video Uniquifier'});return;}await save(file);status(t('unsupported'));}
function result(file,source,note='',target=$('outputs')){const row=document.createElement('article'),p=document.createElement('p');p.textContent=`${file.name} · ${(source.size/1048576).toFixed(2)} MB → ${(file.size/1048576).toFixed(2)} MB ${note}`;row.append(p);const media=document.createElement(file.type.startsWith('image/')?'img':file.type.startsWith('audio/')?'audio':'video');const u=URL.createObjectURL(file);urls.push(u);media.src=u;if(media.tagName==='IMG')media.alt=file.name;else media.controls=true;row.append(media);const actions=document.createElement('div');actions.className='actions';for(const [key,fn]of [['download',save],['share',share]]){const b=document.createElement('button');b.textContent=t(key);b.onclick=async()=>{b.disabled=true;try{await fn(file);}catch(e){if(e.name!=='AbortError')status(t('failed'));}finally{b.disabled=false;}};actions.append(b);}const del=document.createElement('button');del.textContent=({ru:'Удалить',fr:'Supprimer',uk:'Видалити'})[lang]||'Delete';del.onclick=()=>{if(media.pause)media.pause();media.removeAttribute('src');URL.revokeObjectURL(u);row.remove();};actions.append(del);row.append(actions);target.append(row);}
async function compressPhoto(file){
 const u=URL.createObjectURL(file),img=new Image();
 let canvas=null;
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=u;});
  if(img.naturalWidth*img.naturalHeight>40000000)throw Error('Image too large');
  const scale=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight));
  canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image canvas unavailable');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',Number($('quality').value)/100));
  if(!blob)throw Error('Encode failed');
  return blob.size<file.size?new File([blob],file.name.replace(/\.[^.]+$/,'')+'-compressed.jpg',{type:'image/jpeg'}):file;
 }finally{
  // Local photos should not retain decoded pixels if drawing or encoding fails.
  if(canvas)canvas.width=canvas.height=1;
  URL.revokeObjectURL(u);
 }
}
async function loadEngine(){status(t('loading'));const base=location.protocol==='file:'?(window.AndroidBridge?.getApiBase?.()||'https://video-variator-android.onrender.com'):location.origin;if(!window.FFmpegWASM?.FFmpeg)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=base+'/vendor/ffmpeg/ffmpeg.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});if(canceled)throw Error('Canceled');engine=new window.FFmpegWASM.FFmpeg();const response=await fetch(new URL('ffmpeg-worker.js',location.href));if(!response.ok)throw Error('Worker unavailable');workerURL=URL.createObjectURL(await response.blob());await engine.load({classWorkerURL:workerURL,coreURL:base+'/vendor/ffmpeg/ffmpeg-core.js',wasmURL:base+'/vendor/ffmpeg/ffmpeg-core.wasm'});engine.on('progress',({progress})=>{if(!canceled)status(t('processing')+' '+Math.round(Math.max(0,Math.min(1,progress))*100)+'%');});}
async function creatorMedia(file,mode){
 const tool=window.VUCreatorTools,settings=tool.settings();
 if(mode==='clips')settings.duration=await tool.duration(file);
 const data=mode==='motion'?await tool.preparePhoto(file):new Uint8Array(await file.arrayBuffer());
 if(canceled)throw Error('Canceled');await loadEngine();if(canceled)throw Error('Canceled');await engine.writeFile('input',data);
 const outputs=[];for(const job of tool.commands(mode,settings)){
  if(canceled)throw Error('Canceled');const code=await engine.exec(job.args);if(code!==0)throw Error('Processing failed');
  const bytes=await engine.readFile(job.name);outputs.push(new File([bytes],file.name.replace(/\.[^.]+$/,'')+'-'+job.name,{type:'video/mp4'}));await engine.deleteFile(job.name);
 }return outputs;
}
async function mediaFile(file,mode){if(['clips','motion'].includes(mode))return creatorMedia(file,mode);await loadEngine();if(canceled)throw Error('Canceled');await engine.writeFile('input',new Uint8Array(await file.arrayBuffer()));const out=mode==='audio'?'audio.m4a':'compressed.mp4';const args=mode==='audio'?['-i','input','-map','0:a:0','-vn','-c:a','aac','-b:a','128k',out]:['-i','input','-map','0:v:0','-map','0:a:0?','-vf',"scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-preset','ultrafast','-crf','30','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',out];const code=await engine.exec(args);if(code!==0)throw Error('Processing failed');const data=await engine.readFile(out),mime=mode==='audio'?'audio/mp4':'video/mp4';const output=new File([data],file.name.replace(/\.[^.]+$/,'')+'-'+out,{type:mime});return mode==='video'&&output.size>=file.size?file:output;}
// Additional archive is for the EXISTING Basic/trial-gated photo_batch run.
// Never expose a separate unrestricted batch path or change plan settlement.
async function renderPhotoBatchArchive(items){
 if(items.length<2||canceled)return;
 const total=items.reduce((sum,file)=>sum+file.size,0);
 // Bounded ZIP memory, without reducing existing per-file processing limits.
 if(items.length>20||total>96*1048576){
  const p=document.createElement('p');
  p.textContent=({ru:'ZIP пропущен для большого набора — скачайте файлы по отдельности.',fr:'Archive ZIP non créée pour ce lot volumineux — fichiers individuels disponibles.',uk:'ZIP пропущено для великого набору — завантажте файли окремо.'})[lang]||'ZIP skipped for a large batch; individual downloads remain available.';
  $('outputs').append(p);return;
 }
 if(!window.JSZip){
  await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='/vendor/jszip/jszip.min.js';
   script.onload=()=>window.JSZip?resolve():reject(Error('ZIP unavailable'));
   script.onerror=()=>reject(Error('ZIP script unavailable'));
   document.head.append(script);
  });
 }
 if(canceled)return;
 const archive=new window.JSZip();
 for(const [index,file] of items.entries()){
  const basename=String(file.name||'photo').replace(/[\\/\x00-\x1f<>:"|?*]/g,'_').slice(0,100)||'photo';
  archive.file(String(index+1).padStart(2,'0')+'-'+basename,file);
 }
 const bytes=await archive.generateAsync({type:'blob',compression:'STORE'});
 if(canceled)return;
 const zipped=new File([bytes],'deepsyq-photo-batch.zip',{type:'application/zip'});
 const card=document.createElement('div');card.className='photo-batch-zip';
 const label=document.createElement('p');
 label.textContent=({ru:'Все фото одним ZIP',fr:'Toutes les photos en ZIP',uk:'Усі фото одним ZIP'})[lang]||'All processed photos in one ZIP';
 const button=document.createElement('button');button.type='button';
 button.textContent=({ru:'Скачать ZIP',fr:'Télécharger le ZIP',uk:'Завантажити ZIP'})[lang]||'Download ZIP';
 button.onclick=async()=>{button.disabled=true;try{await save(zipped);}catch(_){status(t('failed'));}finally{button.disabled=false;}};
 card.append(label,button);$('outputs').append(card);
}
$('cancel').onclick=()=>{canceled=true;try{engine?.terminate();}catch(_){}status(t('cancelled'));};
$('run').onclick=async()=>{
 if(busy)return;const files=Array.from($('files').files),mode=$('operation').value;
 if(!files.length)return status(t('select'));
 if(files.length>(mode==='photo'?50:1)||files.some(f=>f.size>(['photo','motion'].includes(mode)?25:150)*1048576))return status(t('limit'));
 const feature=mode==='photo'&&files.length>1?'photo_batch':mode;
 busy=true;canceled=false;status(t('processing'));$('run').disabled=true;$('cancel').disabled=false;$('operation').disabled=true;$('files').disabled=true;
 document.querySelectorAll('.tool-choice,#creatorToolSettings select').forEach(e=>e.disabled=true);
 let failures=0,successes=0,permit=null,settled=false;const photoBatchOutputs=[];
 try{
  if(!['photo','audio'].includes(feature)){if(!window.VUToolAccess)throw Error('TOOLS_UNAVAILABLE');permit=await window.VUToolAccess.begin(feature);}
  if(canceled)return;release();$('outputs').replaceChildren();
  for(let i=0;i<files.length&&!canceled;i++){
   status(`${t('processing')} ${i+1}/${files.length}`);
   try{const output=mode==='photo'?await compressPhoto(files[i]):await mediaFile(files[i],mode);
    if(!canceled){for(const item of (Array.isArray(output)?output:[output])){if(canceled)break;result(item,files[i],item===files[i]?t('smaller'):'');if(window.AndroidBridge)await save(item);successes++;if(mode==='photo'&&files.length>1)photoBatchOutputs.push(item);}}
   }catch(e){if(!canceled){failures++;const p=document.createElement('p');p.textContent=files[i].name+': '+t('failed');$('outputs').append(p);}}
  }
  if(permit){settled=true;await(canceled||!successes?permit.cancel():permit.complete());}
  if(!canceled&&mode==='photo'&&photoBatchOutputs.length>1){try{await renderPhotoBatchArchive(photoBatchOutputs);}catch(_){const p=document.createElement('p');p.textContent='ZIP unavailable — download photos individually.';$('outputs').append(p);}}
  status(canceled?t('cancelled'):failures?t('failed'):(window.AndroidBridge?t('done')+' · Gallery / VideoUniquifier':t('done')));
 }catch(e){status(window.VUToolAccess?.message(e)||t('failed'));}
 finally{
  if(permit&&!settled)try{await permit.cancel();}catch(_){}
  try{engine?.terminate();}catch(_){}engine=null;if(workerURL)URL.revokeObjectURL(workerURL);workerURL=null;
  busy=false;$('run').disabled=false;$('cancel').disabled=true;$('operation').disabled=false;$('files').disabled=false;document.querySelectorAll('.tool-choice,#creatorToolSettings select').forEach(e=>e.disabled=false);
 }
};
window.VUFreeTools={get busy(){return busy;},save,share,renderRecording:file=>result(file,file,'',$('cameraResults'))};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});window.addEventListener('pagehide',()=>{
 ++pageEpoch;
 // BFCache may restore a page after a private photo has been processed.
 // Invalidate in-flight work before its next await resumes, and purge both
 // selected source files and already rendered photo/video previews.
 canceled=true;
 release();
 $('files').value='';
 $('selection').textContent='';
 $('outputs').replaceChildren();
 const cameraResults=$('cameraResults');
 if(cameraResults)cameraResults.replaceChildren();
 try{engine?.terminate();}catch(_){}
});window.vuHandleAndroidBack=()=>{if(busy){$('cancel').click();return true;}location.href='index.html';return true;};
})();
