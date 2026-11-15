/* DEEPSYQ Christmas V4. Isolated TEST preview visual overlay only.
   Snow sits OUTSIDE card/form edges; pointer motion stirs individual drifts.
   It does not change JARVIX, carousel, navigation, payments or inputs. */
(()=>{'use strict';
 const hostname=location.hostname.toLowerCase();
 if(!['christmas-preview-20261114.deepsyq.pages.dev','localhost','127.0.0.1'].includes(hostname))return;
 const root=document.documentElement;
 const isChristmas=()=>root.dataset.siteTheme==='christmas';
 const texture=new Image();
 let textureReady=false;
 texture.onload=()=>{textureReady=true;schedule()};
 texture.onerror=()=>{textureReady=false};
 texture.src='/media/christmas/snowbank-texture.webp';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const targets=[
  '#homeQuickBar','#jChatForm','.jarvix-compose','.composer',
  '.tool-card','.app-card','.card','.panel','.hub-tile','.feature-card',
  '.tool-tile','.home-create-card','.home-feature-spotlight','.home-create-section',
  '.creative-example-card','.studio-card','.studio-panel','.subscription-card',
  '.price-card','.price-hero','.price-plans-area','.price-credits-area',
  '.price-credit-hero','.price-wallet-area','.price-five-grid',
  '.hero-stage','#homeHeroCarousel','.j-workspace-header','.j-workspace-pane',
  '.j-chat-toolbar','.content>.top','.topbar','body>header','.ds-site-sidebar',
  '.image-tool-card','.video-tool-card','.service-card','.model-card',
  '.plan-card','.feature-tile','.result-card','.gallery-card','.pricing-card',
  '.quick-tool-item','.avatar-launch-card','.selected-tool-panel',
  '.tools-direct-launches','.free-tools-hero'
 ].join(',');
 let canvas=null,ctx=null,dpr=1,frame=0,scanTimer=0,painted=[],ripples=[],particles=[];
 let pointerX=-1,pointerY=-1,lastX=-1,lastY=-1,rippleCount=0;
 let isDrawing=false,observer=null;
 const min=(a,b)=>Math.min(a,b);
 const max=(a,b)=>Math.max(a,b);
 const rand=(n)=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v)};
 const seedFor=(el,i)=>((el.tagName.length*173+el.className.toString().length*37+i*41)%1973);
 function resize(){
  if(!canvas)return;
  dpr=min(window.devicePixelRatio||1,1.65);
  canvas.width=Math.round(innerWidth*dpr);
  canvas.height=Math.round(innerHeight*dpr);
  canvas.style.width=innerWidth+'px';
  canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  schedule();
 }
 function collect(){
  const list=[...document.querySelectorAll(targets)];
  const unique=new Set();
  const visible=[];
  for(let i=0;i<list.length;i++){
   const el=list[i];
   if(unique.has(el)||el.closest('.xmas-mini-stage,.xmas-theme-tool,.xmas-pile-overlay'))continue;
   if(el.closest('#homeQuickBar,#jChatForm')&&!el.matches('#homeQuickBar,#jChatForm'))continue;
   unique.add(el);
   const rect=el.getBoundingClientRect();
   if(rect.width<94||rect.height<26||rect.bottom<=0||rect.top>innerHeight+35)continue;
   if(rect.top<2||rect.top>innerHeight-29)continue;
   const style=getComputedStyle(el);
   if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
   const x=max(0,rect.left),right=min(innerWidth,rect.right),w=right-x;
   if(w<66)continue;
   // Avoid decorating huge page wrappers instead of individual cards.
   if(el.classList.contains('j-workspace-pane')&&rect.height>innerHeight*.85)continue;
   visible.push({el,x,w,y:rect.top-1,seed:seedFor(el,i)});
   if(visible.length>=105)break;
  }
  painted=visible;
  if(canvas)canvas.dataset.xmasPiles=String(visible.length);
 }
 function heightAt(t,local,now){
  // Wide rounded deposits, with airy gaps: realistic snow pillows, no spikes.
  const period=t.w<190?83:t.w>750?126:108;
  const index=Math.floor(local/period);
  let h=0;
  for(let n=index-2;n<=index+2;n++){
   const seed=rand(t.seed+n*57+5);
   const center=n*period+period*(.39+.23*seed);
   const radius=period*(.40+.07*rand(t.seed+n*37+11));
   const d=Math.abs(local-center)/radius;
   if(d>=1)continue;
   // Superellipse-like low rounded summit (not pointy sine-wave peaks).
   const dome=Math.pow(1-d*d,.46);
   const amount=8.6+5.4*rand(t.seed+n*41+23);
   h=Math.max(h,amount*dome);
  }
  // Fine uneven settling, damped at the outline.
  if(h>1.7)h+=.45*Math.sin(local*.092+t.seed)*Math.min(1,h/7);
  else h=0;
  if(!reduced.matches){
   for(const r of ripples){
    if(r.el!==t.el)continue;
    const age=now-r.at;
    if(age<0||age>1100)continue;
    const dx=local-r.x,spread=30+age*.07;
    const envelope=Math.exp(-(dx*dx)/(2*spread*spread));
    h+=envelope*Math.sin(age*.026-dx*.065)*r.force*5.7*Math.exp(-age/530);
   }
  }
  return max(0,min(20,h));
 }
 function mound(t,now){
  const left=t.x,w=t.w,base=t.y-1,upper=base-23;
  ctx.save();
  ctx.beginPath();ctx.rect(left,upper-3,w,25);ctx.clip();
  const contour=()=>{
   ctx.beginPath();ctx.moveTo(left,base);ctx.lineTo(left+w,base);
   for(let x=w;x>=0;x-=2.2)ctx.lineTo(left+x,base-heightAt(t,x,now));
   ctx.lineTo(left,base-heightAt(t,0,now));ctx.closePath();
  };
  contour();
  ctx.shadowColor='rgba(39,79,112,.32)';
  ctx.shadowBlur=3.5;ctx.shadowOffsetY=1;
  const snow=ctx.createLinearGradient(0,upper,0,base);
  snow.addColorStop(0,'#ffffff');
  snow.addColorStop(.35,'#ffffff');
  snow.addColorStop(.8,'#f8fdff');
  snow.addColorStop(1,'#e4f1fa');
  ctx.fillStyle=snow;ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  // The actual photographed snow texture stays clipped to the natural banks.
  if(textureReady){
   contour();ctx.save();ctx.clip();
   ctx.globalAlpha=.43;
   // Repeat with a different crop offset per card to prevent tiled repetition.
   const tw=Math.max(230,Math.min(520,w));
   const seed=(t.seed%3)*91;
   for(let xx=-tw;xx<w+tw;xx+=tw){
    ctx.drawImage(texture,left+xx+(seed%37),upper,tw,24);
   }
   ctx.restore();
  }
  const tufts=Math.ceil(w/19);
  for(let i=0;i<tufts;i++){
   const x=min(w-2,i*19+9+(rand(t.seed+i*11)-.5)*12);
   const h=heightAt(t,x,now);
   if(h<5)continue;
   const r=3.6+rand(t.seed+i*29+31)*3.5;
   const cx=left+x,cy=base-h+r*.36;
   const glow=ctx.createRadialGradient(cx-r*.22,cy-r*.3,.2,cx,cy,r*1.6);
   glow.addColorStop(0,'rgba(255,255,255,.78)');
   glow.addColorStop(.47,'rgba(255,255,255,.39)');
   glow.addColorStop(1,'rgba(241,250,255,0)');
   ctx.fillStyle=glow;ctx.beginPath();
   ctx.ellipse(cx,cy,r*1.8,r*.95,0,0,Math.PI*2);ctx.fill();
  }
  // Sparse frost detail, not evenly spaced dot rows.
  for(let i=0;i<Math.ceil(w/21);i++){
   const x=rand(t.seed+i*17+101)*w;
   const h=heightAt(t,x,now);
   if(h<4)continue;
   ctx.globalAlpha=.48;ctx.fillStyle='#fff';
   ctx.beginPath();
   ctx.arc(left+x,base-h*(.2+.6*rand(t.seed+i*13+9)),.4+rand(t.seed+i*31)*.65,0,Math.PI*2);
   ctx.fill();
  }
  ctx.restore();
 }
 function draw(now){
  frame=0;if(!canvas||!ctx||!isChristmas())return;
  if(isDrawing)return;isDrawing=true;
  // Recalculate positions every draw so sticky headers and scrolling cards stay aligned.
  collect();
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(const t of painted)mound(t,now);
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i],age=now-p.birth;
   if(age>700){particles.splice(i,1);continue}
   const opacity=max(0,(1-age/700)*.6);
   ctx.fillStyle='rgba(255,255,255,'+opacity.toFixed(3)+')';
   ctx.beginPath();ctx.arc(p.x+p.vx*age*.045,p.y+p.vy*age*.05+age*age*.00002,p.r,0,Math.PI*2);ctx.fill();
  }
  ripples=ripples.filter(r=>now-r.at<1100);
  isDrawing=false;
  if((ripples.length||particles.length)&&!reduced.matches)schedule();
 }
 function schedule(){if(!frame&&canvas&&isChristmas())frame=requestAnimationFrame(draw)}
 function pointerMove(e){
  if(!isChristmas()||reduced.matches||!canvas||!e.isPrimary)return;
  pointerX=e.clientX;pointerY=e.clientY;
  const dist=max(Math.abs(pointerX-lastX),Math.abs(pointerY-lastY));
  if(dist<3)return;
  lastX=pointerX;lastY=pointerY;
  let nearest=null,dy=Infinity;
  for(const t of painted){
   const d=Math.abs(pointerY-(t.y-10));
   if(pointerX>=t.x-8&&pointerX<=t.x+t.w+8&&d<30&&d<dy){nearest=t;dy=d}
  }
  if(!nearest)return;
  const local=max(1,min(nearest.w-1,pointerX-nearest.x));
  const force=min(1.5,max(.45,dist/17));
  ripples.push({el:nearest.el,x:local,at:performance.now(),force});
  if(ripples.length>14)ripples.shift();
  rippleCount++;
  canvas.dataset.xmasRippleCount=String(rippleCount);
  // Fine loose crystals briefly move aside as if brushed by a finger.
  for(let i=0;i<3;i++){
   particles.push({birth:performance.now(),x:pointerX,y:nearest.y-6,
    vx:(rand(rippleCount*7+i)-.5)*2.2,vy:-1-rand(rippleCount*9+i)*1.3,
    r:.5+rand(rippleCount*13+i)*.75});
  }
  if(particles.length>40)particles.splice(0,particles.length-40);
  schedule();
 }
 function boot(){
  canvas=document.createElement('canvas');canvas.id='xmas-pile-overlay';
  canvas.className='xmas-pile-overlay';canvas.setAttribute('aria-hidden','true');
  canvas.dataset.xmasRippleCount='0';
  document.body.appendChild(canvas);
  ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  resize();collect();schedule();
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('scroll',schedule,{capture:true,passive:true});
  addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('pointermove',pointerMove,{capture:true,passive:true});
  const themeObserver=new MutationObserver(()=>schedule());
  themeObserver.observe(root,{attributes:true,attributeFilter:['data-site-theme']});
  observer=new MutationObserver(mutations=>{
   if(!isChristmas())return;
   if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&
      !n.closest?.('.xmas-mini-stage,.xmas-pile-overlay')&&n.id!=='xmas-pile-overlay'))){
     if(scanTimer)clearTimeout(scanTimer);
     scanTimer=setTimeout(()=>{scanTimer=0;schedule()},180);
   }
  });
  observer.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  // Recheck late-rendered cards without changing their markup.
  [350,1100,2800].forEach(ms=>setTimeout(schedule,ms));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();