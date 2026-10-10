(() => {
  'use strict';
  const lang=(navigator.languages?.[0]||navigator.language||'en').slice(0,2);
  const labels={en:['Preview','WOW Montage result','Close','Download','Share','Could not complete this action. Please try again.'],ru:['Посмотреть','Результат WOW Montage','Закрыть','Скачать','Поделиться','Не удалось выполнить действие. Попробуйте ещё раз.'],fr:['Aperçu','Résultat WOW Montage','Fermer','Télécharger','Partager','Impossible de terminer cette action. Réessayez.'],uk:['Переглянути','Результат WOW Montage','Закрити','Завантажити','Поділитися','Не вдалося виконати дію. Спробуйте ще раз.']}[lang]||['Preview','WOW Montage result','Close','Download','Share','Could not complete this action. Please try again.'];
  let current=null;
  function close(){if(!current)return;const {dialog,video,url,opener}=current;current=null;video.pause();video.removeAttribute('src');video.load();dialog.remove();URL.revokeObjectURL(url);if(opener?.isConnected)opener.focus();}
  function open({name,blob,save,share}){
    close();if(!(blob instanceof Blob))return;
    const opener=document.activeElement,dialog=document.createElement('dialog');dialog.id='wowMontagePreview';dialog.setAttribute('aria-labelledby','wowPreviewTitle');
    const title=document.createElement('h2');title.id='wowPreviewTitle';title.textContent=labels[1];
    const filename=document.createElement('p');filename.textContent=name;
    const video=document.createElement('video');video.controls=true;video.playsInline=true;video.setAttribute('playsinline','');video.preload='metadata';video.setAttribute('aria-label',name);
    const actions=document.createElement('div');actions.className='wowPreviewActions';
    const status=document.createElement('p');status.setAttribute('role','status');
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='ghostBtn';dismiss.textContent=labels[2];dismiss.onclick=close;
    for(const [text,action] of [[labels[3],save],[labels[4],share]]){if(typeof action!=='function')continue;const button=document.createElement('button');button.type='button';button.className='ghostBtn';button.textContent=text;button.onclick=async()=>{button.disabled=true;status.textContent='';try{await action(name,blob);}catch(error){if(error?.name!=='AbortError')status.textContent=labels[5];}finally{button.disabled=false;}};actions.append(button);}
    actions.append(dismiss);dialog.append(title,filename,video,actions,status);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    const url=URL.createObjectURL(blob);current={dialog,video,url,opener};video.src=url;document.body.append(dialog);dialog.showModal();dismiss.focus();
  }
  window.addEventListener('pagehide',close);
  window.VUWowMontagePreview=Object.freeze({label:labels[0],open,close});
})();
