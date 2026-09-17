(() => {
  let apiBase='';
  try{
    const nativeBase=window.AndroidBridge?.getApiBase?.();
    if(nativeBase&&String(nativeBase).startsWith('https://')){
      apiBase=String(nativeBase).replace(/\/$/,'');
      window.VV_API_BASE=apiBase;
    }
  }catch(_){ }

  if(!window.FFmpegWASM?.FFmpeg){
    const runtimeBase=(location.protocol==='https:'||location.protocol==='http:')
      ? location.origin
      : (apiBase||window.VV_API_BASE||'https://video-variator-android.onrender.com');
    document.write(`<script src="${String(runtimeBase).replace(/\/$/,'')}/vendor/ffmpeg/ffmpeg.js"><\/script>`);
  }

  const style=document.createElement('link');style.rel='stylesheet';style.href='v5.css';document.head.appendChild(style);
  const icon=document.createElement('link');icon.rel='icon';icon.href='icon.svg';document.head.appendChild(icon);

  window.addEventListener('DOMContentLoaded',()=>{
    const admin=document.createElement('script');admin.src='admin-access.js';admin.defer=true;document.body.appendChild(admin);
    const v5=document.createElement('script');v5.src='app-v5.js';v5.defer=true;document.body.appendChild(v5);
  });
})();
