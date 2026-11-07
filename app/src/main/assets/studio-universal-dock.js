import {createCanonicalIcon} from './deepsyq-canonical-nav-icons.js';

// Thin visual adapter for the EXISTING Studio form. All real Studio controls,
// model selection, prompts, microphone, pricing checks and submit handlers stay.
// Nothing generates on a mode switch, on opening +, or on selecting Settings.
export function mountStudioUniversalDock({form,nav,gear}){
 if(!form||!nav||!gear||form.dataset.studioUniversalDock)return;
 const $=id=>document.getElementById(id),make=(tag,cls='')=>{
  const el=document.createElement(tag);if(cls)el.className=cls;return el;
 };
 const prompt=$('prompt'),submit=$('generate'),mic=$('studioVoiceBtn'),references=$('references'),rail=form.querySelector('.j-mode-rail');
 if(!prompt||!submit||!mic||!references||!rail)return;
 form.dataset.studioUniversalDock='ready';

 // Owner-approved six Studio settings panels: presentation layer only.
 // No original model/provider, price, ratio select, dialog or form handlers
 // are replaced; the same native Studio controls remain authoritative.
 document.body.classList.add('studio-premium-panels');
 if(!document.querySelector('link[data-deepsyq-studio-premium]')){
  const skin=document.createElement('link');
  skin.rel='stylesheet';
  skin.href='studio-premium-panels.css?v=20261107-01';
  skin.dataset.deepsyqStudioPremium='true';
  document.head.append(skin);
 }
 const nativeModels=$('modelChoices');
 const brandFor=(card)=>{
  const label=(card.querySelector('strong')?.textContent||'').toLowerCase();
  const id=(card.dataset.modelId||'').toLowerCase();
  const name=label+' '+id;
  if(/nano.?banana|\bveo\b|google/.test(name))return ['google','G','Google'];
  if(/seedream|seedance|bytedance|byteplus/.test(name))return ['bytedance','Seed','ByteDance Seed'];
  if(/chatgpt|gpt.?image|openai/.test(name))return ['openai','AI','OpenAI'];
  return ['other','AI','Model provider'];
 };
 const labelProviders=()=>{
  if(!nativeModels)return;
  for(const card of nativeModels.querySelectorAll('.model-card')){
   // The old generic first-letter badge was the Russian status letter "П".
   // Brand text is honest fallback; do NOT invent model-specific thumbnails.
   const mark=card.querySelector('.model-provider-mark');
   if(!mark)continue; // Model renderer may still be inserting it.
   const [brand,label,providerName]=brandFor(card);
   if(mark.dataset.vendor===brand)continue;
   mark.dataset.vendor=brand;
   mark.textContent=label;
   mark.setAttribute('title',providerName+' · model provider');
  }
 };
 if(nativeModels){
  const visualObserver=new MutationObserver(labelProviders);
  visualObserver.observe(nativeModels,{childList:true,subtree:true});
  labelProviders();
  window.addEventListener('pagehide',()=>visualObserver.disconnect(),{once:true});
 }
 // Video uses EXACTLY the ratios exposed by the current provider. The three
 // extra visual slots mirror Image Settings but are explicitly disabled when
 // a model does not support them; they NEVER alter the native #ratio select.
 const nativeSettings=$('settingsDialog'),ratioTiles=$('ratioChoices');
 const syncVisualRatioGrid=()=>{
  if(!nativeSettings||!ratioTiles)return;
  ratioTiles.querySelectorAll('.premium-unavailable-ratio').forEach(el=>el.remove());
  if(nativeSettings.dataset.studioKind!=='video'||!nativeSettings.open)return;
  const supported=new Set([...ratioTiles.querySelectorAll('button[aria-label]')].map(el=>el.getAttribute('aria-label')));
  for(const label of ['1:1','2:3','3:2','9:16','16:9']){
   if(supported.has(label))continue;
   const b=make('button','premium-unavailable-ratio');
   b.type='button';b.disabled=true;b.setAttribute('aria-disabled','true');
   b.setAttribute('aria-label',label+' — unavailable for this model');
   b.setAttribute('title','This video model does not support '+label);
   const drawing=make('span','ratio-drawing');
   const [w,h]=label.split(':').map(Number);
   const scale=Math.min(46/w,42/h);
   drawing.style.width=Math.max(1,Math.floor(w*scale))+'px';
   drawing.style.aspectRatio=w+' / '+h;
   drawing.setAttribute('aria-hidden','true');
   const caption=make('span');caption.textContent=label;
   b.append(drawing,caption);ratioTiles.append(b);
  }
 };
 if(nativeSettings){
  const ratioViewObserver=new MutationObserver(()=>queueMicrotask(syncVisualRatioGrid));
  ratioViewObserver.observe(nativeSettings,{attributes:true,attributeFilter:['open','data-studio-kind']});
  window.addEventListener('pagehide',()=>ratioViewObserver.disconnect(),{once:true});
 }
 const dock=make('section','j-neon-dock');dock.id='studioUniversalDock';
 dock.setAttribute('aria-label','JARVIX Universal Hub and Studio composer');
 const bar=make('div','jarvix-compose j-neon-composer');bar.id='studioDockControls';
 const plus=make('button','j-glow-plus');plus.id='jPlus';plus.type='button';
 plus.textContent='+';plus.setAttribute('aria-controls','jPlusMenu');plus.setAttribute('aria-expanded','false');
 plus.setAttribute('aria-label','Open Universal Hub');
 const menu=make('div','j-plus-menu j-hub-menu');menu.id='jPlusMenu';menu.hidden=true;
 menu.setAttribute('aria-label','DEEPSYQ quick access');
 const actions=[
  {type:'mode',mode:'image',name:'Image',icon:'image'},
  {type:'mode',mode:'video',name:'Video',icon:'video'},
  {type:'mode',mode:'audio',name:'Audio',icon:'audio'},
  {type:'link',href:'free-tools.html',name:'Tools',icon:'tools'},
  {type:'link',href:'ai-apps.html',name:'AI Apps',icon:'apps'},
  {type:'link',href:'deepsyq.html#inspirationPreview',name:'Inspiration',icon:'inspiration'},
  {type:'upload',name:'Upload',icon:null},
  {type:'link',href:'my-creations.html',name:'Assets',icon:'history'}
 ];
 const uploadIcon='<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 15v5h16v-5"/></svg>';
 const selectNative=mode=>{
  const kind=mode==='audio'?'music':mode;
  const real=nav.querySelector('[data-kind="'+kind+'"]');
  if(!real)return false;
  real.click();
  const accepted=real.getAttribute('aria-pressed')==='true';
  if(accepted)try{sessionStorage.setItem('jarvix_composer_mode',mode);}catch{}
  syncMode();
  return accepted;
 };
 const closeMenu=()=>{menu.hidden=true;plus.setAttribute('aria-expanded','false');};
 const openRealStudioSettings=gear.onclick; // Original protected Studio Settings Hub handler.
 for(const action of actions){
  const el=make(action.type==='link'?'a':'button','j-hub-tile');
  if(action.type==='link')el.href=action.href;
  else{el.type='button';if(action.type==='mode'){el.dataset.jMode=action.mode;el.setAttribute('aria-pressed','false');}}
  const visual=make('span','j-hub-glyph');visual.setAttribute('aria-hidden','true');
  if(action.icon){const svg=createCanonicalIcon(action.icon);if(svg)visual.append(svg);}
  else{visual.classList.add('j-hub-upload');visual.innerHTML=uploadIcon;}
  const title=make('strong');title.textContent=action.name;el.append(visual,title);
  if(action.type==='mode')el.onclick=()=>{selectNative(action.mode);closeMenu();};
  else if(action.type==='upload')el.onclick=()=>{
   closeMenu();
   // The Studio backend accepts reference PHOTOS only (not raw MP4/MP3 uploads).
   // Reuse the actual protected native Studio reference file picker.
   if(references.disabled||!references.isConnected){return;}
   if(!references.closest('#referenceBox')?.hidden)references.click();
   else{
    const note=$('status');if(note)note.textContent='This selected model does not support reference uploads. Choose an image or image-guided model.';
   }
  };
  menu.append(el);
 }
 plus.onclick=()=>{menu.hidden=!menu.hidden;plus.setAttribute('aria-expanded',String(!menu.hidden));};
 // Open the SAME existing native Studio Settings Hub, no intermediate tiles.
 gear.classList.add('j-settings-shortcut');
 gear.setAttribute('aria-controls','studioSettingsHub');
 gear.setAttribute('aria-label','Studio settings');
 gear.onclick=()=>{closeMenu();openRealStudioSettings?.call(gear);};
 prompt.setAttribute('form','creator');
 prompt.setAttribute('rows','1');
 prompt.placeholder='Describe your image, video, or audio…';
 mic.classList.add('j-studio-mic');
 submit.setAttribute('form','creator');submit.classList.add('j-send');
 submit.setAttribute('aria-label','Create with selected Studio model and approved quote');
 submit.title='Create with selected Studio model (review credits and confirm)';
 submit.replaceChildren();
 const plane=document.createElementNS('http://www.w3.org/2000/svg','svg');
 plane.setAttribute('class','j-send-plane');plane.setAttribute('viewBox','0 0 24 24');plane.setAttribute('width','26');plane.setAttribute('height','26');
 plane.setAttribute('fill','none');plane.setAttribute('stroke','currentColor');plane.setAttribute('stroke-width','1.8');
 plane.setAttribute('stroke-linecap','round');plane.setAttribute('stroke-linejoin','round');
 plane.setAttribute('aria-hidden','true');
 plane.innerHTML='<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>';
 submit.append(plane);
 bar.append(plus,menu,prompt,mic,gear,submit);
 dock.append(bar,rail);
 document.body.append(dock);
 document.body.classList.add('studio-universal-ready');
 const syncMode=()=>{
  const current=nav.querySelector('[data-kind][aria-pressed="true"]')?.dataset.kind;
  const mode=current==='music'?'audio':current;
  if(!['image','video','audio'].includes(mode))return;
  for(const btn of menu.querySelectorAll('[data-j-mode]'))btn.setAttribute('aria-pressed',String(btn.dataset.jMode===mode));
  form.dispatchEvent(new CustomEvent('jarvix:mode',{detail:{mode},bubbles:true}));
 };
 const observer=new MutationObserver(syncMode);
 observer.observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 // Studio's controller loads asynchronously, so also observe the data-studio
 // readout through its native mutation flow; never write its model or config.
 syncMode();
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
 document.addEventListener('pointerdown',event=>{
  if(!dock.contains(event.target))closeMenu();
  else if(!menu.hidden&&!menu.contains(event.target)&&event.target!==plus)closeMenu();
 });
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
