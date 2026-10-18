/* Shared visual navigation for secondary pages; Home owns its own sidebar. */
(() => {
 if (!document.body || document.getElementById('sidebar') || document.getElementById('dsSiteSidebar')) return;
 const links=[
 ['Home','⌂','deepsyq.html','home'],['Image','▧','generate-studio.html?studio=image','image'],
 ['Video','▷','generate-studio.html?studio=video','video'],['Audio','♫','generate-studio.html?studio=audio','audio'],
 ['Tools','⊞','free-tools.html','tools'],['AI Apps','◇','ai-apps.html','apps'],
 ['Canvas','✎','deepsyq.html#canvasFeature','canvas'],['Video Uniquifier','▤','index.html','legacy'],
 ['Inspiration','◌','inspiration.html','inspiration'],['Assets','▦','deepsyq.html#recentCreations','assets'],
 ['Pricing','＄','ai-pricing.html','pricing']
 ];
 const path=location.pathname.split('/').pop() || 'deepsyq.html';
 const studio=new URLSearchParams(location.search).get('studio') || '';
 const active=path==='generate-studio.html'?(studio==='video'?'video':studio==='audio'||studio==='music'?'audio':'image'):
 path==='ai-apps.html'?'apps':path==='inspiration.html'?'inspiration':path==='ai-pricing.html'?'pricing':
 ['free-tools.html','audio-studio.html','avatar-studio.html','mobile-utility.html'].includes(path)?'tools':'';
 const sidebar=document.createElement('aside');sidebar.id='dsSiteSidebar';sidebar.className='ds-site-sidebar';
 sidebar.setAttribute('aria-label','Deepsyq site navigation');
 const brand=document.createElement('a');brand.href='deepsyq.html';brand.className='ds-site-brand';
 const logo=document.createElement('img');logo.src='deepsyq-logo.png';logo.alt='';logo.width=30;logo.height=30;
 brand.append(logo,document.createTextNode('Deepsyq'));sidebar.append(brand);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Site pages');
 links.forEach(([label,icon,url,key],i)=>{
   if(i===1||i===4){const cap=document.createElement('div');cap.className='ds-site-caption';
    cap.textContent=i===1?'CREATION':'EVERYDAY TOOLS';nav.append(cap);}
   const link=document.createElement('a');link.href=url;const span=document.createElement('span');
   span.className='ds-icon';span.setAttribute('aria-hidden','true');span.textContent=icon;
   link.append(span,document.createTextNode(label));if(active===key)link.setAttribute('aria-current','page');
   nav.append(link);
 });
 sidebar.append(nav);
 const foot=document.createElement('div');foot.className='ds-site-footer';const home=document.createElement('a');
 home.href='deepsyq.html';home.textContent='← Back to Deepsyq Home';foot.append(home);sidebar.append(foot);
 const button=document.createElement('button');button.className='ds-site-mobile-toggle';button.type='button';
 button.textContent='☰';button.setAttribute('aria-label','Open Deepsyq navigation');
 button.setAttribute('aria-controls','dsSiteSidebar');button.setAttribute('aria-expanded','false');
 const scrim=document.createElement('div');scrim.className='ds-site-scrim';scrim.setAttribute('aria-hidden','true');
 const close=()=>{document.body.classList.remove('ds-site-nav-open');button.setAttribute('aria-expanded','false');
 button.setAttribute('aria-label','Open Deepsyq navigation');};
 button.addEventListener('click',()=>{const open=!document.body.classList.contains('ds-site-nav-open');
 document.body.classList.toggle('ds-site-nav-open',open);button.setAttribute('aria-expanded',String(open));
 button.setAttribute('aria-label',open?'Close Deepsyq navigation':'Open Deepsyq navigation');});
 scrim.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 sidebar.addEventListener('click',e=>{if(e.target.closest('a'))close()});
 document.body.classList.add('deepsyq-sitewide-shell');document.body.prepend(scrim,button,sidebar);
})();
