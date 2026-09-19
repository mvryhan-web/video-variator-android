(()=>{
  'use strict';
  const DB_NAME='video-uniquifier-user-media-v2';
  const STORE='media';
  let opening=null;

  function open(){
    if(opening)return opening;
    opening=new Promise((resolve,reject)=>{
      if(!('indexedDB'in window)){reject(new Error('PERSISTENT_MEDIA_UNAVAILABLE'));return;}
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
      };
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>db.close();
        resolve(db);
      };
      request.onerror=()=>reject(request.error||new Error('PERSISTENT_MEDIA_OPEN_FAILED'));
      request.onblocked=()=>reject(new Error('PERSISTENT_MEDIA_BLOCKED'));
    });
    opening.catch(()=>{opening=null;});
    return opening;
  }

  async function transaction(mode,operation){
    const db=await open();
    return new Promise((resolve,reject)=>{
      let settled=false;
      const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
      let request;
      try{request=operation(store);}catch(e){reject(e);return;}
      if(request){
        request.onsuccess=()=>{if(!settled){settled=true;resolve(request.result);}};
        request.onerror=()=>{if(!settled){settled=true;reject(request.error||tx.error||new Error('PERSISTENT_MEDIA_FAILED'));}};
      }
      tx.oncomplete=()=>{if(!settled){settled=true;resolve(true);}};
      tx.onerror=()=>{if(!settled){settled=true;reject(tx.error||new Error('PERSISTENT_MEDIA_FAILED'));}};
      tx.onabort=()=>{if(!settled){settled=true;reject(tx.error||new Error('PERSISTENT_MEDIA_ABORTED'));}};
    });
  }

  async function put(key,blob){
    if(!blob)throw new Error('PERSISTENT_MEDIA_EMPTY');
    const record={blob,type:blob.type||'application/octet-stream',size:Number(blob.size)||0,updatedAt:Date.now()};
    await transaction('readwrite',store=>store.put(record,String(key)));
    return true;
  }

  async function get(key){
    try{
      const record=await transaction('readonly',store=>store.get(String(key)));
      if(!record)return null;
      if(record instanceof Blob)return record;
      if(record.blob instanceof Blob)return record.blob;
      if(record.bytes)return new Blob([record.bytes],{type:record.type||'application/octet-stream'});
      return null;
    }catch(_){return null;}
  }

  async function remove(key){
    try{await transaction('readwrite',store=>store.delete(String(key)));return true;}catch(_){return false;}
  }

  async function clear(){
    try{await transaction('readwrite',store=>store.clear());return true;}catch(_){return false;}
  }

  async function persist(){
    try{
      if(navigator.storage?.persisted&&await navigator.storage.persisted())return true;
      return !!(await navigator.storage?.persist?.());
    }catch(_){return false;}
  }

  window.VUPersistentMedia={dbName:DB_NAME,put,get,remove,clear,persist};
})();