/* Everyday Tools lower gallery: visual only. Preserve existing real tool hrefs/handlers. */
(() => {
 'use strict';
 const main=document.querySelector('main.free-tools-page');
 const section=main?.querySelector('.utility-tools-preview');
 const grid=section?.querySelector('#mobileUtilityGrid');
 if(!section || !grid || grid.dataset.illustrated==='true')return;
 const path='media/everyday-utilities-20261023/';
 const icons={
  'scan-pdf':'▤','pdf-merge':'▧','pdf-split':'⇥','pdf-sign':'✎','pdf-compress':'↘',
  'photo-convert':'◈','photo-resize':'⤢','video-trim':'✂','video-mute':'◀',
  'audio-trim':'♫','qr':'▦','photo-redact':'▰','photo-ocr':'▤','zip':'▣',
  'captions':'▤','photo-compress':'◫','video-compress':'▣',
  'teleprompter':'▣','photo-collage':'▦',
  'background-remover':'✿','tts':'♫','stt':'◉'
 };
 const originalTiles=[...grid.querySelectorAll('a[data-utility]')];
 // Move existing, genuinely routed shortcuts into the SAME illustrated grid.
 const bg=section.querySelector(':scope > a.audio-launch-card[href="simple-background-remover.html"]');
 if(bg){
  bg.className='hub-tile mobile-utility-tile';
  bg.dataset.utility='background-remover';
  const icon=document.createElement('span');icon.className='utility-tile-icon';icon.setAttribute('aria-hidden','true');icon.textContent='✿';
  const strong=document.createElement('strong');strong.textContent='Background Remover';
  const small=document.createElement('small');small.textContent='Remove flat-color backgrounds and save a transparent PNG.';
  bg.replaceChildren(icon,strong,small);
  grid.append(bg);
 }
 const speech=section.querySelector('.et-speech-links');
 if(speech){
  for(const a of [...speech.querySelectorAll('a[data-hub-tool]')]){
   const kind=a.dataset.hubTool;
   if(kind!=='tts'&&kind!=='stt')continue;
   a.dataset.utility=kind;
   a.classList.add('mobile-utility-tile');
   const icon=a.querySelector('.hub-icon');
   if(icon){icon.replaceChildren(document.createTextNode(icons[kind]));icon.className='utility-tile-icon';}
   grid.append(a);
  }
  if(!speech.children.length)speech.remove();
 }
 const tiles=[...grid.querySelectorAll('a[data-utility]')];
 for(const a of tiles){
  const id=a.dataset.utility;
  if(!Object.hasOwn(icons,id))continue;
  a.classList.add('et-utility-card');
  const icon=a.querySelector('.utility-tile-icon');
  if(icon){icon.className='utility-tile-icon et-utility-icon';icon.textContent=icons[id];}
  const img=document.createElement('img');
  img.className='et-utility-art';
  img.src=path+id+'.svg';
  img.alt='';
  img.width=960;img.height=540;
  img.loading='lazy';img.decoding='async';
  img.addEventListener('error',()=>a.classList.add('et-art-fallback'),{once:true});
  a.prepend(img);
  const cta=document.createElement('span');
  cta.className='et-utility-cta';cta.setAttribute('aria-hidden','true');
  cta.textContent='Open →';
  a.append(cta);
 }
 grid.classList.add('et-utility-gallery');
 grid.dataset.illustrated='true';
 // The currently open page must use the owner's desired precise label.
 const side=document.querySelector('#dsSiteSidebar a[href="free-tools.html"]');
 const label=[...side?.childNodes||[]].find(n=>n.nodeType===Node.TEXT_NODE);
 if(label)label.textContent='Everyday Tools';
 const category=[...document.querySelectorAll('#dsSiteSidebar .ds-site-caption')].find(n=>n.textContent.trim()==='Tools');
 if(category)category.textContent='Everyday Tools';
 const select=document.querySelector('.et-picker option[value="all"]');
 if(select)select.textContent='Everyday Tools';
 const back=document.querySelector('#hubBack');
 if(back && back.textContent.includes('All tools'))back.textContent=back.textContent.replace('All tools','Everyday Tools');
 section.dataset.utilityGalleryCount=String(tiles.length);
})();