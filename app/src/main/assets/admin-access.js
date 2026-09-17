(() => {
  'use strict';
  let lastToken='';
  let timer=null;

  function apiBase(){
    if(window.VV_API_BASE)return String(window.VV_API_BASE).replace(/\/$/,'');
    if(location.protocol==='https:'||location.protocol==='http:')return location.origin;
    return localStorage.getItem('vv_api_base')||'';
  }

  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
  function unlockAll(){
    const mode=document.getElementById('mode');
    if(mode){Array.from(mode.options).forEach(o=>o.disabled=false);}
    const quality=document.getElementById('quality');
    if(quality){Array.from(quality.options).forEach(o=>o.disabled=false);quality.value='2160';quality.disabled=true;}
    setText('usageLabel','Administrator access');
    setText('creditText','Unlimited');
    setText('remainingCount','∞');
    setText('remainingSub','unlimited credits');
    setText('currentPlan','Administrator');
    setText('planLabel','Administrator');
    setText('planStatus','Full premium access');
    setText('planAccessHint','Administrator: all modes · 4K · unlimited processing');
    setText('profilePlan','Administrator');
    setText('profileStatus','Full premium access');
    const bar=document.getElementById('creditBar');if(bar)bar.style.width='100%';
    const manage=document.getElementById('manageBillingBtn');if(manage)manage.disabled=true;
    const cancel=document.getElementById('cancelSubscriptionBtn');if(cancel)cancel.disabled=true;
  }

  async function refreshAdmin(){
    const token=localStorage.getItem('vv_token')||'';
    if(!token)return;
    const base=apiBase();if(!base)return;
    try{
      const r=await fetch(base+'/api/me',{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      if(data?.user?.isAdmin)unlockAll();
    }catch(_){ }
  }

  function watch(){
    const token=localStorage.getItem('vv_token')||'';
    if(token!==lastToken){lastToken=token;refreshAdmin();}
    if(token)refreshAdmin();
  }

  window.addEventListener('load',()=>{watch();timer=setInterval(watch,2500);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)watch();});
})();
