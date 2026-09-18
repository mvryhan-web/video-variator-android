(()=>{'use strict';
 const $=id=>document.getElementById(id),ru=navigator.language.startsWith('ru'),t=(en,r)=>ru?r:en;
 let stream=null,recorder=null,chunks=[],raf=0,last=0,position=0,recording=false,opening=false,active=true,wake=null;
 const note=s=>$('cameraStatus').textContent=s;
 const stopScroll=()=>{cancelAnimationFrame(raf);last=0;$('play').setAttribute('aria-pressed','false');};
 const tick=now=>{if(!recording)return;if(last){position+=(now-last)*Number($('speed').value)/1000;$('prompter').scrollTop=position;}last=now;raf=requestAnimationFrame(tick);};
 const stop=()=>{stopScroll();if(recorder&&recorder.state!=='inactive'){recorder.stop();$('play').disabled=true;}};
 const close=()=>{stop();stream?.getTracks().forEach(track=>track.stop());stream=null;$('cameraPreview').srcObject=null;wake?.release().catch(()=>{});wake=null;$('cameraOpen').disabled=false;};
 $('script').oninput=()=>{$('prompterText').textContent=$('script').value;};$('font').oninput=()=>{$('prompterText').style.fontSize=$('font').value+'px';};$('mirror').onchange=()=>{$('prompterText').style.transform=$('mirror').checked?'scaleX(-1)':'';};
 $('cameraOpen').onclick=async()=>{
  if(window.AndroidBridge?.openTeleprompter){window.AndroidBridge.openTeleprompter($('script').value,Number($('speed').value),Number($('font').value),$('mirror').checked);return;}
  if(window.AndroidBridge)return note(t('Install the latest Android version to use the camera teleprompter.','Установите новую версию Android-приложения для телесуфлёра с камерой.'));
  if(opening||recording)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return note(t('Camera recording is unavailable in this browser. Open the HTTPS app in a supported browser.','Запись камеры недоступна. Откройте HTTPS-версию приложения в поддерживаемом браузере.'));
  opening=true;$('cameraOpen').disabled=true;note(t('Allow camera and microphone access…','Разрешите доступ к камере и микрофону…'));
  try{const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:true});if(!active||document.hidden){acquired.getTracks().forEach(x=>x.stop());return;}stream?.getTracks().forEach(x=>x.stop());stream=acquired;$('cameraPreview').srcObject=stream;await $('cameraPreview').play();$('cameraStage').classList.add('has-camera');$('play').disabled=false;$('cameraClose').disabled=false;note(t('Ready. Start records video and scrolls your text together. Text is not included in the saved video.','Готово. Старт включает запись и прокрутку текста. Текст не попадёт в сохранённое видео.'));}catch(e){close();note(t('Camera or microphone access failed. Check browser permissions, then try again.','Нет доступа к камере или микрофону. Проверьте разрешения браузера и повторите.'));}finally{opening=false;if(!stream)$('cameraOpen').disabled=false;}
 };
 $('play').onclick=async()=>{if(recording)return stop();if(!stream)return note(t('Open the camera first.','Сначала откройте камеру.'));
  try{const mime=['video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);if(chunks.reduce((n,b)=>n+b.size,0)>150*1048576)stop();};
   recorder.onstart=()=>{recording=true;position=0;$('prompter').scrollTop=0;$('play').textContent=t('Stop recording','Остановить запись');$('play').setAttribute('aria-pressed','true');$('script').disabled=true;$('reset').disabled=true;note(t('Recording…','Запись…'));raf=requestAnimationFrame(tick);navigator.wakeLock?.request('screen').then(lock=>{if(recording)wake=lock;else lock.release();}).catch(()=>{});};
   recorder.onstop=()=>{recording=false;stopScroll();wake?.release().catch(()=>{});wake=null;$('play').disabled=!stream;$('play').textContent=t('Start recording','Начать запись');$('script').disabled=false;$('reset').disabled=false;
    const mime=recorder.mimeType||chunks[0]?.type||'video/webm';if(chunks.length){const file=new File(chunks,'VideoUniquifier-Prompter-'+Date.now()+(mime.includes('mp4')?'.mp4':'.webm'),{type:mime.split(';')[0]});window.VUFreeTools.renderRecording(file);note(t('Recording ready. Download or share it below.','Запись готова. Скачайте или отправьте её ниже.'));}chunks=[];};
   recorder.onerror=()=>{stop();note(t('Recording failed. Try again.','Ошибка записи. Попробуйте снова.'));};recorder.start(1000);
  }catch(e){note(t('This browser could not start recording.','Браузер не смог начать запись.'));}
 };
 $('reset').onclick=()=>{if(!recording){$('prompter').scrollTop=0;position=0;}};
 $('cameraClose').onclick=()=>{close();$('cameraStage').classList.remove('has-camera');$('cameraClose').disabled=true;$('play').disabled=true;};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});window.addEventListener('pagehide',()=>{active=false;close();});window.addEventListener('pageshow',()=>{active=true;});
 window.addEventListener('beforeunload',e=>{if(recording){e.preventDefault();e.returnValue='';}});
})();
