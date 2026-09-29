// Coordinates local work with Android's foreground service. Media never leaves
// this device. Browsers may suspend workers; completed outputs live in IndexedDB.
(()=>{
  const sessions=new Set();let wake=null,native=false;
  const ru=(navigator.language||'').startsWith('ru');
  const note=()=>native
    ?(ru?'Обработка продолжится при сворачивании. Не закрывайте приложение принудительно.':'Processing continues when minimized. Do not force-close the app.')
    :(ru?'Оставьте эту вкладку открытой. Готовые варианты сохраняются в истории по одному.':'Keep this tab open. Each completed variation is saved to History.');
  async function keepAwake(){
    if(!sessions.size||document.visibilityState!=='visible'||wake)return;
    try{wake=await navigator.wakeLock?.request('screen');wake?.addEventListener('release',()=>{wake=null;});if(!sessions.size){await wake?.release();wake=null;}}catch(_){}
  }
  function begin(){
    const id=Symbol('processing');sessions.add(id);
    if(sessions.size===1){
      try{native=window.AndroidBridge?.beginProcessing?.()===true;}catch(_){native=false;}
      keepAwake();
      let hint=document.getElementById('backgroundProcessingHint');
      if(!hint){hint=document.createElement('p');hint.id='backgroundProcessingHint';hint.className='muted';document.getElementById('progressCard')?.append(hint);}
      hint.textContent=note();
    }
    return id;
  }
  function end(id){
    sessions.delete(id);if(sessions.size)return;
    try{window.AndroidBridge?.endProcessing?.();}catch(_){}
    wake?.release().catch(()=>{});wake=null;native=false;
  }
  document.addEventListener('visibilitychange',keepAwake);
  window.addEventListener('beforeunload',e=>{if(sessions.size){e.preventDefault();e.returnValue='';}});
  // Switching a dashboard view is safe, replacing the document kills its worker.
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a[href]');if(!sessions.size||!a||a.download||a.target==='_blank')return;
    const url=new URL(a.href,location.href);
    if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return;
    e.preventDefault();e.stopImmediatePropagation();window.VideoVariatorUI?.toast(note());
  },true);
  window.addEventListener('vu-native-processing-stop',()=>window.VideoVariatorCore?.cancel());
  window.VUProcessingSession={begin,end,get active(){return sessions.size>0;}};
})();
