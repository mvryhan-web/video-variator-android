import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('real pinned WASM renders all three modes with WOW and preserves standard audio/timeline',async({page},info)=>{
  test.skip(info.project.name!=='chromium');test.setTimeout(600000);
  const source=info.outputPath('wow-source.mp4');
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=160x90:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','3.5','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-y',source]);
  await page.route(/accounts\.google\.com|appleid\.cdn-apple\.com/,route=>route.abort());
  const uploads=[];page.on('request',request=>{if(request.method()==='POST'&&/video\/|audio\//.test(request.headers()['content-type']||''))uploads.push(request.url());});
  await page.goto('/');
  const evidence=await page.evaluate(async bytes=>{
    const core=VideoVariatorCore,originalRandom=Math.random,results=[];
    core.setFiles([new File([new Uint8Array(bytes)],'wow-source.mp4',{type:'video/mp4'})]);
    async function inspect(result){
      const url=URL.createObjectURL(result.blob),v=document.createElement('video');v.muted=true;v.src=url;
      try{
        await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=no;});
        const metadata={width:v.videoWidth,height:v.videoHeight,duration:v.duration};
        v.currentTime=1.5;await new Promise((ok,no)=>{v.onseeked=ok;v.onerror=no;});
        const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.drawImage(v,0,0,160,90);
        return{...metadata,pixels:Array.from(ctx.getImageData(0,0,160,90).data)};
      }finally{v.removeAttribute('src');v.load();URL.revokeObjectURL(url);}
    }
    async function pcm(blob,name){
      const ff=core.state.ffmpeg,input=name+'.mp4',output=name+'.pcm';
      try{
        await ff.writeFile(input,new Uint8Array(await blob.arrayBuffer()));
        const code=await ff.exec(['-y','-i',input,'-vn','-f','s16le',output]);if(code!==0)throw Error('PCM decode failed');
        return await ff.readFile(output);
      }finally{await ff.deleteFile(input);await ff.deleteFile(output);}
    }
    try{
      Math.random=()=>.25;
      for(const mode of ['gentle','balanced','dynamic']){
        const start=performance.now();
        const off=(await core.process({mode,resolution:'1280x720',variants:1})).results[0];
        const on=(await core.process({mode,resolution:'1280x720',variants:1,wowMontage:true})).results[0];
        const a=await inspect(off),b=await inspect(on),audioA=await pcm(off.blob,'off'),audioB=await pcm(on.blob,'on');
        let difference=0;for(let i=0;i<a.pixels.length;i++)difference+=Math.abs(a.pixels[i]-b.pixels[i]);
        results.push({mode,status:on.wowMontage.status,reason:on.wowMontage.reason,profile:on.wowMontage.profile,width:b.width,height:b.height,durationOff:a.duration,durationOn:b.duration,pixelDifference:difference/a.pixels.length,audioIdentical:audioA.length===audioB.length&&audioA.every((n,i)=>n===audioB[i]),seconds:(performance.now()-start)/1000});
      }
    }finally{Math.random=originalRandom;}
    return results;
  },Array.from(readFileSync(source)));
  for(const result of evidence){
    expect(result.status).toBe('applied');expect(result.width).toBe(1280);expect(result.height).toBe(720);
    expect(result.durationOn).toBeCloseTo(result.durationOff,3);expect(result.audioIdentical).toBe(true);expect(result.pixelDifference).toBeGreaterThan(2.5);
  }
  expect(uploads).toEqual([]);console.log('WOW_WASM '+JSON.stringify(evidence));
});
