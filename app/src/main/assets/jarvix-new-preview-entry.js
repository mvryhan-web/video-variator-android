/* Test preview only: replace the old landing-page JARVIX entry with JARVIX NEW.
 * This module is injected ONLY while building the jarvis-new Pages preview.
 * It is never included in production/deepsyq.app.
 */
if (location.hostname === 'jarvis-new.deepsyq.pages.dev' || location.hostname.endsWith('.jarvis-new.deepsyq.pages.dev')) {
  const launch = (mode = '') => {
    const url = new URL('/jarvix-new.html', location.origin);
    if (['image', 'video', 'audio'].includes(mode)) url.searchParams.set('mode', mode);
    location.assign(url.toString());
  };
  document.addEventListener('click', event => {
    const btn = event.target.closest?.('#topJarvisBtn, a[href*="ai-agents.html"], a[href*="jarvix-chat.html"], a[href*="voice-agent-preview.html"]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const target = btn.getAttribute('href') || '';
    const mode = /[?&]mode=(image|video|audio)/.exec(target)?.[1] || '';
    launch(mode);
  }, true);
  const init = () => {
    if (document.getElementById('jarvix-new-preview-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'jarvix-new-preview-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Новый JARVIX — тестовая версия');
    banner.style.cssText='position:relative;isolation:isolate;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:13px;background:#0a1b2a;border-bottom:1px solid #aa8243;color:#f4eee5;padding:11px 16px;font:600 14px system-ui';
    const bold = document.createElement('strong');
    bold.textContent = 'JARVIX NEW — ТЕСТОВАЯ ВЕРСИЯ';
    const hint = document.createElement('span');
    hint.textContent = 'Новый интерфейс, отдельный от старого JARVIX';
    hint.style.color='#a8bdce';
    const a = document.createElement('a');
    a.href='/jarvix-new.html';
    a.textContent='Открыть JARVIX NEW';
    a.style.cssText='padding:9px 16px;border-radius:9px;background:#dfae60;color:#12171c;text-decoration:none;font-weight:800';
    banner.append(bold,hint,a);
    document.body.prepend(banner);
    const orb = document.getElementById('topJarvisBtn');
    if (orb) {
      orb.setAttribute('aria-label', 'Открыть новый JARVIX NEW на тестовом сайте');
      orb.title='JARVIX NEW · TEST';
    }
    const quick = document.getElementById('homeQuickBar');
    if (quick) {
      quick.replaceChildren();
      const link = document.createElement('a');
      link.href='/jarvix-new.html';
      link.textContent='Открыть новый JARVIX NEW · Test Chat';
      link.style.cssText='display:block;margin:16px auto;padding:17px 23px;border:1px solid #b88c4c;border-radius:16px;background:#0f1c2c;color:#f9d9a0;text-align:center;font:700 16px system-ui;text-decoration:none;max-width:580px';
      quick.append(link);
    }
    for (const a of document.querySelectorAll('a[href="ai-agents.html"], a[href^="jarvix-chat.html"]')) {
      const original = new URL(a.getAttribute('href'), location.href);
      const mode = original.searchParams.get('mode');
      a.href='/jarvix-new.html'+(['image','video','audio'].includes(mode)?'?mode='+mode:'');
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}