(() => {
 'use strict';
 const ru=(navigator.language||'').startsWith('ru');let busy=false;
 const fail=()=>ru?'Не удалось сохранить или отправить файл. Повторите попытку.':'Could not save or share this file. Please try again.';
 async function transfer(file,share){
  const b=window.AndroidBridge;if(!b)return false;
  if(!b.startToolFile)throw Error(ru?'Для сохранения фото и отправки файлов обновите Android-приложение.':'Update the Android app to save photos and share files.');
  if(!b.startToolFile(file.name,file.type.split(';')[0]))throw Error(fail());
  try{for(let i=0;i<file.size;i+=262144){const bytes=new Uint8Array(await file.slice(i,i+262144).arrayBuffer());let s='';for(const n of bytes)s+=String.fromCharCode(n);if(!b.appendToolChunk(btoa(s)))throw Error(fail());}if(!b.finishToolFile(share))throw Error(fail());return true;}catch(e){b.cancelToolFile?.();throw e;}
 }
 function download(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 async function save(file){if(busy)throw Error(ru?'Дождитесь сохранения текущего файла.':'Wait for the current file to finish saving.');busy=true;try{const native=await transfer(file,false);if(!native)download(file);return {saved:native,requested:!native};}finally{busy=false;}}
 async function share(file){if(busy)throw Error(ru?'Дождитесь сохранения текущего файла.':'Wait for the current file to finish saving.');busy=true;try{
  if(window.AndroidBridge){await transfer(file,true);return;}
  if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Video Uniquifier'});return;}
  download(file);alert(ru?'Браузер скачал файл: отправьте его из папки загрузок.':'This browser cannot share files directly. The file was sent to Downloads so you can attach it.');
 }finally{busy=false;}}
 window.VUFiles={save,share};window.VUShareFile=async r=>{try{await share(new File([r.blob],r.name,{type:r.blob.type||'video/mp4'}));}catch(e){if(e.name!=='AbortError')alert(e.message||fail());}};
})();
