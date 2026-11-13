import {bindVoiceInput} from './jarvix-voice-input.js?v=dictation-2';
import {decorateComposer} from './jarvix-composer-design.js';
import {openHomeStudioSettings} from './home-studio-settings.js';
import {validateAttachments} from './jarvix-conversations.js';

function formatSize(bytes){
 if(!bytes)return '';
 if(bytes<1024*1024)return Math.round(bytes/1024)+' KB';
 return (bytes/(1024*1024)).toFixed(1)+' MB';
}

function detectModeFromFiles(list){
 for(const f of list||[]){
  const type = String(f.type || '').toLowerCase();
  const ext = String(f.name || '').toLowerCase();
  if(type.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif|svg)$/i.test(ext))return 'image';
  if(type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(ext))return 'video';
  if(type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(ext))return 'audio';
 }
 return null;
}

export function bindComposer({form,input,onSend,onError,onMode=()=>{}}){
 decorateComposer(form,{settingsTarget:()=>{const selected=['image','video','audio'].includes(mode)?mode:'image';
  openHomeStudioSettings({gear:form.querySelector('.j-settings-shortcut'),mode:selected});}});
 if(innerWidth<361)input.placeholder='Message…';
 let mode='auto',files=[];
 try{const requested=(new URLSearchParams(location.search).get('mode')||new URLSearchParams(location.search).get('studio')||'').toLowerCase();const requestedMode=requested==='music'?'audio':requested;if(['image','video','audio'].includes(requestedMode)){mode=requestedMode;sessionStorage.setItem('jarvix_composer_mode',mode);}else{mode='auto';sessionStorage.removeItem('jarvix_composer_mode');}}catch{}
 const reportMode=()=>{
  form.dataset.mode=mode;
  if(plus)plus.dataset.mode=mode;
  const modeLabel=document.getElementById('jActiveModeLabel');
  if(modeLabel){
    modeLabel.dataset.mode=mode;
    modeLabel.textContent=({image:'Image',video:'Video',audio:'Audio',auto:'Chat'}[mode]||mode);
  }
  form.dispatchEvent(new CustomEvent('jarvix:mode',{detail:{mode},bubbles:true}));
 };
 const plus=form.querySelector('#jPlus')||document.getElementById('jPlus');
 const menu=form.querySelector('#jPlusMenu')||document.getElementById('jPlusMenu');
 const fileInput=form.querySelector('#jFiles')||document.getElementById('jFiles');
 const attachments=form.querySelector('#jAttachments')||document.getElementById('jAttachments');
 const mic=form.querySelector('#jMic')||document.getElementById('jMic');
 const attachBtn=form.querySelector('#jAttach')||document.getElementById('jAttach');

 function render(){
  if(!attachments)return;
  attachments.replaceChildren();
  if(!files.length){
   attachments.hidden=true;
   return;
  }
  attachments.hidden=false;
  files.forEach((f,i)=>{
   const card=document.createElement('div');
   card.className='j-attachment-card';

   const thumbBox=document.createElement('div');
   thumbBox.className='j-attachment-thumb-box';

   const type=String(f.type||'').toLowerCase();
   const ext=String(f.name||'').toLowerCase();
   const isImg=type.startsWith('image/')||/\.(png|jpe?g|webp|gif|heic|heif|svg)$/i.test(ext);
   const isVid=type.startsWith('video/')||/\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(ext);
   const isAud=type.startsWith('audio/')||/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(ext);

   if(isImg){
    const img=document.createElement('img');
    img.className='j-attachment-thumb';
    img.alt=f.name||'Image';
    try{img.src=URL.createObjectURL(f);}catch{}
    thumbBox.append(img);
   }else if(isVid){
    const vid=document.createElement('video');
    vid.className='j-attachment-thumb';
    vid.muted=true;
    vid.playsInline=true;
    vid.preload='metadata';
    try{vid.src=URL.createObjectURL(f);}catch{}
    thumbBox.append(vid);
   }else if(isAud){
    thumbBox.innerHTML='<span class="j-attachment-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>';
   }else{
    thumbBox.innerHTML='<span class="j-attachment-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>';
   }

   const meta=document.createElement('div');
   meta.className='j-attachment-meta';

   const name=document.createElement('span');
   name.className='j-attachment-name';
   name.textContent=f.name||'file';
   name.title=f.name||'';

   const sub=document.createElement('span');
   sub.className='j-attachment-sub';
   const typeLabel=isImg?'IMG':isVid?'VID':isAud?'AUD':'FILE';
   sub.textContent=typeLabel+(f.size?' · '+formatSize(f.size):'');

   meta.append(name,sub);

   const close=document.createElement('button');
   close.type='button';
   close.className='j-attachment-close';
   close.setAttribute('aria-label','Remove '+(f.name||'file'));
   close.textContent='×';
   close.onclick=(e)=>{
    e.preventDefault();
    e.stopPropagation();
    files.splice(i,1);
    if(fileInput&&!files.length)fileInput.value='';
    render();
   };

   card.append(thumbBox,meta,close);
   attachments.append(card);
  });
 }

 if(plus&&menu){
  plus.onclick=()=>{menu.hidden=!menu.hidden;plus.setAttribute('aria-expanded',String(!menu.hidden));};
 }
 if(menu){
  menu.querySelectorAll('[data-j-mode]').forEach(b=>b.onclick=(e)=>{
   const href=b.getAttribute('href');
   if(href){
    try{sessionStorage.setItem('jarvix_composer_mode',b.dataset.jMode||'image');}catch{}
    location.assign(href);
    return;
   }
   mode=b.dataset.jMode;onMode(mode);
   try{sessionStorage.setItem('jarvix_composer_mode',mode);}catch{}
   for(const item of menu.querySelectorAll('[data-j-mode]'))item.setAttribute('aria-pressed',String(item===b));
   if(plus){plus.textContent='+';plus.setAttribute('aria-expanded','false');}
   menu.hidden=true;reportMode();input.focus();
  });
  for(const item of menu.querySelectorAll('[data-j-mode]'))item.setAttribute('aria-pressed',String(item.dataset.jMode===mode));
 }
 window.addEventListener('jarvix:mode',e=>{
  if(e.detail?.mode&&e.detail.mode!==mode){
   mode=e.detail.mode;
   form.dataset.mode=mode;
   if(plus)plus.dataset.mode=mode;
   if(menu)for(const item of menu.querySelectorAll('[data-j-mode]'))item.setAttribute('aria-pressed',String(item.dataset.jMode===mode));
  }
 });
 reportMode();
 if(attachBtn&&fileInput)attachBtn.onclick=()=>fileInput.click();
 if(fileInput){
  fileInput.onchange=()=>{
   try{
    files=validateAttachments([...files,...fileInput.files]);
    const autoM=detectModeFromFiles(files);
    if(autoM&&autoM!==mode){
     mode=autoM;
     try{sessionStorage.setItem('jarvix_composer_mode',mode);}catch{}
     reportMode();
     onMode(mode);
    }
    render();
   }catch(e){onError(e.message);}
   fileInput.value='';
   if(menu){menu.hidden=true;if(plus)plus.setAttribute('aria-expanded','false');}
  };
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){menu.hidden=true;if(plus)plus.setAttribute('aria-expanded','false');}});
 document.addEventListener('pointerdown',e=>{if(menu&&!form.contains(e.target)){menu.hidden=true;if(plus)plus.setAttribute('aria-expanded','false');}});
 form.addEventListener('paste',e=>{
  const items=e.clipboardData?.items;if(!items)return;
  const pasted=[];
  for(let i=0;i<items.length;i++){if(items[i].kind==='file'){const f=items[i].getAsFile();if(f)pasted.push(f);}}
  if(pasted.length){
   try{
    files=validateAttachments([...files,...pasted]);
    const autoM=detectModeFromFiles(files);
    if(autoM&&autoM!==mode){
     mode=autoM;
     try{sessionStorage.setItem('jarvix_composer_mode',mode);}catch{}
     reportMode();
     onMode(mode);
    }
    render();
   }catch(err){onError(err.message);}
  }
 });
 form.addEventListener('dragover',e=>{e.preventDefault();});
 form.addEventListener('drop',e=>{
  e.preventDefault();
  const dt=e.dataTransfer?.files;
  if(dt?.length){
   try{
    files=validateAttachments([...files,...dt]);
    const autoM=detectModeFromFiles(files);
    if(autoM&&autoM!==mode){
     mode=autoM;
     try{sessionStorage.setItem('jarvix_composer_mode',mode);}catch{}
     reportMode();
     onMode(mode);
    }
    render();
   }catch(err){onError(err.message);}
  }
 });
 const voice=bindVoiceInput({mic,input,form,onError:message=>{mic.title=message;mic.setAttribute('aria-label',message);}});
 form.addEventListener('submit',async e=>{e.preventDefault();await voice.stop();if(!input.value.trim()&&!files.length)return;await onSend({text:input.value.trim(),mode,files:[...files]});});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
 input.addEventListener('input',()=>{
  if(!input.value.trim())input.style.height='';
  else{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px';}
 });
 return {
  clear(){input.value='';input.style.height='';files=[];render();},
  add(file){
   files=validateAttachments([...files,file]);
   const autoM=detectModeFromFiles(files);
   if(autoM&&autoM!==mode){
    mode=autoM;
    try{sessionStorage.setItem('jarvix_composer_mode',mode);}catch{}
    reportMode();
    onMode(mode);
   }
   render();
  },
  stop(){void voice.abort();}
 };
}
export function trackViewport(root){
 const update=()=>{const v=window.visualViewport;document.documentElement.style.setProperty('--j-viewport',(v?.height||innerHeight)+'px');if(root)document.documentElement.style.setProperty('--jarvix-compose-height',root.getBoundingClientRect().height+'px');};
 window.visualViewport?.addEventListener('resize',update);window.addEventListener('resize',update);if(root)new ResizeObserver(update).observe(root);update();
}
