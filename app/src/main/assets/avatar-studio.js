import {createEngine,saveLocal} from './ai-media.js';

const $=id=>document.getElementById(id);
const lang=(navigator.language||'en-US').toLowerCase();
const dict={
 ru:{back:'← Назад',included:'Включено в Basic, Pro и Business',title:'Аватар-комментатор',intro:'Сверху — ваше видео, снизу — ваш фото-аватар. Добавьте текст и свой голос. Монтаж выполняется локально на устройстве.',plan:'Доступ',video:'1 · Исходное видео',photo:'2 · Фото аватара',text:'3 · Текст для озвучки',deviceVoice:'Предпросмотр голоса устройства',deviceVoiceNote:'Бесплатно прослушайте текст голосом, уже установленным на устройстве. Для скачиваемого видео используйте свой записанный или загруженный голос ниже.',previewVoice:'Прослушать текст',ownVoice:'Ваш голос для экспорта',ownVoiceNote:'Загрузите аудио или запишите озвучку здесь. Запись остаётся на устройстве.',audio:'Загрузить аудио голоса',record:'Записать голос',stop:'Стоп',consent:'Я подтверждаю, что это мой голос/фото или у меня есть разрешение использовать их в этом видео.',motionNote:'Эта бесплатная локальная версия делает лёгкое движение аватара без облачного lip-sync. Более точную синхронизацию губ можно подключить позже, не меняя этот процесс.',create:'Создать видео с двумя экранами',cancel:'Отмена'},
 fr:{back:'← Retour',included:'Inclus avec Basic, Pro et Business',title:'Narrateur avatar',intro:'Votre vidéo en haut, votre avatar photo en bas. Ajoutez le texte et votre propre voix. Le montage reste local.',plan:'Accès',video:'1 · Vidéo source',photo:'2 · Photo avatar',text:'3 · Texte de narration',deviceVoice:'Aperçu de la voix de l’appareil',previewVoice:'Écouter',ownVoice:'Votre voix pour l’export',audio:'Importer la voix',record:'Enregistrer la voix',stop:'Arrêter',consent:'Je confirme que cette voix/photo m’appartient ou que j’ai l’autorisation de l’utiliser.',create:'Créer la vidéo',cancel:'Annuler'},
 uk:{back:'← Назад',included:'Включено в Basic, Pro та Business',title:'Аватар-оповідач',intro:'Ваше відео зверху, фото-аватар знизу. Додайте текст і власний голос. Монтаж виконується локально.',plan:'Доступ',video:'1 · Вихідне відео',photo:'2 · Фото аватара',text:'3 · Текст озвучення',deviceVoice:'Попередній перегляд голосу пристрою',previewVoice:'Прослухати',ownVoice:'Ваш голос для експорту',audio:'Завантажити голос',record:'Записати голос',stop:'Стоп',consent:'Я підтверджую, що це мій голос/фото або маю дозвіл на їх використання.',create:'Створити відео',cancel:'Скасувати'}
};
const locale=lang.startsWith('ru')?'ru':lang.startsWith('fr')?'fr':lang.startsWith('uk')?'uk':'en';
if(dict[locale])document.querySelectorAll('[data-av]').forEach(el=>{const v=dict[locale][el.dataset.av];if(v)el.textContent=v;});

let plan='trial',engine=null,busy=false,cancelled=false,recordStream=null,recorder=null,recordChunks=[],recordedVoice=null;
const urls=[];
const status=s=>$('avatarStatus').textContent=s;
const voiceStatus=s=>$('voiceStatus').textContent=s;
const u=b=>{const x=URL.createObjectURL(b);urls.push(x);return x;};
const token=localStorage.getItem('vv_token')||'';
const policy={basic:{w:720,h:1280,label:'Basic · 720p'},pro:{w:1080,h:1920,label:'Pro · 1080p'},business:{w:2160,h:3840,label:'Business · 4K'}};

async function account(){
 if(!token){$('avatarPlan').textContent='Sign in and choose Basic, Pro or Business';updateReady();return;}
 try{
  const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token}}),d=await r.json();
  const usage=d.user?.usage||d.usage;
  if(r.ok&&usage?.active&&policy[usage.plan]){plan=usage.plan;$('avatarPlan').textContent=(d.user?.isAdmin?'Admin · ':'')+policy[plan].label+' · Avatar Narrator';$('avatarQuality').textContent=policy[plan].label;updateReady();}
  else{$('avatarPlan').textContent='Basic, Pro or Business subscription required';updateReady();}
 }catch(_){$('avatarPlan').textContent='Could not verify plan';updateReady();}
}
function updateReady(){
 const hasVoice=!!($('avatarAudio').files[0]||recordedVoice);
 $('avatarGenerate').disabled=busy||!policy[plan]||!$('avatarVideo').files[0]||!$('avatarPhoto').files[0]||!$('avatarText').value.trim()||!hasVoice||!$('voiceConsent').checked;
}
function previewFile(input,el,type){
 const file=input.files[0];if(!file){el.removeAttribute('src');updateReady();return;}
 el.src=u(file);if(type==='video')el.load();updateReady();
}
$('avatarVideo').onchange=()=>previewFile($('avatarVideo'),$('avatarVideoPreview'),'video');
$('avatarPhoto').onchange=()=>{previewFile($('avatarPhoto'),$('avatarPhotoPreview'),'image');};
$('avatarText').oninput=()=>{$('avatarPreviewText').textContent=$('avatarText').value;updateReady();};
$('avatarAudio').onchange=()=>{recordedVoice=null;voiceStatus($('avatarAudio').files[0]?.name||'');updateReady();};
$('voiceConsent').onchange=updateReady;

function loadVoices(){
 const select=$('avatarVoice'),voices=speechSynthesis?.getVoices?.()||[];select.replaceChildren();
 voices.forEach((v,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=v.name+' · '+v.lang;select.append(o);});
 if(!voices.length){const o=document.createElement('option');o.textContent='Default device voice';o.value='';select.append(o);}
}
if('speechSynthesis'in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
$('avatarSpeak').onclick=()=>{
 const text=$('avatarText').value.trim();if(!text)return status('Write narration text first.');
 if(!('speechSynthesis'in window))return status('Device speech is unavailable here.');
 speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(text);const voices=speechSynthesis.getVoices();const selected=voices[Number($('avatarVoice').value)];if(selected)utter.voice=selected;utter.lang=selected?.lang||navigator.language||'en-US';speechSynthesis.speak(utter);
};

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
function captionBlob(width,text){
 const h=Math.max(180,Math.round(width*.24)),c=document.createElement('canvas');c.width=width;c.height=h;const x=c.getContext('2d');x.clearRect(0,0,width,h);x.fillStyle='rgba(5,7,12,.72)';x.fillRect(0,0,width,h);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='600 '+Math.max(24,Math.round(width*.042))+'px system-ui, sans-serif';
 const words=text.trim().split(/\s+/),lines=[];let line='';const max=width*.88;for(const word of words){const test=line?line+' '+word:word;if(x.measureText(test).width>max&&line){lines.push(line);line=word;}else line=test;if(lines.length>=4)break;}if(line&&lines.length<5)lines.push(line);
 const lh=Math.max(34,Math.round(width*.055)),start=h/2-(lines.length-1)*lh/2;lines.forEach((v,i)=>x.fillText(v,width/2,start+i*lh,max));return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('CAPTION')),'image/png'));
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
  await engine.writeFile('source',new Uint8Array(await video.arrayBuffer()));await engine.writeFile('avatar',new Uint8Array(await photo.arrayBuffer()));await engine.writeFile('voice',new Uint8Array(await voice.arrayBuffer()));
  const cap=await captionBlob(p.w,$('avatarText').value);await engine.writeFile('caption.png',new Uint8Array(await cap.arrayBuffer()));
  const top=Math.round(p.h*.58/2)*2,bottom=p.h-top,capH=Math.max(180,Math.round(p.w*.24));
  const filter=`[0:v]scale=${p.w}:${top}:force_original_aspect_ratio=increase,crop=${p.w}:${top}[top];[1:v]scale=${p.w}:${bottom}:force_original_aspect_ratio=increase,crop=${p.w}:${bottom},zoompan=z='min(zoom+0.00025,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${p.w}x${bottom}:fps=30[avatar];[top][avatar]vstack=inputs=2[stack];[stack][3:v]overlay=0:${p.h-capH}:format=auto[v]`;
  status('Creating video locally…');
  const rc=await engine.exec(['-i','source','-loop','1','-framerate','30','-i','avatar','-i','voice','-loop','1','-i','caption.png','-filter_complex',filter,'-map','[v]','-map','2:a:0','-t',String(duration),'-c:v','libx264','-preset','ultrafast','-crf',p.w>=2160?'25':p.w>=1080?'23':'22','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','avatar-output.mp4']);
  if(rc)throw Error('ENCODE');const bytes=await engine.readFile('avatar-output.mp4'),file=new File([bytes],'VideoUniquifier-Avatar-'+Date.now()+'.mp4',{type:'video/mp4'});
  await resultControls(file);await saveLocal(file);status('Done · saved automatically to VideoUniquifier on this device.');
 }catch(e){if(!cancelled){console.warn(e);status(e.message==='CANCELLED'?'Canceled':String(e.message||'Could not create the avatar video.'));}}
 finally{try{engine?.terminate();}catch(_){}engine=null;busy=false;$('avatarCancel').disabled=true;updateReady();}
};
window.addEventListener('pagehide',()=>{speechSynthesis?.cancel?.();recordStream?.getTracks().forEach(t=>t.stop());try{engine?.terminate();}catch(_){}urls.splice(0).forEach(URL.revokeObjectURL);});
account();