/* DEEPSYQ Themes V1 — isolated TEST design, original product functionality preserved.
   Theme preference is local-only. No API calls, account writes or AI requests. */
(()=>{
  'use strict';
  const KEY='deepsyq-themes-v1';
  const THEMES=[
    {id:'original',name:'Original DEEPSYQ',colors:['#121329','#7139e7','#2cc5db']},
    {id:'warm-light',name:'Warm Light',colors:['#f4f0e8','#fffdf8','#a66b34']},
    {id:'focus',name:'Focus',colors:['#151d27','#202b37','#a5c7c3']},
    {id:'soft-dark',name:'Soft Dark',colors:['#050505','#121212','#c6b1e9']},
    {id:'christmas',name:'Christmas / New Year',colors:['#101d2a','#355a4d','#e7c18a']}
  ];
  const NAMES=Object.fromEntries(THEMES.map(t=>[t.id,t.name]));
  const DESCRIPTIONS={
    en:['Original website design','Warm, bright and comfortable','Calm creative workspace',
        'Deep black premium look','Cozy winter holiday'],
    ru:['Исходный дизайн сайта','Тёплая и уютная','Спокойный рабочий режим',
        'Глубокая чёрная тема','Новогодняя атмосфера'],
    fr:['Design original du site','Clair, doux et chaleureux','Espace de travail apaisant',
        'Noir profond et élégant','Ambiance hivernale'],
    es:['Diseño original del sitio','Cálido, claro y acogedor','Espacio de trabajo tranquilo',
        'Negro intenso y elegante','Ambiente navideño']
  };
  const DICT={
    en:{label:'Theme',change:'Choose appearance'},
    ru:{label:'Тема',change:'Выбрать оформление'},
    fr:{label:'Thème',change:'Choisir un thème'},
    es:{label:'Tema',change:'Elegir un tema'}
  };
  const valid=id=>THEMES.some(t=>t.id===id);
  const root=document.documentElement;
  function stored(){
    try {const selected=localStorage.getItem(KEY);return valid(selected)?selected:'original';}
    catch{return 'original';}
  }
  let mode=valid(root.dataset.deepsyqTheme)?root.dataset.deepsyqTheme:stored();
  root.dataset.deepsyqTheme=mode;
  let holder=null,button=null,menu=null,canvas=null,context=null,raf=0;
  let snow=[],last=0,active=false,screenW=0,screenH=0;
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const lang=()=>{
    const value=(document.documentElement.lang||navigator.language||'en').toLowerCase();
    if(value.startsWith('ru')||value.startsWith('uk'))return 'ru';
    if(value.startsWith('fr'))return 'fr';
    if(value.startsWith('es'))return 'es';
    return 'en';
  };
  const text=()=>DICT[lang()];
  function setTheme(id){
    if(!valid(id))return;
    mode=id;root.dataset.deepsyqTheme=id;
    try{localStorage.setItem(KEY,id)}catch{}
    updateControls();
    updateSnow();
  }
  function updateControls(){
    if(!button||!menu)return;
    button.setAttribute('aria-label',text().change+': '+NAMES[mode]);
    button.title=text().change+': '+NAMES[mode];
    const label=button.querySelector('.ds-theme-current');
    if(label)label.textContent=NAMES[mode];
    menu.querySelectorAll('button[data-theme-id]').forEach(option=>{
      const checked=option.dataset.themeId===mode;
      option.setAttribute('aria-checked',String(checked));
      option.setAttribute('aria-label',option.dataset.themeTitle+(checked?', selected':''));
      const indicator=option.querySelector('.ds-theme-check');
      if(indicator)indicator.setAttribute('aria-hidden','true');
    });
  }
  function closeMenu(restore=false){
    if(!menu)return;
    menu.hidden=true;button?.setAttribute('aria-expanded','false');
    if(restore)button?.focus();
  }
  function positionMenu(){
    if(!menu||!button)return;
    const rect=button.getBoundingClientRect();
    const width=Math.min(294,Math.max(230,window.innerWidth-16));
    const left=Math.max(8,Math.min(window.innerWidth-width-8,rect.right-width));
    const height=Math.min(400,menu.scrollHeight||400);
    const proposed=rect.bottom+8;
    const top=proposed+height>window.innerHeight-8?
      Math.max(8,rect.top-height-8):proposed;
    menu.style.position='fixed';
    menu.style.width=width+'px';
    menu.style.left=left+'px';
    menu.style.right='auto';
    menu.style.top=top+'px';
    menu.style.zIndex='2147483000';
  }
  function openMenu(){
    if(!menu)return;
    menu.hidden=false;button.setAttribute('aria-expanded','true');
    positionMenu();
    menu.querySelector('button[aria-checked="true"]')?.focus();
  }
  const palette=t=>{
    const box=document.createElement('span');box.className='ds-theme-palette';box.setAttribute('aria-hidden','true');
    for(const color of t.colors){const chip=document.createElement('span');chip.style.backgroundColor=color;box.appendChild(chip);}
    return box;
  };
  function mount(){
    if(button?.isConnected)return;
    holder=document.createElement('div');
    holder.className='ds-theme-anchor';
    holder.dataset.designPreview='themes-v1';
    const rec=document.querySelector('.home-hero-recommended');
    if(rec?.parentElement&&rec.getBoundingClientRect().width>0){
      rec.parentElement.insertBefore(holder,rec);
      holder.appendChild(rec);
    }else{
      holder.classList.add('ds-theme-floating');
      document.body.appendChild(holder);
    }
    const control=document.createElement('div');control.className='ds-theme-control';
    button=document.createElement('button');
    button.type='button';button.id='dsThemeButton';button.className='ds-theme-button';
    button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
    button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1.6a2 2 0 0 0 1.3-3.6c-.9-.8-.5-2 .5-2.5A3 3 0 0 0 18 9a6.5 6.5 0 0 0-6-6Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="6.6" r="1"/><circle cx="16" cy="8.5" r="1"/><circle cx="8.5" cy="16" r="1"/></svg><span class="ds-theme-current"></span>';
    menu=document.createElement('div');menu.id='dsThemeMenu';menu.className='ds-theme-menu';menu.role='menu';menu.hidden=true;
    menu.setAttribute('aria-label',text().change);
    THEMES.forEach((theme,index)=>{
      const option=document.createElement('button');
      option.type='button';option.role='menuitemradio';option.className='ds-theme-option';
      option.dataset.themeId=theme.id;option.dataset.themeTitle=theme.name;
      option.setAttribute('aria-checked',String(theme.id===mode));
      const caption=document.createElement('span');caption.className='ds-theme-option-content';
      const strong=document.createElement('strong');strong.textContent=theme.name;
      const small=document.createElement('small');small.textContent=DESCRIPTIONS[lang()][index];
      caption.append(strong,small);
      const check=document.createElement('span');check.className='ds-theme-check';check.textContent='✓';check.setAttribute('aria-hidden','true');
      option.append(palette(theme),caption,check);
      option.addEventListener('click',()=>{setTheme(theme.id);closeMenu(true);});
      option.addEventListener('keydown',e=>{
        if(e.key==='Escape'){e.preventDefault();closeMenu(true);}
        if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
          e.preventDefault();
          const items=[...menu.querySelectorAll('.ds-theme-option')];let current=items.indexOf(option);
          const target=e.key==='Home'?0:e.key==='End'?items.length-1:
            (current+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
          items[target].focus();
        }
      });
      menu.appendChild(option);
    });
    button.setAttribute('aria-controls','dsThemeMenu');
    button.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
    button.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){
        if(!menu.hidden)return;
        e.preventDefault();openMenu();
      }else if(e.key==='Escape'&&!menu.hidden){closeMenu(true);}
    });
    control.append(button);holder.appendChild(control);
    // Portal: existing mobile creative-tools rails must never obscure theme choices.
    document.body.appendChild(menu);
    document.addEventListener('pointerdown',e=>{
      if(holder&&!holder.contains(e.target)&&menu&&!menu.contains(e.target))closeMenu();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)closeMenu(true)});
    window.addEventListener('storage',e=>{if(e.key===KEY)setTheme(stored())});
    updateControls();
    registerSnowCapInteractions();
    updateSnow();
  }
  function registerSnowCapInteractions(){
    for(const sel of ['#homeHeroCarousel','#homeQuickForm','#jChatForm']){
      const element=document.querySelector(sel);
      if(!element||element.dataset.dsSnowBound)return;
      element.dataset.dsSnowBound='1';
      element.addEventListener('pointerdown',e=>{
        if(mode!=='christmas'||reduce?.matches||e.button>0)return;
        if(e.target.closest('button,input,textarea,select,a,[role="button"]'))return;
        const r=element.getBoundingClientRect();
        if(e.clientY<r.top||e.clientY>r.top+34)return;
        const fragment=document.createElement('span');fragment.className='ds-snow-burst';
        fragment.style.left=(e.clientX-r.left)+'px';fragment.style.top=(e.clientY-r.top)+'px';
        for(let i=0;i<11;i++){
          const fleck=document.createElement('span');fleck.className='ds-snow-fleck';
          const a=(i*2.39996),dist=11+(i%5)*7;
          fleck.style.setProperty('--ds-fx',(Math.cos(a)*dist).toFixed(1)+'px');
          fleck.style.setProperty('--ds-fy',(-9-Math.abs(Math.sin(a)*dist)).toFixed(1)+'px');
          fleck.style.animationDelay=(i*18)+'ms';
          fragment.appendChild(fleck);
        }
        element.appendChild(fragment);
        window.setTimeout(()=>fragment.remove(),1450);
      },{passive:true});
    }
  }
  function resizeSnow(){
    if(!canvas||!context)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    screenW=window.innerWidth;screenH=window.innerHeight;
    canvas.width=Math.ceil(screenW*dpr);canvas.height=Math.ceil(screenH*dpr);
    canvas.style.width=screenW+'px';canvas.style.height=screenH+'px';
    context.setTransform(dpr,0,0,dpr,0,0);
    const count=screenW<600?18:38;
    const random=()=>Math.random();
    snow=Array.from({length:count},()=>({
      x:random()*screenW,y:random()*screenH,r:0.75+random()*2.2,
      speed:.35+random()*.8,drift:.15+random()*.24,phase:random()*6.28,
      opacity:.23+random()*.45
    }));
  }
  function drawSnow(time){
    if(!active||!context)return;
    const delta=Math.min(2,Math.max(.3,(time-last)/16.67||1));last=time;
    context.clearRect(0,0,screenW,screenH);
    for(const f of snow){
      f.y+=f.speed*delta;f.x+=Math.sin(time*.0006+f.phase)*f.drift*delta;
      if(f.y>screenH+5){f.y=-5;f.x=Math.random()*screenW}
      if(f.x>screenW+5)f.x=-5;if(f.x<-5)f.x=screenW+5;
      context.beginPath();context.fillStyle='rgba(240,251,255,'+f.opacity+')';
      context.arc(f.x,f.y,f.r,0,Math.PI*2);context.fill();
    }
    raf=requestAnimationFrame(drawSnow);
  }
  function syncSnowRidges(christmas){
    for(const selector of ['#homeHeroCarousel','#homeQuickForm','#jChatForm']){
      const element=document.querySelector(selector);
      if(!element)continue;
      const existing=element.querySelector(':scope > .ds-snow-ridge');
      if(christmas&&!existing){
        const ridge=document.createElement('span');
        ridge.className='ds-snow-ridge';
        ridge.setAttribute('aria-hidden','true');
        element.appendChild(ridge);
      }else if(!christmas&&existing){existing.remove();}
    }
  }
  function updateSnow(){
    const christmas=mode==='christmas';
    syncSnowRidges(christmas);
    let backdrop=document.getElementById('dsChristmasBackdrop');
    if(christmas&&!backdrop){
      backdrop=document.createElement('div');backdrop.id='dsChristmasBackdrop';
      backdrop.setAttribute('aria-hidden','true');
      document.body.insertBefore(backdrop,document.body.firstChild);
    }else if(!christmas&&backdrop){backdrop.remove();}
    const shouldAnimate=christmas&&!reduce?.matches&&!document.hidden;
    if(!shouldAnimate){
      active=false;cancelAnimationFrame(raf);raf=0;last=0;
      canvas?.remove();canvas=null;context=null;return;
    }
    if(!canvas){
      canvas=document.createElement('canvas');
      canvas.id='dsSnowfallCanvas';canvas.setAttribute('aria-hidden','true');
      document.body.appendChild(canvas);
      context=canvas.getContext('2d',{alpha:true});
      if(context)resizeSnow();
    }
    if(!context){canvas?.remove();canvas=null;return;}
    if(!active){active=true;last=performance.now();raf=requestAnimationFrame(drawSnow);}
  }
  document.addEventListener('visibilitychange',updateSnow);
  window.addEventListener('resize',()=>{if(canvas)resizeSnow();if(menu&&!menu.hidden)positionMenu()},{passive:true});
  reduce?.addEventListener?.('change',updateSnow);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  window.addEventListener('pageshow',()=>{
    if(document.body&&!button?.isConnected)mount();
    else if(stored()!==mode)setTheme(stored());
  });
})();
