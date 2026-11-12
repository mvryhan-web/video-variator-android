// JARVIX tour-only, read-only choreography adapter. No site modules or payment paths.
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function visible(el){return !!el&&el.isConnected&&!el.hidden&&el.getClientRects().length>0;}
export function installTourFocus(){
 if(document.getElementById('jarvixTourFocusStyle'))return;
 const st=document.createElement('style');st.id='jarvixTourFocusStyle';
 st.textContent=`@keyframes jarvixTourPulse{0%,100%{box-shadow:0 0 0 3px #ffb34766,0 0 12px #f5a74255}50%{box-shadow:0 0 0 6px #ffb347bb,0 0 24px #f5a742aa}}.ds-tour-focus-pulse{position:relative;z-index:11;outline:3px solid #ffc66e!important;outline-offset:5px;animation:jarvixTourPulse 1.3s ease-in-out infinite!important}@media(prefers-reduced-motion:reduce){.ds-tour-focus-pulse{animation:none!important}}`;
 document.head.append(st);
}
export async function showTourElement(selector,alive,ms=1300){
 if(!alive())return null;
 const el=typeof selector==='string'?[...document.querySelectorAll(selector)].find(visible):selector;
 if(!visible(el))return null;
 installTourFocus();
 for(const n of document.querySelectorAll('.ds-tour-focus-pulse'))n.classList.remove('ds-tour-focus-pulse');
 el.classList.add('ds-tour-focus-pulse');
 try{el.scrollIntoView({block:'nearest',behavior:'smooth'});}catch{}
 await sleep(Math.max(1000,ms));
 if(!alive())return null;
 return el;
}
export function endTourFocus(){
 document.querySelectorAll('.ds-tour-focus-pulse').forEach(el=>el.classList.remove('ds-tour-focus-pulse'));
}
function changeSelect(select,value){
 if(!visible(select)||select.disabled||![...select.options].some(o=>o.value===String(value)&&!o.disabled))return false;
 select.value=String(value);
 select.dispatchEvent(new Event('change',{bubbles:true}));
 return select.value===String(value);
}
async function tourSelectValues(id,values,alive){
 const el=document.getElementById(id);
 if(!visible(el)||el.disabled)return;
 const original=el.value;
 for(const value of values){
  if(!alive())break;
  await showTourElement(el,alive,1250);
  if(!alive())break;
  // Native choice, not a simulated Generate/checkout action. May be rejected
  // by existing subscription gates; do not override disabled controls.
  changeSelect(el,value);
  await sleep(1000);
 }
 if(alive()&&el.isConnected)changeSelect(el,original);
}
async function demoCanvas(index,alive){
 // Never replace an owner's unsaved edit, layers or uploaded photograph.
 const edited=document.getElementById('cwUndo');
 const selected=document.querySelector('#cwGallery [data-cw-photo][aria-pressed="true"]');
 const safe=!!edited&&edited.disabled&&!!selected&&!selected.dataset.cwPhoto?.startsWith('user-');
 if(index===0){
  if(safe){
   for(const id of ['demo-2','demo-4']){
    const img=document.querySelector('#cwGallery [data-cw-photo="'+id+'"]');
    if(!visible(img)||!alive())break;
    await showTourElement(img,alive,1400);
    if(!alive())break;
    img.click();await showTourElement('#cwStage',alive,1500);
   }
   // The prior photo selection is restored only when it was an unedited demo.
   if(alive()&&selected.isConnected)selected.click();
  }else await showTourElement('#cwStage',alive,1600);
 } else if(index===1){
  const inc=document.getElementById('cwZoomIn'),dec=document.getElementById('cwZoomOut');
  const z=document.getElementById('cwZoom');
  const initial=z?.value;
  if(visible(inc)&&visible(dec)&&Number(initial)<200){
   await showTourElement(inc,alive,1300);
   if(alive()){inc.click();await showTourElement('#cwStage',alive,1500);}
   if(alive()&&z?.value!==initial)dec.click();
  }
  if(safe&&alive()){
   const adjust=document.querySelector('[data-cw-tab="adjust"]');
   if(visible(adjust)){await showTourElement(adjust,alive,1300);adjust.click();}
   const sat=document.getElementById('cwSaturation');
   if(visible(sat)&&!sat.disabled){
    const val=sat.value;
    await showTourElement(sat,alive,1200);
    if(alive()){sat.value='135';sat.dispatchEvent(new Event('input',{bubbles:true}));await sleep(1400);}
    if(alive()){sat.value=val;sat.dispatchEvent(new Event('input',{bubbles:true}));}
   }
  }
 }
}
// Use the ACTIVE controls rendered by video-uniquifier-reference.js.
// The legacy selects are hidden in .vu-preserved-controls. Never bypass a
// plan-locked/disabled choice, run processing, or leave changed settings.
async function tourChooseVisible(selector,alive){
 const el=[...document.querySelectorAll(selector)].find(node=>visible(node)&&!node.disabled);
 if(!el||!alive())return false;
 await showTourElement(el,alive,1300);
 if(!alive())return false;
 el.click();
 await sleep(1050);
 return alive();
}
async function tourRestoreSelect(id,initial,selector){
 const select=document.getElementById(id);
 if(!select||!select.isConnected||select.value===initial)return;
 const button=[...document.querySelectorAll(selector)].find(el=>visible(el)&&!el.disabled);
 if(button)button.click();
 else if(!select.disabled&&[...select.options].some(o=>o.value===initial&&!o.disabled)){
  select.value=initial;select.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
async function demoUniquifier(index,alive){
 if(index===0){
  const select=document.getElementById('vuVariantChoice');
  const initial=select?.value;
  if(!visible(select)||select.disabled)return;
  for(const value of ['1','5','10','15']){
   if(!alive())break;
   if(![...select.options].some(o=>o.value===value&&!o.disabled))continue;
   await showTourElement(select,alive,1350);
   if(!alive())break;
   changeSelect(select,value);
   await sleep(1100);
  }
  if(alive()&&initial)changeSelect(select,initial);
 }
 if(index===1){
  const source=document.getElementById('mode'),initial=source?.value;
  for(const value of ['gentle','balanced','dynamic']){
   if(!alive())break;
   await tourChooseVisible('.vu-mode-card[data-mode="'+value+'"]',alive);
  }
  if(alive()&&initial)await tourRestoreSelect('mode',initial,'.vu-mode-card[data-mode="'+initial+'"]');
 }
 if(index===2){
  for(const [id,selector,values,attribute] of [
   ['aspectRatio','.vu-format-button',['9:16','16:9'],'ratio'],
   ['quality','.vu-quality-button',['720','1080','2160'],'quality']
  ]){
   const select=document.getElementById(id),initial=select?.value;
   for(const value of values){
    if(!alive())break;
    await tourChooseVisible(selector+'[data-'+attribute+'="'+value+'"]',alive);
   }
   if(alive()&&initial)await tourRestoreSelect(id,initial,selector+'[data-'+attribute+'="'+initial+'"]');
  }
 }
 if(index===3)await showTourElement('#startBtn',alive,1700);
}
async function demoTools(index,alive){
 const nodes=index===0?
  ['#etGallery .et-card:first-child','#mobileUtilityGrid [data-utility="scan-pdf"]','#mobileUtilityGrid [data-utility="photo-resize"]']:
  ['#etGallery .et-card:nth-child(2)','#mobileUtilityGrid [data-utility="qr"]','#mobileUtilityGrid [data-utility="pdf-merge"]'];
 for(const s of nodes){if(!alive())return;await showTourElement(s,alive,1100);}
}
async function demoInspiration(index,alive,options){
 if(index===0){
  const image=document.querySelector('#inspirationPreviewGrid .inspiration-preview-card[data-kind="image"]');
  if(visible(image)){await showTourElement(image,alive,1400);if(alive())image.click();}
  if(alive())await showTourElement('.inspiration-detail-prompt',alive,1450);
 } else {
  for(const sel of ['.inspiration-detail-copy','.inspiration-detail-clone']){
   if(!alive())return;
   await showTourElement(sel,alive,1500);
  }
  // The existing Clone & Try actually navigates to JARVIX Chat. Hand-off
  // is checkpointed by the caller before the genuine existing click.
  const clone=document.querySelector('.inspiration-detail-clone:not([disabled])');
  if(visible(clone)&&alive()&&options.beforeClone?.()){
   await sleep(350);
   if(alive())clone.click();
  }
 }
}
export async function performTourDemo(title,index,alive,options={}){
 if(!alive())return;
 if(title==='Video Uniquifier')await demoUniquifier(index,alive);
 else if(title==='Canvas')await demoCanvas(index,alive);
 else if(title==='Tools')await demoTools(index,alive);
 else if(title==='Inspiration')await demoInspiration(index,alive,options);
 else if(title==='AI Apps'&&index===0)await showTourElement('.app-card:first-child',alive,1450);
}
