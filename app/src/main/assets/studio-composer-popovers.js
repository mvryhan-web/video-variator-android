// Presentation adapter only: existing Studio buttons/selects remain authoritative.
// No provider requests, prices, capabilities or generation state are defined here.
document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id);
 const nav=document.querySelector('.studio-shell>.studio-nav');
 const controls=document.querySelector('.composer-controls');
 if(!nav||!controls||!$('modelDialog')||!$('settingsDialog'))return;
 const ru=navigator.language.toLowerCase().startsWith('ru');
 const text=(en,r)=>ru?r:en;
 const types={image:text('AI Image','Изображение'),video:text('AI Video','Видео'),music:text('Audio','Аудио')};
 const picker=document.createElement('button');
 picker.id='studioTypePicker';picker.type='button';picker.className='pill studio-type-picker';
 picker.setAttribute('aria-haspopup','dialog');picker.setAttribute('aria-controls','studioTypeMenu');picker.setAttribute('aria-expanded','false');
 const menu=document.createElement('dialog');menu.id='studioTypeMenu';menu.className='composer-popover studio-type-menu';menu.setAttribute('aria-label',text('Creation type','Тип создания'));
 // Move the real controls, retaining their existing click handlers and draft handling.
 for(const kind of ['image','video','music']){const button=nav.querySelector(`[data-kind="${kind}"]`);if(button)nav.append(button);}
 menu.append(nav);document.body.append(menu);controls.prepend(picker);
 document.body.classList.add('studio-single-rail');
 new MutationObserver(()=>{picker.disabled=$('modelButton').disabled;}).observe($('modelButton'),{attributes:true,attributeFilter:['disabled']});
 let activeAnchor=null,activePanel=null;
 function position(panel,anchor){
  if(!panel.open)return;
  const edge=12,gap=8,r=anchor.getBoundingClientRect();
  const above=Math.max(0,r.top-edge-gap),below=Math.max(0,innerHeight-r.bottom-edge-gap);
  const up=above>=below;
  panel.style.maxHeight=Math.max(100,Math.min(640,Math.max(above,below),innerHeight-edge*2))+'px';
  const p=panel.getBoundingClientRect();
  panel.style.setProperty('left',Math.max(edge,Math.min(r.left,innerWidth-p.width-edge))+'px','important');
  panel.style.setProperty('top',Math.max(edge,Math.min(up?r.top-p.height-gap:r.bottom+gap,innerHeight-p.height-edge))+'px','important');
 }
 function prepare(panel,anchor){
  panel.classList.add('composer-popover');activePanel=panel;activeAnchor=anchor;
  const kind=nav.querySelector('[aria-pressed="true"]')?.dataset.kind||'video';
  if(panel.id==='modelDialog')$('modelDialogTitle').textContent={image:text('Picture model','Модель изображения'),video:text('Video model','Модель видео'),music:text('Audio model','Модель аудио')}[kind];
  if(panel.id==='settingsDialog')$('settingsDialogTitle').textContent={image:text('Image settings','Настройки изображения'),video:text('Video settings','Настройки видео'),music:text('Audio settings','Настройки аудио')}[kind];
  anchor.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>{if(panel===$('modelDialog'))decorateModels();if(panel===$('settingsDialog'))syncSettings();position(panel,anchor);});
 }
 function openTypes(){prepare(menu,picker);if(!menu.open)menu.showModal();position(menu,picker);}
 picker.addEventListener('click',openTypes);
 function syncType(){
  const selected=nav.querySelector('[data-kind][aria-pressed="true"]');
  const kind=selected?.dataset.kind||'video';
  const history=$('showHistory').getAttribute('aria-pressed')==='true';
  for(const link of document.querySelectorAll('#dsSiteSidebar nav a[href^="generate-studio.html"]')){const url=new URL(link.href);const current=history?url.searchParams.get('view')==='history':url.searchParams.get('studio')===(kind==='music'?'audio':kind);if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  for(const button of nav.querySelectorAll('[data-kind]')){const label=button.querySelector('[data-t]');if(label&&types[button.dataset.kind])label.textContent=types[button.dataset.kind];}
  picker.replaceChildren();
  const icon=selected?.querySelector('.nav-icon')?.cloneNode(true);if(icon){icon.setAttribute('aria-hidden','true');picker.append(icon);}
  const label=document.createElement('span');label.textContent=types[kind]||text('Creation type','Тип создания');picker.append(label);
  const arrow=document.createElement('span');arrow.className='composer-chevron';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');picker.append(arrow);
 }
 nav.addEventListener('click',event=>{if(event.target.closest('[data-kind]')){syncType();menu.close();}});
 new MutationObserver(syncType).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-pressed','disabled']});new MutationObserver(syncType).observe($('showHistory'),{attributes:true,attributeFilter:['aria-pressed']});syncType();
 for(const [id,anchorId] of [['modelDialog','modelButton'],['settingsDialog','settingsButton']]){
  const panel=$(id),anchor=$(anchorId);
  anchor.addEventListener('click',()=>prepare(panel,anchor),{capture:true});
  // The Studio's original click handler calls showModal() and measures the
  // dialog in the same event. Run after that handler too: native dialog
  // layout can still report the temporary (0, 0) position during capture.
  anchor.addEventListener('click',()=>{
   const place=()=>requestAnimationFrame(()=>position(panel,anchor));
   setTimeout(place,0);
   requestAnimationFrame(()=>requestAnimationFrame(()=>position(panel,anchor)));
   setTimeout(()=>position(panel,anchor),80);
  });
 }
 for(const panel of [menu,$('modelDialog'),$('settingsDialog')]){
  panel.addEventListener('close',()=>{const anchor=panel===menu?picker:$(panel.id==='modelDialog'?'modelButton':'settingsButton');anchor?.setAttribute('aria-expanded','false');if(activePanel===panel){activePanel=null;activeAnchor=null;}});
  panel.addEventListener('click',event=>{if(event.target!==panel)return;const r=panel.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)panel.close();});
 }
 const reposition=()=>{if(activePanel?.open&&activeAnchor)position(activePanel,activeAnchor);};
 window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,{capture:true,passive:true});
 // A settings dialog can open before its first layout pass has a measurable
 // box. Reposition again after the native dialog's open attribute is applied,
 // so the first click is anchored just like later opens.
 const panelOpen=new MutationObserver(()=>requestAnimationFrame(reposition));
 for(const panel of [menu,$('modelDialog'),$('settingsDialog')])panelOpen.observe(panel,{attributes:true,attributeFilter:['open']});
 // Audio voice options and model-dependent controls can change panel height.
 // Re-anchor after those real content changes, including iOS WebKit.
 const panelResize=new ResizeObserver(()=>requestAnimationFrame(reposition));
 for(const panel of [menu,$('modelDialog'),$('settingsDialog')])panelResize.observe(panel);
 function decorateModels(){
  for(const card of $('modelChoices').querySelectorAll('.model-card')){
   if(card.querySelector('.model-provider-mark'))continue;
   const mark=document.createElement('span');mark.className='model-provider-mark';mark.setAttribute('aria-hidden','true');
   mark.textContent=(card.querySelector('.connection')?.textContent||'AI').trim().slice(0,1);card.prepend(mark);
  }
 }
 new MutationObserver(decorateModels).observe($('modelChoices'),{childList:true});
 // Use only the real options supplied by the current model/controller.
 function choiceButtons(select){
  const group=document.createElement('div');group.className='composer-setting-choices';group.setAttribute('role','group');group.setAttribute('aria-label',select.parentElement.querySelector('span')?.textContent||select.id);
  select.classList.add('composer-native-select');select.after(group);
  const sync=()=>{
   const options=[...select.options];group.replaceChildren();
   for(const option of options){const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.disabled=select.disabled||option.disabled;button.setAttribute('aria-pressed',String(option.value===select.value));button.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();reposition();});group.append(button);}
  };
  new MutationObserver(sync).observe(select,{subtree:true,childList:true,attributes:true});select.addEventListener('change',sync);sync();return sync;
 }
 const ratioTitle=document.createElement('div');ratioTitle.className='composer-setting-title';ratioTitle.textContent=text('Aspect ratio','Соотношение сторон');$('ratioChoices').before(ratioTitle);$('ratioChoices').setAttribute('role','group');$('ratioChoices').setAttribute('aria-label',ratioTitle.textContent);
 for(const id of ['videoResolutionLabel','videoDurationLabel'])$('videoInputModeLabel').before($(id));
 const settingsSync=['videoResolution','imageResolution'].map(id=>choiceButtons($(id)));
 const duration=$('videoDuration'),durationRow=document.createElement('div');durationRow.className='composer-duration';
 const range=document.createElement('input');range.type='range';range.step='1';range.min='0';range.setAttribute('aria-label',text('Video duration','Длительность видео'));
 const output=document.createElement('output');durationRow.append(range,output);duration.classList.add('composer-native-select');duration.after(durationRow);
 function syncDuration(){const options=[...duration.options];range.max=String(Math.max(0,options.length-1));range.value=String(Math.max(0,options.findIndex(o=>o.value===duration.value)));range.disabled=duration.disabled||options.length<2;output.value=options[Number(range.value)]?.textContent||'';}
 range.addEventListener('input',()=>{const option=duration.options[Number(range.value)];if(!option)return;duration.value=option.value;duration.dispatchEvent(new Event('change',{bubbles:true}));syncDuration();});
 new MutationObserver(syncDuration).observe(duration,{subtree:true,childList:true,attributes:true});duration.addEventListener('change',syncDuration);
 function syncSettings(){ratioTitle.hidden=$('ratioLabel').hidden||!$('ratio').options.length;$('ratioChoices').hidden=ratioTitle.hidden;settingsSync.forEach(sync=>sync());syncDuration();}
 const reset=document.createElement('button');reset.type='button';reset.className='composer-settings-reset';reset.textContent=text('↻ Reset','↻ Сбросить');
 reset.addEventListener('click',()=>{for(const id of ['ratio','imageResolution','videoResolution','videoDuration']){const select=$(id);if(select.disabled||select.closest('[hidden]'))continue;const option=[...select.options].find(o=>!o.disabled);if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));}}syncSettings();reposition();});
 $('settingsDialog').querySelector('.dialog-head').insertBefore(reset,$('settingsDialog').querySelector('[data-close]'));
});
