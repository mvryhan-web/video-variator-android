(() => {
  'use strict';

  const CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
  const CLASS_WORKER = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/814.ffmpeg.js';
  const state = { files: [], ffmpeg: null, loaded: false, running: false, cancelled: false, results: [], progress: 0 };
  const $ = id => document.getElementById(id);
  const el = {
    fileInput:$('fileInput'), fileSummary:$('fileSummary'), variantCount:$('variantCount'), mode:$('mode'), resolution:$('resolution'), microCut:$('microCut'), preserveAudio:$('preserveAudio'),
    startBtn:$('startBtn'), cancelBtn:$('cancelBtn'), engineBadge:$('engineBadge'), progressCard:$('progressCard'), progressTitle:$('progressTitle'), progressPercent:$('progressPercent'), progressBar:$('progressBar'), progressText:$('progressText'), logBox:$('logBox'),
    resultsCard:$('resultsCard'), results:$('results'), saveAllBtn:$('saveAllBtn')
  };

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const fmt=(n,d=4)=>Number(n).toFixed(d).replace(/0+$/,'').replace(/\.$/,'');
  const safeBase=name=>(name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g,'_').slice(0,72)||'video');
  const extOf=name=>(name.match(/\.([a-zA-Z0-9]+)$/)?.[1]||'mp4').toLowerCase();

  function log(line){ if(!line)return; const lines=(el.logBox.textContent+line+'\n').split('\n'); el.logBox.textContent=lines.slice(-80).join('\n'); el.logBox.scrollTop=el.logBox.scrollHeight; }
  function bytes(n){ const u=['Б','КБ','МБ','ГБ']; let i=0,v=n; while(v>=1024&&i<u.length-1){v/=1024;i++} return `${v.toFixed(v>=100?0:v>=10?1:2)} ${u[i]}`; }

  async function toBlobURL(url,type){ const r=await fetch(url); if(!r.ok) throw new Error(`Не удалось загрузить видеодвижок (${r.status})`); return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type})); }

  async function ensureEngine(){
    if(state.loaded&&state.ffmpeg) return state.ffmpeg;
    if(!window.FFmpegWASM?.FFmpeg) throw new Error('Не загрузилась библиотека FFmpeg. Проверьте интернет и откройте приложение снова.');
    el.engineBadge.textContent='Загрузка движка…';
    el.progressText.textContent='Первый запуск загружает FFmpeg. Это может занять немного времени.';
    const ffmpeg=new window.FFmpegWASM.FFmpeg();
    ffmpeg.on('log',({message})=>log(message));
    ffmpeg.on('progress',({progress})=>{ if(state.running&&Number.isFinite(progress)) state.progress=clamp(progress,0,1); });
    const [classWorkerURL,coreURL,wasmURL]=await Promise.all([
      toBlobURL(CLASS_WORKER,'text/javascript'),
      toBlobURL(`${CORE_BASE}/ffmpeg-core.js`,'text/javascript'),
      toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`,'application/wasm')
    ]);
    await ffmpeg.load({classWorkerURL,coreURL,wasmURL});
    state.ffmpeg=ffmpeg; state.loaded=true;
    el.engineBadge.textContent='FFmpeg готов'; el.engineBadge.classList.add('ready');
    return ffmpeg;
  }

  function setFiles(list){
    const files=Array.from(list||[]).filter(f=>f.type.startsWith('video/')||/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name));
    state.files=files; el.startBtn.disabled=!files.length||state.running;
    if(!files.length){el.fileSummary.textContent='Подходящие видео не выбраны.';return}
    const total=files.reduce((s,f)=>s+f.size,0); const names=files.slice(0,3).map(f=>f.name).join(', ');
    el.fileSummary.textContent=`${files.length} видео · ${bytes(total)} · ${names}${files.length>3?'…':''}`;
  }

  function durationOf(file){ return new Promise((resolve,reject)=>{ const url=URL.createObjectURL(file),v=document.createElement('video'); v.preload='metadata'; v.onloadedmetadata=()=>{const d=v.duration;URL.revokeObjectURL(url);Number.isFinite(d)&&d>0?resolve(d):reject(new Error('Не удалось определить длительность видео.'))}; v.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Не удалось прочитать видео.'))}; v.src=url; }); }

  function ranges(mode){
    if(mode==='gentle') return {trim:[0,.16],speed:[.995,1.006],pitch:[-.08,.08],vol:[.987,1.013],bri:[-.007,.007],con:[.994,1.011],sat:[.994,1.014],sharp:[.02,.08],warm:[-.007,.007],zoom:[1.003,1.011],shift:[-.03,.03],cut:[.05,.08]};
    if(mode==='dynamic') return {trim:[.04,.5],speed:[.978,1.026],pitch:[-.25,.25],vol:[.958,1.042],bri:[-.022,.022],con:[.978,1.04],sat:[.972,1.05],sharp:[.04,.21],warm:[-.021,.021],zoom:[1.008,1.04],shift:[-.1,.1],cut:[.08,.16]};
    return {trim:[.02,.3],speed:[.988,1.015],pitch:[-.15,.15],vol:[.974,1.026],bri:[-.014,.014],con:[.986,1.026],sat:[.984,1.03],sharp:[.03,.14],warm:[-.013,.013],zoom:[1.005,1.023],shift:[-.06,.06],cut:[.06,.11]};
  }

  function recipe(duration,mode,micro){
    const r=ranges(mode),maxTrim=Math.max(0,Math.min(r.trim[1],duration*.025));
    const ts=rand(r.trim[0],maxTrim||r.trim[0]),te=rand(r.trim[0],maxTrim||r.trim[0]),usable=Math.max(.5,duration-ts-te);
    let useCut=false;if(usable>5) useCut=micro==='on'||(micro==='auto'&&mode!=='gentle'&&Math.random()<(mode==='dynamic'?.7:.35));
    return {trimStart:ts,trimEnd:te,usable,speed:rand(...r.speed),pitchSemi:rand(...r.pitch),volume:rand(...r.vol),brightness:rand(...r.bri),contrast:rand(...r.con),saturation:rand(...r.sat),sharpen:rand(...r.sharp),warmth:rand(...r.warm),zoom:rand(...r.zoom),shiftX:rand(...r.shift),shiftY:rand(...r.shift),useCut,cutAt:useCut?rand(usable*.3,usable*.7):0,cutLen:useCut?rand(...r.cut):0};
  }

  function filters(r,w,h,audio){
    const zw=Math.round(w*r.zoom/2)*2,zh=Math.round(h*r.zoom/2)*2;
    const x=`(iw-ow)/2+(iw-ow)*${fmt(r.shiftX,5)}`,y=`(ih-oh)/2+(ih-oh)*${fmt(r.shiftY,5)}`;
    const vf=[`scale=${zw}:${zh}:force_original_aspect_ratio=increase`,`crop=${w}:${h}:x='${x}':y='${y}'`,`eq=brightness=${fmt(r.brightness)}:contrast=${fmt(r.contrast)}:saturation=${fmt(r.saturation)}`,`colorbalance=rs=${fmt(r.warmth)}:bs=${fmt(-r.warmth)}`,`unsharp=5:5:${fmt(r.sharpen,3)}:5:5:0`,'fps=30'];
    if(r.useCut){const a=fmt(r.cutAt,3),b=fmt(r.cutAt+r.cutLen,3);vf.push(`select='not(between(t\\,${a}\\,${b}))'`,'setpts=N/(30*TB)');}
    vf.push(`setpts=PTS/${fmt(r.speed,6)}`,'format=yuv420p');
    const af=[];
    if(audio){af.push('aresample=48000');if(r.useCut){const a=fmt(r.cutAt,3),b=fmt(r.cutAt+r.cutLen,3);af.push(`aselect='not(between(t\\,${a}\\,${b}))'`,'asetpts=N/SR/TB');}const p=Math.pow(2,r.pitchSemi/12);af.push(`asetrate=${fmt(48000*p,3)}`,'aresample=48000',`atempo=${fmt(1/p,6)}`,`atempo=${fmt(r.speed,6)}`,`volume=${fmt(r.volume,5)}`);}
    return {vf:vf.join(','),af:af.join(',')};
  }

  function args(input,out,duration,r,w,h,audio){
    const clipped=Math.max(.4,duration-r.trimStart-r.trimEnd),f=filters(r,w,h,audio),a=['-hide_banner','-y','-ss',fmt(r.trimStart,3),'-t',fmt(clipped,3),'-i',input,'-vf',f.vf];
    if(audio)a.push('-af',f.af);else a.push('-an');
    a.push('-c:v','libx264','-preset','veryfast','-crf',w>=1080?'20':'21','-pix_fmt','yuv420p','-movflags','+faststart');if(audio)a.push('-c:a','aac','-b:a','160k');a.push(out);return a;
  }

  function summary(r){const p=[`скорость ${r.speed.toFixed(3)}×`,`тон ${r.pitchSemi>=0?'+':''}${r.pitchSemi.toFixed(2)} st`,`масштаб ${r.zoom.toFixed(3)}×`];if(r.useCut)p.push(`микросрез ${r.cutLen.toFixed(2)} c`);return p.join(' · ');}

  function chunkDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(reader.error||new Error('Ошибка чтения результата'));reader.readAsDataURL(blob);});}

  async function saveAndroid(name,blob){
    if(!window.AndroidBridge?.startFile) return false;
    if(!window.AndroidBridge.startFile(name)) throw new Error('Android не смог создать файл для сохранения.');
    const chunk=512*1024;
    for(let i=0;i<blob.size;i+=chunk){const b64=await chunkDataURL(blob.slice(i,Math.min(i+chunk,blob.size)));if(!window.AndroidBridge.appendChunk(b64))throw new Error('Ошибка записи результата на телефон.');}
    const path=window.AndroidBridge.finishFile(); return path&&path!=='error';
  }

  async function processOne(file,fileIndex,variantIndex,total){
    const ffmpeg=await ensureEngine(),duration=await durationOf(file),[w,h]=el.resolution.value.split('x').map(Number),r=recipe(duration,el.mode.value,el.microCut.value),token=`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,input=`in_${token}.${extOf(file.name)}`,internal=`out_${token}.mp4`,name=`${safeBase(file.name)}_variant_${variantIndex+1}.mp4`,job=fileIndex*Number(el.variantCount.value)+variantIndex+1;
    el.progressTitle.textContent=`${file.name} — вариант ${variantIndex+1}`;el.progressText.textContent=`Задача ${job} из ${total}`;state.progress=0;
    await ffmpeg.writeFile(input,new Uint8Array(await file.arrayBuffer()));
    let audio=el.preserveAudio.checked;
    try{const a=args(input,internal,duration,r,w,h,audio);log('> ffmpeg '+a.join(' '));const code=await ffmpeg.exec(a);if(code!==0)throw new Error('FFmpeg завершился с кодом '+code);}catch(err){if(!audio)throw err;log('Повтор без аудио…');audio=false;try{await ffmpeg.deleteFile(internal)}catch(_){ }const a=args(input,internal,duration,r,w,h,false);const code=await ffmpeg.exec(a);if(code!==0)throw err;}
    const data=await ffmpeg.readFile(internal),blob=new Blob([data.buffer],{type:'video/mp4'}),url=URL.createObjectURL(blob);let saved=false;
    try{saved=await saveAndroid(name,blob);}catch(e){log(e.message);}
    state.results.push({name,blob,url,saved,recipe:r,resolution:`${w}×${h}`,audio});renderResults();
    try{await ffmpeg.deleteFile(input)}catch(_){ }try{await ffmpeg.deleteFile(internal)}catch(_){ }
  }

  function renderResults(){
    el.resultsCard.hidden=!state.results.length;el.results.innerHTML='';
    state.results.forEach((r,i)=>{const wrap=document.createElement('div');wrap.className='result';const v=document.createElement('video');v.src=r.url;v.controls=true;v.playsInline=true;v.preload='metadata';const n=document.createElement('div');n.className='resultName';n.textContent=r.name;const m=document.createElement('div');m.className='resultMeta';m.textContent=`${r.resolution} · ${r.audio?'со звуком':'без звука'} · ${summary(r.recipe)}`;const s=document.createElement('div');if(r.saved){s.className='saved';s.textContent='Сохранено в Downloads/VideoVariator ✓';}else{const b=document.createElement('button');b.className='saveBtn';b.textContent='Сохранить на телефон';b.onclick=async()=>{b.disabled=true;try{r.saved=await saveAndroid(r.name,r.blob);renderResults();}catch(e){b.disabled=false;window.AndroidBridge?.toast?.(e.message)}};s.appendChild(b);}wrap.append(v,n,m,s);el.results.appendChild(wrap);});
  }

  function update(job,total){const overall=clamp((job+state.progress)/total,0,1),p=Math.round(overall*100);el.progressPercent.textContent=p+'%';el.progressBar.style.width=p+'%';}

  async function start(){
    if(!state.files.length||state.running)return;state.running=true;state.cancelled=false;state.results.forEach(r=>URL.revokeObjectURL(r.url));state.results=[];renderResults();el.resultsCard.hidden=true;el.progressCard.hidden=false;el.cancelBtn.hidden=false;el.startBtn.disabled=true;el.logBox.textContent='';
    const variants=Number(el.variantCount.value),total=state.files.length*variants;let done=0;const ticker=setInterval(()=>update(done,total),180);
    try{await ensureEngine();for(let i=0;i<state.files.length;i++){for(let v=0;v<variants;v++){if(state.cancelled)throw new Error('Обработка остановлена.');await processOne(state.files[i],i,v,total);done++;update(done,total);}}el.progressTitle.textContent='Готово';el.progressText.textContent=`Создано ${state.results.length} видео.`;el.progressPercent.textContent='100%';el.progressBar.style.width='100%';}
    catch(e){el.progressTitle.textContent=state.cancelled?'Остановлено':'Ошибка';el.progressText.textContent=e?.message||String(e);log(e?.stack||String(e));window.AndroidBridge?.toast?.(e?.message||'Ошибка обработки');}
    finally{clearInterval(ticker);state.running=false;el.cancelBtn.hidden=true;el.startBtn.disabled=!state.files.length;}
  }

  async function cancel(){state.cancelled=true;if(state.ffmpeg&&state.running){try{state.ffmpeg.terminate()}catch(_){ }state.ffmpeg=null;state.loaded=false;el.engineBadge.textContent='Движок остановлен';el.engineBadge.classList.remove('ready');}}

  async function saveAll(){for(const r of state.results){if(r.saved)continue;try{r.saved=await saveAndroid(r.name,r.blob);}catch(e){log(e.message);}}renderResults();}

  el.fileInput.addEventListener('change',e=>setFiles(e.target.files));el.startBtn.addEventListener('click',start);el.cancelBtn.addEventListener('click',cancel);el.saveAllBtn.addEventListener('click',saveAll);
})();
