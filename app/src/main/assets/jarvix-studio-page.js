import {getJarvixVoice, getJarvixLanguage} from './jarvis-core.js';
    function getStudioSessionId() {
      try {
        const existing = sessionStorage.getItem('jarvix_studio_session');
        if (existing && /^[\w-]{1,80}$/.test(existing)) return existing;
        const created = 'studio-session-' + (crypto.randomUUID?.() || Date.now());
        sessionStorage.setItem('jarvix_studio_session', created);
        return created;
      } catch (_) { return 'studio-session-' + Date.now(); }
    }
    let currentSessionId = getStudioSessionId();
    let currentlyPlayingBtn = null;
    let pendingChat = null;
    let chatVersion = 0;

    const SAMPLES_DATA = [
        { lang: 'ru', locale:'ru-RU', flag: '🇷🇺', name: 'Русский', text: 'Здравствуйте! Я JARVIX — ваш голосовой помощник Deepsyq. Чем могу помочь?' },
        { lang: 'en', locale:'en-GB', flag: '🇬🇧', name: 'English', text: 'Greetings. I am JARVIX, your Deepsyq assistant. How may I help?' },
        { lang: 'es', locale:'es-ES', flag: '🇪🇸', name: 'Español', text: 'Saludos. Soy JARVIX, su asistente de Deepsyq. ¿Cómo puedo ayudarle?' },
        { lang: 'fr', locale:'fr-FR', flag: '🇫🇷', name: 'Français', text: 'Bonjour. Je suis JARVIX, votre assistant Deepsyq. Comment puis-je vous aider?' }
      ];

    function renderSamples() {
      const container = document.getElementById('samplesList');
      const list = SAMPLES_DATA;
      container.innerHTML = list.map(s => `
        <div class="sample-row">
          <div class="sample-meta">
            <span class="lang-flag">${s.flag}</span>
            <div>
              <div style="font-weight: 600; font-size: 0.85rem; color: #fff;">${s.name}</div>
              <div class="sample-text">${s.text}</div>
            </div>
          </div>
          <div class="sample-controls">
            <button class="play-btn" data-lang="${s.lang}" data-locale="${s.locale}" data-text="${escapeHtml(s.text)}">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Слушать
            </button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.getAttribute('data-text');
          const lang = btn.getAttribute('data-locale');
          if (currentlyPlayingBtn === btn) {
            window.speechSynthesis?.cancel();
            btn.classList.remove('playing');
            btn.innerHTML = `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Слушать`;
            currentlyPlayingBtn = null;
            return;
          }

          if (currentlyPlayingBtn) {
            currentlyPlayingBtn.classList.remove('playing');
            currentlyPlayingBtn.innerHTML = `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Слушать`;
          }

          if (!('speechSynthesis' in window)) {
            appendLog('SYSTEM', 'В этом браузере нет Web Speech голосов.', 'system');
            return;
          }
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang;
          const langPrefix = lang.slice(0,2);
          const voiceMeta = getJarvixVoice(langPrefix);
          if (!voiceMeta) {
            appendLog('SYSTEM', 'Мужской голос для этого языка недоступен на устройстве. Собственная речевая модель ещё не подключена.', 'system');
            return;
          }
          utterance.voice = voiceMeta.voice;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
          btn.classList.add('playing');
          btn.innerHTML = `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Стоп`;
          currentlyPlayingBtn = btn;

          utterance.onend = utterance.onerror = () => {
            btn.classList.remove('playing');
            btn.innerHTML = `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Слушать`;
            currentlyPlayingBtn = null;
          };
        });
      });
    }

    async function refreshPlatformKnowledge() {
      const panel = document.getElementById('platformKnowledge');
      try {
        const [configResponse, mapResponse] = await Promise.all([
          fetch('/api/studio/config'),
          fetch('/api/jarvix/site-map')
        ]);
        if (!configResponse.ok || !mapResponse.ok) throw new Error('Knowledge APIs are unavailable');
        const config = await configResponse.json();
        const siteMap = await mapResponse.json();
        const catalog = Array.isArray(config.catalog) ? config.catalog : [];
        const groups = [
          ['Image', catalog.filter(model => model.kind === 'image')],
          ['Video', catalog.filter(model => model.kind === 'video')],
          ['Audio & voice', catalog.filter(model => ['music','voice'].includes(model.kind))]
        ];
        panel.replaceChildren();
        const note = document.createElement('p');
        const enabledCount = catalog.filter(model => model.enabled === true).length;
        note.textContent = enabledCount ? `Current catalog · ${enabledCount} enabled model(s).` : 'DEV preview · generation is disabled. Catalog entries are listed for reference only.';
        panel.appendChild(note);
        for (const [label, models] of groups) {
          const section = document.createElement('section');
          const heading = document.createElement('strong');
          heading.textContent = `${label} (${models.length})`;
          section.appendChild(heading);
          const list = document.createElement('ul');
          list.style.margin = '4px 0 10px';
          for (const model of models) {
            const item = document.createElement('li');
            const availability = model.enabled ? 'enabled' : model.adapter ? 'adapter listed; disabled here' : 'catalog only; API unverified';
            item.textContent = `${model.label} — ${availability}`;
            list.appendChild(item);
          }
          section.appendChild(list);
          panel.appendChild(section);
        }
        const pageCount = Array.isArray(siteMap.pages) ? siteMap.pages.length : 0;
        const controlCount = (siteMap.pages || []).reduce((sum, page) => sum + (page.controls?.length || 0), 0);
        const siteIndex = document.createElement('p');
        siteIndex.textContent = `Site knowledge index: ${pageCount} public pages and ${controlCount} visible form controls.`;
        panel.appendChild(siteIndex);
      } catch (_) {
        panel.textContent = 'The live catalog is unavailable. Check Image, Video and Audio Studio for current model and availability details.';
      }
    }

    renderSamples();
    refreshPlatformKnowledge();

    // Terminal & Brain logic
    const terminalLogs = document.getElementById('terminalLogs');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const stateInspector = document.getElementById('stateInspector');

    function appendLog(sender, text, type = 'user') {
      const msg = document.createElement('div');
      msg.className = `log-msg ${type}`;
      msg.innerHTML = `<span class="log-sender">${sender}:</span> <span class="log-text">${escapeHtml(text)}</span>`;
      terminalLogs.appendChild(msg);
      terminalLogs.scrollTop = terminalLogs.scrollHeight;
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }

    function currentLanguage() { return getJarvixLanguage(); }

    function speakReply(text, language) {
      if (!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const locales = {ru:'ru-RU',en:'en-GB',es:'es-ES',fr:'fr-FR'};
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locales[language] || locales.ru;
      const voiceMeta = getJarvixVoice(language || 'ru');
      if (!voiceMeta) {
        appendLog('SYSTEM', 'Мужской голос для этого языка недоступен на устройстве. Ответ доступен в чате.', 'system');
        return;
      }
      utterance.voice = voiceMeta.voice;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }

    async function sendMessage(text) {
      if (!text || !text.trim()) return;
      pendingChat?.abort();
      const version = ++chatVersion;
      const controller = new AbortController();
      pendingChat = controller;
      const clean = text.trim();
      appendLog('Вы', clean, 'user');
      chatInput.value = '';

      try {
        const res = await fetch('/api/jarvix/chat', {
          signal: controller.signal,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            message: clean,
            language: currentLanguage()
          })
        });

        if (!res.ok) {
          throw new Error('Server returned ' + res.status);
        }

        const data = await res.json();
        if (version !== chatVersion) return;
        appendLog('JARVIX', data.reply, 'jarvix');

        if (data.action && data.action.type === 'block_unauthorized') {
          appendLog('SAFETY GUARD', 'Заблокировано: попытка неавторизованного действия.', 'system');
        }

        // Update state inspector
        stateInspector.textContent = JSON.stringify({
          sessionId: currentSessionId,
          intent: data.intent,
          provider: data.provider || 'unknown',
          accumulatedEntities: data.entities || {},
          compiledPrompt: data.compiledPrompt || '',
          action: data.action || null,
          studioHandoff: data.studioHandoff || null,
          safetyGuardrail: data.action?.type === 'block_unauthorized' ? 'BLOCKED_BY_GUARDRAIL' : 'CLEARED'
        }, null, 2);

        // Optional voice play
        if (data.audioUrl) {
          const snd = new Audio(data.audioUrl);
          snd.play().catch(() => {});
        } else speakReply(data.reply, data.language || currentLanguage());
      } catch (err) {
        if (version !== chatVersion || err.name === 'AbortError') return;
        appendLog('SYSTEM', 'Ошибка связи: ' + err.message, 'system');
      }
    }

    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendMessage(chatInput.value);
    });

    document.querySelectorAll('.quick-pill[data-msg]').forEach(pill => {
      pill.addEventListener('click', () => {
        sendMessage(pill.getAttribute('data-msg'));
      });
    });

    document.getElementById('resetMemoryBtn').addEventListener('click', async () => {
      chatVersion += 1;
      pendingChat?.abort();
      window.speechSynthesis?.cancel();
      try {
        await fetch('/api/jarvix/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentSessionId })
        });
      } catch (_) {}
      try { sessionStorage.removeItem('jarvix_studio_session'); } catch (_) {}
      currentSessionId = getStudioSessionId();
      terminalLogs.innerHTML = '';
      appendLog('JARVIX', 'Память диалога сброшена. Начните новый разговор.', 'jarvix');
      stateInspector.textContent = JSON.stringify({
        sessionId: currentSessionId,
        accumulatedEntities: {},
        compiledPrompt: "",
        safetyGuardrail: "ACTIVE",
        handoffTarget: null
      }, null, 2);
    });
  

    async function refreshConnectionStatus() {
      const target=document.getElementById('jarvixConnectionStatus');
      if(!target)return;
      const lang=currentLanguage();
      const messages={
        ru:'LLM не подключена. Доступны локальные команды и временная память диалога. Голос использует возможности браузера.',
        en:'LLM is not connected. Local commands and temporary conversation memory are available. Voice uses browser speech.',
        fr:'Le LLM n’est pas connecté. Les commandes locales et la mémoire temporaire sont disponibles. La voix utilise le navigateur.',
        es:'El LLM no está conectado. Están disponibles los comandos locales y la memoria temporal. La voz usa el navegador.'
      };
      try {
        const response=await fetch('/api/jarvix/status');
        if(!response.ok)throw new Error('status unavailable');
        const status=await response.json();
        if(status.freeLlm?.enabled&&status.freeLlm.providers?.includes('gemini-free'))target.textContent=({
          ru:'Gemini Free включена для JARVIX. Доступно до 15 бесплатных сообщений в сутки. Голос зависит от установленных возможностей браузера.',
          en:'Gemini Free is enabled for JARVIX. Up to 15 free messages per day. Voice availability depends on the browser.',
          fr:'Gemini Free est activé pour JARVIX. Jusqu’à 15 messages gratuits par jour. La voix dépend du navigateur.',
          es:'Gemini Free está activado para JARVIX. Hasta 15 mensajes gratis al día. La voz depende del navegador.'
        })[lang]||messages.en;
        else if(status.llm?.status==='not_connected')target.textContent=messages[lang]||messages.en;
        else target.textContent=({ru:'Подключение LLM ещё не подтверждено реальным ответом модели.',en:'The LLM connection has not been verified by a model response.',fr:'La connexion au LLM n’a pas encore été vérifiée.',es:'La conexión con el LLM todavía no se ha verificado.'})[lang]||messages.en;
      } catch (_) {
        target.textContent=({ru:'Статус LLM недоступен. Подключение модели не подтверждено.',en:'LLM status is unavailable. Model connection is unverified.',fr:'Le statut du LLM est indisponible. La connexion n’est pas confirmée.',es:'El estado del LLM no está disponible. La conexión no está confirmada.'})[lang]||messages.en;
      }
    }
    refreshConnectionStatus();
    window.addEventListener('deepsyq:lang',refreshConnectionStatus);
