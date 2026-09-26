export function envelopeFromSamples(samples,rate=16000){
 const duration=samples.length/rate;if(!duration)return null;
 const bins=Math.max(1,Math.min(180,Math.ceil(duration*12))),raw=[];
 for(let b=0;b<bins;b++){const start=Math.floor(samples.length*b/bins),end=Math.floor(samples.length*(b+1)/bins);let sum=0,n=0;for(let i=start;i<end;i+=Math.max(1,Math.floor((end-start)/600))){sum+=samples[i]*samples[i];n++;}raw.push(Math.sqrt(sum/Math.max(1,n)));}
 const sorted=[...raw].sort((a,b)=>a-b),peak=sorted[Math.floor(sorted.length*.95)]||0;
 if(peak<.0001)return {duration,segments:[{end:duration,amp:0}]};
 // Never treat a steady voice as noise: previous percentile subtraction could mute all motion.
 const noise=Math.min(sorted[Math.floor(sorted.length*.15)]||0,peak*.15),segments=[];
 raw.forEach((v,i)=>{const n=Math.max(0,Math.min(1,(v-noise)/(peak-noise))),amp=n<.08?0:Math.round(Math.sqrt(n)*4)/4,end=(i+1)*duration/bins,last=segments.at(-1);if(last?.amp===amp)last.end=end;else segments.push({end,amp});});
 return {duration,segments};
}
export function amplitudeExpression(envelope){
 if(!envelope?.segments?.length)return '1';
 let e='0';for(const s of [...envelope.segments].reverse())e=`if(lt(t\\,${s.end.toFixed(3)})\\,${s.amp.toFixed(2)}\\,${e})`;return e;
}
export function buildAvatarFilter({w,h,fps=24,envelope,mouth={}}){
 const even=n=>Math.max(2,Math.round(n/2)*2),top=even(h*.58),bottom=h-top;
 const mw=even(w*Math.max(.10,Math.min(.6,(mouth.width??28)/100))),mh=even(bottom*.11);
 const mx=even(Math.max(0,Math.min(w-mw,w*(mouth.x??50)/100-mw/2))),my=even(Math.max(0,Math.min(bottom-mh-16,bottom*(mouth.y??62)/100-mh/2)));
 const amp=amplitudeExpression(envelope),shift=Math.max(3,Math.round(bottom*.025));
 return `[0:v]scale=${w}:${top}:force_original_aspect_ratio=increase,crop=${w}:${top},setsar=1,fps=${fps}[top];[1:v]scale=${w}:${bottom}:force_original_aspect_ratio=increase,crop=${w}:${bottom},setsar=1,fps=${fps},split=2[avatarbase][mouthsrc];[mouthsrc]crop=${mw}:${mh}:${mx}:${my}[mouth];[avatarbase][mouth]overlay=${mx}:y='${my}+${shift}*(${amp})*abs(sin(2*PI*t*4.6))'[talking];[talking]rotate='0.012*sin(2*PI*t/3.8)*(${amp})':fillcolor=0x171923[avatar];[top][avatar]vstack=inputs=2[v]`;
}
