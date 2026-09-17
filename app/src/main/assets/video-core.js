(() => {
  'use strict';

  function productionOrigin(){
    if(location.protocol==='https:'||location.protocol==='http:')return location.origin;
    try{const b=window.AndroidBridge?.getApiBase?.();if(b)return String(b).replace(/\/$/,'');}catch(_){ }
    return String(window.VV_API_BASE||'https://video-variator-android.onrender.com').replace(/\/$/,'');
  }

  const RUNTIME_BASE=productionOrigin();
  const CORE_BASE=`${RUNTIME_BASE}/vendor/ffmpeg`;
  const CLASS_WORKER=location.protocol==='file:'?'file:///android_asset/ffmpeg-worker.js':new URL('ffmpeg-worker.js',location.href).href;
  const state={files:[],ffmpeg:null,loaded:false,running:false,cancelled:false,progress:0};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const fmt=(n,d=4)=>Number(n).toFixed(d).replace(/0+$/,'').replace(/\.$/,'');
  const extOf=name=>(name.match(/\.([a-zA-Z0-9]+)$/)?.[1]||'mp4').toLowerCase();
  const safeBase=name=>(name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,72)||'video');

  let hooks={onEngine:()=>{},onProgress:()=>{},onStage:()=>{},onLog:()=>{}};
  function configure(next={}){hooks={...hooks,...next};}
  function log(line){if(line)hooks.onLog(line);}

  async function fetchWithRetry(url,attempts=3){
    let last;
    for(let i=0;i<attempts;i++){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
      try{
        const r=await fetch(url,{cache:'force-cache',signal:controller.signal});
        clearTimeout(timer);
        if(!r.ok)throw new Error(`HTTP ${r.status}`);
        return r;
      }catch(e){
        clearTimeout(timer);last=e;
        if(i<attempts-1)await new Promise(r=>setTimeout(r,700*(i+1)));
      }
    }
    throw new Error(`Video engine download failed: ${last?.message||'network error'}`);
  }

  async function toBlobURL(url,type){
    const r=await fetchWithRetry(url);
    return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type}));
  }

  async function ensureEngine(){
    if(state.loaded&&state.ffmpeg)return state.ffmpeg;
    if(!window.FFmpegWASM?.FFmpeg)throw new Error('The video engine could not load. Please reopen the app and try again.');
    hooks.onEngine('loading');
    const ffmpeg=new window.FFmpegWASM.FFmpeg();
    ffmpeg.on('log',({message})=>log(message));
    ffmpeg.on('progress',({progress})=>{if(state.running&&Number.isFinite(progress))state.progress=clamp(progress,0,1);});
    try{
      // Keep the class worker as a local blob for Android/WebView compatibility,
      // but give that worker direct same-origin core URLs. Blob URLs created by
      // the page are not reliably fetchable from a module worker on Android.
      const classWorkerURL=await toBlobURL(CLASS_WORKER,'text/javascript');
      const coreURL=`${CORE_BASE}/ffmpeg-core.js`;
      const wasmURL=`${CORE_BASE}/ffmpeg-core.wasm`;
      await ffmpeg.load({classWorkerURL,coreURL,wasmURL});
      state.ffmpeg=ffmpeg;state.loaded=true;hooks.onEngine('ready');
      return ffmpeg;
    }catch(e){
      hooks.onEngine('error');
      try{ffmpeg.terminate();}catch(_){ }
      throw new Error(`Could not start the local video engine. ${e?.message||e}`);
    }
  }

  function setFiles(list){
    state.files=Array.from(list||[]).filter(f=>f.type?.startsWith('video/')||/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name));
    return state.files;
  }
  function getFiles(){return[...state.files];}

  function durationOf(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),v=document.createElement('video');
      v.preload='metadata';
      v.onloadedmetadata=()=>{
        const d=v.duration;URL.revokeObjectURL(url);
        Number.isFinite(d)&&d>0?resolve(d):reject(new Error('Could not read the video duration.'));
      };
      v.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('This video could not be read on this device.'));};
      v.src=url;
    });
  }

  async function estimateCredits(variants=1){
    const count=Math.max(1,Math.min(15,Number(variants)||1));
    const durations=[];
    for(const file of state.files)durations.push(await durationOf(file));
    const sourceSeconds=durations.reduce((s,d)=>s+d,0);
    return{durations,sourceCount:state.files.length,sourceSeconds,creditSeconds:Math.max(1,Math.ceil(sourceSeconds*count)),variants:count};
  }

  function ranges(mode){
    if(mode==='gentle')return{trim:[0,.16],speed:[.995,1.006],pitch:[-.08,.08],vol:[.987,1.013],bri:[-.007,.007],con:[.994,1.011],sat:[.994,1.014],sharp:[.02,.08],warm:[-.007,.007],zoom:[1.003,1.011],shift:[-.03,.03],cut:[.05,.08]};
    if(mode==='dynamic')return{trim:[.04,.5],speed:[.978,1.026],pitch:[-.25,.25],vol:[.958,1.042],bri:[-.022,.022],con:[.978,1.04],sat:[.972,1.05],sharp:[.04,.21],warm:[-.021,.021],zoom:[1.008,1.04],shift:[-.1,.1],cut:[.08,.16]};
    return{trim:[.02,.3],speed:[.988,1.015],pitch:[-.15,.15],vol:[.974,1.026],bri:[-.014,.014],con:[.986,1.026],sat:[.984,1.03],sharp:[.03,.14],warm:[-.013,.013],zoom:[1.005,1.023],shift:[-.06,.06],cut:[.06,.11]};
  }

  function recipe(duration,mode){
    const r=ranges(mode),maxTrim=Math.max(0,Math.min(r.trim[1],duration*.025));
    const ts=rand(r.trim[0],maxTrim||r.trim[0]),te=rand(r.trim[0],maxTrim||r.trim[0]),usable=Math.max(.5,duration-ts-te);
    const useCut=usable>5&&mode!=='gentle'&&Math.random()<(mode==='dynamic'?.7:.35);
    return{trimStart:ts,trimEnd:te,usable,speed:rand(...r.speed),pitchSemi:rand(...r.pitch),volume:rand(...r.vol),brightness:rand(...r.bri),contrast:rand(...r.con),saturation:rand(...r.sat),sharpen:rand(...r.sharp),warmth:rand(...r.warm),zoom:rand(...r.zoom),shiftX:rand(...r.shift),shiftY:rand(...r.shift),useCut,cutAt:useCut?rand(usable*.3,usable*.7):0,cutLen:useCut?rand(...r.cut):0};
  }

  function filters(r,w,h,audio){
    const zw=Math.round(w*r.zoom/2)*2,zh=Math.round(h*r.zoom/2)*2;
    const x=`(iw-ow)/2+(iw-ow)*${fmt(r.shiftX,5)}`,y=`(ih-oh)/2+(ih-oh)*${fmt(r.shiftY,5)}`;
    const vf=[`scale=${zw}:${zh}:force_original_aspect_ratio=increase`,`crop=${w}:${h}:x='${x}':y='${y}'`,`eq=brightness=${fmt(r.brightness)}:contrast=${fmt(r.contrast)}:saturation=${fmt(r.saturation)}`,`colorbalance=rs=${fmt(r.warmth)}:bs=${fmt(-r.warmth)}`,`unsharp=5:5:${fmt(r.sharpen,3)}:5:5:0`,'fps=30'];
    if(r.useCut){
      const a=fmt(r.cutAt,3),b=fmt(r.cutAt+r.cutLen,3);
      vf.push(`select='not(between(t\\,${a}\\,${b}))'`,'setpts=N/(30*TB)');
    }
    vf.push(`setpts=PTS/${fmt(r.speed,6)}`,'format=yuv420p');
    const af=[];
    if(audio){
      af.push('aresample=48000');
      if(r.useCut){
        const a=fmt(r.cutAt,3),b=fmt(r.cutAt+r.cutLen,3);
        af.push(`aselect='not(between(t\\,${a}\\,${b}))'`,'asetpts=N/SR/TB');
      }
      const p=Math.pow(2,r.pitchSemi/12);
      af.push(`asetrate=${fmt(48000*p,3)}`,'aresample=48000',`atempo=${fmt(1/p,6)}`,`atempo=${fmt(r.speed,6)}`,`volume=${fmt(r.volume,5)}`);
    }
    return{vf:vf.join(','),af:af.join(',')};
  }

  function args(input,out,duration,r,w,h,audio){
    const clipped=Math.max(.4,duration-r.trimStart-r.trimEnd),f=filters(r,w,h,audio);
    const a=['-hide_banner','-y','-ss',fmt(r.trimStart,3),'-t',fmt(clipped,3),'-i',input,'-vf',f.vf];
    if(audio)a.push('-af',f.af);else a.push('-an');
    a.push('-c:v','libx264','-preset','veryfast','-crf',w>=1080?'20':'21','-pix_fmt','yuv420p','-movflags','+faststart');
    if(audio)a.push('-c:a','aac','-b:a','160k');
    a.push(out);
    return a;
  }

  function chunkDataURL(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
      reader.onerror=()=>reject(reader.error||new Error('Could not read the output file.'));
      reader.readAsDataURL(blob);
    });
  }

  async function saveAndroid(name,blob){
    if(!window.AndroidBridge?.startFile)return{saved:false,path:null};
    if(!window.AndroidBridge.startFile(name))throw new Error('Android could not create the output file.');
    const chunk=512*1024;
    for(let i=0;i<blob.size;i+=chunk){
      const b64=await chunkDataURL(blob.slice(i,Math.min(i+chunk,blob.size)));
      if(!window.AndroidBridge.appendChunk(b64))throw new Error('Could not save the output file to this device.');
    }
    const path=window.AndroidBridge.finishFile();
    return{saved:!!path&&path!=='error',path:path||null};
  }
  async function saveToDevice(name,blob){return saveAndroid(name,blob);}

  function validResolution(value){
    return/^(720x1280|1080x1920|2160x3840|1280x720|1920x1080|3840x2160)$/.test(value||'');
  }

  async function processOne(file,fileIndex,variantIndex,total,options,duration){
    const ffmpeg=await ensureEngine();
    const [w,h]=options.resolution.split('x').map(Number),r=recipe(duration,options.mode);
    const token=`${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const input=`in_${token}.${extOf(file.name)}`,internal=`out_${token}.mp4`;
    const name=`${safeBase(file.name)}_variant_${variantIndex+1}.mp4`,job=fileIndex*options.variants+variantIndex;
    hooks.onStage('process',{file:file.name,variant:variantIndex+1,job:job+1,total});
    state.progress=0;

    await ffmpeg.writeFile(input,new Uint8Array(await file.arrayBuffer()));
    let audio=true;
    try{
      const a=args(input,internal,duration,r,w,h,true);
      log('> ffmpeg '+a.join(' '));
      const code=await ffmpeg.exec(a);
      if(code!==0)throw new Error('Video processing failed.');
    }catch(err){
      log('Audio track retry disabled for this source.');
      audio=false;
      try{await ffmpeg.deleteFile(internal);}catch(_){ }
      const a=args(input,internal,duration,r,w,h,false);
      const code=await ffmpeg.exec(a);
      if(code!==0)throw err;
    }

    const data=await ffmpeg.readFile(internal),blob=new Blob([data.buffer],{type:'video/mp4'});
    hooks.onStage('save',{file:file.name,variant:variantIndex+1,job:job+1,total});
    let saved={saved:false,path:null};
    try{saved=await saveAndroid(name,blob);}catch(e){log(e.message);}
    try{await ffmpeg.deleteFile(input);}catch(_){ }
    try{await ffmpeg.deleteFile(internal);}catch(_){ }

    return{
      id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      sourceName:file.name,name,blob,saved:saved.saved,path:saved.path,
      resolution:`${w}×${h}`,aspectRatio:w>h?'16:9':'9:16',
      durationSeconds:Math.ceil(duration),credits:Math.ceil(duration),
      createdAt:new Date().toISOString(),variant:variantIndex+1,audio
    };
  }

  async function process(options={}){
    if(state.running)throw new Error('A processing job is already running.');
    if(!state.files.length)throw new Error('Choose at least one video first.');
    const variants=Math.max(1,Math.min(15,Number(options.variants)||1));
    const mode=['gentle','balanced','dynamic'].includes(options.mode)?options.mode:'gentle';
    const resolution=validResolution(options.resolution)?options.resolution:'720x1280';
    state.running=true;state.cancelled=false;state.progress=0;
    const total=state.files.length*variants,results=[];let done=0;
    const ticker=setInterval(()=>hooks.onProgress(clamp((done+state.progress)/total,0,1),{done,total}),160);
    try{
      hooks.onStage('load',{done,total});
      const estimate=await estimateCredits(variants);
      await ensureEngine();
      for(let i=0;i<state.files.length;i++){
        for(let v=0;v<variants;v++){
          if(state.cancelled)throw new Error('Processing was canceled.');
          const result=await processOne(state.files[i],i,v,total,{variants,mode,resolution},estimate.durations[i]);
          results.push(result);done++;
          hooks.onProgress(done/total,{done,total});
        }
      }
      hooks.onStage('done',{done,total});
      return{results,sourceCount:state.files.length,sourceSeconds:estimate.sourceSeconds,creditSeconds:estimate.creditSeconds,outputCount:results.length};
    }finally{
      clearInterval(ticker);state.running=false;
    }
  }

  function cancel(){
    state.cancelled=true;
    if(state.ffmpeg&&state.running){
      try{state.ffmpeg.terminate();}catch(_){ }
      state.ffmpeg=null;state.loaded=false;hooks.onEngine('stopped');
    }
  }

  window.VideoVariatorCore={configure,setFiles,getFiles,durationOf,estimateCredits,process,cancel,saveToDevice,state};
})();
