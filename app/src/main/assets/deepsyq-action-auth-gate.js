/* DEEPSYQ: guest action guard. Browsing remains public; generation/submission asks for sign-in.
   Reuses the existing Home Google/email dialog without changing OAuth or registration. */
(() => {
  'use strict';
  if (window.__dsGuestActionGuardInstalled) return;
  window.__dsGuestActionGuardInstalled = true;
  const actionIds = new Set([
    'jSend','homeQuickSubmit','generate','cwGenerate','run','startBtn',
    'collageCreate','avatarGenerate','speechGenerate','transcribeStart',
    'trimGenerate','vtaGenerate'
  ]);
  const actionForms = new Set(['jChatForm','homeQuickForm','creator']);
  const excluded = '#authModal,#onboardingModal,[data-guest-action-exempt]';
  const guest = () => {
    try { return !localStorage.getItem('vv_token'); }
    catch (_) { return true; }
  };
  function isActionButton(button) {
    if (!button || button.closest(excluded)) return false;
    if (actionIds.has(button.id)) return true;
    if (button.matches('[data-t="generate"],[data-t="run"],[data-s="generate"],[data-av="create"],[data-action="generate"],[data-action="send"],[data-action="submit"],[data-action="run"]')) return true;
    const label = String(button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent || button.value || '').trim().replace(/\s+/g, ' ');
    if (!label) return false;
    return /^(?:generate(?:\s|$)|send(?:\s|$)|submit(?:\s|$)|start (?:generation|processing|rendering)|process (?:image|video|audio|file)|remove background|render(?:\s|$)|run(?:\s|$)|create (?:image|video|audio|music|variations?|clip|content)|сгенерир|генерир|отправ|создать (?:изображение|картинку|видео|аудио|музыку)|запустить (?:генерацию|обработку)|удалить фон|обработать (?:фото|видео|аудио)|génér|envoyer(?:\s|$)|créer (?:une? |des? )?(?:image|vidéo|audio)|generar(?:\s|$)|enviar(?:\s|$)|crear (?:imagen|video|audio))/i.test(label);
  }
  function isActionForm(form, submitter) {
    if (!form || form.closest(excluded)) return false;
    if (actionForms.has(form.id)) return true;
    return !!(submitter && isActionButton(submitter));
  }
  function showExistingAuth() {
    const modal = document.getElementById('authModal');
    const trigger = document.getElementById('topLogin') || document.getElementById('accountButton');
    if (modal && trigger) { trigger.click(); return; }
    // Other pages have no OAuth container: open the existing Home login dialog.
    const home = new URL('deepsyq.html', location.href);
    home.searchParams.set('panel', 'login');
    try {
      if (window.top && window.top !== window.self && window.top.location.origin === location.origin) {
        window.top.location.assign(home.href);
        return;
      }
    } catch (_) {}
    location.assign(home.href);
  }
  function intercept(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showExistingAuth();
  }
  document.addEventListener('click', event => {
    if (!guest() || !event.target?.closest) return;
    const button = event.target.closest('button,input[type="submit"],input[type="button"],[role="button"]');
    if (isActionButton(button)) intercept(event);
  }, true);
  document.addEventListener('submit', event => {
    if (guest() && isActionForm(event.target, event.submitter)) intercept(event);
  }, true);
  // Some generation controls are disabled until prerequisites are available.
  document.addEventListener('pointerdown', event => {
    if (!guest() || event.button !== 0 || !event.target?.closest) return;
    const button = event.target.closest('button,input[type="submit"],input[type="button"]');
    if (button?.disabled && isActionButton(button)) intercept(event);
  }, true);
})();
