/* Owner 2026-11-07 Cockpit Header: exact match to owner reference media_1794076777524_b2e60749.jpg
 * Left pod: [≡] Menu, [▷] Tour, [🗂] Everyday Tools
 * Center: JARVIX glowing orb
 * Right pod: [⚡] AI Credits, [👑] Pricing, [RU ⌵] Language, [👤] Log in
 */
const labels = {
  en: { credits: 'AI Credits', login: 'Log in', pricing: 'Pricing', tour: 'Tour', tools: 'Everyday Tools' },
  ru: { credits: 'AI Credits', login: 'Войти', pricing: 'Тарифы', tour: 'Экскурсия', tools: 'Everyday Tools' },
  fr: { credits: 'Crédits IA', login: 'Connexion', pricing: 'Tarifs', tour: 'Visite guidée', tools: 'Everyday Tools' },
  es: { credits: 'Créditos IA', login: 'Acceder', pricing: 'Precios', tour: 'Visita guiada', tools: 'Everyday Tools' }
};

const locale = () => {
  try {
    return (localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang') || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  } catch {
    return 'en';
  }
};

const dictionary = () => labels[locale()] || labels.en;

function link(text, href, cls) {
  const el = document.createElement('a');
  el.textContent = text;
  el.href = href;
  el.className = cls;
  return el;
}

export function installUnifiedPlatformHeader() {
  if (matchMedia('(max-width:760px)').matches) {
    const onWiden = () => {
      if (matchMedia('(max-width:760px)').matches) return;
      window.removeEventListener('resize', onWiden);
      requestAnimationFrame(() => installUnifiedPlatformHeader());
    };
    window.addEventListener('resize', onWiden);
    return;
  }

  const header = document.querySelector('header.ds-stable-header') || document.querySelector('header.top') || document.querySelector('header.ds-platform-header') || document.querySelector('header');
  const sidebar = document.querySelector('#sidebar, #dsSiteSidebar, .shell>.sidebar');
  const toggle = document.querySelector('.ds-site-mobile-toggle, #menu, #menuBtn, .vu-nav-toggle');
  const orb = document.getElementById('topJarvisBtn');
  let tour = document.getElementById('dsTakeTour');
  let tools = header?.querySelector('.ds-header-tools') || document.querySelector('.ds-header-tools');
  let pricing = document.getElementById('topPricing');
  let login = document.getElementById('topLogin');

  if (!header || !orb) return;

  // Ensure tour button exists
  if (!tour) {
    tour = document.createElement('button');
    tour.type = 'button';
    tour.id = 'dsTakeTour';
    tour.className = 'ds-header-tour';
    tour.addEventListener('click', async () => {
      tour.disabled = true;
      try {
        const guide = await import('./jarvix-guided-tour.js');
        guide.startJarvixGuidedTour();
      } catch {
        tour.textContent = 'Tour unavailable';
      } finally {
        tour.disabled = false;
      }
    });
  }

  // Ensure tools link exists
  if (!tools) {
    tools = link('Everyday Tools', 'free-tools.html', 'ds-header-tools');
  }

  // Ensure pricing exists
  if (!pricing) {
    pricing = link(dictionary().pricing, 'pricing.html', 'ds-header-pricing');
    pricing.id = 'topPricing';
  }

  // Ensure login exists
  if (!login) {
    login = link(dictionary().login, 'deepsyq.html?panel=login', 'top-login');
    login.id = 'topLogin';
  }

  // Credit balance button
  let credit = header.querySelector('.ds-header-credit') || document.querySelector('.ds-header-credit');
  if (!credit) {
    credit = link('AI Credits', 'pricing.html#credits', 'ds-header-credit ds-unified-credit');
    credit.setAttribute('aria-label', 'AI Credit');
  }

  const readBalance = async () => {
    let token = '';
    try { token = localStorage.getItem('vv_token') || ''; } catch {}
    if (!token) return;
    try {
      const response = await fetch('/api/ai-wallet/balance', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      });
      if (!response.ok) return;
      const data = await response.json();
      if (token === localStorage.getItem('vv_token') && Number.isSafeInteger(data.available) && data.available >= 0) {
        credit.title = 'Available AI credits: ' + data.available.toLocaleString(locale());
      }
    } catch {}
  };
  void readBalance();
  window.addEventListener('storage', event => { if (event.key === 'vv_token') void readBalance(); });

  // Language selector
  let language = header.querySelector('#dsUnifiedLanguage');
  if (!language) {
    language = document.createElement('select');
    language.id = 'dsUnifiedLanguage';
    language.setAttribute('aria-label', 'DEEPSYQ language');
    for (const l of ['ru', 'en', 'fr', 'es']) {
      const option = document.createElement('option');
      option.value = l;
      option.textContent = l.toUpperCase();
      language.append(option);
    }
    language.addEventListener('change', () => {
      try { localStorage.setItem('deepsyq_home_language', language.value); } catch {}
      window.dispatchEvent(new Event('deepsyq:lang'));
    });
    window.addEventListener('deepsyq:lang', () => { language.value = locale(); });
  }
  language.value = locale();

  let languageWrap = header.querySelector('.ds-unified-language');
  if (!languageWrap) {
    languageWrap = document.createElement('label');
    languageWrap.className = 'ds-unified-language ds-pod-lang-wrap';
    languageWrap.append(language);
  }

  // Remove existing cockpit if re-running
  header.querySelector('.ds-header-cockpit')?.remove();

  // Cockpit container
  const group = document.createElement('div');
  group.className = 'ds-unified-actions ds-header-cockpit';

  // Left Pod: [≡] Menu, [▷] Tour, [🗂] Everyday Tools
  const left = document.createElement('div');
  left.className = 'ds-header-pod ds-header-pod-left ds-unified-actions-left';

  if (toggle) {
    toggle.classList.add('ds-pod-btn', 'ds-pod-menu');
    toggle.innerHTML = '<span class="ds-menu-icon" aria-hidden="true" style="font-size:18px;line-height:1">≡</span>';
    left.append(toggle);
  }

  tour.classList.add('ds-pod-btn', 'ds-pod-tour');
  tour.innerHTML = '<span class="ds-pod-icon" aria-hidden="true" style="margin-right:6px;font-size:13px;display:inline-block">▷</span><span class="ds-pod-text">' + dictionary().tour + '</span>';
  left.append(tour);

  tools.classList.add('ds-pod-btn', 'ds-pod-tools');
  tools.innerHTML = '<span class="ds-pod-icon" aria-hidden="true" style="margin-right:7px;display:inline-flex;align-items:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></span><span class="ds-pod-text">Everyday Tools</span>';
  left.append(tools);

  // Center Orb
  orb.classList.add('ds-pod-center-orb');

  // Right Pod: [⚡] AI Credits, [👑] Pricing, [RU ⌵] Language, [👤] Log in
  const right = document.createElement('div');
  right.className = 'ds-header-pod ds-header-pod-right ds-unified-actions-right';

  credit.classList.add('ds-pod-btn', 'ds-pod-credit');
  credit.innerHTML = '<span class="ds-pod-icon" aria-hidden="true" style="margin-right:6px;display:inline-flex;align-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span><span class="ds-pod-text">AI Credits</span>';
  credit.setAttribute('aria-label', 'AI Credit');
  right.append(credit);

  pricing.classList.add('ds-pod-btn', 'ds-pod-pricing');
  pricing.innerHTML = '<span class="ds-pod-icon" aria-hidden="true" style="margin-right:6px;color:#fbbf24;font-size:13px">👑</span><span class="ds-pod-text">' + dictionary().pricing + '</span>';
  right.append(pricing);

  right.append(languageWrap);

  login.classList.add('ds-pod-btn', 'ds-pod-login');
  let token = '';
  try { token = localStorage.getItem('vv_token') || ''; } catch {}
  const authText = token ? (locale() === 'ru' ? 'Аккаунт' : 'Account') : dictionary().login;
  login.innerHTML = '<span class="ds-pod-icon" aria-hidden="true" style="margin-right:7px;display:inline-flex;align-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span><span class="ds-pod-text">' + authText + '</span>';
  right.append(login);

  group.append(left, orb, right);
  header.append(group);

  // Brand on left
  const brand = header.querySelector('.top-brand, .ds-mobile-brand') || document.querySelector('.top-brand');
  if (brand && !header.contains(brand)) {
    header.prepend(brand);
  }

  header.classList.add('ds-unified-header');
  document.body.classList.add('ds-unified-platform');
  document.body.dataset.dsUnifiedPlatform = 'ready';

  // Toggle behavior
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('ds-unified-nav-collapsed');
      sidebar.classList.toggle('open');
      window.dispatchEvent(new Event('resize'));
    });
  }

  // Update on language change
  window.addEventListener('deepsyq:lang', () => {
    const t = tour.querySelector('.ds-pod-text');
    if (t) t.textContent = dictionary().tour;
    const p = pricing.querySelector('.ds-pod-text');
    if (p) p.textContent = dictionary().pricing;
    let tkn = '';
    try { tkn = localStorage.getItem('vv_token') || ''; } catch {}
    const l = login.querySelector('.ds-pod-text');
    if (l) l.textContent = tkn ? (locale() === 'ru' ? 'Аккаунт' : 'Account') : dictionary().login;
  });

  window.dispatchEvent(new Event('resize'));
}
