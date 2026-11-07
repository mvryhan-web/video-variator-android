// Home-only bridge to the EXISTING Studio settings. Never duplicate model,
// provider, quote or pricing logic: the real Studio selectors run in a same-
// origin frame and keep their native change/draft handling.
let current=null;

export function openHomeStudioSettings({gear,mode='image'}={}){
 if(!gear?.isConnected)return;
 const selected=['image','video','audio'].includes(mode)?mode:'image';
 if(current){
  const toggleOff=current.gear===gear&&current.mode===selected;
  current.close();
  if(toggleOff)return;
 }

 const host=document.createElement('section');
 host.id='homeStudioSettingsHost';
 host.setAttribute('role','group');
 host.setAttribute('aria-label','Studio settings');
 host.style.cssText='position:fixed;z-index:10010;isolation:isolate;padding:0;margin:0;border:0;background:transparent;box-shadow:none;';
 const frame=document.createElement('iframe');
 frame.id='homeStudioSettingsFrame';
 frame.title='Studio settings — existing model and format controls';
 frame.style.cssText='display:block;width:100%;height:100%;border:0;background:transparent;overflow:hidden;';
 // The same Studio route and saved draft settings as the full Studio.
 const url=new URL('generate-studio.html',location.href);
 url.searchParams.set('studio',selected);
 url.searchParams.set('settings','1');
 frame.src=url.href;
 host.append(frame);

 let closed=false;
 const position=()=>{
  if(closed||!gear.isConnected)return;
  const r=gear.getBoundingClientRect();
  const w=Math.max(240,Math.min(420,innerWidth-24));
  const h=Math.max(200,Math.min(570,r.top-20));
  const left=Math.max(12,Math.min(innerWidth-w-12,r.right-w+42));
  const top=Math.max(12,r.top-h-10);
  Object.assign(host.style,{width:w+'px',height:h+'px',left:left+'px',top:top+'px'});
 };
 const onOutside=event=>{
  if(gear.contains(event.target)||host.contains(event.target))return;
  close();
 };
 const onEscape=event=>{if(event.key==='Escape')close();};
 const close=()=>{
  if(closed)return;
  closed=true;
  host.remove();
  gear.removeAttribute('aria-controls');
  gear.setAttribute('aria-expanded','false');
  document.removeEventListener('pointerdown',onOutside,true);
  document.removeEventListener('keydown',onEscape);
  window.removeEventListener('resize',position);
  if(current?.close===close)current=null;
 };

 frame.addEventListener('load',()=>{
  if(closed)return;
  let doc;
  try{
   if(frame.contentWindow.location.origin!==location.origin||
      !frame.contentWindow.location.pathname.endsWith('/generate-studio.html'))return close();
   doc=frame.contentDocument;
  }catch{return close();}
  const hub=doc?.getElementById('studioSettingsHub');
  if(!hub)return close();
  // Native model and format child dialogs originally sit inside Studio main.
  // Place them alongside the native parent dialog in THIS isolated frame so
  // the non-settings page can be hidden without hiding a child dialog.
  for(const id of ['modelDialog','settingsDialog']){
   const child=doc.getElementById(id);
   if(child&&child.parentElement!==doc.body)doc.body.append(child);
  }
  const style=doc.createElement('style');
  style.id='homeNativeStudioSettingsPresentation';
  style.textContent=`
   html,body{background:transparent!important;overflow:hidden!important;}
   body>:not(dialog):not(script):not(style){visibility:hidden!important;pointer-events:none!important;}
   body>#studioSettingsHub,body>#studioTypeMenu,body>#modelDialog,body>#settingsDialog{
    visibility:visible!important;pointer-events:auto!important;
   }
   #studioSettingsHub.composer-popover{
    position:fixed!important;inset:auto!important;
    bottom:8px!important;right:auto!important;
    box-sizing:border-box!important;width:calc(100% - 16px)!important;
    max-width:calc(100% - 16px)!important;
    max-height:calc(100dvh - 16px)!important;
    overflow:auto!important;overscroll-behavior:contain!important;
    padding:16px!important;border:1px solid #7967c8!important;
    border-radius:21px!important;background:#0a1831!important;
    color:#eff6ff!important;box-shadow:0 12px 36px #000b!important;
   }
   #studioSettingsHub>h2{display:inline-block;margin:0 0 9px!important;
    font-size:20px!important;line-height:1.5!important;font-weight:700!important;}
   #studioSettingsHub>button:nth-child(2){
    float:right;min-width:38px!important;width:38px!important;height:44px!important;
    border:1px solid #6e659f!important;border-radius:13px!important;
    background:#101b35!important;color:#fff!important;font-size:27px!important;
   }
   #studioSettingsHub>:is(#studioTypePicker,#modelButton,#settingsButton){
    box-sizing:border-box!important;display:flex!important;
    width:100%!important;min-width:0!important;min-height:57px!important;
    align-items:center!important;justify-content:flex-start!important;
    margin:11px 0 0!important;padding:11px 14px!important;
    border:1px solid #376d9c!important;border-radius:17px!important;
    background:#0e2848!important;box-shadow:inset 0 0 12px #16488266!important;
    color:#e9f4ff!important;font-size:14px!important;text-align:left!important;
   }
   #studioSettingsHub>:is(#studioTypePicker,#modelButton,#settingsButton) .composer-chevron{margin-left:auto!important;}
   #studioSettingsHub.composer-popover::backdrop{background:transparent!important;}
  `;
  doc.head.append(style);
  // The native Studio script already opens this real hub for ?settings=1.
  if(!hub.open)hub.showModal();
  const pin=()=>{
   if(closed||!hub.isConnected)return;
   hub.style.setProperty('left','8px','important');
   hub.style.setProperty('top','auto','important');
   hub.style.setProperty('bottom','8px','important');
   hub.style.setProperty('right','auto','important');
   hub.style.setProperty('max-height','calc(100dvh - 16px)','important');
  };
  pin();
  frame.contentWindow.requestAnimationFrame(pin);
  hub.addEventListener('close',close,{once:true});
  // Ensure the host closes even if the native dialog close event is delayed
  // in mobile WebKit/Chromium iframe top layers.
  hub.querySelector(':scope > button:nth-child(2)')?.addEventListener('click',()=>queueMicrotask(close),{once:true});
 });
 document.body.append(host);
 position();
 gear.setAttribute('aria-expanded','true');
 gear.setAttribute('aria-controls',host.id);
 document.addEventListener('pointerdown',onOutside,true);
 document.addEventListener('keydown',onEscape);
 window.addEventListener('resize',position);
 current={gear,mode:selected,close};
 return close;
}
