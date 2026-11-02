/* Site-wide read-only Deepsyq navigation. Home maintains its original sidebar.
   Mirrors the owner-approved neon Home groups; never invokes a provider or billing. */
(() => {
 if (!document.body || document.getElementById('sidebar') || document.getElementById('dsSiteSidebar')) return;
 const entries=[
  {section:'Home'},
  {label:'Home',icon:'⌂',url:'deepsyq.html',key:'home'},
  {section:'Creation'},
  {label:'Image',icon:'▧',url:'generate-studio.html?studio=image',key:'image'},
  {label:'Video',icon:'▷',url:'generate-studio.html?studio=video',key:'video'},
  {label:'Agent',icon:'✦',url:'ai-agents.html',key:'agents'},
  {label:'Virtual Pet',icon:'🐾',url:'virtual-pet.html',key:'pet'},
  {label:'Voice Agent',icon:'🎙',url:'voice-agent-preview.html',key:'voice'},
  {label:'Audio',icon:'♫',url:'generate-studio.html?studio=audio',key:'audio'},
  {section:'Tools'},
  {label:'Tools',icon:'⊞',url:'free-tools.html',key:'tools'},
  {label:'AI Apps',icon:'◇',url:'ai-apps.html',key:'apps'},
  {label:'Canvas',icon:'✎',url:'canvas.html',key:'canvas'},
  {label:'Video Uniquifier',icon:'▤',url:'index.html',key:'legacy'},
  {section:'Library'},
  {label:'Assets',icon:'▦',url:'generate-studio.html?view=history',key:'assets'},
  {label:'My Creations',icon:'▣',url:'generate-studio.html?view=history',key:'history'},
  {label:'History',icon:'◷',url:'generate-studio.html?view=history',key:'history'},
  {section:'Community'},
  {label:'Affiliate',icon:'↗',pending:true},
  {label:'Share',icon:'⇪',action:'share'},
  {label:'Inspiration',icon:'◌',url:'deepsyq.html#inspirationPreview',key:'inspiration'},
  {section:'More'},
  {label:'Pricing',icon:'＄',url:'pricing.html',key:'pricing'}
 ];
 const path=location.pathname.split('/').pop() || 'deepsyq.html';
 const query=new URLSearchParams(location.search);
 const active=path==='generate-studio.html'?
  (query.get('view')==='history'?'history':
   query.get('studio')==='video'?'video':
   ['audio','music'].includes(query.get('studio'))?'audio':'image'):
  path==='voice-agent-preview.html'?'voice':path==='virtual-pet.html'?'pet':path==='ai-agents.html'?'agents':path==='canvas.html'?'canvas':path==='ai-apps.html'?'apps':path==='inspiration.html'?'inspiration':
  ['pricing.html','ai-pricing.html'].includes(path)?'pricing':
  path==='index.html'?'legacy':
  ['free-tools.html','audio-studio.html','avatar-studio.html','mobile-utility.html',
   'photo-collage.html','simple-background-remover.html','smart-reminders.html','teleprompter.html'].includes(path)?'tools':'';
 const sidebar=document.createElement('aside');
 sidebar.id='dsSiteSidebar';sidebar.className='ds-site-sidebar';
 sidebar.setAttribute('aria-label','Deepsyq site navigation');
 const brand=document.createElement('a');brand.href='deepsyq.html';brand.className='ds-site-brand';
 const logo=document.createElement('img');logo.src='deepsyq-logo.png';logo.alt='';logo.width=30;logo.height=30;
 brand.append(logo,document.createTextNode('Deepsyq'));sidebar.append(brand);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Site pages');
 const shareStatus=document.createElement('div');shareStatus.className='ds-site-share-status';shareStatus.setAttribute('role','status');shareStatus.setAttribute('aria-live','polite');
 for(const entry of entries){
  if(entry.section){
   const cap=document.createElement('div');cap.className='ds-site-caption';cap.textContent=entry.section;
   nav.append(cap);continue;
  }
  const el=document.createElement(entry.pending?'span':entry.action?'button':'a');
  if(entry.pending){
   el.className='ds-site-pending';el.setAttribute('aria-label',entry.label+' coming soon');
   el.title=entry.label+' — coming soon';
  }else if(entry.action==='share'){
   el.type='button';el.className='ds-site-share';el.setAttribute('aria-label','Share Deepsyq');
   el.addEventListener('click',async()=>{
    const homeLink=new URL('deepsyq.html',location.href).href;
    shareStatus.textContent='';
    try{
     if(typeof navigator.share==='function'){await navigator.share({title:'Deepsyq',url:homeLink});return;}
     if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(homeLink);shareStatus.textContent='Link copied';return;}
    }catch(e){if(e?.name==='AbortError')return;}
    shareStatus.textContent=homeLink; // Selectable link when native sharing/copying is unavailable.
   });
  }else{
   el.href=entry.url;
   if(active===entry.key)el.setAttribute('aria-current','page');
  }
  const icon=document.createElement('span');icon.className='ds-icon';icon.setAttribute('aria-hidden','true');
  icon.textContent=entry.icon;
  el.append(icon,document.createTextNode(entry.label));
  if(entry.pending){const soon=document.createElement('small');soon.textContent='soon';el.append(soon);}
  nav.append(el);
 }
 nav.append(shareStatus);
 sidebar.append(nav);
 const foot=document.createElement('div');foot.className='ds-site-footer';
 const home=document.createElement('a');home.href='deepsyq.html';home.textContent='← Back to Deepsyq Home';
 const privacy=document.createElement('a');privacy.href='ai-privacy.html';privacy.textContent='Privacy';
 foot.append(home,privacy);sidebar.append(foot);
 const toggle=document.createElement('button');toggle.className='ds-site-mobile-toggle';toggle.type='button';
 toggle.textContent='☰';toggle.setAttribute('aria-label','Open Deepsyq navigation');
 toggle.setAttribute('aria-controls','dsSiteSidebar');toggle.setAttribute('aria-expanded','false');
 const scrim=document.createElement('div');scrim.className='ds-site-scrim';scrim.setAttribute('aria-hidden','true');
 // Inner-page mobile navigation is a real keyboard drawer, not a visual-only slide.
 // Never allow focus into offscreen links. Leave the desktop rail unaffected.
 const mobile=window.matchMedia('(max-width:900px)');
 let previousOverflow=null;
 const focusable=()=>[...sidebar.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
  .filter(el=>!el.hidden&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
 const isOpen=()=>mobile.matches&&document.body.classList.contains('ds-site-nav-open');
 const close=(restoreFocus=false)=>{
  const wasOpen=isOpen();
  document.body.classList.remove('ds-site-nav-open');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label','Open Deepsyq navigation');
  sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');
  if(previousOverflow!==null){document.body.style.overflow=previousOverflow;previousOverflow=null;}
  sidebar.inert=mobile.matches;
  if(wasOpen&&restoreFocus&&mobile.matches)toggle.focus({preventScroll:true});
 };
 const open=()=>{
  if(!mobile.matches)return;
  previousOverflow=document.body.style.overflow;
  sidebar.inert=false;
  sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');
  document.body.classList.add('ds-site-nav-open');
  document.body.style.overflow='hidden';
  toggle.setAttribute('aria-expanded','true');
  toggle.setAttribute('aria-label','Close Deepsyq navigation');
  focusable()[0]?.focus({preventScroll:true});
 };
 const syncViewport=()=>{
  if(!mobile.matches)close(false);
  else if(!isOpen())sidebar.inert=true;
 };
 toggle.addEventListener('click',()=>isOpen()?close(true):open());
 scrim.addEventListener('click',()=>close(true));
 document.addEventListener('keydown',e=>{
  if(!isOpen())return;
  if(e.key==='Escape'){e.preventDefault();close(true);return;}
  if(e.key!=='Tab')return;
  const items=focusable(),first=items[0],last=items.at(-1);
  if(!first)return;
  if(e.shiftKey&&(document.activeElement===first||!sidebar.contains(document.activeElement))){
   e.preventDefault();last.focus({preventScroll:true});
  }else if(!e.shiftKey&&(document.activeElement===last||!sidebar.contains(document.activeElement))){
   e.preventDefault();first.focus({preventScroll:true});
  }
 });
 sidebar.addEventListener('click',e=>{if(e.target.closest('a'))close(false);});
 if(typeof mobile.addEventListener==='function')mobile.addEventListener('change',syncViewport);
 else mobile.addListener(syncViewport);
 syncViewport();
 document.body.classList.add('deepsyq-sitewide-shell');
 document.body.prepend(scrim,toggle,sidebar);
})();
