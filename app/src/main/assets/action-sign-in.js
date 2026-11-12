(() => {
  const path = location.pathname.replace(/\.html$/, '');
  const tools = '.hub-tile, .et-card, .et-uniquifier, .quick-tool-item a, .tool-choice, .tools-direct-launches a';
  const languages = {
    ru: ['Войти в DEEPSYQ', 'Войдите, чтобы продолжить.', 'Другие способы входа', 'Закрыть', 'Не удалось войти. Попробуйте ещё раз.'],
    en: ['Sign in to DEEPSYQ', 'Sign in to continue.', 'Other sign-in options', 'Close', 'Sign-in failed. Please try again.'],
    fr: ['Se connecter à DEEPSYQ', 'Connectez-vous pour continuer.', 'Autres options de connexion', 'Fermer', 'La connexion a échoué. Réessayez.'],
    es: ['Inicia sesión en DEEPSYQ', 'Inicia sesión para continuar.', 'Otras opciones de inicio de sesión', 'Cerrar', 'No se pudo iniciar sesión. Inténtalo de nuevo.']
  };
  let dialog, googleButton, status, googleLoad;
  const signedIn = () => Boolean(localStorage.getItem('vv_token'));
  const element = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };
  async function setupGoogle(errorText) {
    googleButton.replaceChildren();
    status.textContent = '';
    try {
      googleLoad ??= new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const script = element('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      const [config] = await Promise.all([
        fetch('/api/config', { cache: 'no-store' }).then(response => response.json()),
        googleLoad
      ]);
      if (!config.googleClientId || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async ({ credential }) => {
          try {
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential })
            });
            const { token } = await response.json();
            if (!response.ok || !token) throw Error();
            localStorage.setItem('vv_token', token);
            location.reload();
          } catch {
            status.textContent = errorText;
          }
        }
      });
      window.google.accounts.id.renderButton(googleButton, { theme: 'outline', size: 'large' });
    } catch {
      googleLoad = null;
      status.textContent = errorText;
    }
  }
  function open() {
    if (dialog?.open) return;
    const language = localStorage.getItem('deepsyq_lang') || document.documentElement.lang;
    const [title, intro, alternate, closeText, errorText] = languages[language] || languages.en;
    if (!dialog) {
      dialog = element('dialog');
      dialog.setAttribute('aria-labelledby', 'ds-action-sign-in-title');
      Object.assign(dialog.style, { maxWidth: 'min(88vw, 420px)', padding: '24px', borderRadius: '16px', colorScheme: 'light dark' });
      const heading = element('h2', title);
      heading.id = 'ds-action-sign-in-title';
      googleButton = element('div');
      status = element('p');
      status.setAttribute('role', 'status');
      const link = element('a', alternate);
      link.href = '/video-uniquifier.html#signin';
      const close = element('button', closeText);
      close.type = 'button';
      close.addEventListener('click', () => dialog.close());
      dialog.append(heading, element('p', intro), googleButton, status, link, element('hr'), close);
      document.body.append(dialog);
    }
    dialog.showModal();
    void setupGoogle(errorText);
  }
  document.addEventListener('submit', event => {
    if (path !== '/jarvix-chat' || event.target.id !== 'jChatForm' || signedIn()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);
  document.addEventListener('click', event => {
    if (signedIn()) return;
    const tool = path === '/free-tools' && event.target.closest(tools);
    const template = path === '/ai-apps' && event.target.closest('.app-body > button:not(:disabled)');
    if (!tool && !template) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);
  window.addEventListener('deepsyq:action-auth-required', open);
})();
