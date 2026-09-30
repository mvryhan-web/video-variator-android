// Native API base only. Styles and ordered scripts live in index.html so the
// browser fetches them together instead of painting several design generations.
(() => {
  try {
    const base=window.AndroidBridge?.getApiBase?.();
    if(base && String(base).startsWith('https://')) window.VV_API_BASE=String(base).replace(/\/$/,'');
  } catch (_) {}
})();

// Start the small wrapper without blocking presentation. Preserve an existing
// runtime and let processing await this one download rather than loading twice.
if(!window.FFmpegWASM?.FFmpeg){
  window.vuRuntimeReady=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=(window.VV_API_BASE||location.origin)+'/vendor/ffmpeg/ffmpeg.js';
    script.onload=resolve;script.onerror=()=>reject(new Error('Video engine download failed.'));
    document.head.append(script);
  });
  window.vuRuntimeReady.catch(()=>{});
}
