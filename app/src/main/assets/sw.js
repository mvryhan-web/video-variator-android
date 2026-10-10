const CACHE='video-uniquifier-v39';
const APP_SHELL=['/tools-hub.css','/tools-hub.js','/startup.js','/startup.css','/processing-session.js','/audio-studio.html','/audio-studio.js','/speech-client.js','/transcribe-worker.js','/avatar-motion.js','/result-delete.js','/creator-pages.css','/creator-pages.js','/creator-showcase.css','/creator-showcase.js','/creator-tools.js','/','/index.html','/styles.css','/v3.css','/v5.css','/product-polish.css','/auth-email.css','/app-v4.js','/app-v5.js','/product-polish.js','/auth-email.js','/video-core.js','/bootstrap.js','/trial-quality.js','/admin-access.js','/ffmpeg-worker.js','/manifest.webmanifest','/icon.svg','/free-tools.html','/free-tools.js','/free-tools.css','/theme.js','/theme.css','/file-share.js','/persistent-media.js','/tool-icons.js','/camera-prompter.js','/studio.css','/avatar-studio.html','/avatar-studio.js','/ai-media.js'];
APP_SHELL.push('/share-import.js');
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

/* Push continues working when the web app page is not open, where supported. */
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?.json()||{};}catch(_){}
 const url=String(data.url||'/smart-reminders.html');
 const safeUrl=url.startsWith('/smart-reminders.html')?url:'/smart-reminders.html';
 const body=String(data.body||'Reminder').slice(0,180);
 const options={
   body,tag:String(data.tag||'vv-reminder'),icon:'/icon.svg',
   data:{url:safeUrl,id:String(data.id||'')},
   actions:[{action:'done',title:'Done'},{action:'snooze',title:'10 min later'}]
 };
 event.waitUntil(self.registration.showNotification('Video Uniquifier · Reminder',options));
});
self.addEventListener('notificationclick',event=>{
 const action=event.action,details=event.notification.data||{};
 event.notification.close();
 const p=new URLSearchParams();
 if(['done','snooze'].includes(action)&&/^[a-f0-9-]{36}$/i.test(details.id||'')){
  p.set('action',action);p.set('id',details.id);
 }
 const url='/smart-reminders.html'+(p.toString()?'?'+p:'');
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
   const target=windows.find(c=>c.url.includes('/smart-reminders.html'));
   // Navigate existing tab so the action query is processed after authentication.
   if(target){await target.navigate(url);return target.focus();}
   return self.clients.openWindow(url);
 }));
});
