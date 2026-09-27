/* Delete only this application's stored result. Gallery/Downloads copies are user-owned. */
(()=>{'use strict';
 const lang=(navigator.language||'en').slice(0,2),copy={
 en:['Delete','Delete this result and its saved project from the app? Copies already in Gallery or Downloads will remain.','Could not remove the saved result. Please try again.'],
 ru:['Удалить','Удалить результат и его проект из приложения? Копии, уже сохранённые в Галерее или Загрузках, останутся.','Не удалось удалить сохранённый результат. Попробуйте ещё раз.'],
 fr:['Supprimer','Supprimer ce résultat et son projet de l’application ? Les copies dans Galerie ou Téléchargements restent conservées.','Impossible de supprimer le résultat. Réessayez.'],
 uk:['Видалити','Видалити результат і його проєкт із застосунку? Копії в Галереї чи Завантаженнях залишаться.','Не вдалося видалити результат. Спробуйте знову.']
 },c=copy[lang]||copy.en,read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]');}catch(_){return[];}};
 async function remove(item){
  if(!confirm(c[1]))return false;
  const token=localStorage.getItem('vv_token'),base=window.VV_API_BASE||location.origin;
  // Delete server metadata first: a failed request must not silently resurrect the item on refresh.
  if(token&&item.id){const r=await fetch(base+'/api/history/'+encodeURIComponent(item.id),{method:'DELETE',headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error(c[2]);}
  const jobs=read('vu_avatar_jobs_v2'),job=jobs.find(j=>j.id===item.id);
  const keys=[item.mediaCacheKey,job?.sourceKey,job?.photoKey,job?.voiceKey,job?.outputKey].filter(Boolean);
  for(const key of new Set(keys))if(window.VUPersistentMedia&&!await window.VUPersistentMedia.remove(key))throw Error(c[2]);
  localStorage.setItem('vv_history',JSON.stringify(read('vv_history').filter(x=>x.id!==item.id)));
  localStorage.setItem('vu_avatar_jobs_v2',JSON.stringify(jobs.filter(x=>x.id!==item.id)));
  window.__vuLastResults=(window.__vuLastResults||[]).filter(x=>x.id!==item.id);
  window.dispatchEvent(new CustomEvent('vu-result-deleted',{detail:{id:item.id}}));
  return true;
 }
 function button(item,onRemoved){const b=document.createElement('button');b.type='button';b.className='ghostBtn delete-result';b.textContent=c[0];b.onclick=async()=>{b.disabled=true;try{if(await remove(item))onRemoved?.();}catch(e){window.VideoVariatorUI?.toast?.(c[2]);if(!window.VideoVariatorUI)alert(c[2]);}finally{b.disabled=false;}};return b;}
 window.VUResultDelete={remove,button,label:c[0]};
})();
