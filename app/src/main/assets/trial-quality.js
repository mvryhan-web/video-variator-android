(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let syncing=false;

  function isTrial(){
    const text=String($('currentPlan')?.textContent||'').trim().toLowerCase();
    return text==='free trial'||text==='trial';
  }

  function syncTrialAccess(){
    if(syncing)return;
    syncing=true;
    try{
      if(!isTrial())return;
      const quality=$('quality');
      if(quality){
        Array.from(quality.options).forEach(option=>{if(option.disabled)option.disabled=false;});
        if(quality.disabled)quality.disabled=false;
      }
      const mode=$('mode');
      if(mode){
        Array.from(mode.options).forEach(option=>{if(option.disabled)option.disabled=false;});
        if(mode.disabled)mode.disabled=false;
      }
      const hint=$('planAccessHint');
      if(hint)hint.textContent='Free trial: Gentle + Balance + Dynamic · 720p / 1080p / 4K';
    }finally{
      syncing=false;
    }
  }

  function install(){
    syncTrialAccess();
    const plan=$('currentPlan');
    const quality=$('quality');
    const mode=$('mode');
    if(plan)new MutationObserver(syncTrialAccess).observe(plan,{childList:true,characterData:true,subtree:true});
    if(quality)new MutationObserver(syncTrialAccess).observe(quality,{attributes:true,subtree:true,attributeFilter:['disabled']});
    if(mode)new MutationObserver(syncTrialAccess).observe(mode,{attributes:true,subtree:true,attributeFilter:['disabled']});
    document.addEventListener('change',event=>{
      if(event.target?.id==='quality'||event.target?.id==='mode')syncTrialAccess();
    },true);
    window.addEventListener('focus',syncTrialAccess);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
