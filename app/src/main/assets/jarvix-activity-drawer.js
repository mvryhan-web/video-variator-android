// JARVIX/Studio shared activity drawer. Reuses existing private chat and Studio history.
import { conversationStore } from './jarvix-conversations.js';

const rawPage = location.pathname.split('/').pop() || '';
const page = rawPage.endsWith('.html') ? rawPage : rawPage + '.html';
if (page === 'jarvix-chat.html' || page === 'generate-studio.html') {
  const dictionary = {
    en: { title: 'JARVIX Chat', newChat: 'New chat', recent: 'Recent conversations', works: 'Recent works', all: 'All my works', empty: 'No conversations yet', account: 'Account changed. Reload to see your history.', open: 'Open recent activity', close: 'Close recent activity', image: 'Image', video: 'Video', audio: 'Audio' },
    ru: { title: 'JARVIX Chat', newChat: 'Новый чат', recent: 'Недавние чаты', works: 'Недавние работы', all: 'Все мои работы', empty: 'Пока нет разговоров', account: 'Аккаунт изменился. Обновите страницу для просмотра истории.', open: 'Открыть недавние', close: 'Свернуть недавние', image: 'Фото', video: 'Видео', audio: 'Аудио' },
    fr: { title: 'JARVIX Chat', newChat: 'Nouveau chat', recent: 'Conversations récentes', works: 'Créations récentes', all: 'Toutes mes créations', empty: 'Aucune conversation', account: 'Compte modifié. Actualisez la page.', open: 'Ouvrir les éléments récents', close: 'Fermer les éléments récents', image: 'Image', video: 'Vidéo', audio: 'Audio' },
    es: { title: 'JARVIX Chat', newChat: 'Nuevo chat', recent: 'Conversaciones recientes', works: 'Creaciones recientes', all: 'Todas mis creaciones', empty: 'Aún no hay conversaciones', account: 'Cuenta cambiada. Actualiza la página.', open: 'Abrir recientes', close: 'Cerrar recientes', image: 'Imagen', video: 'Vídeo', audio: 'Audio' }
  };
  const language = () => {
    const raw = (localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang') || navigator.language || 'en').toLowerCase();
    return raw.startsWith('ru') || raw.startsWith('uk') ? 'ru' : raw.startsWith('fr') ? 'fr' : raw.startsWith('es') ? 'es' : 'en';
  };
  const dict = () => dictionary[language()] || dictionary.en;
  const tokenOnLoad = localStorage.getItem('vv_token') || 'guest';
  const sameAccount = () => (localStorage.getItem('vv_token') || 'guest') === tokenOnLoad;
  const element = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value) node.textContent = value;
    return node;
  };

  const toggle = element('button', 'jarvix-activity-toggle', '›');
  toggle.type = 'button';
  toggle.id = 'jarvixActivityToggle';
  toggle.setAttribute('aria-controls', 'jarvixActivityPanel');
  const panel = element('aside', 'jarvix-activity-panel');
  panel.id = 'jarvixActivityPanel';
  panel.setAttribute('aria-label', 'JARVIX recent activity');
  const title = element('h2', 'jarvix-activity-title');
  const newChatArea = element('div', 'jarvix-activity-new');
  const oldNewChat = page === 'jarvix-chat.html' ? document.getElementById('jNew') : null;
  const newChat = oldNewChat || element('a', 'jarvix-activity-new-link');
  if (!oldNewChat) newChat.href = 'jarvix-chat.html?new=1';
  newChat.classList.add('jarvix-activity-new-link');
  newChatArea.append(newChat);
  const recentTitle = element('h3', 'jarvix-activity-heading');
  const recentList = element('div', 'jarvix-activity-list');
  recentList.setAttribute('aria-label', 'Recent JARVIX conversations');
  const worksTitle = element('h3', 'jarvix-activity-heading');
  const worksList = element('div', 'jarvix-activity-list');
  const allWorks = element('a', 'jarvix-activity-all');
  allWorks.href = 'my-creations.html';
  panel.append(title, newChatArea, recentTitle, recentList, worksTitle, worksList, allWorks);
  document.body.append(panel, toggle);
  document.body.classList.add('jarvix-activity-enabled');

  // First visit: show shared JARVIX panel on desktop. On small screens keep
  // the content usable, with a clearly labeled tab to open the same panel.
  // Versioned preference avoids inheriting the old invisible-by-default state.
  const visibilityKey = 'jarvix_activity_open_v2';
  const storedVisibility = sessionStorage.getItem(visibilityKey);
  let expanded = storedVisibility === '1' ||
    (storedVisibility === null && !matchMedia('(max-width: 900px)').matches);
  let ownerChanged = false;
  let chatEpoch = 0;
  let workEpoch = 0;
  const openState = () => {
    panel.hidden = !expanded;
    toggle.textContent = expanded ? '‹' : '› JARVIX Chat';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? dict().close : dict().open);
    toggle.title = expanded ? dict().close : dict().open;
    document.body.classList.toggle('jarvix-activity-open', expanded);
  };
  const translate = () => {
    const d = dict();
    title.textContent = d.title;
    newChat.textContent = d.newChat;
    recentTitle.textContent = d.recent;
    worksTitle.textContent = d.works;
    allWorks.textContent = d.all;
    openState();
  };
  const message = text => {
    const node = element('p', 'jarvix-activity-empty', text);
    return node;
  };
  const storePromise = conversationStore().catch(() => null);

  async function showRecent() {
    const current = ++chatEpoch;
    if (!sameAccount() || ownerChanged) {
      recentList.replaceChildren(message(dict().account));
      return;
    }
    const store = await storePromise;
    if (current !== chatEpoch || !sameAccount() || !expanded) return;
    if (!store) {
      recentList.replaceChildren(message(dict().empty));
      return;
    }
    try {
      const records = (await store.list()).filter(item => item.messages?.length).slice(0, 25);
      if (current !== chatEpoch || !sameAccount() || !expanded) return;
      recentList.replaceChildren();
      if (!records.length) { recentList.append(message(dict().empty)); return; }
      for (const record of records) {
        const item = element('button', 'jarvix-activity-item', record.title || dict().newChat);
        item.type = 'button';
        if (record.id === sessionStorage.getItem('jarvix_active_conversation') && page === 'jarvix-chat.html') {
          item.setAttribute('aria-current', 'true');
        }
        item.onclick = () => {
          if (!sameAccount()) return;
          if (page === 'jarvix-chat.html') {
            const select = document.getElementById('jHistory');
            if (!select?.querySelector('option[value="' + CSS.escape(record.id) + '"]')) return;
            select.value = record.id;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            showRecent();
          } else {
            sessionStorage.setItem('jarvix_active_conversation', record.id);
            location.assign('jarvix-chat.html');
          }
        };
        recentList.append(item);
      }
    } catch {
      if (current === chatEpoch) recentList.replaceChildren(message(dict().empty));
    }
  }

  async function showWorks() {
    const current = ++workEpoch;
    worksList.replaceChildren();
    const token = localStorage.getItem('vv_token');
    if (!token || !sameAccount() || ownerChanged || !expanded) return;
    try {
      const response = await fetch('/api/studio/jobs?filter=all', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (current !== workEpoch || !sameAccount() || !expanded) return;
      const items = (Array.isArray(payload.items) ? payload.items : [])
        .filter(item => item?.id && ['image', 'video', 'music', 'audio'].includes(item.kind))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10);
      for (const item of items) {
        const kind = item.kind === 'music' ? 'audio' : item.kind;
        const studio = kind === 'audio' ? 'audio' : kind;
        const link = element('a', 'jarvix-activity-item', (dict()[kind] || kind) + ' · ' + (String(item.prompt || '').trim().slice(0, 52) || String(item.status || 'Result')));
        link.href = 'generate-studio.html?studio=' + encodeURIComponent(studio) + '&jobId=' + encodeURIComponent(item.id);
        worksList.append(link);
      }
    } catch {
      // The private Studio API may be unavailable in free preview; never invent work.
    }
  }

  const refresh = () => { if (expanded) { void showRecent(); void showWorks(); } };
  toggle.onclick = () => {
    expanded = !expanded;
    sessionStorage.setItem(visibilityKey, expanded ? '1' : '0');
    openState();
    refresh();
    if (expanded) newChat.focus({ preventScroll: true });
    else toggle.focus({ preventScroll: true });
  };
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {
      expanded = false;
      sessionStorage.setItem(visibilityKey, '0');
      openState();
      toggle.focus({ preventScroll: true });
    }
  });
  window.addEventListener('jarvix:history-changed', () => { if (expanded) void showRecent(); });
  window.addEventListener('deepsyq:lang', () => { translate(); refresh(); });
  window.addEventListener('storage', event => {
    if (event.key === 'vv_token') {
      ownerChanged = true;
      ++chatEpoch;
      ++workEpoch;
      recentList.replaceChildren(message(dict().account));
      worksList.replaceChildren();
    }
    if (event.key === 'deepsyq_lang' || event.key === 'deepsyq_home_language') { translate(); refresh(); }
  });
  translate();
  refresh();
}
