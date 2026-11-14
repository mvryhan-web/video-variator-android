/* DEEPSYQ Christmas TEST overlay — independent of video/JARVIX functionality */
(()=>{'use strict';
const doc=document.documentElement;
const host=location.hostname.toLowerCase();
if(!(/^(localhost|127\.0\.0\.1|test\.deepsyq\.pages\.dev)$/).test(host))return;
const params=new URLSearchParams(location.search);
const key='deepsyq_christmas_test_theme';
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let active=false,canvas,ctx,flakes=[],bursts=[],raf=0,last=0,owned=[],resizeFn=null;
const make=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n};
const mount=(el,parent=document.body)=>{parent.appendChild(el);owned.push(el);return el};
function character(coat,cap,scarf){
 return '<svg viewBox="0 0 52 66" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
 '<g class="leg"><path d="M22 43L16 60" stroke="#26354b" stroke-width="7" stroke-linecap="round"/><path d="M12 61h11" stroke="#26354b" stroke-width="5"/></g>'+
 '<g class="leg right"><path d="M29 43l10 16" stroke="#2d405a" stroke-width="7" stroke-linecap="round"/><path d="M35 61h12" stroke="#26354b" stroke-width="5"/></g>'+
 '<path d="M13 28q-6 11 2 20q13 6 25 0q3-12-3-20q-12-5-24 0" fill="'+coat+'" stroke="#4d3943" stroke-width="1.5"/>'+
 '<path d="M15 29l-8 11M36 30l9-9" stroke="'+coat+'" stroke-width="8" stroke-linecap="round"/>'+
 '<circle cx="7" cy="40" r="4" fill="#fff"/><circle cx="46" cy="20" r="4" fill="#fff"/>'+
 '<path d="M20 28h14l-2 10H22z" fill="'+scarf+'"/><path d="M31 35l8 14" stroke="'+scarf+'" stroke-width="5"/>'+
 '<circle cx="26" cy="19" r="12" fill="#ffc8a6" stroke="#ae8068"/>'+
 '<path d="M13 16Q13 0 27 2q14 1 14 15z" fill="'+cap+'"/>'+
 '<path d="M13 16q14-5 28 0" fill="none" stroke="#fff7ec" stroke-width="5"/>'+
 '<circle cx="28" cy="2" r="5" fill="#fff"/><circle cx="23" cy="19" r="1.2" fill="#3e363c"/><circle cx="31" cy="19" r="1.2" fill="#3e363c"/>'+
 '<path d="M23 23q4 4 8-1" stroke="#b9705b" stroke-width="1.5" fill="none"/></svg>';
}
function caps(){
 const groups=['#sidebar','.ds-site-sidebar','.top','.topbar','body>header','#homeHeroCarousel','#homeQuickBar','.home-create-card','.home-feature-spotlight','.home-create-section','.tool-card','.app-card'];
 for(const sel of groups)document.querySelectorAll(sel).forEach(target=>{
   if(target.querySelector(':scope > .xmas-snowcap'))return;
   if(getComputedStyle(target).position==='static')target.classList.add('xmas-position-parent');
   const cap=make('div','xmas-snowcap');
   cap.setAttribute('aria-hidden','true');
   if(sel==='.top'||sel==='.topbar'||sel==='body>header')cap.classList.add('xmas-header');
   if(/card|spotlight/.test(sel))cap.classList.add('xmas-thin');
   mount(cap,target);
 });
}
function children(){
 const bar=document.querySelector('#homeQuickBar');
 if(!bar||bar.querySelector('.xmas-mini-stage'))return;
 if(getComputedStyle(bar).position==='static')bar.classList.add('xmas-position-parent');
 const stage=make('div','xmas-mini-stage');stage.setAttribute('aria-hidden','true');
 stage.appendChild(make('div','xmas-mini-ground'));
 const clothes=[['one','#c74753','#c74552','#d13d47'],['two','#f0e2d5','#d8c0a0','#b84242'],['three','#467092','#607f9f','#eab54e'],['four','#d3a062','#b87764','#b43d43'],['five','#5d8373','#647b75','#e8b04d']];
 for(const [label,coat,cap,scarf]of clothes){const p=make('div','xmas-person '+label);p.innerHTML=character(coat,cap,scarf);stage.appendChild(p)}
 stage.appendChild(make('span','xmas-snowball left'));stage.appendChild(make('span','xmas-snowball right'));
 mount(stage,bar);
}
function decorations(){
 const chimney=make('div','xmas-smoke');chimney.setAttribute('aria-hidden','true');
 for(let i=0;i<3;i++)chimney.appendChild(make('span'));mount(chimney);
 const lamp=make('div','xmas-lantern');lamp.setAttribute('aria-hidden','true');
 lamp.innerHTML='<svg viewBox="0 0 42 70" xmlns="http://www.w3.org/2000/svg"><path d="M21 0v12M14 14Q21 4 28 14" stroke="#443a2a" stroke-width="3" fill="none"/><path d="M8 20h26l2 34-8 9H14l-8-9z" fill="#7e552f" stroke="#3c2e20" stroke-width="3"/><path d="M12 25h19l1 26-8 8H17l-7-8z" fill="#fbc659"/><path d="M21 29q-10 13 0 24q11-12 0-24" fill="#fff4a9"/><path d="M21 22v40M8 22l27 33M34 22L7 55" stroke="#68462b" stroke-width="2"/><path d="M6 20q15-8 30 0" stroke="#fff" stroke-width="5" fill="none"/></svg>';
 mount(lamp);
}
function snowfall(){
 canvas=make('canvas');canvas.id='xmas-weather-layer';canvas.setAttribute('aria-hidden','true');mount(canvas);
 ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
 resizeFn=()=>{const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.8);
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
   flakes=Array.from({length:motion.matches?50:(w<760?110:175)},()=>({x:Math.random()*w,y:Math.random()*h,r:.8+Math.random()*3.1,v:.3+Math.random()*1.4,drift:Math.random()*1.2-.2,phase:Math.random()*6.3}));
 };
 resizeFn();addEventListener('resize',resizeFn,{passive:true});
 const draw=ts=>{if(!active)return;raf=requestAnimationFrame(draw);if(document.hidden)return;
   if(ts-last<(innerWidth<760?30:17))return;const dt=Math.min(2.2,(ts-last||16)/16);last=ts;
   ctx.clearRect(0,0,innerWidth,innerHeight);
   for(const f of flakes){if(!motion.matches){f.x+=(f.drift+Math.sin(ts/740+f.phase)*.18)*dt;f.y+=f.v*dt;if(f.y>innerHeight+8){f.y=-8;f.x=Math.random()*innerWidth}if(f.x>innerWidth+8)f.x=-8;if(f.x< -8)f.x=innerWidth+5}
   ctx.beginPath();ctx.fillStyle=f.r>2.8?'#fffafa89':'#ffffffe1';ctx.shadowColor='#fff';ctx.shadowBlur=f.r>2.8?5:0;ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fill();}
   ctx.shadowBlur=0;
   for(let i=bursts.length-1;i>=0;i--){const p=bursts[i];p.life-=dt;if(p.life<=0){bursts.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.07*dt;ctx.beginPath();ctx.fillStyle='#ffffffcc';ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}
 };
 raf=requestAnimationFrame(draw);
}
const interaction=event=>{if(!active||motion.matches)return;for(let i=0;i<12;i++){const a=i*Math.PI/6;bursts.push({x:event.clientX,y:event.clientY,vx:Math.cos(a)*(1+Math.random()*1.3),vy:Math.sin(a)*(1+Math.random()*1.3)-1,life:19+Math.random()*13,r:1+Math.random()*1.6})}};
function enable(){if(active)return;active=true;caps();children();decorations();snowfall();document.addEventListener('pointerdown',interaction,{passive:true});
 for(const delay of [450,1400,2500])setTimeout(()=>{if(active){caps();children()}},delay);
}
function disable(){if(!active)return;active=false;cancelAnimationFrame(raf);document.removeEventListener('pointerdown',interaction);
 if(resizeFn)removeEventListener('resize',resizeFn);owned.forEach(n=>n.remove());owned=[];document.querySelectorAll('.xmas-position-parent').forEach(n=>n.classList.remove('xmas-position-parent'));
 canvas=null;ctx=null;flakes=[];bursts=[];last=0;resizeFn=null;
}
function setTheme(value){
 if(value==='original')doc.removeAttribute('data-site-theme');else doc.dataset.siteTheme=value;
 try{localStorage.setItem(key,value)}catch(_){}
 document.querySelectorAll('.xmas-theme-options button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.xmasTheme===value)));
 sync();
}
function toolbar(){
 const root=make('div','xmas-theme-tool');root.setAttribute('data-test-only','');
 const trigger=make('button','xmas-theme-toggle');trigger.type='button';trigger.textContent='Тема ▾';trigger.setAttribute('aria-label','Выбрать тему тестового сайта');
 const options=make('div','xmas-theme-options');options.hidden=true;
 for(const [value,label] of [['original','Обычная'],['soft-dark','Soft Dark'],['christmas','Christmas']]){
   const b=make('button');b.type='button';b.textContent=label;b.dataset.xmasTheme=value;
   b.addEventListener('click',()=>{setTheme(value);options.hidden=true;trigger.setAttribute('aria-expanded','false')});options.appendChild(b);
 }
 trigger.setAttribute('aria-expanded','false');trigger.addEventListener('click',()=>{options.hidden=!options.hidden;trigger.setAttribute('aria-expanded',String(!options.hidden))});
 root.append(trigger,options);mount(root);document.addEventListener('keydown',e=>{if(e.key==='Escape'){options.hidden=true;trigger.setAttribute('aria-expanded','false')}});
}
function sync(){if(doc.dataset.siteTheme==='christmas')enable();else disable()}
function init(){
 toolbar();
 let theme='original';
 try{theme=localStorage.getItem(key)||theme}catch(_){}
 if(params.get('christmas')==='1')theme='christmas';
 else if(params.get('christmas')==='0')theme='original';
 else if(params.get('softdark')==='1')theme='soft-dark';
 if(!['original','soft-dark','christmas'].includes(theme))theme='original';
 setTheme(theme);
 new MutationObserver(changes=>{if(changes.some(c=>c.attributeName==='data-site-theme'))sync()}).observe(doc,{attributes:true,attributeFilter:['data-site-theme']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
