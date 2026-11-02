/* Owner-approved Everyday Tools: 22 actual generated images, no tool route rewrites. */
(() => {
 'use strict';
 const main=document.querySelector('main.free-tools-page');
 const section=main?.querySelector('.utility-tools-preview');
 const grid=section?.querySelector('#mobileUtilityGrid');
 if(!section||!grid||grid.dataset.ownerPhotoVersion==='20261024')return;
 const base='media/everyday-utilities-owner-20261024/';
 const ids=[
  'scan-pdf','pdf-merge','pdf-split','pdf-sign','pdf-compress','photo-convert',
  'photo-resize','video-trim','video-mute','audio-trim','qr','photo-redact',
  'photo-ocr','zip','captions','photo-compress','video-compress',
  'teleprompter','photo-collage'
 ];
 const translatedOpen=/^(ru|uk)/i.test(navigator.language||'')?'Открыть →':'Open →';
 const makePhoto=(id,klass,width,height)=>{
  const img=document.createElement('img');
  img.className=klass;
  img.src=base+id+'.webp';
  img.alt='';
  img.width=width;img.height=height;
  img.loading='lazy';img.decoding='async';
  img.addEventListener('error',()=>{
    img.classList.add('et-owner-art-error');
    // Preserve earlier vector art as a fallback only if a compressed image cannot load.
    img.src='media/everyday-utilities-20261023/'+id+'.svg';
  },{once:true});
  return img;
 };
 const addCta=(a,text)=>{
  if(a.querySelector('.et-photo-cta'))return;
  const badge=document.createElement('span');
  badge.className='et-photo-cta';badge.setAttribute('aria-hidden','true');
  badge.textContent=text;
  a.append(badge);
 };
 const available=new Set(ids);
 for(const a of grid.querySelectorAll('a[data-utility]')){
  const id=a.dataset.utility;
  if(!available.has(id))continue;
  a.classList.add('et-photo-card');
  const icon=a.querySelector('.utility-tile-icon');
  if(icon)icon.classList.add('et-photo-icon');
  a.prepend(makePhoto(id,'et-owner-photo',576,324));
  addCta(a,translatedOpen);
 }
 grid.classList.add('et-utility-gallery','et-photo-grid');
 grid.dataset.ownerPhotoVersion='20261024';
 grid.dataset.illustrated='true';
 // The 20th asset is a separate horizontal banner, NOT a normal square card.
 const banner=section.querySelector(':scope > a.audio-launch-card[href="simple-background-remover.html"]');
 if(banner){
  banner.classList.add('et-owner-bg-banner');
  banner.prepend(makePhoto('background-remover','et-owner-wide-art',1300,230));
  addCta(banner,/^(ru|uk)/i.test(navigator.language||'')?'Открыть →':'Open Background Remover →');
 }
 // The final two assets stay in two wide bottom cards with the existing real Audio links.
 const voices=section.querySelector('.et-speech-links');
 if(voices){
  voices.classList.add('et-owner-voices');
  for(const a of voices.querySelectorAll('a[data-hub-tool]')){
   const id=a.dataset.hubTool;
   if(id!=='tts'&&id!=='stt')continue;
   a.classList.add('et-owner-voice-card');
   a.prepend(makePhoto(id,'et-owner-voice-art',1000,264));
   addCta(a,translatedOpen);
  }
 }
 const side=document.querySelector('#dsSiteSidebar a[href="free-tools.html"]');
 const label=[...side?.childNodes||[]].find(n=>n.nodeType===Node.TEXT_NODE);
 if(label)label.textContent='Everyday Tools';
 const category=[...document.querySelectorAll('#dsSiteSidebar .ds-site-caption')].find(n=>n.textContent.trim()==='Tools');
 if(category)category.textContent='Everyday Tools';
 const option=document.querySelector('.et-picker option[value="all"]');
 if(option)option.textContent='Everyday Tools';
 const back=document.querySelector('#hubBack');
 if(back&&back.textContent.includes('All tools'))back.textContent=back.textContent.replace('All tools','Everyday Tools');
 section.dataset.utilityGalleryCount=String(grid.querySelectorAll('a.et-photo-card').length+(banner?1:0)+(voices?.querySelectorAll('a.et-owner-voice-card').length||0));
})();