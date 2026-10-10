// Local visual montage v1. No network, models, semantic/audio classification or randomness.
((root) => {
  'use strict';
  const WIDTH=160, HEIGHT=90, FPS=4, MAX_FRAMES=48, MAX_SECONDS=12;
  const unknown = reason => ({version:1,confidence:0,profile:'unknown',reason,speech:'unknown',rhythm:'unknown',scenes:[],sampledSeconds:0});
  const finite = n => Number.isFinite(n);

  function analyzeFrames(bytes, duration) {
    const pixels=WIDTH*HEIGHT, count=Math.floor(bytes.length/pixels);
    if(!(bytes instanceof Uint8Array)||bytes.length%pixels||count<8||count>MAX_FRAMES||!finite(duration)||duration<=0)return unknown('insufficient-samples');
    const scenes=[], motion=[];let sceneStart=0, previousHistogram=null;
    for(let f=0;f<count;f++){
      const histogram=new Float64Array(16);let difference=0;
      for(let p=0;p<pixels;p++){
        const value=bytes[f*pixels+p];histogram[value>>4]++;
        if(f)difference+=Math.abs(value-bytes[(f-1)*pixels+p]);
      }
      if(f){
        const delta=difference/(pixels*255);
        const hist=histogram.reduce((sum,n,i)=>sum+Math.abs(n-previousHistogram[i]),0)/(2*pixels);
        // Large exposure changes also count as boundaries: a conservative false positive.
        if(hist>.45||delta>.28){scenes.push({start:sceneStart,end:f/FPS});sceneStart=f/FPS;}
        else motion.push(delta);
      }
      previousHistogram=histogram;
    }
    const sampledSeconds=Math.min(duration,count/FPS,MAX_SECONDS);
    scenes.push({start:sceneStart,end:sampledSeconds});
    if(motion.length<5)return unknown('too-many-boundaries');
    const average=motion.reduce((sum,n)=>sum+n,0)/motion.length;
    const sustained=motion.filter(n=>n>.06).length/motion.length;
    const profile=average>.06&&sustained>.6?'moving':average<.025?'calm':'moderate';
    return{version:1,confidence:Math.min(1,motion.length/12),profile,motion:average,scenes,sampledSeconds,frameCount:count,speech:'unknown',rhythm:'unknown'};
  }

  function analysisArgs(input, output, duration) {
    const seconds=Math.min(MAX_SECONDS,Math.max(0,duration));
    if(!finite(seconds)||seconds<=0)throw Error('Invalid analysis duration');
    return['-hide_banner','-y','-t',String(seconds),'-i',input,'-map','0:v:0','-an','-sn','-dn','-vf',`fps=${FPS},scale=${WIDTH}:${HEIGHT}:flags=bilinear,format=gray`,'-frames:v',String(MAX_FRAMES),'-f','rawvideo',output];
  }

  async function analyze(ffmpeg, input, duration, cancelled=()=>false) {
    const output='wow_samples.gray';
    try{
      if(cancelled())throw Error('Processing was canceled.');
      // FFmpeg's own interrupt timeout; no worker termination or lost source on timeout.
      const code=await ffmpeg.exec(analysisArgs(input,output,duration),15000);
      if(cancelled())throw Error('Processing was canceled.');
      if(code!==0)return unknown('analysis-unavailable');
      return analyzeFrames(await ffmpeg.readFile(output),duration);
    }catch(error){if(cancelled())throw error;return unknown('analysis-unavailable');}
    finally{try{await ffmpeg.deleteFile(output);}catch(_){}}
  }

  function plan(analysis, recipe) {
    const empty=reason=>({version:1,status:'skipped',reason,profile:analysis?.profile||'unknown',effects:[]});
    if(!analysis||!finite(analysis.confidence)||analysis.confidence<.65||!Array.isArray(analysis.scenes)||!['calm','moderate','moving'].includes(analysis.profile))return empty('low-confidence');
    if(!finite(recipe.speed)||recipe.speed<=0)return empty('invalid-timeline');
    const sourceEnd=recipe.trimStart+recipe.usable;
    const cutStart=recipe.trimStart+recipe.cutAt,cutEnd=cutStart+recipe.cutLen;
    const map=t=>(t-recipe.trimStart-(recipe.useCut&&t>=cutEnd?recipe.cutLen:0))/recipe.speed;
    const intervals=[];
    for(const scene of analysis.scenes){
      const start=Math.max(scene.start,recipe.trimStart),end=Math.min(scene.end,sourceEnd);
      if(end<=start)continue;
      const parts=recipe.useCut?[[start,Math.min(end,cutStart)],[Math.max(start,cutEnd),end]]:[[start,end]];
      for(const [a,b] of parts){if(b>a)intervals.push({start:map(a)+.3,end:map(b)-.3});}
    }
    const interval=intervals.find(i=>i.end-i.start>=2);
    if(!interval)return empty('no-safe-scene');
    // Bound total framing change and reduce added motion when the mode already moves.
    const desired={calm:.012,moderate:.018,moving:.025}[analysis.profile];
    const headroom=Math.max(0,1.045/recipe.zoom-1);
    const zoom=Math.min(desired,headroom)*(recipe.motionX>0?.65:1);
    if(zoom<.004)return empty('existing-framing-limit');
    return{version:1,status:'planned',profile:analysis.profile,reason:'measured-frame-motion',effects:[{
      type:'camera',start:interval.start,end:Math.min(interval.end,interval.start+5),zoom,speed:recipe.speed,
      pan:analysis.profile==='moving'?.18:.08,
    }]};
  }

  function appendFilters(command, montage) {
    if(!montage.effects.length)return [...command];
    const e=montage.effects[0];
    if(e.type!=='camera'||![e.start,e.end,e.zoom,e.speed,e.pan].every(finite)||e.end<=e.start||e.zoom<=0||e.zoom>.03||e.speed<=0||e.pan<0||e.pan>.2)throw Error('Unsafe montage plan');
    const num=n=>Number(n.toFixed(6));
    const time=`in/(30*${num(e.speed)})`;
    const phase=`max(0,min(1,(${time}-${num(e.start)})/${num(e.end-e.start)}))`;
    const inset=`${num(e.zoom/(2*(1+e.zoom)))}*pow(sin(PI*(${phase})),2)`;
    const dx=`(${inset})*${num(e.pan)}*sin(2*PI*(${phase}))`;
    const dy=`(${inset})*${num(e.pan/2)}*sin(PI*(${phase}))`;
    const left=`W*((${inset})+(${dx}))`,right=`W*(1-(${inset})+(${dx}))`;
    const top=`H*((${inset})+(${dy}))`,bottom=`H*(1-(${inset})+(${dy}))`;
    // Unlike zoompan, perspective retains incoming timestamps and frame count.
    const filter=`perspective=x0='${left}':y0='${top}':x1='${right}':y1='${top}':x2='${left}':y2='${bottom}':x3='${right}':y3='${bottom}':sense=source:eval=frame:interpolation=cubic:enable='between(t,${num(e.start)},${num(e.end)})'`;
    const result=[...command],index=result.indexOf('-vf');
    if(index<0)throw Error('Missing standard video filter');
    result[index+1]+=','+filter;
    return result;
  }

  async function encode(ffmpeg, command, montage, cancelled=()=>false, log=()=>{}) {
    if(montage.effects.length){
      try{
        const code=await ffmpeg.exec(appendFilters(command,montage));
        if(cancelled())throw Error('Processing was canceled.');
        if(code===0){montage.status='applied';return code;}
      }catch(error){if(cancelled())throw error;}
      montage.status='fallback';montage.reason='visual-render-unavailable';
      log('WOW Montage unavailable for this output; retaining the standard recipe and audio.');
      try{await ffmpeg.deleteFile(command.at(-1));}catch(_){}
    }
    if(cancelled())throw Error('Processing was canceled.');
    return ffmpeg.exec(command);
  }

  root.VUWowMontage=Object.freeze({ready:true,version:1,limits:Object.freeze({width:WIDTH,height:HEIGHT,fps:FPS,maxFrames:MAX_FRAMES,maxSeconds:MAX_SECONDS}),analyzeFrames,analysisArgs,analyze,plan,appendFilters,encode});
})(typeof window==='undefined'?globalThis:window);
