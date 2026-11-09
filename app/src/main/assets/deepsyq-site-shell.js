/* Site-wide read-only Deepsyq navigation & Multilingual Shell.
   Mirrors the owner-approved neon Home groups, applies themes and auto-translates subpages. */
(() => {
  // Apply saved theme immediately across all pages
  try {
    const savedTheme = localStorage.getItem('deepsyq_site_theme');
    if (savedTheme) document.documentElement.setAttribute('data-site-theme', savedTheme);
  } catch (_) {}

  // Current language resolver
  const getLang = () => {
    try {
      const saved = localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang');
      if (saved) return saved;
      const raw = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
      if (raw.startsWith('ru') || raw.startsWith('uk') || raw.startsWith('be')) return 'ru';
      if (raw.startsWith('fr')) return 'fr';
      if (raw.startsWith('es')) return 'es';
      return 'en';
    } catch (_) {
      return 'en';
    }
  };

  const shellI18n = {
    en: {
      Home: 'Home', Creation: 'Creation', Tools: 'Tools', Library: 'Library', Community: 'Community', More: 'More',
      home: 'Home', image: 'Image', video: 'Video', agents: 'JARVIX', pet: 'Virtual Pet', voice: 'Voice Agent', audio: 'Audio',
      tools: 'Tools', apps: 'AI Apps', canvas: 'Canvas', legacy: 'Video Uniquifier',
      history: 'My Creations', share: 'Share link', inspiration: 'Inspiration', pricing: 'Pricing',
      back: '← Back to Deepsyq Home', privacy: 'Privacy', soon: 'soon', copied: 'Link copied', backBtn: 'Back'
    },
    ru: {
      Home: 'Главная', Creation: 'Создание', Tools: 'Инструменты', Library: 'Коллекция', Community: 'Сообщество', More: 'Еще',
      home: 'Главная', image: 'Фото', video: 'Видео', agents: 'JARVIX', pet: 'Питомец', voice: 'Голосовой агент', audio: 'Аудио',
      tools: 'Инструменты', apps: 'AI Apps', canvas: 'Canvas', legacy: 'Видеоуникализатор',
      history: 'Мои работы', share: 'Поделиться', inspiration: 'Вдохновение', pricing: 'Тарифы',
      back: '← Назад в Deepsyq', privacy: 'Конфиденциальность', soon: 'скоро', copied: 'Ссылка скопирована', backBtn: 'Назад'
    },
    fr: {
      Home: 'Accueil', Creation: 'Création', Tools: 'Outils', Library: 'Bibliothèque', Community: 'Communauté', More: 'Plus',
      home: 'Accueil', image: 'Image', video: 'Vidéo', agents: 'JARVIX', pet: 'Animal virtuel', voice: 'Agent vocal', audio: 'Audio',
      tools: 'Outils', apps: 'Apps IA', canvas: 'Canvas', legacy: 'Unificateur vidéo',
      history: 'Mes créations', share: 'Partager', inspiration: 'Inspiration', pricing: 'Tarifs',
      back: '← Retour à Deepsyq', privacy: 'Confidentialité', soon: 'bientôt', copied: 'Lien copié', backBtn: 'Retour'
    },
    es: {
      Home: 'Inicio', Creation: 'Creación', Tools: 'Herramientas', Library: 'Biblioteca', Community: 'Comunidad', More: 'Más',
      home: 'Inicio', image: 'Imagen', video: 'Vídeo', agents: 'JARVIX', pet: 'Mascota 3D', voice: 'Agente de voz', audio: 'Audio',
      tools: 'Herramientas', apps: 'AI Apps', canvas: 'Canvas', legacy: 'Unificador de vídeo',
      history: 'Mis creaciones', share: 'Compartir enlace', inspiration: 'Inspiración', pricing: 'Precios',
      back: '← Volver a Deepsyq', privacy: 'Privacidad', soon: 'pronto', copied: 'Enlace copiado', backBtn: 'Atrás'
    }
  };

  const currentLang = () => {
    const l = getLang();
    return shellI18n[l] ? l : 'en';
  };
  const t = () => shellI18n[currentLang()];

  // Sync document language tag
  document.documentElement.lang = currentLang() === 'en' ? 'en-US' : currentLang();

  // Apply translations to common page elements
  const translateCommon = () => {
    const dict = t();
    document.querySelectorAll('.back, [data-t="back"], .tool-back').forEach(btn => {
      if (btn.childNodes.length === 1 && btn.childNodes[0].nodeType === Node.TEXT_NODE) {
        btn.textContent = dict.backBtn;
      }
    });
  };
  translateCommon();

  // Sitewide JARVIX AI integration
  if (!document.getElementById('topJarvisBtn')) {
    const jarvisCss = document.createElement('link');
    jarvisCss.rel = 'stylesheet';
    jarvisCss.href = 'jarvis-core.css?v=7.0';
    document.head.append(jarvisCss);

    const jarvisScript = document.createElement('script');
    jarvisScript.type = 'module';
    jarvisScript.src = 'jarvis-core.js';
    document.body.append(jarvisScript);

    // If a top header exists, insert JARVIX Orb dead-center
    const topH = document.querySelector('header');
    if (topH && !topH.querySelector('#topJarvisBtn')) {
      const jBtn = document.createElement('button');
      jBtn.id = 'topJarvisBtn';
      jBtn.type = 'button';
      jBtn.className = 'top-jarvis-btn';
      jBtn.setAttribute('aria-label', 'Activate JARVIX AI');
      jBtn.title = 'JARVIX — AI Voice Commander & Compare';
      jBtn.innerHTML = '<div class="jarvis-mini-orb"></div><span class="jarvis-name">JARVIX</span>';
      topH.append(jBtn);
    }
  }

  const mobileShell = document.createElement('script');
  mobileShell.type = 'module'; mobileShell.src = 'deepsyq-mobile-shell.js';
  document.body.append(mobileShell);

  // Sidebar building on subpages
  if (!document.body || document.getElementById('sidebar') || document.getElementById('dsSiteSidebar')) return;

  const entries = [
    { section:'Home' },
    { label: 'Home', icon: '⌂', url:'deepsyq.html', key: 'home' },
    { section:'Creation' },
    { label: 'Image', icon: '▧', url:'jarvix-chat.html?mode=image', key: 'image' },
    { label: 'Video', icon: '▷', url:'jarvix-chat.html?mode=video', key: 'video' },
    { label:'Agent',icon:'✦', pending:false, isJarvix: true, url:'jarvix-chat.html', key: 'agents' },
    { label: 'Audio', icon: '♫', url:'jarvix-chat.html?mode=audio', key: 'audio' },
    { section:'Tools' },
    { label: 'AI Apps', icon: '◇', url:'ai-apps.html', key: 'apps' },
    { label: 'Canvas', icon: '✎', url:'canvas.html', key: 'canvas' },
    { label: 'Tools', icon: '⊞', url:'free-tools.html', key: 'tools' },
    { label: 'Video Uniquifier', icon: '▤', url:'index.html', key: 'legacy' },
    { section:'Library' },

    { label: 'My Creations', icon: '▣', url:'my-creations.html', key: 'history' },
    { section:'Community' },
    { label: 'Inspiration', icon: '◌', url:'deepsyq.html#inspirationPreview', key: 'inspiration' },
    { section:'More' },
    { label: 'Pricing', icon: '＄', url:'pricing.html', key: 'pricing' }
  ];

  const path = location.pathname.split('/').pop() || 'deepsyq.html';
  const query = new URLSearchParams(location.search);
  const active = path === 'generate-studio.html' ?
    (query.get('view') === 'history' ? 'history' :
      query.get('studio') === 'video' ? 'video' :
        ['audio', 'music'].includes(query.get('studio')) ? 'audio' : 'image') :
    path === 'jarvix-chat.html' ? (['image','video','audio'].includes(query.get('mode')) ? query.get('mode') : 'agents') : path === 'my-creations.html' ? 'history' : path === 'voice-agent-preview.html' ? 'voice' : path === 'virtual-pet.html' ? 'pet' : path === 'ai-agents.html' ? 'agents' : path === 'canvas.html' ? 'canvas' : path === 'ai-apps.html' ? 'apps' : path === 'inspiration.html' ? 'inspiration' :
      ['pricing.html', 'ai-pricing.html'].includes(path) ? 'pricing' :
        ['index.html', 'video-uniquifier.html'].includes(path) ? 'legacy' :
          ['free-tools.html', 'audio-studio.html', 'avatar-studio.html', 'mobile-utility.html',
            'photo-collage.html', 'simple-background-remover.html', 'smart-reminders.html', 'teleprompter.html'].includes(path) ? 'tools' : '';

  const sidebar = document.createElement('aside');
  sidebar.id = 'dsSiteSidebar';
  sidebar.className = 'ds-site-sidebar';
  sidebar.setAttribute('aria-label', 'Deepsyq site navigation');

  const brand = document.createElement('a');
  brand.href = 'deepsyq.html';
  brand.className = 'ds-site-brand';
  const logo = document.createElement('img');
  logo.src = 'deepsyq-logo.png';
  logo.alt = '';
  logo.width = 30;
  logo.height = 30;
  brand.append(logo, document.createTextNode('Deepsyq'));
  sidebar.append(brand);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Site pages');
  const shareStatus = document.createElement('div');
  shareStatus.className = 'ds-site-share-status';
  shareStatus.setAttribute('role', 'status');
  shareStatus.setAttribute('aria-live', 'polite');

  const domItems = [];

  for (const entry of entries) {
    if (entry.section) {
      const cap = document.createElement('div');
      cap.className = 'ds-site-caption';
      cap.textContent = t()[entry.section] || entry.section;
      domItems.push({ cap, section: entry.section });
      nav.append(cap);
      continue;
    }
    const el = document.createElement(entry.pending ? 'span' : entry.action ? 'button' : 'a');
    const localizedLabel = t()[entry.key] || entry.label;

    if (entry.pending) {
      el.className = 'ds-site-pending';
      el.setAttribute('aria-label', localizedLabel + ' coming soon');
      el.title = localizedLabel + ' — coming soon';
    } else if (entry.action === 'share') {
      el.type = 'button';
      el.className = 'ds-site-share';
      el.setAttribute('aria-label', 'Share Deepsyq');
      el.addEventListener('click', async () => {
        const homeLink = new URL('deepsyq.html', location.href).href;
        shareStatus.textContent = '';
        try {
          if (typeof navigator.share === 'function') { await navigator.share({ title: 'Deepsyq', url: homeLink }); return; }
          if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(homeLink); shareStatus.textContent = t().copied; return; }
        } catch (e) { if (e?.name === 'AbortError') return; }
        shareStatus.textContent = homeLink;
      });
    } else {
      el.href = entry.url;
      if (active === entry.key) el.setAttribute('aria-current', 'page');
    }
    if (entry.isJarvix || entry.key === 'agents') {
      el.className = 'ds-site-jarvix-btn';
      el.href = 'jarvix-chat.html';
      el.setAttribute('aria-label', 'JARVIX AI');
      el.title = 'JARVIX — AI Voice Butler & Chat';
      el.onclick = (e) => {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          location.assign('jarvix-chat.html');
        }
      };
      const orb = document.createElement('span');
      orb.className = 'jarvis-mini-orb';
      orb.style.width = '20px';
      orb.style.height = '20px';
      orb.style.display = 'inline-grid';
      orb.style.placeItems = 'center';
      orb.style.marginRight = '8px';
      orb.style.verticalAlign = 'middle';

      
      const textSpan = document.createElement('span');
      textSpan.className = 'jarvis-name';
      textSpan.style.letterSpacing = '1px';
      textSpan.style.color = '#e0f2fe';
      textSpan.textContent = 'JARVIX';
      
      el.append(orb, textSpan);
      domItems.push({ el, textNode: textSpan, entry });
      nav.append(el);
      continue;
    }

    const icon = document.createElement('span');
    icon.className = 'ds-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = entry.icon;
    const textNode = document.createTextNode(localizedLabel);
    el.append(icon, textNode);

    if (entry.pending) {
      const soon = document.createElement('small');
      soon.textContent = t().soon;
      el.append(soon);
    }
    domItems.push({ el, textNode, entry });
    nav.append(el);
  }

  nav.append(shareStatus);
  sidebar.append(nav);

  const foot = document.createElement('div');
  foot.className = 'ds-site-footer';
  const home = document.createElement('a');
  home.href = 'deepsyq.html';
  home.textContent = t().back;
  const privacy = document.createElement('a');
  privacy.href = 'ai-privacy.html';
  privacy.textContent = t().privacy;
  foot.append(home, privacy);
  sidebar.append(foot);

  const toggle = document.createElement('button');
  toggle.className = 'ds-site-mobile-toggle';
  toggle.type = 'button';
  toggle.textContent = '☰';
  toggle.setAttribute('aria-label', 'Open Deepsyq navigation');
  toggle.setAttribute('aria-controls', 'dsSiteSidebar');
  toggle.setAttribute('aria-expanded', 'false');

  const scrim = document.createElement('div');
  scrim.className = 'ds-site-scrim';
  scrim.setAttribute('aria-hidden', 'true');

  const mobile = window.matchMedia('(max-width:900px)');
  let previousOverflow = null;
  const focusable = () => [...sidebar.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  const isOpen = () => mobile.matches && document.body.classList.contains('ds-site-nav-open');
  const close = (restoreFocus = false) => {
    const wasOpen = isOpen();
    document.body.classList.remove('ds-site-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open Deepsyq navigation');
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    if (previousOverflow !== null) { document.body.style.overflow = previousOverflow; previousOverflow = null; }
    sidebar.inert = mobile.matches;
    if (wasOpen && restoreFocus && mobile.matches) toggle.focus({ preventScroll: true });
  };
  const open = () => {
    if (!mobile.matches) return;
    previousOverflow = document.body.style.overflow;
    sidebar.inert = false;
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    document.body.classList.add('ds-site-nav-open');
    document.body.style.overflow = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close Deepsyq navigation');
    focusable()[0]?.focus({ preventScroll: true });
  };
  const syncViewport = () => {
    if (!mobile.matches) close(false);
    else if (!isOpen()) sidebar.inert = true;
  };
  toggle.addEventListener('click', () => isOpen() ? close(true) : open());
  scrim.addEventListener('click', () => close(true));
  sidebar.addEventListener('click', e => { if (e.target.closest('a')) close(false); });
  if (typeof mobile.addEventListener === 'function') mobile.addEventListener('change', syncViewport);
  else mobile.addListener(syncViewport);
  syncViewport();

  document.body.classList.add('deepsyq-sitewide-shell');
  document.body.prepend(scrim, toggle, sidebar);

  // One shared JARVIX recent drawer for Chat/Image/Video/Audio; no duplicate chat.
  if (['jarvix-chat', 'jarvix-chat.html', 'generate-studio', 'generate-studio.html'].includes(path)) {
    import('./jarvix-activity-drawer.js').catch(error => console.warn('JARVIX activity unavailable:', error?.message));
  }

  // Dynamic live re-translation listener
  const refreshLanguage = () => {
    const dict = t();
    document.documentElement.lang = currentLang() === 'en' ? 'en-US' : currentLang();
    for (const item of domItems) {
      if (item.cap) {
        item.cap.textContent = dict[item.section] || item.section;
      } else if (item.textNode) {
        item.textNode.textContent = dict[item.entry.key] || item.entry.label;
      }
    }
    home.textContent = dict.back;
    privacy.textContent = dict.privacy;
    translateCommon();
  };

  window.addEventListener('deepsyq:lang', refreshLanguage);
  window.addEventListener('storage', e => {
    if (e.key === 'deepsyq_home_language' || e.key === 'deepsyq_lang') refreshLanguage();
    if (e.key === 'deepsyq_site_theme') {
      if (e.newValue) document.documentElement.setAttribute('data-site-theme', e.newValue);
      else document.documentElement.removeAttribute('data-site-theme');
    }
  });
})();
