/* Owner-approved Everyday Tools visual landing. Existing processing and navigation own all operations.
   Screenshot sprite extracts display the genuine approved 09_Everyday_Tools art
   until independently generated artwork files can be uploaded as reviewed binaries. */
(() => {
 'use strict';
 const main=document.querySelector('main.free-tools-page.tools-hub');
 if(!main || main.querySelector('#etShowcase'))return;
 const lang=(navigator.language||'en').slice(0,2);
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
 const cards=[
  {title:'Compress Photos',desc:'Reduce image file size while keeping great quality.',icon:'▧',category:'image',mode:'photo',rect:[427,377,158,146]},
  {title:'Compress Video',desc:'Make your videos smaller and easier to share.',icon:'▣',category:'video',mode:'video',rect:[801,377,185,146]},
  {title:'Extract Audio',desc:'Separate audio from any video file.',icon:'◖',category:'audio',mode:'audio',rect:[1198,377,200,146]},
  {title:'Photo to PDF',desc:'Turn your photos into a clean PDF document.',icon:'▤',category:'image',href:'mobile-utility.html?tool=scan-pdf',rect:[419,537,169,146]},
  {title:'Photo Collage',desc:'Combine multiple photos into a beautiful collage.',icon:'▦',category:'image',href:'photo-collage.html',rect:[805,537,181,146]},
  {title:'Background Remover',desc:'Remove backgrounds from images with ease.',icon:'♧',category:'image',href:'simple-background-remover.html',rect:[1192,537,204,146]},
  {title:'Teleprompter',desc:'Keep your script in view while recording.',icon:'▣',category:'video',mode:'prompter',rect:[407,697,180,148]},
  {title:'Smart Reminders',desc:'Stay organized and never miss what matters.',icon:'♧',category:'everyday',href:'smart-reminders.html',rect:[794,697,192,148]},
  {title:'Avatar Studio',desc:'Create unique avatars for your projects.',icon:'♙',category:'creative',href:'avatar-studio.html',rect:[1190,697,207,148]}
 ];
 const showcase=make('section','et-showcase');showcase.id='etShowcase';
 showcase.setAttribute('aria-label','Everyday Tools');
 // Real navigation and local filter actions, with unavailable paid actions disabled.
 const bar=make('div','et-topbar');
 const search=make('input','et-search');search.type='search';search.placeholder='Search anything...';search.setAttribute('aria-label','Search tools');
 const barLinks=make('nav','et-top-actions');barLinks.setAttribute('aria-label','Quick links');
 for(const [label,url] of [['Help','index.html#faq'],['Credits','pricing.html'],['Pricing','pricing.html']]){
  const a=make('a','et-top-link',label);a.href=url;barLinks.append(a);
 }
 const invite=make('button','et-top-link','Invite Friend');invite.type='button';
 const invitationFeedback=make('span','et-invite-feedback');invitationFeedback.setAttribute('role','status');
 invite.addEventListener('click',async()=>{
  const url=new URL('deepsyq.html',location.href).href;
  try{
   if(navigator.share)await navigator.share({title:'Deepsyq',url});
   else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);invitationFeedback.textContent='Link copied';}
   else invitationFeedback.textContent='Open: '+url;
  }catch(e){if(e?.name!=='AbortError')invitationFeedback.textContent='Sharing unavailable';}
 });
 const promo=make('button','et-promo','Promo Code');promo.type='button';
 const dialog=make('dialog','et-promo-dialog');dialog.append(make('h2','','Promo Code'),make('p','','Promo codes are not enabled on this preview. No payment will be charged.'));
 const dismiss=make('button','','Close');dismiss.type='button';dismiss.addEventListener('click',()=>dialog.close());dialog.append(dismiss);
 promo.addEventListener('click',()=>dialog.showModal()); 
 const language=make('select','et-language');language.setAttribute('aria-label','Language');
 for(const [code,label] of [['en','English'],['fr','Français'],['ru','Русский']]){const o=make('option','',label);o.value=code;language.append(o);}
 const status=make('span','et-language-feedback');status.setAttribute('role','status');
 language.addEventListener('change',()=>{status.textContent=language.value==='en'?'English':language.value==='fr'?'Français sélectionné':'Выбран русский';});
 const topSearch=make('label','et-top-search');topSearch.append(make('span','','⌕'),search);bar.append(topSearch,barLinks,promo,invite,language,invitationFeedback,status,dialog);
 showcase.append(bar);
 const hero=make('div','et-hero');const heroCopy=make('div','et-hero-copy');
 const heading=make('h1','', 'Everyday Tools');
 const lead=make('strong','et-hero-lead','Less routine. More creating.');
 const tagline=make('p','','Simple, powerful tools to handle your everyday creative tasks. All in one place.');
 heroCopy.append(heading,lead,tagline);hero.append(crop([695,61,703,242],'et-hero-art'),heroCopy);showcase.append(hero);
 const leadRow=make('div','et-section-heading');
 const inner=make('div');inner.append(make('h2','','Choose a tool'),make('p','','Everyday essentials for your creative workflow.'));
 const picker=make('select','et-picker');picker.setAttribute('aria-label','Filter tools');
 for(const [v,t] of [['all','All Tools'],['image','Image Tools'],['video','Video Tools'],['audio','Audio Tools'],['everyday','Everyday'],['creative','Creative']]){const o=make('option','',t);o.value=v;picker.append(o);}
 leadRow.append(inner,picker);showcase.append(leadRow);
 const gallery=make('div','et-gallery');gallery.id='etGallery';
 for(const card of cards){
  const a=make('a','et-card');a.href=card.href||('?tool='+card.mode);a.dataset.category=card.category;
  const icon=make('span','et-icon',card.icon);icon.setAttribute('aria-hidden','true');
  const copy=make('span','et-card-copy');
  copy.append(make('strong','et-card-title',card.title),make('span','et-card-desc',card.desc));
  const cta=make('span','et-card-button','Open '+card.title+'  →');
  cta.setAttribute('aria-hidden','true');copy.append(cta);
  a.append(crop(card.rect,'et-card-art'),icon,copy);
  if(card.mode){a.addEventListener('click',e=>{
    const target=main.querySelector('.quick-tool-list .hub-tile[data-hub-tool="'+card.mode+'"]');
    if(target){e.preventDefault();target.click();}
   });}
  gallery.append(a);
 }
 showcase.append(gallery);
 // Preserve Agent C's required, real Avatar 'from=tools' route and owned
 // speech shortcuts, while moving their on-screen placement into the gallery.
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
 const banner=make('a','et-uniquifier');banner.href='index.html';
 const iconArt=crop([205,867,198,161],'et-play-art');const videoArt=crop([807,867,590,161],'et-video-art');
 const bannerCopy=make('div','et-uniquifier-copy');
 const legacyText={
  ru:['Уникализация видео','Создайте новый уникальный вариант своего видео.','Исходные режимы Gentle, Balance и Dynamic.','Открыть уникализацию видео →'],
  fr:['Video Uniquifier','Donnez un nouveau style à vos vidéos.','Modes Gentle, Balance et Dynamic.','Ouvrir Video Uniquifier →'],
  uk:['Унікалізація відео','Створіть новий унікальний варіант свого відео.','Початкові режими Gentle, Balance і Dynamic.','Відкрити унікалізацію відео →'],
  en:['Video Uniquifier','Transform your videos into something new and original.','Make your content stand out with a fresh, unique look.','Open Video Uniquifier →']
 }[lang]||['Video Uniquifier','Transform your videos into something new and original.','Make your content stand out with a fresh, unique look.','Open Video Uniquifier →'];
 bannerCopy.append(make('h2','',legacyText[0]),make('p','',legacyText[1]),make('small','',legacyText[2]),make('span','et-card-button',legacyText[3]));
 banner.append(iconArt,videoArt,bannerCopy);showcase.append(banner);
 main.prepend(showcase);
 // Modify only this page's local sidebar caption; Home and other pages remain untouched.
 const cap=[...document.querySelectorAll('#dsSiteSidebar .ds-site-caption')].find(e=>e.textContent.trim()==='Tools');
 if(cap)cap.textContent='Everyday Tools';
 function filter(){
  const q=search.value.trim().toLocaleLowerCase();
  const kind=picker.value;
  let n=0;
  for(const a of gallery.children){
   const match=(!q||a.textContent.toLocaleLowerCase().includes(q))&&(kind==='all'||a.dataset.category===kind);
   a.hidden=!match;if(match)n++;
  }
  leadRow.querySelector('p').textContent=n?'Everyday essentials for your creative workflow.':'No matching tools. Try another search.';
 }
 search.addEventListener('input',filter);picker.addEventListener('change',filter);
})();