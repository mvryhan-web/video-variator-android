(()=>{ 
  'use strict';
  const CACHE='video-uniquifier-user-media-v1';
  const base=()=>location.protocol==='https:'||location.protocol==='http:'?location.origin:'https://video-uniquifier.local';
  const requestFor=key=>new Request(base()+'/__vu_media__/'+encodeURIComponent(String(key)),{method:'GET'});
  async function open(){if(!('caches'in window))throw new Error('PERSISTENT_MEDIA_UNAVAILABLE');return caches.open(CACHE);}
  async function put(key,blob){
    const cache=await open();
    const headers=new Headers({'Content-Type':blob?.type||'application/octet-stream','Cache-Control':'private, max-age=31536000'});
    await cache.put(requestFor(key),new Response(blob,{status:200,headers}));
    return true;
  }
  async function get(key){
    try{const cache=await open(),response=await cache.match(requestFor(key));return response?await response.blob():null;}catch(_){return null;}
  }
  async function remove(key){
    try{const cache=await open();return cache.delete(requestFor(key));}catch(_){return false;}
  }
  async function clear(){
    try{return caches.delete(CACHE);}catch(_){return false;}
  }
  async function persist(){
    try{return !!(await navigator.storage?.persist?.());}catch(_){return false;}
  }
  window.VUPersistentMedia={cacheName:CACHE,put,get,remove,clear,persist};
})();