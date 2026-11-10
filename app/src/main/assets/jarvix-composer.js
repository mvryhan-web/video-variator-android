import {bindVoiceInput} from './jarvix-voice-input.js';
import {decorateComposer} from './jarvix-composer-design.js';
import {openHomeStudioSettings} from './home-studio-settings.js';
import {validateAttachments} from './jarvix-conversations.js';
export function bindComposer({form,input,onSend,onError,onMode=()=>{}}){
 decorateComposer(form,{settingsTarget:()=>{const selected=['image','video','audio'].includes(mode)?mode:'image';
  openHomeStudioSettings({gear:form.querySelector('.j-settings-shortcut'),mode:selected});}});
 if(innerWidth<361)input.placeholder='Message…';
 let mode='auto',files=[];
 try{const requested=(new URLSearchParams(location.search).get('mode')||new URLSearchParams(location.search).get('studio')||'').toLowerCase();const requestedMode=requested==='music'?'audio':requested;const saved=sessionStorage.getItem('jarvix_composer_mode');if(['image','video','audio'].includes(requestedMode)){mode=requestedMode;sessionStorage.setItem('jarvix_composer_mode',mode);}else if(['image','video','audio'].includes(saved)){mode=saved;}else mode='auto';}catch{}
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
 const plus=document.getElementById('jPlus'),menu=document.getElementById('jPlusMenu'),fileInput=document.getElementById('jFiles'),attachments=document.getElementById('jAttachments'),mic=document.getElementById('jMic');
 function render(){attachments.replaceChildren();files.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.textContent=f.name+' ×';b.setAttribute('aria-label','Remove '+f.name);b.onclick=()=>{files.splice(i,1);render();};attachments.append(b);});}
 plus.onclick=()=>{menu.hidden=!menu.hidden;plus.setAttribute('aria-expanded',String(!menu.hidden));};
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
  plus.textContent='+';menu.hidden=true;plus.setAttribute('aria-expanded','false');reportMode();input.focus();
 });
 for(const item of menu.querySelectorAll('[data-j-mode]'))item.setAttribute('aria-pressed',String(item.dataset.jMode===mode));
 reportMode();
 document.getElementById('jAttach').onclick=()=>fileInput.click();fileInput.onchange=()=>{try{files=validateAttachments([...files,...fileInput.files]);render();}catch(e){onError(e.message);}fileInput.value='';menu.hidden=true;plus.setAttribute('aria-expanded','false');};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;plus.setAttribute('aria-expanded','false');}});
 document.addEventListener('pointerdown',e=>{if(!form.contains(e.target)){menu.hidden=true;plus.setAttribute('aria-expanded','false');}});
 const voice=bindVoiceInput({mic,input,form,onError,onStatus:onError});
 form.addEventListener('submit',async e=>{e.preventDefault();await voice.stop();if(!input.value.trim())return;await onSend({text:input.value.trim(),mode,files:[...files]});});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
 input.addEventListener('input',()=>{
  if(!input.value.trim())input.style.height='';
  else{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px';}
 });
 return {clear(){input.value='';input.style.height='';files=[];render();},add(file){files=validateAttachments([...files,file]);render();},stop(){void voice.abort();}};
}
export function trackViewport(root){
 const update=()=>{const v=window.visualViewport;document.documentElement.style.setProperty('--j-viewport',(v?.height||innerHeight)+'px');if(root)document.documentElement.style.setProperty('--jarvix-compose-height',root.getBoundingClientRect().height+'px');};
 window.visualViewport?.addEventListener('resize',update);window.addEventListener('resize',update);if(root)new ResizeObserver(update).observe(root);update();
}
