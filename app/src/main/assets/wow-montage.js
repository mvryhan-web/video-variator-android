// Local visual montage v2. No network, models, semantic/audio classification or randomness.
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
    const empty=reason=>({version:2,status:'skipped',reason,profile:analysis?.profile||'unknown',effects:[]});
    if(!analysis||!finite(analysis.confidence)||analysis.confidence<.65||!Array.isArray(analysis.scenes)||!['calm','moderate','moving'].includes(analysis.profile))return empty('low-confidence');
    if(![recipe.speed,recipe.trimStart,recipe.usable,recipe.zoom].every(finite)||recipe.speed<=0||recipe.zoom<1)return empty('invalid-timeline');
    const sourceEnd=recipe.trimStart+recipe.usable;
    const cutStart=recipe.trimStart+recipe.cutAt,cutEnd=cutStart+recipe.cutLen;
    const map=t=>(t-recipe.trimStart-(recipe.useCut&&t>=cutEnd?recipe.cutLen:0))/recipe.speed;
    const intervals=[];
    for(const scene of analysis.scenes){
      const start=Math.max(scene.start,recipe.trimStart),end=Math.min(scene.end,sourceEnd);
      if(end<=start)continue;
      const parts=recipe.useCut?[[start,Math.min(end,cutStart)],[Math.max(start,cutEnd),end]]:[[start,end]];
      for(const [a,b] of parts){if(b>a)intervals.push({start:Math.max(0,map(a)),end:map(b)});}
    }
    // Keep total crop bounded even with Dynamic's existing framing. There are
    // no extra timeline edits, audio changes, black borders or flashes.
    const zoom=Math.min({calm:.08,moderate:.115,moving:.15}[analysis.profile],Math.max(0,1.22/recipe.zoom-1));
    if(zoom<.04)return empty('existing-framing-limit');
    const effects=[],direction=finite(recipe.shiftX)&&recipe.shiftX<0?-1:1;
    const add=(kind,start,end,index)=>effects.push({type:'camera',kind,start,end,zoom:kind==='intro'?Math.min(.16,zoom*1.25,1.22/recipe.zoom-1):zoom,speed:recipe.speed,pan:analysis.profile==='calm'?.35:.7,direction:index%2?-direction:direction});
    for(const interval of intervals){
      let cursor=interval.start+.15;
      if(interval.start<.04&&interval.end>=.7){add('intro',0,.48,0);cursor=.9;}
      const length=analysis.profile==='calm'?2.2:analysis.profile==='moderate'?1.5:1.05;
      const gap=analysis.profile==='calm'?1.3:.65;
      while(cursor+length<=interval.end-.15&&effects.length<6){
        add('pulse',cursor,cursor+length,effects.length);cursor+=length+gap;
      }
    }
    if(!effects.length)return empty('no-safe-scene');
    return{version:2,status:'planned',profile:analysis.profile,reason:'measured-frame-motion',effects};
  }

  function appendFilters(command, montage) {
    if(!montage.effects.length)return [...command];
    if(montage.effects.length>6)throw Error('Unsafe montage plan');
    const num=n=>Number(n.toFixed(6)),insets=[],dxs=[],dys=[];
    let previousEnd=-1;
    for(const e of montage.effects){
      if(e.type!=='camera'||!['intro','pulse'].includes(e.kind)||![e.start,e.end,e.zoom,e.speed,e.pan,e.direction].every(finite)||e.start<0||e.start<previousEnd||e.end<=e.start||e.zoom<=0||e.zoom>.16||e.speed<=0||e.pan<0||e.pan>.7||Math.abs(e.direction)!==1)throw Error('Unsafe montage plan');
      previousEnd=e.end;
      const time=`in/(30*${num(e.speed)})`;
      const phase=`max(0,min(1,(${time}-${num(e.start)})/${num(e.end-e.start)}))`;
      const envelope=e.kind==='intro'?`pow(1-(${phase}),3)`:`pow(sin(PI*(${phase})),2)`;
      const inset=`${num(e.zoom/(2*(1+e.zoom)))}*(${envelope})*between(${time},${num(e.start)},${num(e.end)})`;
      insets.push(`(${inset})`);
      dxs.push(`(${inset})*${num(e.pan*e.direction)}*sin(2*PI*(${phase}))`);
      // Opening settles down into place; later gestures have smaller vertical travel.
      dys.push(`(${inset})*${num(e.kind==='intro'?.65:e.pan*.25)}*${e.kind==='intro'?'1':`sin(PI*(${phase}))`}`);
    }
    const inset=insets.join('+'),dx=dxs.join('+'),dy=dys.join('+');
    const left=`W*((${inset})+(${dx}))`,right=`W*(1-(${inset})+(${dx}))`;
    const top=`H*((${inset})+(${dy}))`,bottom=`H*(1-(${inset})+(${dy}))`;
    // One pass for all gestures. Perspective preserves timestamps/frame count.
    const filter=`perspective=x0='${left}':y0='${top}':x1='${right}':y1='${top}':x2='${left}':y2='${bottom}':x3='${right}':y3='${bottom}':sense=source:eval=frame:interpolation=cubic:enable='between(t,0,${num(previousEnd)})'`;
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

  root.VUWowMontage=Object.freeze({ready:true,version:2,limits:Object.freeze({width:WIDTH,height:HEIGHT,fps:FPS,maxFrames:MAX_FRAMES,maxSeconds:MAX_SECONDS}),analyzeFrames,analysisArgs,analyze,plan,appendFilters,encode});
})(typeof window==='undefined'?globalThis:window);
