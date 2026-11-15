/* DEEPSYQ Christmas V2 — additive seasonal effects; isolated preview only.
   No modification to the underlying carousel, tool actions, billing or Worker. */
(()=>{'use strict';
 const host=location.hostname.toLowerCase();
 if(!['christmas-preview-20261114.deepsyq.pages.dev','test.deepsyq.pages.dev','localhost','127.0.0.1'].includes(host))return;
 const root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const scenes=new Map();
 const timeouts=new Set();
 let canvas=null,ctx=null,flakes=[],snowRAF=0,battleRAF=0,lastSnow=0,lastBattle=0,enabled=false;
 const make=(tag,cls)=>{const el=document.createElement(tag);el.className=cls||'';return el};
 const later=(fn,ms)=>{const id=setTimeout(()=>{timeouts.delete(id);if(enabled)fn()},ms);timeouts.add(id)};
 const stageEnabled=()=>root.dataset.siteTheme==='christmas';
 const costumes=[['#c74753','#c74552'],['#e7d8c7','#ca726c'],['#467092','#6c8ab0'],['#d3a062','#bb7759'],['#5d8373','#546d66']];
 const selectors=['#sidebar','.ds-site-sidebar','.sidebar','.topbar','body>header','header','.hero-stage','.panel','.tool-card','.app-card','.card','.home-create-card','.home-feature-spotlight','.feature-card','.price-card','.studio-card','.tool-tile','.jarvix-compose','.j-neon-composer','.creative-example-card','.studio-panel','.subscription-card'];
 const activeTargets=()=>document.querySelectorAll('.xmas-mini-stage');
 function snowcaps(){
  let count=document.querySelectorAll('.xmas-snowcap').length;
  for(const sel of selectors){
   if(count>=95)break;
   document.querySelectorAll(sel).forEach((el,i)=>{
    if(count>=95||el.hidden||el.closest('.xmas-theme-tool,.xmas-mini-stage'))return;
    if(el.querySelector(':scope > .xmas-snowcap'))return;
    if(el.getBoundingClientRect().width<110)return;
    if(getComputedStyle(el).position==='static')el.classList.add('xmas-v2-relative');
    const cap=make('div','xmas-snowcap xmas-snowcap-v2');
    cap.setAttribute('aria-hidden','true');
    cap.style.setProperty('--xmas-pile-shift',((i*19+count*7)%47)+'px');
    cap.style.setProperty('--xmas-pile-depth',(16+(i*7+count*13)%11)+'px');
    if(/card|tile|spotlight/.test(sel))cap.classList.add('xmas-thin');
    if(/header|topbar/.test(sel))cap.classList.add('xmas-header');
    el.appendChild(cap);count++;
   });
  }
 }
 function tinyPerson(i){
  const colors=costumes[i%costumes.length];
  const el=make('div','xmas-person xmas-v2-actor');
  el.dataset.xmasActor=String(i);
  el.innerHTML='<svg viewBox="0 0 52 66" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
   '<g class="leg"><path d="M23 43L15 59" stroke="#26354b" stroke-width="7" stroke-linecap="round"/></g>'+
   '<g class="leg right"><path d="M30 43l10 16" stroke="#26354b" stroke-width="7" stroke-linecap="round"/></g>'+
   '<path d="M13 27Q8 39 15 48Q26 53 40 47L36 29Z" fill="'+colors[0]+'" stroke="#644a44" stroke-width="1.5"/>'+
   '<path d="M14 30l-10 9M37 29l10-9" stroke="'+colors[0]+'" stroke-width="8" stroke-linecap="round"/>'+
   '<circle cx="26" cy="19" r="12" fill="#f7c8a7"/>'+
   '<path d="M13 16Q14 -1 27 3Q41 3 40 16Z" fill="'+colors[1]+'"/>'+
   '<path d="M14 16q12-4 26 0" stroke="#f3fbff" stroke-width="5" fill="none"/>'+
   '<circle cx="27" cy="3" r="5" fill="#fff"/>'+
   '<circle cx="22" cy="19" r="1.3" fill="#2b3442"/><circle cx="31" cy="19" r="1.3" fill="#2b3442"/>'+
   '<path d="M23 24q4 3 8-1" fill="none" stroke="#bd7e6a" stroke-width="1.5"/>'+
   '<path d="M19 29h15l-3 6H22Z" fill="#f0d4a4"/></svg>';
  return el;
 }
 function setupScene(stage){
  if(scenes.has(stage))return;
  const actors=Array.from(stage.querySelectorAll(':scope > .xmas-person'));
  if(actors.length<2)return;
  stage.classList.add('xmas-v2-battle');
  stage.dataset.xmasHitCount='0';
  stage.dataset.xmasShots='0';
  stage.dataset.xmasLastHit='';
  const state={stage,actors:actors.map((el,i)=>({el,index:i,base:(i+.55)/(actors.length+.13),x:0,downUntil:0})),
   shot:null,sequence:0,nextShot:performance.now()+1200,forced:null,hits:0,shots:0};
  scenes.set(stage,state);
 }
 function walkOnPanels(){
  // Keep original five characters and their composer exactly as they are.
  document.querySelectorAll('.xmas-mini-stage').forEach(setupScene);
  // Other pages: mini-scenes atop existing panels, never inside active editors.
  const isHome=!!document.querySelector('#homeQuickBar');
  let extra=0;
  const panels=document.querySelectorAll('.jarvix-compose,.j-neon-composer,.tool-card,.app-card,.panel,.card,.studio-card,.home-create-card,.feature-card,.tool-tile,.price-card');
  for(const panel of panels){
   if(extra>=2)break;
   if(panel.closest('.xmas-mini-stage,.xmas-theme-tool'))continue;
   if(panel.querySelector(':scope > .xmas-mini-stage'))continue;
   if(panel.matches('form')||panel.querySelector('textarea,video'))continue;
   const rect=panel.getBoundingClientRect();
   if(rect.width<250||rect.height<80||panel.hidden)continue;
   if(isHome && panel.closest('#homeQuickBar'))continue;
   if(getComputedStyle(panel).position==='static')panel.classList.add('xmas-v2-relative');
   const stage=make('div','xmas-mini-stage xmas-mini-secondary');
   stage.setAttribute('aria-hidden','true');
   stage.dataset.xmasSecondary='true';
   for(let i=0;i<3;i++)stage.appendChild(tinyPerson(i+extra));
   panel.appendChild(stage);
   setupScene(stage);
   extra++;
  }
 }
 function throwShot(state,now){
  const people=state.actors,n=people.length;
  let from=state.forced===null?state.sequence%n:state.forced;
  state.forced=null;
  let to=(from+1+(state.sequence%2))%n;
  if(to===from)to=(to+1)%n;
  state.sequence++;
  if(people[from].downUntil>now||people[to].downUntil>now){state.nextShot=now+620;return}
  const ball=make('span','xmas-v2-projectile');
  ball.setAttribute('aria-hidden','true');
  state.stage.appendChild(ball);
  state.shot={from,to,el:ball,start:now,duration:820};
  state.shots++;state.stage.dataset.xmasShots=String(state.shots);
  people[from].el.classList.add('xmas-v2-throw');
  later(()=>people[from].el.classList.remove('xmas-v2-throw'),460);
  state.nextShot=now+(state.stage.dataset.xmasSecondary==='true'?3500:2400);
 }
 function hit(state,now){
  const shot=state.shot;if(!shot)return;
  shot.el.remove();state.shot=null;
  const target=state.actors[shot.to];
  target.downUntil=now+1350;
  target.el.classList.remove('xmas-v2-recover');
  target.el.classList.add('xmas-v2-hit');
  state.hits++;
  state.stage.dataset.xmasHitCount=String(state.hits);
  state.stage.dataset.xmasLastHit=shot.from+'-'+shot.to;
  const splash=make('span','xmas-v2-splash');splash.style.left=(target.x*100)+'%';
  state.stage.appendChild(splash);later(()=>splash.remove(),630);
  later(()=>{
   target.el.classList.remove('xmas-v2-hit');
   target.el.classList.add('xmas-v2-recover');
   later(()=>target.el.classList.remove('xmas-v2-recover'),400);
  },1250);
  // The person that was hit stands up and retaliates.
  state.forced=shot.to;state.nextShot=now+1550;
 }
 function combat(time){
  if(!enabled||reduced.matches){battleRAF=0;return}
  if(!document.hidden&&time-lastBattle>=27){
   lastBattle=time;
   for(const [stage,state] of scenes){
    if(!stage.isConnected){scenes.delete(stage);continue}
    const w=stage.clientWidth;if(!w)continue;
    state.actors.forEach((a,i)=>{
     a.x=Math.max(.04,Math.min(.96,a.base+Math.sin(time*.0017+i*1.6)*8/w));
     a.el.style.left=(a.x*100)+'%';
    });
    if(!state.shot&&time>=state.nextShot)throwShot(state,time);
    if(state.shot){
     const q=state.shot,p=Math.min(1,(time-q.start)/q.duration);
     const x=state.actors[q.from].x*(1-p)+state.actors[q.to].x*p;
     const y=(stage.clientHeight-49)+p*5-Math.sin(Math.PI*p)*Math.min(54,stage.clientHeight*.68);
     q.el.style.left=(x*100)+'%';
     q.el.style.top=y+'px';
     if(p>=1)hit(state,time);
    }
   }
  }
  battleRAF=requestAnimationFrame(combat);
 }
 function snow(){
  canvas=make('canvas','xmas-v2-real-snow');canvas.id='xmas-real-snow';
  canvas.setAttribute('aria-hidden','true');document.body.appendChild(canvas);
  ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
  resize();
  snowRAF=requestAnimationFrame(drawSnow);
 }
 function resize(){
  if(!canvas||!ctx)return;
  const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.6);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const count=reduced.matches?0:(w<760?28:52);
  flakes=Array.from({length:count},()=>{
   const depth=.15+Math.random()*.85;
   return {x:Math.random()*w,y:Math.random()*h,r:2.8+depth*4.5,
    speed:.25+depth*.9,phase:Math.random()*6.3,
    drift:(Math.random()-.5)*.32,opacity:.36+depth*.5,depth,
    angle:Math.random()*6.3};
  });
 }
 function drawSnow(time){
  if(!enabled||!ctx){snowRAF=0;return}
  snowRAF=requestAnimationFrame(drawSnow);
  if(document.hidden||time-lastSnow<27)return;
  const dt=Math.min(2,(time-lastSnow||16)/16);lastSnow=time;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(const f of flakes){
   f.y+=f.speed*dt;
   f.x+=(f.drift+Math.sin(time*.00075+f.phase)*.17)*dt;
   if(f.y>innerHeight+12){f.y=-12;f.x=Math.random()*innerWidth}
   if(f.x>innerWidth+15)f.x=-10;if(f.x<-15)f.x=innerWidth+10;
   ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle+Math.sin(time*.00029+f.phase)*.19);
   ctx.lineWidth=f.depth>.5?1.15:.75;ctx.lineCap='round';
   ctx.strokeStyle='rgba(247,253,255,'+f.opacity+')';
   for(let i=0;i<6;i++){
    ctx.save();ctx.rotate(i*Math.PI/3);
    const b=f.r*.54,c=f.r*.32;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-f.r);
    ctx.moveTo(0,-b);ctx.lineTo(-c,-b-c*.65);
    ctx.moveTo(0,-b);ctx.lineTo(c,-b-c*.65);
    ctx.stroke();ctx.restore();
   }
   ctx.restore();
  }
 }
 function start(){
  if(enabled)return;enabled=true;
  snowcaps();walkOnPanels();snow();
  if(!reduced.matches)battleRAF=requestAnimationFrame(combat);
  for(const ms of [600,1900,3800,7000])later(()=>{snowcaps();walkOnPanels()},ms);
 }
 function stop(){
  if(!enabled)return;enabled=false;
  cancelAnimationFrame(battleRAF);cancelAnimationFrame(snowRAF);
  battleRAF=snowRAF=0;
  timeouts.forEach(clearTimeout);timeouts.clear();
  for(const [stage,state] of scenes){
   stage.classList.remove('xmas-v2-battle');
   stage.querySelectorAll('.xmas-v2-projectile,.xmas-v2-splash').forEach(el=>el.remove());
   state.actors.forEach(a=>{a.el.classList.remove('xmas-v2-hit','xmas-v2-recover','xmas-v2-throw');a.el.style.left=''});
   if(stage.dataset.xmasSecondary==='true')stage.remove();
  }
  scenes.clear();
  document.querySelectorAll('.xmas-snowcap-v2').forEach(el=>el.remove());
  document.querySelectorAll('.xmas-v2-relative').forEach(el=>el.classList.remove('xmas-v2-relative'));
  if(canvas){canvas.remove();canvas=null;ctx=null;flakes=[]}
 }
 function sync(){
  if(stageEnabled()){
   if(!enabled)start();
   else {snowcaps();walkOnPanels()}
  }else stop();
 }
 function init(){
  const observer=new MutationObserver(()=>queueMicrotask(sync));
  observer.observe(root,{attributes:true,attributeFilter:['data-site-theme']});
  sync();
  // Late-rendered cards are decorated without re-creating earlier effects.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&enabled){snowcaps();walkOnPanels()}});
  window.addEventListener('resize',resize,{passive:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();