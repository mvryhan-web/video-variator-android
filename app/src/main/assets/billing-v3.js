(() => {
  const row=document.querySelector('#profileView .profileActionRow');
  if(!row||document.getElementById('cancelSubscriptionBtn'))return;
  const button=document.createElement('button');button.id='cancelSubscriptionBtn';button.className='ghostBtn danger';
  const lang=(navigator.language||'en').toLowerCase();button.textContent=lang.startsWith('fr')?'Annuler à la fin de la période':lang.startsWith('ru')?'Отменить в конце периода':lang.startsWith('uk')?'Скасувати наприкінці періоду':'Cancel at period end';
  row.appendChild(button);
  const base=()=>window.VV_API_BASE?String(window.VV_API_BASE).replace(/\/$/,''):(location.protocol==='https:'||location.protocol==='http:'?location.origin:(localStorage.getItem('vv_api_base')||''));
  button.addEventListener('click',async()=>{
    const token=localStorage.getItem('vv_token')||'';if(!token){window.VideoVariatorUI?.toast?.('Sign in first.');return;}
    const ok=confirm('Cancel your subscription at the end of the current paid period? You will keep access until then.');if(!ok)return;
    button.disabled=true;
    try{const r=await fetch(base()+'/api/billing/cancel',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:'{}'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Cancellation failed');window.VideoVariatorUI?.toast?.('Cancellation scheduled. Your access remains active until the end of the paid period.');window.VideoVariatorUI?.refreshAccount?.();}
    catch(e){window.VideoVariatorUI?.reportError?.(e,'subscription-cancel');window.VideoVariatorUI?.toast?.(e.message||'Cancellation failed');}
    finally{button.disabled=false;}
  });
})();
