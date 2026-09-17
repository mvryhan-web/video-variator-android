const CACHE='video-uniquifier-v15';
const APP_SHELL=['/','/index.html','/styles.css','/v3.css','/v5.css','/product-polish.css','/app-v4.js','/app-v5.js','/product-polish.js','/video-core.js','/bootstrap.js','/trial-quality.js','/admin-access.js','/ffmpeg-worker.js','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin){event.respondWith(fetch(event.request));return;}
  const isNavigation=event.request.mode==='navigate';
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(r=>r||(isNavigation?caches.match('/index.html'):undefined))));
});