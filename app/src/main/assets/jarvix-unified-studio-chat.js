// Mount the SAME JARVIX chat in Image, Video and Audio without replacing Studio.
(() => {
  const path = location.pathname.split('/').pop().replace(/\.html$/, '');
  if (path !== 'generate-studio') return;
  const main = document.querySelector('.studio-shell > main');
  const nav = document.querySelector('.studio-nav');
  if (!main || !nav || document.getElementById('jarvixSharedChatHost')) return;

  const host = document.createElement('section');
  host.id = 'jarvixSharedChatHost';
  host.className = 'jarvix-shared-chat-host';
  host.setAttribute('aria-label', 'JARVIX Chat — shared conversation');
  const frame = document.createElement('iframe');
  frame.id = 'jarvixSharedChatFrame';
  frame.title = 'JARVIX Chat — one conversation for Image, Video and Audio';
  frame.src = 'jarvix-chat.html?embedded=1';
  frame.loading = 'eager';
  frame.referrerPolicy = 'same-origin';
  host.append(frame);
  main.prepend(host);
  const toolsToggle = document.createElement('button');
  toolsToggle.id = 'jarvixStudioToolsToggle';
  toolsToggle.type = 'button';
  toolsToggle.className = 'jarvix-studio-tools-toggle';
  toolsToggle.setAttribute('aria-controls', 'creator');
  const showToolsInitially = new URLSearchParams(location.search).get('view') === 'studio' ||
    new URLSearchParams(location.search).has('jobId') ||
    Boolean(sessionStorage.getItem('deepsyq_studio_handoff_id'));
  const setToolsVisible = value => {
    document.body.classList.toggle('jarvix-studio-tools-open',value);
    toolsToggle.setAttribute('aria-expanded',String(value));
    toolsToggle.textContent = value ? 'Свернуть инструменты Studio ▴' : 'Инструменты Studio ▾';
  };
  host.after(toolsToggle);
  toolsToggle.addEventListener('click',() => setToolsVisible(!document.body.classList.contains('jarvix-studio-tools-open')));
  document.body.classList.add('jarvix-shared-studio-chat');
  setToolsVisible(showToolsInitially);

  const currentMode = () => {
    const selected = nav.querySelector('button[data-kind][aria-pressed="true"]')?.dataset.kind;
    return selected === 'music' ? 'audio' : ['image','video'].includes(selected) ? selected : null;
  };
  let latestMode = null;
  const syncMode = () => {
    const mode = currentMode();
    if (!mode || mode === latestMode) return;
    latestMode = mode;
    frame.contentWindow?.postMessage({type:'jarvix:set-mode',mode},location.origin);
  };
  frame.addEventListener('load', () => {latestMode = null;syncMode();});
  new MutationObserver(syncMode).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});

  // Switching Image / Video / Audio in the site sidebar must keep this
  // frame (and its current messages, draft and session) alive.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('#dsSiteSidebar a[href]');
    if (!link) return;
    const target = new URL(link.href,location.href);
    if (target.origin !== location.origin || !/\/generate-studio(?:\.html)?$/.test(target.pathname) || target.searchParams.has('view')) return;
    const mode=target.searchParams.get('studio');
    const nativeMode = mode === 'audio' ? 'music' : mode;
    if (!['image','video','music'].includes(nativeMode)) return;
    const button = nav.querySelector('button[data-kind="'+nativeMode+'"]');
    if (!button || button.disabled) return;
    event.preventDefault();
    if (button.getAttribute('aria-pressed') !== 'true') button.click();
  },true);
})();
