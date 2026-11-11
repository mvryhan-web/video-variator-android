import {applyCanonicalNavIcons} from './deepsyq-canonical-nav-icons.js';
import {installApprovedJarvixOrb} from './jarvix-approved-orb.js';
import {installUnifiedPlatformHeader} from './deepsyq-unified-platform-header.js';
// Owner mobile reference, 2026-11-05. Keep existing buttons and their handlers.
export function drawerSwipe(start, end, open, width) {
  if (!start || Math.abs(end.y - start.y) > 45 || end.time - start.time > 700) return null;
  const distance = end.x - start.x;
  if (!open && start.x <= 24 && distance > 65) return 'open';
  if (open && start.x < width && distance < -65) return 'close';
  return null;
}

export function headerAccount(token, lang='en') {
 const labels=token?{en:'Account',ru:'Аккаунт',fr:'Compte',es:'Cuenta'}:{en:'Log in',ru:'Войти',fr:'Connexion',es:'Acceder'};
 return {label:labels[lang]||labels.en,href:token?'video-uniquifier.html#profile':'deepsyq.html?panel=login'};
}
function setupMobileShell() {
  if(/\/(?:deepsyq|jarvix-chat|generate-studio)\.html$/.test(location.pathname)||location.pathname==='/'){
    document.body.classList.add('j-action-workspace');
    if(!document.querySelector('link[href="jarvix-action-design.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='jarvix-action-design.css';if(matchMedia('(min-width:761px)').matches)css.setAttribute('blocking','render');document.head.append(css);}
  }

  if (document.body.dataset.mobileShell) return;
  // DEEPSYQ owns the Video Uniquifier shell; never select the former VU appbar.
  const header = document.querySelector('.ds-platform-header') ||
    (location.pathname.endsWith('/index.html') ? document.querySelector('.vu-appbar')
    : document.querySelector('.vu-appbar') || document.querySelector('header:has(#topJarvisBtn)'));
  const sidebar = document.querySelector('#sidebar, #dsSiteSidebar, .shell>.sidebar');
  const toggle = document.querySelector('#menu, .ds-site-mobile-toggle, .vu-nav-toggle, #menuBtn');
  if (!header || !sidebar || !toggle) return;
  document.body.dataset.mobileShell = 'ready';
  header.classList.add('ds-stable-header');sidebar.classList.add('ds-stable-sidebar');
  // GO stage02: one stable header on every route. Sticky is clipped when an
  // inner page container is short (e.g. Everyday Tools), so use a measured
  // desktop fixed header and a flow spacer. Mobile keeps its existing fixed
  // header and original safe-area spacer. Do not move/replace any controls.
  const chromeSlot=document.createElement('div');
  chromeSlot.className='ds-desktop-header-spacer';
  chromeSlot.setAttribute('aria-hidden','true');
  header.before(chromeSlot);
  let chromeFrame=0;
  const sizePinnedHeader=()=>{
    if(matchMedia('(max-width:760px)').matches){
      header.classList.remove('ds-hard-fixed');chromeSlot.hidden=true;
      header.style.removeProperty('--ds-chrome-left');
      header.style.removeProperty('--ds-chrome-width');
      return;
    }
    chromeSlot.hidden=false;
    const box=chromeSlot.getBoundingClientRect();
    const h=Math.max(48,Math.ceil(header.getBoundingClientRect().height)||68);
    const left=Math.round(box.width?box.left:header.getBoundingClientRect().left);
    const width=Math.round(box.width||header.parentElement?.getBoundingClientRect().width||innerWidth-left);
    chromeSlot.style.height=h+'px';
    if(width>0){
      header.style.setProperty('--ds-chrome-left',left+'px');
      header.style.setProperty('--ds-chrome-width',width+'px');
      header.classList.add('ds-hard-fixed');
    }
  };
  const queuePin=()=>{
    if(chromeFrame)cancelAnimationFrame(chromeFrame);
    chromeFrame=requestAnimationFrame(()=>{chromeFrame=0;sizePinnedHeader();});
  };
  window.addEventListener('resize',queuePin);
  window.addEventListener('pageshow',queuePin);
  new ResizeObserver(queuePin).observe(chromeSlot);
  // Pin immediately as well as after paint; WebKit can defer first animation
  // frame when its emulated mobile viewport is being resized during testing.
  sizePinnedHeader();
  queuePin();
  if (!document.querySelector('link[href="deepsyq-mobile-shell.css"]')) {const css=document.createElement('link');css.rel='stylesheet';css.href='deepsyq-mobile-shell.css';if(matchMedia('(min-width:761px)').matches)css.setAttribute('blocking','render');document.head.append(css);}

  // Only the global header search is removed; template/tool searches remain useful.
  document.querySelectorAll('.home-global-search, .vu-search').forEach(el => el.remove());
  header.querySelectorAll('form:has(input[type="search"])').forEach(el => el.remove());

  const words = {
    en: ['Download JARVIX', 'Pricing', 'Log in', 'Take a Tour'],
    ru: ['Скачать JARVIX', 'Тарифы', 'Войти', 'Экскурсия'],
    fr: ['Télécharger JARVIX', 'Tarifs', 'Connexion', 'Visite guidée'],
    es: ['Descargar JARVIX', 'Precios', 'Acceder', 'Visita guiada']
  };
  const locale = () => {
    try {
      const saved = localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang');
      if (saved) return saved;
      const raw = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
      if (raw.startsWith('ru') || raw.startsWith('uk') || raw.startsWith('be')) return 'ru';
      if (raw.startsWith('fr')) return 'fr';
      if (raw.startsWith('es')) return 'es';
      return document.documentElement.lang.split('-')[0] || 'en';
    } catch { return document.documentElement.lang.split('-')[0] || 'en'; }
  };
  const copy = () => words[locale()] || words.en;
  // Desktop keeps the original Home actions and their existing event handlers.
  // Mobile has its own Tools/Tour controls; it hides the legacy actions in CSS.
  document.getElementById('topPromo')?.remove();
  const invite=document.getElementById('topInvite');
  if(invite){invite.classList.add('ds-invite-entry');(sidebar.querySelector('.sidebar-bottom')||sidebar).append(invite);}
  const language=document.getElementById('homeLanguage');
  if(language)for(const option of language.options)option.textContent=option.value.toUpperCase();
  // One small footer directly below Pricing in the already-existing left menu.
  // Reuse Home's working Invite Friends button; other pages go to the same invitation dialog.
  const extras=document.createElement('div');extras.className='ds-owner-sidebar-extras';
  const friend=invite||document.createElement('a');
  if(!invite){friend.href='deepsyq.html?panel=invite';friend.textContent='Invite Friends';}
  friend.classList.add('ds-owner-sidebar-invite');
  extras.append(friend);
  const homeLanguageWrap=language?.closest('label');
  if(!homeLanguageWrap){
    const languageSelect=document.createElement('select');
    languageSelect.className='ds-owner-sidebar-language';
    languageSelect.setAttribute('aria-label','Language');
    for(const [value,label] of [['ru','Русский'],['en','English'],['fr','Français'],['es','Español']]){
      const option=document.createElement('option');option.value=value;option.textContent=label;languageSelect.append(option);
    }
    const readLanguage=()=>localStorage.getItem('deepsyq_home_language')||localStorage.getItem('deepsyq_lang')||'en';
    languageSelect.value=readLanguage();
    languageSelect.addEventListener('change',()=>{
      localStorage.setItem('deepsyq_home_language',languageSelect.value);
      localStorage.setItem('deepsyq_lang',languageSelect.value);
      window.dispatchEvent(new Event('deepsyq:lang'));
    });
    window.addEventListener('deepsyq:lang',()=>{languageSelect.value=readLanguage()});
    extras.append(languageSelect);
  }
  const icons=document.createElement('div');icons.className='ds-owner-social-icons';
  icons.setAttribute('aria-label','Social networks');
  const artwork={
    discord:'<path d="M7 7c3-1.5 7-1.5 10 0l2 9c-1 1.4-2.3 2.4-4 3l-.8-1.5M7 7L5 16c1 1.4 2.3 2.4 4 3l.8-1.5M8.5 16.5c2.4 1.2 4.6 1.2 7 0"/><circle cx="9" cy="13" r=".8" fill="currentColor"/><circle cx="15" cy="13" r=".8" fill="currentColor"/>',
    x:'<path d="M4.5 3.5h3.3l11.7 17h-3.3zM19 3.5L5 20.5"/>',
    instagram:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.5" cy="6.6" r=".9" fill="currentColor"/>',
    facebook:'<path d="M14.8 20V12h3l.5-3.6h-3.5V6.1c0-1 .4-1.6 1.7-1.6H19V1.3c-.5-.1-1.5-.2-2.9-.2C13.3 1.1 11.5 2.8 11.5 5.9v2.5H9V12h2.5v8z" fill="currentColor" stroke="none"/>'
  };
  const homeURL=new URL('deepsyq.html',location.href).href;
  const destinations={
    discord:'https://discord.com/channels/@me',
    x:'https://twitter.com/intent/tweet?text='+encodeURIComponent('Create with Deepsyq')+'&url='+encodeURIComponent(homeURL),
    instagram:'https://www.instagram.com/',
    facebook:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(homeURL)
  };
  for(const [key,label] of [['discord','Discord'],['x','X'],['instagram','Instagram'],['facebook','Facebook']]){
    const link=document.createElement('a');
    link.className='ds-owner-social-link';link.href=destinations[key];
    link.target='_blank';link.rel='noopener noreferrer';link.title=label;
    link.setAttribute('aria-label',label+' — share Deepsyq');
    link.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+artwork[key]+'</svg>';
    if(key==='discord'||key==='instagram')link.addEventListener('click',()=>navigator.clipboard?.writeText(homeURL).catch(()=>{}));
    icons.append(link);
  }
  extras.append(icons);
  const siteNav=sidebar.querySelector('nav');
  if(siteNav)siteNav.after(extras);else sidebar.append(extras);


  const brand = document.createElement('a');
  brand.href = 'deepsyq.html'; brand.className = 'ds-mobile-brand'; brand.setAttribute('aria-label', 'Deepsyq Home');
  brand.innerHTML = '<img src="deepsyq-logo.png" width="30" height="30" alt=""><span>Deepsyq</span>';
  const controls = document.createElement('div'); controls.className = 'ds-mobile-controls';
  const left = document.createElement('div'), right = document.createElement('div');
  left.className = 'ds-mobile-control-left'; right.className = 'ds-mobile-control-right';
  controls.append(left, right);
  const spacer = document.createElement('div'); spacer.className = 'ds-mobile-header-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  const scrim = document.createElement('button'); scrim.type = 'button'; scrim.className = 'ds-mobile-dismiss';
  scrim.setAttribute('aria-label', 'Close navigation'); scrim.hidden = true;
  document.body.append(scrim);

  const link = (text, href, className) => {
    const el = document.createElement('a'); el.textContent = text; el.href = href; el.className = className; return el;
  };
  const tools = link(copy()[0], 'jarvix-download.html', 'ds-header-tools');
  const tour = document.createElement('button');tour.type='button';tour.id='dsTakeTour';tour.textContent=copy()[3];tour.className='ds-header-tour';
  tour.addEventListener('click', async () => {tour.disabled=true;try{const guide=await import('./jarvix-guided-tour.js');guide.startJarvixGuidedTour();}catch{tour.textContent='Tour unavailable';}finally{tour.disabled=false;}});
  const desktopActions=document.createElement('div');desktopActions.className='ds-desktop-actions';desktopActions.append(tour);
  const orb=document.getElementById('topJarvisBtn');if(orb)orb.after(desktopActions);else header.append(desktopActions);
  const pricing = document.getElementById('topPricing') || link(copy()[1], 'pricing.html', '');
  if(!pricing.id){pricing.id='topPricing';desktopActions.append(pricing);}
  const login = document.getElementById('topLogin') || link(copy()[2], 'deepsyq.html?panel=login', '');
  // Give the existing synthesized account link the same stable hook as Home.
  // This does not create a duplicate or change login's click/navigation action.
  if(!login.id)login.id='topLogin';
  if(!login.isConnected)desktopActions.append(login);
  desktopActions.prepend(tools);
  const legacyDesktopCredit = document.body.classList.contains('j-action-workspace') || document.body.classList.contains('ds-embedded-uniquifier');
  {
    // Owner 07 Nov: reuse the same mobile AI Credit beside All tools on EVERY route.
    // The desktop credit stays exactly as it was: only legacy workspaces receive this extra.
    // Owner 07 Nov: no AI Apps header pill. Its position beside the orb
    // belongs to the working AI Credit link; Tour moves to the other side.
    const balance=link('⚡ AI Credit','pricing.html#credits','ds-header-credit');
    balance.setAttribute('aria-label','AI Credit');
    const updateCredit=async()=>{const token=localStorage.getItem('vv_token');balance.textContent='⚡ AI Credit';balance.removeAttribute('title');if(!token)return;try{const r=await fetch('/api/ai-wallet/balance',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!r.ok)return;const data=await r.json();if(token===localStorage.getItem('vv_token')&&Number.isSafeInteger(data.available)&&data.available>=0)balance.title='Available AI credits: '+data.available.toLocaleString();}catch{}};
    void updateCredit();window.addEventListener('storage',e=>{if(e.key==='vv_token')void updateCredit();});
    const placeExtras=()=>{
      if(document.body.classList.contains('ds-mobile-layout')){
        if(balance.parentElement!==left)left.append(balance);
      }else if(balance.closest('.ds-header-pod-right')){
        return; // Existing desktop shared header continues to own its credit.
      }else if(legacyDesktopCredit && !document.getElementById('walletButton')){
        if(balance.parentElement!==desktopActions)desktopActions.insertBefore(balance,tour);
      }else balance.remove();
    };
    new MutationObserver(placeExtras).observe(document.body,{attributes:true,attributeFilter:['class']});placeExtras();
  }
  const reused = [toggle, tools, tour, pricing, login, ...(homeLanguageWrap ? [homeLanguageWrap] : [])];
  const saved = new Map();
  const move = (el, parent) => {
    if (el.parentNode) { const marker = document.createComment('mobile header slot'); el.before(marker); saved.set(el, marker); }
    parent.append(el);
  };
  function refresh() {
    if (document.body.classList.contains("ds-unified-platform")) { return; }
    const labels = copy();
    tools.textContent=document.body.classList.contains('ds-embedded-uniquifier')?'Everyday Tools':labels[0];tour.textContent=labels[3];
    if (!document.getElementById('topPricing')) pricing.textContent = labels[1];
    let token='';try{token=localStorage.getItem('vv_token')||'';}catch{}
    const account=headerAccount(token,locale());login.textContent=account.label;if(login.tagName==='A')login.href=account.href;
  }
  window.addEventListener('deepsyq:lang', refresh);
  window.addEventListener('storage',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('focus',refresh);refresh();

  if(document.body.classList.contains('ds-embedded-uniquifier')){
    const localeSelect=header.querySelector('#homeLanguage');
    if(localeSelect){
      localeSelect.value=['en','ru','fr','es'].includes(locale())?locale():'en';
      localeSelect.addEventListener('change',()=>{
        localStorage.setItem('deepsyq_home_language',localeSelect.value);
        window.dispatchEvent(new Event('deepsyq:lang'));
        refresh();
      });
    }
    // On desktop reuse the existing platform navigation button, never VU menu.
    document.querySelector('.ds-site-mobile-toggle')?.addEventListener('click',()=>{
      if(matchMedia('(min-width:901px)').matches){
        document.body.classList.toggle('ds-vu-nav-collapsed');
      }
    });
  }

  const mobile = matchMedia('(max-width:760px)');
  let mounted = false;
  const isOpen = () => document.body.classList.contains('menu-open') || document.body.classList.contains('ds-site-nav-open') || document.body.classList.contains('vu-nav-open') || sidebar.classList.contains('open');
  const syncDrawer = () => {
    const open = mobile.matches && isOpen();
    document.body.classList.toggle('ds-mobile-drawer-open', open);
    scrim.hidden = !open;
    controls.inert = open; brand.inert = open;
    if (mobile.matches) sidebar.inert = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '×' : '☰';
  };
  const sync = () => {
    if (mobile.matches && !mounted) {
      mounted = true;
      move(header, document.body); document.body.prepend(spacer, header);
      header.classList.add('ds-mobile-header'); sidebar.classList.add('ds-mobile-drawer');
      document.body.classList.add('ds-mobile-layout');
      // Preserve the existing JARVIX button and its handlers; on pages where it
      // lives inside a legacy wrapper, expose it as a direct header child.
      if(orb && orb.parentElement!==header)move(orb,header);
      header.append(brand, controls);
      move(toggle, document.body); toggle.classList.add('ds-mobile-menu');
      move(tools, left); move(tour, right); move(pricing, right); move(login, right);
      if(homeLanguageWrap){homeLanguageWrap.classList.add('ds-owner-sidebar-language-wrap');move(homeLanguageWrap,extras);}
    } else if (!mobile.matches && mounted) {
      if (isOpen()) toggle.click();
      mounted = false;
      for (const el of reused) {
        const marker = saved.get(el);
        if (marker?.parentNode) { marker.replaceWith(el); saved.delete(el); }
        else el.remove();
      }
      // Restore the original desktop orb slot only if mobile had to move it.
      const orbMarker=orb&&saved.get(orb);
      if(orbMarker?.parentNode){orbMarker.replaceWith(orb);saved.delete(orb);}
      brand.remove(); controls.remove(); spacer.remove();
      const marker = saved.get(header); if (marker?.parentNode) marker.replaceWith(header); saved.delete(header);
      header.classList.remove('ds-mobile-header'); sidebar.classList.remove('ds-mobile-drawer');
      toggle.classList.remove('ds-mobile-menu'); document.body.classList.remove('ds-mobile-layout'); sidebar.inert = false;
    }
    syncDrawer();
  };
  scrim.addEventListener('click', () => { if (isOpen()) toggle.click(); });
  const observer = new MutationObserver(syncDrawer);
  observer.observe(document.body, {attributes:true, attributeFilter:['class']});
  observer.observe(sidebar, {attributes:true, attributeFilter:['class']});
  mobile.addEventListener('change', sync);
  let touch = null;
  document.addEventListener('touchstart', e => {
    touch = e.touches.length === 1 && !e.target.closest('input,textarea,select,video,audio,[role="slider"]')
      ? {x:e.touches[0].clientX,y:e.touches[0].clientY,time:Date.now()} : null;
  }, {passive:true});
  document.addEventListener('touchend', e => {
    if (mobile.matches && e.changedTouches.length === 1) {
      const end = e.changedTouches[0];
      const action = drawerSwipe(touch, {x:end.clientX,y:end.clientY,time:Date.now()}, isOpen(), sidebar.getBoundingClientRect().width);
      if (action) toggle.click();
    }
    touch = null;
  }, {passive:true});
  document.addEventListener('touchcancel', () => {touch = null;}, {passive:true});
  document.addEventListener('keydown', e => {
    if (!mobile.matches || !isOpen() || document.getElementById('sidebar')) return;
    if (e.key === 'Escape') { e.preventDefault(); toggle.click(); }
    if (e.key === 'Tab') {
      const items = [toggle, ...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(el => el.getClientRects().length);
      const next = items.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1);
      if (next < 0 || next >= items.length) { e.preventDefault(); items[e.shiftKey ? items.length-1 : 0]?.focus(); }
    }
  });
  sync();
  const panel = new URLSearchParams(location.search).get('panel');
  if (location.pathname.endsWith('deepsyq.html') && ['invite','promo','login'].includes(panel)) {
    document.getElementById({invite:'topInvite',promo:'topPromo',login:'topLogin'}[panel])?.click();
  }
}
if (typeof document !== 'undefined') {
 window.addEventListener('pagereveal',e=>{document.documentElement.dataset.headerTransition=e.viewTransition?'active':'standard';});
 await new Promise(resolve=>{
 const deadline=setTimeout(resolve,750);const done=()=>{clearTimeout(deadline);resolve();};
  const boot = () => {
    setupMobileShell();
    applyCanonicalNavIcons(); // Icons only; unchanged route handlers and labels.
    installApprovedJarvixOrb(); // Stage07: same approved orb art in existing controls, no new UI actions.
    if(!document.querySelector('link[href="deepsyq-unified-platform-header.css"]')){
      const style=document.createElement('link');style.rel='stylesheet';style.href='deepsyq-unified-platform-header.css';
      if(matchMedia('(min-width:761px)').matches)style.setAttribute('blocking','render');
      style.addEventListener('load',()=>window.dispatchEvent(new Event('resize')),{once:true});
      document.head.append(style);
    }
    installUnifiedPlatformHeader(); // Exactly one owner toolbar; reuses existing actions and layout.
    if (document.body.dataset.mobileShell) {done();return;}
    const ready = new MutationObserver(() => {
      setupMobileShell();
      if (document.body.dataset.mobileShell) {ready.disconnect();done();}
    });
    ready.observe(document.body, {childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
 });
}
