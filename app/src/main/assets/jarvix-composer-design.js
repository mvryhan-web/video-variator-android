// Shared presentation only: existing submission and permission handlers stay in charge.
export function decorateComposer(form,{settingsTarget=null}={}){
 if(!form||form.dataset.neonComposer)return;
 form.dataset.neonComposer='ready';form.classList.add('j-neon-composer');
 const viewport=()=>{const v=window.visualViewport;document.documentElement.style.setProperty('--j-keyboard-inset',Math.max(0,innerHeight-(v?.height||innerHeight)-(v?.offsetTop||0))+'px');};window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);viewport();
 const ru=(localStorage.getItem('deepsyq_home_language')||document.documentElement.lang).startsWith('ru');
 const make=(tag,label)=>{const el=document.createElement(tag);el.textContent=label;return el;};
 const rail=make('nav','');rail.className='j-mode-rail';rail.setAttribute('aria-label',ru?'Режимы и инструменты':'Creation modes and tools');
 for(const [label,href,icon] of [['JARVIX','jarvix-chat.html','◉'],['Image','generate-studio.html?studio=image','▧'],['Video','generate-studio.html?studio=video','▷'],['Audio','generate-studio.html?studio=audio','♫'],['Tools','free-tools.html','▱'],['Video Uniquifier','index.html','▦']]){const a=make('a','');const glyph=make('span',icon);glyph.setAttribute('aria-hidden','true');a.append(glyph,make('span',label));a.href=href;const u=new URL(href,location.href);if(u.pathname===location.pathname&&u.search===location.search)a.setAttribute('aria-current','page');if(form.id==='creator'&&['Image','Video','Audio'].includes(label))a.onclick=e=>{const kind=label==='Audio'?'music':label.toLowerCase();const button=document.querySelector('[data-kind="'+kind+'"]');if(button){e.preventDefault();button.click();for(const link of rail.querySelectorAll('a'))link.removeAttribute('aria-current');a.setAttribute('aria-current','page');}};rail.append(a);}
 const dock=form.closest('#homeQuickBar,.j-chat-bottom')||form;
 dock.classList.add('j-neon-dock');dock.append(rail);
 const mic=form.querySelector('#jMic,#studioVoiceBtn');
 const attach=form.querySelector('#jAttach');
 if(attach){const clip=make('button','⌁');clip.innerHTML='<svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 13l7-7a3 3 0 014 4L9 20a5 5 0 01-7-7L13 2M5 15l9-9"/></svg>';clip.type='button';clip.className='j-attach-shortcut';clip.setAttribute('aria-label',ru?'Прикрепить файл':'Attach file');clip.onclick=()=>attach.click();mic?.before(clip);}
 if(settingsTarget){const gear=make('button','☷');gear.innerHTML='<svg width="21" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6"/></svg>';gear.type='button';gear.className='j-settings-shortcut';gear.setAttribute('aria-label',ru?'Настройки студии':'Studio settings');gear.setAttribute('aria-haspopup','dialog');gear.onclick=settingsTarget;mic?.after(gear);}
 const send=form.querySelector('#jSend,#homeQuickSubmit,#generate');
 if(send){send.classList.add('ds-plane-send');const paint=()=>{if(send.querySelector('svg'))return;send.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 14 28 4 19 28 14 18 4 14Z M14 18 28 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';};paint();new MutationObserver(paint).observe(send,{childList:true});}
 const plus=form.querySelector('#jPlus');if(plus)plus.classList.add('j-glow-plus');
}
