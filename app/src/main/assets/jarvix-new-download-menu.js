/* JARVIX NEW — test-preview header download menu, no standalone download page.
   Deployed only to jarvis-new Pages branch; never injected into production.
   Direct links come from GitHub Release *asset URLs*, not from guessed paths. */
(() => {
  if (location.hostname !== 'jarvis-new.deepsyq.pages.dev') return;

  const RELEASES = 'https://api.github.com/repos/mvryhan-web/video-variator-android/releases?per_page=25';
  const OWNER = '/mvryhan-web/video-variator-android/releases/download/';
  // GitHub already published both exact test assets in this release.
  // Fixed URLs remain clickable even when GitHub's anonymous API rate-limits.
  const KNOWN_TEST_ASSETS = Object.freeze({
    windows: 'https://github.com/mvryhan-web/video-variator-android/releases/download/jarvix-new-test-bdbcf50659ce49b416480bb1a35b2eca8cf0ad41/Jarvix-New-Windows-Setup.exe',
    mac: 'https://github.com/mvryhan-web/video-variator-android/releases/download/jarvix-new-test-bdbcf50659ce49b416480bb1a35b2eca8cf0ad41/Jarvix-New-macOS.dmg'
  });
  const BUILD_NAMES = Object.freeze({
    windows: 'Jarvix-New-Windows-Setup.exe',
    mac: 'Jarvix-New-macOS.dmg'
  });
  const LANG = {
    ru: {label:'Скачать JARVIX', win:'JARVIX для Windows', mac:'JARVIX для Mac',
      loading:'Проверяем последние тестовые сборки…', pending:'Сборки для загрузки пока недоступны.',
      warning:'Тестовые файлы: доверенная подпись Windows и нотариальное заверение macOS не подтверждены. Система может заблокировать запуск. Не отключайте защиту.',
      test:'Тестовая сборка', close:'Закрыть'},
    en: {label:'Download JARVIX',win:'JARVIX for Windows',mac:'JARVIX for Mac',
      loading:'Checking available test builds…',pending:'Download files are not available yet.',
      warning:'Test builds: a trusted Windows signature and macOS notarization are not verified. Your OS may block them. Do not disable security protections.',
      test:'Test build',close:'Close'},
    fr: {label:'Télécharger JARVIX',win:'JARVIX pour Windows',mac:'JARVIX pour Mac',
      loading:'Recherche des versions de test…',pending:'Les fichiers ne sont pas encore disponibles.',
      warning:'Versions de test : signature Windows de confiance et notarisation macOS non confirmées. Le système peut les bloquer. Ne désactivez pas les protections.',
      test:'Version test',close:'Fermer'},
    es: {label:'Descargar JARVIX',win:'JARVIX para Windows',mac:'JARVIX para Mac',
      loading:'Buscando versiones de prueba…',pending:'No hay archivos disponibles.',
      warning:'Versiones de prueba: firma de confianza en Windows y notarización macOS sin verificar. El sistema puede bloquearlas. No desactives la protección.',
      test:'Versión de prueba',close:'Cerrar'}
  };
  const getLang = () => {
    try {
      const v = localStorage.getItem('deepsyq_home_language') ||
        localStorage.getItem('deepsyq_lang') || navigator.language || 'en';
      const k = v.slice(0, 2).toLowerCase();
      return LANG[k] ? k : 'en';
    } catch { return 'en'; }
  };
  const labels = () => LANG[getLang()];
  const isSafeAsset = (asset, file) => {
    try {
      const u = new URL(asset.browser_download_url);
      return asset.name === file && asset.size > 100000 &&
        u.protocol === 'https:' && u.hostname === 'github.com' &&
        u.pathname.startsWith(OWNER) && u.pathname.endsWith('/' + file);
    } catch { return false; }
  };
  let available = null;
  async function getBuilds() {
    if (available) return available;
    const response = await fetch(RELEASES, {
      cache: 'no-store', headers: {Accept:'application/vnd.github+json'}
    });
    if (!response.ok) throw Error('GitHub releases unavailable');
    const releases = await response.json();
    if (!Array.isArray(releases)) throw Error('Invalid GitHub response');
    for (const release of releases) {
      if (release.draft || !release.prerelease ||
          !/^jarvix-new-(?:signed-test|test)-[a-f0-9]{12,40}$/.test(release.tag_name || '')) continue;
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const windows = assets.find(a => isSafeAsset(a, BUILD_NAMES.windows));
      const mac = assets.find(a => isSafeAsset(a, BUILD_NAMES.mac));
      if (windows && mac) {
        available = {windows:windows.browser_download_url, mac:mac.browser_download_url};
        return available;
      }
    }
    throw Error('No published JARVIX NEW build with both platform files');
  }
  const selector = '.ds-header-tools, [data-jv-download], a[href$="jarvix-download.html"], a[href$="/jarvix-download"]';
  let anchor = null, popup = null;
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function closeMenu() {
    if (popup) popup.remove();
    popup = null;
    if (anchor?.isConnected) anchor.setAttribute('aria-expanded','false');
    anchor = null;
  }
  function position() {
    if (!popup || !anchor?.isConnected) return;
    const r = anchor.getBoundingClientRect();
    const wide = Math.min(312, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - wide - 12));
    popup.style.width = wide + 'px';
    popup.style.left = left + 'px';
    popup.style.top = Math.min(r.bottom + 9, window.innerHeight - Math.min(260,popup.offsetHeight) - 12) + 'px';
  }

  async function showMenu(target) {
    closeMenu();
    anchor = target;
    anchor.setAttribute('aria-haspopup','menu');
    anchor.setAttribute('aria-expanded','true');
    popup = make('div','jv-download-popover');
    popup.id = 'jv-download-popover';
    popup.setAttribute('role','menu');
    popup.setAttribute('aria-label',labels().label);
    popup.style.cssText = [
      'position:fixed','z-index:2147483640','box-sizing:border-box',
      'padding:12px','border-radius:14px','border:1px solid #68563b',
      'background:#111a28','color:#f4f6fb','box-shadow:0 18px 48px #0009',
      'font-family:system-ui,-apple-system,Segoe UI,sans-serif','text-align:left'
    ].join(';');
    const heading = make('div','jv-download-heading',labels().label);
    heading.style.cssText = 'font-size:14px;font-weight:750;padding:3px 5px 9px;';
    popup.append(heading);
    const options = {};
    for (const [kind,label] of [['windows', labels().win], ['mac',labels().mac]]) {
      const link=make('a','jv-download-option',label);
      link.dataset.platform = kind;
      link.setAttribute('role','menuitem');
      link.setAttribute('aria-disabled','true');
      link.tabIndex = -1;
      link.style.cssText='display:block;padding:12px 10px;margin-bottom:5px;border-radius:8px;background:#1c2b3b;color:#eaf3fb;text-decoration:none;font-size:14px;font-weight:650;';
      link.addEventListener('click',event=>{
        if (link.getAttribute('aria-disabled')==='true') event.preventDefault();
        else setTimeout(closeMenu, 300);
      });
      options[kind]=link;popup.append(link);
    }
    // The latest known, existing GitHub prerelease downloads work immediately.
    // Only later replace them if the GitHub API confirms a newer complete pair.
    for (const [platform, url] of Object.entries(KNOWN_TEST_ASSETS)) {
      const item=options[platform];
      item.href=url;
      item.textContent=(platform==='windows'?labels().win:labels().mac)+' · '+labels().test;
      item.removeAttribute('aria-disabled');
      item.removeAttribute('tabindex');
    }
    const wait=make('div','jv-download-status',labels().loading);
    wait.setAttribute('role','status');
    wait.style.cssText='padding:4px 5px;font-size:12px;line-height:1.5;color:#c9a36b;';
    popup.append(wait);
    const warning=make('p','jv-download-warning',labels().warning);
    warning.style.cssText='font-size:11px;line-height:1.45;color:#b7c6d4;margin:8px 5px 2px;';
    popup.append(warning);
    document.body.append(popup); position();
    try {
      const links=await getBuilds();
      if (!popup?.isConnected || anchor !== target) return;
      for(const [platform,url] of Object.entries(links)){
        const item=options[platform];
        item.href=url;item.removeAttribute('aria-disabled');item.removeAttribute('tabindex');
        item.textContent=(platform==='windows'?labels().win:labels().mac)+' · '+labels().test;
      }
      wait.textContent='';
    } catch {
      if (popup?.isConnected && anchor===target) wait.textContent=labels().test;
    }
    position();
  }

  document.addEventListener('click', event => {
    const trigger=event.target.closest?.(selector);
    if (trigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (anchor===trigger && popup) closeMenu();
      else showMenu(trigger);
      return;
    }
    if (popup && !event.target.closest?.('#jv-download-popover')) closeMenu();
  }, true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && popup) {event.preventDefault();const previous=anchor;closeMenu();previous?.focus();}
  });
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);

  const updateTrigger = () => {
    for(const trigger of document.querySelectorAll(selector)) {
      trigger.setAttribute('aria-haspopup','menu');
      trigger.setAttribute('aria-label',labels().label);
      // The visible label in the actual header remains managed by DEEPSYQ.
      if (trigger.hasAttribute('data-jv-download')) trigger.textContent=labels().label+' ▾';
    }
  };
  document.addEventListener('DOMContentLoaded',updateTrigger,{once:true});
  window.addEventListener('deepsyq:lang',updateTrigger);
  window.addEventListener('pageshow',updateTrigger);
  if(document.readyState !== 'loading') updateTrigger();
  if(new URLSearchParams(location.search).get('download')==='jarvix'){
    const open=()=>{
      const trigger=document.querySelector(selector);
      if(trigger) showMenu(trigger);
      else setTimeout(()=>{
        const next=document.querySelector(selector);
        if(next)showMenu(next);
      },450);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',open,{once:true});
    else open();
  }
})();