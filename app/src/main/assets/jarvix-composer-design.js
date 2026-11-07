import {createCanonicalIcon} from './deepsyq-canonical-nav-icons.js';
// Shared presentation only: existing submission and permission handlers stay in charge.
export function decorateComposer(form,{settingsTarget=null}={}){
 if(!form||form.dataset.neonComposer)return;
 form.dataset.neonComposer='ready';form.classList.add('j-neon-composer');
 const viewport=()=>{const v=window.visualViewport;document.documentElement.style.setProperty('--j-keyboard-inset',Math.max(0,innerHeight-(v?.height||innerHeight)-(v?.offsetTop||0))+'px');};window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();
 const ru=(localStorage.getItem('deepsyq_home_language')||document.documentElement.lang).startsWith('ru');
 const make=(tag,label)=>{const el=document.createElement(tag);el.textContent=label;return el;};
 const isQuickChat=['homeQuickForm','jChatForm','creator'].includes(form.id);
 const rail=make('nav','');rail.className='j-mode-rail';rail.setAttribute('aria-label',ru?'Режимы и инструменты':'Creation modes and tools');
 const navItems=isQuickChat?[['JARVIX','jarvix-chat.html',null],['Video Uniquifier','index.html','legacy']]:
 [['JARVIX','jarvix-chat.html',null],['Image','generate-studio.html?studio=image','image'],['Video','generate-studio.html?studio=video','video'],['Audio','generate-studio.html?studio=audio','audio'],['Tools','free-tools.html','tools'],['Video Uniquifier','index.html','legacy']];
 let activeMode=null;
 for(const [label,href,iconKey] of navItems){
  const a=make('a',label);a.href=href;
  if(iconKey){const art=make('span','');art.className='j-rail-icon';art.setAttribute('aria-hidden','true');art.append(createCanonicalIcon(iconKey));a.prepend(art);}
  else a.prepend(document.createTextNode('◉ ')); // Stage07 replaces this with approved JARVIX sphere.
  const u=new URL(href,location.href);
  if(u.pathname===location.pathname&&u.search===location.search)a.setAttribute('aria-current','page');
  if(form.id==='creator'&&['Image','Video','Audio'].includes(label))a.onclick=e=>{
   const kind=label==='Audio'?'music':label.toLowerCase();
   const button=document.querySelector('[data-kind="'+kind+'"]');
   if(button){e.preventDefault();button.click();for(const link of rail.querySelectorAll('a'))link.removeAttribute('aria-current');a.setAttribute('aria-current','page');}
  };
  if(label==='JARVIX'&&isQuickChat)a.addEventListener('click',()=>{try{sessionStorage.setItem('jarvix_composer_mode','auto');}catch{}});
  rail.append(a);
  if(label==='JARVIX'&&isQuickChat){
   activeMode=make('span','');activeMode.className='j-active-mode';activeMode.hidden=true;activeMode.setAttribute('role','status');activeMode.setAttribute('aria-live','polite');rail.append(activeMode);
  }
 }
 if(activeMode)form.addEventListener('jarvix:mode',event=>{
  const selected=event.detail?.mode;
  activeMode.replaceChildren();
  activeMode.hidden=!['image','video','audio'].includes(selected);
  if(!activeMode.hidden){
   const icon=createCanonicalIcon(selected);if(icon)activeMode.append(icon);
   activeMode.append(document.createTextNode(selected.charAt(0).toUpperCase()+selected.slice(1)));
   activeMode.dataset.mode=selected;
  }else delete activeMode.dataset.mode;
 });
 const dock=form.closest('#homeQuickBar,.j-chat-bottom')||form;
 dock.classList.add('j-neon-dock');dock.append(rail);
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
 if(settingsTarget){
  const gear=make('button','');gear.type='button';gear.className='j-settings-shortcut';gear.setAttribute('aria-label',ru?'Настройки студии':'Studio settings');gear.setAttribute('aria-haspopup','dialog');
  gear.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><path d="M9 3v6M15 9v6M8 15v6"/></svg>';
  // Owner restores the previous Home gear destination only; Chat and Studio retain their menus.
  if(isQuickChat&&form.id!=='homeQuickForm'){
   const panel=make('div','');panel.className='j-settings-menu';panel.id='jSettingsMenu';panel.hidden=true;
   panel.setAttribute('aria-label',ru?'Настройки творческой студии':'Creative Studio settings');
   for(const [kind,label] of [['image','Image'],['video','Video'],['audio','Audio']]){
    const choice=make('button','');choice.type='button';choice.className='j-settings-tile';
    choice.dataset.jMode=kind;
    const icon=createCanonicalIcon(kind);if(icon)choice.append(icon);
    choice.append(document.createTextNode(label));panel.append(choice);
    // Choosing a mode is local to this chat. Never redirect to another Studio page.
    choice.onclick=()=>{form.querySelector('#jPlusMenu [data-j-mode="'+kind+'"]')?.click();close();};
   }
   form.append(panel);gear.setAttribute('aria-haspopup','true');gear.setAttribute('aria-controls',panel.id);
   gear.setAttribute('aria-expanded','false');
   const close=()=>{panel.hidden=true;gear.setAttribute('aria-expanded','false');};
   gear.onclick=()=>{panel.hidden=!panel.hidden;gear.setAttribute('aria-expanded',String(!panel.hidden));
    const plusMenu=form.querySelector('#jPlusMenu');if(plusMenu&&!panel.hidden){plusMenu.hidden=true;form.querySelector('#jPlus')?.setAttribute('aria-expanded','false');}};
   document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&e.target!==gear)close();});
   document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  }else gear.onclick=settingsTarget;
  mic?.after(gear);
 }
 const plus=form.querySelector('#jPlus');if(plus)plus.classList.add('j-glow-plus');
}
