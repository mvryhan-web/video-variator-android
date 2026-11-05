// Owner mobile reference, 2026-11-05. Keep existing buttons and their handlers.
export function drawerSwipe(start, end, open, width) {
  if (!start || Math.abs(end.y - start.y) > 45 || end.time - start.time > 700) return null;
  const distance = end.x - start.x;
  if (!open && start.x <= 24 && distance > 65) return 'open';
  if (open && start.x < width && distance < -65) return 'close';
  return null;
}

function setupMobileShell() {
  if (document.body.dataset.mobileShell) return;
  const header = location.pathname.endsWith('/index.html') ? document.querySelector('.vu-appbar')
    : document.querySelector('.vu-appbar') || document.querySelector('header:has(#topJarvisBtn)');
  const sidebar = document.querySelector('#sidebar, #dsSiteSidebar, .shell>.sidebar');
  const toggle = document.querySelector('#menu, .ds-site-mobile-toggle, .vu-nav-toggle, #menuBtn');
  if (!header || !sidebar || !toggle) return;
  document.body.dataset.mobileShell = 'ready';
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'deepsyq-mobile-shell.css'; document.head.append(css);

  // Only the global header search is removed; template/tool searches remain useful.
  document.querySelectorAll('.home-global-search, .vu-search').forEach(el => el.remove());
  header.querySelectorAll('form:has(input[type="search"])').forEach(el => el.remove());

  const words = {
    en: ['Promo Code', 'Pricing', 'Log in', 'Invite a friend'],
    ru: ['Промокод', 'Тарифы', 'Войти', 'Пригласить друга'],
    fr: ['Code promo', 'Tarifs', 'Connexion', 'Inviter un ami'],
    es: ['Código', 'Precios', 'Acceder', 'Invitar amigo']
  };
  const locale = () => {
    try { return localStorage.getItem('deepsyq_home_language') || document.documentElement.lang.split('-')[0]; }
    catch { return document.documentElement.lang.split('-')[0]; }
  };
  const copy = () => words[locale()] || words.en;
  let invite = document.getElementById('topInvite');
  if (!invite) {
    invite = document.createElement('a'); invite.href = 'deepsyq.html?panel=invite';
  }
  invite.classList.add('ds-invite-entry'); invite.textContent = copy()[3];
  const bottom = sidebar.querySelector('.sidebar-bottom, .ds-site-footer') || sidebar;
  bottom.append(invite);

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
  const nativeLanguage = document.getElementById('homeLanguage');
  const language = nativeLanguage || document.createElement('select');
  if (!nativeLanguage) {
    language.setAttribute('aria-label', 'Site language');
    for (const [value, label] of [['en','English'],['ru','Русский'],['fr','Français'],['es','Español']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; language.append(option);
    }
    language.value = words[locale()] ? locale() : 'en';
    language.addEventListener('change', () => {
      try { localStorage.setItem('deepsyq_home_language', language.value); localStorage.setItem('deepsyq_lang', language.value); } catch {}
      document.documentElement.lang = language.value;
      window.dispatchEvent(new CustomEvent('deepsyq:lang', {detail: {language: language.value}}));
      refresh();
    });
  }
  const promo = document.getElementById('topPromo') || link(copy()[0], 'deepsyq.html?panel=promo', '');
  const pricing = document.getElementById('topPricing') || link(copy()[1], 'pricing.html', '');
  const login = document.getElementById('topLogin') || link(copy()[2], 'deepsyq.html?panel=login', '');
  const reused = [toggle, language, promo, pricing, login];
  const languageLabels = [...language.options].map(option => option.textContent);
  const saved = new Map();
  const move = (el, parent) => {
    if (el.parentNode) { const marker = document.createComment('mobile header slot'); el.before(marker); saved.set(el, marker); }
    parent.append(el);
  };
  function refresh() {
    const labels = copy();
    if (!document.getElementById('topPromo')) promo.textContent = labels[0];
    if (!document.getElementById('topPricing')) pricing.textContent = labels[1];
    if (!document.getElementById('topLogin')) login.textContent = labels[2];
    invite.textContent = labels[3];
  }
  window.addEventListener('deepsyq:lang', refresh);

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
      header.append(brand, controls);
      move(toggle, document.body); toggle.classList.add('ds-mobile-menu');
      move(language, left); move(promo, left); move(pricing, right); move(login, right);
      for (const option of language.options) option.textContent = option.value.toUpperCase();
    } else if (!mobile.matches && mounted) {
      if (isOpen()) toggle.click();
      mounted = false;
      for (const el of reused) {
        const marker = saved.get(el);
        if (marker?.parentNode) { marker.replaceWith(el); saved.delete(el); }
        else el.remove();
      }
      brand.remove(); controls.remove(); spacer.remove();
      const marker = saved.get(header); if (marker?.parentNode) marker.replaceWith(header); saved.delete(header);
      header.classList.remove('ds-mobile-header'); sidebar.classList.remove('ds-mobile-drawer');
      toggle.classList.remove('ds-mobile-menu'); document.body.classList.remove('ds-mobile-layout'); sidebar.inert = false;
      [...language.options].forEach((option, index) => {option.textContent = languageLabels[index];});
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
  const boot = () => {
    setupMobileShell();
    if (document.body.dataset.mobileShell) return;
    const ready = new MutationObserver(() => {
      setupMobileShell();
      if (document.body.dataset.mobileShell) ready.disconnect();
    });
    ready.observe(document.body, {childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else setTimeout(boot, 0);
}
