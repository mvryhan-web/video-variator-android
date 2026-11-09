import {createCanonicalIcon} from './deepsyq-canonical-nav-icons.js';
// Shared presentation only: existing submission and permission handlers stay in charge.
export function decorateComposer(form,{settingsTarget=null}={}){
 if(!form||form.dataset.neonComposer)return;
 form.dataset.neonComposer='ready';form.classList.add('j-neon-composer');
 const viewport=()=>{const v=window.visualViewport;document.documentElement.style.setProperty('--j-keyboard-inset',Math.max(0,innerHeight-(v?.height||innerHeight)-(v?.offsetTop||0))+'px');};window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();
 const ru=(localStorage.getItem('deepsyq_home_language')||document.documentElement.lang).startsWith('ru');
 const make=(tag,label)=>{const el=document.createElement(tag);el.textContent=label;return el;};
 const isQuickChat=['homeQuickForm','jChatForm','creator'].includes(form.id);
 if(!isQuickChat){
  const rail=make('nav','');rail.className='j-mode-rail';rail.setAttribute('aria-label',ru?'Режимы и инструменты':'Creation modes and tools');
  const navItems=[['Image','generate-studio.html?studio=image','image'],['Video','generate-studio.html?studio=video','video'],['Audio','generate-studio.html?studio=audio','audio'],['Tools','free-tools.html','tools']];
  for(const [label,href,iconKey] of navItems){
   const a=make('a',label);a.href=href;
   if(iconKey){const art=make('span','');art.className='j-rail-icon';art.setAttribute('aria-hidden','true');art.append(createCanonicalIcon(iconKey));a.prepend(art);}
   const u=new URL(href,location.href);
   if(u.pathname===location.pathname&&u.search===location.search)a.setAttribute('aria-current','page');
   rail.append(a);
  }
  const dock=form.closest('#homeQuickBar,.j-chat-bottom')||form;
  dock.classList.add('j-neon-dock');dock.append(rail);
 } else {
  // Never add duplicate rail or duplicate JARVIX link under chat/home composer dock
  const dock=form.closest('#homeQuickBar,.j-chat-bottom')||form;
  dock.querySelectorAll('.j-mode-rail').forEach(el=>el.remove());
 }
 const mic=form.querySelector('#jMic,#studioVoiceBtn');
 if(isQuickChat)for(const glyph of form.querySelectorAll('#jPlusMenu [data-j-icon]')){
  const icon=createCanonicalIcon(glyph.dataset.jIcon);if(icon)glyph.replaceChildren(icon);
 }
 const attach=form.querySelector('#jAttach');
 if(attach&&!isQuickChat){
  const clip=make('button','');clip.type='button';clip.className='j-attach-shortcut';clip.setAttribute('aria-label',ru?'Прикрепить файл':'Attach file');
  clip.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m20 12-8.5 8.5a6 6 0 0 1-8.5-8.5L12 3a4 4 0 0 1 5.7 5.7L8.8 17.6a2 2 0 0 1-2.8-2.8L14 6.7"/></svg>';
  clip.onclick=()=>attach.click();mic?.before(clip);
 }
 const imageChoice=form.querySelector('#jPlusMenu [data-j-mode="image"]');
 if(imageChoice&&!isQuickChat&&!form.querySelector('.j-image-shortcut')){
  const imageShortcut=make('button','');imageShortcut.type='button';imageShortcut.className='j-image-shortcut';
  imageShortcut.setAttribute('aria-label',ru?'Режим изображения':'Image mode');
  imageShortcut.append(createCanonicalIcon('image'));imageShortcut.onclick=()=>imageChoice.click();
  const clip=form.querySelector('.j-attach-shortcut');if(clip)clip.before(imageShortcut);else mic?.before(imageShortcut);
 }
 const existingGear=form.querySelector('.j-settings-shortcut, #studioSettingsBtn');
 if(existingGear){
  existingGear.onclick=settingsTarget;
 } else if(settingsTarget){
  const gear=make('button','');gear.type='button';gear.id='studioSettingsBtn';gear.className='j-settings-shortcut';gear.setAttribute('aria-label',ru?'Настройки студии':'Studio settings');gear.setAttribute('aria-haspopup','dialog');
  gear.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M9 3v6M15 9v6M8 15v6"/></svg>';
  gear.setAttribute('aria-expanded','false');
  gear.onclick=settingsTarget;
  mic?.after(gear);
 }
 const plus=form.querySelector('#jPlus');if(plus)plus.classList.add('j-glow-plus');

 if(!form.querySelector('.j-composer-orb-btn')){
  const orbBtn=document.createElement('button');
  orbBtn.type='button';
  orbBtn.className='j-composer-orb-btn';
  orbBtn.setAttribute('aria-label','Activate JARVIS Live Voice');
  orbBtn.setAttribute('title','JARVIS Live Voice');
  orbBtn.innerHTML='<div class="jarvis-mini-orb"><span class="jarvis-core"></span><span class="jarvis-ring"></span><span class="jarvis-ring ring-violet"></span></div>';
  orbBtn.onclick=e=>{
   e.preventDefault();
   if(typeof window.toggleJarvisVoice==='function')window.toggleJarvisVoice();
   else import('./jarvis-core.js').then(m=>m.toggleJarvisVoice());
  };
  const sendBtn=form.querySelector('.j-send,#homeQuickSubmit,#generate');
  if(sendBtn)sendBtn.after(orbBtn);
  else form.append(orbBtn);
 }

}