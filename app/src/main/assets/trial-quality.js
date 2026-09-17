(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let syncing=false;

  function isTrial(){
    const text=String($('currentPlan')?.textContent||'').trim().toLowerCase();
    return text==='free trial'||text==='trial';
  }

  function syncTrialQuality(){
    if(syncing)return;
    syncing=true;
    try{
      const quality=$('quality');
      if(!quality||!isTrial())return;
      Array.from(quality.options).forEach(option=>{option.disabled=false;});
      quality.disabled=false;
      const hint=$('planAccessHint');
      if(hint)hint.textContent='Free trial: Gentle · 720p / 1080p / 4K';
    }finally{
      syncing=false;
    }
  }

  function install(){
    syncTrialQuality();
    const plan=$('currentPlan');
    const quality=$('quality');
    if(plan)new MutationObserver(syncTrialQuality).observe(plan,{childList:true,characterData:true,subtree:true});
    if(quality)new MutationObserver(syncTrialQuality).observe(quality,{attributes:true,attributeFilter:['disabled']});
    document.addEventListener('change',event=>{
      if(event.target?.id==='quality')syncTrialQuality();
    },true);
    window.addEventListener('focus',syncTrialQuality);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
