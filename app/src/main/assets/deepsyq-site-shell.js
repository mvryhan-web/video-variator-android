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
  {label:'Agent',icon:'✦',pending:true},
  {label:'Audio',icon:'♫',url:'generate-studio.html?studio=audio',key:'audio'},
  {section:'Tools'},
  {label:'AI Apps',icon:'◇',url:'ai-apps.html',key:'apps'},
  {label:'Canvas',icon:'✎',url:'canvas.html',key:'canvas'},
  {label:'All Tools',icon:'⊞',url:'free-tools.html',key:'tools'},
  {label:'Video Uniquifier',icon:'▤',url:'index.html',key:'legacy'},
  {section:'Library'},
  {label:'Assets',icon:'▦',url:'generate-studio.html?view=history',key:'assets'},
  {label:'My Creations',icon:'▣',url:'generate-studio.html?view=history',key:'history'},
  {section:'Community'},
  {label:'Inspiration',icon:'◌',url:'deepsyq.html#inspirationPreview',key:'inspiration'},
  {label:'Affiliate',icon:'↗',pending:true},
  {section:'More'},
  {label:'Pricing',icon:'＄',url:'pricing.html',key:'pricing'}
 ];
 const path=location.pathname.split('/').pop() || 'deepsyq.html';
 const query=new URLSearchParams(location.search);
 const active=path==='generate-studio.html'?
  (query.get('view')==='history'?'history':
   query.get('studio')==='video'?'video':
   ['audio','music'].includes(query.get('studio'))?'audio':'image'):
  path==='canvas.html'?'canvas':path==='ai-apps.html'?'apps':path==='inspiration.html'?'inspiration':
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
 for(const entry of entries){
  if(entry.section){
   const cap=document.createElement('div');cap.className='ds-site-caption';cap.textContent=entry.section;
   nav.append(cap);continue;
  }
  const el=document.createElement(entry.pending?'span':'a');
  if(entry.pending){
   el.className='ds-site-pending';el.setAttribute('aria-label',entry.label+' coming soon');
   el.title=entry.label+' — coming soon';
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
 sidebar.append(nav);
 const foot=document.createElement('div');foot.className='ds-site-footer';
 const home=document.createElement('a');home.href='deepsyq.html';home.textContent='← Back to Deepsyq Home';
 const privacy=document.createElement('a');privacy.href='ai-privacy.html';privacy.textContent='Privacy';
 foot.append(home,privacy);sidebar.append(foot);
 const toggle=document.createElement('button');toggle.className='ds-site-mobile-toggle';toggle.type='button';
 toggle.textContent='☰';toggle.setAttribute('aria-label','Open Deepsyq navigation');
 toggle.setAttribute('aria-controls','dsSiteSidebar');toggle.setAttribute('aria-expanded','false');
 const scrim=document.createElement('div');scrim.className='ds-site-scrim';scrim.setAttribute('aria-hidden','true');
 const close=()=>{document.body.classList.remove('ds-site-nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open Deepsyq navigation');};
 toggle.addEventListener('click',()=>{
  const open=!document.body.classList.contains('ds-site-nav-open');
  document.body.classList.toggle('ds-site-nav-open',open);toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close Deepsyq navigation':'Open Deepsyq navigation');
 });
 scrim.addEventListener('click',close);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 sidebar.addEventListener('click',e=>{if(e.target.closest('a'))close();});
 document.body.classList.add('deepsyq-sitewide-shell');
 document.body.prepend(scrim,toggle,sidebar);
})();
