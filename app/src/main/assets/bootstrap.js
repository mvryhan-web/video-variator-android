(() => {
  try{
    const nativeBase=window.AndroidBridge?.getApiBase?.();
    if(nativeBase&&String(nativeBase).startsWith('https://'))window.VV_API_BASE=String(nativeBase).replace(/\/$/,'');
  }catch(_){ }

  const style=document.createElement('link');style.rel='stylesheet';style.href='v5.css';document.head.appendChild(style);
  const icon=document.createElement('link');icon.rel='icon';icon.href='icon.svg';document.head.appendChild(icon);

  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.includes('@ffmpeg/ffmpeg@0.12.15/dist/umd/814.ffmpeg.js')){
      const moduleWorker='import "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js";';
      return Promise.resolve(new Response(moduleWorker,{headers:{'Content-Type':'text/javascript'}}));
    }
    if(url.includes('@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js'))return nativeFetch('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js',init);
    return nativeFetch(input,init);
  };

  window.addEventListener('DOMContentLoaded',()=>{
    const admin=document.createElement('script');admin.src='admin-access.js';admin.defer=true;document.body.appendChild(admin);
    const v5=document.createElement('script');v5.src='app-v5.js';v5.defer=true;document.body.appendChild(v5);
  });
})();