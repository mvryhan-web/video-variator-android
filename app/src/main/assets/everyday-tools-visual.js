/* Owner-approved Everyday Tools visual landing. Existing processing and navigation own all operations.
   Screenshot sprite extracts display the genuine approved 09_Everyday_Tools art
   until independently generated artwork files can be uploaded as reviewed binaries. */
(() => {
 'use strict';
 const main=document.querySelector('main.free-tools-page.tools-hub');
 if(!main || main.querySelector('#etShowcase'))return;
 const getLang=()=>{
  try{
   const saved=localStorage.getItem('deepsyq_home_language')||localStorage.getItem('deepsyq_lang');
   if(saved&&['en','ru','fr','es','uk'].includes(saved))return saved==='uk'?'ru':saved;
  }catch(_){}
  const raw=(navigator.languages?.[0]||navigator.language||'en').slice(0,2).toLowerCase();
  return ['en','ru','fr','es'].includes(raw)?raw:'en';
 };
 const asset='media/approved-design-20261023/09_Everyday_Tools.png';
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const svgNS='http://www.w3.org/2000/svg';
 function crop(rect,extra=''){
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox',rect.join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  svg.setAttribute('aria-hidden','true');svg.classList.add('et-art');
  if(extra)svg.classList.add(extra);
  const img=document.createElementNS(svgNS,'image');
  img.setAttribute('href',asset);img.setAttribute('width','1448');img.setAttribute('height','1086');
  svg.append(img);return svg;
 }
 const i18n={
  en:{
   heading:'Choose a tool',sub:'Everyday essentials for your creative workflow.',empty:'No matching tools. Try another search.',
   open:'Open',cats:{all:'All Tools',image:'Image Tools',video:'Video Tools',audio:'Audio Tools',everyday:'Everyday',creative:'Creative'},
   titles:['Compress Photos','Compress Video','Extract Audio','Photo to PDF','Photo Collage','Background Remover','Teleprompter','Smart Reminders','Avatar Studio'],
   banner:['Video Uniquifier','Open Video Uniquifier →'],sidebar:'Everyday Tools'
  },
  ru:{
   heading:'Выберите инструмент',sub:'Повседневные инструменты для фото, видео и аудио.',empty:'Подходящие инструменты не найдены.',
   open:'Открыть',cats:{all:'Все инструменты',image:'Фото и PDF',video:'Видео',audio:'Аудио',everyday:'Органайзер',creative:'Аватары'},
   titles:['Сжатие фото','Сжатие видео','Извлечь аудио','Фото в PDF','Фотоколлаж','Удаление фона','Телесуфлёр','Умные напоминания','Студия аватаров'],
   banner:['Уникализатор видео','Открыть уникализатор видео →'],sidebar:'Инструменты'
  },
  fr:{
   heading:'Choisir un outil',sub:'L’essentiel du quotidien pour vos créations.',empty:'Aucun outil correspondant.',
   open:'Ouvrir',cats:{all:'Tous les outils',image:'Image et PDF',video:'Vidéo',audio:'Audio',everyday:'Quotidien',creative:'Créatif'},
   titles:['Compresser des photos','Compresser une vidéo','Extraire l’audio','Photo en PDF','Collage photo','Supprimer le fond','Téléprompteur','Rappels intelligents','Studio Avatar'],
   banner:['Video Uniquifier','Ouvrir Video Uniquifier →'],sidebar:'Outils du quotidien'
  },
  es:{
   heading:'Elige una herramienta',sub:'Herramientas esenciales para tu flujo creativo.',empty:'No hay herramientas que coincidan.',
   open:'Abrir',cats:{all:'Todas',image:'Imagen y PDF',video:'Vídeo',audio:'Audio',everyday:'Diario',creative:'Creativo'},
   titles:['Comprimir fotos','Comprimir vídeo','Extraer audio','Foto a PDF','Collage de fotos','Quitar fondo','Teleprónter','Recordatorios inteligentes','Estudio de Avatares'],
   banner:['Video Uniquifier','Abrir Video Uniquifier →'],sidebar:'Herramientas'
  }
 };
 const cards=[
  {category:'image',mode:'photo',rect:[458,377,128,146]},
  {category:'video',mode:'video',rect:[835,377,151,146]},
  {category:'audio',mode:'audio',rect:[1222,377,176,146]},
  {category:'image',href:'mobile-utility.html?tool=scan-pdf',rect:[452,537,136,146]},
  {category:'image',href:'photo-collage.html',rect:[838,537,148,146]},
  {category:'image',href:'simple-background-remover.html',rect:[1258,537,138,146]},
  {category:'video',mode:'prompter',rect:[524,697,63,148]},
  {category:'everyday',href:'smart-reminders.html',rect:[832,697,154,148]},
  {category:'creative',href:'avatar-studio.html',rect:[1226,697,171,148]}
 ];
 const showcase=make('section','et-showcase');showcase.id='etShowcase';
 showcase.setAttribute('aria-label','Everyday Tools');
 const leadRow=make('div','et-section-heading');
 const inner=make('div');
 const h2=make('h2','','');const leadP=make('p','','');
 inner.append(h2,leadP);
 const picker=make('select','et-picker');picker.setAttribute('aria-label','Filter tools');
 const catKeys=['all','image','video','audio','everyday','creative'];
 const catOptions=catKeys.map(v=>{const o=make('option','',v);o.value=v;picker.append(o);return o;});
 leadRow.append(inner,picker);showcase.append(leadRow);
 const gallery=make('div','et-gallery');gallery.id='etGallery';
 const cardEls=cards.map((card,idx)=>{
  const a=make('a','et-card');a.href=card.href||('?tool='+card.mode);a.dataset.category=card.category;
  const copy=make('span','et-card-copy');
  const titleEl=make('strong','et-card-title','');
  const cta=make('span','et-card-button','');
  cta.setAttribute('aria-hidden','true');copy.append(titleEl,cta);
  a.append(crop(card.rect,'et-card-art'),copy);
  if(card.mode){a.addEventListener('click',e=>{
    const target=main.querySelector('.quick-tool-list .hub-tile[data-hub-tool="'+card.mode+'"]');
    if(target){e.preventDefault();target.click();}
   });}
  gallery.append(a);
  return {a,titleEl,cta,idx};
 });
 showcase.append(gallery);
 const legacyAvatar=main.querySelector('.tools-direct-launches');
 const avatarCard=gallery.querySelector('.et-card[href="avatar-studio.html"]');
 if(legacyAvatar && avatarCard){
   const wrap=make('div','et-avatar-wrap');wrap.dataset.category='creative';
   avatarCard.before(wrap);wrap.append(avatarCard,legacyAvatar);
   legacyAvatar.classList.add('et-avatar-shortcut');
 }
 const utilities=main.querySelector('.utility-tools-preview');
 const speech=[...main.querySelectorAll('.quick-tool-list .hub-tile[data-hub-tool="tts"],.quick-tool-list .hub-tile[data-hub-tool="stt"]')];
 if(utilities&&speech.length){
  const links=make('div','et-speech-links');
  links.setAttribute('aria-label','Audio and text tools');
  speech.forEach(a=>links.append(a));
  utilities.append(links);
 }
 const banner=make('a','et-uniquifier');banner.href='video-uniquifier.html';
 const videoArt=crop([1015,867,382,161],'et-video-art');
 const bannerCopy=make('div','et-uniquifier-copy');
 const bannerH2=make('h2','','');const bannerBtn=make('span','et-card-button','');
 bannerCopy.append(bannerH2,bannerBtn);
 banner.append(videoArt,bannerCopy);showcase.append(banner);
 main.prepend(showcase);
 function applyCopy(){
  const t=i18n[getLang()]||i18n.en;
  h2.textContent=t.heading;
  catOptions.forEach((o,i)=>{o.textContent=t.cats[catKeys[i]];});
  cardEls.forEach(({titleEl,cta,idx})=>{
   const label=t.titles[idx];
   titleEl.textContent=label;
   cta.textContent=t.open+' '+label+'  →';
  });
  bannerH2.textContent=t.banner[0];
  bannerBtn.textContent=t.banner[1];
  const cap=[...document.querySelectorAll('#dsSiteSidebar .ds-site-caption')].find(e=>['Tools','Everyday Tools','Инструменты','Outils du quotidien','Herramientas'].includes(e.textContent.trim()));
  if(cap)cap.textContent=t.sidebar;
  filter();
 }
 function filter(){
  const t=i18n[getLang()]||i18n.en;
  const kind=picker.value;
  let n=0;
  for(const a of gallery.children){
   const match=kind==='all'||a.dataset.category===kind;
   a.hidden=!match;if(match)n++;
  }
  leadP.textContent=n?t.sub:t.empty;
 }
 picker.addEventListener('change',filter);
 window.addEventListener('deepsyq:lang',applyCopy);
 applyCopy();
})();
