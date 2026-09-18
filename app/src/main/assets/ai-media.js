export async function createEngine(){
 if(!window.FFmpegWASM?.FFmpeg)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/ffmpeg/ffmpeg.js';s.onload=resolve;s.onerror=()=>reject(Error('ENGINE_LOAD'));document.head.append(s);});
 const engine=new window.FFmpegWASM.FFmpeg();const response=await fetch('ffmpeg-worker.js');if(!response.ok)throw Error('ENGINE_LOAD');const url=URL.createObjectURL(await response.blob());try{await engine.load({classWorkerURL:url,coreURL:location.origin+'/vendor/ffmpeg/ffmpeg-core.js',wasmURL:location.origin+'/vendor/ffmpeg/ffmpeg-core.wasm'});}catch(e){engine.terminate();throw e;}finally{URL.revokeObjectURL(url);}return engine;
}
export function subtitleFiles(chunks,duration){
 const stamp=(seconds,comma)=>{const ms=Math.round(Math.max(0,seconds)*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${comma?',':'.'}${String(ms%1000).padStart(3,'0')}`;};
 const valid=chunks.map((c,i)=>({start:Math.max(0,Number(c.timestamp?.[0])||0),end:Math.min(duration,Number(c.timestamp?.[1]??chunks[i+1]?.timestamp?.[0]??duration)),text:String(c.text||'').trim().replace(/-->/g,'→')})).filter(c=>c.text&&Number.isFinite(c.end)&&c.end>c.start);
 return {srt:valid.map((c,i)=>`${i+1}\n${stamp(c.start,true)} --> ${stamp(c.end,true)}\n${c.text}\n`).join('\n'),vtt:'WEBVTT\n\n'+valid.map(c=>`${stamp(c.start,false)} --> ${stamp(c.end,false)}\n${c.text.replaceAll('&','&amp;').replaceAll('<','&lt;')}\n`).join('\n')};
}
export async function saveLocal(file){
 const b=window.AndroidBridge;if(b?.startToolFile){if(!b.startToolFile(file.name,file.type))throw Error('SAVE_UNSUPPORTED');try{for(let i=0;i<file.size;i+=262144){const bytes=new Uint8Array(await file.slice(i,i+262144).arrayBuffer());let s='';for(const n of bytes)s+=String.fromCharCode(n);if(!b.appendToolChunk(btoa(s)))throw Error('SAVE_FAILED');}if(!b.finishToolFile(false))throw Error('SAVE_FAILED');return;}catch(e){b.cancelToolFile();throw e;}}
 if(b)throw Error('UPDATE_ANDROID');
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
