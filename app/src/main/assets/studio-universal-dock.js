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
 const dock=make('section','j-neon-dock');dock.id='studioUniversalDock';
 dock.setAttribute('aria-label','JARVIX Universal Hub and Studio composer');
 const bar=make('div','jarvix-compose j-neon-composer');bar.id='studioDockControls';
 const plus=make('button','j-glow-plus');plus.id='jPlus';plus.type='button';
 plus.textContent='+';plus.setAttribute('aria-controls','jPlusMenu');plus.setAttribute('aria-expanded','false');
 plus.setAttribute('aria-label','Open Universal Hub');
 const menu=make('div','j-plus-menu j-hub-menu');menu.id='jPlusMenu';menu.hidden=true;
 menu.setAttribute('aria-label','DEEPSYQ quick access');
 const modes=[['image','Image'],['video','Video'],['audio','Audio']];
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
 const settings=make('div','j-settings-menu');settings.id='jSettingsMenu';settings.hidden=true;
 settings.setAttribute('aria-label','Studio settings');
 const closeSettings=()=>{settings.hidden=true;gear.setAttribute('aria-expanded','false');};
 const openRealStudioSettings=gear.onclick; // Real protected Studio Settings Hub handler.
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
 for(const [mode,label] of modes){
  const tile=make('button','j-settings-tile');tile.type='button';
  tile.dataset.jMode=mode;
  const svg=createCanonicalIcon(mode);if(svg)tile.append(svg);
  tile.append(document.createTextNode(label));
  tile.onclick=()=>{
   if(selectNative(mode)){closeSettings();openRealStudioSettings?.call(gear);}
  };
  settings.append(tile);
 }
 plus.onclick=()=>{menu.hidden=!menu.hidden;plus.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)closeSettings();};
 // Same small 3-card Settings selector as Home/Chat, but selection stays on
 // this Studio and invokes its original protected model/settings hub locally.
 gear.classList.add('j-settings-shortcut');
 gear.setAttribute('aria-controls','jSettingsMenu');gear.setAttribute('aria-expanded','false');
 gear.setAttribute('aria-label','Studio settings');
 gear.onclick=()=>{settings.hidden=!settings.hidden;gear.setAttribute('aria-expanded',String(!settings.hidden));if(!settings.hidden)closeMenu();};
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
 bar.append(plus,menu,prompt,mic,gear,settings,submit);
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
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();closeSettings();}});
 document.addEventListener('pointerdown',event=>{
  if(!dock.contains(event.target)){closeMenu();closeSettings();}
  else if(!menu.hidden&&!menu.contains(event.target)&&event.target!==plus)closeMenu();
 });
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
