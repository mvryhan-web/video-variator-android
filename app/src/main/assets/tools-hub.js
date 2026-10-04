/* Navigation and presentation only. Processing stays in the existing tools. */
(()=>{'use strict';
 const $=s=>document.querySelector(s),lang=(navigator.language||'en').slice(0,2);
 const texts={
 en:{title:'Free tools',lead:'Photo, video and audio. Pick one task.',back:'All tools',choose:'1 · Choose a file',settings:'2 · Adjust',result:'3 · Save & share',quality:['Best quality','Balanced','Small file'],settingsName:'Appearance',wait:'Finish or cancel the current task before leaving.',names:['Compress photos','Compress video','Extract audio','Cut video','Photo → video','Text → voice','Recording → text','Teleprompter'],notes:['Up to 50 photos','Smaller MP4','Video → M4A','Consecutive clips','Gentle camera zoom','Google voices · daily limits','Local transcription','Camera + scrolling script']},
 ru:{title:'Бесплатные инструменты',lead:'Фото, видео и аудио. Выберите одну задачу.',back:'Все инструменты',choose:'1 · Выберите файл',settings:'2 · Настройте',result:'3 · Сохраните и поделитесь',quality:['Лучшее качество','Баланс','Маленький файл'],settingsName:'Оформление',wait:'Завершите или отмените текущую задачу перед выходом.',names:['Сжать фото','Сжать видео','Извлечь звук','Нарезать видео','Фото → видео','Текст → голос','Запись → текст','Телесуфлёр'],notes:['До 50 фото сразу','Компактный MP4','Видео → M4A','По длительности','Плавное приближение','Голоса Google · дневной лимит','На устройстве','Камера и ваш сценарий']},
 fr:{title:'Outils gratuits',lead:'Photo, vidéo et audio. Choisissez une tâche.',back:'Tous les outils',choose:'1 · Choisir un fichier',settings:'2 · Régler',result:'3 · Enregistrer et partager',quality:['Haute qualité','Équilibré','Petit fichier'],settingsName:'Apparence',wait:'Terminez ou annulez la tâche avant de quitter.',names:['Compresser les photos','Compresser une vidéo','Extraire le son','Découper une vidéo','Photo → vidéo','Texte → voix','Enregistrement → texte','Téléprompteur'],notes:['Jusqu’à 50 photos','MP4 plus léger','Vidéo → M4A','Clips consécutifs','Zoom progressif','Voix Google · limite quotidienne','Transcription locale','Caméra et scénario']},
 uk:{title:'Безкоштовні інструменти',lead:'Фото, відео й аудіо. Оберіть одну задачу.',back:'Усі інструменти',choose:'1 · Оберіть файл',settings:'2 · Налаштуйте',result:'3 · Збережіть і поділіться',quality:['Найкраща якість','Баланс','Малий файл'],settingsName:'Оформлення',wait:'Завершіть або скасуйте поточну задачу перед виходом.',names:['Стиснути фото','Стиснути відео','Витягти звук','Нарізати відео','Фото → відео','Текст → голос','Запис → текст','Телесуфлер'],notes:['До 50 фото одразу','Компактний MP4','Відео → M4A','За тривалістю','Плавне наближення','Голоси Google · денний ліміт','На пристрої','Камера та сценарій']}
 },c=texts[lang]||texts.en;
 const modes=['photo','video','audio','clips','motion','tts','stt','prompter'];
 if(!$('.free-tools-page')){
  const mode=new URLSearchParams(location.search).get('tool');
  if(['tts','stt'].includes(mode)){
   const section=$('#'+(mode==='tts'?'speechText':'transcribeFile')).closest('section');
   document.querySelectorAll('main > section').forEach(e=>e.hidden=e!==section);
   const h=section.querySelector('h2');h.textContent=c.names[mode==='tts'?5:6];
  }return;
 }
 const main=$('.free-tools-page'),grid=$('.quick-tool-list'),panel=$('.selected-tool-panel'),camera=$('.teleprompter-card'),hero=$('.free-tools-hero');
 main.classList.add('tools-hub');
 hero.querySelector('h1').textContent=c.title;hero.querySelector('p').textContent=c.lead;
 const appearance=document.createElement('details');appearance.className='hub-appearance';const summary=document.createElement('summary');summary.textContent=c.settingsName;appearance.append(summary,$('.theme-line'));main.querySelector('header').append(appearance);
 $('.avatar-launch-card')?.remove();$('.audio-launch-card')?.remove();$('.media-tools-card .section-intro')?.remove();
 $('#operation').closest('label').hidden=true;
 const icons=['M4 4h16v16H4z M6 16l4-5 4 4 3-3 3 4 M8 8h.01','M3 5h13v14H3z M16 10l5-3v10l-5-3','M9 18V5l10-2v13 M9 15a3 3 0 1 0 0 3 M19 13a3 3 0 1 0 0 3','M4 4l16 16 M4 20L20 4 M7 6a3 3 0 1 0-6 0 3 3 0 0 0 6 0 M7 18a3 3 0 1 0-6 0 3 3 0 0 0 6 0','M3 4h18v16H3z M10 8l6 4-6 4z','M4 5h10 M9 5v14 M17 8q6 4 0 8','M4 3h12l4 4v14H4z M8 10h8 M8 14h8 M8 18h5','M3 5h18v14H3z M7 9h10 M7 13h7 M9 19v3 M15 19v3'];
 const icon=i=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[i]}"/></svg>`;
 grid.replaceChildren();modes.forEach((mode,i)=>{
  const a=document.createElement('a');a.className='hub-tile';a.dataset.hubTool=mode;a.href=['tts','stt'].includes(mode)?`audio-studio.html?tool=${mode}`:`?tool=${mode}`;
  a.innerHTML=`<span class="hub-icon">${icon(i)}</span><strong></strong><small></small>`;a.querySelector('strong').textContent=c.names[i];a.querySelector('small').textContent=c.notes[i];grid.append(a);
  if(!['tts','stt'].includes(mode))a.onclick=e=>{e.preventDefault();navigate(mode);};
 });
 const screen=document.createElement('div');screen.className='hub-screen-header';screen.hidden=true;screen.innerHTML='<button type="button" id="hubBack"></button><h1 tabindex="-1" id="hubTitle"></h1><p role="status" id="hubNotice"></p>';screen.querySelector('button').textContent='← '+c.back;hero.after(screen);
 $('#files').closest('label').querySelector('span').textContent=c.choose;
 const adjust=document.createElement('h2');adjust.className='hub-adjust';adjust.textContent=c.settings;$('#qualityLabel').before(adjust);
 const saveTitle=document.createElement('h2');saveTitle.textContent=c.result;saveTitle.hidden=true;$('#outputs').before(saveTitle);new MutationObserver(()=>{saveTitle.hidden=!$('#outputs article');}).observe($('#outputs'),{childList:true});
 const preview=document.createElement('div');preview.id='hubSelectionPreview';$('#selection').after(preview);
 const presets=document.createElement('div');presets.className='hub-presets';presets.setAttribute('aria-label',c.settings);
 [92,80,55].forEach((q,i)=>{const b=document.createElement('button');b.type='button';b.textContent=c.quality[i];b.dataset.quality=q;b.onclick=()=>{if(window.VUFreeTools.busy)return;$('#quality').value=q;$('#quality').dispatchEvent(new Event('input'));};presets.append(b);});$('#qualityLabel').prepend(presets);
 function quality(){presets.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.quality===$('#quality').value)));}$('#quality').addEventListener('input',quality);quality();
 let active='',previewUrls=[];
 function selection(){previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];preview.replaceChildren();const files=Array.from($('#files').files);panel.classList.toggle('no-selection',!files.length);if(!files.length)return;
  const size=document.createElement('p');size.textContent=`${files.length} · ${(files.reduce((n,f)=>n+f.size,0)/1048576).toFixed(2)} MB`;preview.append(size);
  files.filter(f=>f.type.startsWith('image/')).slice(0,4).forEach(f=>{const img=document.createElement('img');img.src=URL.createObjectURL(f);previewUrls.push(img.src);img.alt=f.name;preview.append(img);});
 }
 $('#files').addEventListener('change',selection);$('#operation').addEventListener('change',selection);
 function allowed(){if(window.VUFreeTools.busy||(active==='prompter'&&$('#cameraOpen').disabled&&$('#cameraClose').disabled)||$('#play').getAttribute('aria-pressed')==='true'){ $('#hubNotice').textContent=c.wait;return false;}return true;}
 function render(mode,focus=false){
  const valid=modes.includes(mode)&&!['tts','stt'].includes(mode);mode=valid?mode:'';
  if(active==='prompter'&&mode!==active)$('#cameraClose').click();
  if(mode&&mode!=='prompter'&&$('#operation').value!==mode){$('#operation').value=mode;$('#operation').dispatchEvent(new Event('change'));$('#outputs').replaceChildren();$('#status').textContent='';}
  active=mode;main.dataset.activeTool=mode;hero.hidden=!!mode;grid.hidden=!!mode;screen.hidden=!mode;panel.hidden=!mode||mode==='prompter';camera.hidden=mode!=='prompter';$('.media-tools-card').hidden=mode==='prompter';
  $('#hubTitle').textContent=c.names[modes.indexOf(mode)]||c.title;$('#hubNotice').textContent='';selection();if(focus){window.scrollTo(0,0);(mode?$('#hubTitle'):hero.querySelector('h1')).focus();}
 }
 function navigate(mode){if(!allowed())return;const u=new URL(location.href);mode?u.searchParams.set('tool',mode):u.searchParams.delete('tool');history.pushState({},'',u);render(mode,true);}
 $('#hubBack').onclick=()=>navigate('');hero.querySelector('h1').tabIndex=-1;
 window.addEventListener('popstate',()=>{if(!allowed()){const u=new URL(location.href);active?u.searchParams.set('tool',active):u.searchParams.delete('tool');history.pushState({},'',u);return;}render(new URLSearchParams(location.search).get('tool'),true);});
 const nativeBack=window.vuHandleAndroidBack;window.vuHandleAndroidBack=()=>{if(active){navigate('');return true;}return nativeBack();};
 render(new URLSearchParams(location.search).get('tool'));
})();
