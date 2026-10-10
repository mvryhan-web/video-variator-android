import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import '../app/src/main/assets/wow-montage.js';
import {captureLegacy} from './helpers/legacy-video-harness.mjs';
const wow=globalThis.VUWowMontage;

for(const scenario of [
  {mode:'gentle',format:'mp4',resolution:'720x1280',audio:true},
  {mode:'balanced',format:'mov',resolution:'1280x720',audio:true},
  {mode:'dynamic',format:'webm',resolution:'1280x720',audio:false},
  ...['gentle','balanced','dynamic'].flatMap(mode=>['1920x1080','3840x2160'].map(resolution=>({mode,format:'mp4',resolution,audio:true,duration:3.5}))),
])test(`real WOW/off pair: ${scenario.mode}, ${scenario.format}, audio=${scenario.audio}`,async()=>{
  const folder=mkdtempSync(join(tmpdir(),'vu-wow-'));
  try{
    const duration=scenario.duration||6;
    const source=join(folder,'source.'+scenario.format),frames=join(folder,'samples.gray');
    const fixture=['-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=30'];
    if(scenario.audio)fixture.push('-f','lavfi','-i','sine=frequency=440:sample_rate=48000');
    fixture.push('-t',String(duration),'-c:v',scenario.format==='webm'?'libvpx':'libx264');
    if(scenario.format==='webm')fixture.push('-deadline','realtime','-cpu-used','8');else fixture.push('-preset','ultrafast');
    if(scenario.audio)fixture.push('-c:a','aac');
    execFileSync('ffmpeg',[...fixture,'-y',source],{stdio:'pipe',timeout:30000});
    execFileSync('ffmpeg',wow.analysisArgs(source,frames,duration),{stdio:'pipe',timeout:30000});
    const analysis=wow.analyzeFrames(new Uint8Array(readFileSync(frames)),duration);
    assert.ok(analysis.confidence>=.65);
    const base=await captureLegacy({...scenario,duration});
    const enabled=await captureLegacy({...scenario,duration,wowMontage:true,wowRuntime:wow,sampleBytes:new Uint8Array(readFileSync(frames))});
    // Harness forces the standard no-audio retry for silent sources. Apply the
    // visual plan to that exact final command for the real silent-media pair.
    let enhanced=enabled.commands.find(c=>c.some(arg=>arg.includes('perspective=')));
    assert.ok(enhanced,'planner selected a real effect');
    if(!scenario.audio){enhanced=[...enhanced];const af=enhanced.indexOf('-af');enhanced.splice(af,2,'-an');const ac=enhanced.indexOf('-c:a');enhanced.splice(ac,4);}
    const windows=[...enhanced[enhanced.indexOf('-vf')+1].matchAll(/between\(in\/\(30\*[\d.]+\),([\d.]+),([\d.]+)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);
    const pulse=windows.find(([start,end])=>end-start>.5);assert.ok(pulse,'a real camera pulse is present');
    const sampleTime=(pulse[0]+pulse[1])/2;
    const outputs=[];
    for(const [name,captured] of [['off',base.commands.at(-1)],['on',enhanced]]){
      const output=join(folder,name+'.mp4'),command=[...captured];
      command[command.indexOf('-i')+1]=source;command[command.length-1]=output;
      const started=performance.now();
      execFileSync('ffmpeg',command,{stdio:'pipe',timeout:120000});
      const renderMs=performance.now()-started;
      const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
      execFileSync('ffmpeg',['-v','error','-xerror','-i',output,'-f','null','-'],{stdio:'pipe',timeout:30000});
      const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
      const [width,height]=scenario.resolution.split('x').map(Number);
      assert.equal(video.width,width);assert.equal(video.height,height);assert.equal(video.sample_aspect_ratio,'1:1');
      assert.equal(Boolean(audio),scenario.audio);
      const pcm=audio?execFileSync('ffmpeg',['-v','error','-i',output,'-vn','-f','s16le','-'],{maxBuffer:4*1024*1024}):null;
      const image=execFileSync('ffmpeg',['-v','error','-ss',String(sampleTime),'-i',output,'-frames:v','1','-vf','scale=160:90','-f','rawvideo','-pix_fmt','gray','-'],{maxBuffer:1024*1024});
      outputs.push({video,audio,pcm,image,renderMs});
    }
    assert.equal(outputs[0].video.duration,outputs[1].video.duration);
    assert.equal(outputs[0].video.nb_frames,outputs[1].video.nb_frames);
    if(scenario.audio)assert.deepEqual(outputs[0].pcm,outputs[1].pcm,'WOW must preserve decoded standard audio exactly');
    let difference=0;for(let i=0;i<outputs[0].image.length;i++)difference+=Math.abs(outputs[0].image[i]-outputs[1].image[i]);
    assert.ok(difference/outputs[0].image.length>2.5,'effect changes actual decoded pixels');
    console.log('WOW_MEDIA '+JSON.stringify({mode:scenario.mode,resolution:scenario.resolution,offMs:Math.round(outputs[0].renderMs),onMs:Math.round(outputs[1].renderMs),format:scenario.format,profile:analysis.profile,pixelDifference:difference/outputs[0].image.length,audioIdentical:scenario.audio?true:null,duration:outputs[1].video.duration}));
  }finally{rmSync(folder,{recursive:true,force:true});}
});

test('opening is visible immediately and camera motion never creates black borders',()=>{
  const folder=mkdtempSync(join(tmpdir(),'vu-wow-opening-'));
  try{
    const source=join(folder,'grid.mp4');
    execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=white:s=192x320:r=30,drawgrid=w=40:h=40:t=3:c=0x808080','-t','6','-c:v','libx264','-preset','ultrafast','-y',source]);
    const frames=new Uint8Array(160*90*24).fill(128);
    const montage=wow.plan(wow.analyzeFrames(frames,6),{trimStart:0,usable:6,speed:1,zoom:1,motionX:0,useCut:false,cutAt:0,cutLen:0});
    assert.equal(montage.effects[0].end,.48);assert.ok(montage.effects.length>=2);
    const results=[];
    for(const enabled of [false,true]){
      const output=join(folder,enabled?'on.mp4':'off.mp4');
      const base=['-v','error','-i',source,'-vf','fps=30,format=yuv420p','-an','-c:v','libx264','-crf','18','-preset','ultrafast','-y',output];
      execFileSync('ffmpeg',enabled?wow.appendFilters(base,montage):base,{timeout:30000,stdio:'pipe'});
      results.push([.03,2,5.8].map(time=>execFileSync('ffmpeg',['-v','error','-ss',String(time),'-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','gray','-'],{maxBuffer:1024*1024})));
    }
    for(let t=0;t<3;t++){
      const a=results[0][t],b=results[1][t];let diff=0;
      for(let i=0;i<b.length;i++){diff+=Math.abs(a[i]-b[i]);assert.ok(b[i]>80,'no black/empty transform border');}
      diff/=b.length;
      if(t<2)assert.ok(diff>3,'visible opening and subsequent pulse');
      else assert.ok(diff<2,'returns to the standard framing after the accents');
    }
  }finally{rmSync(folder,{recursive:true,force:true});}
});
