const CACHE='video-uniquifier-v34';
const APP_SHELL=['/audio-studio.html','/audio-studio.js','/speech-client.js','/transcribe-worker.js','/avatar-motion.js','/result-delete.js','/creator-pages.css','/creator-pages.js','/creator-showcase.css','/creator-showcase.js','/creator-tools.js','/','/index.html','/styles.css','/v3.css','/v5.css','/product-polish.css','/auth-email.css','/app-v4.js','/app-v5.js','/product-polish.js','/auth-email.js','/video-core.js','/bootstrap.js','/trial-quality.js','/admin-access.js','/ffmpeg-worker.js','/manifest.webmanifest','/icon.svg','/free-tools.html','/free-tools.js','/free-tools.css','/theme.js','/theme.css','/file-share.js','/persistent-media.js','/tool-icons.js','/camera-prompter.js','/studio.css','/avatar-studio.html','/avatar-studio.js','/ai-media.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('video-uniquifier-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/vendor/ai/'))return;
  if(url.origin!==self.location.origin){event.respondWith(fetch(event.request));return;}
  const isNavigation=event.request.mode==='navigate';
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(r=>r||(isNavigation?caches.match('/index.html'):undefined))));
});