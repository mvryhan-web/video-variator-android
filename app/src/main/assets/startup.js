(() => {
  const root=document.documentElement;
  root.classList.add('vu-starting');
  let help;
  const ready=()=>{root.classList.remove('vu-starting');clearTimeout(fallback);help?.remove();};
  // A slow request must not reveal an older layout. Offer a reload while the
  // real page continues loading; DOMContentLoaded still reveals it normally.
  const fallback=setTimeout(()=>{
    const ru=(navigator.language||'').startsWith('ru');
    help=document.createElement('div');help.id='vu-startup-help';help.setAttribute('role','status');
    const text=document.createElement('p');text.textContent=ru?'Загрузка занимает больше времени. Проверьте соединение.':'Loading is taking longer. Please check your connection.';
    const retry=document.createElement('button');retry.textContent=ru?'Обновить':'Reload';retry.onclick=()=>location.reload();help.append(text,retry);(document.body||root).append(help);
  },6000);
  document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(ready),{once:true});
})();
