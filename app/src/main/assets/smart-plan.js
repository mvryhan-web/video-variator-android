export const MAX_SECONDS=60;
export function validateClip(duration,size){if(!Number.isFinite(duration)||duration<=0||duration>MAX_SECONDS||size>150*1024*1024)throw Error('Use a video up to 60 seconds / 150 MB.');}
export function selectFace(faces,previous){const valid=faces.filter(f=>[f.x,f.y,f.w,f.h,f.score].every(Number.isFinite)&&f.score>=.6&&f.w>0&&f.h>0);return valid.sort((a,b)=>previous?Math.hypot(a.x-previous.x,a.y-previous.y)-Math.hypot(b.x-previous.x,b.y-previous.y):b.w*b.h-a.w*a.h)[0]||null;}
export function smoothTrack(samples){let last=.5;const points=samples.map(s=>{if(s.face)last=Math.max(0,Math.min(1,s.face.x));return {t:s.t,x:last};});return points.map((p,i)=>({...p,x:i>0&&i<points.length-1?points[i-1].x*.2+p.x*.6+points[i+1].x*.2:p.x}));}
export function cropGeometry(width,height,vertical){const scale=Math.min(1,1280/height,vertical?Infinity:1280/width);const h=Math.max(2,Math.floor(height*scale/2)*2),w=vertical?Math.max(2,Math.floor(Math.min(width*scale,h*9/16)/2)*2):Math.max(2,Math.floor(width*scale/2)*2);return {w,h};}
export function cropExpression(track,width,height,w){/* expressions use scaled input width. */
 const points=track.filter((p,i)=>i%4===0||i===track.length-1).slice(0,32).map(p=>({t:Math.max(0,p.t),x:Math.max(0,Math.min(1,p.x))}));
 let expr=String(points.at(-1)?.x??.5);
 for(let i=points.length-2;i>=0;i--){const a=points[i],b=points[i+1],dt=Math.max(.001,b.t-a.t);expr=`if(lt(t,${b.t.toFixed(3)}),${a.x.toFixed(5)}+(${(b.x-a.x).toFixed(5)})*(t-${a.t.toFixed(3)})/${dt.toFixed(3)},${expr})`;}
 return `max(0,min(iw-ow,iw*(${expr})-ow/2))`;
}
export function normalizeWords(chunks,duration){return (chunks||[]).map((c,i)=>({start:Math.max(0,Number(c.timestamp?.[0])||0),end:Math.min(duration,Number(c.timestamp?.[1]??chunks[i+1]?.timestamp?.[0]??duration)),text:String(c.text||'').trim().slice(0,80)})).filter(c=>c.text&&Number.isFinite(c.end)&&c.end>c.start).slice(0,250);}
export function validateWords(words,duration){let end=0;for(const w of words){if(!w.text.trim()||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<end-.001||w.end<=w.start||w.end>duration+.001)throw Error('Caption times must be in order, within the video, with end after start.');end=w.end;}return words;}
export function captionFrames(words,duration){const cuts=[0,duration,...words.flatMap(w=>[w.start,w.end])].sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>.001);return cuts.slice(0,-1).map((start,i)=>{const active=words.findIndex(w=>w.start<=start+.0005&&w.end>start+.0005);const group=active<0?[]:words.slice(Math.floor(active/5)*5,Math.floor(active/5)*5+5);return {start,duration:cuts[i+1]-start,words:group,active:active<0?-1:active%5};});}
export function safeStyle(value){return {color:/^#[0-9a-f]{6}$/i.test(value?.color)?value.color:'#b8ff5c',brand:String(value?.brand||'').slice(0,40),size:['small','medium','large'].includes(value?.size)?value.size:'medium'};}
