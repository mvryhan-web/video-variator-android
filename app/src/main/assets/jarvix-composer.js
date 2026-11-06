import {decorateComposer} from './jarvix-composer-design.js';
import {validateAttachments} from './jarvix-conversations.js';
export function bindComposer({form,input,onSend,onError,onMode=()=>{}}){
 decorateComposer(form,{settingsTarget:()=>{location.assign('generate-studio.html?studio='+(['image','video','audio'].includes(mode)?mode:'image')+'&settings=1');}});
 if(innerWidth<361)input.placeholder='Message…';
 let mode='auto',files=[],recognition=null,base='';
 const plus=document.getElementById('jPlus'),menu=document.getElementById('jPlusMenu'),fileInput=document.getElementById('jFiles'),attachments=document.getElementById('jAttachments'),mic=document.getElementById('jMic');
 function render(){attachments.replaceChildren();files.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.textContent=f.name+' ×';b.setAttribute('aria-label','Remove '+f.name);b.onclick=()=>{files.splice(i,1);render();};attachments.append(b);});}
 plus.onclick=()=>{menu.hidden=!menu.hidden;plus.setAttribute('aria-expanded',String(!menu.hidden));};
 menu.querySelectorAll('[data-j-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.jMode;onMode(mode);for(const item of menu.querySelectorAll('[data-j-mode]'))item.setAttribute('aria-pressed',String(item===b));plus.textContent=mode==='auto'?'+':mode[0].toUpperCase();menu.hidden=true;plus.setAttribute('aria-expanded','false');input.focus();});
 document.getElementById('jAttach').onclick=()=>fileInput.click();fileInput.onchange=()=>{try{files=validateAttachments([...files,...fileInput.files]);render();}catch(e){onError(e.message);}fileInput.value='';menu.hidden=true;plus.setAttribute('aria-expanded','false');};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;plus.setAttribute('aria-expanded','false');}});
 document.addEventListener('pointerdown',e=>{if(!form.contains(e.target)){menu.hidden=true;plus.setAttribute('aria-expanded','false');}});
 mic.onclick=()=>{if(recognition){recognition.stop();return;}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){onError('Voice input is unavailable in this browser.');return;}const r=new SR();recognition=r;base=input.value;r.lang=({ru:'ru-RU',en:'en-US',fr:'fr-FR',es:'es-ES'})[document.documentElement.lang.slice(0,2)]||'en-US';r.interimResults=true;r.continuous=true;r.onresult=e=>{input.value=(base+' '+Array.from(e.results,x=>x[0].transcript).join(' ')).trim();};r.onend=()=>{recognition=null;mic.setAttribute('aria-pressed','false');};r.onerror=e=>onError('Microphone: '+e.error);mic.setAttribute('aria-pressed','true');r.start();};
 form.addEventListener('submit',async e=>{e.preventDefault();if(!input.value.trim())return;recognition?.stop();await onSend({text:input.value.trim(),mode,files:[...files]});});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
 return {clear(){input.value='';files=[];render();},add(file){files=validateAttachments([...files,file]);render();input.focus();},stop(){recognition?.abort();}};
}
export function trackViewport(root){
 const update=()=>{const v=window.visualViewport;document.documentElement.style.setProperty('--j-viewport',(v?.height||innerHeight)+'px');if(root)document.documentElement.style.setProperty('--jarvix-compose-height',root.getBoundingClientRect().height+'px');};
 window.visualViewport?.addEventListener('resize',update);window.addEventListener('resize',update);if(root)new ResizeObserver(update).observe(root);update();
}
