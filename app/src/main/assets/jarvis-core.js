// JARVIS AI Core v2.0 — Marvel-inspired Interactive Voice Commander & F1 Model Comparator
import { detectIntent } from './home-experience.js';
import { saveStudioHandoff } from './studio-handoff.js';

const $ = id => document.getElementById(id);

let isJarvisSpeaking = false;
let isJarvisListening = false;
let jarvisRecognition = null;
let keepListening = false;

// 1. Text-to-Speech (JARVIS synthesized voice)
export function speakJarvis(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
    utterance.lang = isRu ? 'ru-RU' : 'en-US';
    utterance.pitch = 0.95; // Slightly deeper, authoritative JARVIS tone
    utterance.rate = 1.05;

    const bigOrb = $('jarvisBigOrb');
    utterance.onstart = () => {
      isJarvisSpeaking = true;
      if (bigOrb) bigOrb.classList.add('is-speaking');
    };
    utterance.onend = () => {
      isJarvisSpeaking = false;
      if (bigOrb) bigOrb.classList.remove('is-speaking');
    };
    utterance.onerror = () => {
      isJarvisSpeaking = false;
      if (bigOrb) bigOrb.classList.remove('is-speaking');
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[JARVIS] Speech synthesis error:', err);
  }
}

// 2. F1 Compare Generation Mock / Multi-model synthesize
export function runF1Compare(promptText) {
  const p = promptText || 'Футуристический визуальный концепт в неоновом стиле';
  const grid = $('jarvisF1Grid');
  const section = $('jarvisF1Section');
  if (!grid || !section) return;

  section.hidden = false;
  grid.innerHTML = `
    <article class="jarvis-model-card">
      <div class="jarvis-card-head">
        <span class="jarvis-card-brand jarvis-badge-deepseek">⚡ DeepSeek V3</span>
        <span class="jarvis-card-meta">310ms · 0.02 cr</span>
      </div>
      <div class="jarvis-card-text">
        Высокодетализированная композиция «${p}» с глубоким контрастом, кинематографичным 8k освещением и текстурами сверхвысокой чёткости.
      </div>
      <div class="jarvis-card-actions">
        <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
        <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
      </div>
    </article>

    <article class="jarvis-model-card">
      <div class="jarvis-card-head">
        <span class="jarvis-card-brand jarvis-badge-gemini">✦ Google Gemini Pro</span>
        <span class="jarvis-card-meta">280ms · 0.03 cr</span>
      </div>
      <div class="jarvis-card-text">
        Креативная концепция: динамический ракурс, атмосферный volumetric light, неоновые отражения и гармоничная цветовая палитра под «${p}».
      </div>
      <div class="jarvis-card-actions">
        <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
        <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
      </div>
    </article>

    <article class="jarvis-model-card">
      <div class="jarvis-card-head">
        <span class="jarvis-card-brand jarvis-badge-gpt">⌘ OpenAI GPT-4o</span>
        <span class="jarvis-card-meta">340ms · 0.05 cr</span>
      </div>
      <div class="jarvis-card-text">
        Структурированный визуальный фреймворк: фотореалистичный кадр, идеальная геометрия и маркетинговая эстетика премиум-бренда для «${p}».
      </div>
      <div class="jarvis-card-actions">
        <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
        <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
      </div>
    </article>

    <article class="jarvis-model-card">
      <div class="jarvis-card-head">
        <span class="jarvis-card-brand jarvis-badge-claude">◈ Claude 3.5 Sonnet</span>
        <span class="jarvis-card-meta">390ms · 0.04 cr</span>
      </div>
      <div class="jarvis-card-text">
        Кинематографичный сторителлинг: плавное движение камеры, эмоциональная глубина и выразительный фокус на ключевых деталях идеи.
      </div>
      <div class="jarvis-card-actions">
        <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
        <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
      </div>
    </article>
  `;

  // Attach send actions
  grid.querySelectorAll('[data-send-studio]').forEach(btn => {
    btn.onclick = async () => {
      const targetStudio = btn.dataset.sendStudio;
      const text = btn.dataset.prompt;
      try {
        await saveStudioHandoff({ kind: targetStudio, prompt: text, settings: {}, source: 'jarvis-f1' });
        location.assign(`generate-studio.html?studio=${targetStudio}&from=jarvis`);
      } catch (_) {
        location.assign(`generate-studio.html?studio=${targetStudio}&from=jarvis`);
      }
    };
  });
}

// 3. Process Live Voice Command in JARVIS
export function handleJarvisVoiceCommand(commandText) {
  if (!commandText) return;
  const t = commandText.trim();
  const lower = t.toLowerCase();
  const statusEl = $('jarvisSpeechText');

  // Check navigation intent
  if (/(?:открой|перейди|покажи|запусти)?\s*(?:изображен|картинк|фото|image)/i.test(lower)) {
    if (statusEl) statusEl.innerHTML = '<strong>JARVIS:</strong> Открываю Студию создания изображений...';
    speakJarvis('Открываю Студию создания изображений.');
    setTimeout(() => { location.assign('generate-studio.html?studio=image&from=jarvis'); }, 1200);
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:видео|ролик|фильм|video)/i.test(lower)) {
    if (statusEl) statusEl.innerHTML = '<strong>JARVIS:</strong> Открываю Студию создания видео...';
    speakJarvis('Открываю Студию создания видео.');
    setTimeout(() => { location.assign('generate-studio.html?studio=video&from=jarvis'); }, 1200);
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:аудио|музык|песн|трек|audio|music)/i.test(lower)) {
    if (statusEl) statusEl.innerHTML = '<strong>JARVIS:</strong> Открываю Студию аудио...';
    speakJarvis('Открываю Студию аудио.');
    setTimeout(() => { location.assign('generate-studio.html?studio=audio&from=jarvis'); }, 1200);
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:агент|ai[\s-]?агент|agent)/i.test(lower)) {
    if (statusEl) statusEl.innerHTML = '<strong>JARVIS:</strong> Открываю сценарии AI-агентов...';
    speakJarvis('Открываю сценарии AI-агентов.');
    setTimeout(() => { location.assign('ai-agents.html?from=jarvis'); }, 1200);
    return;
  }

  // F1 Compare or General Query
  if (statusEl) {
    statusEl.innerHTML = `<strong>JARVIS:</strong> Запрос принят: «${t}». Выполняю параллельный сравнительный анализ в 4 нейросетях (F1 Compare).`;
  }
  speakJarvis('Запрос принят. Выполняю сравнительный анализ в четырёх нейросетях.');
  runF1Compare(t);
}

// 4. Mount JARVIS UI Component
export function initJarvis() {
  if (typeof document === 'undefined') return;

  // Create HUD Dialog if not present
  if (!$('jarvisHudDialog')) {
    const dialog = document.createElement('dialog');
    dialog.id = 'jarvisHudDialog';
    dialog.className = 'jarvis-hud-dialog';
    dialog.setAttribute('aria-labelledby', 'jarvisTitle');
    dialog.innerHTML = `
      <div class="jarvis-hud-inner">
        <div class="jarvis-hud-header">
          <div class="jarvis-hud-title" id="jarvisTitle">
            <span class="status-dot"></span>
            <span>J.A.R.V.I.S. // AI SYSTEM ONLINE</span>
          </div>
          <button type="button" class="jarvis-hud-close" id="jarvisCloseBtn" aria-label="Закрыть">×</button>
        </div>

        <div class="jarvis-hero-center">
          <div class="jarvis-big-orb" id="jarvisBigOrb" title="Нажмите, чтобы включить/выключить микрофон">
            <span class="jarvis-big-core"></span>
            <span class="jarvis-big-ring-1"></span>
            <span class="jarvis-big-ring-2"></span>
          </div>

          <div class="jarvis-speech-bubble" id="jarvisSpeechText">
            <strong>JARVIS:</strong> Здравствуйте! Я ваш бортовой AI-ассистент. Что вы хотите создать сегодня: фото, видео, музыку или открыть раздел?
          </div>

          <div class="jarvis-live-input-box">
            <input id="jarvisInput" type="text" placeholder="Скажите или напишите команду («открой видео», «сравни модели»)..." autocomplete="off">
            <button type="button" id="jarvisMicToggle" class="jarvis-speak-mic-btn" aria-label="Микрофон" title="Включить постоянный микрофон">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
          </div>

          <div class="jarvis-quick-commands">
            <button type="button" class="jarvis-cmd-chip" data-cmd="открой изображение">🎨 Открыть Image Studio</button>
            <button type="button" class="jarvis-cmd-chip" data-cmd="открой видео">🎬 Открыть Video Studio</button>
            <button type="button" class="jarvis-cmd-chip" data-cmd="открой музыку">🎵 Открыть Audio Studio</button>
            <button type="button" class="jarvis-cmd-chip" data-cmd="открой ai агент">🤖 Открыть AI Agents</button>
            <button type="button" class="jarvis-cmd-chip" data-cmd="сравни варианты для рекламы">⚖️ Сравнить 4 AI модели (F1)</button>
          </div>
        </div>

        <section id="jarvisF1Section" class="jarvis-f1-section" hidden>
          <div class="jarvis-f1-heading">
            <span>PARALLEL COMPARISON MATRIX (F1 SMART)</span>
            <span>4 ACTIVE MODELS</span>
          </div>
          <div id="jarvisF1Grid" class="jarvis-f1-grid"></div>
        </section>
      </div>
    `;
    document.body.append(dialog);

    // Event wiring
    $('jarvisCloseBtn').onclick = () => {
      dialog.close();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopJarvisVoice();
    };
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        dialog.close();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        stopJarvisVoice();
      }
    });

    // Quick Command chips
    dialog.querySelectorAll('[data-cmd]').forEach(chip => {
      chip.onclick = () => {
        const cmd = chip.dataset.cmd;
        $('jarvisInput').value = cmd;
        handleJarvisVoiceCommand(cmd);
      };
    });

    // Input Enter
    $('jarvisInput').onkeydown = e => {
      if (e.key === 'Enter') {
        const val = $('jarvisInput').value.trim();
        if (val) handleJarvisVoiceCommand(val);
      }
    };

    // Big Orb click starts/stops voice
    $('jarvisBigOrb').onclick = () => toggleJarvisVoice();
    $('jarvisMicToggle').onclick = () => toggleJarvisVoice();
  }

  // Hook trigger button
  const topBtn = $('topJarvisBtn');
  if (topBtn) {
    topBtn.onclick = () => openJarvisHud();
  }
}

export function openJarvisHud() {
  const dialog = $('jarvisHudDialog');
  if (!dialog) return;
  if (!dialog.open) {
    dialog.showModal();
    // Speak greeting automatically!
    const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
    const greeting = isRu 
      ? 'Здравствуйте! Я JARVIS. Что вы хотите создать сегодня: фото, видео, музыку или открыть страницу?'
      : 'Greetings! I am JARVIS. What would you like to create today: image, video, music or navigate?';
    speakJarvis(greeting);
    // Start listening automatically
    startJarvisVoice();
  }
}

function stopJarvisVoice() {
  keepListening = false;
  isJarvisListening = false;
  if (jarvisRecognition) {
    try {
      jarvisRecognition.onend = null;
      jarvisRecognition.stop();
    } catch (_) {}
    jarvisRecognition = null;
  }
  const micBtn = $('jarvisMicToggle');
  if (micBtn) micBtn.classList.remove('is-recording');
}

function startJarvisVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  keepListening = true;
  const micBtn = $('jarvisMicToggle');
  const input = $('jarvisInput');

  function launch() {
    if (!keepListening) return;
    try {
      if (jarvisRecognition) {
        try { jarvisRecognition.onend = null; jarvisRecognition.stop(); } catch (_) {}
      }
      jarvisRecognition = new SpeechRec();
      jarvisRecognition.continuous = true;
      jarvisRecognition.interimResults = true;
      jarvisRecognition.lang = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru')) ? 'ru-RU' : 'en-US';

      jarvisRecognition.onstart = () => {
        isJarvisListening = true;
        if (micBtn) micBtn.classList.add('is-recording');
      };

      jarvisRecognition.onresult = e => {
        let text = '';
        for (let i = 0; i < e.results.length; ++i) {
          text += e.results[i][0].transcript;
        }
        if (input) input.value = text;
      };

      jarvisRecognition.onend = () => {
        if (keepListening) {
          setTimeout(() => { if (keepListening) launch(); }, 200);
        } else {
          stopJarvisVoice();
        }
      };

      jarvisRecognition.onerror = () => {
        if (!keepListening) stopJarvisVoice();
      };

      jarvisRecognition.start();
    } catch (_) {
      stopJarvisVoice();
    }
  }

  launch();
}

function toggleJarvisVoice() {
  if (keepListening || isJarvisListening) {
    stopJarvisVoice();
  } else {
    startJarvisVoice();
  }
}

// Auto-boot on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJarvis);
  } else {
    initJarvis();
  }
}
